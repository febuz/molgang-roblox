/**
 * Group Voting — DID-membership-scoped proposals with MQTT/Kafka fan-out
 *
 * Groups are membership sets of sovereign DIDs. Compared to the global
 * referenda in sovereign-voting.ts, this layer adds:
 *
 *  - MEMBERSHIP GATE: only group members may vote on group proposals;
 *    joining is a DID-signed act (the join signature proves key ownership,
 *    no admin approval needed for 'open' groups; 'closed' groups require
 *    the owner to add members).
 *
 *  - GROUP-SCOPED WEIGHTS: 'identity' (one member, one vote) or 'stake'
 *    (value-chain balance at cast time) — same server-derived rule as
 *    sovereign voting: a submitted weight is ALWAYS ignored.
 *
 *  - EVENT FAN-OUT: every lifecycle change (group created, member joined,
 *    proposal created, ballot cast, proposal closed) is mirrored to MQTT
 *    (`vpc/groups/<id>/…`) and Kafka (`group.events`) through the
 *    GroupEventBus. Consumers dedupe on the event's content hash.
 *
 *  - MATRIX INGEST: accepted ballots are written into the 888 888 888-dim
 *    fact matrix (vote region) so group votes are queryable alongside
 *    transactions and news in one coordinate space.
 *
 *  - MERKLE-CERTIFIED CLOSE: closing produces a certificate with a Merkle
 *    root over ballot hashes, like the sovereign and election layers.
 *
 * REST (registerGroupVotingRoutes):
 *   POST /api/groups                          — create group
 *   GET  /api/groups                          — list groups
 *   GET  /api/groups/:id                      — group + members + proposals
 *   POST /api/groups/:id/join                 — DID-signed join (open groups)
 *   POST /api/groups/:id/members              — owner adds member (closed groups)
 *   POST /api/groups/:id/leave                — leave
 *   POST /api/groups/:id/proposals            — create proposal (members only)
 *   POST /api/groups/:id/proposals/:pid/vote  — cast ballot (members only)
 *   POST /api/groups/:id/proposals/:pid/close — close + certificate
 *   GET  /api/groups/:id/proposals/:pid       — proposal + tally
 */

import { verify as edVerify, createPublicKey } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import type { IdentityPort } from './identity-port';
import type { ValueChainService } from './value-chain';
import type { GroupEventBus } from './group-events';
import type { FactMatrixService } from './fact-matrix';
import { keyHistory } from './identity';
import { UNITS_PER_TOKEN } from './value-chain';
import { canonicalize, sha256, buildMerkleRoot } from './graph-state-root';
import logger from '../../utils/logger';

// ── DoS bounds ────────────────────────────────────────────────────────────────
export const MAX_GROUPS = 10_000;
export const MAX_MEMBERS_PER_GROUP = 100_000;
export const MAX_GROUP_PROPOSALS = 1_000;
export const MAX_GROUP_NAME_LENGTH = 128;
export const MAX_GROUP_DESCRIPTION_LENGTH = 1024;
export const MAX_QUESTION_LENGTH = 2048;
export const MAX_OPTIONS = 32;
export const MAX_OPTION_LENGTH = 256;

// ── Types ─────────────────────────────────────────────────────────────────────

export type GroupAccess = 'open' | 'closed';
export type GroupWeightMode = 'identity' | 'stake';
export type GroupProposalStatus = 'open' | 'closed';

export interface Group {
  id: string;
  name: string;
  description: string;
  access: GroupAccess;          // open = self-join (signed); closed = owner adds
  owner: string;                // DID
  createdAt: string;
}

export interface GroupProposal {
  id: string;
  groupId: string;
  question: string;
  options: string[];
  mode: GroupWeightMode;
  createdBy: string;            // member DID
  createdAt: string;
  status: GroupProposalStatus;
  closedAt?: string;
}

export interface GroupBallot {
  proposalId: string;
  groupId: string;
  voter: string;                // DID
  option: string;
  weight: number;               // server-derived
  ts: string;
  publicKeyPem: string;
  signature: string;            // base64 Ed25519 over groupBallotPayload
}

export interface GroupTally {
  proposalId: string;
  groupId: string;
  mode: GroupWeightMode;
  totals: Record<string, number>;
  ballots: number;
  turnoutMembers: number;       // distinct member DIDs that voted
  eligibleMembers: number;      // members at tally time
  winner: string | null;
}

export interface GroupVotingCertificate {
  proposalId: string;
  groupId: string;
  question: string;
  mode: GroupWeightMode;
  tally: GroupTally;
  ballotRoot: string;
  closedAt: string;
  certHash: string;
}

// ── Canonical signed payloads ─────────────────────────────────────────────────

/** Bytes a JOIN signature covers — binds the DID to this exact group. */
export function joinPayload(groupId: string, did: string): string {
  return canonicalize({ action: 'group-join', groupId, did });
}

/** Bytes a ballot signature covers. Weight/ts excluded (server-derived). */
export function groupBallotPayload(b: Pick<GroupBallot, 'proposalId' | 'groupId' | 'voter' | 'option'>): string {
  return canonicalize({ proposalId: b.proposalId, groupId: b.groupId, voter: b.voter, option: b.option });
}

export function groupBallotHash(b: GroupBallot): string {
  return sha256(canonicalize({
    proposalId: b.proposalId, groupId: b.groupId, voter: b.voter, option: b.option, weight: b.weight,
  }));
}

// ── Service ───────────────────────────────────────────────────────────────────

export class GroupVotingService {
  private groups = new Map<string, Group>();
  private members = new Map<string, Set<string>>();          // groupId → DIDs
  private proposals = new Map<string, GroupProposal>();      // proposalId → proposal
  private groupProposals = new Map<string, string[]>();      // groupId → proposalIds
  private ballots = new Map<string, GroupBallot[]>();        // proposalId → ballots
  private voted = new Map<string, Set<string>>();            // proposalId → DIDs voted
  private certificates = new Map<string, GroupVotingCertificate>();
  /** Fires after a proposal closes — backlog bridge + persistence hook. */
  private onClose?: (cert: GroupVotingCertificate) => void;

  constructor(
    private readonly identity: IdentityPort,
    private readonly opts: {
      valueChain?: ValueChainService;
      events?: GroupEventBus;
      matrix?: FactMatrixService;
    } = {},
  ) {}

  /** Late binding for the close hook (services are constructed in dependency order). */
  setOnClose(hook: (cert: GroupVotingCertificate) => void): void {
    this.onClose = hook;
  }

  // ── Groups ──────────────────────────────────────────────────────────────────

  createGroup(params: { name: string; description?: string; access?: GroupAccess; owner: string }): Group {
    if (this.groups.size >= MAX_GROUPS) throw Object.assign(new Error('group table full'), { status: 429 });
    const name = params.name?.trim();
    if (!name) throw Object.assign(new Error('name required'), { status: 422 });
    if (name.length > MAX_GROUP_NAME_LENGTH) throw Object.assign(new Error(`name exceeds ${MAX_GROUP_NAME_LENGTH} chars`), { status: 422 });
    const description = (params.description ?? '').trim();
    if (description.length > MAX_GROUP_DESCRIPTION_LENGTH) throw Object.assign(new Error(`description exceeds ${MAX_GROUP_DESCRIPTION_LENGTH} chars`), { status: 422 });
    if (!this.identity.resolve(params.owner)) throw Object.assign(new Error('owner is not a registered identity'), { status: 422 });

    const group: Group = {
      id: `grp_${uuid()}`,
      name,
      description,
      access: params.access === 'closed' ? 'closed' : 'open',
      owner: params.owner,
      createdAt: new Date().toISOString(),
    };
    this.groups.set(group.id, group);
    this.members.set(group.id, new Set([params.owner]));  // owner is a member
    this.groupProposals.set(group.id, []);
    this.opts.events?.emit('group.created', { name: group.name, owner: group.owner, access: group.access }, group.id);
    logger.info(`👥 Group created: ${group.id} "${name}" (${group.access})`);
    return group;
  }

  getGroup(id: string): Group | undefined { return this.groups.get(id); }
  listGroups(): Group[] { return [...this.groups.values()]; }
  getMembers(groupId: string): string[] { return [...(this.members.get(groupId) ?? [])]; }
  isMember(groupId: string, did: string): boolean { return this.members.get(groupId)?.has(did) ?? false; }

  /**
   * Self-join an OPEN group. The join is a DID-signed act: the signature
   * over joinPayload proves the joiner controls the DID's current key
   * (or a key in its rotation history).
   */
  join(groupId: string, did: string, publicKeyPem: string, signature: string): { joined: boolean; alreadyMember: boolean } {
    const group = this.getGroupOrThrow(groupId);
    if (group.access !== 'open') throw Object.assign(new Error('closed group: owner must add members'), { status: 403 });
    const memberSet = this.members.get(groupId)!;
    if (memberSet.has(did)) return { joined: true, alreadyMember: true };
    if (memberSet.size >= MAX_MEMBERS_PER_GROUP) throw Object.assign(new Error('group member cap reached'), { status: 429 });

    const doc = this.identity.resolve(did);
    if (!doc) throw Object.assign(new Error('DID not found'), { status: 404 });
    if (!keyHistory(doc).includes(publicKeyPem)) throw Object.assign(new Error('key does not belong to the DID'), { status: 422 });
    try {
      const key = createPublicKey(publicKeyPem);
      const ok = edVerify(null, Buffer.from(joinPayload(groupId, did), 'utf8'), key, Buffer.from(signature, 'base64'));
      if (!ok) throw new Error('bad signature');
    } catch {
      throw Object.assign(new Error('invalid join signature'), { status: 422 });
    }

    memberSet.add(did);
    this.opts.events?.emit('group.member.joined', { did }, groupId);
    return { joined: true, alreadyMember: false };
  }

  /** Owner adds a member (required for closed groups, allowed for open). */
  addMember(groupId: string, ownerDid: string, memberDid: string): { added: boolean; alreadyMember: boolean } {
    const group = this.getGroupOrThrow(groupId);
    if (group.owner !== ownerDid) throw Object.assign(new Error('only the owner may add members'), { status: 403 });
    if (!this.identity.resolve(memberDid)) throw Object.assign(new Error('member DID not found'), { status: 404 });
    const memberSet = this.members.get(groupId)!;
    if (memberSet.has(memberDid)) return { added: true, alreadyMember: true };
    if (memberSet.size >= MAX_MEMBERS_PER_GROUP) throw Object.assign(new Error('group member cap reached'), { status: 429 });
    memberSet.add(memberDid);
    this.opts.events?.emit('group.member.joined', { did: memberDid, addedBy: ownerDid }, groupId);
    return { added: true, alreadyMember: false };
  }

  leave(groupId: string, did: string): { left: boolean } {
    const group = this.getGroupOrThrow(groupId);
    if (did === group.owner) throw Object.assign(new Error('owner cannot leave their own group'), { status: 409 });
    const removed = this.members.get(groupId)!.delete(did);
    if (!removed) throw Object.assign(new Error('not a member'), { status: 404 });
    this.opts.events?.emit('group.member.left', { did }, groupId);
    return { left: true };
  }

  // ── Proposals ───────────────────────────────────────────────────────────────

  createProposal(groupId: string, params: {
    question: string; options: string[]; createdBy: string; mode?: GroupWeightMode;
  }): GroupProposal {
    this.getGroupOrThrow(groupId);
    if (!this.isMember(groupId, params.createdBy)) throw Object.assign(new Error('only members may create proposals'), { status: 403 });
    const proposalIds = this.groupProposals.get(groupId)!;
    if (proposalIds.length >= MAX_GROUP_PROPOSALS) throw Object.assign(new Error('group proposal cap reached'), { status: 429 });

    const question = params.question?.trim();
    if (!question) throw Object.assign(new Error('question required'), { status: 422 });
    if (question.length > MAX_QUESTION_LENGTH) throw Object.assign(new Error(`question exceeds ${MAX_QUESTION_LENGTH} chars`), { status: 422 });
    const options = [...new Set(params.options ?? [])];
    if (options.length < 2) throw Object.assign(new Error('at least 2 distinct options required'), { status: 422 });
    if (options.length > MAX_OPTIONS) throw Object.assign(new Error(`at most ${MAX_OPTIONS} options allowed`), { status: 422 });
    if (options.some(o => typeof o !== 'string' || o.length === 0 || o.length > MAX_OPTION_LENGTH)) {
      throw Object.assign(new Error(`each option must be a non-empty string of at most ${MAX_OPTION_LENGTH} chars`), { status: 422 });
    }
    const mode = params.mode ?? 'identity';
    if (mode === 'stake' && !this.opts.valueChain) throw Object.assign(new Error('stake mode requires a value chain'), { status: 422 });

    const proposal: GroupProposal = {
      id: `gprop_${uuid()}`,
      groupId,
      question,
      options,
      mode,
      createdBy: params.createdBy,
      createdAt: new Date().toISOString(),
      status: 'open',
    };
    this.proposals.set(proposal.id, proposal);
    proposalIds.push(proposal.id);
    this.ballots.set(proposal.id, []);
    this.voted.set(proposal.id, new Set());
    this.opts.events?.emit('group.proposal.created', {
      proposalId: proposal.id, question, options, mode, createdBy: params.createdBy,
    }, groupId);
    logger.info(`👥🗳️  Group proposal opened (${mode}): "${question.substring(0, 60)}"`);
    return proposal;
  }

  getProposal(proposalId: string): GroupProposal | undefined { return this.proposals.get(proposalId); }
  listProposals(groupId: string): GroupProposal[] {
    return (this.groupProposals.get(groupId) ?? []).map(id => this.proposals.get(id)!).filter(Boolean);
  }

  // ── Voting ──────────────────────────────────────────────────────────────────

  /** Node-held identity convenience path: sign + submit. */
  castVote(proposalId: string, voterDid: string, option: string): GroupBallot {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw Object.assign(new Error('unknown proposal'), { status: 404 });
    const payload = groupBallotPayload({ proposalId, groupId: proposal.groupId, voter: voterDid, option });
    const { signature, publicKeyPem } = this.identity.signAs(voterDid, payload);
    const result = this.submitBallot({
      proposalId, groupId: proposal.groupId, voter: voterDid, option,
      weight: 0, ts: new Date().toISOString(), publicKeyPem, signature,
    });
    if (!result.accepted) throw Object.assign(new Error(result.reason), { status: 409 });
    return this.ballots.get(proposalId)!.find(b => b.voter === voterDid)!;
  }

  /**
   * Verify + apply a ballot:
   *  1. proposal open, option valid, groupId matches
   *  2. voter is a registered DID AND a group member (the membership gate)
   *  3. signature by a key in the voter's rotation history
   *  4. one ballot per member per proposal
   *  5. weight server-derived from the proposal mode
   */
  submitBallot(ballot: GroupBallot): { accepted: boolean; reason?: string } {
    const proposal = this.proposals.get(ballot.proposalId);
    if (!proposal) return { accepted: false, reason: 'unknown proposal' };
    if (proposal.status !== 'open') return { accepted: false, reason: 'proposal closed' };
    if (proposal.groupId !== ballot.groupId) return { accepted: false, reason: 'groupId mismatch' };
    if (!proposal.options.includes(ballot.option)) return { accepted: false, reason: 'unknown option' };
    if (!this.isMember(proposal.groupId, ballot.voter)) return { accepted: false, reason: 'voter is not a group member' };

    const doc = this.identity.resolve(ballot.voter);
    if (!doc) return { accepted: false, reason: 'voter is not a registered identity' };
    if (!keyHistory(doc).includes(ballot.publicKeyPem)) {
      return { accepted: false, reason: 'key does not belong to the voter identity' };
    }
    try {
      const key = createPublicKey(ballot.publicKeyPem);
      const ok = edVerify(null, Buffer.from(groupBallotPayload(ballot), 'utf8'), key, Buffer.from(ballot.signature, 'base64'));
      if (!ok) return { accepted: false, reason: 'signature mismatch' };
    } catch (e: any) {
      return { accepted: false, reason: e.message };
    }

    const votedSet = this.voted.get(ballot.proposalId)!;
    if (votedSet.has(ballot.voter)) return { accepted: false, reason: 'member already voted' };

    // Weight is NEVER taken from the submitted ballot — server-derived only.
    const weight = proposal.mode === 'identity'
      ? 1
      : Number(this.opts.valueChain!.getAccount(ballot.voter).balance / UNITS_PER_TOKEN);
    if (proposal.mode === 'stake' && weight <= 0) {
      return { accepted: false, reason: 'stake mode: voter has zero balance' };
    }

    votedSet.add(ballot.voter);
    const applied = { ...ballot, weight };
    this.ballots.get(ballot.proposalId)!.push(applied);

    this.opts.events?.emit('group.ballot.cast', {
      proposalId: ballot.proposalId, voter: ballot.voter, option: ballot.option,
      weight, ballotHash: groupBallotHash(applied),
    }, proposal.groupId);
    // Mirror into the 888 888 888-dim fact matrix (vote region)
    try {
      this.opts.matrix?.ingestVote({ proposalId: ballot.proposalId, voter: ballot.voter, option: ballot.option, weight });
    } catch (e: any) {
      logger.warn(`group ballot → matrix ingest failed: ${e.message}`);
    }
    return { accepted: true };
  }

  // ── Tally / close ───────────────────────────────────────────────────────────

  tally(proposalId: string): GroupTally {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw Object.assign(new Error('unknown proposal'), { status: 404 });
    const ballots = this.ballots.get(proposalId) ?? [];
    const totals: Record<string, number> = {};
    for (const opt of proposal.options) totals[opt] = 0;
    for (const b of ballots) totals[b.option] += b.weight;

    let winner: string | null = null;
    let best = -1;
    let tied = false;
    for (const [opt, w] of Object.entries(totals)) {
      if (w > best) { best = w; winner = opt; tied = false; }
      else if (w === best) tied = true;
    }
    if (tied || ballots.length === 0) winner = null;

    return {
      proposalId,
      groupId: proposal.groupId,
      mode: proposal.mode,
      totals,
      ballots: ballots.length,
      turnoutMembers: this.voted.get(proposalId)?.size ?? 0,
      eligibleMembers: this.members.get(proposal.groupId)?.size ?? 0,
      winner,
    };
  }

  close(proposalId: string): GroupVotingCertificate {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw Object.assign(new Error('unknown proposal'), { status: 404 });
    if (proposal.status === 'closed') return this.certificates.get(proposalId)!;

    proposal.status = 'closed';
    proposal.closedAt = new Date().toISOString();
    const tallyResult = this.tally(proposalId);
    const leaves = (this.ballots.get(proposalId) ?? []).map(groupBallotHash);

    const unsigned = {
      proposalId,
      groupId: proposal.groupId,
      question: proposal.question,
      mode: proposal.mode,
      tally: tallyResult,
      ballotRoot: buildMerkleRoot(leaves),
      closedAt: proposal.closedAt,
    };
    const cert: GroupVotingCertificate = { ...unsigned, certHash: sha256(canonicalize(unsigned)) };
    this.certificates.set(proposalId, cert);
    this.opts.events?.emit('group.proposal.closed', {
      proposalId, winner: tallyResult.winner, ballots: tallyResult.ballots, certHash: cert.certHash,
    }, proposal.groupId);
    if (this.onClose) {
      try { this.onClose(cert); }
      catch (e: any) { logger.warn(`group-voting onClose hook failed: ${e.message}`); }
    }
    logger.info(`👥🗳️  Group proposal closed: winner=${tallyResult.winner ?? 'tie'} (${tallyResult.ballots} ballots)`);
    return cert;
  }

  getCertificate(proposalId: string): GroupVotingCertificate | undefined {
    return this.certificates.get(proposalId);
  }

  getBallots(proposalId: string): GroupBallot[] {
    return [...(this.ballots.get(proposalId) ?? [])];
  }

  // ── internal ────────────────────────────────────────────────────────────────

  private getGroupOrThrow(id: string): Group {
    const g = this.groups.get(id);
    if (!g) throw Object.assign(new Error('group not found'), { status: 404 });
    return g;
  }
}

// ── REST routes ───────────────────────────────────────────────────────────────

export function registerGroupVotingRoutes(app: Express, svc: GroupVotingService, events?: GroupEventBus): void {

  app.post('/api/groups', (req: Request, res: Response): void => {
    const { name, description, access, owner } = req.body ?? {};
    if (!owner) { res.status(422).json({ success: false, error: 'owner DID required' }); return; }
    try {
      const group = svc.createGroup({ name, description, access, owner });
      res.status(201).json({ success: true, group });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/groups', (_req: Request, res: Response): void => {
    const groups = svc.listGroups();
    res.json({ success: true, count: groups.length, groups, events: events?.stats });
  });

  app.get('/api/groups/:id', (req: Request, res: Response): void => {
    const group = svc.getGroup(req.params.id);
    if (!group) { res.status(404).json({ success: false, error: 'group not found' }); return; }
    res.json({
      success: true,
      group,
      members: svc.getMembers(group.id),
      proposals: svc.listProposals(group.id),
    });
  });

  app.post('/api/groups/:id/join', (req: Request, res: Response): void => {
    const { did, publicKeyPem, signature } = req.body ?? {};
    if (!did || !publicKeyPem || !signature) {
      res.status(422).json({ success: false, error: 'did, publicKeyPem, signature required' }); return;
    }
    try {
      const result = svc.join(req.params.id, did, publicKeyPem, signature);
      res.status(result.alreadyMember ? 200 : 201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/groups/:id/members', (req: Request, res: Response): void => {
    const { owner, member } = req.body ?? {};
    if (!owner || !member) { res.status(422).json({ success: false, error: 'owner and member DIDs required' }); return; }
    try {
      const result = svc.addMember(req.params.id, owner, member);
      res.status(result.alreadyMember ? 200 : 201).json({ success: true, ...result });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/groups/:id/leave', (req: Request, res: Response): void => {
    const { did } = req.body ?? {};
    if (!did) { res.status(422).json({ success: false, error: 'did required' }); return; }
    try {
      res.json({ success: true, ...svc.leave(req.params.id, did) });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/groups/:id/proposals', (req: Request, res: Response): void => {
    const { question, options, createdBy, mode } = req.body ?? {};
    if (!createdBy) { res.status(422).json({ success: false, error: 'createdBy DID required' }); return; }
    try {
      const proposal = svc.createProposal(req.params.id, { question, options, createdBy, mode });
      res.status(201).json({ success: true, proposal });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/groups/:id/proposals/:pid', (req: Request, res: Response): void => {
    const proposal = svc.getProposal(req.params.pid);
    if (!proposal || proposal.groupId !== req.params.id) {
      res.status(404).json({ success: false, error: 'proposal not found in this group' }); return;
    }
    res.json({
      success: true,
      proposal,
      tally: svc.tally(proposal.id),
      certificate: svc.getCertificate(proposal.id) ?? null,
    });
  });

  app.post('/api/groups/:id/proposals/:pid/vote', (req: Request, res: Response): void => {
    const { voter, option, ballot } = req.body ?? {};
    // Two entry points (same as sovereign voting): node-held DID or signed ballot
    if (ballot?.signature) {
      const result = svc.submitBallot({ ...ballot, proposalId: req.params.pid, groupId: req.params.id });
      res.status(result.accepted ? 201 : 409).json({ success: result.accepted, ...result });
      return;
    }
    if (!voter || !option) {
      res.status(422).json({ success: false, error: 'voter+option (node-held) or signed ballot required' }); return;
    }
    try {
      const cast = svc.castVote(req.params.pid, voter, option);
      res.status(201).json({ success: true, ballot: cast });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/groups/:id/proposals/:pid/close', (req: Request, res: Response): void => {
    try {
      const proposal = svc.getProposal(req.params.pid);
      if (!proposal || proposal.groupId !== req.params.id) {
        res.status(404).json({ success: false, error: 'proposal not found in this group' }); return;
      }
      res.json({ success: true, certificate: svc.close(req.params.pid) });
    } catch (err: any) {
      res.status(err.status ?? 500).json({ success: false, error: err.message });
    }
  });

  logger.info('✓ Group voting API registered (/api/groups/*)');
}

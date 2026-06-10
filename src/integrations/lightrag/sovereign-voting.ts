/**
 * Sovereign Identified Voting — DID-bound, sybil-resistant referenda
 *
 * Voting where every ballot is cryptographically bound to a sovereign
 * identity (identity.ts). Compared to the agent-name voting in
 * vote-certificate.ts, this layer adds:
 *
 *  - SYBIL RESISTANCE: only registered DIDs may vote, and a DID votes at
 *    most once per proposal. Creating a thousand fake names buys nothing —
 *    each would need its own registered identity.
 *
 *  - SELF-CERTIFYING BALLOTS: the ballot is signed with the voter's current
 *    identity key, and the voter DID must verify against the identity
 *    document (rotation-chain aware). No central voter registry is trusted.
 *
 *  - TWO WEIGHT MODES:
 *      'identity' — one DID, one vote (democratic)
 *      'stake'    — ballot weight = the voter's value-chain balance at cast
 *                   time (plutocratic, like on-chain governance). Mode is
 *                   fixed per proposal at creation.
 *
 *  - VERIFIABLE RESULT: closing a proposal produces a certificate with a
 *    Merkle root over ballot hashes; the certificate can be published as a
 *    signed news claim ("stem resultaat als nieuws") and anchored on-chain
 *    with the rest of the graph.
 *
 * REST (registerSovereignVotingRoutes):
 *   POST /api/sovereign-votes/proposals             — create a proposal
 *   GET  /api/sovereign-votes/proposals             — list proposals
 *   GET  /api/sovereign-votes/proposals/:id         — proposal + tally
 *   POST /api/sovereign-votes/proposals/:id/vote    — cast a DID-bound ballot
 *   POST /api/sovereign-votes/proposals/:id/close   — close + certificate (+news)
 */

import { verify as edVerify, createPublicKey } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import type { IdentityPort } from './identity-port';
import type { ValueChainService } from './value-chain';
import type { NewsService } from './news';
import { keyHistory } from './identity';
import { UNITS_PER_TOKEN } from './value-chain';
import { canonicalize, sha256, buildMerkleRoot } from './graph-state-root';
import logger from '../../utils/logger';

// ── DoS bounds ────────────────────────────────────────────────────────────────
export const MAX_PROPOSALS = 10_000;
export const MAX_OPTIONS = 32;
export const MAX_QUESTION_LENGTH = 2048;
export const MAX_OPTION_LENGTH = 256;

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type WeightMode = 'identity' | 'stake';
export type ProposalStatus = 'open' | 'closed';

export interface Proposal {
  id: string;
  question: string;
  options: string[];             // ≥ 2 distinct options
  mode: WeightMode;
  createdBy: string;             // DID of the proposer
  createdAt: string;
  status: ProposalStatus;
  closedAt?: string;
}

export interface Ballot {
  proposalId: string;
  voter: string;                 // DID
  option: string;
  weight: number;                // 1 for 'identity'; balance snapshot for 'stake'
  ts: string;                    // informational, NOT signed
  publicKeyPem: string;
  signature: string;             // base64 Ed25519 over ballotPayload
}

export interface Tally {
  proposalId: string;
  mode: WeightMode;
  totals: Record<string, number>;   // option → summed weight
  ballots: number;
  turnoutDids: number;
  winner: string | null;            // null on tie or no ballots
}

export interface VotingCertificate {
  proposalId: string;
  question: string;
  mode: WeightMode;
  tally: Tally;
  ballotRoot: string;            // Merkle root over ballot hashes
  closedAt: string;
  certHash: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * The exact bytes a ballot signature covers. `ts`, `weight` and the key are
 * EXCLUDED: weight is derived server-side from the proposal mode (a voter
 * must not be able to claim their own weight), and excluding volatile fields
 * keeps the signed bytes identical across peers.
 */
export function ballotPayload(b: Pick<Ballot, 'proposalId' | 'voter' | 'option'>): string {
  return canonicalize({ proposalId: b.proposalId, voter: b.voter, option: b.option });
}

export function ballotHash(b: Ballot): string {
  return sha256(canonicalize({
    proposalId: b.proposalId,
    voter: b.voter,
    option: b.option,
    weight: b.weight,
  }));
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

export class SovereignVotingService {
  private lightrag: LightRAGClient;
  private identity: IdentityPort;
  private valueChain?: ValueChainService;
  private news?: NewsService;
  private proposals = new Map<string, Proposal>();
  private ballots = new Map<string, Ballot[]>();        // proposalId → ballots
  private voted = new Map<string, Set<string>>();       // proposalId → DIDs that voted
  private certificates = new Map<string, VotingCertificate>();
  private maxProposals: number;

  constructor(
    lightrag: LightRAGClient,
    opts: {
      identity: IdentityPort;
      valueChain?: ValueChainService;
      news?: NewsService;
      maxProposals?: number;
    },
  ) {
    this.lightrag = lightrag;
    this.identity = opts.identity;
    this.valueChain = opts.valueChain;
    this.news = opts.news;
    this.maxProposals = opts.maxProposals ?? MAX_PROPOSALS;
  }

  // ── Proposals ───────────────────────────────────────────────────────────────

  createProposal(params: { question: string; options: string[]; createdBy: string; mode?: WeightMode }): Proposal {
    if (!params.question?.trim()) throw new Error('question required');
    if (params.question.length > MAX_QUESTION_LENGTH) throw new Error(`question exceeds ${MAX_QUESTION_LENGTH} chars`);
    if (this.proposals.size >= this.maxProposals) throw new Error('proposal table full');
    const options = [...new Set(params.options ?? [])];
    if (options.length < 2) throw new Error('at least 2 distinct options required');
    if (options.length > MAX_OPTIONS) throw new Error(`at most ${MAX_OPTIONS} options allowed`);
    if (options.some(o => typeof o !== 'string' || o.length === 0 || o.length > MAX_OPTION_LENGTH)) {
      throw new Error(`each option must be a non-empty string of at most ${MAX_OPTION_LENGTH} chars`);
    }
    if (!this.identity.resolve(params.createdBy)) throw new Error(`proposer ${params.createdBy} is not a registered identity`);
    const mode = params.mode ?? 'identity';
    if (mode === 'stake' && !this.valueChain) throw new Error('stake mode requires a value chain');

    const proposal: Proposal = {
      id: `prop_${uuid()}`,
      question: params.question.trim(),
      options,
      mode,
      createdBy: params.createdBy,
      createdAt: new Date().toISOString(),
      status: 'open',
    };
    this.proposals.set(proposal.id, proposal);
    this.ballots.set(proposal.id, []);
    this.voted.set(proposal.id, new Set());
    void this.persistProposal(proposal);
    logger.info(`🗳️  Proposal opened (${mode}): "${proposal.question.substring(0, 60)}"`);
    return proposal;
  }

  getProposal(id: string): Proposal | undefined {
    return this.proposals.get(id);
  }

  listProposals(status?: ProposalStatus): Proposal[] {
    let all = Array.from(this.proposals.values());
    if (status) all = all.filter(p => p.status === status);
    return all;
  }

  // ── Voting ──────────────────────────────────────────────────────────────────

  /**
   * Cast a ballot for a NODE-HELD identity: this node signs with the DID's
   * current key, then routes through the same verification as peer ballots.
   */
  castVote(proposalId: string, voterDid: string, option: string): Ballot {
    const payload = ballotPayload({ proposalId, voter: voterDid, option });
    const { signature, publicKeyPem } = this.identity.signAs(voterDid, payload);
    const ballot: Ballot = {
      proposalId,
      voter: voterDid,
      option,
      weight: 0,                 // assigned by submitBallot from the proposal mode
      ts: new Date().toISOString(),
      publicKeyPem,
      signature,
    };
    const result = this.submitBallot(ballot);
    if (!result.accepted) throw new Error(result.reason);
    return this.ballots.get(proposalId)!.find(b => b.voter === voterDid)!;
  }

  /**
   * Verify + apply a ballot (local or from a peer):
   *  1. proposal open, option valid
   *  2. voter is a REGISTERED identity (sybil gate)
   *  3. signing key is the voter's current key OR in their key history
   *     (a ballot cast just before a rotation still verifies)
   *  4. DID has not voted on this proposal yet
   *  5. weight assigned server-side from the proposal mode
   */
  submitBallot(ballot: Ballot): { accepted: boolean; reason?: string } {
    const proposal = this.proposals.get(ballot.proposalId);
    if (!proposal) return { accepted: false, reason: 'unknown proposal' };
    if (proposal.status !== 'open') return { accepted: false, reason: 'proposal closed' };
    if (!proposal.options.includes(ballot.option)) return { accepted: false, reason: 'unknown option' };

    const doc = this.identity.resolve(ballot.voter);
    if (!doc) return { accepted: false, reason: 'voter is not a registered identity' };
    if (!keyHistory(doc).includes(ballot.publicKeyPem)) {
      return { accepted: false, reason: 'key does not belong to the voter identity' };
    }
    try {
      const key = createPublicKey(ballot.publicKeyPem);
      const ok = edVerify(null, Buffer.from(ballotPayload(ballot), 'utf8'), key, Buffer.from(ballot.signature, 'base64'));
      if (!ok) return { accepted: false, reason: 'signature mismatch' };
    } catch (e: any) {
      return { accepted: false, reason: e.message };
    }

    const votedSet = this.voted.get(ballot.proposalId)!;
    if (votedSet.has(ballot.voter)) return { accepted: false, reason: 'did already voted' };

    // Weight is NEVER taken from the submitted ballot — server-derived only.
    // Stake weight = WHOLE tokens (exact bigint balance floored to tokens):
    // the ledger keeps full 10⁻⁸ precision, the vote quantizes to tokens by
    // policy, and the quantized value stays far inside double precision.
    const weight = proposal.mode === 'identity'
      ? 1
      : Number(this.valueChain!.getAccount(ballot.voter).balance / UNITS_PER_TOKEN);
    if (proposal.mode === 'stake' && weight <= 0) {
      return { accepted: false, reason: 'stake mode: voter has zero balance' };
    }

    votedSet.add(ballot.voter);
    this.ballots.get(ballot.proposalId)!.push({ ...ballot, weight });
    return { accepted: true };
  }

  // ── Tally / close ───────────────────────────────────────────────────────────

  tally(proposalId: string): Tally {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error('unknown proposal');
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
      mode: proposal.mode,
      totals,
      ballots: ballots.length,
      turnoutDids: this.voted.get(proposalId)?.size ?? 0,
      winner,
    };
  }

  /**
   * Close the proposal and produce the verifiable certificate. When a news
   * service is wired, the result is also published as a signed news claim
   * so it rides the unverified → p2p → anchored lifecycle.
   */
  async close(proposalId: string): Promise<VotingCertificate> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error('unknown proposal');
    if (proposal.status === 'closed') return this.certificates.get(proposalId)!;

    proposal.status = 'closed';
    proposal.closedAt = new Date().toISOString();
    const tallyResult = this.tally(proposalId);
    const leaves = (this.ballots.get(proposalId) ?? []).map(ballotHash);

    const unsigned = {
      proposalId,
      question: proposal.question,
      mode: proposal.mode,
      tally: tallyResult,
      ballotRoot: buildMerkleRoot(leaves),
      closedAt: proposal.closedAt,
    };
    const cert: VotingCertificate = { ...unsigned, certHash: sha256(canonicalize(unsigned)) };
    this.certificates.set(proposalId, cert);
    void this.persistProposal(proposal);

    if (this.news) {
      try {
        await this.news.publish({
          claimedFact: `Stemresultaat "${proposal.question}": ${tallyResult.winner ?? 'geen winnaar'} ` +
            `(${tallyResult.ballots} stemmen, mode ${proposal.mode}, cert ${cert.certHash.substring(0, 16)})`,
          source: `sovereign-voting:${proposalId}`,
          claimer: 'sovereign-voting',
        });
      } catch (e: any) {
        logger.warn(`voting → news publish failed: ${e.message}`);
      }
    }
    logger.info(`🗳️  Proposal closed: winner=${tallyResult.winner ?? 'tie'} (${tallyResult.ballots} ballots)`);
    return cert;
  }

  getCertificate(proposalId: string): VotingCertificate | undefined {
    return this.certificates.get(proposalId);
  }

  getBallots(proposalId: string): Ballot[] {
    return [...(this.ballots.get(proposalId) ?? [])];
  }

  // ── Persistence (offline-safe) ──────────────────────────────────────────────

  private async persistProposal(p: Proposal): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      await this.lightrag.mergeTypedNode(p.id, 'Proposal', {
        question: p.question,
        options: p.options,
        mode: p.mode,
        status: p.status,
        created_by: p.createdBy,
        created_at: p.createdAt,
        content: p.question,
      });
    } catch (e: any) {
      logger.warn(`proposal persist: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

export function registerSovereignVotingRoutes(app: Express, service: SovereignVotingService): void {

  app.post('/api/sovereign-votes/proposals', (req: Request, res: Response): void => {
    const { question, options, createdBy, mode } = req.body ?? {};
    try {
      const proposal = service.createProposal({ question, options, createdBy, mode });
      res.status(201).json({ success: true, proposal });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.get('/api/sovereign-votes/proposals', (req: Request, res: Response): void => {
    const status = req.query.status as ProposalStatus | undefined;
    res.json({ success: true, proposals: service.listProposals(status) });
  });

  app.get('/api/sovereign-votes/proposals/:id', (req: Request, res: Response): void => {
    const proposal = service.getProposal(req.params.id);
    if (!proposal) { res.status(404).json({ success: false, error: 'unknown proposal' }); return; }
    res.json({
      success: true,
      proposal,
      tally: service.tally(req.params.id),
      certificate: service.getCertificate(req.params.id) ?? null,
    });
  });

  app.post('/api/sovereign-votes/proposals/:id/vote', (req: Request, res: Response): void => {
    const { voter, option, ballot } = req.body ?? {};
    // Two entry points: node-held DID (voter+option) or externally signed ballot
    if (ballot?.signature) {
      const result = service.submitBallot({ ...ballot, proposalId: req.params.id });
      res.status(result.accepted ? 201 : 409).json({ success: result.accepted, ...result });
      return;
    }
    if (!voter || !option) {
      res.status(400).json({ success: false, error: 'voter+option (node-held) or signed ballot required' }); return;
    }
    try {
      res.status(201).json({ success: true, ballot: service.castVote(req.params.id, voter, option) });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/sovereign-votes/proposals/:id/close', async (req: Request, res: Response): Promise<void> => {
    try {
      const certificate = await service.close(req.params.id);
      res.json({ success: true, certificate });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  logger.info('✓ Sovereign Voting API registered (/api/sovereign-votes/*)');
}

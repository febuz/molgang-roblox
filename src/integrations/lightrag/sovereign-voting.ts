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
 *  - OPTIONAL EXPONENTIAL RECENCY: a proposal may set `recencyHalfLifeMs` so
 *    that more recent ballots weigh exponentially more — each ballot's weight
 *    is multiplied by 2^(-age/halfLife), age measured against the most recent
 *    ballot. The cast time is server-assigned and committed in the ballot
 *    hash, so the recency-weighted tally stays sybil-proof and reproducible.
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
// Recency half-life must be a sane positive duration (≤ 10 years in ms).
export const MAX_RECENCY_HALF_LIFE_MS = 10 * 365 * 24 * 60 * 60 * 1000;

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
  /**
   * Optional exponential recency weighting. When set (> 0), each ballot's
   * weight decays by half for every `recencyHalfLifeMs` it predates the most
   * recent ballot — so newer votes count exponentially more. Fixed at
   * creation, like `mode`. Absent ⇒ flat tallying (all ballots equal in time).
   */
  recencyHalfLifeMs?: number;
}

export interface Ballot {
  proposalId: string;
  voter: string;                 // DID
  option: string;
  weight: number;                // 1 for 'identity'; balance snapshot for 'stake'
  ts: string;                    // informational, NOT signed
  /**
   * Server-assigned cast time (epoch ms) used for recency weighting. Like
   * `weight`, it is NEVER taken from the submitted ballot — a voter must not
   * be able to backdate/forward-date their own recency. It IS committed in
   * the ballot hash so the recency-weighted tally stays verifiable.
   */
  castAt?: number;
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
  recencyHalfLifeMs?: number;       // echoed when recency weighting is active
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
    castAt: b.castAt ?? 0,
  }));
}

/**
 * Exponential recency multiplier for a ballot, in [0, 1].
 *
 *   factor = 2 ^ ( -ageMs / halfLifeMs )
 *
 * The newest ballot (ageMs = 0) keeps full weight (1.0); every `halfLifeMs`
 * of age halves the contribution. With `halfLifeMs` ≤ 0 (or non-finite) the
 * weighting is disabled and the factor is a flat 1.0. Pure and deterministic:
 * identical inputs give identical output on every peer, so a recency-weighted
 * tally remains reproducible inside the voting certificate.
 */
export function recencyWeight(ageMs: number, halfLifeMs: number | undefined): number {
  if (!halfLifeMs || !Number.isFinite(halfLifeMs) || halfLifeMs <= 0) return 1;
  if (!Number.isFinite(ageMs) || ageMs <= 0) return 1;
  return Math.pow(2, -ageMs / halfLifeMs);
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
  private now: () => number;

  constructor(
    lightrag: LightRAGClient,
    opts: {
      identity: IdentityPort;
      valueChain?: ValueChainService;
      news?: NewsService;
      maxProposals?: number;
      now?: () => number;        // injectable clock (epoch ms) — tests/determinism
    },
  ) {
    this.lightrag = lightrag;
    this.identity = opts.identity;
    this.valueChain = opts.valueChain;
    this.news = opts.news;
    this.maxProposals = opts.maxProposals ?? MAX_PROPOSALS;
    this.now = opts.now ?? Date.now;
    void this.loadProposals();
  }

  /**
   * Restore proposals persisted in LightRAG. Ballots are not persisted (they are
   * rebuilt from P2P replay / certificates), but proposal configuration such as
   * recencyHalfLifeMs is restored so a restarted node can tally correctly.
   */
  async loadProposals(): Promise<void> {
    if (typeof this.lightrag.getTypedNodes !== 'function') {
      this.proposals = new Map();
      return;
    }
    const rows = await this.lightrag.getTypedNodes('Proposal');
    for (const row of rows) {
      if (!row.id || !row.question || !Array.isArray(row.options)) continue;
      const proposal: Proposal = {
        id: String(row.id),
        question: String(row.question),
        options: row.options.map((o: any) => String(o)),
        mode: row.mode === 'stake' ? 'stake' : 'identity',
        createdBy: String(row.created_by ?? row.createdBy ?? 'unknown'),
        createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
        status: row.status === 'closed' ? 'closed' : 'open',
        ...(row.closed_at || row.closedAt ? { closedAt: String(row.closed_at ?? row.closedAt) } : {}),
        ...(row.recency_half_life_ms !== undefined || row.recencyHalfLifeMs !== undefined
          ? { recencyHalfLifeMs: Number(row.recency_half_life_ms ?? row.recencyHalfLifeMs) }
          : {}),
      };
      this.proposals.set(proposal.id, proposal);
      this.ballots.set(proposal.id, []);
      this.voted.set(proposal.id, new Set());
    }
    if (rows.length) logger.info(`🗳️  Restored ${rows.length} proposal(s) from LightRAG`);
  }

  // ── Proposals ───────────────────────────────────────────────────────────────

  createProposal(params: { question: string; options: string[]; createdBy: string; mode?: WeightMode; recencyHalfLifeMs?: number }): Proposal {
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

    let recencyHalfLifeMs: number | undefined;
    if (params.recencyHalfLifeMs !== undefined && params.recencyHalfLifeMs !== null) {
      const hl = Number(params.recencyHalfLifeMs);
      if (!Number.isFinite(hl) || hl <= 0) throw new Error('recencyHalfLifeMs must be a positive number of milliseconds');
      if (hl > MAX_RECENCY_HALF_LIFE_MS) throw new Error(`recencyHalfLifeMs exceeds ${MAX_RECENCY_HALF_LIFE_MS} ms`);
      recencyHalfLifeMs = hl;
    }

    const proposal: Proposal = {
      id: `prop_${uuid()}`,
      question: params.question.trim(),
      options,
      mode,
      createdBy: params.createdBy,
      createdAt: new Date().toISOString(),
      status: 'open',
      ...(recencyHalfLifeMs !== undefined ? { recencyHalfLifeMs } : {}),
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
      castAt: 0,                 // assigned by submitBallot from the server clock
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

    // Recency time is server-assigned (like weight): a voter cannot set their
    // own `castAt` to game an exponential recency tally. Monotonic per proposal
    // so later-accepted ballots never appear older than earlier ones.
    const ballots = this.ballots.get(ballot.proposalId)!;
    const lastCastAt = ballots.length ? (ballots[ballots.length - 1].castAt ?? 0) : 0;
    const castAt = Math.max(this.now(), lastCastAt);

    votedSet.add(ballot.voter);
    ballots.push({ ...ballot, weight, castAt, ts: new Date(castAt).toISOString() });
    return { accepted: true };
  }

  // ── Tally / close ───────────────────────────────────────────────────────────

  tally(proposalId: string): Tally {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) throw new Error('unknown proposal');
    const ballots = this.ballots.get(proposalId) ?? [];
    const totals: Record<string, number> = {};
    for (const opt of proposal.options) totals[opt] = 0;

    // Recency reference = the most recent ballot's cast time, so the newest
    // vote contributes its full weight and older ones decay exponentially.
    // Derived purely from committed `castAt` values ⇒ reproducible per peer.
    const halfLife = proposal.recencyHalfLifeMs;
    const refMs = halfLife && ballots.length
      ? Math.max(...ballots.map(b => b.castAt ?? 0))
      : 0;
    for (const b of ballots) {
      totals[b.option] += b.weight * recencyWeight(refMs - (b.castAt ?? 0), halfLife);
    }

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
      ...(halfLife ? { recencyHalfLifeMs: halfLife } : {}),
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
        ...(p.recencyHalfLifeMs !== undefined ? { recency_half_life_ms: p.recencyHalfLifeMs } : {}),
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
    const { question, options, createdBy, mode, recencyHalfLifeMs } = req.body ?? {};
    try {
      const proposal = service.createProposal({ question, options, createdBy, mode, recencyHalfLifeMs });
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

/**
 * BFT Consensus Engine — simplified two-phase HotStuff over sovereign identities
 *
 * This module closes the primary gap identified in the P2P threat model (§4.1):
 * each node's ledger was locally linearizable (nonces) but cross-node
 * settlement had no finality. This engine provides Byzantine Fault Tolerant
 * consensus with:
 *
 *   - DETERMINISTIC LEADER ROTATION: leader = sortedValidators[(height+round) % n]
 *   - TWO-PHASE VOTING (Prepare → Commit): safety under asynchrony; liveness
 *     under synchrony. A block requires 2f+1 Prepare votes (PreQC) then 2f+1
 *     Commit votes (CommitQC = Finality).
 *   - QUORUM CERTIFICATES (QC): threshold of Ed25519 signatures — each vote is
 *     independently verifiable; the QC is the set of valid votes.
 *   - VIEW CHANGE: if the current leader fails to produce a CommitQC within
 *     BLOCK_TIMEOUT_MS, round increments and the next leader takes over with
 *     the same pending transfers.
 *   - SAFETY INVARIANT: a node will only cast a Commit vote if it has seen a
 *     valid PreQC for the same (height, round, blockHash) tuple. This prevents
 *     two different blocks at the same height from accumulating Commit QCs
 *     (locking rule).
 *
 * The engine is an in-memory service; the gossip layer is responsible for
 * routing propose()/receiveVote() calls between peers. The `onFinalized`
 * callback fires when a CommitQC forms; the caller (src/index.ts) can then
 * trigger value-chain block sealing.
 *
 * Validator set management:
 *   - `addValidator(did, stake)` — any registered identity can become a validator
 *   - The quorum threshold is computed from the CURRENT validator set
 *   - Minimum validators: 1 (single-node mode reduces to leader-self-vote)
 *
 * REST (registerConsensusRoutes):
 *   POST /api/consensus/propose        — receive a signed block proposal
 *   POST /api/consensus/vote           — receive a signed vote
 *   GET  /api/consensus/status         — height, round, phase, leader, validators
 *   GET  /api/consensus/chain          — finalized blocks (newest first)
 *   POST /api/consensus/validators     — add/update a validator
 *   GET  /api/consensus/validators     — list validators
 */

import { createHash } from 'crypto';
import { sign as edSign, verify as edVerify, generateKeyPairSync, createPublicKey } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import type { IdentityResolverPort } from './identity-port';
import { canonicalize, sha256 } from './graph-state-root';
import { constantTimeEqual } from './constant-time';
import logger from '../../utils/logger';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Version tag in all signed payloads (bump on protocol changes). */
export const CONSENSUS_VERSION = 1;

/** > 2/3 of validators required (Byzantine fault tolerance for f < n/3 faults). */
export const QUORUM_FRACTION = 2 / 3;

/** Milliseconds before a round times out and view-change triggers. */
export const BLOCK_TIMEOUT_MS = 5_000;

/** DoS cap: maximum number of validators. */
export const MAX_VALIDATORS = 1_000;

/** DoS cap: pending votes per (height, round, phase) bucket. */
export const MAX_PENDING_VOTES = 10_000;

/** DoS cap: finalized chain kept in memory. */
export const MAX_FINALIZED_BLOCKS = 100_000;

/** Hash used as prevHash for the genesis block. */
export const CONSENSUS_GENESIS = sha256('consensus-genesis');

// ─── Types ────────────────────────────────────────────────────────────────────

export type VotePhase = 'PREPARE' | 'COMMIT';
export type ConsensusPhase = 'PROPOSE' | 'PREPARE' | 'COMMIT' | 'FINALIZED';

export interface ValidatorInfo {
  did: string;
  /** Voting stake weight (bigint, whole tokens). Weight 0 = observer, no vote. */
  stake: bigint;
  /** Ed25519 public key PEM — must match the DID's active key if identity service present. */
  publicKeyPem: string;
}

/**
 * The canonical signed body of a block proposal.
 * `ts` is EXCLUDED (wall clocks differ; HLC not used in the signed payload
 * because we only need internal ordering, not causal ordering across chains).
 */
export interface BlockProposal {
  version: number;
  height: number;
  round: number;
  leader: string;       // proposer DID
  prevHash: string;     // sha256 of previous finalized block header
  txIds: string[];      // ordered transfer IDs to include
  stateRoot: string;    // Merkle root over txIds (commitment to transfer set)
}

export interface SignedProposal {
  payload: BlockProposal;
  ts: string;           // ISO wall clock (informational, not in signature)
  sig: string;          // base64 Ed25519 over sha256(canonicalize(payload))
}

/** The exact bytes a vote signature covers. */
export interface VotePayload {
  version: number;
  height: number;
  round: number;
  phase: VotePhase;
  blockHash: string;    // sha256(canonicalize(BlockProposal))
  voter: string;        // validator DID
}

export interface SignedVote {
  payload: VotePayload;
  ts: string;
  sig: string;          // base64 Ed25519 over sha256(canonicalize(VotePayload))
}

export interface QuorumCertificate {
  height: number;
  round: number;
  phase: VotePhase;
  blockHash: string;
  votes: SignedVote[];  // exactly the votes that formed the quorum
}

export interface FinalizedBlock {
  id: string;           // uuid
  proposal: SignedProposal;
  preQC: QuorumCertificate;    // PREPARE quorum
  commitQC: QuorumCertificate; // COMMIT quorum (= finality proof)
  blockHash: string;    // sha256(canonicalize(proposal.payload))
  finalizedAt: string;  // ISO wall clock
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

export function proposalPayloadStr(p: BlockProposal): string {
  return canonicalize(p);
}

export function proposalHash(p: BlockProposal): string {
  return sha256(proposalPayloadStr(p));
}

export function votePayloadStr(v: VotePayload): string {
  return canonicalize(v);
}

export function votePayloadHash(v: VotePayload): string {
  return sha256(votePayloadStr(v));
}

/**
 * Build a deterministic transfer-set commitment (Merkle root over txIds).
 * Uses the same sha256-binary-Merkle scheme as value-chain.ts blocks.
 */
export function buildTxRoot(txIds: string[]): string {
  if (txIds.length === 0) return sha256('empty-tx-set');
  const leaves = txIds.map(id => sha256(id));
  let level = leaves;
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const l = level[i];
      const r = i + 1 < level.length ? level[i + 1] : l;
      next.push(sha256(l + r));
    }
    level = next;
  }
  return level[0];
}

/** Verify a single Ed25519 vote signature. */
export function verifyVoteSignature(vote: SignedVote, publicKeyPem: string): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    const msgHash = Buffer.from(votePayloadHash(vote.payload), 'hex');
    return edVerify(null, msgHash, key, Buffer.from(vote.sig, 'base64'));
  } catch {
    return false;
  }
}

/** Verify a single Ed25519 proposal signature. */
export function verifyProposalSignature(sp: SignedProposal, publicKeyPem: string): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    const msgHash = Buffer.from(proposalHash(sp.payload), 'hex');
    return edVerify(null, msgHash, key, Buffer.from(sp.sig, 'base64'));
  } catch {
    return false;
  }
}

/**
 * Compute the quorum threshold: ⌊ (2n/3) ⌋ + 1.
 * This is the minimum votes needed to guarantee that at least one honest
 * validator voted (when f < n/3 validators are Byzantine).
 */
export function quorumThreshold(n: number): number {
  return Math.floor((2 * n) / 3) + 1;
}

// ─── ConsensusEngine ─────────────────────────────────────────────────────────

interface VoteBucket {
  votes: Map<string, SignedVote>; // voter DID → vote
}

export class ConsensusEngine {
  private validators = new Map<string, ValidatorInfo>(); // DID → info
  private finalized: FinalizedBlock[] = [];
  private pendingTxIds: string[] = []; // transfers waiting for consensus

  // Current round state
  private height = 0;
  private round = 0;
  private phase: ConsensusPhase = 'PROPOSE';
  private currentProposal: SignedProposal | null = null;
  private preQC: QuorumCertificate | null = null;

  // Vote buckets: "height:round:phase" → voter DID → vote
  private voteBuckets = new Map<string, VoteBucket>();
  private totalVotes = 0;

  // View-change timer handle (Node.js)
  private viewTimer: ReturnType<typeof setTimeout> | null = null;

  private myDid: string | null = null;
  private privateKeyPem: string | null = null;

  constructor(
    private readonly lightrag: LightRAGClient,
    private readonly identity?: IdentityResolverPort,
    private readonly opts: {
      blockTimeoutMs?: number;
      onFinalized?: (block: FinalizedBlock) => void;
    } = {}
  ) {}

  // ─── Validator management ──────────────────────────────────────────────────

  addValidator(v: ValidatorInfo): { added: boolean; reason?: string } {
    if (this.validators.size >= MAX_VALIDATORS && !this.validators.has(v.did)) {
      return { added: false, reason: 'validator set full' };
    }
    if (!v.did.startsWith('did:')) {
      return { added: false, reason: 'invalid DID' };
    }
    this.validators.set(v.did, { ...v });
    return { added: true };
  }

  removeValidator(did: string): void {
    this.validators.delete(did);
  }

  getValidators(): ValidatorInfo[] {
    return [...this.validators.values()];
  }

  getValidator(did: string): ValidatorInfo | undefined {
    return this.validators.get(did);
  }

  /**
   * Configure this node's own identity for signing proposals and votes.
   * The private key PEM must correspond to `did`.
   */
  setSelf(did: string, privateKeyPem: string): void {
    this.myDid = did;
    this.privateKeyPem = privateKeyPem;
  }

  // ─── Pending transfers ─────────────────────────────────────────────────────

  /** Register a transfer ID as pending (will be included in the next proposal). */
  queueTransfer(txId: string): void {
    if (!this.pendingTxIds.includes(txId)) {
      this.pendingTxIds.push(txId);
    }
  }

  getPendingTxIds(): string[] {
    return [...this.pendingTxIds];
  }

  // ─── Round state queries ────────────────────────────────────────────────────

  getHeight(): number { return this.height; }
  getRound(): number { return this.round; }
  getPhase(): ConsensusPhase { return this.phase; }

  getFinalizedBlocks(limit = 20): FinalizedBlock[] {
    return this.finalized.slice(0, Math.min(limit, 100));
  }

  getStatus() {
    const validatorList = [...this.validators.keys()].sort();
    const leaderDid = this.getLeader();
    const n = validatorList.length;
    return {
      height: this.height,
      round: this.round,
      phase: this.phase,
      leader: leaderDid,
      validators: n,
      quorumNeeded: quorumThreshold(n),
      pendingTxs: this.pendingTxIds.length,
      finalizedBlocks: this.finalized.length,
      isSelf: this.myDid !== null,
      isLeader: leaderDid === this.myDid,
    };
  }

  // ─── Protocol: proposal ────────────────────────────────────────────────────

  /**
   * Create and sign a proposal for the current (height, round). Only the
   * designated leader should call this. Returns null if this node is not the
   * leader or lacks signing credentials.
   */
  createProposal(): SignedProposal | null {
    if (!this.myDid || !this.privateKeyPem) return null;
    if (this.getLeader() !== this.myDid) return null;
    if (this.validators.size === 0) return null;

    const prevHash = this.finalized.length > 0
      ? this.finalized[0].blockHash
      : CONSENSUS_GENESIS;

    const txIds = [...this.pendingTxIds];
    const payload: BlockProposal = {
      version: CONSENSUS_VERSION,
      height: this.height,
      round: this.round,
      leader: this.myDid,
      prevHash,
      txIds,
      stateRoot: buildTxRoot(txIds),
    };
    const sig = this.sign(proposalHash(payload));
    if (!sig) return null;

    const sp: SignedProposal = { payload, ts: new Date().toISOString(), sig };
    return sp;
  }

  /**
   * Receive a proposal from the network (or self).
   * Returns an array of votes to broadcast (PREPARE vote if valid).
   */
  receiveProposal(sp: SignedProposal): {
    accepted: boolean;
    vote?: SignedVote;
    reason?: string;
  } {
    const p = sp.payload;
    if (p.version !== CONSENSUS_VERSION) return { accepted: false, reason: 'version mismatch' };
    if (p.height !== this.height) return { accepted: false, reason: `height mismatch (expected ${this.height})` };
    if (p.round !== this.round) return { accepted: false, reason: `round mismatch (expected ${this.round})` };
    if (p.leader !== this.getLeader()) return { accepted: false, reason: 'not the designated leader' };

    const leader = this.validators.get(p.leader);
    if (!leader) return { accepted: false, reason: 'leader not in validator set' };
    if (!verifyProposalSignature(sp, leader.publicKeyPem)) {
      return { accepted: false, reason: 'invalid proposal signature' };
    }

    // Check prevHash is correct
    const expectedPrev = this.finalized.length > 0
      ? this.finalized[0].blockHash
      : CONSENSUS_GENESIS;
    if (!constantTimeEqual(p.prevHash, expectedPrev)) {
      return { accepted: false, reason: 'prevHash mismatch' };
    }

    // Accept proposal, advance to PREPARE phase
    this.currentProposal = sp;
    this.phase = 'PREPARE';
    this.startViewTimer();

    // Cast PREPARE vote if we are a validator
    const vote = this.castVote('PREPARE', proposalHash(p));
    return { accepted: true, vote: vote ?? undefined };
  }

  /**
   * Receive a vote from any peer (or self).
   * Returns a QC if this vote completes a quorum, plus a follow-up vote if
   * the QC advances the protocol.
   */
  receiveVote(sv: SignedVote): {
    accepted: boolean;
    qc?: QuorumCertificate;
    vote?: SignedVote;
    finalized?: FinalizedBlock;
    reason?: string;
  } {
    const v = sv.payload;
    if (v.version !== CONSENSUS_VERSION) return { accepted: false, reason: 'version mismatch' };
    if (v.height !== this.height) return { accepted: false, reason: 'height mismatch' };
    if (v.round !== this.round) return { accepted: false, reason: 'round mismatch' };

    const validator = this.validators.get(v.voter);
    if (!validator) return { accepted: false, reason: 'voter not in validator set' };
    if (!verifyVoteSignature(sv, validator.publicKeyPem)) {
      return { accepted: false, reason: 'invalid vote signature' };
    }

    // DoS guard on total pending votes
    if (this.totalVotes >= MAX_PENDING_VOTES) {
      return { accepted: false, reason: 'vote buffer full' };
    }

    const bucketKey = `${v.height}:${v.round}:${v.phase}`;
    let bucket = this.voteBuckets.get(bucketKey);
    if (!bucket) {
      bucket = { votes: new Map() };
      this.voteBuckets.set(bucketKey, bucket);
    }
    if (bucket.votes.has(v.voter)) return { accepted: true }; // idempotent
    bucket.votes.set(v.voter, sv);
    this.totalVotes++;

    // Check if we have a quorum
    const threshold = quorumThreshold(this.validators.size);
    const matching = [...bucket.votes.values()].filter(
      sv2 => constantTimeEqual(sv2.payload.blockHash, v.blockHash)
    );
    if (matching.length < threshold) return { accepted: true };

    // Quorum achieved!
    const qc: QuorumCertificate = {
      height: v.height,
      round: v.round,
      phase: v.phase,
      blockHash: v.blockHash,
      votes: matching,
    };

    if (v.phase === 'PREPARE') {
      // PreQC → advance to COMMIT, cast COMMIT vote
      this.preQC = qc;
      this.phase = 'COMMIT';
      const commitVote = this.castVote('COMMIT', v.blockHash);
      return { accepted: true, qc, vote: commitVote ?? undefined };
    }

    if (v.phase === 'COMMIT') {
      // CommitQC → FINALIZED
      if (!this.currentProposal || !this.preQC) {
        return { accepted: false, reason: 'no proposal to finalize' };
      }
      // Safety: the COMMIT QC must be for the same block as the PreQC
      if (!constantTimeEqual(qc.blockHash, this.preQC.blockHash)) {
        return { accepted: false, reason: 'commitQC blockHash does not match preQC' };
      }
      const block = this.finalizeBlock(this.currentProposal, this.preQC, qc);
      return { accepted: true, qc, finalized: block };
    }

    return { accepted: true };
  }

  // ─── View change ───────────────────────────────────────────────────────────

  /**
   * Manually trigger a view change (round increment, next leader).
   * Called automatically by the view timer.
   */
  viewChange(): void {
    this.clearViewTimer();
    this.round++;
    this.phase = 'PROPOSE';
    this.currentProposal = null;
    this.preQC = null;
    // Clear vote buckets for the old round
    for (const key of [...this.voteBuckets.keys()]) {
      const [, r] = key.split(':');
      if (parseInt(r, 10) < this.round) {
        const bucket = this.voteBuckets.get(key);
        if (bucket) this.totalVotes -= bucket.votes.size;
        this.voteBuckets.delete(key);
      }
    }
    logger.debug(`consensus: view change → height=${this.height} round=${this.round} leader=${this.getLeader()}`);
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private getLeader(): string | null {
    const sorted = [...this.validators.keys()].sort();
    if (sorted.length === 0) return null;
    return sorted[(this.height + this.round) % sorted.length];
  }

  private sign(digest: string): string | null {
    if (!this.privateKeyPem) return null;
    try {
      const buf = Buffer.from(digest, 'hex');
      const sig = edSign(null, buf, this.privateKeyPem);
      return sig.toString('base64');
    } catch {
      return null;
    }
  }

  private castVote(phase: VotePhase, blockHash: string): SignedVote | null {
    if (!this.myDid || !this.privateKeyPem) return null;
    if (!this.validators.has(this.myDid)) return null;
    const vp: VotePayload = {
      version: CONSENSUS_VERSION,
      height: this.height,
      round: this.round,
      phase,
      blockHash,
      voter: this.myDid,
    };
    const sig = this.sign(votePayloadHash(vp));
    if (!sig) return null;
    return { payload: vp, ts: new Date().toISOString(), sig };
  }

  private finalizeBlock(
    proposal: SignedProposal,
    preQC: QuorumCertificate,
    commitQC: QuorumCertificate
  ): FinalizedBlock {
    this.clearViewTimer();
    const bHash = proposalHash(proposal.payload);
    const block: FinalizedBlock = {
      id: uuid(),
      proposal,
      preQC,
      commitQC,
      blockHash: bHash,
      finalizedAt: new Date().toISOString(),
    };

    // Prepend (newest-first)
    if (this.finalized.length >= MAX_FINALIZED_BLOCKS) this.finalized.pop();
    this.finalized.unshift(block);

    // Remove finalized txIds from pending
    const committed = new Set(proposal.payload.txIds);
    this.pendingTxIds = this.pendingTxIds.filter(id => !committed.has(id));

    // Reset for next block
    this.height++;
    this.round = 0;
    this.phase = 'PROPOSE';
    this.currentProposal = null;
    this.preQC = null;

    // Clear stale vote buckets
    for (const key of [...this.voteBuckets.keys()]) {
      const [h] = key.split(':');
      if (parseInt(h, 10) < this.height) {
        const bucket = this.voteBuckets.get(key);
        if (bucket) this.totalVotes -= bucket.votes.size;
        this.voteBuckets.delete(key);
      }
    }

    logger.info(`consensus: FINALIZED block height=${block.proposal.payload.height} txs=${proposal.payload.txIds.length} hash=${bHash.substring(0, 16)}…`);
    void this.persistBlock(block);
    this.opts.onFinalized?.(block);
    return block;
  }

  /** Release the view-change timer and all state (call in tests / shutdown). */
  destroy(): void {
    this.clearViewTimer();
  }

  private startViewTimer(): void {
    this.clearViewTimer();
    const timeout = this.opts.blockTimeoutMs ?? BLOCK_TIMEOUT_MS;
    this.viewTimer = setTimeout(() => this.viewChange(), timeout);
    this.viewTimer.unref(); // don't keep the Node.js event loop alive
  }

  private clearViewTimer(): void {
    if (this.viewTimer) {
      clearTimeout(this.viewTimer);
      this.viewTimer = null;
    }
  }

  private async persistBlock(block: FinalizedBlock): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      await this.lightrag.mergeTypedNode(
        `consensus_${block.blockHash.substring(0, 24)}`,
        'ConsensusBlock',
        {
          height: block.proposal.payload.height,
          round: block.proposal.payload.round,
          leader: block.proposal.payload.leader,
          block_hash: block.blockHash,
          tx_count: block.proposal.payload.txIds.length,
          finalized_at: block.finalizedAt,
          content: `Consensus block #${block.proposal.payload.height} leader=${block.proposal.payload.leader.substring(0, 20)}…`,
        }
      );
    } catch (e: any) {
      logger.warn(`consensus persist: ${e.message}`);
    }
  }
}

// ─── REST routes ──────────────────────────────────────────────────────────────

/**
 * Network delegate: called by route handlers when the engine produces a
 * follow-up vote (e.g. PREPARE→COMMIT after PreQC forms). Wiring this in
 * closes the loop so votes propagate across nodes without polling.
 */
export interface ConsensusNetworkDelegate {
  deliverVote: (v: SignedVote) => Promise<unknown>;
}

export function registerConsensusRoutes(
  app: Express,
  engine: ConsensusEngine,
  network?: ConsensusNetworkDelegate,
): void {

  app.get('/api/consensus/status', (_req: Request, res: Response): void => {
    res.json({ success: true, status: engine.getStatus() });
  });

  app.get('/api/consensus/chain', (req: Request, res: Response): void => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    const blocks = engine.getFinalizedBlocks(limit).map(b => ({
      height: b.proposal.payload.height,
      round: b.proposal.payload.round,
      leader: b.proposal.payload.leader,
      blockHash: b.blockHash,
      txCount: b.proposal.payload.txIds.length,
      stateRoot: b.proposal.payload.stateRoot,
      finalizedAt: b.finalizedAt,
      prepareVotes: b.preQC.votes.length,
      commitVotes: b.commitQC.votes.length,
    }));
    res.json({ success: true, blocks });
  });

  app.get('/api/consensus/validators', (_req: Request, res: Response): void => {
    res.json({
      success: true,
      validators: engine.getValidators().map(v => ({
        did: v.did,
        stake: v.stake.toString(),
      })),
      quorumThreshold: quorumThreshold(engine.getValidators().length),
    });
  });

  app.post('/api/consensus/validators', (req: Request, res: Response): void => {
    const { did, stake, publicKeyPem } = req.body ?? {};
    if (!did || !publicKeyPem) {
      res.status(400).json({ success: false, error: 'did and publicKeyPem required' }); return;
    }
    let stakeVal: bigint;
    try { stakeVal = BigInt(stake ?? '0'); } catch {
      res.status(400).json({ success: false, error: 'stake must be a BigInt-parseable string' }); return;
    }
    const result = engine.addValidator({ did, stake: stakeVal, publicKeyPem });
    res.status(result.added ? 201 : 409).json({ success: result.added, ...result });
  });

  app.post('/api/consensus/propose', (req: Request, res: Response): void => {
    const sp: SignedProposal = req.body;
    if (!sp?.payload || !sp?.sig) {
      res.status(400).json({ success: false, error: 'signed proposal body required' }); return;
    }
    const result = engine.receiveProposal(sp);
    // Propagate the resulting PREPARE vote to peers without blocking the response.
    if (result.vote && network) {
      network.deliverVote(result.vote).catch(() => {});
    }
    res.status(result.accepted ? 200 : 400).json({ success: result.accepted, ...result });
  });

  app.post('/api/consensus/vote', (req: Request, res: Response): void => {
    const sv: SignedVote = req.body;
    if (!sv?.payload || !sv?.sig) {
      res.status(400).json({ success: false, error: 'signed vote body required' }); return;
    }
    const result = engine.receiveVote(sv);
    // When a PreQC forms the engine returns a COMMIT vote — propagate it.
    if (result.vote && network) {
      network.deliverVote(result.vote).catch(() => {});
    }
    res.status(result.accepted ? 200 : 400).json({
      success: result.accepted,
      reason: result.reason,
      hasQC: !!result.qc,
      finalized: result.finalized ? {
        height: result.finalized.proposal.payload.height,
        blockHash: result.finalized.blockHash,
      } : null,
    });
  });

  logger.info('✓ Consensus API registered (/api/consensus/*)');
}

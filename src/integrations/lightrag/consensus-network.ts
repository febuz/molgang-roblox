/**
 * Consensus Network Driver — moves the BFT engine from "library" to "protocol"
 *
 * The ConsensusEngine (consensus.ts) is a pure state machine: feed it
 * proposals and votes, get QCs and finalized blocks back. This driver is the
 * missing networking half that an MVP requires:
 *
 *   - BROADCAST: signed proposals and votes are POSTed to every peer's
 *     /api/consensus/propose and /api/consensus/vote endpoints. Peers come
 *     from the same CONSENSUS_PEERS / gossip peer list the rest of the P2P
 *     stack uses.
 *
 *   - SELF-DELIVERY FIRST: every outgoing message is also delivered to the
 *     local engine — a node is always its own peer. The engine's responses
 *     (e.g. the PREPARE vote returned by receiveProposal, the COMMIT vote
 *     returned when a PreQC forms) are recursively broadcast, so one tick of
 *     the driver carries a round as far as the network allows.
 *
 *   - AUTO-PROPOSE: a ticker checks every `proposeIntervalMs` whether this
 *     node is the current leader AND there are pending transfers; if so, it
 *     creates, self-delivers and broadcasts a proposal. Non-leaders do
 *     nothing — they wait for the leader's proposal or the view timeout.
 *
 *   - FIRE-AND-FORGET TRANSPORT: peer sends have a hard timeout and never
 *     throw into the protocol path. BFT consensus already tolerates message
 *     loss (that is what view changes are for) — a flaky peer must not be
 *     able to stall the local state machine.
 */

import type { ConsensusEngine, SignedProposal, SignedVote, FinalizedBlock } from './consensus';
import logger from '../../utils/logger';

/** Hard cap on a single peer request (ms). */
export const PEER_TIMEOUT_MS = 3_000;

/** Default auto-propose ticker interval (ms). */
export const PROPOSE_INTERVAL_MS = 2_000;

export class ConsensusNetwork {
  private ticker: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly engine: ConsensusEngine,
    private readonly peers: string[],          // base URLs, e.g. http://node2:3000
    private readonly opts: { proposeIntervalMs?: number } = {},
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  /** Start the auto-propose ticker. Idempotent. */
  start(): void {
    if (this.ticker) return;
    const interval = this.opts.proposeIntervalMs ?? PROPOSE_INTERVAL_MS;
    this.ticker = setInterval(() => this.tick(), interval);
    this.ticker.unref();
    logger.info(`✓ Consensus network driver started (${this.peers.length} peers, propose every ${interval}ms)`);
  }

  stop(): void {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  // ── Protocol driving ─────────────────────────────────────────────────────────

  /**
   * One driver tick: if we are the leader and transfers are pending,
   * create + deliver + broadcast a proposal. Exposed for tests.
   */
  async tick(): Promise<void> {
    const status = this.engine.getStatus();
    if (!status.isLeader || status.phase !== 'PROPOSE') return;
    if (status.pendingTxs === 0) return;
    const proposal = this.engine.createProposal();
    if (!proposal) return;
    await this.deliverProposal(proposal);
  }

  /**
   * Deliver a proposal locally and to all peers, then chase the returned
   * votes through the protocol.
   */
  async deliverProposal(sp: SignedProposal): Promise<void> {
    const result = this.engine.receiveProposal(sp);
    const sends: Promise<unknown>[] = this.peers.map(p => this.post(p, '/api/consensus/propose', sp));
    if (result.vote) sends.push(this.deliverVote(result.vote));
    await Promise.allSettled(sends);
  }

  /**
   * Deliver a vote locally and to all peers. When the local delivery forms a
   * QC and returns a follow-up vote (PREPARE→COMMIT) it is delivered too —
   * recursion depth is bounded by the two protocol phases.
   */
  async deliverVote(sv: SignedVote): Promise<FinalizedBlock | null> {
    const result = this.engine.receiveVote(sv);
    const sends: Promise<unknown>[] = this.peers.map(p => this.post(p, '/api/consensus/vote', sv));
    if (result.vote) sends.push(this.deliverVote(result.vote));
    await Promise.allSettled(sends);
    return result.finalized ?? null;
  }

  // ── Transport ────────────────────────────────────────────────────────────────

  private async post(peer: string, path: string, body: unknown): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PEER_TIMEOUT_MS);
    try {
      await fetch(`${peer}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e: any) {
      // Message loss is part of the BFT fault model — log and move on
      logger.debug(`consensus send to ${peer}${path} failed: ${e.message}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * P2P Gossip Protocol - Direct HTTP Node-to-Node Sync
 *
 * When Kafka is unavailable (single-node dev, Kafka outage) this module
 * provides a fallback gossip layer: nodes push and pull knowledge-graph
 * deltas directly over HTTP using a push-pull round-robin protocol.
 *
 * Protocol:
 *   - Each node registers itself with a list of peer URLs.
 *   - Every GOSSIP_INTERVAL ms (default: 30s), this node:
 *       1. Randomly picks a peer from the ring.
 *       2. POSTs its local "delta" (nodes written since last gossip) to
 *          POST /api/lightrag/gossip/push on the peer.
 *       3. GETs the peer's delta since our last pull timestamp via
 *          GET /api/lightrag/gossip/pull?since=<ISO>.
 *       4. Merges received nodes into local Neo4j via mergeTypedNode().
 *   - All push/pull payloads are delta-compressed: only nodes whose
 *     updated_at > last_sync_ts are sent.
 *   - Idempotent: MERGE on every incoming node so replays are safe.
 *
 * Usage (added to index.ts after lightrag.connect()):
 *   const gossip = new P2PGossip(lightrag, ['http://peer1:3100', 'http://peer2:3100']);
 *   gossip.registerExpressRoutes(app);
 *   gossip.start();
 */

import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import type { P2PSwarm } from './p2p-swarm';
import logger from '../../utils/logger';

export interface GossipNode {
  id: string;
  label: string;
  props: Record<string, any>;
  updatedAt: string;
}

export interface GossipPayload {
  sourceUrl: string;
  nodes: GossipNode[];
  edges: Array<{ fromId: string; relType: string; toId: string; props?: Record<string, any> }>;
  timestamp: string;
  knownPeers?: string[];          // PEX piggyback (BitTorrent PEX / Bitcoin addr)
}

export interface GossipStats {
  peersConfigured: number;
  pushCount: number;
  pullCount: number;
  mergeCount: number;
  errorCount: number;
  lastGossipAt: string | null;
  lastPeerContacted: string | null;
  running: boolean;
}

const GOSSIP_INTERVAL_MS = 30_000;
const PULL_TIMEOUT_MS = 5_000;

export class P2PGossip {
  private lightrag: LightRAGClient;
  private peers: string[];
  private myUrl: string;
  private swarm: P2PSwarm | null = null;
  private lastPushAt = new Date(0).toISOString();
  private localDelta: GossipNode[] = [];
  private localEdgeDelta: GossipPayload['edges'] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private stats: GossipStats = {
    peersConfigured: 0,
    pushCount: 0,
    pullCount: 0,
    mergeCount: 0,
    errorCount: 0,
    lastGossipAt: null,
    lastPeerContacted: null,
    running: false,
  };

  constructor(lightrag: LightRAGClient, peers: string[] = [], myUrl = '', swarm?: P2PSwarm) {
    this.lightrag = lightrag;
    this.peers = peers.filter(p => p !== myUrl);
    this.myUrl = myUrl;
    this.swarm = swarm ?? null;
    if (this.swarm) {
      for (const p of this.peers) this.swarm.addPeer(p, 'config');
    }
    this.stats.peersConfigured = this.peers.length;
  }

  /**
   * Register the gossip push/pull HTTP endpoints onto the Express app.
   * Must be called before start().
   */
  registerExpressRoutes(app: Express): void {
    // Receive a pushed delta from a peer
    app.post('/api/lightrag/gossip/push', async (req: Request, res: Response) => {
      const payload: GossipPayload = req.body;
      if (!payload?.nodes) { res.status(400).json({ error: 'missing nodes' }); return; }
      // PEX: adopt a couple of the sender's known peers (eclipse-guarded)
      if (this.swarm && Array.isArray(payload.knownPeers)) {
        this.swarm.offerPeers(payload.sourceUrl ?? 'unknown', payload.knownPeers);
        this.syncPeersFromSwarm();
      }
      const merged = await this.mergePayload(payload);
      res.json({ success: true, merged });
    });

    // Serve our delta since a given timestamp
    app.get('/api/lightrag/gossip/pull', (_req: Request, res: Response) => {
      const since = _req.query.since as string | undefined;
      const delta = since
        ? this.localDelta.filter(n => n.updatedAt >= since)
        : this.localDelta.slice(-200);
      const out: GossipPayload = {
        sourceUrl: this.myUrl,
        nodes: delta,
        edges: this.localEdgeDelta.slice(-100),
        timestamp: new Date().toISOString(),
        knownPeers: this.swarm?.knownPeers(),
      };
      res.json({ success: true, ...out });
    });

    // Stats endpoint
    app.get('/api/lightrag/gossip', (_req: Request, res: Response) => {
      res.json({ success: true, peers: this.peers, ...this.stats });
    });
  }

  /**
   * Record a locally written node so it can be gossiped to peers.
   * Called by agent-bridge / fact-validator after every write.
   */
  recordLocalNode(id: string, label: string, props: Record<string, any>): void {
    const entry: GossipNode = { id, label, props, updatedAt: new Date().toISOString() };
    // Deduplicate by id — keep latest
    const idx = this.localDelta.findIndex(n => n.id === id);
    if (idx >= 0) this.localDelta[idx] = entry;
    else this.localDelta.push(entry);
    // Cap at 1000 entries (oldest dropped)
    if (this.localDelta.length > 1000) this.localDelta.shift();
  }

  /**
   * Record a locally created edge for gossip propagation.
   */
  recordLocalEdge(fromId: string, relType: string, toId: string, props?: Record<string, any>): void {
    this.localEdgeDelta.push({ fromId, relType, toId, props });
    if (this.localEdgeDelta.length > 500) this.localEdgeDelta.shift();
  }

  /**
   * Start the gossip timer.
   */
  start(): void {
    if (this.peers.length === 0 && !this.swarm) {
      logger.info('P2PGossip: no peers configured — gossip disabled');
      return;
    }
    if (this.peers.length === 0) {
      // Swarm mode: keep the timer alive — inbound pushes can deliver peers
      // via PEX, after which rounds start flowing without a restart.
      logger.info('P2PGossip: no peers yet — waiting for PEX discovery');
    }
    this.stats.running = true;
    this.timer = setInterval(() => this.gossipRound(), GOSSIP_INTERVAL_MS);
    logger.info(`✓ P2PGossip started (${this.peers.length} peers, ${GOSSIP_INTERVAL_MS / 1000}s interval)`);
    // Immediate first round
    this.gossipRound().catch(e => logger.warn(`P2PGossip first-round error: ${e.message}`));
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.stats.running = false;
  }

  getStats(): GossipStats {
    return { ...this.stats };
  }

  // ─────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────

  private async gossipRound(): Promise<void> {
    // Capture the window boundary BEFORE the round: nodes written while the
    // round is in flight must fall inside the NEXT window, not in a gap.
    // The overlap re-sends a few entries; MERGE makes that harmless.
    const roundStartedAt = new Date().toISOString();

    // Swarm-managed selection: rechoke (tit-for-tat + optimistic unchoke),
    // then pick push targets — several at once in endgame mode.
    let pushTargets: string[];
    let pullPeer: string | null;
    if (this.swarm) {
      this.swarm.rechoke();
      this.syncPeersFromSwarm();
      const deltaIds = this.localDelta
        .filter(n => n.updatedAt >= this.lastPushAt)
        .map(n => n.id);
      pushTargets = this.swarm.selectPushTargets(deltaIds);
      pullPeer = this.swarm.selectPeer();
    } else {
      const peer = this.pickPeer();
      pushTargets = peer ? [peer] : [];
      pullPeer = peer;
    }
    if (pushTargets.length === 0 && !pullPeer) return;

    this.stats.lastPeerContacted = pushTargets[0] ?? pullPeer;
    this.stats.lastGossipAt = roundStartedAt;

    await Promise.allSettled([
      ...pushTargets.map(p => this.pushToPeer(p)),
      ...(pullPeer ? [this.pullFromPeer(pullPeer)] : []),
    ]);

    this.lastPushAt = roundStartedAt;
  }

  private pickPeer(): string | null {
    if (this.peers.length === 0) return null;
    return this.peers[Math.floor(Math.random() * this.peers.length)];
  }

  /** Adopt PEX-discovered peers from the swarm table into the gossip ring. */
  private syncPeersFromSwarm(): void {
    if (!this.swarm) return;
    for (const url of this.swarm.peerUrls()) {
      if (url !== this.myUrl && !this.peers.includes(url)) {
        this.peers.push(url);
      }
    }
    this.stats.peersConfigured = this.peers.length;
  }

  private async pushToPeer(peer: string): Promise<void> {
    let nodes = this.localDelta.filter(n => n.updatedAt >= this.lastPushAt);
    // Rarest-first (BitTorrent piece selection): push the least-replicated
    // items first so old-but-rare knowledge survives, not just the newest.
    if (this.swarm) nodes = this.swarm.sortRarestFirst(nodes);

    const payload: GossipPayload = {
      sourceUrl: this.myUrl,
      nodes,
      edges: this.localEdgeDelta.slice(-50),
      timestamp: new Date().toISOString(),
      // PEX piggyback: share a few known peers so the swarm grows trackerless
      knownPeers: this.swarm?.knownPeers(),
    };
    if (payload.nodes.length === 0 && payload.edges.length === 0) return;

    try {
      const resp = await fetchWithTimeout(`${peer}/api/lightrag/gossip/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, PULL_TIMEOUT_MS);
      if ((resp as any).ok) {
        this.stats.pushCount++;
        this.swarm?.recordPushOk(peer, payload.nodes.length);
        for (const n of payload.nodes) this.swarm?.recordReplicated(n.id, peer);
        logger.debug(`P2PGossip: pushed ${payload.nodes.length} nodes to ${peer}`);
      } else {
        this.swarm?.recordPushFail(peer);
      }
    } catch (e: any) {
      this.stats.errorCount++;
      this.swarm?.recordPushFail(peer);
      logger.debug(`P2PGossip: push to ${peer} failed: ${e.message}`);
    }
  }

  private async pullFromPeer(peer: string): Promise<void> {
    try {
      const url = `${peer}/api/lightrag/gossip/pull?since=${encodeURIComponent(this.lastPushAt)}`;
      const resp = await fetchWithTimeout(url, {}, PULL_TIMEOUT_MS);
      if (!(resp as any).ok) { this.swarm?.recordPullFail(peer); return; }
      const payload: GossipPayload = await (resp as any).json();
      if (!payload || !Array.isArray(payload.nodes)) {
        // Malformed payload — steepest penalty (Bitcoin banscore / gossipsub P4)
        this.swarm?.recordInvalid(peer);
        return;
      }
      const merged = await this.mergePayload(payload);
      this.swarm?.recordPullOk(peer, merged);
      if (merged > 0) {
        this.stats.pullCount++;
        logger.debug(`P2PGossip: pulled+merged ${merged} nodes from ${peer}`);
      }
    } catch (e: any) {
      this.stats.errorCount++;
      this.swarm?.recordPullFail(peer);
      logger.debug(`P2PGossip: pull from ${peer} failed: ${e.message}`);
    }
  }

  private async mergePayload(payload: GossipPayload): Promise<number> {
    if (!this.lightrag.isConnected()) return 0;
    let count = 0;
    for (const n of payload.nodes ?? []) {
      try {
        await this.lightrag.mergeTypedNode(n.id, n.label, n.props);
        count++;
      } catch (e: any) {
        logger.debug(`P2PGossip: merge failed for ${n.id}: ${e.message}`);
      }
    }
    for (const e of payload.edges ?? []) {
      try {
        await this.lightrag.addEdge(e.fromId, e.relType, e.toId, e.props);
      } catch {
        // best-effort
      }
    }
    this.stats.mergeCount += count;
    return count;
  }
}

// ── Minimal fetch with timeout (Node 18+ native fetch) ──────────────────────

type FetchResponse = Awaited<ReturnType<typeof fetch>>;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<FetchResponse> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal as any });
  } finally {
    clearTimeout(id);
  }
}

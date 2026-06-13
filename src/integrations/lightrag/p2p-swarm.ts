/**
 * P2P Swarm Manager — learned lessons from production P2P networks
 *
 * Encodes battle-tested mechanics from two decades of P2P systems into the
 * gossip layer. Each mechanism cites its origin:
 *
 *  1. TIT-FOR-TAT + CHOKING (BitTorrent, Cohen 2003 / Tron BTFS):
 *     Peers that reciprocate (send us useful data) earn priority; free-riders
 *     get "choked" — they still receive pushes occasionally but stop being
 *     preferred gossip targets. BitTorrent proved this single rule keeps a
 *     swarm of selfish peers cooperative without central enforcement.
 *
 *  2. OPTIMISTIC UNCHOKE (BitTorrent):
 *     Every N rounds one randomly chosen choked peer gets unchoked anyway.
 *     This bootstraps newcomers (who have nothing to reciprocate with yet)
 *     and discovers peers that became fast since we choked them.
 *
 *  3. RAREST-FIRST REPLICATION (BitTorrent piece selection):
 *     Push the items the fewest peers have FIRST. Newest-first (what naive
 *     gossip does) lets old-but-rare items die out; rarest-first maximises
 *     swarm-wide availability and is why torrents survive seeders leaving.
 *
 *  4. ENDGAME MODE (BitTorrent):
 *     When only a handful of un-replicated items remain, push them to ALL
 *     unchoked peers in parallel instead of one — finishing the tail fast
 *     instead of dribbling it out one round at a time.
 *
 *  5. MISBEHAVIOR SCORE + BAN (Bitcoin Core banscore / DoS protection):
 *     Invalid payloads and repeated failures push a peer's score down;
 *     below the ban threshold the peer is ignored for a cooldown period,
 *     then given a clean slate. Decay (gossipsub v1.1 style) makes old
 *     sins fade so a flaky-but-recovered peer can rehabilitate.
 *
 *  6. PEER EXCHANGE with eclipse resistance (BitTorrent PEX / Bitcoin addr
 *     gossip): peers piggyback a few known-peer URLs on gossip payloads so
 *     the swarm grows without a tracker. Eclipse defense: one source may
 *     only contribute a couple of new peers per exchange and the table is
 *     capped — no single peer can flood our peer table and surround us
 *     with its sybils (Heilman et al. 2015).
 *
 *  7. CONTRIBUTION → REPUTATION (Tron BTT incentive layer):
 *     BitTorrent Token pays peers for bandwidth served. We map the same
 *     idea onto the knowledge economy: per-peer contribution counters
 *     (nodes served/received) are exposed so the attention/reputation
 *     layer can reward serving peers.
 *
 * REST (registerSwarmRoutes):
 *   GET  /api/swarm/peers        — scores, choke/ban status, reciprocity
 *   GET  /api/swarm/replication  — rarest items + replication counts
 *   POST /api/swarm/peers        — manually add a peer URL
 */

import type { Express, Request, Response } from 'express';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Tunables (defaults follow the source systems' proportions)
// ──────────────────────────────────────────────────────────────────────────────

export const SWARM_DEFAULTS = {
  unchokeSlots: 3,            // BitTorrent uploads to 4 peers; we gossip to 3
  optimisticInterval: 3,      // optimistic unchoke every 3rd rechoke (BT: every 3rd 10s cycle)
  scoreDecay: 0.95,           // gossipsub v1.1-style decay per round
  banThreshold: -50,          // Bitcoin banscore analog
  banCooldownMs: 10 * 60 * 1000, // Bitcoin default ban: we use 10 min
  maxPeers: 32,               // peer table cap
  pexPerSource: 2,            // eclipse defense: max new peers accepted per source per exchange
  pexSampleSize: 8,           // how many known peers we piggyback on payloads
  endgameThreshold: 5,        // ≤ N zero-replication items triggers endgame
  endgameFanout: 3,           // endgame pushes to up to N unchoked peers
};

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface PeerStats {
  url: string;
  source: 'config' | 'pex';
  score: number;              // decayed behavior score
  pushOk: number;
  pushFail: number;
  pullOk: number;
  pullFail: number;
  invalidPayloads: number;
  nodesSent: number;          // we → peer (contribution we made)
  nodesReceived: number;      // peer → us (their contribution — BTT lesson 7)
  lastSeenAt: string | null;
  choked: boolean;
  optimistic: boolean;        // currently holding the optimistic-unchoke slot
  banned: boolean;
  bannedUntil: string | null;
}

export interface SwarmOptions {
  myUrl?: string;
  unchokeSlots?: number;
  optimisticInterval?: number;
  scoreDecay?: number;
  banThreshold?: number;
  banCooldownMs?: number;
  maxPeers?: number;
  pexPerSource?: number;
  endgameThreshold?: number;
  endgameFanout?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Swarm manager
// ──────────────────────────────────────────────────────────────────────────────

export class P2PSwarm {
  private peers = new Map<string, PeerStats>();
  private replication = new Map<string, Set<string>>(); // itemId → peer urls known to have it
  private rechokeCount = 0;
  private opts: Required<Omit<SwarmOptions, 'myUrl'>> & { myUrl: string };

  constructor(options: SwarmOptions = {}) {
    this.opts = {
      myUrl: options.myUrl ?? '',
      unchokeSlots: options.unchokeSlots ?? SWARM_DEFAULTS.unchokeSlots,
      optimisticInterval: options.optimisticInterval ?? SWARM_DEFAULTS.optimisticInterval,
      scoreDecay: options.scoreDecay ?? SWARM_DEFAULTS.scoreDecay,
      banThreshold: options.banThreshold ?? SWARM_DEFAULTS.banThreshold,
      banCooldownMs: options.banCooldownMs ?? SWARM_DEFAULTS.banCooldownMs,
      maxPeers: options.maxPeers ?? SWARM_DEFAULTS.maxPeers,
      pexPerSource: options.pexPerSource ?? SWARM_DEFAULTS.pexPerSource,
      endgameThreshold: options.endgameThreshold ?? SWARM_DEFAULTS.endgameThreshold,
      endgameFanout: options.endgameFanout ?? SWARM_DEFAULTS.endgameFanout,
    };
  }

  // ── Peer table ──────────────────────────────────────────────────────────────

  /** Add a peer (from config or PEX). Returns false when rejected. */
  addPeer(url: string, source: 'config' | 'pex' = 'config'): boolean {
    if (!url || url === this.opts.myUrl) return false;
    if (this.peers.has(url)) return false;
    if (this.peers.size >= this.opts.maxPeers) return false;
    this.peers.set(url, {
      url,
      source,
      score: 0,
      pushOk: 0, pushFail: 0, pullOk: 0, pullFail: 0,
      invalidPayloads: 0,
      nodesSent: 0, nodesReceived: 0,
      lastSeenAt: null,
      choked: source === 'pex', // newcomers start choked until they earn a slot
      optimistic: false,
      banned: false,
      bannedUntil: null,
    });
    return true;
  }

  peerUrls(): string[] {
    return Array.from(this.peers.keys());
  }

  getPeer(url: string): PeerStats | undefined {
    return this.peers.get(url);
  }

  getAllPeers(): PeerStats[] {
    return Array.from(this.peers.values()).map(p => ({ ...p }));
  }

  /**
   * LESSON 6 — Peer exchange with eclipse resistance.
   * Accept at most `pexPerSource` NEW peers per call from one source, never
   * our own URL, table capped. Returns the urls actually accepted.
   */
  offerPeers(sourceUrl: string, urls: string[]): string[] {
    const accepted: string[] = [];
    for (const url of urls ?? []) {
      if (accepted.length >= this.opts.pexPerSource) break;
      if (typeof url !== 'string' || !/^https?:\/\//.test(url)) continue;
      if (this.addPeer(url, 'pex')) accepted.push(url);
    }
    if (accepted.length > 0) {
      logger.debug(`swarm: PEX from ${sourceUrl} added ${accepted.length} peer(s)`);
    }
    return accepted;
  }

  /** Random sample of known peers to piggyback on outgoing payloads. */
  knownPeers(limit = SWARM_DEFAULTS.pexSampleSize): string[] {
    const urls = this.peerUrls().filter(u => !this.peers.get(u)!.banned);
    for (let i = urls.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [urls[i], urls[j]] = [urls[j], urls[i]];
    }
    return urls.slice(0, limit);
  }

  // ── Outcome recording (feeds the score) ─────────────────────────────────────

  recordPushOk(url: string, nodesSent: number): void {
    const p = this.peers.get(url);
    if (!p) return;
    p.pushOk++;
    p.nodesSent += nodesSent;
    p.score += 1;
    p.lastSeenAt = new Date().toISOString();
  }

  recordPushFail(url: string): void {
    const p = this.peers.get(url);
    if (!p) return;
    p.pushFail++;
    p.score -= 2;
    this.maybeBan(p);
  }

  recordPullOk(url: string, nodesReceived: number): void {
    const p = this.peers.get(url);
    if (!p) return;
    p.pullOk++;
    p.nodesReceived += nodesReceived;
    // Useful data received scores higher than a bare successful round —
    // reciprocity is what tit-for-tat rewards. Capped per round so one
    // giant payload cannot whitewash a bad history.
    p.score += 1 + Math.min(nodesReceived * 0.1, 2);
    p.lastSeenAt = new Date().toISOString();
  }

  recordPullFail(url: string): void {
    const p = this.peers.get(url);
    if (!p) return;
    p.pullFail++;
    p.score -= 2;
    this.maybeBan(p);
  }

  /** LESSON 5 — invalid payloads are the steepest penalty (gossipsub P4). */
  recordInvalid(url: string): void {
    const p = this.peers.get(url);
    if (!p) return;
    p.invalidPayloads++;
    p.score -= 10;
    this.maybeBan(p);
  }

  private maybeBan(p: PeerStats): void {
    if (!p.banned && p.score <= this.opts.banThreshold) {
      p.banned = true;
      p.bannedUntil = new Date(Date.now() + this.opts.banCooldownMs).toISOString();
      p.choked = true;
      logger.warn(`swarm: peer ${p.url} banned until ${p.bannedUntil} (score ${p.score.toFixed(1)})`);
    }
  }

  private liftExpiredBans(): void {
    const now = new Date().toISOString();
    for (const p of this.peers.values()) {
      if (p.banned && p.bannedUntil && p.bannedUntil <= now) {
        p.banned = false;
        p.bannedUntil = null;
        p.score = 0; // clean slate after serving the cooldown
        logger.info(`swarm: peer ${p.url} unbanned`);
      }
    }
  }

  // ── Choking (lessons 1 + 2) ─────────────────────────────────────────────────

  /**
   * LESSON 1 — effective rank = behavior score + reciprocity bonus.
   * A peer that sends us as much as we send it ranks above a silent sink.
   */
  effectiveRank(p: PeerStats): number {
    const ratio = p.nodesReceived / Math.max(1, p.nodesSent);
    return p.score + Math.min(ratio, 2) * 5;
  }

  /**
   * Run once per gossip round: decay scores, lift expired bans, unchoke the
   * top reciprocating peers, and every `optimisticInterval`-th call give one
   * random choked peer the optimistic slot (lesson 2).
   */
  rechoke(): void {
    this.rechokeCount++;
    this.liftExpiredBans();

    const all = Array.from(this.peers.values());
    for (const p of all) {
      p.score *= this.opts.scoreDecay;
      p.optimistic = false;
    }

    const eligible = all.filter(p => !p.banned);
    eligible.sort((a, b) => this.effectiveRank(b) - this.effectiveRank(a));

    eligible.forEach((p, i) => { p.choked = i >= this.opts.unchokeSlots; });

    if (this.rechokeCount % this.opts.optimisticInterval === 0) {
      const chokedPool = eligible.filter(p => p.choked);
      if (chokedPool.length > 0) {
        const lucky = chokedPool[Math.floor(Math.random() * chokedPool.length)];
        lucky.choked = false;
        lucky.optimistic = true;
        logger.debug(`swarm: optimistic unchoke → ${lucky.url}`);
      }
    }
  }

  /** Random unchoked peer (gossip target). Null when everyone is banned. */
  selectPeer(): string | null {
    const unchoked = Array.from(this.peers.values()).filter(p => !p.banned && !p.choked);
    if (unchoked.length > 0) {
      return unchoked[Math.floor(Math.random() * unchoked.length)].url;
    }
    // Degenerate case: nobody unchoked yet (e.g. before first rechoke) —
    // fall back to any non-banned peer so the swarm can bootstrap.
    const any = Array.from(this.peers.values()).filter(p => !p.banned);
    return any.length > 0 ? any[Math.floor(Math.random() * any.length)].url : null;
  }

  // ── Replication tracking (lessons 3 + 4) ────────────────────────────────────

  /** Record that `peerUrl` is known to have `itemId` (successful push). */
  recordReplicated(itemId: string, peerUrl: string): void {
    const set = this.replication.get(itemId) ?? new Set<string>();
    set.add(peerUrl);
    this.replication.set(itemId, set);
  }

  /** How many peers (besides us) are known to have the item. */
  replicationOf(itemId: string): number {
    return this.replication.get(itemId)?.size ?? 0;
  }

  /** LESSON 3 — order ids ascending by known replication (rarest first). */
  sortRarestFirst<T extends { id: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => this.replicationOf(a.id) - this.replicationOf(b.id));
  }

  /** Items with the lowest replication, for the dashboard. */
  rarest(limit = 20): Array<{ itemId: string; replication: number }> {
    const ids = new Set<string>(this.replication.keys());
    return Array.from(ids)
      .map(itemId => ({ itemId, replication: this.replicationOf(itemId) }))
      .sort((a, b) => a.replication - b.replication)
      .slice(0, limit);
  }

  /**
   * LESSON 4 — endgame: when only a few pushed items are still un-replicated,
   * fan out to several unchoked peers at once instead of one per round.
   */
  selectPushTargets(deltaIds: string[]): string[] {
    const unreplicated = deltaIds.filter(id => this.replicationOf(id) === 0);
    const endgame = unreplicated.length > 0 && unreplicated.length <= this.opts.endgameThreshold;

    if (!endgame) {
      const one = this.selectPeer();
      return one ? [one] : [];
    }
    const unchoked = Array.from(this.peers.values())
      .filter(p => !p.banned && !p.choked)
      .map(p => p.url);
    if (unchoked.length === 0) {
      const one = this.selectPeer();
      return one ? [one] : [];
    }
    return unchoked.slice(0, this.opts.endgameFanout);
  }

  // ── Stats ───────────────────────────────────────────────────────────────────

  getStats() {
    const all = Array.from(this.peers.values());
    return {
      peers: all.length,
      unchoked: all.filter(p => !p.choked && !p.banned).length,
      banned: all.filter(p => p.banned).length,
      fromPex: all.filter(p => p.source === 'pex').length,
      itemsTracked: this.replication.size,
      rechokeRounds: this.rechokeCount,
    };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

export function registerSwarmRoutes(app: Express, swarm: P2PSwarm): void {

  app.get('/api/swarm/peers', (_req: Request, res: Response): void => {
    const peers = swarm.getAllPeers()
      .map(p => ({ ...p, effectiveRank: swarm.effectiveRank(p) }))
      .sort((a, b) => b.effectiveRank - a.effectiveRank);
    res.json({ success: true, ...swarm.getStats(), peersDetail: peers });
  });

  app.get('/api/swarm/replication', (req: Request, res: Response): void => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    res.json({ success: true, rarest: swarm.rarest(limit) });
  });

  app.post('/api/swarm/peers', (req: Request, res: Response): void => {
    const { url } = req.body ?? {};
    if (!url || !/^https?:\/\//.test(url)) {
      res.status(400).json({ success: false, error: 'valid http(s) url required' }); return;
    }
    const added = swarm.addPeer(url, 'config');
    res.status(added ? 201 : 409).json({ success: added, url });
  });

  logger.info('✓ Swarm API registered (/api/swarm/*)');
}

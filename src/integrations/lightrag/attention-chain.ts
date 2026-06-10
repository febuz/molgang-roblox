/**
 * Attention Chain — verifiable, decaying attention over news items
 *
 * Every attention event (view, share, reply, validate, anchor) is:
 *   - HLC-timestamped (hlc.ts) for causal ordering across peers
 *   - Ed25519-signed by the acting agent (AgentKeyring)
 *   - hash-chained PER AGENT: each event commits to the agent's previous
 *     event hash. Per-agent chains (not one global chain) are deliberate —
 *     they merge cleanly over P2P gossip, where a single global chain would
 *     fork on every concurrent event.
 *
 * Attention DECAYS: an item's score is the half-life-weighted sum of its
 * events ("houd de aandacht erbij" — attention stays only while new events
 * keep arriving):
 *
 *   score(t) = Σ  weight_i × 2^(−(t − t_i) / halfLife)
 *
 * Default half-life: 24h. An untouched item loses half its attention per
 * day; a single fresh validate outweighs a day-old one.
 *
 * Event weights (defaults): view 1, share 2, reply 3, validate 5, anchor 8 —
 * costlier signals carry more attention.
 *
 * REST (registerAttentionRoutes):
 *   POST /api/attention                    — record a signed attention event
 *   POST /api/attention/receive            — ingest a peer's event (verified)
 *   GET  /api/attention/hot                — decay-ranked hot items
 *   GET  /api/attention/item/:itemId       — score + event history for one item
 *   GET  /api/attention/agent/:agent/chain — the agent's chain + verification
 */

import { sign as edSign, verify as edVerify, createPublicKey } from 'crypto';
import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import { HLCTimestamp, HLC_ZERO, hlcNow, hlcRecv, hlcToString, hlcFromString } from './hlc';
import { canonicalize, sha256 } from './graph-state-root';
import { AgentKeyring } from './vote-certificate';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type AttentionKind = 'view' | 'share' | 'reply' | 'validate' | 'anchor';

export const DEFAULT_WEIGHTS: Record<AttentionKind, number> = {
  view: 1,
  share: 2,
  reply: 3,
  validate: 5,
  anchor: 8,
};

/** Default attention half-life: 24 hours. */
export const DEFAULT_HALF_LIFE_MS = 24 * 60 * 60 * 1000;

/** Reputation multiplier bounds. Default is 1.0 (neutral). */
export const MIN_REPUTATION = 0.1;
export const MAX_REPUTATION = 10.0;

/** First link of every agent chain commits to this constant. */
export const GENESIS = sha256('attention-genesis');

export interface AttentionEvent {
  itemId: string;                 // the news item (or graph node) receiving attention
  agent: string;                  // acting agent
  kind: AttentionKind;
  weight: number;
  hlc: string;                    // serialized HLC timestamp (sortable)
  prev: string;                   // hash of this agent's previous event (or GENESIS)
  hash: string;                   // sha256 over the canonical event body
  publicKeyPem: string;
  signature: string;              // base64 Ed25519 over eventMessage(...)
}

export interface ItemAttention {
  itemId: string;
  score: number;                  // decayed score at query time
  rawWeight: number;              // undecayed sum of weights
  eventCount: number;
  lastEventHlc: string | null;
  byKind: Partial<Record<AttentionKind, number>>;
}

/** Reputation record for an agent — multiplier scales the weight of all their events. */
export interface AgentReputation {
  agent: string;
  multiplier: number;            // [MIN_REPUTATION, MAX_REPUTATION]; default 1.0
  setAt: string;                 // ISO wall clock when last set
}

/** Summary of the in-memory cross-agent attention graph. */
export interface AttentionGraph {
  agents: Array<{
    agent: string;
    chainLength: number;
    totalWeight: number;
    reputation: number;
    distinctItems: number;       // number of distinct items this agent attended
  }>;
  items: ItemAttention[];
  totalEvents: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Hashing / signing
// ──────────────────────────────────────────────────────────────────────────────

/**
 * The canonical body that gets hashed AND signed. `prev` is included, so the
 * signature covers the event's position in the agent's chain — an attacker
 * cannot re-order or splice signed events into a different chain.
 */
export function eventBody(
  e: Pick<AttentionEvent, 'itemId' | 'agent' | 'kind' | 'weight' | 'hlc' | 'prev'>,
): string {
  return canonicalize({
    itemId: e.itemId,
    agent: e.agent,
    kind: e.kind,
    weight: e.weight,
    hlc: e.hlc,
    prev: e.prev,
  });
}

export function eventHash(
  e: Pick<AttentionEvent, 'itemId' | 'agent' | 'kind' | 'weight' | 'hlc' | 'prev'>,
): string {
  return sha256(eventBody(e));
}

/** Verify one event: hash integrity + Ed25519 signature. */
export function verifyEvent(e: AttentionEvent): boolean {
  try {
    if (eventHash(e) !== e.hash) return false;
    const publicKey = createPublicKey(e.publicKeyPem);
    return edVerify(null, Buffer.from(eventBody(e), 'utf8'), publicKey, Buffer.from(e.signature, 'base64'));
  } catch {
    return false;
  }
}

/**
 * Verify an agent's full chain: every link's hash/signature, prev linkage
 * back to GENESIS, one consistent key, and strictly increasing HLC order.
 */
export function verifyAgentChain(events: AttentionEvent[]): { valid: boolean; reason?: string } {
  let prev = GENESIS;
  let lastHlc = '';
  let keyPem: string | null = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.prev !== prev) return { valid: false, reason: `link ${i}: broken prev pointer` };
    if (!verifyEvent(e)) return { valid: false, reason: `link ${i}: bad hash or signature` };
    if (keyPem === null) keyPem = e.publicKeyPem;
    else if (e.publicKeyPem !== keyPem) return { valid: false, reason: `link ${i}: key changed mid-chain` };
    if (e.hlc <= lastHlc) return { valid: false, reason: `link ${i}: HLC not increasing` };
    prev = e.hash;
    lastHlc = e.hlc;
  }
  return { valid: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// Decay math
// ──────────────────────────────────────────────────────────────────────────────

/** Decayed contribution of one event at time `nowMs`. */
export function decayedWeight(weight: number, eventMs: number, nowMs: number, halfLifeMs = DEFAULT_HALF_LIFE_MS): number {
  const age = Math.max(0, nowMs - eventMs);
  return weight * Math.pow(2, -age / halfLifeMs);
}

/** Extract the physical-clock ms from a serialized HLC timestamp. */
export function hlcMs(hlc: string): number {
  return hlcFromString(hlc).l;
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

export class AttentionChainService {
  private lightrag: LightRAGClient;
  private keyring: AgentKeyring;
  private halfLifeMs: number;
  private hlcState: HLCTimestamp = HLC_ZERO;
  private chains = new Map<string, AttentionEvent[]>();   // agent → ordered chain
  private byItem = new Map<string, AttentionEvent[]>();   // itemId → events
  private seenHashes = new Set<string>();
  private reputations = new Map<string, AgentReputation>();

  constructor(lightrag: LightRAGClient, opts: { keyring?: AgentKeyring; halfLifeMs?: number } = {}) {
    this.lightrag = lightrag;
    this.keyring = opts.keyring ?? new AgentKeyring();
    this.halfLifeMs = opts.halfLifeMs ?? DEFAULT_HALF_LIFE_MS;
  }

  // ── Reputation ───────────────────────────────────────────────────────────────

  /**
   * Set the reputation multiplier for an agent. Clamped to [MIN, MAX].
   * A multiplier > 1 amplifies the agent's attention events (trusted expert);
   * < 1 dampens them (untrusted source). Default is 1.0 (neutral).
   */
  setReputation(agent: string, multiplier: number): void {
    const clamped = Math.max(MIN_REPUTATION, Math.min(MAX_REPUTATION, multiplier));
    this.reputations.set(agent, { agent, multiplier: clamped, setAt: new Date().toISOString() });
  }

  getReputation(agent: string): number {
    return this.reputations.get(agent)?.multiplier ?? 1.0;
  }

  getReputationRecord(agent: string): AgentReputation | null {
    return this.reputations.get(agent) ?? null;
  }

  /**
   * Snapshot of the full cross-agent attention graph (in-memory).
   * Used by the REST endpoint and can feed graph-ML ranking.
   */
  getAttentionGraph(nowMs = Date.now()): AttentionGraph {
    const agents = Array.from(this.chains.entries()).map(([agent, chain]) => ({
      agent,
      chainLength: chain.length,
      totalWeight: chain.reduce((s, e) => s + e.weight, 0),
      reputation: this.getReputation(agent),
      distinctItems: new Set(chain.map(e => e.itemId)).size,
    }));
    const items = Array.from(this.byItem.keys()).map(id => this.attentionOf(id, nowMs));
    const totalEvents = agents.reduce((s, a) => s + a.chainLength, 0);
    return { agents, items, totalEvents };
  }

  getKeyring(): AgentKeyring {
    return this.keyring;
  }

  /** Head hash of an agent's chain (GENESIS when the agent has no events). */
  headOf(agent: string): string {
    const chain = this.chains.get(agent);
    return chain && chain.length > 0 ? chain[chain.length - 1].hash : GENESIS;
  }

  /**
   * Record a local attention event: HLC-stamp, link to the agent's chain
   * head, hash, sign, store.
   */
  record(params: { itemId: string; agent: string; kind: AttentionKind; weight?: number }): AttentionEvent {
    const baseWeight = params.weight ?? DEFAULT_WEIGHTS[params.kind];
    if (!Number.isFinite(baseWeight) || baseWeight <= 0) {
      throw new Error(`weight must be a positive number, got ${params.weight}`);
    }
    // Scale by the agent's reputation multiplier: trusted validators carry more weight.
    // The effective weight is stored in the signed event body, so peers can verify it.
    const weight = baseWeight * this.getReputation(params.agent);
    this.hlcState = hlcNow(this.hlcState);

    const unsigned = {
      itemId: params.itemId,
      agent: params.agent,
      kind: params.kind,
      weight,
      hlc: hlcToString(this.hlcState),
      prev: this.headOf(params.agent),
    };
    const hash = eventHash(unsigned);
    const kp = this.keyring.getOrCreate(params.agent);
    const signature = edSign(null, Buffer.from(eventBody(unsigned), 'utf8'), kp.privateKey).toString('base64');

    const event: AttentionEvent = { ...unsigned, hash, publicKeyPem: kp.publicKeyPem, signature };
    this.append(event);
    void this.persistEvent(event);
    return event;
  }

  /**
   * Ingest an event from a peer. Verifies hash + signature, requires the
   * event to extend the agent's local chain head (out-of-order events are
   * rejected with the expected head so the peer can resync).
   */
  receive(event: AttentionEvent): { accepted: boolean; reason?: string; expectedPrev?: string } {
    if (this.seenHashes.has(event.hash)) return { accepted: false, reason: 'duplicate' };
    if (!verifyEvent(event)) return { accepted: false, reason: 'bad hash or signature' };

    const expectedPrev = this.headOf(event.agent);
    if (event.prev !== expectedPrev) {
      return { accepted: false, reason: 'does not extend local chain head', expectedPrev };
    }
    const chain = this.chains.get(event.agent);
    const existingKey = chain && chain.length > 0 ? chain[0].publicKeyPem : null;
    if (existingKey && existingKey !== event.publicKeyPem) {
      return { accepted: false, reason: 'public key does not match agent chain' };
    }

    this.hlcState = hlcRecv(this.hlcState, hlcFromString(event.hlc));
    this.append(event);
    void this.persistEvent(event);
    return { accepted: true };
  }

  /** Decayed attention for one item at `nowMs` (defaults to wall clock). */
  attentionOf(itemId: string, nowMs = Date.now()): ItemAttention {
    const events = this.byItem.get(itemId) ?? [];
    let score = 0;
    let rawWeight = 0;
    const byKind: Partial<Record<AttentionKind, number>> = {};
    for (const e of events) {
      score += decayedWeight(e.weight, hlcMs(e.hlc), nowMs, this.halfLifeMs);
      rawWeight += e.weight;
      byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
    }
    return {
      itemId,
      score,
      rawWeight,
      eventCount: events.length,
      lastEventHlc: events.length > 0 ? events[events.length - 1].hlc : null,
      byKind,
    };
  }

  /** Decay-ranked hot list across all items with any attention. */
  hot(limit = 20, nowMs = Date.now()): ItemAttention[] {
    return Array.from(this.byItem.keys())
      .map(id => this.attentionOf(id, nowMs))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getAgentChain(agent: string): AttentionEvent[] {
    return [...(this.chains.get(agent) ?? [])];
  }

  getItemEvents(itemId: string): AttentionEvent[] {
    return [...(this.byItem.get(itemId) ?? [])];
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private append(event: AttentionEvent): void {
    const chain = this.chains.get(event.agent) ?? [];
    chain.push(event);
    this.chains.set(event.agent, chain);

    const items = this.byItem.get(event.itemId) ?? [];
    items.push(event);
    this.byItem.set(event.itemId, items);

    this.seenHashes.add(event.hash);
  }

  /** Persist as an AttentionEvent node linked to its item (offline-safe). */
  private async persistEvent(event: AttentionEvent): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      const id = `attn_${event.hash.substring(0, 24)}`;
      await this.lightrag.mergeTypedNode(id, 'AttentionEvent', {
        item_id: event.itemId,
        agent: event.agent,
        kind: event.kind,
        weight: event.weight,
        hlc: event.hlc,
        prev: event.prev,
        hash: event.hash,
        content: `${event.agent} ${event.kind} ${event.itemId}`,
      });
      await this.lightrag.addEdge(id, 'ATTENTION_ON', event.itemId, { kind: event.kind });
      // Cross-agent graph: Agent node + ATTENDS edge (enables graph-ML queries
      // like "which agents cluster around this item" / "authority ranking").
      const agentNodeId = `agent_${event.agent.replace(/[^A-Za-z0-9_]/g, '_')}`;
      await this.lightrag.mergeTypedNode(agentNodeId, 'Agent', {
        agent: event.agent,
        reputation: this.getReputation(event.agent),
        content: `Agent ${event.agent}`,
      });
      await this.lightrag.addEdge(agentNodeId, 'ATTENDS', event.itemId, {
        kind: event.kind,
        weight: event.weight,
        hlc: event.hlc,
      });
    } catch (e: any) {
      logger.warn(`attention persist: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

const KINDS: AttentionKind[] = ['view', 'share', 'reply', 'validate', 'anchor'];

export function registerAttentionRoutes(app: Express, service: AttentionChainService): void {

  /** POST /api/attention — { itemId, agent, kind, weight? } */
  app.post('/api/attention', (req: Request, res: Response): void => {
    const { itemId, agent, kind, weight } = req.body ?? {};
    if (!itemId || !agent || !KINDS.includes(kind)) {
      res.status(400).json({ success: false, error: `itemId, agent, kind(${KINDS.join('|')}) required` }); return;
    }
    try {
      const event = service.record({ itemId, agent, kind, weight });
      res.status(201).json({ success: true, event, attention: service.attentionOf(itemId) });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  /** POST /api/attention/receive — ingest a peer event */
  app.post('/api/attention/receive', (req: Request, res: Response): void => {
    const event = req.body as AttentionEvent;
    if (!event?.hash || !event?.signature) {
      res.status(400).json({ success: false, error: 'signed AttentionEvent body required' }); return;
    }
    const result = service.receive(event);
    res.status(result.accepted ? 201 : 409).json({ success: result.accepted, ...result });
  });

  /** GET /api/attention/hot — decay-ranked hot items */
  app.get('/api/attention/hot', (req: Request, res: Response): void => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    res.json({ success: true, items: service.hot(limit) });
  });

  /** GET /api/attention/item/:itemId — score + events for one item */
  app.get('/api/attention/item/:itemId', (req: Request, res: Response): void => {
    res.json({
      success: true,
      attention: service.attentionOf(req.params.itemId),
      events: service.getItemEvents(req.params.itemId),
    });
  });

  /** GET /api/attention/agent/:agent/chain — agent chain + verification */
  app.get('/api/attention/agent/:agent/chain', (req: Request, res: Response): void => {
    const chain = service.getAgentChain(req.params.agent);
    res.json({
      success: true,
      agent: req.params.agent,
      length: chain.length,
      head: chain.length > 0 ? chain[chain.length - 1].hash : GENESIS,
      reputation: service.getReputation(req.params.agent),
      verification: verifyAgentChain(chain),
      chain,
    });
  });

  /** POST /api/attention/reputation — { agent, multiplier } */
  app.post('/api/attention/reputation', (req: Request, res: Response): void => {
    const { agent, multiplier } = req.body ?? {};
    if (!agent || typeof multiplier !== 'number') {
      res.status(400).json({ success: false, error: 'agent (string) and multiplier (number) required' }); return;
    }
    service.setReputation(agent, multiplier);
    res.json({ success: true, reputation: service.getReputationRecord(agent) });
  });

  /** GET /api/attention/reputation/:agent — current multiplier for one agent */
  app.get('/api/attention/reputation/:agent', (req: Request, res: Response): void => {
    res.json({
      success: true,
      agent: req.params.agent,
      multiplier: service.getReputation(req.params.agent),
      record: service.getReputationRecord(req.params.agent),
    });
  });

  /** GET /api/attention/graph — cross-agent attention graph snapshot */
  app.get('/api/attention/graph', (req: Request, res: Response): void => {
    res.json({ success: true, ...service.getAttentionGraph() });
  });

  logger.info('✓ Attention Chain API registered (/api/attention/*)');
}

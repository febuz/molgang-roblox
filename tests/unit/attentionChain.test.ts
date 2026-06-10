/**
 * Unit tests for attention-chain.ts — signed per-agent hash chains with
 * decaying attention scores. All offline (Node crypto Ed25519).
 */

import {
  AttentionChainService,
  AttentionEvent,
  verifyEvent,
  verifyAgentChain,
  decayedWeight,
  eventHash,
  registerAttentionRoutes,
  DEFAULT_WEIGHTS,
  DEFAULT_HALF_LIFE_MS,
  MIN_REPUTATION,
  MAX_REPUTATION,
  GENESIS,
} from '../../src/integrations/lightrag/attention-chain';
import { LightRAGClient } from '../../src/integrations/lightrag/client';
import express from 'express';
import http from 'http';

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

async function callRoute(
  app: express.Express,
  method: 'get' | 'post',
  path: string,
  body?: any,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const reqBody = body ? JSON.stringify(body) : '';
      const req = http.request(`http://127.0.0.1:${port}${path}`, {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) },
      }, (res) => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode ?? 200, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode ?? 200, body: data }); }
        });
      });
      req.on('error', e => { server.close(); reject(e); });
      if (reqBody) req.write(reqBody);
      req.end();
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// record() — chain construction
// ──────────────────────────────────────────────────────────────────────────────

describe('AttentionChainService.record', () => {
  let client: LightRAGClient;
  let service: AttentionChainService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new AttentionChainService(client);
  });

  afterEach(async () => { await client.close(); });

  it('first event links to GENESIS', () => {
    const e = service.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    expect(e.prev).toBe(GENESIS);
  });

  it('second event links to the first event hash', () => {
    const a = service.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    const b = service.record({ itemId: 'news_2', agent: 'kai', kind: 'share' });
    expect(b.prev).toBe(a.hash);
  });

  it('chains are per-agent: another agent starts at GENESIS', () => {
    service.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    const z = service.record({ itemId: 'news_1', agent: 'zip', kind: 'view' });
    expect(z.prev).toBe(GENESIS);
  });

  it('applies default weights per kind', () => {
    expect(service.record({ itemId: 'n', agent: 'a', kind: 'view' }).weight).toBe(DEFAULT_WEIGHTS.view);
    expect(service.record({ itemId: 'n', agent: 'a', kind: 'anchor' }).weight).toBe(DEFAULT_WEIGHTS.anchor);
  });

  it('anchor outweighs validate outweighs reply outweighs share outweighs view', () => {
    const w = DEFAULT_WEIGHTS;
    expect(w.anchor).toBeGreaterThan(w.validate);
    expect(w.validate).toBeGreaterThan(w.reply);
    expect(w.reply).toBeGreaterThan(w.share);
    expect(w.share).toBeGreaterThan(w.view);
  });

  it('accepts a custom positive weight, rejects non-positive', () => {
    expect(service.record({ itemId: 'n', agent: 'a', kind: 'view', weight: 7 }).weight).toBe(7);
    expect(() => service.record({ itemId: 'n', agent: 'a', kind: 'view', weight: 0 })).toThrow(/positive/);
    expect(() => service.record({ itemId: 'n', agent: 'a', kind: 'view', weight: -3 })).toThrow(/positive/);
  });

  it('events verify individually and as a chain', () => {
    service.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    service.record({ itemId: 'news_2', agent: 'kai', kind: 'validate' });
    service.record({ itemId: 'news_1', agent: 'kai', kind: 'share' });
    const chain = service.getAgentChain('kai');
    expect(chain.every(verifyEvent)).toBe(true);
    expect(verifyAgentChain(chain)).toEqual({ valid: true });
  });

  it('HLC timestamps strictly increase along the chain', () => {
    service.record({ itemId: 'a', agent: 'kai', kind: 'view' });
    service.record({ itemId: 'b', agent: 'kai', kind: 'view' });
    service.record({ itemId: 'c', agent: 'kai', kind: 'view' });
    const chain = service.getAgentChain('kai');
    expect(chain[0].hlc < chain[1].hlc).toBe(true);
    expect(chain[1].hlc < chain[2].hlc).toBe(true);
  });

  it('headOf tracks the latest hash', () => {
    expect(service.headOf('kai')).toBe(GENESIS);
    const e = service.record({ itemId: 'n', agent: 'kai', kind: 'view' });
    expect(service.headOf('kai')).toBe(e.hash);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Chain verification — tamper detection
// ──────────────────────────────────────────────────────────────────────────────

describe('verifyAgentChain — tamper detection', () => {
  let client: LightRAGClient;
  let service: AttentionChainService;
  let chain: AttentionEvent[];

  beforeEach(() => {
    client = makeOfflineClient();
    service = new AttentionChainService(client);
    service.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    service.record({ itemId: 'news_2', agent: 'kai', kind: 'validate' });
    service.record({ itemId: 'news_3', agent: 'kai', kind: 'anchor' });
    chain = service.getAgentChain('kai');
  });

  afterEach(async () => { await client.close(); });

  it('accepts the untampered chain and the empty chain', () => {
    expect(verifyAgentChain(chain).valid).toBe(true);
    expect(verifyAgentChain([]).valid).toBe(true);
  });

  it('detects a tampered weight (hash breaks)', () => {
    const forged = [...chain];
    forged[1] = { ...forged[1], weight: 999 };
    expect(verifyAgentChain(forged).reason).toMatch(/bad hash/);
  });

  it('detects a removed middle link (prev pointer breaks)', () => {
    const spliced = [chain[0], chain[2]];
    expect(verifyAgentChain(spliced).reason).toMatch(/broken prev/);
  });

  it('detects re-ordered links', () => {
    const reordered = [chain[1], chain[0], chain[2]];
    expect(verifyAgentChain(reordered).valid).toBe(false);
  });

  it('detects a recomputed-hash forgery (signature breaks)', () => {
    const forged = [...chain];
    const tampered = { ...forged[1], weight: 999 };
    tampered.hash = eventHash(tampered); // attacker fixes the hash…
    forged[1] = tampered;                // …but cannot re-sign
    expect(verifyAgentChain(forged).reason).toMatch(/bad hash or signature/);
  });

  it('detects a key swap mid-chain', () => {
    const other = new AttentionChainService(makeOfflineClient());
    const foreign = other.record({ itemId: 'news_9', agent: 'kai', kind: 'view' });
    // Splice a foreign (differently-keyed) but individually-valid event
    const forged = [...chain, { ...foreign, prev: chain[2].hash, hash: '', signature: '' }];
    expect(verifyAgentChain(forged).valid).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Decay — "houd de aandacht erbij"
// ──────────────────────────────────────────────────────────────────────────────

describe('decay', () => {
  it('a fresh event keeps its full weight', () => {
    const now = Date.now();
    expect(decayedWeight(8, now, now)).toBeCloseTo(8);
  });

  it('after one half-life the weight halves', () => {
    const now = Date.now();
    expect(decayedWeight(8, now - DEFAULT_HALF_LIFE_MS, now)).toBeCloseTo(4);
  });

  it('after two half-lives the weight quarters', () => {
    const now = Date.now();
    expect(decayedWeight(8, now - 2 * DEFAULT_HALF_LIFE_MS, now)).toBeCloseTo(2);
  });

  it('future timestamps are clamped (no amplification)', () => {
    const now = Date.now();
    expect(decayedWeight(8, now + 60_000, now)).toBeCloseTo(8);
  });

  it('attention decays unless new events keep arriving', async () => {
    const client = makeOfflineClient();
    // 100ms half-life so the test observes decay directly
    const service = new AttentionChainService(client, { halfLifeMs: 100 });
    service.record({ itemId: 'news_1', agent: 'kai', kind: 'anchor' }); // weight 8

    const now = Date.now();
    const fresh = service.attentionOf('news_1', now).score;
    const later = service.attentionOf('news_1', now + 200).score;   // 2 half-lives
    expect(later).toBeLessThan(fresh / 3);

    // A new event restores the attention
    service.record({ itemId: 'news_1', agent: 'zip', kind: 'validate' });
    const restored = service.attentionOf('news_1', now + 200).score;
    expect(restored).toBeGreaterThan(later);
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// attentionOf / hot ranking
// ──────────────────────────────────────────────────────────────────────────────

describe('attentionOf / hot', () => {
  let client: LightRAGClient;
  let service: AttentionChainService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new AttentionChainService(client);
  });

  afterEach(async () => { await client.close(); });

  it('aggregates weights and counts per kind', () => {
    service.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    service.record({ itemId: 'news_1', agent: 'zip', kind: 'view' });
    service.record({ itemId: 'news_1', agent: 'fill', kind: 'validate' });
    const a = service.attentionOf('news_1');
    expect(a.eventCount).toBe(3);
    expect(a.rawWeight).toBe(DEFAULT_WEIGHTS.view * 2 + DEFAULT_WEIGHTS.validate);
    expect(a.byKind.view).toBe(2);
    expect(a.byKind.validate).toBe(1);
  });

  it('unknown item has zero attention', () => {
    const a = service.attentionOf('nope');
    expect(a.score).toBe(0);
    expect(a.eventCount).toBe(0);
    expect(a.lastEventHlc).toBeNull();
  });

  it('hot ranks items by decayed score', () => {
    service.record({ itemId: 'cold', agent: 'kai', kind: 'view' });        // 1
    service.record({ itemId: 'hot', agent: 'kai', kind: 'anchor' });       // 8
    service.record({ itemId: 'warm', agent: 'kai', kind: 'reply' });       // 3
    const ranked = service.hot();
    expect(ranked.map(r => r.itemId)).toEqual(['hot', 'warm', 'cold']);
  });

  it('hot respects the limit', () => {
    for (let i = 0; i < 5; i++) {
      service.record({ itemId: `news_${i}`, agent: 'kai', kind: 'view' });
    }
    expect(service.hot(2)).toHaveLength(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// receive() — P2P ingestion
// ──────────────────────────────────────────────────────────────────────────────

describe('receive', () => {
  let clientA: LightRAGClient;
  let clientB: LightRAGClient;
  let peerA: AttentionChainService;
  let peerB: AttentionChainService;

  beforeEach(() => {
    clientA = makeOfflineClient();
    clientB = makeOfflineClient();
    peerA = new AttentionChainService(clientA);
    peerB = new AttentionChainService(clientB);
  });

  afterEach(async () => { await clientA.close(); await clientB.close(); });

  it('accepts a valid peer event and counts its attention', () => {
    const e = peerA.record({ itemId: 'news_1', agent: 'kai', kind: 'validate' });
    expect(peerB.receive(e).accepted).toBe(true);
    expect(peerB.attentionOf('news_1').eventCount).toBe(1);
  });

  it('replays an entire agent chain in order', () => {
    peerA.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    peerA.record({ itemId: 'news_2', agent: 'kai', kind: 'share' });
    peerA.record({ itemId: 'news_1', agent: 'kai', kind: 'anchor' });
    for (const e of peerA.getAgentChain('kai')) {
      expect(peerB.receive(e).accepted).toBe(true);
    }
    expect(verifyAgentChain(peerB.getAgentChain('kai')).valid).toBe(true);
  });

  it('rejects duplicates', () => {
    const e = peerA.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    peerB.receive(e);
    expect(peerB.receive(e)).toEqual({ accepted: false, reason: 'duplicate' });
  });

  it('rejects tampered events', () => {
    const e = peerA.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    expect(peerB.receive({ ...e, weight: 999 }).reason).toMatch(/bad hash/);
  });

  it('rejects out-of-order events and reports the expected head', () => {
    peerA.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    const second = peerA.record({ itemId: 'news_2', agent: 'kai', kind: 'share' });
    const result = peerB.receive(second); // first event never arrived
    expect(result.accepted).toBe(false);
    expect(result.expectedPrev).toBe(GENESIS);
  });

  it('rejects an impersonator extending another key\'s chain', () => {
    const real = peerA.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    peerB.receive(real);
    // peerB's own keyring signs as "kai" with a DIFFERENT key
    const forged = peerB.record({ itemId: 'news_2', agent: 'zip', kind: 'view' });
    const impersonation = { ...forged, agent: 'kai' };
    const result = peerB.receive(impersonation as AttentionEvent);
    expect(result.accepted).toBe(false);
  });

  it('advances the local HLC past received events', () => {
    const e = peerA.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    peerB.receive(e);
    const local = peerB.record({ itemId: 'news_1', agent: 'zip', kind: 'view' });
    expect(local.hlc > e.hlc).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST API
// ──────────────────────────────────────────────────────────────────────────────

describe('Attention REST API', () => {
  let client: LightRAGClient;
  let service: AttentionChainService;
  let app: express.Express;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new AttentionChainService(client);
    app = express();
    app.use(express.json());
    registerAttentionRoutes(app, service);
  });

  afterEach(async () => { await client.close(); });

  it('POST /api/attention records an event and returns the live score', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/attention', {
      itemId: 'news_1', agent: 'kai', kind: 'validate',
    });
    expect(status).toBe(201);
    expect(body.event.prev).toBe(GENESIS);
    expect(body.attention.score).toBeGreaterThan(0);
  });

  it('POST /api/attention rejects an unknown kind', async () => {
    const { status } = await callRoute(app, 'post', '/api/attention', {
      itemId: 'news_1', agent: 'kai', kind: 'meditate',
    });
    expect(status).toBe(400);
  });

  it('GET /api/attention/hot returns the ranking', async () => {
    await callRoute(app, 'post', '/api/attention', { itemId: 'a', agent: 'kai', kind: 'anchor' });
    await callRoute(app, 'post', '/api/attention', { itemId: 'b', agent: 'kai', kind: 'view' });
    const { body } = await callRoute(app, 'get', '/api/attention/hot');
    expect(body.items[0].itemId).toBe('a');
  });

  it('GET /api/attention/item/:itemId returns score and events', async () => {
    await callRoute(app, 'post', '/api/attention', { itemId: 'news_1', agent: 'kai', kind: 'share' });
    const { body } = await callRoute(app, 'get', '/api/attention/item/news_1');
    expect(body.attention.eventCount).toBe(1);
    expect(body.events).toHaveLength(1);
  });

  it('GET /api/attention/agent/:agent/chain verifies the chain', async () => {
    await callRoute(app, 'post', '/api/attention', { itemId: 'a', agent: 'kai', kind: 'view' });
    await callRoute(app, 'post', '/api/attention', { itemId: 'b', agent: 'kai', kind: 'reply' });
    const { body } = await callRoute(app, 'get', '/api/attention/agent/kai/chain');
    expect(body.length).toBe(2);
    expect(body.verification.valid).toBe(true);
  });

  it('POST /api/attention/receive accepts a valid peer event (409 on duplicate)', async () => {
    const peer = new AttentionChainService(makeOfflineClient());
    const e = peer.record({ itemId: 'news_1', agent: 'kai', kind: 'view' });
    const first = await callRoute(app, 'post', '/api/attention/receive', e);
    expect(first.status).toBe(201);
    const dup = await callRoute(app, 'post', '/api/attention/receive', e);
    expect(dup.status).toBe(409);
  });

  it('GET /api/attention/agent/:agent/chain includes the reputation multiplier', async () => {
    await callRoute(app, 'post', '/api/attention/reputation', { agent: 'kai', multiplier: 3 });
    await callRoute(app, 'post', '/api/attention', { itemId: 'a', agent: 'kai', kind: 'view' });
    const { body } = await callRoute(app, 'get', '/api/attention/agent/kai/chain');
    expect(body.reputation).toBe(3);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Reputation — weighted attention
// ──────────────────────────────────────────────────────────────────────────────

describe('Reputation — weighted attention', () => {
  let client: LightRAGClient;
  let service: AttentionChainService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new AttentionChainService(client);
  });

  afterEach(async () => { await client.close(); });

  it('default reputation is 1.0 (neutral — does not change weight)', () => {
    expect(service.getReputation('kai')).toBe(1.0);
    const e = service.record({ itemId: 'n', agent: 'kai', kind: 'validate' });
    expect(e.weight).toBe(DEFAULT_WEIGHTS.validate);
  });

  it('setReputation scales the effective weight stored in the event', () => {
    service.setReputation('expert', 2.0);
    const e = service.record({ itemId: 'n', agent: 'expert', kind: 'validate' });
    expect(e.weight).toBe(DEFAULT_WEIGHTS.validate * 2.0);
  });

  it('a lower reputation dampens the effective weight', () => {
    service.setReputation('suspect', 0.5);
    const e = service.record({ itemId: 'n', agent: 'suspect', kind: 'validate' });
    expect(e.weight).toBe(DEFAULT_WEIGHTS.validate * 0.5);
  });

  it('clamps multiplier to MIN_REPUTATION from below', () => {
    service.setReputation('low', 0.0001);
    expect(service.getReputation('low')).toBe(MIN_REPUTATION);
  });

  it('clamps multiplier to MAX_REPUTATION from above', () => {
    service.setReputation('high', 9999);
    expect(service.getReputation('high')).toBe(MAX_REPUTATION);
  });

  it('getReputationRecord returns null before any reputation is set', () => {
    expect(service.getReputationRecord('unknown')).toBeNull();
  });

  it('getReputationRecord returns the record after setReputation', () => {
    service.setReputation('kai', 1.5);
    const rec = service.getReputationRecord('kai');
    expect(rec).not.toBeNull();
    expect(rec!.agent).toBe('kai');
    expect(rec!.multiplier).toBe(1.5);
    expect(rec!.setAt).toBeTruthy();
  });

  it('chain signature still verifies with a reputation-scaled weight', () => {
    service.setReputation('expert', 3.0);
    service.record({ itemId: 'a', agent: 'expert', kind: 'view' });
    service.record({ itemId: 'b', agent: 'expert', kind: 'anchor' });
    const chain = service.getAgentChain('expert');
    expect(verifyAgentChain(chain).valid).toBe(true);
  });

  it('high-reputation validate outweighs a default validate in attentionOf', () => {
    const svcA = new AttentionChainService(makeOfflineClient());
    const svcB = new AttentionChainService(makeOfflineClient());
    svcB.setReputation('expert', 3.0);
    const now = Date.now();
    svcA.record({ itemId: 'news_1', agent: 'novice', kind: 'validate' });
    svcB.record({ itemId: 'news_1', agent: 'expert', kind: 'validate' });
    const scoreA = svcA.attentionOf('news_1', now).score;
    const scoreB = svcB.attentionOf('news_1', now).score;
    expect(scoreB).toBeGreaterThan(scoreA);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Attention graph
// ──────────────────────────────────────────────────────────────────────────────

describe('AttentionChainService.getAttentionGraph', () => {
  let client: LightRAGClient;
  let service: AttentionChainService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new AttentionChainService(client);
  });

  afterEach(async () => { await client.close(); });

  it('empty graph has no agents, no items, zero totalEvents', () => {
    const g = service.getAttentionGraph();
    expect(g.agents).toHaveLength(0);
    expect(g.items).toHaveLength(0);
    expect(g.totalEvents).toBe(0);
  });

  it('counts agents and their chain lengths correctly', () => {
    service.record({ itemId: 'a', agent: 'kai', kind: 'view' });
    service.record({ itemId: 'b', agent: 'kai', kind: 'share' });
    service.record({ itemId: 'a', agent: 'zip', kind: 'validate' });
    const g = service.getAttentionGraph();
    expect(g.agents).toHaveLength(2);
    const kai = g.agents.find(a => a.agent === 'kai')!;
    expect(kai.chainLength).toBe(2);
    expect(kai.distinctItems).toBe(2);
    const zip = g.agents.find(a => a.agent === 'zip')!;
    expect(zip.chainLength).toBe(1);
    expect(zip.distinctItems).toBe(1);
  });

  it('items list includes all attended items with scores', () => {
    service.record({ itemId: 'news_1', agent: 'kai', kind: 'anchor' });
    service.record({ itemId: 'news_2', agent: 'zip', kind: 'view' });
    const g = service.getAttentionGraph();
    expect(g.items).toHaveLength(2);
    expect(g.items.every(i => i.score > 0)).toBe(true);
  });

  it('totalEvents equals sum of all chain lengths', () => {
    service.record({ itemId: 'a', agent: 'kai', kind: 'view' });
    service.record({ itemId: 'b', agent: 'kai', kind: 'view' });
    service.record({ itemId: 'a', agent: 'zip', kind: 'validate' });
    const g = service.getAttentionGraph();
    expect(g.totalEvents).toBe(3);
  });

  it('agent reputation is reflected in the graph', () => {
    service.setReputation('expert', 2.5);
    service.record({ itemId: 'a', agent: 'expert', kind: 'validate' });
    const g = service.getAttentionGraph();
    const expert = g.agents.find(a => a.agent === 'expert')!;
    expect(expert.reputation).toBe(2.5);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Reputation + graph REST
// ──────────────────────────────────────────────────────────────────────────────

describe('Reputation and graph REST API', () => {
  let client: LightRAGClient;
  let service: AttentionChainService;
  let app: express.Express;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new AttentionChainService(client);
    app = express();
    app.use(express.json());
    registerAttentionRoutes(app, service);
  });

  afterEach(async () => { await client.close(); });

  it('POST /api/attention/reputation sets the multiplier', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/attention/reputation', {
      agent: 'kai', multiplier: 2,
    });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.reputation.multiplier).toBe(2);
  });

  it('POST /api/attention/reputation rejects missing fields', async () => {
    const { status } = await callRoute(app, 'post', '/api/attention/reputation', { agent: 'kai' });
    expect(status).toBe(400);
  });

  it('GET /api/attention/reputation/:agent returns 1.0 when unset', async () => {
    const { body } = await callRoute(app, 'get', '/api/attention/reputation/unknown');
    expect(body.multiplier).toBe(1.0);
    expect(body.record).toBeNull();
  });

  it('GET /api/attention/reputation/:agent returns the set value', async () => {
    await callRoute(app, 'post', '/api/attention/reputation', { agent: 'kai', multiplier: 3 });
    const { body } = await callRoute(app, 'get', '/api/attention/reputation/kai');
    expect(body.multiplier).toBe(3);
    expect(body.record).not.toBeNull();
  });

  it('GET /api/attention/graph returns agents, items, totalEvents', async () => {
    await callRoute(app, 'post', '/api/attention', { itemId: 'a', agent: 'kai', kind: 'anchor' });
    await callRoute(app, 'post', '/api/attention', { itemId: 'b', agent: 'zip', kind: 'view' });
    const { body } = await callRoute(app, 'get', '/api/attention/graph');
    expect(body.success).toBe(true);
    expect(body.agents).toHaveLength(2);
    expect(body.items).toHaveLength(2);
    expect(body.totalEvents).toBe(2);
  });
});

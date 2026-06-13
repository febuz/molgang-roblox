/**
 * Unit tests for news.ts — P2P news publication (claim model).
 * All tests offline: Ed25519 via Node crypto, no Neo4j needed.
 */

import {
  NewsService,
  NewsItem,
  generateNewsKeypair,
  verifyNewsItem,
  validateCoordinates,
  isValidFactTimeNs,
  nowNs,
  registerNewsRoutes,
  MAX_DIMENSIONS,
  MAX_SPARSE_ENTRIES,
} from '../../src/integrations/lightrag/news';
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

const CLAIM = {
  claimedFact: 'Kafka cluster expanded to 5 brokers',
  source: 'https://ops.example.com/changelog/42',
  claimer: 'agent-kai',
};

// ──────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ──────────────────────────────────────────────────────────────────────────────

describe('nowNs / isValidFactTimeNs', () => {
  it('nowNs returns a decimal string in nanoseconds (≥ 10^18 for 2026)', () => {
    const ns = nowNs();
    expect(ns).toMatch(/^\d+$/);
    expect(BigInt(ns)).toBeGreaterThan(10n ** 18n);
  });

  it('nowNs is consistent with Date.now() to the millisecond', () => {
    const before = BigInt(Date.now()) * 1_000_000n;
    const ns = BigInt(nowNs());
    const after = (BigInt(Date.now()) + 1n) * 1_000_000n;
    expect(ns >= before && ns <= after).toBe(true);
  });

  it('accepts valid nanosecond strings', () => {
    expect(isValidFactTimeNs('1749500000000000000')).toBe(true);
  });

  it('rejects numbers, negatives, and non-digits', () => {
    expect(isValidFactTimeNs(1749500000000000000)).toBe(false);
    expect(isValidFactTimeNs('-5')).toBe(false);
    expect(isValidFactTimeNs('12a4')).toBe(false);
    expect(isValidFactTimeNs('')).toBe(false);
  });
});

describe('validateCoordinates', () => {
  it('accepts undefined (coordinates optional)', () => {
    expect(validateCoordinates(undefined)).toBeNull();
  });

  it('accepts valid sparse coordinates', () => {
    expect(validateCoordinates([
      { dim: 0, value: 1.5 },
      { dim: 888_888_887, value: -0.25 },
    ])).toBeNull();
  });

  it('rejects dim at exactly MAX_DIMENSIONS (space is 0-indexed)', () => {
    expect(validateCoordinates([{ dim: MAX_DIMENSIONS, value: 1 }])).toMatch(/out of range/);
  });

  it('rejects negative dims', () => {
    expect(validateCoordinates([{ dim: -1, value: 1 }])).toMatch(/out of range/);
  });

  it('rejects non-integer dims', () => {
    expect(validateCoordinates([{ dim: 1.5, value: 1 }])).toMatch(/integer dim/);
  });

  it('rejects zero values (sparse = only non-zero entries)', () => {
    expect(validateCoordinates([{ dim: 3, value: 0 }])).toMatch(/non-zero/);
  });

  it('rejects NaN and Infinity values', () => {
    expect(validateCoordinates([{ dim: 3, value: NaN }])).toMatch(/finite/);
    expect(validateCoordinates([{ dim: 3, value: Infinity }])).toMatch(/finite/);
  });

  it('rejects duplicate dims', () => {
    expect(validateCoordinates([
      { dim: 7, value: 1 },
      { dim: 7, value: 2 },
    ])).toMatch(/duplicate/);
  });

  it('rejects more than MAX_SPARSE_ENTRIES entries', () => {
    const coords = Array.from({ length: MAX_SPARSE_ENTRIES + 1 }, (_, i) => ({ dim: i, value: 1 }));
    expect(validateCoordinates(coords)).toMatch(/too many/);
  });

  it('rejects non-array input', () => {
    expect(validateCoordinates({ dim: 1, value: 2 })).toMatch(/must be an array/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Publish — instant, unverified
// ──────────────────────────────────────────────────────────────────────────────

describe('NewsService.publish', () => {
  let client: LightRAGClient;
  let service: NewsService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new NewsService(client);
  });

  afterEach(async () => { await client.close(); });

  it('publishes instantly with status unverified', async () => {
    const item = await service.publish(CLAIM);
    expect(item.status).toBe('unverified');
    expect(item.id).toMatch(/^news_/);
  });

  it('fills all claim-time fields: factTimeNs, claimTime, publicationTime', async () => {
    const item = await service.publish(CLAIM);
    expect(isValidFactTimeNs(item.factTimeNs)).toBe(true);
    expect(item.claimTime).toMatch(/^\d{15}\.\d{8}$/);   // HLC sortable format
    expect(() => new Date(item.publicationTime)).not.toThrow();
  });

  it('defaults factTimeNs to now in nanoseconds', async () => {
    const before = BigInt(Date.now()) * 1_000_000n;
    const item = await service.publish(CLAIM);
    expect(BigInt(item.factTimeNs)).toBeGreaterThanOrEqual(before);
  });

  it('accepts an explicit historical factTimeNs (fact older than claim)', async () => {
    const historical = '1700000000000000000'; // Nov 2023 in ns
    const item = await service.publish({ ...CLAIM, factTimeNs: historical });
    expect(item.factTimeNs).toBe(historical);
  });

  it('rejects an invalid factTimeNs', async () => {
    await expect(service.publish({ ...CLAIM, factTimeNs: 'not-a-time' })).rejects.toThrow(/factTimeNs/);
  });

  it('stores sparse coordinates', async () => {
    const coordinates = [{ dim: 42, value: 0.7 }, { dim: 888_888_887, value: -1 }];
    const item = await service.publish({ ...CLAIM, coordinates });
    expect(item.coordinates).toEqual(coordinates);
  });

  it('rejects out-of-range coordinates', async () => {
    await expect(
      service.publish({ ...CLAIM, coordinates: [{ dim: MAX_DIMENSIONS + 5, value: 1 }] }),
    ).rejects.toThrow(/out of range/);
  });

  it('signs the item so verifyNewsItem passes', async () => {
    const item = await service.publish(CLAIM);
    expect(verifyNewsItem(item).valid).toBe(true);
  });

  it('binds the graph state root at publication time', async () => {
    const item = await service.publish(CLAIM);
    expect(item.graphRoot).toMatch(/^[0-9a-f]{64}$/);
  });

  it('successive publishes get strictly increasing HLC claim times', async () => {
    const a = await service.publish(CLAIM);
    const b = await service.publish(CLAIM);
    expect(a.claimTime < b.claimTime).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Signature tamper detection
// ──────────────────────────────────────────────────────────────────────────────

describe('verifyNewsItem — tamper detection', () => {
  let client: LightRAGClient;
  let service: NewsService;
  let item: NewsItem;

  beforeEach(async () => {
    client = makeOfflineClient();
    service = new NewsService(client);
    item = await service.publish({ ...CLAIM, coordinates: [{ dim: 1, value: 2 }] });
  });

  afterEach(async () => { await client.close(); });

  it('detects a tampered claimedFact', () => {
    expect(verifyNewsItem({ ...item, claimedFact: 'TAMPERED' }).valid).toBe(false);
  });

  it('detects a tampered factTimeNs', () => {
    expect(verifyNewsItem({ ...item, factTimeNs: '1' }).valid).toBe(false);
  });

  it('detects tampered coordinates', () => {
    expect(verifyNewsItem({ ...item, coordinates: [{ dim: 1, value: 999 }] }).valid).toBe(false);
  });

  it('detects a tampered source', () => {
    expect(verifyNewsItem({ ...item, source: 'https://evil.example.com' }).valid).toBe(false);
  });

  it('status changes do NOT break the signature (lifecycle-mutable)', () => {
    expect(verifyNewsItem({ ...item, status: 'anchored', anchorId: 'anchor_1' }).valid).toBe(true);
  });

  it('detects a swapped public key', () => {
    const other = generateNewsKeypair();
    expect(verifyNewsItem({ ...item, publicKeyPem: other.publicKeyPem }).valid).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Lifecycle: unverified → p2p → anchored
// ──────────────────────────────────────────────────────────────────────────────

describe('NewsService lifecycle', () => {
  let client: LightRAGClient;
  let service: NewsService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new NewsService(client);
  });

  afterEach(async () => { await client.close(); });

  it('markDistributed moves unverified → p2p', async () => {
    const item = await service.publish(CLAIM);
    expect(service.markDistributed(item.id)).toBe(true);
    expect(service.get(item.id)!.status).toBe('p2p');
  });

  it('markAnchored moves items → anchored with anchorId', async () => {
    const a = await service.publish(CLAIM);
    const b = await service.publish(CLAIM);
    const n = service.markAnchored([a.id, b.id], 'anchor_test_1');
    expect(n).toBe(2);
    expect(service.get(a.id)!.status).toBe('anchored');
    expect(service.get(a.id)!.anchorId).toBe('anchor_test_1');
  });

  it('markAnchored skips already-anchored items', async () => {
    const a = await service.publish(CLAIM);
    service.markAnchored([a.id], 'anchor_1');
    expect(service.markAnchored([a.id], 'anchor_2')).toBe(0);
    expect(service.get(a.id)!.anchorId).toBe('anchor_1');
  });

  it('markDistributed cannot demote an anchored item', async () => {
    const a = await service.publish(CLAIM);
    service.markAnchored([a.id], 'anchor_1');
    expect(service.markDistributed(a.id)).toBe(false);
    expect(service.get(a.id)!.status).toBe('anchored');
  });

  it('unanchoredIds lists only non-anchored items', async () => {
    const a = await service.publish(CLAIM);
    const b = await service.publish(CLAIM);
    service.markAnchored([a.id], 'anchor_1');
    expect(service.unanchoredIds()).toEqual([b.id]);
  });

  it('receive() accepts a valid peer item and marks it p2p', async () => {
    const peer = new NewsService(makeOfflineClient());
    const item = await peer.publish(CLAIM);
    const result = await service.receive(item);
    expect(result.valid).toBe(true);
    expect(service.get(item.id)!.status).toBe('p2p');
  });

  it('receive() rejects a tampered peer item', async () => {
    const peer = new NewsService(makeOfflineClient());
    const item = await peer.publish(CLAIM);
    const result = await service.receive({ ...item, claimedFact: 'FORGED' });
    expect(result.valid).toBe(false);
    expect(service.get(item.id)).toBeUndefined();
  });

  it('receive() advances the local HLC past the peer claim time', async () => {
    const peer = new NewsService(makeOfflineClient());
    const peerItem = await peer.publish(CLAIM);
    await service.receive(peerItem);
    const local = await service.publish(CLAIM);
    expect(local.claimTime > peerItem.claimTime).toBe(true);
  });

  it('list filters by status and claimer', async () => {
    const a = await service.publish(CLAIM);
    await service.publish({ ...CLAIM, claimer: 'agent-other' });
    service.markAnchored([a.id], 'anchor_1');
    expect(service.list({ status: 'anchored' })).toHaveLength(1);
    expect(service.list({ claimer: 'agent-other' })).toHaveLength(1);
    expect(service.list()).toHaveLength(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST API
// ──────────────────────────────────────────────────────────────────────────────

describe('News REST API', () => {
  let client: LightRAGClient;
  let service: NewsService;
  let app: express.Express;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new NewsService(client);
    app = express();
    app.use(express.json());
    registerNewsRoutes(app, service);
  });

  afterEach(async () => { await client.close(); });

  it('POST /api/news publishes instantly and returns 201 unverified', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/news', CLAIM);
    expect(status).toBe(201);
    expect(body.item.status).toBe('unverified');
    expect(body.item.signature).toBeTruthy();
  });

  it('POST /api/news returns 400 when claim fields missing', async () => {
    const { status } = await callRoute(app, 'post', '/api/news', { claimedFact: 'x' });
    expect(status).toBe(400);
  });

  it('POST /api/news returns 400 for invalid coordinates', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/news', {
      ...CLAIM, coordinates: [{ dim: MAX_DIMENSIONS, value: 1 }],
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/out of range/);
  });

  it('GET /api/news lists published items newest-first', async () => {
    await callRoute(app, 'post', '/api/news', CLAIM);
    await callRoute(app, 'post', '/api/news', { ...CLAIM, claimedFact: 'second' });
    const { body } = await callRoute(app, 'get', '/api/news');
    expect(body.count).toBe(2);
    expect(body.items[0].claimedFact).toBe('second'); // newest first
  });

  it('POST /api/news/anchor (no backend) marks all pending as anchored locally', async () => {
    await callRoute(app, 'post', '/api/news', CLAIM);
    const { body } = await callRoute(app, 'post', '/api/news/anchor');
    expect(body.anchored).toBe(1);
    expect(body.mode).toBe('local');
  });

  it('POST /api/news/anchor uses the chain backend when provided', async () => {
    const app2 = express();
    app2.use(express.json());
    const service2 = new NewsService(makeOfflineClient());
    registerNewsRoutes(app2, service2, async () => ({ anchorId: 'anchor_chain_7' }));
    await callRoute(app2, 'post', '/api/news', CLAIM);
    const { body } = await callRoute(app2, 'post', '/api/news/anchor');
    expect(body.mode).toBe('chain');
    expect(body.anchorId).toBe('anchor_chain_7');
  });

  it('GET /api/news/:id returns the single item', async () => {
    const { body: pub } = await callRoute(app, 'post', '/api/news', CLAIM);
    const { body } = await callRoute(app, 'get', `/api/news/${pub.item.id}`);
    expect(body.item.id).toBe(pub.item.id);
  });

  it('POST /api/news/:id/verify confirms an untampered item', async () => {
    const { body: pub } = await callRoute(app, 'post', '/api/news', CLAIM);
    const { body } = await callRoute(app, 'post', `/api/news/${pub.item.id}/verify`);
    expect(body.valid).toBe(true);
  });

  it('GET /api/news/keys/public returns a PEM key (not captured by /:id)', async () => {
    const { status, body } = await callRoute(app, 'get', '/api/news/keys/public');
    expect(status).toBe(200);
    expect(body.publicKeyPem).toContain('BEGIN PUBLIC KEY');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Attention-ordered news feed
// ──────────────────────────────────────────────────────────────────────────────

describe('NewsService orderBy attention', () => {
  it('lists items by descending attention score when orderBy=attention', async () => {
    const { AttentionChainService } = await import('../../src/integrations/lightrag/attention-chain');
    const client = makeOfflineClient();
    const attentionService = new AttentionChainService(client);
    const service = new NewsService(client, undefined, { attentionService });

    const itemA = await service.publish({ ...CLAIM, claimer: 'alice', claimedFact: 'fact A' });
    const itemB = await service.publish({ ...CLAIM, claimer: 'bob',   claimedFact: 'fact B' });
    const itemC = await service.publish({ ...CLAIM, claimer: 'carol', claimedFact: 'fact C' });

    // Give itemC the highest attention, itemA the lowest
    attentionService.record({ itemId: itemC.id, agent: 'kai', kind: 'anchor' });   // weight 8
    attentionService.record({ itemId: itemB.id, agent: 'kai', kind: 'validate' }); // weight 5
    attentionService.record({ itemId: itemA.id, agent: 'kai', kind: 'view' });     // weight 1

    const byAttention = service.list({ orderBy: 'attention' });
    expect(byAttention.map(i => i.id)).toEqual([itemC.id, itemB.id, itemA.id]);

    await client.close();
  });

  it('falls back to claimTime ordering when no attentionService is wired', async () => {
    const client = makeOfflineClient();
    const service = new NewsService(client); // no attentionService
    const a = await service.publish({ ...CLAIM, claimer: 'a', claimedFact: 'first' });
    const b = await service.publish({ ...CLAIM, claimer: 'b', claimedFact: 'second' });
    // orderBy=attention but no service → falls back to claimTime (newest first)
    const items = service.list({ orderBy: 'attention' });
    expect(items[0].id).toBe(b.id); // newest first (b published after a)
    await client.close();
  });

  it('GET /api/news?orderBy=attention is accepted by the REST route', async () => {
    const { AttentionChainService } = await import('../../src/integrations/lightrag/attention-chain');
    const client = makeOfflineClient();
    const attentionService = new AttentionChainService(client);
    const service = new NewsService(client, undefined, { attentionService });
    const app2 = express();
    app2.use(express.json());
    registerNewsRoutes(app2, service);
    await service.publish({ ...CLAIM, claimedFact: 'hot news', claimer: 'reporter' });
    const { status, body } = await callRoute(app2, 'get', '/api/news?orderBy=attention');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.items).toHaveLength(1);
    await client.close();
  });
});

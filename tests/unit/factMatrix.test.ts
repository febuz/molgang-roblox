/**
 * Fact Matrix (888 888 888-dimension sparse fact space) — unit tests
 *
 * Covers: region partition exactness, deterministic categorical dimensions,
 * the transaction/news/vote encoders (price, volume, notional), sparse
 * algebra, row idempotence, cosine similarity search, the Merkle matrix
 * root, and the REST surface.
 */

process.env.KAFKA_DISABLED = '1';   // group-events Kafka leg noops in unit tests

import express from 'express';
import * as http from 'http';
import {
  FactMatrixService, registerFactMatrixRoutes,
  REGIONS, AXIS, categoricalDim, regionOf,
  normalizeCoordinates, sparseDot, sparseNorm, cosineSimilarity,
  encodeTransaction, encodeNews, encodeVote, rowHash,
} from '../../src/integrations/lightrag/fact-matrix';
import { GroupEventBus } from '../../src/integrations/lightrag/group-events';
import { MAX_DIMENSIONS, MAX_SPARSE_ENTRIES } from '../../src/integrations/lightrag/news';

describe('dimension regions', () => {
  it('regions tile the 888 888 888 space exactly, in order, without overlap', () => {
    expect(MAX_DIMENSIONS).toBe(888_888_888);
    expect(REGIONS.semantic.start).toBe(0);
    expect(REGIONS.transaction.start).toBe(REGIONS.semantic.start + REGIONS.semantic.size);
    expect(REGIONS.news.start).toBe(REGIONS.transaction.start + REGIONS.transaction.size);
    expect(REGIONS.vote.start).toBe(REGIONS.news.start + REGIONS.news.size);
    expect(REGIONS.vote.start + REGIONS.vote.size).toBe(MAX_DIMENSIONS);
  });

  it('regionOf classifies dimensions correctly at the boundaries', () => {
    expect(regionOf(0)).toBe('semantic');
    expect(regionOf(REGIONS.transaction.start - 1)).toBe('semantic');
    expect(regionOf(REGIONS.transaction.start)).toBe('transaction');
    expect(regionOf(REGIONS.news.start)).toBe('news');
    expect(regionOf(REGIONS.vote.start)).toBe('vote');
    expect(regionOf(MAX_DIMENSIONS - 1)).toBe('vote');
    expect(regionOf(MAX_DIMENSIONS)).toBeNull();
    expect(regionOf(-1)).toBeNull();
    expect(regionOf(1.5)).toBeNull();
  });

  it('categoricalDim is deterministic and stays inside its region', () => {
    const d1 = categoricalDim('transaction', 'asset:VPC/EUR');
    const d2 = categoricalDim('transaction', 'asset:VPC/EUR');
    expect(d1).toBe(d2);
    expect(regionOf(d1)).toBe('transaction');

    const dn = categoricalDim('news', 'claimer:did:vpc:abc');
    expect(regionOf(dn)).toBe('news');
    const dv = categoricalDim('vote', 'voter:did:vpc:abc');
    expect(regionOf(dv)).toBe('vote');
  });

  it('different keys land on different dimensions (no trivial collisions)', () => {
    const dims = new Set<number>();
    for (let i = 0; i < 1000; i++) dims.add(categoricalDim('vote', `voter:did:vpc:${i}`));
    expect(dims.size).toBe(1000);
  });

  it('reserved numeric axes are the first indexes of their regions', () => {
    expect(AXIS.TX_PRICE).toBe(REGIONS.transaction.start);
    expect(AXIS.TX_VOLUME).toBe(REGIONS.transaction.start + 1);
    expect(AXIS.TX_NOTIONAL).toBe(REGIONS.transaction.start + 2);
    expect(AXIS.VOTE_WEIGHT).toBe(REGIONS.vote.start);
  });
});

describe('normalizeCoordinates', () => {
  it('sorts by dim, drops zeros, dedupes (last write wins)', () => {
    const out = normalizeCoordinates([
      { dim: 10, value: 1 },
      { dim: 5, value: 2 },
      { dim: 10, value: 3 },     // overwrites dim 10
      { dim: 7, value: 0 },      // dropped
    ]);
    expect(out).toEqual([{ dim: 5, value: 2 }, { dim: 10, value: 3 }]);
  });

  it('rejects out-of-range and non-finite values', () => {
    expect(() => normalizeCoordinates([{ dim: MAX_DIMENSIONS, value: 1 }])).toThrow(/outside/);
    expect(() => normalizeCoordinates([{ dim: -1, value: 1 }])).toThrow(/outside/);
    expect(() => normalizeCoordinates([{ dim: 1.5, value: 1 }])).toThrow(/outside/);
    expect(() => normalizeCoordinates([{ dim: 0, value: Infinity }])).toThrow(/finite/);
    expect(() => normalizeCoordinates([{ dim: 0, value: NaN }])).toThrow(/finite/);
  });

  it('enforces the sparse-entry cap', () => {
    const coords = Array.from({ length: MAX_SPARSE_ENTRIES + 1 }, (_, i) => ({ dim: i, value: 1 }));
    expect(() => normalizeCoordinates(coords)).toThrow(/entries/);
  });
});

describe('sparse algebra', () => {
  it('dot product over the merge walk', () => {
    const a = [{ dim: 1, value: 2 }, { dim: 3, value: 4 }];
    const b = [{ dim: 1, value: 5 }, { dim: 2, value: 9 }, { dim: 3, value: 1 }];
    expect(sparseDot(a, b)).toBe(2 * 5 + 4 * 1);
  });

  it('norm and cosine', () => {
    const a = [{ dim: 0, value: 3 }, { dim: 1, value: 4 }];
    expect(sparseNorm(a)).toBe(5);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1);
    expect(cosineSimilarity(a, [{ dim: 9, value: 1 }])).toBe(0);   // orthogonal
    expect(cosineSimilarity(a, [])).toBe(0);                        // empty
  });
});

describe('encoders', () => {
  it('encodeTransaction carries price, volume, notional on reserved axes', () => {
    const coords = encodeTransaction({ txId: 't1', asset: 'VPC/EUR', price: 2.5, volume: 100 });
    const byDim = new Map(coords.map(c => [c.dim, c.value]));
    expect(byDim.get(AXIS.TX_PRICE)).toBe(2.5);
    expect(byDim.get(AXIS.TX_VOLUME)).toBe(100);
    expect(byDim.get(AXIS.TX_NOTIONAL)).toBe(250);
    expect(byDim.get(categoricalDim('transaction', 'asset:VPC/EUR'))).toBe(1);
  });

  it('encodeTransaction includes party dims when provided', () => {
    const coords = encodeTransaction({
      txId: 't2', asset: 'VPC/EUR', price: 1, volume: 1,
      from: 'did:vpc:alice', to: 'did:vpc:bob',
    });
    const dims = new Set(coords.map(c => c.dim));
    expect(dims.has(categoricalDim('transaction', 'from:did:vpc:alice'))).toBe(true);
    expect(dims.has(categoricalDim('transaction', 'to:did:vpc:bob'))).toBe(true);
  });

  it('encodeTransaction rejects non-positive price/volume and missing asset', () => {
    expect(() => encodeTransaction({ txId: 't', asset: 'A', price: 0, volume: 1 })).toThrow(/price/);
    expect(() => encodeTransaction({ txId: 't', asset: 'A', price: -1, volume: 1 })).toThrow(/price/);
    expect(() => encodeTransaction({ txId: 't', asset: 'A', price: 1, volume: 0 })).toThrow(/volume/);
    expect(() => encodeTransaction({ txId: 't', asset: 'A', price: NaN, volume: 1 })).toThrow(/price/);
    expect(() => encodeTransaction({ txId: 't', asset: ' ', price: 1, volume: 1 })).toThrow(/asset/);
  });

  it('encodeNews maps claimer+source into the news region and passes semantic coords through', () => {
    const sem = [{ dim: 42, value: 0.7 }];
    const coords = encodeNews({ newsId: 'n1', claimer: 'did:vpc:alice', source: 'https://x', semanticCoordinates: sem });
    const dims = new Set(coords.map(c => c.dim));
    expect(dims.has(categoricalDim('news', 'claimer:did:vpc:alice'))).toBe(true);
    expect(dims.has(42)).toBe(true);
  });

  it('encodeNews rejects semantic coordinates outside the semantic region', () => {
    expect(() => encodeNews({
      newsId: 'n2', claimer: 'c', source: 's',
      semanticCoordinates: [{ dim: REGIONS.vote.start, value: 1 }],
    })).toThrow(/semantic region/);
  });

  it('encodeVote maps proposal/option/voter into the vote region + weight axis', () => {
    const coords = encodeVote({ proposalId: 'p1', voter: 'did:vpc:alice', option: 'yes', weight: 3 });
    const byDim = new Map(coords.map(c => [c.dim, c.value]));
    expect(byDim.get(AXIS.VOTE_WEIGHT)).toBe(3);
    expect(byDim.get(categoricalDim('vote', 'proposal:p1'))).toBe(1);
    expect(byDim.get(categoricalDim('vote', 'option:p1:yes'))).toBe(1);
    expect(byDim.get(categoricalDim('vote', 'voter:did:vpc:alice'))).toBe(1);
  });

  it('encodeVote rejects negative weight', () => {
    expect(() => encodeVote({ proposalId: 'p', voter: 'v', option: 'o', weight: -1 })).toThrow(/weight/);
  });
});

describe('FactMatrixService', () => {
  let svc: FactMatrixService;
  let bus: GroupEventBus;

  beforeEach(() => {
    bus = new GroupEventBus(null);
    svc = new FactMatrixService(bus);
  });

  it('ingests a transaction and exposes the row', () => {
    const row = svc.ingestTransaction({ txId: 'tx-1', asset: 'VPC/EUR', price: 10, volume: 5 });
    expect(row.kind).toBe('transaction');
    expect(row.refId).toBe('tx-1');
    expect(row.rowHash).toMatch(/^[0-9a-f]{64}$/);
    expect(svc.getRow(row.id)?.id).toBe(row.id);
    expect(svc.getRowByRef('transaction', 'tx-1')?.id).toBe(row.id);
  });

  it('ingest is idempotent per (kind, refId)', () => {
    const a = svc.ingestTransaction({ txId: 'tx-dup', asset: 'A', price: 1, volume: 1 });
    const b = svc.ingestTransaction({ txId: 'tx-dup', asset: 'A', price: 99, volume: 99 });
    expect(b.id).toBe(a.id);
    expect(svc.getStats().rows).toBe(1);
  });

  it('rowHash commits to kind, refId and coordinates', () => {
    const coords = encodeVote({ proposalId: 'p', voter: 'v', option: 'o', weight: 1 });
    expect(rowHash('vote', 'p:v', coords)).not.toBe(rowHash('vote', 'p:w', coords));
    expect(rowHash('vote', 'p:v', coords)).not.toBe(rowHash('news', 'p:v', coords));
  });

  it('emits a matrix.fact.ingested event per new row', () => {
    svc.ingestNews({ newsId: 'n1', claimer: 'c', source: 's' });
    svc.ingestVote({ proposalId: 'p', voter: 'v', option: 'o', weight: 1 });
    expect(bus.stats.emitted).toBe(2);
  });

  it('similar() finds the nearest transaction by price/volume profile', () => {
    const base = svc.ingestTransaction({ txId: 'base', asset: 'VPC/EUR', price: 100, volume: 10 });
    svc.ingestTransaction({ txId: 'near', asset: 'VPC/EUR', price: 101, volume: 10 });
    svc.ingestTransaction({ txId: 'far', asset: 'OTHER/USD', price: 0.01, volume: 1_000_000 });

    const neighbours = svc.similar(base.id, 2);
    expect(neighbours[0].row.refId).toBe('near');
    expect(neighbours[0].similarity).toBeGreaterThan(neighbours[1].similarity);
  });

  it('similar() respects kind isolation by default', () => {
    const t = svc.ingestTransaction({ txId: 't', asset: 'A', price: 1, volume: 1 });
    svc.ingestNews({ newsId: 'n', claimer: 'c', source: 's' });
    const neighbours = svc.similar(t.id, 10);
    expect(neighbours.every(n => n.row.kind === 'transaction')).toBe(true);
  });

  it('matrixRoot changes when a row is added and is insertion-order independent', () => {
    const r0 = svc.matrixRoot();
    svc.ingestVote({ proposalId: 'p', voter: 'v1', option: 'a', weight: 1 });
    const r1 = svc.matrixRoot();
    expect(r1).not.toBe(r0);

    // A second service ingesting the same facts in another order → same root
    const svc2 = new FactMatrixService();
    svc.ingestVote({ proposalId: 'p', voter: 'v2', option: 'b', weight: 1 });
    svc2.ingestVote({ proposalId: 'p', voter: 'v2', option: 'b', weight: 1 });
    svc2.ingestVote({ proposalId: 'p', voter: 'v1', option: 'a', weight: 1 });
    expect(svc2.matrixRoot()).toBe(svc.matrixRoot());
  });

  it('getStats reports kinds, nnz, dimension count and regions', () => {
    svc.ingestTransaction({ txId: 't', asset: 'A', price: 1, volume: 2 });
    svc.ingestNews({ newsId: 'n', claimer: 'c', source: 's' });
    const stats = svc.getStats();
    expect(stats.rows).toBe(2);
    expect(stats.byKind.transaction).toBe(1);
    expect(stats.byKind.news).toBe(1);
    expect(stats.byKind.vote).toBe(0);
    expect(stats.dimensions).toBe(888_888_888);
    expect(stats.nonZeroEntries).toBeGreaterThan(0);
    expect(stats.regions).toHaveLength(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REST
// ─────────────────────────────────────────────────────────────────────────────

describe('Fact matrix HTTP API', () => {
  let server: http.Server;
  let base: string;

  beforeAll(done => {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    registerFactMatrixRoutes(app, new FactMatrixService());
    server = http.createServer(app);
    server.listen(0, () => {
      base = `http://127.0.0.1:${(server.address() as any).port}`;
      done();
    });
  });
  afterAll(done => { server.close(() => done()); });

  function call(method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const reqBody = body ? JSON.stringify(body) : '';
      const req = http.request(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) },
      }, res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => resolve({ status: res.statusCode!, body: data ? JSON.parse(data) : {} }));
      });
      req.on('error', reject);
      if (reqBody) req.write(reqBody);
      req.end();
    });
  }

  it('full journey: ingest tx + news + vote → stats → rows → similar', async () => {
    const tx = await call('POST', '/api/matrix/transactions', { txId: 'h-tx1', asset: 'VPC/EUR', price: 5, volume: 20 });
    expect(tx.status).toBe(201);
    expect(tx.body.row.kind).toBe('transaction');

    const tx2 = await call('POST', '/api/matrix/transactions', { txId: 'h-tx2', asset: 'VPC/EUR', price: 5.1, volume: 19 });
    expect(tx2.status).toBe(201);

    const news = await call('POST', '/api/matrix/news', { newsId: 'h-n1', claimer: 'did:vpc:x', source: 's' });
    expect(news.status).toBe(201);

    const vote = await call('POST', '/api/matrix/votes', { proposalId: 'h-p1', voter: 'did:vpc:x', option: 'yes', weight: 2 });
    expect(vote.status).toBe(201);

    const stats = await call('GET', '/api/matrix/stats');
    expect(stats.body.rows).toBe(4);
    expect(stats.body.matrixRoot).toMatch(/^[0-9a-f]{64}$/);

    const rows = await call('GET', '/api/matrix/rows?kind=transaction');
    expect(rows.body.count).toBe(2);

    const single = await call('GET', `/api/matrix/rows/${tx.body.row.id}`);
    expect(single.status).toBe(200);

    const similar = await call('GET', `/api/matrix/similar/${tx.body.row.id}?k=5`);
    expect(similar.status).toBe(200);
    expect(similar.body.neighbours[0].refId).toBe('h-tx2');
  });

  it('rejects bad ingests with 422', async () => {
    expect((await call('POST', '/api/matrix/transactions', { asset: 'A' })).status).toBe(422);
    expect((await call('POST', '/api/matrix/transactions', { txId: 't', asset: 'A', price: -1, volume: 1 })).status).toBe(422);
    expect((await call('POST', '/api/matrix/news', { claimer: 'c' })).status).toBe(422);
    expect((await call('POST', '/api/matrix/votes', { proposalId: 'p' })).status).toBe(422);
    expect((await call('GET', '/api/matrix/rows?kind=bogus')).status).toBe(422);
  });

  it('404 on unknown row and similar target', async () => {
    expect((await call('GET', '/api/matrix/rows/nope')).status).toBe(404);
    expect((await call('GET', '/api/matrix/similar/nope')).status).toBe(404);
  });
});

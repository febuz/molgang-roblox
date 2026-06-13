/**
 * Unit tests for graph-snapshot.ts
 * All tests are offline — no Neo4j, Kafka, or network required.
 */

import {
  serializeSnapshot,
  deserializeSnapshot,
  snapshotStatus,
  restoreSnapshot,
  registerSnapshotRoutes,
  SnapshotData,
} from '../../src/integrations/lightrag/graph-snapshot';
import { LightRAGClient } from '../../src/integrations/lightrag/client';
import express from 'express';
import http from 'http';

// ──────────────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────────────

function makeSnapshot(nodeCount = 3, edgeCount = 2): SnapshotData {
  const { createHash } = require('crypto');
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `node-${i}`,
    labels: ['Decision'],
    props: { content: `Decision content ${i}`, created_by: 'test' },
  }));
  const edges = Array.from({ length: edgeCount }, (_, i) => ({
    fromId: `node-${i}`,
    relType: 'DEPENDS_ON',
    toId: `node-${i + 1}`,
    props: {},
  }));
  const payload = JSON.stringify({ nodes, edges });
  const checksum = createHash('sha256').update(payload).digest('hex');
  return { version: '1', takenAt: new Date().toISOString(), nodeCount, edgeCount, checksum, nodes, edges };
}

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

// Minimal HTTP test helper
async function callRoute(
  app: express.Express,
  method: 'get' | 'post',
  path: string,
  body?: any,
): Promise<{ status: number; body: any; headers: Record<string, string | string[]> }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const url = `http://127.0.0.1:${port}${path}`;
      const reqBody = body ? JSON.stringify(body) : '';
      const options: http.RequestOptions = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(reqBody),
        },
      };
      const req = http.request(url, options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          server.close();
          const raw = Buffer.concat(chunks);
          let parsed: any;
          try { parsed = JSON.parse(raw.toString('utf-8')); }
          catch { parsed = raw; }
          resolve({ status: res.statusCode ?? 200, body: parsed, headers: res.headers as any });
        });
      });
      req.on('error', (e) => { server.close(); reject(e); });
      if (reqBody) req.write(reqBody);
      req.end();
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// serializeSnapshot / deserializeSnapshot
// ──────────────────────────────────────────────────────────────────────────────

describe('serializeSnapshot / deserializeSnapshot', () => {
  it('round-trips a snapshot without data loss', () => {
    const snap = makeSnapshot(5, 3);
    const buf = serializeSnapshot(snap);
    const restored = deserializeSnapshot(buf);
    expect(restored.nodeCount).toBe(5);
    expect(restored.edgeCount).toBe(3);
    expect(restored.nodes).toHaveLength(5);
    expect(restored.edges).toHaveLength(3);
    expect(restored.checksum).toBe(snap.checksum);
  });

  it('serialized buffer is smaller than raw JSON for medium-sized snapshots', () => {
    const snap = makeSnapshot(50, 40);
    const buf = serializeSnapshot(snap);
    const raw = Buffer.from(JSON.stringify(snap), 'utf-8');
    expect(buf.length).toBeLessThan(raw.length);
  });

  it('deserializeSnapshot throws for unknown version', () => {
    const snap = makeSnapshot(1, 0);
    (snap as any).version = '99';
    // Must re-serialize because checksum doesn't cover version
    const buf = require('zlib').gzipSync(Buffer.from(JSON.stringify(snap)));
    expect(() => deserializeSnapshot(buf)).toThrow('Unknown snapshot version');
  });

  it('serialized result is a Buffer', () => {
    const buf = serializeSnapshot(makeSnapshot());
    expect(Buffer.isBuffer(buf)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// snapshotStatus
// ──────────────────────────────────────────────────────────────────────────────

describe('snapshotStatus', () => {
  it('returns zero counts for null snapshot', () => {
    const status = snapshotStatus(null);
    expect(status.nodeCount).toBe(0);
    expect(status.edgeCount).toBe(0);
    expect(status.takenAt).toBeNull();
    expect(status.checksum).toBeNull();
  });

  it('returns correct metadata from a snapshot', () => {
    const snap = makeSnapshot(7, 4);
    const status = snapshotStatus(snap);
    expect(status.nodeCount).toBe(7);
    expect(status.edgeCount).toBe(4);
    expect(status.checksum).toBe(snap.checksum);
    expect(status.takenAt).toBe(snap.takenAt);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// restoreSnapshot — offline
// ──────────────────────────────────────────────────────────────────────────────

describe('restoreSnapshot — offline', () => {
  it('throws when client is not connected', async () => {
    const client = makeOfflineClient();
    await expect(restoreSnapshot(client, makeSnapshot())).rejects.toThrow('offline');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// restoreSnapshot — with mocked client
// ──────────────────────────────────────────────────────────────────────────────

describe('restoreSnapshot — mocked client', () => {
  function makeConnectedClient(): LightRAGClient {
    const client = makeOfflineClient();
    (client as any).connected = true;
    (client as any).mergeTypedNode = jest.fn().mockResolvedValue(undefined);
    (client as any).addEdge = jest.fn().mockResolvedValue(undefined);
    return client;
  }

  it('calls mergeTypedNode for each node in snapshot', async () => {
    const snap = makeSnapshot(4, 2);
    const client = makeConnectedClient();
    await restoreSnapshot(client, snap);
    expect((client as any).mergeTypedNode).toHaveBeenCalledTimes(4);
  });

  it('calls addEdge for each edge in snapshot', async () => {
    const snap = makeSnapshot(3, 2);
    const client = makeConnectedClient();
    await restoreSnapshot(client, snap);
    expect((client as any).addEdge).toHaveBeenCalledTimes(2);
  });

  it('returns correct nodesWritten and edgesWritten counts', async () => {
    const snap = makeSnapshot(3, 2);
    const client = makeConnectedClient();
    const result = await restoreSnapshot(client, snap);
    expect(result.nodesWritten).toBe(3);
    expect(result.edgesWritten).toBe(2);
  });

  it('throws on checksum mismatch', async () => {
    const snap = makeSnapshot(3, 2);
    snap.checksum = 'badhash';
    const client = makeConnectedClient();
    await expect(restoreSnapshot(client, snap)).rejects.toThrow('checksum mismatch');
  });

  it('tolerates individual node merge failures', async () => {
    const snap = makeSnapshot(3, 0);
    const client = makeConnectedClient();
    let call = 0;
    (client as any).mergeTypedNode = jest.fn().mockImplementation(() => {
      call++;
      if (call === 2) throw new Error('Neo4j error');
      return Promise.resolve();
    });
    const result = await restoreSnapshot(client, snap);
    // 2 succeeded, 1 failed — nodesWritten should reflect successes
    expect(result.nodesWritten).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST routes — offline behaviour
// ──────────────────────────────────────────────────────────────────────────────

describe('Snapshot REST API — offline mode', () => {
  let app: express.Express;
  let client: LightRAGClient;

  beforeEach(() => {
    client = makeOfflineClient();
    app = express();
    app.use(express.json());
    registerSnapshotRoutes(app, client);
  });

  afterEach(async () => { await client.close(); });

  it('GET /api/graph/snapshot returns offline flag', async () => {
    const { body } = await callRoute(app, 'get', '/api/graph/snapshot');
    expect(body.offline).toBe(true);
    expect(body.nodeCount).toBe(0);
  });

  it('POST /api/graph/snapshot/restore returns 503 when offline', async () => {
    const { status } = await callRoute(app, 'post', '/api/graph/snapshot/restore', makeSnapshot());
    expect(status).toBe(503);
  });

  it('GET /api/graph/snapshot/status returns offline flag and zero counts', async () => {
    const { body } = await callRoute(app, 'get', '/api/graph/snapshot/status');
    expect(body.offline).toBe(true);
    expect(body.nodeCount).toBe(0);
  });
});

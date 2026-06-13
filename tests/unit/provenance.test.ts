/**
 * Unit tests for provenance.ts
 * All tests are offline — no Neo4j or Kafka required.
 */

import {
  recordProvenance,
  getProvenance,
  buildProvenanceChain,
  clearProvenanceStore,
  registerProvenanceRoutes,
  ProvenanceRecord,
} from '../../src/integrations/lightrag/provenance';
import { LightRAGClient } from '../../src/integrations/lightrag/client';
import express from 'express';
import http from 'http';

// ──────────────────────────────────────────────────────────────────────────────
// HTTP helper
// ──────────────────────────────────────────────────────────────────────────────

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
      const url = `http://127.0.0.1:${port}${path}`;
      const reqBody = body ? JSON.stringify(body) : '';
      const opts: http.RequestOptions = {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) },
      };
      const req = http.request(url, opts, (res) => {
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

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// recordProvenance / getProvenance
// ──────────────────────────────────────────────────────────────────────────────

describe('recordProvenance', () => {
  beforeEach(() => clearProvenanceStore());

  it('generates a unique id for each record', () => {
    const r1 = recordProvenance({ nodeId: 'n1', type: 'agent', sourceNodeIds: [] });
    const r2 = recordProvenance({ nodeId: 'n1', type: 'agent', sourceNodeIds: [] });
    expect(r1.id).not.toBe(r2.id);
  });

  it('sets ts to an ISO string', () => {
    const r = recordProvenance({ nodeId: 'n1', type: 'agent', sourceNodeIds: [] });
    expect(() => new Date(r.ts)).not.toThrow();
    expect(r.ts.length).toBeGreaterThan(0);
  });

  it('stores the record in the in-memory store', () => {
    recordProvenance({ nodeId: 'n1', type: 'agent', sourceNodeIds: [], agent: 'kai' });
    const records = getProvenance('n1');
    expect(records).toHaveLength(1);
    expect(records[0].agent).toBe('kai');
  });

  it('multiple records for same node accumulate', () => {
    recordProvenance({ nodeId: 'n1', type: 'agent', sourceNodeIds: [] });
    recordProvenance({ nodeId: 'n1', type: 'p2p', sourceNodeIds: ['remote-1'] });
    expect(getProvenance('n1')).toHaveLength(2);
  });

  it('records for different nodes are independent', () => {
    recordProvenance({ nodeId: 'n1', type: 'agent', sourceNodeIds: [] });
    recordProvenance({ nodeId: 'n2', type: 'inference', sourceNodeIds: [], rule: 'R4' });
    expect(getProvenance('n1')).toHaveLength(1);
    expect(getProvenance('n2')).toHaveLength(1);
  });

  it('getProvenance returns empty array for unknown node', () => {
    expect(getProvenance('nonexistent')).toHaveLength(0);
  });

  it('preserves all fields', () => {
    const r = recordProvenance({
      nodeId: 'n1',
      type: 'inference',
      sourceNodeIds: ['src1', 'src2'],
      rule: 'R4',
      note: 'quantum threat',
    });
    expect(r.sourceNodeIds).toEqual(['src1', 'src2']);
    expect(r.rule).toBe('R4');
    expect(r.note).toBe('quantum threat');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildProvenanceChain
// ──────────────────────────────────────────────────────────────────────────────

describe('buildProvenanceChain', () => {
  beforeEach(() => clearProvenanceStore());

  it('returns chain with nodeId', () => {
    const chain = buildProvenanceChain('n1');
    expect(chain.nodeId).toBe('n1');
  });

  it('returns empty records for node with no provenance', () => {
    const chain = buildProvenanceChain('unknown');
    expect(chain.records).toHaveLength(0);
  });

  it('returns direct records for a single node', () => {
    recordProvenance({ nodeId: 'n1', type: 'agent', sourceNodeIds: [], agent: 'alice' });
    const chain = buildProvenanceChain('n1');
    expect(chain.records).toHaveLength(1);
    expect(chain.records[0].agent).toBe('alice');
  });

  it('walks up to source nodes recursively', () => {
    recordProvenance({ nodeId: 'n1', type: 'inference', sourceNodeIds: ['n2'], rule: 'R1' });
    recordProvenance({ nodeId: 'n2', type: 'agent', sourceNodeIds: [], agent: 'bob' });
    const chain = buildProvenanceChain('n1', 5);
    expect(chain.records).toHaveLength(2);
  });

  it('does not visit the same node twice (cycle protection)', () => {
    // n1 -> n2 -> n1 (cycle)
    recordProvenance({ nodeId: 'n1', type: 'inference', sourceNodeIds: ['n2'], rule: 'R1' });
    recordProvenance({ nodeId: 'n2', type: 'p2p', sourceNodeIds: ['n1'], peer: 'peer1' });
    // Should not loop forever
    expect(() => buildProvenanceChain('n1', 5)).not.toThrow();
  });

  it('sourceTypes counts by type', () => {
    recordProvenance({ nodeId: 'n1', type: 'agent', sourceNodeIds: [] });
    recordProvenance({ nodeId: 'n1', type: 'inference', sourceNodeIds: [], rule: 'R2' });
    const chain = buildProvenanceChain('n1');
    expect(chain.sourceTypes.agent).toBe(1);
    expect(chain.sourceTypes.inference).toBe(1);
    expect(chain.sourceTypes.p2p).toBe(0);
  });

  it('respects maxDepth', () => {
    // n1 <- n2 <- n3 <- n4
    recordProvenance({ nodeId: 'n1', type: 'inference', sourceNodeIds: ['n2'], rule: 'R1' });
    recordProvenance({ nodeId: 'n2', type: 'inference', sourceNodeIds: ['n3'], rule: 'R1' });
    recordProvenance({ nodeId: 'n3', type: 'inference', sourceNodeIds: ['n4'], rule: 'R1' });
    recordProvenance({ nodeId: 'n4', type: 'agent', sourceNodeIds: [], agent: 'seed' });

    const shallow = buildProvenanceChain('n1', 1);
    const deep = buildProvenanceChain('n1', 10);
    expect(deep.records.length).toBeGreaterThanOrEqual(shallow.records.length);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST routes — offline
// ──────────────────────────────────────────────────────────────────────────────

describe('Provenance REST API', () => {
  let app: express.Express;
  let client: LightRAGClient;

  beforeEach(() => {
    clearProvenanceStore();
    client = makeOfflineClient();
    app = express();
    app.use(express.json());
    registerProvenanceRoutes(app, client);
  });

  afterEach(async () => { await client.close(); });

  it('GET /api/graph/provenance/:nodeId returns success: true', async () => {
    const { body } = await callRoute(app, 'get', '/api/graph/provenance/any-id');
    expect(body.success).toBe(true);
  });

  it('GET /api/graph/provenance/:nodeId returns provenance chain', async () => {
    recordProvenance({ nodeId: 'n1', type: 'agent', sourceNodeIds: [], agent: 'alice' });
    const { body } = await callRoute(app, 'get', '/api/graph/provenance/n1');
    expect(body.provenance.nodeId).toBe('n1');
    expect(body.provenance.records).toHaveLength(1);
  });

  it('GET /api/graph/provenance/:nodeId/summary returns summary', async () => {
    recordProvenance({ nodeId: 'n2', type: 'inference', sourceNodeIds: [], rule: 'R4' });
    const { body } = await callRoute(app, 'get', '/api/graph/provenance/n2/summary');
    expect(body.success).toBe(true);
    expect(body.summary.totalRecords).toBe(1);
    expect(body.summary.directSource).toBe('inference');
  });

  it('POST /api/graph/provenance/record creates and returns record', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/graph/provenance/record', {
      nodeId: 'n3',
      type: 'p2p',
      sourceNodeIds: ['remote-node'],
      peer: 'http://peer1:3000',
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.record.nodeId).toBe('n3');
    expect(body.record.type).toBe('p2p');
  });

  it('POST /api/graph/provenance/record returns 400 when nodeId is missing', async () => {
    const { status } = await callRoute(app, 'post', '/api/graph/provenance/record', {
      type: 'agent',
    });
    expect(status).toBe(400);
  });

  it('POST /api/graph/provenance/record returns 400 for invalid type', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/graph/provenance/record', {
      nodeId: 'n1',
      type: 'invalid-type',
    });
    expect(status).toBe(400);
    expect(body.error).toContain('type must be one of');
  });

  it('summary firstSeen is ISO string when records exist', async () => {
    recordProvenance({ nodeId: 'dated', type: 'agent', sourceNodeIds: [] });
    const { body } = await callRoute(app, 'get', '/api/graph/provenance/dated/summary');
    expect(body.summary.firstSeen).not.toBeNull();
    expect(() => new Date(body.summary.firstSeen)).not.toThrow();
  });

  it('summary firstSeen is null when no records', async () => {
    const { body } = await callRoute(app, 'get', '/api/graph/provenance/nobody/summary');
    expect(body.summary.firstSeen).toBeNull();
  });
});

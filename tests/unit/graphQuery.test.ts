/**
 * Unit tests for graph-query.ts
 * Tests the Cypher builder, fluent API, REST routes, and offline behaviour.
 */

import {
  buildQuery,
  GraphQueryBuilder,
  executeGraphQuery,
  registerQueryRoutes,
  GraphQuery,
} from '../../src/integrations/lightrag/graph-query';
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
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(reqBody),
        },
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
// GraphQueryBuilder — fluent API
// ──────────────────────────────────────────────────────────────────────────────

describe('GraphQueryBuilder — fluent API', () => {
  let client: LightRAGClient;

  beforeEach(() => { client = makeOfflineClient(); });
  afterEach(async () => { await client.close(); });

  it('buildQuery returns a GraphQueryBuilder', () => {
    expect(buildQuery(client)).toBeInstanceOf(GraphQueryBuilder);
  });

  it('type() sets types', () => {
    const q = buildQuery(client).type('decision', 'risk').toQuery();
    expect(q.types).toEqual(['decision', 'risk']);
  });

  it('createdBy() sets createdBy', () => {
    const q = buildQuery(client).createdBy('kai').toQuery();
    expect(q.createdBy).toBe('kai');
  });

  it('since() and until() set date range', () => {
    const q = buildQuery(client).since('2026-01-01').until('2026-12-31').toQuery();
    expect(q.since).toBe('2026-01-01');
    expect(q.until).toBe('2026-12-31');
  });

  it('affectsAny() sets tag filter', () => {
    const q = buildQuery(client).affectsAny(['kafka', 'distributed']).toQuery();
    expect(q.affectsAny).toEqual(['kafka', 'distributed']);
  });

  it('affectsAll() sets all-match tag filter', () => {
    const q = buildQuery(client).affectsAll(['kafka', 'distributed']).toQuery();
    expect(q.affectsAll).toEqual(['kafka', 'distributed']);
  });

  it('contains() sets contentContains', () => {
    const q = buildQuery(client).contains('Shor algorithm').toQuery();
    expect(q.contentContains).toBe('Shor algorithm');
  });

  it('ids() sets id list', () => {
    const q = buildQuery(client).ids(['a', 'b', 'c']).toQuery();
    expect(q.ids).toEqual(['a', 'b', 'c']);
  });

  it('validationState() sets state filter', () => {
    const q = buildQuery(client).validationState('confirmed').toQuery();
    expect(q.validationState).toBe('confirmed');
  });

  it('impactLevel() sets impact filter', () => {
    const q = buildQuery(client).impactLevel('critical').toQuery();
    expect(q.impactLevel).toBe('critical');
  });

  it('orderBy() sets sort', () => {
    const q = buildQuery(client).orderBy('content', 'asc').toQuery();
    expect(q.orderBy).toBe('content');
    expect(q.sortDir).toBe('asc');
  });

  it('limit() and skip() set pagination', () => {
    const q = buildQuery(client).limit(25).skip(50).toQuery();
    expect(q.limit).toBe(25);
    expect(q.skip).toBe(50);
  });

  it('withEdges() sets includeEdges', () => {
    const q = buildQuery(client).withEdges().toQuery();
    expect(q.includeEdges).toBe(true);
  });

  it('relatedTo() sets traversal filter', () => {
    const q = buildQuery(client).relatedTo('target-id', 'AFFECTS', 'outgoing').toQuery();
    expect(q.relatedTo?.targetId).toBe('target-id');
    expect(q.relatedTo?.relType).toBe('AFFECTS');
    expect(q.relatedTo?.direction).toBe('outgoing');
  });

  it('chaining multiple filters works', () => {
    const q = buildQuery(client)
      .type('decision')
      .createdBy('alice')
      .since('2026-06-01')
      .affectsAny(['kafka'])
      .limit(10)
      .toQuery();
    expect(q.types).toEqual(['decision']);
    expect(q.createdBy).toBe('alice');
    expect(q.limit).toBe(10);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// executeGraphQuery — offline
// ──────────────────────────────────────────────────────────────────────────────

describe('executeGraphQuery — offline', () => {
  let client: LightRAGClient;

  beforeEach(() => { client = makeOfflineClient(); });
  afterEach(async () => { await client.close(); });

  it('returns offline: true when client is not connected', async () => {
    const result = await executeGraphQuery(client, {});
    expect(result.offline).toBe(true);
  });

  it('returns empty nodes when offline', async () => {
    const result = await executeGraphQuery(client, { types: ['decision'] });
    expect(result.nodes).toHaveLength(0);
  });

  it('returns total: 0 when offline', async () => {
    const result = await executeGraphQuery(client, {});
    expect(result.total).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// executeGraphQuery — mocked client
// ──────────────────────────────────────────────────────────────────────────────

describe('executeGraphQuery — mocked client', () => {
  function makeConnectedClient(rows: any[]): LightRAGClient {
    const client = makeOfflineClient();
    (client as any).connected = true;
    (client as any).driver = {
      close: jest.fn().mockResolvedValue(undefined),
      session: jest.fn(() => ({
        run: jest.fn().mockResolvedValue({
          records: rows.map(props => ({
            get: (key: string) => key === 'n' ? {
              properties: props,
              labels: [props.type ? props.type.charAt(0).toUpperCase() + props.type.slice(1) : 'Node'],
              identity: { toString: () => props.id },
            } : null,
          })),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      })),
    };
    return client;
  }

  it('returns nodes from Neo4j response', async () => {
    const client = makeConnectedClient([
      { id: 'd1', type: 'decision', content: 'Use Kafka', created_by: 'kai', created_at: '2026-01-01', affects: ['kafka'] },
    ]);
    const result = await executeGraphQuery(client, { types: ['decision'] });
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].id).toBe('d1');
    expect(result.nodes[0].content).toBe('Use Kafka');
    await client.close();
  });

  it('returns offline: false when connected', async () => {
    const client = makeConnectedClient([]);
    const result = await executeGraphQuery(client, {});
    expect(result.offline).toBe(false);
    await client.close();
  });

  it('total equals nodes returned', async () => {
    const client = makeConnectedClient([
      { id: 'a', type: 'decision', content: 'X', created_by: 'alice', created_at: '', affects: [] },
      { id: 'b', type: 'decision', content: 'Y', created_by: 'bob', created_at: '', affects: [] },
    ]);
    const result = await executeGraphQuery(client, {});
    expect(result.total).toBe(2);
    await client.close();
  });

  it('queryMs is non-negative', async () => {
    const client = makeConnectedClient([]);
    const result = await executeGraphQuery(client, {});
    expect(result.queryMs).toBeGreaterThanOrEqual(0);
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

describe('Graph Query REST API — offline', () => {
  let app: express.Express;
  let client: LightRAGClient;

  beforeEach(() => {
    client = makeOfflineClient();
    app = express();
    app.use(express.json());
    registerQueryRoutes(app, client);
  });

  afterEach(async () => { await client.close(); });

  it('POST /api/graph/query returns success: true offline', async () => {
    const { body } = await callRoute(app, 'post', '/api/graph/query', { types: ['decision'] });
    expect(body.success).toBe(true);
  });

  it('POST /api/graph/query returns offline: true', async () => {
    const { body } = await callRoute(app, 'post', '/api/graph/query', {});
    expect(body.offline).toBe(true);
    expect(body.nodes).toHaveLength(0);
  });

  it('POST /api/graph/query returns 400 for non-object body', async () => {
    const { status } = await callRoute(app, 'post', '/api/graph/query', [1, 2, 3]);
    expect(status).toBe(400);
  });

  it('GET /api/graph/query/builder returns field descriptions', async () => {
    const { body } = await callRoute(app, 'get', '/api/graph/query/builder');
    expect(body.fields).toBeDefined();
    expect(body.fields.types).toBeDefined();
    expect(body.fields.createdBy).toBeDefined();
    expect(body.example).toBeDefined();
  });
});

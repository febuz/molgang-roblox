/**
 * Unit tests for graph-api.ts helper functions and offline behaviour.
 * Uses Express supertest-style inline routing — no Neo4j needed.
 */

import express from 'express';
import { registerGraphRoutes } from '../../src/integrations/lightrag/graph-api';
import { LightRAGClient } from '../../src/integrations/lightrag/client';

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
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  body?: any,
): Promise<{ status: number; body: any }> {
  const http = await import('http');
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const url = `http://127.0.0.1:${port}${path}`;
      const reqBody = body ? JSON.stringify(body) : '';
      const options = {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(reqBody),
        },
      };
      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode ?? 200, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode ?? 200, body: data }); }
        });
      });
      req.on('error', (e) => { server.close(); reject(e); });
      if (reqBody) req.write(reqBody);
      req.end();
    });
  });
}

describe('Graph API — offline mode', () => {
  let app: express.Express;
  let client: LightRAGClient;

  beforeEach(() => {
    client = makeOfflineClient();
    app = express();
    app.use(express.json());
    registerGraphRoutes(app, client);
  });

  afterEach(async () => {
    await client.close();
  });

  it('GET /api/graph/stats returns offline flag when not connected', async () => {
    const { status, body } = await callRoute(app, 'get', '/api/graph/stats');
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.offline).toBe(true);
  });

  it('GET /api/graph/nodes returns empty when offline', async () => {
    const { status, body } = await callRoute(app, 'get', '/api/graph/nodes');
    expect(status).toBe(200);
    expect(body.nodes).toHaveLength(0);
  });

  it('GET /api/graph/nodes/:id returns 503 when offline', async () => {
    const { status, body } = await callRoute(app, 'get', '/api/graph/nodes/some-id');
    expect(status).toBe(503);
    expect(body.success).toBe(false);
  });

  it('GET /api/graph/edges returns empty when offline', async () => {
    const { body } = await callRoute(app, 'get', '/api/graph/edges');
    expect(body.edges).toHaveLength(0);
  });

  it('GET /api/graph/neighbors/:id returns empty when offline', async () => {
    const { body } = await callRoute(app, 'get', '/api/graph/neighbors/any-id');
    expect(body.neighbors).toHaveLength(0);
  });

  it('GET /api/graph/visualize returns offline flag', async () => {
    const { body } = await callRoute(app, 'get', '/api/graph/visualize');
    expect(body.offline).toBe(true);
    expect(body.nodes).toHaveLength(0);
    expect(body.edges).toHaveLength(0);
  });

  it('POST /api/graph/nodes returns 400 when label is missing', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/graph/nodes', { content: 'test' });
    expect(status).toBe(400);
    expect(body.error).toContain('label');
  });

  it('POST /api/graph/nodes returns 400 when content is missing', async () => {
    const { status } = await callRoute(app, 'post', '/api/graph/nodes', { label: 'Decision' });
    expect(status).toBe(400);
  });

  it('POST /api/graph/nodes creates node offline and returns id', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/graph/nodes', {
      label: 'Decision',
      content: 'Use Kafka for agent comms',
      created_by: 'kai',
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThan(0);
  });

  it('POST /api/graph/edges returns 400 when fromId is missing', async () => {
    const { status } = await callRoute(app, 'post', '/api/graph/edges', { relType: 'DEPENDS_ON', toId: 'b' });
    expect(status).toBe(400);
  });

  it('POST /api/graph/edges succeeds offline (addEdge is a no-op)', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/graph/edges', {
      fromId: 'a', relType: 'DEPENDS_ON', toId: 'b',
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
  });

  it('PATCH /api/graph/nodes/:id returns 503 when offline', async () => {
    const { status } = await callRoute(app, 'patch', '/api/graph/nodes/any-id', { status: 'archived' });
    expect(status).toBe(503);
  });

  it('DELETE /api/graph/nodes/:id returns 503 when offline', async () => {
    const { status } = await callRoute(app, 'delete', '/api/graph/nodes/any-id');
    expect(status).toBe(503);
  });

  it('GET /api/graph/export returns empty graph when offline', async () => {
    const { body } = await callRoute(app, 'get', '/api/graph/export');
    expect(body.graph.nodes).toHaveLength(0);
    expect(body.graph.edges).toHaveLength(0);
  });
});

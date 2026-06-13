/**
 * Unit tests for p2p-monitor.ts
 * All tests are offline — no Neo4j, Kafka, or network required.
 */

import express from 'express';
import http from 'http';
import { registerMonitorRoutes } from '../../src/integrations/lightrag/p2p-monitor';
import { LightRAGClient } from '../../src/integrations/lightrag/client';

// ──────────────────────────────────────────────────────────────────────────────
// HTTP test helper
// ──────────────────────────────────────────────────────────────────────────────

async function callRoute(app: express.Express, path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode ?? 200, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode ?? 200, body: data }); }
        });
      });
      req.on('error', (e) => { server.close(); reject(e); });
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
// Tests — no components attached
// ──────────────────────────────────────────────────────────────────────────────

describe('P2P Monitor — offline, no components', () => {
  let app: express.Express;
  let client: LightRAGClient;

  beforeEach(() => {
    client = makeOfflineClient();
    app = express();
    registerMonitorRoutes(app, client);
  });

  afterEach(async () => { await client.close(); });

  it('GET /api/lightrag/monitor returns success: true', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.success).toBe(true);
  });

  it('monitor.neo4j.connected is false when offline', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.neo4j.connected).toBe(false);
  });

  it('monitor.neo4j.nodeCount is null when offline', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.neo4j.nodeCount).toBeNull();
  });

  it('overallHealth is "offline" when Neo4j is not connected', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.overallHealth).toBe('offline');
  });

  it('p2pSync is null when not provided', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.p2pSync).toBeNull();
  });

  it('gossip is null when not provided', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.gossip).toBeNull();
  });

  it('factValidator is null when not provided', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.factValidator).toBeNull();
  });

  it('inferenceEngine is null when not provided', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.inferenceEngine).toBeNull();
  });

  it('agentBridge is null when not provided', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.agentBridge).toBeNull();
  });

  it('monitor.ts is a valid ISO string', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(() => new Date(body.monitor.ts)).not.toThrow();
    expect(new Date(body.monitor.ts).getTime()).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tests — mock components attached
// ──────────────────────────────────────────────────────────────────────────────

describe('P2P Monitor — with mock components', () => {
  let app: express.Express;
  let client: LightRAGClient;

  const mockP2PSync = {
    getStats: () => ({
      running: true,
      processed: 42,
      skipped: 3,
      errors: 1,
      lastEventAt: '2026-01-01T00:00:00Z',
      lastEventType: 'decision',
    }),
  } as any;

  const mockGossip = {
    getStats: () => ({
      running: true,
      peersConfigured: 2,
      pushCount: 10,
      pullCount: 8,
      mergeCount: 15,
      errorCount: 0,
      lastGossipAt: '2026-01-01T00:01:00Z',
      lastPeerContacted: 'http://peer1:3000',
    }),
  } as any;

  const mockFactValidator = {
    getStats: () => ({ total: 20, pending: 5, confirmed: 12, contested: 2, rejected: 1 }),
  } as any;

  const mockInferenceEngine = {
    getLastRunAt: () => '2026-01-01T00:30:00Z',
  } as any;

  const mockAgentBridge = {
    getStats: () => ({ tasksCompleted: 100, tasksFailed: 5, proposals: 20, errors: 2 }),
  } as any;

  beforeEach(() => {
    client = makeOfflineClient();
    app = express();
    registerMonitorRoutes(app, client, {
      p2pSync: mockP2PSync,
      gossip: mockGossip,
      factValidator: mockFactValidator,
      inferenceEngine: mockInferenceEngine,
      agentBridge: mockAgentBridge,
    });
  });

  afterEach(async () => { await client.close(); });

  it('p2pSync stats are populated', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.p2pSync.processed).toBe(42);
    expect(body.monitor.p2pSync.running).toBe(true);
    expect(body.monitor.p2pSync.errors).toBe(1);
  });

  it('gossip stats are populated', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.gossip.peersConfigured).toBe(2);
    expect(body.monitor.gossip.mergeCount).toBe(15);
  });

  it('factValidator stats are populated', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.factValidator.total).toBe(20);
    expect(body.monitor.factValidator.confirmed).toBe(12);
  });

  it('inferenceEngine lastRunAt is populated', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.inferenceEngine.lastRunAt).toBe('2026-01-01T00:30:00Z');
  });

  it('agentBridge stats are populated', async () => {
    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.agentBridge.tasksCompleted).toBe(100);
    expect(body.monitor.agentBridge.tasksFailed).toBe(5);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Health determination
// ──────────────────────────────────────────────────────────────────────────────

describe('P2P Monitor — health determination', () => {
  it('overallHealth is degraded when p2pSync error count is high', async () => {
    const client = makeOfflineClient();
    // Force connected
    (client as any).connected = true;
    (client as any).driver = {
      close: jest.fn().mockResolvedValue(undefined),
      session: () => ({
        run: jest.fn().mockResolvedValue({ records: [{ get: () => ({ low: 0 }) }] }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const app = express();
    const highErrorSync = {
      getStats: () => ({
        running: true,
        processed: 5,
        skipped: 0,
        errors: 15,
        lastEventAt: null,
        lastEventType: null,
      }),
    } as any;

    registerMonitorRoutes(app, client, { p2pSync: highErrorSync });

    const { body } = await callRoute(app, '/api/lightrag/monitor');
    expect(body.monitor.overallHealth).toBe('degraded');
    await client.close();
  });
});

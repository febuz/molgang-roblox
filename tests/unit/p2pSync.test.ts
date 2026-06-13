/**
 * Unit tests for P2PSync and the new client/agent-api methods.
 *
 * All tests run fully offline (no Kafka, no Neo4j) so they are fast
 * and require no infrastructure.
 */

import { LightRAGClient } from '../../src/integrations/lightrag/client';
import AgentAPIWrapper from '../../src/integrations/lightrag/agent-api';
import { P2PSync } from '../../src/integrations/lightrag/p2p-sync';
import { RELATIONSHIPS } from '../../src/integrations/lightrag/schema';

// ── LightRAGClient offline helpers ────────────────────────────────────────────

describe('LightRAGClient offline helpers', () => {
  let client: LightRAGClient;

  beforeEach(() => {
    client = new LightRAGClient({
      neo4j_url: 'bolt://localhost:7687',
      neo4j_username: 'neo4j',
      neo4j_password: 'test',
    });
    // Do NOT call connect() — keeps the client in offline mode.
  });

  afterEach(async () => {
    await client.close();
  });

  it('addEdge is a no-op offline and does not throw', async () => {
    await expect(
      client.addEdge('node-a', RELATIONSHIPS.DEPENDS_ON, 'node-b'),
    ).resolves.toBeUndefined();
  });

  it('mergeTypedNode is a no-op offline and does not throw', async () => {
    await expect(
      client.mergeTypedNode('ev-001', 'Decision', { content: 'use kafka', created_by: 'kai' }),
    ).resolves.toBeUndefined();
  });

  it('initIndexes is a no-op offline and does not throw', async () => {
    await expect(client.initIndexes()).resolves.toBeUndefined();
  });

  it('query returns empty result offline', async () => {
    const result = await client.query('anything');
    expect(result.nodes).toHaveLength(0);
    expect(result.cached).toBe(false);
  });
});

// ── AgentAPIWrapper new methods ───────────────────────────────────────────────

describe('AgentAPIWrapper.addRisk / addPrecedent / link', () => {
  let client: LightRAGClient;
  let api: AgentAPIWrapper;

  beforeEach(() => {
    client = new LightRAGClient({
      neo4j_url: 'bolt://localhost:7687',
      neo4j_username: 'neo4j',
      neo4j_password: 'test',
    });
    api = new AgentAPIWrapper(client);
  });

  afterEach(async () => {
    await client.close();
  });

  it('addRisk returns a node id', async () => {
    const id = await api.addRisk('kai', {
      description: 'Redis single point of failure',
      impact: 'high',
      mitigation: 'Add replica',
    });
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^node_/);
  });

  it('addRisk rejects when required fields are missing', async () => {
    await expect(api.addRisk('kai', { impact: 'low' } as any)).rejects.toThrow();
  });

  it('addPrecedent returns a node id', async () => {
    const id = await api.addPrecedent('fill', {
      context: 'Roblox asset pipeline',
      outcome: 'Used ffmpeg for conversion',
      applicable_to: ['assets', 'pipeline'],
    });
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^node_/);
  });

  it('addPrecedent rejects when required fields are missing', async () => {
    await expect(api.addPrecedent('fill', { context: 'only-context' } as any)).rejects.toThrow();
  });

  it('link rejects unknown relationship types', async () => {
    await expect(api.link('kai', 'a', 'INVENTED_REL', 'b')).rejects.toThrow(/Unknown relationship type/);
  });

  it('link accepts valid relationship types offline without throwing', async () => {
    // offline → addEdge no-ops, Kafka publish is best-effort; should not throw
    await expect(
      api.link('kai', 'node-a', RELATIONSHIPS.DEPENDS_ON, 'node-b'),
    ).resolves.toBeUndefined();
  });
});

// ── P2PSync stats ─────────────────────────────────────────────────────────────

describe('P2PSync', () => {
  let client: LightRAGClient;

  beforeEach(() => {
    client = new LightRAGClient({
      neo4j_url: 'bolt://localhost:7687',
      neo4j_username: 'neo4j',
      neo4j_password: 'test',
    });
  });

  afterEach(async () => {
    await client.close();
  });

  it('getStats returns initial zero counts', () => {
    const sync = new P2PSync(['localhost:9092'], client);
    const stats = sync.getStats();
    expect(stats.processed).toBe(0);
    expect(stats.errors).toBe(0);
    expect(stats.skipped).toBe(0);
    expect(stats.lastEventAt).toBeNull();
    expect(stats.running).toBe(false);
  });

  it('start() degrades gracefully when Kafka is unreachable', async () => {
    const sync = new P2PSync(['localhost:9092'], client);
    // Kafka is not running; start() should warn and set running=false, not throw.
    await expect(sync.start()).resolves.toBeUndefined();
    expect(sync.getStats().running).toBe(false);
  });

  it('stop() is safe to call before start()', async () => {
    const sync = new P2PSync(['localhost:9092'], client);
    await expect(sync.stop()).resolves.toBeUndefined();
  });
});

/**
 * Unit tests for P2PGossip.
 * All offline — no network, no Neo4j.
 */

import { P2PGossip } from '../../src/integrations/lightrag/p2p-gossip';
import { LightRAGClient } from '../../src/integrations/lightrag/client';

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

describe('P2PGossip constructor and stats', () => {
  it('initialises with zero stats', async () => {
    const client = makeOfflineClient();
    const gossip = new P2PGossip(client, ['http://peer1:3100']);
    const stats = gossip.getStats();
    expect(stats.pushCount).toBe(0);
    expect(stats.pullCount).toBe(0);
    expect(stats.mergeCount).toBe(0);
    expect(stats.errorCount).toBe(0);
    expect(stats.lastGossipAt).toBeNull();
    expect(stats.running).toBe(false);
    await client.close();
  });

  it('filters out self URL from peers', async () => {
    const client = makeOfflineClient();
    const myUrl = 'http://me:3100';
    const gossip = new P2PGossip(client, ['http://peer:3100', myUrl], myUrl);
    expect(gossip.getStats().peersConfigured).toBe(1);
    await client.close();
  });

  it('zero peers configured when list is empty', async () => {
    const client = makeOfflineClient();
    const gossip = new P2PGossip(client, []);
    expect(gossip.getStats().peersConfigured).toBe(0);
    await client.close();
  });
});

describe('P2PGossip.recordLocalNode', () => {
  it('records a node in the local delta', async () => {
    const client = makeOfflineClient();
    const gossip = new P2PGossip(client, []);
    gossip.recordLocalNode('node-1', 'Decision', { content: 'use kafka', created_by: 'kai' });
    // The node is in the internal delta — we test by checking gossip pull response
    // would include it. We use the internal field via cast.
    const delta = (gossip as any).localDelta as any[];
    expect(delta.some((n: any) => n.id === 'node-1')).toBe(true);
    await client.close();
  });

  it('deduplicates by id (keeps latest)', async () => {
    const client = makeOfflineClient();
    const gossip = new P2PGossip(client, []);
    gossip.recordLocalNode('node-1', 'Decision', { content: 'v1' });
    gossip.recordLocalNode('node-1', 'Decision', { content: 'v2' });
    const delta = (gossip as any).localDelta as any[];
    const matching = delta.filter((n: any) => n.id === 'node-1');
    expect(matching).toHaveLength(1);
    expect(matching[0].props.content).toBe('v2');
    await client.close();
  });
});

describe('P2PGossip.recordLocalEdge', () => {
  it('records an edge in the edge delta', async () => {
    const client = makeOfflineClient();
    const gossip = new P2PGossip(client, []);
    gossip.recordLocalEdge('a', 'DEPENDS_ON', 'b');
    const edges = (gossip as any).localEdgeDelta as any[];
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ fromId: 'a', relType: 'DEPENDS_ON', toId: 'b' });
    await client.close();
  });
});

describe('P2PGossip.start with no peers', () => {
  it('does not start timer when no peers configured', async () => {
    const client = makeOfflineClient();
    const gossip = new P2PGossip(client, []);
    gossip.start();
    expect(gossip.getStats().running).toBe(false);
    gossip.stop();
    await client.close();
  });
});

describe('P2PGossip.stop', () => {
  it('is safe to call before start', async () => {
    const client = makeOfflineClient();
    const gossip = new P2PGossip(client, ['http://peer:3100']);
    expect(() => gossip.stop()).not.toThrow();
    await client.close();
  });
});

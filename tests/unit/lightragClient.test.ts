import { LightRAGClient } from '../../src/integrations/lightrag/client';

/**
 * Tests the offline path of LightRAGClient.addNode (connected=false, no Neo4j).
 * Focus: the node-id uniqueness fix — two nodes added in the same millisecond
 * must get distinct ids (a dup id would corrupt the graph on CREATE).
 */

describe('LightRAGClient.addNode (offline)', () => {
  let client: LightRAGClient;
  beforeEach(() => {
    // Lazy driver — no connection until connect() is called (we don't).
    client = new LightRAGClient({
      neo4j_url: 'bolt://localhost:7687',
      neo4j_username: 'neo4j',
      neo4j_password: 'test',
    });
  });
  afterEach(async () => {
    await client.close(); // release the driver (avoid open handles)
  });

  it('returns an in-memory node offline with the provided fields', async () => {
    const n = await client.addNode({ type: 'decision', content: 'use redis', created_by: 'kai' });
    expect(n.type).toBe('decision');
    expect(n.content).toBe('use redis');
    expect(n.created_by).toBe('kai');
    expect(n.id).toMatch(/^node_/);
    expect(n.created_at).toBeInstanceOf(Date);
  });

  it('gives distinct ids to rapidly-added nodes (collision fix)', async () => {
    const ids = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        client.addNode({ type: 't', content: `c${i}`, created_by: 'a' }).then(n => n.id)
      )
    );
    expect(new Set(ids).size).toBe(5); // all unique, even within the same ms
  });
});

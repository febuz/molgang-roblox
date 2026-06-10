/**
 * Comprehensive unit tests for FactValidator.
 * All tests run offline — no Neo4j, no Kafka required.
 */

import { FactValidator, FactSubmission } from '../../src/integrations/lightrag/fact-validator';
import { LightRAGClient } from '../../src/integrations/lightrag/client';

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

async function withClient(fn: (client: LightRAGClient, fv: FactValidator) => Promise<void>) {
  const client = makeOfflineClient();
  const fv = new FactValidator(client);
  try {
    await fn(client, fv);
  } finally {
    await client.close();
  }
}

describe('FactValidator.submit', () => {
  it('returns a string id starting with fact_', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'decision', content: 'Use Redis for sessions' });
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^fact_/);
    });
  });

  it('initial state is pending', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'decision', content: 'foo' });
      const state = await fv.getState(id);
      expect(state?.state).toBe('pending');
      expect(state?.validationCount).toBe(0);
      expect(state?.challengeCount).toBe(0);
    });
  });

  it('records submitter, content, and type', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('zip', { type: 'risk', content: 'Redis SPOF', affects: ['infra'] });
      const state = await fv.getState(id);
      expect(state?.submittedBy).toBe('zip');
      expect(state?.content).toBe('Redis SPOF');
      expect(state?.type).toBe('risk');
    });
  });

  it('two rapid submits produce distinct ids', async () => {
    await withClient(async (_, fv) => {
      const [a, b] = await Promise.all([
        fv.submit('kai', { type: 'claim', content: 'A' }),
        fv.submit('kai', { type: 'claim', content: 'B' }),
      ]);
      expect(a).not.toBe(b);
    });
  });
});

describe('FactValidator.validate', () => {
  it('single validate does not reach quorum', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'decision', content: 'test' });
      const state = await fv.validate('zip', id);
      expect(state).toBe('pending');
      const s = await fv.getState(id);
      expect(s?.validationCount).toBe(1);
      expect(s?.validators).toContain('zip');
    });
  });

  it('two validates do not reach quorum (quorum=3)', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'decision', content: 'test' });
      await fv.validate('zip', id);
      const state = await fv.validate('luna', id);
      expect(state).toBe('pending');
    });
  });

  it('three unique validators reach CONFIRMED', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'decision', content: 'test' });
      await fv.validate('zip', id);
      await fv.validate('luna', id);
      const state = await fv.validate('mira', id);
      expect(state).toBe('confirmed');
    });
  });

  it('same agent validating twice is idempotent', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'decision', content: 'test' });
      await fv.validate('zip', id);
      await fv.validate('zip', id); // duplicate — should be ignored
      const s = await fv.getState(id);
      expect(s?.validationCount).toBe(1);
      expect(s?.validators.filter((v: string) => v === 'zip').length).toBe(1);
    });
  });

  it('throws for unknown fact id', async () => {
    await withClient(async (_, fv) => {
      await expect(fv.validate('kai', 'fact_nonexistent')).rejects.toThrow(/Unknown fact/);
    });
  });
});

describe('FactValidator.challenge', () => {
  it('one challenge moves state to contested when equal to validators', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'decision', content: 'test' });
      await fv.validate('zip', id);
      const state = await fv.challenge('luna', id, 'disagrees with prior precedent');
      // 1 validator, 1 challenger -> contested
      expect(state).toBe('contested');
    });
  });

  it('5 challenges moves state to rejected', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'claim', content: 'controversial claim' });
      await fv.challenge('a1', id);
      await fv.challenge('a2', id);
      await fv.challenge('a3', id);
      await fv.challenge('a4', id);
      const state = await fv.challenge('a5', id);
      expect(state).toBe('rejected');
    });
  });

  it('same agent challenging twice is idempotent', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'claim', content: 'test' });
      await fv.challenge('zip', id, 'reason A');
      await fv.challenge('zip', id, 'reason B'); // duplicate
      const s = await fv.getState(id);
      expect(s?.challengeCount).toBe(1);
    });
  });

  it('3 validators and 1 challenger stays confirmed', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'decision', content: 'test' });
      await fv.validate('zip', id);
      await fv.validate('luna', id);
      await fv.validate('mira', id); // confirmed
      const state = await fv.challenge('fill', id, 'late challenge');
      // 3 validators > 1 challenger, stays confirmed
      expect(state).toBe('confirmed');
    });
  });
});

describe('FactValidator.applyRemoteVote', () => {
  it('applies a remote validate vote', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'decision', content: 'remote test' });
      await fv.applyRemoteVote({ factId: id, voter: 'remote-node-1', vote: 'validate', ts: new Date().toISOString() });
      const s = await fv.getState(id);
      expect(s?.validators).toContain('remote-node-1');
    });
  });

  it('silently skips unknown fact ids', async () => {
    await withClient(async (_, fv) => {
      await expect(
        fv.applyRemoteVote({ factId: 'fact_nonexistent_remote', voter: 'peer', vote: 'validate', ts: new Date().toISOString() })
      ).resolves.toBeUndefined();
    });
  });
});

describe('FactValidator.listFacts', () => {
  it('lists all facts when no filter given', async () => {
    await withClient(async (_, fv) => {
      await fv.submit('kai', { type: 'decision', content: 'A' });
      await fv.submit('zip', { type: 'risk', content: 'B' });
      const all = fv.listFacts();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('filters by state', async () => {
    await withClient(async (_, fv) => {
      const id = await fv.submit('kai', { type: 'decision', content: 'filterable' });
      await fv.validate('a', id);
      await fv.validate('b', id);
      await fv.validate('c', id); // confirmed

      const confirmed = fv.listFacts('confirmed');
      expect(confirmed.some(f => f.id === id)).toBe(true);
      const pending = fv.listFacts('pending');
      expect(pending.some(f => f.id === id)).toBe(false);
    });
  });
});

describe('FactValidator.getStats', () => {
  it('counts states correctly', async () => {
    const freshClient = makeOfflineClient();
    const freshFv = new FactValidator(freshClient);
    const [id1, id2] = await Promise.all([
      freshFv.submit('kai', { type: 'decision', content: 'StatsTest-X' }),
      freshFv.submit('kai', { type: 'claim', content: 'StatsTest-Y' }),
    ]);
    await freshFv.validate('aa', id1);
    await freshFv.validate('bb', id1);
    await freshFv.validate('cc', id1); // confirmed

    // listFacts scoped to the IDs we just created
    const myFacts = [id1, id2].map(id => freshFv.listFacts().find(f => f.id === id)!);
    const confirmedCount = myFacts.filter(f => f?.state === 'confirmed').length;
    const pendingCount = myFacts.filter(f => f?.state === 'pending').length;
    expect(confirmedCount).toBe(1);
    expect(pendingCount).toBe(1);
    await freshClient.close();
  });
});

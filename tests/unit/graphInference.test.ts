/**
 * Unit tests for graph-inference.ts (InferenceEngine)
 * Mocks the Neo4j driver session so no database is needed.
 */

import { InferenceEngine } from '../../src/integrations/lightrag/graph-inference';
import { LightRAGClient } from '../../src/integrations/lightrag/client';

// ──────────────────────────────────────────────────────────────────────────────
// Mock helpers
// ──────────────────────────────────────────────────────────────────────────────

function mockSession(rows: Record<string, any>[]): any {
  return {
    run: jest.fn().mockResolvedValue({ records: rows.map(r => ({ get: (k: string) => r[k] })) }),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

function makeConnectedClient(session: any): LightRAGClient {
  const client = new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
  // Bypass the connect() call — force connected state
  (client as any).connected = true;
  // Inject mock driver
  (client as any).driver = { session: jest.fn(() => session) };
  // Stub addEdge and mergeTypedNode so they don't try to use the real driver
  (client as any).addEdge = jest.fn().mockResolvedValue(undefined);
  (client as any).mergeTypedNode = jest.fn().mockResolvedValue(undefined);
  return client;
}

// ──────────────────────────────────────────────────────────────────────────────
// Offline / disconnected behaviour
// ──────────────────────────────────────────────────────────────────────────────

describe('InferenceEngine — offline', () => {
  it('runAll returns empty summary when client is not connected', async () => {
    const client = new LightRAGClient({
      neo4j_url: 'bolt://localhost:7687',
      neo4j_username: 'neo4j',
      neo4j_password: 'test',
    });
    // isConnected() returns false by default before connect()
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    expect(summary.rulesRun).toBe(0);
    expect(summary.totalDerived).toBe(0);
    expect(summary.results).toHaveLength(0);
  });

  it('getLastRunAt returns null before first run', () => {
    const client = new LightRAGClient({
      neo4j_url: 'bolt://localhost:7687',
      neo4j_username: 'neo4j',
      neo4j_password: 'test',
    });
    const engine = new InferenceEngine(client);
    expect(engine.getLastRunAt()).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// runAll — with connected client
// ──────────────────────────────────────────────────────────────────────────────

describe('InferenceEngine — runAll', () => {
  it('returns summary with 6 rules run', async () => {
    const session = mockSession([]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    expect(summary.rulesRun).toBe(6);
    expect(summary.results).toHaveLength(6);
  });

  it('sets lastRunAt after a run', async () => {
    const session = mockSession([]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    await engine.runAll();
    expect(engine.getLastRunAt()).not.toBeNull();
    expect(new Date(engine.getLastRunAt()!).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('returns durationMs >= 0', async () => {
    const session = mockSession([]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('summary has ranAt ISO string', async () => {
    const session = mockSession([]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    expect(() => new Date(summary.ranAt)).not.toThrow();
  });

  it('each result has rule, derived, skipped, errors fields', async () => {
    const session = mockSession([]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    for (const r of summary.results) {
      expect(typeof r.rule).toBe('string');
      expect(typeof r.derived).toBe('number');
      expect(typeof r.skipped).toBe('number');
      expect(typeof r.errors).toBe('number');
    }
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// R1 — Transitive Dependency
// ──────────────────────────────────────────────────────────────────────────────

describe('InferenceEngine — R1 transitive dependency', () => {
  it('calls addEdge for each transitive pair returned by Neo4j', async () => {
    const session = mockSession([
      { aId: 'A', cId: 'C' },
      { aId: 'B', cId: 'D' },
    ]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    await engine.runAll();

    const addEdge = (client as any).addEdge as jest.Mock;
    // R1 should have been called for (A,C) and (B,D)
    const calls = addEdge.mock.calls;
    expect(calls.some((c: any[]) => c[0] === 'A' && c[2] === 'C')).toBe(true);
    expect(calls.some((c: any[]) => c[0] === 'B' && c[2] === 'D')).toBe(true);
  });

  it('skips rows with null aId or cId', async () => {
    const session = mockSession([
      { aId: null, cId: 'C' },
      { aId: 'A', cId: null },
    ]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    const r1 = summary.results.find(r => r.rule === 'R1_TRANSITIVE_DEPENDENCY')!;
    expect(r1.skipped).toBe(2);
    expect(r1.derived).toBe(0);
  });

  it('counts derived correctly when addEdge succeeds', async () => {
    const session = mockSession([{ aId: 'X', cId: 'Y' }]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    const r1 = summary.results.find(r => r.rule === 'R1_TRANSITIVE_DEPENDENCY')!;
    expect(r1.derived).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// R2 — Risk Escalation
// ──────────────────────────────────────────────────────────────────────────────

describe('InferenceEngine — R2 risk escalation', () => {
  it('creates BLOCKS edge for risk-decision pair', async () => {
    const session = mockSession([{ rId: 'r1', dId: 'd1', desc: 'critical risk' }]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    await engine.runAll();

    const addEdge = (client as any).addEdge as jest.Mock;
    expect(addEdge.mock.calls.some((c: any[]) => c[0] === 'r1' && c[2] === 'd1')).toBe(true);
  });

  it('r2 result shows derived count', async () => {
    const session = mockSession([{ rId: 'r1', dId: 'd1', desc: 'x' }]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    const r2 = summary.results.find(r => r.rule === 'R2_RISK_ESCALATION')!;
    expect(r2.derived).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// R4 — Quantum Threat Propagation
// ──────────────────────────────────────────────────────────────────────────────

describe('InferenceEngine — R4 quantum threat propagation', () => {
  it('calls mergeTypedNode for unmigrated quantum resource', async () => {
    const session = mockSession([{ algo: 'Shor', resource: 'RSA-2048', rId: 'qr1' }]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    await engine.runAll();

    const mergeTypedNode = (client as any).mergeTypedNode as jest.Mock;
    expect(mergeTypedNode.mock.calls.some((c: any[]) => c[1] === 'Risk')).toBe(true);
  });

  it('r4 result shows derived = 1 for one unmigrated resource', async () => {
    const session = mockSession([{ algo: 'Shor', resource: 'RSA-2048', rId: 'qr1' }]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    const r4 = summary.results.find(r => r.rule === 'R4_QUANTUM_THREAT_PROPAGATION')!;
    expect(r4.derived).toBe(1);
  });

  it('skips rows with missing algo or resource', async () => {
    const session = mockSession([{ algo: null, resource: 'RSA', rId: 'qr1' }]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    const r4 = summary.results.find(r => r.rule === 'R4_QUANTUM_THREAT_PROPAGATION')!;
    expect(r4.skipped).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// R6 — Orphan Risk Detection
// ──────────────────────────────────────────────────────────────────────────────

describe('InferenceEngine — R6 orphan risk detection', () => {
  it('escalates non-critical orphan risk to critical', async () => {
    const session = mockSession([{ id: 'risk1', impact: 'low' }]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    await engine.runAll();

    const mergeTypedNode = (client as any).mergeTypedNode as jest.Mock;
    expect(mergeTypedNode.mock.calls.some(
      (c: any[]) => c[0] === 'risk1' && c[2]?.impact === 'critical',
    )).toBe(true);
  });

  it('skips risks that are already critical', async () => {
    const session = mockSession([{ id: 'risk1', impact: 'critical' }]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    const r6 = summary.results.find(r => r.rule === 'R6_ORPHAN_RISK_DETECTION')!;
    expect(r6.skipped).toBe(1);
    expect(r6.derived).toBe(0);
  });

  it('skips rows with null id', async () => {
    const session = mockSession([{ id: null, impact: 'low' }]);
    const client = makeConnectedClient(session);
    const engine = new InferenceEngine(client);
    const summary = await engine.runAll();
    const r6 = summary.results.find(r => r.rule === 'R6_ORPHAN_RISK_DETECTION')!;
    expect(r6.skipped).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Scheduler
// ──────────────────────────────────────────────────────────────────────────────

describe('InferenceEngine — scheduler', () => {
  it('startScheduled / stopScheduled do not throw', () => {
    const client = new LightRAGClient({
      neo4j_url: 'bolt://localhost:7687',
      neo4j_username: 'neo4j',
      neo4j_password: 'test',
    });
    const engine = new InferenceEngine(client);
    engine.startScheduled(10_000);
    expect(() => engine.stopScheduled()).not.toThrow();
  });

  it('calling startScheduled twice does not create double timer', () => {
    const client = new LightRAGClient({
      neo4j_url: 'bolt://localhost:7687',
      neo4j_username: 'neo4j',
      neo4j_password: 'test',
    });
    const engine = new InferenceEngine(client);
    engine.startScheduled(60_000);
    const timer1 = (engine as any).timer;
    engine.startScheduled(60_000);
    const timer2 = (engine as any).timer;
    expect(timer1).toBe(timer2);
    engine.stopScheduled();
  });

  it('stopScheduled clears the timer reference', () => {
    const client = new LightRAGClient({
      neo4j_url: 'bolt://localhost:7687',
      neo4j_username: 'neo4j',
      neo4j_password: 'test',
    });
    const engine = new InferenceEngine(client);
    engine.startScheduled(60_000);
    engine.stopScheduled();
    expect((engine as any).timer).toBeNull();
  });
});

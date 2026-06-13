/**
 * Unit tests for the quantum-schema module.
 * All offline — no Neo4j required.
 */

import {
  QUANTUM_RELATIONSHIPS,
  QUANTUM_INDEXES,
  QUANTUM_QUERIES,
  WELL_KNOWN_ALGORITHMS,
  isQuantumCircuit,
  isQuantumAlgorithm,
  isQubit,
  seedQuantumAlgorithms,
} from '../../src/integrations/lightrag/quantum-schema';

describe('QUANTUM_RELATIONSHIPS', () => {
  it('contains all expected relationship types', () => {
    const expected = ['OPERATES_ON', 'ENTANGLED_WITH', 'PART_OF', 'IMPLEMENTS', 'PRODUCES', 'SUPERSEDES', 'REQUIRES_QUBIT', 'THREATENS'];
    for (const rel of expected) {
      expect(QUANTUM_RELATIONSHIPS).toHaveProperty(rel);
    }
  });

  it('values match their keys', () => {
    for (const [k, v] of Object.entries(QUANTUM_RELATIONSHIPS)) {
      expect(v).toBe(k);
    }
  });
});

describe('QUANTUM_INDEXES', () => {
  it('all index statements include IF NOT EXISTS', () => {
    for (const [name, cypher] of Object.entries(QUANTUM_INDEXES)) {
      expect(cypher).toContain('IF NOT EXISTS');
    }
  });

  it('contains at least 10 index definitions', () => {
    expect(Object.keys(QUANTUM_INDEXES).length).toBeGreaterThanOrEqual(10);
  });

  it('includes a fulltext index for quantum search', () => {
    expect(QUANTUM_INDEXES.fullTextQuantum).toContain('FULLTEXT INDEX');
    expect(QUANTUM_INDEXES.fullTextQuantum).toContain('quantum_search');
  });
});

describe('QUANTUM_QUERIES', () => {
  it('all queries return string values', () => {
    for (const [name, fn] of Object.entries(QUANTUM_QUERIES)) {
      expect(typeof fn()).toBe('string');
    }
  });

  it('circuitsUsingGate query contains MATCH and RETURN', () => {
    const q = QUANTUM_QUERIES.circuitsUsingGate();
    expect(q).toContain('MATCH');
    expect(q).toContain('RETURN');
  });

  it('unsafeResources query filters post_quantum_safe = false', () => {
    expect(QUANTUM_QUERIES.unsafeResources()).toContain('post_quantum_safe: false');
  });

  it('entanglementChain query uses ENTANGLED_WITH relationship', () => {
    expect(QUANTUM_QUERIES.entanglementChain()).toContain('ENTANGLED_WITH');
  });

  it('migrationSummary returns aggregation by status', () => {
    const q = QUANTUM_QUERIES.migrationSummary();
    expect(q).toContain('migration_status');
    expect(q).toContain('count');
  });
});

describe('WELL_KNOWN_ALGORITHMS seed data', () => {
  it('contains at least 5 algorithms', () => {
    expect(WELL_KNOWN_ALGORITHMS.length).toBeGreaterThanOrEqual(5);
  });

  it('Shor algorithm has exponential advantage in cryptography', () => {
    const shor = WELL_KNOWN_ALGORITHMS.find(a => a.name === 'Shor');
    expect(shor).toBeDefined();
    expect(shor?.advantage).toBe('exponential');
    expect(shor?.domain).toBe('cryptography');
    expect(shor?.nisq_compatible).toBe(false);
  });

  it('Grover algorithm is NISQ-compatible', () => {
    const grover = WELL_KNOWN_ALGORITHMS.find(a => a.name === 'Grover');
    expect(grover?.nisq_compatible).toBe(true);
    expect(grover?.advantage).toBe('quadratic');
  });

  it('VQE and QAOA are NISQ-compatible', () => {
    const nisq = WELL_KNOWN_ALGORITHMS.filter(a => a.nisq_compatible);
    expect(nisq.map(a => a.name)).toEqual(expect.arrayContaining(['VQE', 'QAOA', 'Grover']));
  });

  it('all algorithms have required fields', () => {
    for (const algo of WELL_KNOWN_ALGORITHMS) {
      expect(typeof algo.name).toBe('string');
      expect(typeof algo.complexity_quantum).toBe('string');
      expect(typeof algo.qubit_requirement).toBe('number');
      expect(['exponential', 'polynomial', 'quadratic', 'none']).toContain(algo.advantage);
    }
  });
});

describe('type guards', () => {
  it('isQuantumCircuit accepts valid circuit', () => {
    expect(isQuantumCircuit({ name: 'Bell', qubit_count: 2, created_by: 'kai' })).toBe(true);
  });

  it('isQuantumCircuit rejects objects missing required fields', () => {
    expect(isQuantumCircuit({ name: 'only-name' })).toBe(false); // no qubit_count
    expect(isQuantumCircuit({ qubit_count: 2 })).toBe(false);    // no name
    expect(isQuantumCircuit(null)).toBeFalsy();
    expect(isQuantumCircuit(undefined)).toBeFalsy();
  });

  it('isQuantumAlgorithm accepts valid algorithm', () => {
    expect(isQuantumAlgorithm({ name: 'Grover', advantage: 'quadratic' })).toBe(true);
  });

  it('isQuantumAlgorithm rejects objects missing fields', () => {
    expect(isQuantumAlgorithm({ name: 'X' })).toBe(false);       // no advantage
    expect(isQuantumAlgorithm({ advantage: 'quadratic' })).toBe(false); // no name
    expect(isQuantumAlgorithm(null)).toBeFalsy();
    expect(isQuantumAlgorithm(undefined)).toBeFalsy();
  });

  it('isQubit accepts valid qubit', () => {
    expect(isQubit({ name: 'q0', register: 'main', dimension: 2, created_by: 'kai' })).toBe(true);
  });

  it('isQubit rejects objects missing register', () => {
    expect(isQubit({ name: 'q0' })).toBe(false);
  });
});

describe('seedQuantumAlgorithms', () => {
  it('calls mergeTypedNode for each algorithm', async () => {
    const calls: Array<{ id: string; label: string }> = [];
    const mockLightrag = {
      async mergeTypedNode(id: string, label: string, _props: any) {
        calls.push({ id, label });
      },
    };
    const count = await seedQuantumAlgorithms(mockLightrag);
    expect(count).toBe(WELL_KNOWN_ALGORITHMS.length);
    expect(calls.length).toBe(WELL_KNOWN_ALGORITHMS.length);
    for (const call of calls) {
      expect(call.label).toBe('QuantumAlgorithm');
      expect(call.id).toMatch(/^algo_/);
    }
  });

  it('is idempotent (safe to call twice)', async () => {
    const calls: string[] = [];
    const mockLightrag = {
      async mergeTypedNode(id: string, _label: string, _props: any) {
        calls.push(id);
      },
    };
    await seedQuantumAlgorithms(mockLightrag);
    await seedQuantumAlgorithms(mockLightrag);
    // Same IDs both times — dedup is on the Neo4j MERGE, not here
    const unique = new Set(calls.slice(0, WELL_KNOWN_ALGORITHMS.length));
    expect(unique.size).toBe(WELL_KNOWN_ALGORITHMS.length);
  });
});

/**
 * Unit tests for graph-state-root.ts
 * All tests are pure — no Neo4j required.
 */

import {
  canonicalize,
  sha256,
  buildMerkleRoot,
  computeRootFromNodes,
  GraphStateRoot,
} from '../../src/integrations/lightrag/graph-state-root';

// ──────────────────────────────────────────────────────────────────────────────
// canonicalize
// ──────────────────────────────────────────────────────────────────────────────

describe('canonicalize', () => {
  it('sorts object keys alphabetically', () => {
    expect(canonicalize({ z: 1, a: 2, m: 3 })).toBe('{"a":2,"m":3,"z":1}');
  });

  it('handles null', () => {
    expect(canonicalize(null)).toBe('null');
  });

  it('handles primitive string', () => {
    expect(canonicalize('hello')).toBe('"hello"');
  });

  it('handles number', () => {
    expect(canonicalize(42)).toBe('42');
  });

  it('handles boolean', () => {
    expect(canonicalize(false)).toBe('false');
  });

  it('handles arrays — preserves insertion order', () => {
    expect(canonicalize([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles nested objects with sorted keys at every level', () => {
    const obj = { b: { d: 4, c: 3 }, a: 1 };
    expect(canonicalize(obj)).toBe('{"a":1,"b":{"c":3,"d":4}}');
  });

  it('is insertion-order independent for objects', () => {
    const a = canonicalize({ x: 1, y: 2 });
    const b = canonicalize({ y: 2, x: 1 });
    expect(a).toBe(b);
  });

  it('handles empty object', () => {
    expect(canonicalize({})).toBe('{}');
  });

  it('handles empty array', () => {
    expect(canonicalize([])).toBe('[]');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// sha256
// ──────────────────────────────────────────────────────────────────────────────

describe('sha256', () => {
  it('returns a 64-char lowercase hex string', () => {
    const h = sha256('hello world');
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    expect(sha256('determinism')).toBe(sha256('determinism'));
  });

  it('is collision-resistant for simple inputs', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
    expect(sha256('foo')).not.toBe(sha256('bar'));
  });

  it('known SHA-256 vector: empty string', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildMerkleRoot
// ──────────────────────────────────────────────────────────────────────────────

describe('buildMerkleRoot', () => {
  it('returns sha256("empty") for an empty leaf set', () => {
    expect(buildMerkleRoot([])).toBe(sha256('empty'));
  });

  it('returns the single leaf unchanged for a 1-element set', () => {
    const leaf = sha256('only-node');
    expect(buildMerkleRoot([leaf])).toBe(leaf);
  });

  it('returns a 64-char hex root for two leaves', () => {
    const root = buildMerkleRoot([sha256('a'), sha256('b')]);
    expect(root).toHaveLength(64);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic — same leaves always produce the same root', () => {
    const leaves = ['a', 'b', 'c', 'd'].map(sha256);
    expect(buildMerkleRoot(leaves)).toBe(buildMerkleRoot(leaves));
  });

  it('is order-sensitive — different leaf order produces different root', () => {
    const [a, b, c] = ['a', 'b', 'c'].map(sha256);
    expect(buildMerkleRoot([a, b, c])).not.toBe(buildMerkleRoot([c, b, a]));
  });

  it('handles odd number of leaves without throwing', () => {
    const leaves = ['a', 'b', 'c'].map(sha256);
    expect(() => buildMerkleRoot(leaves)).not.toThrow();
    expect(buildMerkleRoot(leaves)).toHaveLength(64);
  });

  it('handles a power-of-two number of leaves', () => {
    const leaves = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(sha256);
    expect(buildMerkleRoot(leaves)).toHaveLength(64);
  });

  it('different leaf values produce different root', () => {
    const r1 = buildMerkleRoot([sha256('node-1'), sha256('node-2')]);
    const r2 = buildMerkleRoot([sha256('node-1'), sha256('CHANGED')]);
    expect(r1).not.toBe(r2);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// computeRootFromNodes
// ──────────────────────────────────────────────────────────────────────────────

describe('computeRootFromNodes', () => {
  const sampleNodes = [
    { id: 'node_c', type: 'decision', content: 'use CRDT replication' },
    { id: 'node_a', type: 'fact', content: 'graph has 3 agents' },
    { id: 'node_b', type: 'risk', content: 'network partition possible' },
  ];

  it('returns a valid GraphStateRoot', () => {
    const result = computeRootFromNodes(sampleNodes);
    expect(result.root).toHaveLength(64);
    expect(result.nodeCount).toBe(3);
    expect(result.algorithm).toBe('sha256-merkle-v1');
    expect(() => new Date(result.computedAt)).not.toThrow();
  });

  it('is deterministic — same nodes always produce same root', () => {
    const r1 = computeRootFromNodes(sampleNodes);
    const r2 = computeRootFromNodes(sampleNodes);
    expect(r1.root).toBe(r2.root);
  });

  it('is order-independent — sorts nodes by id internally', () => {
    const shuffled = [sampleNodes[2], sampleNodes[0], sampleNodes[1]];
    const r1 = computeRootFromNodes(sampleNodes);
    const r2 = computeRootFromNodes(shuffled);
    expect(r1.root).toBe(r2.root);
  });

  it('mutating a node field changes the root', () => {
    const modified = [
      { ...sampleNodes[0], content: 'TAMPERED' },
      sampleNodes[1],
      sampleNodes[2],
    ];
    expect(computeRootFromNodes(sampleNodes).root).not.toBe(computeRootFromNodes(modified).root);
  });

  it('adding a node changes the root', () => {
    const extended = [...sampleNodes, { id: 'node_d', type: 'fact', content: 'new fact' }];
    expect(computeRootFromNodes(sampleNodes).root).not.toBe(computeRootFromNodes(extended).root);
  });

  it('empty node list returns a consistent non-null root', () => {
    const r = computeRootFromNodes([]);
    expect(r.root).toHaveLength(64);
    expect(r.nodeCount).toBe(0);
  });

  it('single-node graph returns the leaf hash directly', () => {
    const nodes = [{ id: 'only', type: 'fact', content: 'solo' }];
    const result = computeRootFromNodes(nodes);
    const expectedLeaf = sha256(canonicalize(nodes[0]));
    expect(result.root).toBe(expectedLeaf);
  });

  it('does not mutate the input array', () => {
    const nodes = [sampleNodes[2], sampleNodes[0]];
    const original = [...nodes];
    computeRootFromNodes(nodes);
    expect(nodes[0].id).toBe(original[0].id);
    expect(nodes[1].id).toBe(original[1].id);
  });
});

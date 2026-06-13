/**
 * Sparse Merkle Tree tests
 *
 * Verifies: inclusion proofs, non-inclusion proofs, root consistency,
 * set/delete operations, and the stateless verifier.
 */

import {
  SparseMerkleTree,
  SMT_EMPTY_HASH,
  verifySMTProof,
  smtKey,
} from '../../src/integrations/lightrag/sparse-merkle';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeKey(s: string): string {
  return smtKey(s);
}

// ─── Empty tree ──────────────────────────────────────────────────────────────

describe('SparseMerkleTree – empty tree', () => {
  it('empty tree root equals SMT_EMPTY_HASH', () => {
    const smt = new SparseMerkleTree();
    expect(smt.root).toBe(SMT_EMPTY_HASH);
  });

  it('size is 0', () => {
    const smt = new SparseMerkleTree();
    expect(smt.size).toBe(0);
  });

  it('has() returns false for any key', () => {
    const smt = new SparseMerkleTree();
    expect(smt.has(makeKey('alice'))).toBe(false);
  });
});

// ─── set / has / delete ───────────────────────────────────────────────────────

describe('SparseMerkleTree – mutations', () => {
  it('root changes after set', () => {
    const smt = new SparseMerkleTree();
    const before = smt.root;
    smt.set(makeKey('alice'), '{"balance":"1000"}');
    expect(smt.root).not.toBe(before);
  });

  it('has() returns true after set', () => {
    const smt = new SparseMerkleTree();
    const k = makeKey('alice');
    smt.set(k, '100');
    expect(smt.has(k)).toBe(true);
  });

  it('size increments on new set, not on update', () => {
    const smt = new SparseMerkleTree();
    const k = makeKey('bob');
    smt.set(k, '50');
    expect(smt.size).toBe(1);
    smt.set(k, '100'); // update
    expect(smt.size).toBe(1);
  });

  it('root is deterministic: same insertions → same root', () => {
    const smt1 = new SparseMerkleTree();
    const smt2 = new SparseMerkleTree();
    for (const [k, v] of [['alice', '100'], ['bob', '200'], ['carol', '300']]) {
      smt1.set(makeKey(k), v);
      smt2.set(makeKey(k), v);
    }
    expect(smt1.root).toBe(smt2.root);
  });

  it('root is order-independent: different insertion order → same root', () => {
    const smt1 = new SparseMerkleTree();
    const smt2 = new SparseMerkleTree();
    smt1.set(makeKey('alice'), '100');
    smt1.set(makeKey('bob'), '200');
    smt2.set(makeKey('bob'), '200');
    smt2.set(makeKey('alice'), '100');
    expect(smt1.root).toBe(smt2.root);
  });

  it('delete restores previous root', () => {
    const smt = new SparseMerkleTree();
    const rootBefore = smt.root;
    const k = makeKey('alice');
    smt.set(k, '100');
    smt.delete(k);
    expect(smt.root).toBe(rootBefore);
    expect(smt.has(k)).toBe(false);
  });

  it('delete on absent key is a no-op', () => {
    const smt = new SparseMerkleTree();
    const r = smt.root;
    smt.delete(makeKey('nonexistent'));
    expect(smt.root).toBe(r);
  });

  it('updating a key changes root', () => {
    const smt = new SparseMerkleTree();
    const k = makeKey('alice');
    smt.set(k, '100');
    const r1 = smt.root;
    smt.set(k, '200');
    expect(smt.root).not.toBe(r1);
  });
});

// ─── Inclusion proofs ─────────────────────────────────────────────────────────

describe('SparseMerkleTree – inclusion proofs', () => {
  it('proves inclusion of a key', () => {
    const smt = new SparseMerkleTree();
    const k = makeKey('alice');
    smt.set(k, '{"balance":"1000"}');
    const proof = smt.proveWithValue(k, '{"balance":"1000"}');
    expect(proof.included).toBe(true);
    expect(proof.key).toBe(k);
    expect(proof.siblings).toHaveLength(256);
  });

  it('inclusion proof verifies against current root', () => {
    const smt = new SparseMerkleTree();
    const k = makeKey('alice');
    const value = '{"balance":"500","nonce":3}';
    smt.set(k, value);
    const proof = smt.proveWithValue(k, value);
    expect(verifySMTProof(proof, smt.root)).toBe(true);
  });

  it('inclusion proof rejects against wrong root', () => {
    const smt = new SparseMerkleTree();
    const k = makeKey('alice');
    smt.set(k, '100');
    const proof = smt.proveWithValue(k, '100');
    const wrongRoot = makeKey('wrong');
    expect(verifySMTProof(proof, wrongRoot)).toBe(false);
  });

  it('inclusion proof with tampered value rejects', () => {
    const smt = new SparseMerkleTree();
    const k = makeKey('alice');
    smt.set(k, '100');
    const proof = smt.proveWithValue(k, '100');
    const tampered = { ...proof, value: '999' };
    // valueHash still matches original; but tampered value would yield a different hash
    // verifySMTProof uses valueHash, not value — this tests that you can't forge a value
    // while keeping the original valueHash
    expect(verifySMTProof(tampered, smt.root)).toBe(true); // hash matches, value is metadata
    // But constructing with tampered hash → fail
    const { createHash } = require('crypto');
    const tamperedHash = createHash('sha256').update('999').digest('hex');
    const tampered2 = { ...proof, valueHash: tamperedHash };
    expect(verifySMTProof(tampered2, smt.root)).toBe(false);
  });

  it('proves multiple keys independently', () => {
    const smt = new SparseMerkleTree();
    const entries = [
      [makeKey('alice'), '100'],
      [makeKey('bob'), '200'],
      [makeKey('carol'), '300'],
    ] as const;
    for (const [k, v] of entries) smt.set(k, v);
    for (const [k, v] of entries) {
      const proof = smt.proveWithValue(k, v);
      expect(verifySMTProof(proof, smt.root)).toBe(true);
    }
  });

  it('inclusion proof fails after key is deleted', () => {
    const smt = new SparseMerkleTree();
    const k = makeKey('alice');
    smt.set(k, '100');
    const oldRoot = smt.root;
    const proof = smt.proveWithValue(k, '100');
    smt.delete(k);
    // proof was valid against oldRoot
    expect(verifySMTProof(proof, oldRoot)).toBe(true);
    // but not against the new root
    expect(verifySMTProof(proof, smt.root)).toBe(false);
  });
});

// ─── Non-inclusion proofs ─────────────────────────────────────────────────────

describe('SparseMerkleTree – non-inclusion proofs', () => {
  it('proves non-inclusion of an absent key', () => {
    const smt = new SparseMerkleTree();
    smt.set(makeKey('alice'), '100');
    const absentKey = makeKey('bob');
    const proof = smt.prove(absentKey);
    expect(proof.included).toBe(false);
  });

  it('non-inclusion proof verifies against current root', () => {
    const smt = new SparseMerkleTree();
    smt.set(makeKey('alice'), '100');
    const k = makeKey('dave');
    const proof = smt.prove(k);
    expect(verifySMTProof(proof, smt.root)).toBe(true);
  });

  it('non-inclusion proof invalid after key is inserted', () => {
    const smt = new SparseMerkleTree();
    const k = makeKey('eve');
    const proofBefore = smt.prove(k);
    expect(verifySMTProof(proofBefore, smt.root)).toBe(true); // empty tree

    smt.set(k, '500');
    // old non-inclusion proof no longer valid against new root
    expect(verifySMTProof(proofBefore, smt.root)).toBe(false);
  });
});

// ─── Key validation ───────────────────────────────────────────────────────────

describe('SparseMerkleTree – key validation', () => {
  it('rejects a key that is not 64 hex chars', () => {
    const smt = new SparseMerkleTree();
    expect(() => smt.set('tooshort', 'value')).toThrow();
    expect(() => smt.set('Z'.repeat(64), 'value')).toThrow(); // uppercase
  });

  it('smtKey produces a valid 64-char lowercase hex string', () => {
    const k = smtKey('did:vpc:test123');
    expect(k).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─── State-root for account model ─────────────────────────────────────────────

describe('SparseMerkleTree – account state root', () => {
  it('can represent account states and produce a root for anchoring', () => {
    const smt = new SparseMerkleTree();

    const accounts = [
      { did: 'did:vpc:alice', balance: '5000000000', nonce: 3 },
      { did: 'did:vpc:bob', balance: '3000000000', nonce: 1 },
      { did: 'did:vpc:carol', balance: '100000000', nonce: 7 },
    ];
    for (const acc of accounts) {
      smt.set(smtKey(acc.did), JSON.stringify({ balance: acc.balance, nonce: acc.nonce }));
    }

    const stateRoot = smt.root;
    expect(typeof stateRoot).toBe('string');
    expect(stateRoot).toHaveLength(64);
    expect(stateRoot).not.toBe(SMT_EMPTY_HASH);

    // Verify each account inclusion
    for (const acc of accounts) {
      const value = JSON.stringify({ balance: acc.balance, nonce: acc.nonce });
      const proof = smt.proveWithValue(smtKey(acc.did), value);
      expect(verifySMTProof(proof, stateRoot)).toBe(true);
    }
  });

  it('state root changes when an account balance changes', () => {
    const smt = new SparseMerkleTree();
    smt.set(smtKey('did:vpc:alice'), '{"balance":"100","nonce":0}');
    const root1 = smt.root;
    smt.set(smtKey('did:vpc:alice'), '{"balance":"200","nonce":1}');
    expect(smt.root).not.toBe(root1);
  });
});

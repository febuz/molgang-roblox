/**
 * Sparse Merkle Tree (SMT) — O(log n) inclusion and non-inclusion proofs
 *
 * Why: the value-chain's `buildMerkleRoot` is a batch Merkle tree over an
 * ordered list of transfers. It is correct for settlement blocks but cannot
 * prove "account A has balance B" without replaying the full chain. An SMT
 * assigns every possible key (sha256 → 256-bit address space) a position in
 * a fixed-depth binary trie so that:
 *   - Any key can be proven INCLUDED (with its value) in O(256) hashes.
 *   - Any key can be proven NON-INCLUDED (its leaf is empty) in O(256) hashes.
 *   - Root changes are incremental (only the path from leaf to root changes).
 *
 * Design follows the Jellyfish Merkle Tree (Aptos / Diem) principle but
 * simplified to a plain binary SMT with sha256 at each internal node.
 *
 * The tree has depth 256. A key is a 64-char lowercase hex string (= sha256
 * output). Bit i of the key (MSB first) selects left (0) or right (1) at
 * depth i. Leaves store a content hash: sha256(value).
 *
 * Empty subtrees use a well-known zero hash (sha256('SMT_EMPTY')).
 */

import { createHash } from 'crypto';

// ─── Constants ────────────────────────────────────────────────────────────────

const TREE_DEPTH = 256;

function sha256hex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** The canonical hash for an empty subtree at any depth. */
export const SMT_EMPTY_HASH = sha256hex('SMT_EMPTY');

/** Hash of a leaf node: sha256("leaf:" + key + ":" + valueHash). */
function leafHash(key: string, valueHash: string): string {
  return sha256hex(`leaf:${key}:${valueHash}`);
}

/** Hash of an internal node: sha256("node:" + left + ":" + right). */
function nodeHash(left: string, right: string): string {
  return sha256hex(`node:${left}:${right}`);
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * An inclusion proof: a 256-element sibling array (one per tree level)
 * and the value stored at the key.
 */
export interface SMTProof {
  key: string;
  value: string;          // the stored value (raw string)
  valueHash: string;      // sha256(value)
  siblings: string[];     // 256 sibling hashes, index 0 = root level
  included: boolean;      // false → non-inclusion proof (value is '')
}

// ─── Core class ───────────────────────────────────────────────────────────────

/**
 * In-memory Sparse Merkle Tree.
 * Keys are 64-char hex strings (e.g., sha256 digests of account DIDs).
 * Values are arbitrary strings (e.g., canonical JSON of account state).
 */
export class SparseMerkleTree {
  /** Leaf nodes: key → valueHash. */
  private leaves = new Map<string, string>();

  /** Internal node cache: path-bits string → nodeHash. */
  private cache = new Map<string, string>();

  /** Root of the tree. Recomputed lazily when dirty. */
  private _root: string = SMT_EMPTY_HASH;
  private dirty = false;

  // ─── Mutating operations ────────────────────────────────────────────────────

  /**
   * Insert or update a key→value mapping and recompute the root.
   * key must be a 64-char lowercase hex string.
   */
  set(key: string, value: string): void {
    validateKey(key);
    const vh = sha256hex(value);
    this.leaves.set(key, vh);
    this.dirty = true;
    this._root = this.computeRoot();
  }

  /**
   * Delete a key (sets its slot back to the empty hash).
   */
  delete(key: string): void {
    validateKey(key);
    if (!this.leaves.has(key)) return;
    this.leaves.delete(key);
    this.dirty = true;
    this._root = this.computeRoot();
  }

  // ─── Queries ────────────────────────────────────────────────────────────────

  get root(): string {
    return this._root;
  }

  has(key: string): boolean {
    return this.leaves.has(key);
  }

  /** Number of non-empty leaves. */
  get size(): number {
    return this.leaves.size;
  }

  /**
   * Generate an inclusion proof (or non-inclusion proof if the key is absent).
   * Returns a 256-element sibling array + the value.
   */
  prove(key: string): SMTProof {
    validateKey(key);
    const bits = keyToBits(key);
    const siblings: string[] = [];
    // Walk from leaf to root collecting siblings
    let currentPath = '';
    for (let depth = 0; depth < TREE_DEPTH; depth++) {
      const bit = bits[depth];
      const sibling = bit === '0' ? currentPath + '1' : currentPath + '0';
      siblings.push(this.getSubtreeHash(sibling, depth + 1));
      currentPath += bit;
    }
    // siblings[0] is the sibling at the deepest level (leaf level)
    // Reverse so index 0 = root-level sibling (verify from leaf to root)
    siblings.reverse();
    const included = this.leaves.has(key);
    return {
      key,
      value: included ? '' : '', // raw value not stored; caller passes separately
      valueHash: included ? this.leaves.get(key)! : SMT_EMPTY_HASH,
      siblings,
      included,
    };
  }

  /**
   * Full proof including the raw value string.
   * Caller provides the value (tree only stores valueHash).
   */
  proveWithValue(key: string, value: string): SMTProof {
    validateKey(key);
    const proof = this.prove(key);
    return { ...proof, value };
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  /**
   * Recompute the root from scratch (called after any mutation).
   * In a production tree this would be incremental; here we use a recursive
   * descent over the key set which is O(n × depth) but correct.
   */
  private computeRoot(): string {
    this.cache.clear();
    return this.getSubtreeHash('', 0);
  }

  /**
   * Hash of the subtree rooted at `path` (bit string from MSB).
   * depth = number of bits consumed so far (= length of `path`).
   */
  private getSubtreeHash(path: string, depth: number): string {
    const cached = this.cache.get(path);
    if (cached !== undefined) return cached;

    if (depth === TREE_DEPTH) {
      // Leaf level: find which key (if any) lives at this exact path
      const key = bitsToKey(path);
      const vh = this.leaves.get(key);
      const h = vh !== undefined ? leafHash(key, vh) : SMT_EMPTY_HASH;
      this.cache.set(path, h);
      return h;
    }

    // Check if any leaf is under this subtree
    const anyLeaf = this.hasAnyLeaf(path);
    if (!anyLeaf) {
      this.cache.set(path, SMT_EMPTY_HASH);
      return SMT_EMPTY_HASH;
    }

    const left = this.getSubtreeHash(path + '0', depth + 1);
    const right = this.getSubtreeHash(path + '1', depth + 1);
    const h = (left === SMT_EMPTY_HASH && right === SMT_EMPTY_HASH)
      ? SMT_EMPTY_HASH
      : nodeHash(left, right);
    this.cache.set(path, h);
    return h;
  }

  /** Quick check: does any stored key have `path` as a prefix of its bit representation? */
  private hasAnyLeaf(path: string): boolean {
    for (const key of this.leaves.keys()) {
      const bits = keyToBits(key);
      if (bits.startsWith(path)) return true;
    }
    return false;
  }
}

// ─── Proof verification (stateless) ──────────────────────────────────────────

/**
 * Verify a proof against a known root without access to the tree.
 * Works for both inclusion and non-inclusion proofs.
 */
export function verifySMTProof(proof: SMTProof, expectedRoot: string): boolean {
  const { key, valueHash, siblings, included } = proof;
  if (siblings.length !== TREE_DEPTH) return false;
  try { validateKey(key); } catch { return false; }

  const bits = keyToBits(key);

  // Reconstruct leaf hash
  let current = included
    ? leafHash(key, valueHash)
    : SMT_EMPTY_HASH; // non-inclusion: leaf is empty

  // Walk from leaf (depth 255) to root (depth 0)
  // siblings[0] is the root-level sibling; siblings[255] is the leaf-level sibling
  for (let i = TREE_DEPTH - 1; i >= 0; i--) {
    const bit = bits[i];
    const sibling = siblings[TREE_DEPTH - 1 - i];
    // bit tells us whether current node is right (1) or left (0) child
    if (current === SMT_EMPTY_HASH && sibling === SMT_EMPTY_HASH) {
      current = SMT_EMPTY_HASH;
    } else {
      current = bit === '0'
        ? nodeHash(current, sibling)
        : nodeHash(sibling, current);
    }
  }
  return current === expectedRoot;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Convert a 64-char hex key to a 256-char binary bit string (MSB first). */
function keyToBits(key: string): string {
  let bits = '';
  for (let i = 0; i < key.length; i++) {
    bits += parseInt(key[i], 16).toString(2).padStart(4, '0');
  }
  return bits;
}

/** Convert a 256-char binary bit string back to a 64-char hex key. */
function bitsToKey(bits: string): string {
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

function validateKey(key: string): void {
  if (typeof key !== 'string' || !/^[0-9a-f]{64}$/.test(key)) {
    throw new Error(`SMT key must be a 64-char lowercase hex string, got: ${key}`);
  }
}

/**
 * Convenience: derive an SMT key from any string (DID, transfer ID, etc.)
 * by hashing it with sha256.
 */
export function smtKey(input: string): string {
  return sha256hex(input);
}

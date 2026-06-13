/**
 * Post-Quantum Hash-Based Signatures — Winternitz OTS+ under a Merkle tree
 *
 * WHY THIS EXISTS (see docs/POST-QUANTUM-WALLET.md for the full analysis):
 * every Ed25519 signature in this stack falls to Shor's algorithm on a
 * cryptographically relevant quantum computer. Hash-based signatures are the
 * one signature family whose security reduces ONLY to hash-function preimage
 * resistance — Grover's algorithm merely halves the security exponent, so
 * SHA-256 retains ~128-bit quantum security. This is the same reasoning that
 * led NIST to standardize SLH-DSA (FIPS 205) and XMSS (SP 800-208).
 *
 * This module implements a self-contained XMSS-style construction:
 *
 *   - W-OTS+ one-time signatures: the 256-bit message digest is split into
 *     64 base-16 digits plus a 3-digit checksum (67 hash chains of length 15).
 *     Each chain step is domain-separated by (chain index, step) to block
 *     multi-target attacks.
 *   - A Merkle tree over 2^h one-time leaf keys (default h=10 → 1024
 *     signatures per key). The PUBLIC KEY IS THE MERKLE ROOT (32 bytes).
 *   - All leaf private keys derive from ONE 32-byte master seed via a PRF,
 *     so a wallet backup is a single seed, like a BIP-32 wallet.
 *
 * STATEFULNESS — the one hazard of this family: signing the same leaf index
 * twice leaks enough chain intermediates to forge. The signer class enforces
 * single-use indexes and refuses exhausted keys; state must be persisted
 * with the wallet (see wallet-vault.ts).
 *
 * Verification is STATELESS and PURE — any third party can verify a
 * signature against the 32-byte root with nothing but SHA-256.
 *
 * Parameters (fixed, version-tagged):
 *   n = 32 bytes (SHA-256), w = 16, len1 = 64, len2 = 3, len = 67
 *   signature size = 67·32 (OTS) + h·32 (auth path) + 4 (index) ≈ 2.5 KB
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// ─── Parameters ───────────────────────────────────────────────────────────────

/** Scheme version tag — bump on any parameter or domain-separation change. */
export const HBS_VERSION = 1;

/** Hash output / seed size in bytes (SHA-256). */
export const HBS_N = 32;

/** Winternitz parameter: digits are base-w. */
export const HBS_W = 16;

/** Message chains: 256 bits / log2(16) = 64 digits. */
export const HBS_LEN1 = 64;

/** Checksum chains: max checksum 64·15 = 960 < 16^3. */
export const HBS_LEN2 = 3;

/** Total chains per one-time key. */
export const HBS_LEN = HBS_LEN1 + HBS_LEN2;

/** Default Merkle tree height → 2^10 = 1024 one-time keys per wallet key. */
export const HBS_DEFAULT_HEIGHT = 10;

/** Hard cap on tree height (memory bound: 2^16 leaves ≈ 2 MB of hashes). */
export const HBS_MAX_HEIGHT = 16;

// ─── Domain-separated hash primitives ────────────────────────────────────────

function h(...parts: Buffer[]): Buffer {
  const hash = createHash('sha256');
  for (const p of parts) hash.update(p);
  return hash.digest();
}

const D_PRF = Buffer.from('VPC-HBS1-PRF');
const D_CHAIN = Buffer.from('VPC-HBS1-CHAIN');
const D_LEAF = Buffer.from('VPC-HBS1-LEAF');
const D_NODE = Buffer.from('VPC-HBS1-NODE');
const D_MSG = Buffer.from('VPC-HBS1-MSG');

function u32(x: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(x);
  return b;
}

function u16(x: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16BE(x);
  return b;
}

/** PRF: derive the secret start of chain `chainIdx` for leaf `leafIdx`. */
function prfChainSeed(masterSeed: Buffer, leafIdx: number, chainIdx: number): Buffer {
  return h(D_PRF, masterSeed, u32(leafIdx), u16(chainIdx));
}

/**
 * One Winternitz chain step. Domain-separated by (chainIdx, step) so chains
 * cannot be spliced across positions (multi-target hardening, as in WOTS+).
 */
function chainStep(value: Buffer, chainIdx: number, step: number): Buffer {
  return h(D_CHAIN, u16(chainIdx), u16(step), value);
}

/** Apply `count` chain steps starting at position `from`. */
function chainApply(value: Buffer, chainIdx: number, from: number, count: number): Buffer {
  let v = value;
  for (let s = from; s < from + count; s++) {
    v = chainStep(v, chainIdx, s);
  }
  return v;
}

/** Hash a message to its 67 base-16 digits (64 message + 3 checksum). */
export function messageDigits(message: string | Buffer): number[] {
  const digest = h(D_MSG, Buffer.isBuffer(message) ? message : Buffer.from(message, 'utf8'));
  const digits: number[] = [];
  for (const byte of digest) {
    digits.push(byte >> 4, byte & 0x0f);
  }
  // Checksum: sum of (w-1 - digit). Forging a higher digit somewhere forces a
  // LOWER digit in the checksum — which the forger cannot produce (they can
  // only walk chains forward). Encoded as 3 base-16 digits, big-endian.
  let csum = 0;
  for (const d of digits) csum += HBS_W - 1 - d;
  digits.push((csum >> 8) & 0x0f, (csum >> 4) & 0x0f, csum & 0x0f);
  return digits;
}

// ─── Key generation ──────────────────────────────────────────────────────────

/** Compute the W-OTS+ public leaf hash for one leaf index. */
function computeLeaf(masterSeed: Buffer, leafIdx: number): Buffer {
  const ends: Buffer[] = [];
  for (let c = 0; c < HBS_LEN; c++) {
    const sk = prfChainSeed(masterSeed, leafIdx, c);
    ends.push(chainApply(sk, c, 0, HBS_W - 1));
  }
  return h(D_LEAF, u32(leafIdx), ...ends);
}

function merkleParent(left: Buffer, right: Buffer): Buffer {
  return h(D_NODE, left, right);
}

export interface HbsSignature {
  version: number;
  index: number;          // leaf index used (one-time!)
  ots: string[];          // 67 hex chain values at the message digit positions
  authPath: string[];     // h sibling hashes, leaf → root
  root: string;           // hex public key the signature claims to verify under
}

export interface HbsKeyInfo {
  root: string;           // hex — THE public key
  height: number;
  totalSignatures: number;
  usedSignatures: number;
  remainingSignatures: number;
}

export interface HbsState {
  version: number;
  height: number;
  nextIndex: number;
  usedIndexes: number[];
}

// ─── Stateful signer ─────────────────────────────────────────────────────────

/**
 * Holds the master seed and signing state for one hash-based key. The full
 * Merkle tree is computed once at construction (2^h leaf computations — for
 * h=10 that is ~70k SHA-256 calls, tens of milliseconds).
 */
export class HashBasedSigner {
  private readonly masterSeed: Buffer;
  private readonly height: number;
  /** tree[0] = leaves, tree[h] = [root] */
  private readonly tree: Buffer[][];
  private nextIndex = 0;
  private usedIndexes = new Set<number>();

  constructor(masterSeed?: Buffer, height = HBS_DEFAULT_HEIGHT) {
    if (height < 1 || height > HBS_MAX_HEIGHT) {
      throw new Error(`tree height must be 1..${HBS_MAX_HEIGHT}`);
    }
    if (masterSeed !== undefined && masterSeed.length !== HBS_N) {
      throw new Error(`master seed must be ${HBS_N} bytes`);
    }
    this.masterSeed = masterSeed ?? randomBytes(HBS_N);
    this.height = height;

    const leafCount = 1 << height;
    const leaves: Buffer[] = [];
    for (let i = 0; i < leafCount; i++) {
      leaves.push(computeLeaf(this.masterSeed, i));
    }
    this.tree = [leaves];
    for (let level = 0; level < height; level++) {
      const prev = this.tree[level];
      const next: Buffer[] = [];
      for (let i = 0; i < prev.length; i += 2) {
        next.push(merkleParent(prev[i], prev[i + 1]));
      }
      this.tree.push(next);
    }
  }

  /** The 32-byte public key (Merkle root), hex. */
  get root(): string {
    return this.tree[this.height][0].toString('hex');
  }

  getInfo(): HbsKeyInfo {
    const total = 1 << this.height;
    return {
      root: this.root,
      height: this.height,
      totalSignatures: total,
      usedSignatures: this.usedIndexes.size,
      remainingSignatures: total - this.usedIndexes.size,
    };
  }

  /** Export the master seed (for vault backup). Handle with care. */
  exportSeed(): Buffer {
    return Buffer.from(this.masterSeed);
  }

  /** Export signing state (persist alongside the wallet!). */
  exportState(): HbsState {
    return {
      version: HBS_VERSION,
      height: this.height,
      nextIndex: this.nextIndex,
      usedIndexes: [...this.usedIndexes].sort((a, b) => a - b),
    };
  }

  /**
   * Restore state from a persisted snapshot. The restored used-set is UNIONED
   * with the current one — state restoration must never resurrect an index.
   */
  restoreState(state: HbsState): void {
    if (state.version !== HBS_VERSION) throw new Error('HBS state version mismatch');
    if (state.height !== this.height) throw new Error('HBS state height mismatch');
    for (const i of state.usedIndexes) this.usedIndexes.add(i);
    this.nextIndex = Math.max(this.nextIndex, state.nextIndex);
  }

  /**
   * Sign a message with the next unused one-time key. Throws when the key is
   * exhausted — generate and enroll a fresh key before that happens.
   */
  sign(message: string | Buffer): HbsSignature {
    const leafCount = 1 << this.height;
    while (this.nextIndex < leafCount && this.usedIndexes.has(this.nextIndex)) {
      this.nextIndex++;
    }
    if (this.nextIndex >= leafCount) {
      throw new Error('hash-based key exhausted — all one-time indexes used');
    }
    const index = this.nextIndex;
    this.usedIndexes.add(index);
    this.nextIndex++;

    const digits = messageDigits(message);
    const ots: string[] = [];
    for (let c = 0; c < HBS_LEN; c++) {
      const sk = prfChainSeed(this.masterSeed, index, c);
      ots.push(chainApply(sk, c, 0, digits[c]).toString('hex'));
    }

    const authPath: string[] = [];
    let idx = index;
    for (let level = 0; level < this.height; level++) {
      authPath.push(this.tree[level][idx ^ 1].toString('hex'));
      idx >>= 1;
    }

    return { version: HBS_VERSION, index, ots, authPath, root: this.root };
  }
}

// ─── Stateless verification ──────────────────────────────────────────────────

/**
 * Verify a hash-based signature against a 32-byte root (hex). Pure function:
 * recompute the chain ends from the message digits, rebuild the leaf, walk
 * the auth path, compare roots in constant time.
 */
export function verifyHbsSignature(
  message: string | Buffer,
  sig: HbsSignature,
  expectedRootHex: string,
): boolean {
  try {
    if (sig.version !== HBS_VERSION) return false;
    if (!Array.isArray(sig.ots) || sig.ots.length !== HBS_LEN) return false;
    if (!Array.isArray(sig.authPath) || sig.authPath.length < 1 || sig.authPath.length > HBS_MAX_HEIGHT) return false;
    if (!Number.isInteger(sig.index) || sig.index < 0 || sig.index >= (1 << sig.authPath.length)) return false;

    const digits = messageDigits(message);
    const ends: Buffer[] = [];
    for (let c = 0; c < HBS_LEN; c++) {
      const sigVal = Buffer.from(sig.ots[c], 'hex');
      if (sigVal.length !== HBS_N) return false;
      // Walk the remaining (w-1 - digit) steps to reach the public chain end
      ends.push(chainApply(sigVal, c, digits[c], HBS_W - 1 - digits[c]));
    }
    let node = h(D_LEAF, u32(sig.index), ...ends);

    let idx = sig.index;
    for (const siblingHex of sig.authPath) {
      const sibling = Buffer.from(siblingHex, 'hex');
      if (sibling.length !== HBS_N) return false;
      node = (idx & 1) === 0 ? merkleParent(node, sibling) : merkleParent(sibling, node);
      idx >>= 1;
    }

    const expected = Buffer.from(expectedRootHex, 'hex');
    if (expected.length !== HBS_N) return false;
    return timingSafeEqual(node, expected);
  } catch {
    return false;
  }
}

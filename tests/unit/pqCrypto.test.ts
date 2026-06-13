/**
 * Post-quantum hash-based signatures (VPC-HBS1) — unit tests
 *
 * Covers the security-critical properties from docs/POST-QUANTUM-WALLET.md §3:
 * determinism, round-trips, tamper rejection, the checksum forgery barrier,
 * one-time index discipline, exhaustion, and state monotonicity.
 */

import { randomBytes } from 'crypto';
import {
  HashBasedSigner, verifyHbsSignature, messageDigits,
  HBS_LEN, HBS_LEN1, HBS_LEN2, HBS_W, HBS_N,
  HBS_DEFAULT_HEIGHT, HBS_MAX_HEIGHT, HBS_VERSION,
} from '../../src/integrations/lightrag/pq-crypto';

// Small tree keeps tests fast: h=4 → 16 one-time keys, milliseconds to build.
const H = 4;

describe('messageDigits', () => {
  it('produces 67 base-16 digits (64 message + 3 checksum)', () => {
    const d = messageDigits('hello');
    expect(d).toHaveLength(HBS_LEN);
    expect(HBS_LEN).toBe(HBS_LEN1 + HBS_LEN2);
    for (const digit of d) {
      expect(digit).toBeGreaterThanOrEqual(0);
      expect(digit).toBeLessThan(HBS_W);
    }
  });

  it('is deterministic and message-sensitive', () => {
    expect(messageDigits('a')).toEqual(messageDigits('a'));
    expect(messageDigits('a')).not.toEqual(messageDigits('b'));
  });

  it('checksum moves opposite to message digits (forgery barrier)', () => {
    // Σ checksum-encoded value must equal Σ (15 - d_i) over message digits
    const d = messageDigits('checksum-property');
    const msgSum = d.slice(0, HBS_LEN1).reduce((s, x) => s + (HBS_W - 1 - x), 0);
    const csum = (d[HBS_LEN1] << 8) | (d[HBS_LEN1 + 1] << 4) | d[HBS_LEN1 + 2];
    expect(csum).toBe(msgSum);
  });
});

describe('HashBasedSigner — key generation', () => {
  it('same seed → same root (deterministic key derivation)', () => {
    const seed = randomBytes(HBS_N);
    const a = new HashBasedSigner(seed, H);
    const b = new HashBasedSigner(seed, H);
    expect(a.root).toBe(b.root);
  });

  it('different seeds → different roots', () => {
    const a = new HashBasedSigner(randomBytes(HBS_N), H);
    const b = new HashBasedSigner(randomBytes(HBS_N), H);
    expect(a.root).not.toBe(b.root);
  });

  it('root is 32 bytes hex; default height is 10', () => {
    const s = new HashBasedSigner(undefined, H);
    expect(s.root).toMatch(/^[0-9a-f]{64}$/);
    expect(HBS_DEFAULT_HEIGHT).toBe(10);
  });

  it('rejects invalid heights and seed sizes', () => {
    expect(() => new HashBasedSigner(undefined, 0)).toThrow(/height/);
    expect(() => new HashBasedSigner(undefined, HBS_MAX_HEIGHT + 1)).toThrow(/height/);
    expect(() => new HashBasedSigner(Buffer.alloc(16), H)).toThrow(/32 bytes/);
  });

  it('getInfo reports capacity correctly', () => {
    const s = new HashBasedSigner(undefined, H);
    const info = s.getInfo();
    expect(info.totalSignatures).toBe(16);
    expect(info.usedSignatures).toBe(0);
    expect(info.remainingSignatures).toBe(16);
    s.sign('one');
    expect(s.getInfo().usedSignatures).toBe(1);
    expect(s.getInfo().remainingSignatures).toBe(15);
  });
});

describe('sign / verify round-trip', () => {
  const seed = randomBytes(HBS_N);
  const signer = new HashBasedSigner(seed, H);

  it('a fresh signature verifies', () => {
    const sig = signer.sign('quantum-safe message');
    expect(sig.version).toBe(HBS_VERSION);
    expect(verifyHbsSignature('quantum-safe message', sig, signer.root)).toBe(true);
  });

  it('every leaf produces a verifying signature (all indexes work)', () => {
    const s = new HashBasedSigner(randomBytes(HBS_N), 2); // 4 leaves
    for (let i = 0; i < 4; i++) {
      const sig = s.sign(`msg-${i}`);
      expect(sig.index).toBe(i);
      expect(verifyHbsSignature(`msg-${i}`, sig, s.root)).toBe(true);
    }
  });

  it('rejects a different message', () => {
    const sig = signer.sign('original');
    expect(verifyHbsSignature('forged', sig, signer.root)).toBe(false);
  });

  it('rejects a tampered OTS element', () => {
    const sig = signer.sign('tamper-ots');
    const bad = { ...sig, ots: [...sig.ots] };
    bad.ots[10] = randomBytes(HBS_N).toString('hex');
    expect(verifyHbsSignature('tamper-ots', bad, signer.root)).toBe(false);
  });

  it('rejects a tampered auth path', () => {
    const sig = signer.sign('tamper-path');
    const bad = { ...sig, authPath: [...sig.authPath] };
    bad.authPath[0] = randomBytes(HBS_N).toString('hex');
    expect(verifyHbsSignature('tamper-path', bad, signer.root)).toBe(false);
  });

  it('rejects a wrong root', () => {
    const sig = signer.sign('wrong-root');
    const other = new HashBasedSigner(randomBytes(HBS_N), H);
    expect(verifyHbsSignature('wrong-root', sig, other.root)).toBe(false);
  });

  it('rejects a transplanted index', () => {
    const sig = signer.sign('transplant');
    const bad = { ...sig, index: (sig.index + 1) % 16 };
    expect(verifyHbsSignature('transplant', bad, signer.root)).toBe(false);
  });

  it('rejects malformed structures without throwing', () => {
    const sig = signer.sign('malformed');
    expect(verifyHbsSignature('malformed', { ...sig, ots: sig.ots.slice(1) }, signer.root)).toBe(false);
    expect(verifyHbsSignature('malformed', { ...sig, version: 99 }, signer.root)).toBe(false);
    expect(verifyHbsSignature('malformed', { ...sig, index: -1 }, signer.root)).toBe(false);
    expect(verifyHbsSignature('malformed', { ...sig, index: 1 << 30 }, signer.root)).toBe(false);
    expect(verifyHbsSignature('malformed', { ...sig, authPath: [] }, signer.root)).toBe(false);
    expect(verifyHbsSignature('malformed', sig, 'zz'.repeat(32))).toBe(false);
    expect(verifyHbsSignature('malformed', sig, 'abcd')).toBe(false);
  });

  it('signature size is ~2.5 KB as documented', () => {
    const s = new HashBasedSigner(randomBytes(HBS_N), HBS_DEFAULT_HEIGHT);
    const sig = s.sign('size-check');
    const bytes = sig.ots.length * 32 + sig.authPath.length * 32 + 4;
    expect(bytes).toBeGreaterThan(2_000);
    expect(bytes).toBeLessThan(3_000);
  });
});

describe('one-time index discipline (the stateful hazard)', () => {
  it('never reuses an index across signatures', () => {
    const s = new HashBasedSigner(randomBytes(HBS_N), 3); // 8 leaves
    const seen = new Set<number>();
    for (let i = 0; i < 8; i++) {
      const sig = s.sign(`m${i}`);
      expect(seen.has(sig.index)).toBe(false);
      seen.add(sig.index);
    }
  });

  it('throws on exhaustion instead of wrapping around', () => {
    const s = new HashBasedSigner(randomBytes(HBS_N), 1); // 2 leaves
    s.sign('a');
    s.sign('b');
    expect(() => s.sign('c')).toThrow(/exhausted/);
  });

  it('state restore UNIONS used indexes (cannot resurrect an index)', () => {
    const seed = randomBytes(HBS_N);
    const s1 = new HashBasedSigner(seed, 2);
    s1.sign('first');                    // uses index 0
    const earlyState = s1.exportState(); // snapshot after 1 signature
    s1.sign('second');                   // uses index 1

    // Restore the EARLIER state onto the same signer: indexes 0 and 1 must
    // both stay burned.
    s1.restoreState(earlyState);
    const sig = s1.sign('third');
    expect(sig.index).toBe(2);
  });

  it('a fresh signer restored from state skips all used indexes', () => {
    const seed = randomBytes(HBS_N);
    const s1 = new HashBasedSigner(seed, 2);
    s1.sign('a'); s1.sign('b');
    const state = s1.exportState();

    const s2 = new HashBasedSigner(seed, 2);
    s2.restoreState(state);
    const sig = s2.sign('c');
    expect(sig.index).toBe(2);
    expect(verifyHbsSignature('c', sig, s2.root)).toBe(true);
  });

  it('rejects state from a different height or version', () => {
    const s = new HashBasedSigner(randomBytes(HBS_N), 2);
    const state = s.exportState();
    const other = new HashBasedSigner(randomBytes(HBS_N), 3);
    expect(() => other.restoreState(state)).toThrow(/height/);
    expect(() => s.restoreState({ ...state, version: 99 })).toThrow(/version/);
  });

  it('exported seed re-derives the identical key', () => {
    const s1 = new HashBasedSigner(undefined, H);
    const s2 = new HashBasedSigner(s1.exportSeed(), H);
    expect(s2.root).toBe(s1.root);
  });
});

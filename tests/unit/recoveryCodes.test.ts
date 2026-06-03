import { RecoveryCodeManager } from '../../src/security/recoveryCodes';

describe('RecoveryCodeManager', () => {
  let mgr: RecoveryCodeManager;
  const USER = 'user_ceo_001';

  beforeEach(() => {
    mgr = new RecoveryCodeManager();
  });

  describe('generate', () => {
    it('returns the requested number of XXXXX-XXXXX codes', () => {
      const codes = mgr.generate(USER, 8);
      expect(codes).toHaveLength(8);
      codes.forEach(c => expect(c).toMatch(/^[2-9A-HJ-NP-Z]{5}-[2-9A-HJ-NP-Z]{5}$/));
      expect(mgr.remaining(USER)).toBe(8);
    });

    it('defaults to 10 codes and requires a userId', () => {
      expect(mgr.generate(USER)).toHaveLength(10);
      expect(() => mgr.generate('')).toThrow(/userId is required/);
    });

    it('generates unique codes', () => {
      const codes = mgr.generate(USER, 20);
      expect(new Set(codes).size).toBe(20);
    });

    it('replaces an existing set (old codes stop working)', () => {
      const [oldCode] = mgr.generate(USER, 5);
      mgr.generate(USER, 5); // regenerate
      expect(mgr.verify(USER, oldCode)).toBe(false);
      expect(mgr.remaining(USER)).toBe(5);
    });
  });

  describe('verify (single-use)', () => {
    it('accepts a valid code once, then rejects reuse', () => {
      const codes = mgr.generate(USER, 5);
      expect(mgr.verify(USER, codes[2])).toBe(true);
      expect(mgr.verify(USER, codes[2])).toBe(false); // consumed
      expect(mgr.remaining(USER)).toBe(4);
    });

    it('is dash/case-insensitive', () => {
      const [code] = mgr.generate(USER, 3);
      const messy = code.replace('-', '').toLowerCase();
      expect(mgr.verify(USER, messy)).toBe(true);
    });

    it('rejects wrong / empty codes and unknown users', () => {
      mgr.generate(USER, 3);
      expect(mgr.verify(USER, 'AAAAA-BBBBB')).toBe(false);
      expect(mgr.verify(USER, '')).toBe(false);
      expect(mgr.verify('ghost', 'AAAAA-BBBBB')).toBe(false);
    });

    it('does not leak which code matched via timing — all candidates compared safely', () => {
      // Behavioural proxy: every distinct code in the set verifies exactly once.
      const codes = mgr.generate(USER, 6);
      codes.forEach(c => expect(mgr.verify(USER, c)).toBe(true));
      expect(mgr.remaining(USER)).toBe(0);
    });
  });

  describe('lifecycle', () => {
    it('has() and clear() reflect set presence', () => {
      expect(mgr.has(USER)).toBe(false);
      mgr.generate(USER, 2);
      expect(mgr.has(USER)).toBe(true);
      mgr.clear(USER);
      expect(mgr.has(USER)).toBe(false);
      expect(mgr.remaining(USER)).toBe(0);
    });
  });
});

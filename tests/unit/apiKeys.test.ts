import { ApiKeyManager } from '../../src/security/apiKeys';

/**
 * Unit tests for ApiKeyManager (service-to-service API keys).
 */

/** Subclass to control the clock for expiry tests. */
class ClockedApiKeyManager extends ApiKeyManager {
  public clock = 1_000_000;
  protected now(): number {
    return this.clock;
  }
}

describe('ApiKeyManager', () => {
  let mgr: ApiKeyManager;
  beforeEach(() => {
    mgr = new ApiKeyManager();
  });

  describe('issue + verify', () => {
    it('issues a vpk_ key that verifies', () => {
      const { key, info } = mgr.issue('numerai-fetcher');
      expect(key.startsWith('vpk_')).toBe(true);
      expect(key).toContain('.');
      const res = mgr.verify(key);
      expect(res.ok).toBe(true);
      expect(res.info?.name).toBe('numerai-fetcher');
      expect(res.info?.id).toBe(info.id);
    });

    it('never exposes the secret/hash after issue', () => {
      const { info } = mgr.issue('svc');
      expect(JSON.stringify(info)).not.toMatch(/hash|salt/);
      expect(JSON.stringify(mgr.list())).not.toMatch(/hash|salt/);
    });

    it('issues distinct keys each time', () => {
      expect(mgr.issue('a').key).not.toBe(mgr.issue('a').key);
    });

    it('requires a name', () => {
      expect(() => mgr.issue('')).toThrow(/name is required/);
    });
  });

  describe('verify failure modes', () => {
    it('rejects malformed input', () => {
      expect(mgr.verify('not-a-key').reason).toBe('malformed');
      expect(mgr.verify('vpk_onlyid').reason).toBe('malformed');
      expect(mgr.verify('vpk_id.').reason).toBe('malformed');
      expect(mgr.verify('').reason).toBe('malformed');
    });

    it('rejects an unknown id', () => {
      expect(mgr.verify('vpk_deadbeef.secret').reason).toBe('unknown');
    });

    it('rejects a tampered secret (constant-time mismatch)', () => {
      const { key } = mgr.issue('svc');
      const tampered = key.slice(0, -1) + (key.endsWith('A') ? 'B' : 'A');
      expect(mgr.verify(tampered).ok).toBe(false);
      expect(mgr.verify(tampered).reason).toBe('bad_secret');
    });
  });

  describe('revoke', () => {
    it('revokes a key so it no longer verifies', () => {
      const { key, info } = mgr.issue('svc');
      expect(mgr.revoke(info.id)).toBe(true);
      const res = mgr.verify(key);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('revoked');
    });

    it('returns false revoking unknown / already-revoked keys', () => {
      const { info } = mgr.issue('svc');
      expect(mgr.revoke('nope')).toBe(false);
      mgr.revoke(info.id);
      expect(mgr.revoke(info.id)).toBe(false);
    });
  });

  describe('expiry', () => {
    it('rejects a key after its TTL elapses', () => {
      const m = new ClockedApiKeyManager();
      const { key } = m.issue('svc', { ttlMs: 1000 });
      expect(m.verify(key).ok).toBe(true);
      m.clock += 1001;
      const res = m.verify(key);
      expect(res.ok).toBe(false);
      expect(res.reason).toBe('expired');
    });
  });

  describe('scopes', () => {
    it('carries scopes and checks them', () => {
      const { key } = mgr.issue('trader-svc', { scopes: ['trade:read', 'trade:execute'] });
      const res = mgr.verify(key);
      expect(res.ok).toBe(true);
      expect(mgr.hasScope(res.info!, 'trade:execute')).toBe(true);
      expect(mgr.hasScope(res.info!, 'admin')).toBe(false);
    });
  });
});

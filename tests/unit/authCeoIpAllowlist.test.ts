import AuthSystem from '../../src/auth/auth-system';

/**
 * Unit tests for the CEO IP allowlist (security improvement-idea:
 * "IP allowlisting for CEO accounts"). Opt-in: empty allowlist = no restriction.
 */

describe('AuthSystem CEO IP allowlist', () => {
  it('allows CEO login from an allowlisted IP', () => {
    const auth = new AuthSystem({ ceoIpAllowlist: ['203.0.113.5'] });
    const r = auth.login({ username: 'ceo', password: 'ceo123', ipAddress: '203.0.113.5' });
    expect(r.success).toBe(true);
    expect(r.token?.role).toBe('ceo');
  });

  it('denies CEO login from a non-allowlisted IP (valid credentials)', () => {
    const auth = new AuthSystem({ ceoIpAllowlist: ['203.0.113.5'] });
    const r = auth.login({ username: 'ceo', password: 'ceo123', ipAddress: '198.51.100.9' });
    expect(r.success).toBe(false);
    expect(r.error).toBe('Access denied from this network');
    expect(r.token).toBeUndefined();
  });

  it('does not restrict non-CEO roles', () => {
    const auth = new AuthSystem({ ceoIpAllowlist: ['203.0.113.5'] });
    const r = auth.login({ username: 'kai', password: 'kai123', ipAddress: '198.51.100.9' });
    expect(r.success).toBe(true); // CTO unaffected by the CEO allowlist
  });

  it('imposes no restriction when the allowlist is empty (default behaviour)', () => {
    const auth = new AuthSystem(); // no allowlist
    const r = auth.login({ username: 'ceo', password: 'ceo123', ipAddress: '198.51.100.9' });
    expect(r.success).toBe(true);
  });

  it('still rejects a wrong password before the allowlist check (no policy leak)', () => {
    const auth = new AuthSystem({ ceoIpAllowlist: ['203.0.113.5'] });
    const r = auth.login({ username: 'ceo', password: 'WRONG', ipAddress: '198.51.100.9' });
    expect(r.success).toBe(false);
    expect(r.error).toBe('Invalid username or password'); // generic, not the allowlist message
  });

  it('does not lock out a CEO via brute-force counter when denied by IP', () => {
    const auth = new AuthSystem({ ceoIpAllowlist: ['203.0.113.5'] });
    for (let i = 0; i < 6; i++) {
      auth.login({ username: 'ceo', password: 'ceo123', ipAddress: '198.51.100.9' });
    }
    // From the right IP it still works — the IP denials didn't trip the lockout.
    const r = auth.login({ username: 'ceo', password: 'ceo123', ipAddress: '203.0.113.5' });
    expect(r.success).toBe(true);
  });
});

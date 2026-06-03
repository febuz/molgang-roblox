import { checkSessionRevocation, checkRevokeUser } from '../../src/auth/auth-routes';

/**
 * Unit tests for the route-guard helpers (2nd-review remediation):
 * self-session-revoke (#1) and revoke-user existence + self-lockout (#3).
 */

describe('checkSessionRevocation', () => {
  it('blocks revoking your own current session (403)', () => {
    expect(checkSessionRevocation('sess_A', 'sess_A')).toEqual({
      allowed: false,
      status: 403,
      error: 'Cannot revoke your own active session (use logout)',
    });
  });

  it('allows revoking a different session', () => {
    expect(checkSessionRevocation('sess_A', 'sess_B')).toEqual({ allowed: true });
  });

  it('allows when the actor has no session id (e.g. internal call)', () => {
    expect(checkSessionRevocation('sess_A', undefined)).toEqual({ allowed: true });
  });
});

describe('checkRevokeUser', () => {
  it('rejects a missing/non-string username (400)', () => {
    expect(checkRevokeUser(undefined, 'ceo', false)).toMatchObject({ allowed: false, status: 400 });
    expect(checkRevokeUser('', 'ceo', false)).toMatchObject({ allowed: false, status: 400 });
    expect(checkRevokeUser(42, 'ceo', true)).toMatchObject({ allowed: false, status: 400 });
  });

  it('rejects an unknown user (404) — consistent with other user routes', () => {
    expect(checkRevokeUser('ghost', 'ceo', false)).toEqual({
      allowed: false,
      status: 404,
      error: 'User not found',
    });
  });

  it('blocks revoking all of your own sessions (403 self-lockout)', () => {
    expect(checkRevokeUser('ceo', 'ceo', true)).toEqual({
      allowed: false,
      status: 403,
      error: 'Cannot revoke all of your own sessions (use logout)',
    });
  });

  it('allows revoking another existing user', () => {
    expect(checkRevokeUser('zip', 'ceo', true)).toEqual({ allowed: true });
  });

  it('checks 400 before 404 before 403 (precedence)', () => {
    // Missing username wins over everything.
    expect(checkRevokeUser('', 'ceo', false).status).toBe(400);
    // Non-existent wins over self-lockout (can't be both, but order is defined).
    expect(checkRevokeUser('ceo', 'ceo', false).status).toBe(404);
  });
});

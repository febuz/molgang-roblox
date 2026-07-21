import AuthSystem from '../../src/auth/auth-system';

/**
 * Unit tests for admin session management (backlog 6.5.14):
 * getActiveSessions / revokeSession / revokeUserSessions.
 */

function login(auth: AuthSystem, username: string, password: string) {
  const r = auth.login({ username, password });
  if (!r.token) throw new Error(`login failed for ${username}`);
  return r.token;
}

describe('AuthSystem session management', () => {
  let auth: AuthSystem;

  beforeEach(() => {
    auth = new AuthSystem();
  });

  describe('getActiveSessions', () => {
    it('lists active sessions with safe metadata (no secrets)', () => {
      login(auth, 'ceo', 'ceo123');
      login(auth, 'kai', 'kai123');
      const sessions = auth.getActiveSessions();
      expect(sessions).toHaveLength(2);
      const ceo = sessions.find(s => s.username === 'ceo')!;
      expect(ceo).toEqual(
        expect.objectContaining({ username: 'ceo', role: 'ceo', userId: 'user_ceo_001' })
      );
      expect(ceo.sessionId).toMatch(/^session_/);
      expect(ceo.issuedAt).toBeInstanceOf(Date);
      expect(ceo.expiresAt).toBeInstanceOf(Date);
      // No password hash / secret leaks into the listing.
      expect(JSON.stringify(sessions)).not.toMatch(/scrypt\$/);
    });

    it('excludes and prunes expired sessions', () => {
      const token = login(auth, 'ceo', 'ceo123');
      login(auth, 'zip', 'zip123');
      // Backdate the ceo session's expiry (same object stored in the map).
      token.expiresAt = new Date(Date.now() - 1000);

      const active = auth.getActiveSessions();
      expect(active.map(s => s.username)).toEqual(['zip']);
      // Pruned: a second call still shows only the live one, and the stale
      // session no longer counts.
      expect(auth.getActiveSessions()).toHaveLength(1);
    });
  });

  describe('revokeSession', () => {
    it('removes an existing session and returns true', () => {
      const token = login(auth, 'ceo', 'ceo123');
      expect(auth.revokeSession(token.sessionId)).toBe(true);
      expect(auth.getActiveSessions()).toHaveLength(0);
      // The token can no longer be verified.
      expect(auth.verifyToken(token.sessionId)).toBeNull();
    });

    it('returns false for an unknown session id', () => {
      expect(auth.revokeSession('session_does_not_exist')).toBe(false);
    });
  });

  describe('revokeUserSessions', () => {
    it('removes all sessions for one user and leaves others intact', () => {
      login(auth, 'ceo', 'ceo123');
      login(auth, 'ceo', 'ceo123'); // a second device for ceo
      login(auth, 'kai', 'kai123');

      const removed = auth.revokeUserSessions('ceo');
      expect(removed).toBe(2);
      const remaining = auth.getActiveSessions();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].username).toBe('kai');
    });

    it('returns 0 when the user has no active sessions', () => {
      login(auth, 'kai', 'kai123');
      expect(auth.revokeUserSessions('ceo')).toBe(0);
      expect(auth.getActiveSessions()).toHaveLength(1);
    });
  });
});

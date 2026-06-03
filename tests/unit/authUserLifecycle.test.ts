import AuthSystem from '../../src/auth/auth-system';

/**
 * Unit tests for user lifecycle management + role-hierarchy enforcement
 * (backlog improvement: "Role hierarchy enforcement (CTO cannot delete CEO)").
 */

const CEO = 'user_ceo_001';
const CTO = 'user_cto_001';
const DEV = 'user_dev_001';

describe('AuthSystem user lifecycle + hierarchy', () => {
  let auth: AuthSystem;

  beforeEach(() => {
    auth = new AuthSystem();
  });

  describe('canManage', () => {
    it('lets higher privilege manage lower, and equal manage equal', () => {
      expect(auth.canManage('ceo', 'cto')).toBe(true);
      expect(auth.canManage('ceo', 'developer')).toBe(true);
      expect(auth.canManage('ceo', 'ceo')).toBe(true);
      expect(auth.canManage('cto', 'developer')).toBe(true);
    });

    it('forbids managing a higher privilege', () => {
      expect(auth.canManage('cto', 'ceo')).toBe(false);
      expect(auth.canManage('developer', 'ceo')).toBe(false);
      expect(auth.canManage('developer', 'cto')).toBe(false);
    });
  });

  describe('setUserStatus', () => {
    it('suspends a manageable user and revokes their active sessions', () => {
      const kai = auth.login({ username: 'kai', password: 'kai123' }).token!;
      expect(auth.getActiveSessions().some(s => s.sessionId === kai.sessionId)).toBe(true);

      const res = auth.setUserStatus('ceo', CTO, 'suspended');
      expect(res.success).toBe(true);
      expect(auth.getUser(CTO)!.status).toBe('suspended');
      // Session revoked on deactivation.
      expect(auth.verifyToken(kai.sessionId)).toBeNull();
    });

    it('blocks a lower-privilege actor from managing a higher one', () => {
      const res = auth.setUserStatus('cto', CEO, 'suspended');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/privilege/i);
      expect(auth.getUser(CEO)!.status).toBe('active'); // unchanged
    });

    it('refuses to deactivate the last active CEO (lockout protection)', () => {
      const res = auth.setUserStatus('ceo', CEO, 'suspended');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/last active CEO/);
      expect(auth.getUser(CEO)!.status).toBe('active');
    });

    it('allows deactivating a CEO when another active CEO exists', () => {
      auth.createUser('ceo2', 'ceo2@x.local', 'ceo', 'pw123456');
      const res = auth.setUserStatus('ceo', CEO, 'inactive');
      expect(res.success).toBe(true);
      expect(auth.getUser(CEO)!.status).toBe('inactive');
    });

    it('returns 404-style error for an unknown user', () => {
      expect(auth.setUserStatus('ceo', 'nope', 'inactive')).toEqual({ success: false, error: 'User not found' });
    });
  });

  describe('deleteUser', () => {
    it('deletes a manageable user and revokes their sessions', () => {
      const zip = auth.login({ username: 'zip', password: 'zip123' }).token!;
      const res = auth.deleteUser('ceo', DEV);
      expect(res.success).toBe(true);
      expect(auth.getUser(DEV)).toBeNull();
      expect(auth.verifyToken(zip.sessionId)).toBeNull();
    });

    it('blocks a lower-privilege actor from deleting a higher one', () => {
      const res = auth.deleteUser('cto', CEO);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/privilege/i);
      expect(auth.getUser(CEO)).not.toBeNull();
    });

    it('refuses to delete the last active CEO', () => {
      expect(auth.deleteUser('ceo', CEO)).toEqual({ success: false, error: 'Cannot delete the last active CEO' });
      expect(auth.getUser(CEO)).not.toBeNull();
    });

    it('returns not-found for an unknown user', () => {
      expect(auth.deleteUser('ceo', 'nope')).toEqual({ success: false, error: 'User not found' });
    });
  });
});

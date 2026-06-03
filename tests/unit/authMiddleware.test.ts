import express from 'express';
import AuthMiddleware, { AuthRequest } from '../../src/auth/auth-middleware';
import AuthSystem from '../../src/auth/auth-system';

/**
 * Unit tests for AuthMiddleware (backlog 6.5.11).
 *
 * Exercises verifyToken / requireRole / requirePermission / public / optional
 * against a real AuthSystem (default seeded users) with mocked Express
 * req/res/next objects.
 */

/** Minimal Express response double capturing status + json. */
function mockRes() {
  const res: Partial<express.Response> & { statusCode?: number; body?: any } = {};
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res as express.Response;
  }) as any;
  res.json = jest.fn((payload: any) => {
    res.body = payload;
    return res as express.Response;
  }) as any;
  return res as express.Response & { statusCode?: number; body?: any };
}

function mockReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return { headers: {}, path: '/test', ...overrides } as AuthRequest;
}

describe('AuthMiddleware', () => {
  let auth: AuthSystem;
  let mw: AuthMiddleware;
  let ceoSession: string;
  let devSession: string;

  beforeEach(() => {
    auth = new AuthSystem();
    mw = new AuthMiddleware(auth);
    // Bearer token == sessionId from a real login (no 2FA on seeded users).
    ceoSession = auth.login({ username: 'ceo', password: 'ceo123' }).token!.sessionId;
    devSession = auth.login({ username: 'zip', password: 'zip123' }).token!.sessionId;
  });

  describe('verifyToken', () => {
    it('rejects requests with no Authorization header (401)', () => {
      const res = mockRes();
      const next = jest.fn();
      mw.verifyToken()(mockReq(), res, next);
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ success: false, error: 'No token provided' });
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects an invalid/unknown token (401)', () => {
      const res = mockRes();
      const next = jest.fn();
      mw.verifyToken()(mockReq({ headers: { authorization: 'Bearer bogus' } }), res, next);
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Invalid or expired token');
      expect(next).not.toHaveBeenCalled();
    });

    it('accepts a valid token and populates req.user/userId/userRole', () => {
      const req = mockReq({ headers: { authorization: `Bearer ${ceoSession}` } });
      const res = mockRes();
      const next = jest.fn();
      mw.verifyToken()(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(req.user?.username).toBe('ceo');
      expect(req.userId).toBe('user_ceo_001');
      expect(req.userRole).toBe('ceo');
    });

    it('rejects a logged-out (revoked) session', () => {
      auth.logout(ceoSession);
      const res = mockRes();
      const next = jest.fn();
      mw.verifyToken()(mockReq({ headers: { authorization: `Bearer ${ceoSession}` } }), res, next);
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('returns 401 when no user is attached', () => {
      const res = mockRes();
      const next = jest.fn();
      mw.requireRole('ceo')(mockReq(), res, next);
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows a user whose role is in the allow-list', () => {
      const req = mockReq({ user: auth.verifyToken(ceoSession)! });
      const res = mockRes();
      const next = jest.fn();
      mw.requireRole('ceo', 'cto')(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('denies a user whose role is not allowed (403)', () => {
      const req = mockReq({ user: auth.verifyToken(devSession)!, path: '/admin' });
      const res = mockRes();
      const next = jest.fn();
      mw.requireRole('ceo')(req, res, next);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('Required roles: ceo');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('returns 401 when no user is attached', () => {
      const res = mockRes();
      const next = jest.fn();
      mw.requirePermission('manageUsers')(mockReq(), res, next);
      expect(res.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows when the role grants the permission (CEO canManageUsers)', () => {
      const req = mockReq({ user: auth.verifyToken(ceoSession)! });
      const res = mockRes();
      const next = jest.fn();
      mw.requirePermission('manageUsers')(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('denies when the role lacks the permission (developer !canManageUsers, 403)', () => {
      const req = mockReq({ user: auth.verifyToken(devSession)! });
      const res = mockRes();
      const next = jest.fn();
      mw.requirePermission('manageUsers')(req, res, next);
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Permission denied: manageUsers');
      expect(next).not.toHaveBeenCalled();
    });

    it('capitalises the permission key correctly (viewAuditLog -> canViewAuditLog)', () => {
      const allow = mockRes();
      const allowNext = jest.fn();
      mw.requirePermission('viewAuditLog')(mockReq({ user: auth.verifyToken(ceoSession)! }), allow, allowNext);
      expect(allowNext).toHaveBeenCalledTimes(1); // CEO has it

      const deny = mockRes();
      const denyNext = jest.fn();
      mw.requirePermission('viewAuditLog')(mockReq({ user: auth.verifyToken(devSession)! }), deny, denyNext);
      expect(deny.statusCode).toBe(403); // developer does not
    });
  });

  describe('public', () => {
    it('always calls next without touching the response', () => {
      const res = mockRes();
      const next = jest.fn();
      mw.public()(mockReq(), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('optional', () => {
    it('proceeds without a token and leaves req.user undefined', () => {
      const req = mockReq();
      const next = jest.fn();
      mw.optional()(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeUndefined();
    });

    it('attaches the user when a valid token is provided', () => {
      const req = mockReq({ headers: { authorization: `Bearer ${ceoSession}` } });
      const next = jest.fn();
      mw.optional()(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user?.username).toBe('ceo');
      expect(req.userRole).toBe('ceo');
    });

    it('proceeds (without a user) even when the provided token is invalid', () => {
      const req = mockReq({ headers: { authorization: 'Bearer nope' } });
      const next = jest.fn();
      mw.optional()(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeUndefined();
    });
  });
});

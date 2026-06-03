import { setupAuthRoutes } from '../../src/auth/auth-routes';
import AuthSystem from '../../src/auth/auth-system';
import { generateTotp } from '../../src/auth/totp';

/**
 * Endpoint-level coverage for setupAuthRoutes (login/2FA/logout/profile/users),
 * driven through a captured-handler harness with a real AuthSystem. The route
 * guards themselves are covered separately in authRouteGuards.test.ts.
 */

function harness() {
  const routes: Record<string, Function> = {};
  const capture = (method: string) =>
    jest.fn((path: string, ...rest: any[]) => {
      routes[`${method} ${path}`] = rest[rest.length - 1];
    });
  const app: any = { get: capture('GET'), post: capture('POST'), delete: capture('DELETE') };
  const authMiddleware = {
    verifyToken: jest.fn(() => 'mw'),
    requireRole: jest.fn(() => 'mw'),
  };
  const auth = new AuthSystem();
  setupAuthRoutes(app, auth, authMiddleware as any, {});
  return { routes, auth };
}

function res() {
  const r: any = {
    statusCode: 200,
    body: undefined,
    status: jest.fn((c: number) => ((r.statusCode = c), r)),
    json: jest.fn((b: any) => ((r.body = b), r)),
  };
  return r;
}

const loginReq = (username: string, password: string) => ({
  body: { username, password },
  ip: '1.1.1.1',
  headers: {},
});

describe('setupAuthRoutes endpoints', () => {
  describe('POST /api/auth/login', () => {
    it('issues a token for valid credentials', () => {
      const { routes } = harness();
      const r = res();
      routes['POST /api/auth/login'](loginReq('kai', 'kai123'), r);
      expect(r.body.success).toBe(true);
      expect(r.body.token).toMatch(/^session_/);
      expect(r.body.user).toEqual({ username: 'kai', role: 'cto' });
    });

    it('401s on a bad password (generic error, no leak)', () => {
      const { routes } = harness();
      const r = res();
      routes['POST /api/auth/login'](loginReq('kai', 'WRONG'), r);
      expect(r.statusCode).toBe(401);
      expect(r.body.error).toBe('Invalid username or password');
    });

    it('returns a 2FA challenge (HTTP 200) when the account has 2FA', () => {
      const { routes, auth } = harness();
      const { secret } = auth.setupTotp('user_ceo_001');
      auth.enableTotp('user_ceo_001', generateTotp(secret!));
      const r = res();
      routes['POST /api/auth/login'](loginReq('ceo', 'ceo123'), r);
      expect(r.statusCode).toBe(200);
      expect(r.body).toMatchObject({ success: false, requires2fa: true });
      expect(r.body.challengeId).toBeTruthy();
    });
  });

  describe('POST /api/auth/2fa/verify', () => {
    it('exchanges a valid challenge + code for a token', () => {
      const { routes, auth } = harness();
      const { secret } = auth.setupTotp('user_ceo_001');
      auth.enableTotp('user_ceo_001', generateTotp(secret!));
      const login = res();
      routes['POST /api/auth/login'](loginReq('ceo', 'ceo123'), login);

      const r = res();
      routes['POST /api/auth/2fa/verify']({ body: { challengeId: login.body.challengeId, code: generateTotp(secret!) }, headers: {}, ip: '1.1.1.1' }, r);
      expect(r.body.success).toBe(true);
      expect(r.body.token).toMatch(/^session_/);
    });

    it('401s on a wrong 2FA code', () => {
      const { routes, auth } = harness();
      const { secret } = auth.setupTotp('user_ceo_001');
      auth.enableTotp('user_ceo_001', generateTotp(secret!));
      const login = res();
      routes['POST /api/auth/login'](loginReq('ceo', 'ceo123'), login);

      const r = res();
      routes['POST /api/auth/2fa/verify']({ body: { challengeId: login.body.challengeId, code: '000000' }, headers: {}, ip: '1.1.1.1' }, r);
      expect(r.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revokes the caller session', () => {
      const { routes, auth } = harness();
      const token = auth.login({ username: 'kai', password: 'kai123' }).token!;
      const r = res();
      routes['POST /api/auth/logout']({ user: token }, r);
      expect(r.body.success).toBe(true);
      expect(auth.verifyToken(token.sessionId)).toBeNull(); // session gone
    });
  });

  describe('GET /api/auth/profile', () => {
    it('returns the user and their permissions', () => {
      const { routes, auth } = harness();
      const token = auth.login({ username: 'kai', password: 'kai123' }).token!;
      const r = res();
      routes['GET /api/auth/profile']({ user: token }, r);
      expect(r.body.success).toBe(true);
      expect(r.body.user.username).toBe('kai');
      expect(r.body.user).not.toHaveProperty('passwordHash');
      expect(r.body.permissions.canAccessDashboard).toBe(true);
    });

    it('401s when unauthenticated', () => {
      const { routes } = harness();
      const r = res();
      routes['GET /api/auth/profile']({}, r);
      expect(r.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/users', () => {
    it('lists users without password hashes', () => {
      const { routes } = harness();
      const r = res();
      routes['GET /api/auth/users']({}, r);
      expect(r.body.success).toBe(true);
      expect(r.body.users.length).toBeGreaterThanOrEqual(5);
      expect(JSON.stringify(r.body.users)).not.toMatch(/scrypt\$/);
    });
  });
});

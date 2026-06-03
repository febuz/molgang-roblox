import { setupSecurityRoutes } from '../../src/security/security-routes';

/**
 * Unit tests for setupSecurityRoutes. Captures the registered route handler via
 * a mock Express app and verifies CEO gating, the snapshot response, and error
 * handling — without a real HTTP server.
 */

function harness(snapshotImpl: () => any) {
  const routes: Record<string, { middlewares: any[]; handler: Function }> = {};
  const app: any = {
    get: jest.fn((path: string, ...rest: any[]) => {
      routes[`GET ${path}`] = { middlewares: rest.slice(0, -1), handler: rest[rest.length - 1] };
    }),
  };
  const requireRole = jest.fn((..._roles: string[]) => `mw:requireRole(${_roles.join(',')})`);
  const authMiddleware = { requireRole };
  const dashboard = { snapshot: jest.fn(snapshotImpl) };
  setupSecurityRoutes(app, dashboard as any, authMiddleware as any);
  return { app, routes, requireRole, dashboard };
}

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status: jest.fn((c: number) => {
      res.statusCode = c;
      return res;
    }),
    json: jest.fn((b: any) => {
      res.body = b;
      return res;
    }),
  };
  return res;
}

describe('setupSecurityRoutes', () => {
  it('registers GET /api/security/dashboard gated to the CEO role', () => {
    const { app, routes, requireRole } = harness(() => ({ score: 95 }));
    expect(app.get).toHaveBeenCalledTimes(1);
    expect(routes['GET /api/security/dashboard']).toBeDefined();
    expect(requireRole).toHaveBeenCalledWith('ceo');
    // The role middleware is wired ahead of the handler.
    expect(routes['GET /api/security/dashboard'].middlewares).toContain('mw:requireRole(ceo)');
  });

  it('returns the dashboard snapshot on success', () => {
    const snap = { score: 88, grade: 'B' };
    const { routes, dashboard } = harness(() => snap);
    const res = mockRes();
    routes['GET /api/security/dashboard'].handler({}, res);
    expect(dashboard.snapshot).toHaveBeenCalledTimes(1);
    expect(res.body).toEqual({ success: true, dashboard: snap });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 500 with the error message when snapshot throws', () => {
    const { routes } = harness(() => {
      throw new Error('dashboard boom');
    });
    const res = mockRes();
    routes['GET /api/security/dashboard'].handler({}, res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ success: false, error: 'dashboard boom' });
  });
});

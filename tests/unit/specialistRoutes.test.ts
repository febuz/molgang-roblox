import setupSpecialistRoutes from '../../src/auth/specialist-routes';
import SpecialistDashboards from '../../src/auth/specialist-dashboards';

/**
 * Unit tests for setupSpecialistRoutes — captures handlers via a mock app and
 * drives them with a real SpecialistDashboards. Verifies role gating, the
 * /my authenticated path, role-dashboard payloads, and the error path.
 */

function harness() {
  const routes: Record<string, Function> = {};
  const gating: Record<string, any[]> = {};
  const app: any = {
    get: jest.fn((path: string, ...rest: any[]) => {
      routes[path] = rest[rest.length - 1];
      gating[path] = rest.slice(0, -1);
    }),
  };
  const authMiddleware = {
    verifyToken: jest.fn(() => 'mw:verifyToken'),
    requireRole: jest.fn((...roles: string[]) => `mw:requireRole(${roles.join(',')})`),
  };
  const dashboards = new SpecialistDashboards();
  setupSpecialistRoutes(app, dashboards, authMiddleware);
  return { routes, gating, authMiddleware, dashboards };
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

describe('setupSpecialistRoutes', () => {
  it('registers all six dashboard routes with correct gating', () => {
    const { routes, gating } = harness();
    expect(Object.keys(routes).sort()).toEqual(
      [
        '/api/dashboard/artist',
        '/api/dashboard/ceo',
        '/api/dashboard/cto',
        '/api/dashboard/developer',
        '/api/dashboard/my',
        '/api/dashboard/tech-artist',
      ].sort()
    );
    expect(gating['/api/dashboard/my']).toContain('mw:verifyToken');
    expect(gating['/api/dashboard/ceo']).toContain('mw:requireRole(ceo)');
    expect(gating['/api/dashboard/tech-artist']).toContain('mw:requireRole(tech_artist)');
  });

  describe('/api/dashboard/my', () => {
    it('returns the role-appropriate dashboard for an authenticated user', () => {
      const { routes } = harness();
      const r = res();
      routes['/api/dashboard/my']({ user: { role: 'cto' } }, r);
      expect(r.body.success).toBe(true);
      expect(r.body.role).toBe('cto');
      expect(r.body.dashboard).toBeDefined();
    });

    it('401s when unauthenticated', () => {
      const { routes } = harness();
      const r = res();
      routes['/api/dashboard/my']({}, r);
      expect(r.statusCode).toBe(401);
      expect(r.body.error).toMatch(/Not authenticated/);
    });
  });

  it('role routes return their dashboard payloads', () => {
    const { routes } = harness();
    const ceo = res();
    routes['/api/dashboard/ceo']({}, ceo);
    expect(ceo.body.success).toBe(true);
    expect(ceo.body.dashboard).toHaveProperty('systemHealth');

    const cto = res();
    routes['/api/dashboard/cto']({}, cto);
    expect(cto.body.dashboard).toHaveProperty('systemUptime');
  });

  it('500s when a dashboard getter throws', () => {
    const { routes, dashboards } = harness();
    jest.spyOn(dashboards, 'getCEODashboard').mockImplementation(() => {
      throw new Error('dash boom');
    });
    const r = res();
    routes['/api/dashboard/ceo']({}, r);
    expect(r.statusCode).toBe(500);
    expect(r.body.error).toBe('dash boom');
  });
});

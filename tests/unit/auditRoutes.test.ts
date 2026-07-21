import setupAuditRoutes from '../../src/auth/audit-routes';
import CEOAuditLogger from '../../src/auth/audit-logger';

/**
 * Unit tests for setupAuditRoutes. Captures the registered handlers via a mock
 * app and drives them with a REAL CEOAuditLogger, so CEO gating, the limit
 * clamping (negative-limit security fix), export headers, and clear-old
 * validation are verified end-to-end without an HTTP server.
 */

function harness() {
  const routes: Record<string, Function> = {};
  const gating: Record<string, string[]> = {};
  const capture = (method: string) =>
    jest.fn((path: string, ...rest: any[]) => {
      routes[`${method} ${path}`] = rest[rest.length - 1];
      gating[`${method} ${path}`] = rest.slice(0, -1);
    });
  const app: any = { get: capture('GET'), post: capture('POST') };
  const roleArgs: string[][] = [];
  const authMiddleware = {
    requireRole: jest.fn((...roles: string[]) => {
      roleArgs.push(roles);
      return `mw:requireRole(${roles.join(',')})`;
    }),
  };
  const audit = new CEOAuditLogger();
  setupAuditRoutes(app, audit, authMiddleware);
  return { app, routes, gating, roleArgs, audit };
}

function res() {
  const r: any = {
    statusCode: 200,
    body: undefined,
    headers: {} as Record<string, string>,
    sent: undefined,
    status: jest.fn((c: number) => ((r.statusCode = c), r)),
    json: jest.fn((b: any) => ((r.body = b), r)),
    send: jest.fn((s: any) => ((r.sent = s), r)),
    setHeader: jest.fn((k: string, v: string) => ((r.headers[k] = v), r)),
  };
  return r;
}

describe('setupAuditRoutes', () => {
  it('gates every route to the CEO role', () => {
    const { roleArgs, gating } = harness();
    expect(roleArgs.length).toBeGreaterThanOrEqual(9);
    roleArgs.forEach(roles => expect(roles).toEqual(['ceo']));
    Object.values(gating).forEach(mws => expect(mws).toContain('mw:requireRole(ceo)'));
  });

  it('GET /api/audit/stats returns stats + security score + grade', () => {
    const { routes } = harness();
    const r = res();
    routes['GET /api/audit/stats']({}, r);
    expect(r.body.success).toBe(true);
    expect(r.body.stats).toBeDefined();
    expect(r.body.security_score).toBe(100); // empty log
    expect(r.body.score_grade).toBe('A');
  });

  it('GET /api/audit/events clamps a negative limit (does not dump the log)', () => {
    const { routes, audit } = harness();
    for (let i = 0; i < 5; i++) audit.logEvent('u', 'u', 'r', 'login', 'ip', 'd', 'l', 'x', 'success');
    const r = res();
    routes['GET /api/audit/events']({ query: { limit: '-5000' } }, r);
    expect(r.body.success).toBe(true);
    expect(r.body.count).toBeLessThanOrEqual(1); // clamped, not all 5
    expect(r.body.events.length).toBe(r.body.count);
  });

  it('GET /api/audit/events/user/:username filters by user', () => {
    const { routes, audit } = harness();
    audit.logEvent('u', 'alice', 'r', 'login', 'ip', 'd', 'l', 'x', 'success');
    audit.logEvent('u', 'bob', 'r', 'login', 'ip', 'd', 'l', 'x', 'success');
    const r = res();
    routes['GET /api/audit/events/user/:username']({ params: { username: 'alice' }, query: {} }, r);
    expect(r.body.user).toBe('alice');
    expect(r.body.count).toBe(1);
  });

  it('GET /api/audit/export/csv sets download headers and sends CSV', () => {
    const { routes, audit } = harness();
    audit.logEvent('u', 'alice', 'r', 'login', 'ip', 'd', 'l', 'x', 'success');
    const r = res();
    routes['GET /api/audit/export/csv']({}, r);
    expect(r.headers['Content-Type']).toBe('text/csv');
    expect(r.headers['Content-Disposition']).toContain('audit-log.csv');
    expect(typeof r.sent).toBe('string');
    expect(r.sent).toContain('alice');
  });

  it('GET /api/audit/export/json sets headers and sends valid JSON', () => {
    const { routes, audit } = harness();
    audit.logEvent('u', 'alice', 'r', 'login', 'ip', 'd', 'l', 'x', 'success');
    const r = res();
    routes['GET /api/audit/export/json']({}, r);
    expect(r.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(r.sent)).toHaveLength(1);
  });

  describe('POST /api/audit/clear-old', () => {
    it('rejects daysOld < 7 with 400', () => {
      const { routes } = harness();
      const r = res();
      routes['POST /api/audit/clear-old']({ body: { daysOld: 3 }, user: undefined, headers: {} }, r);
      expect(r.statusCode).toBe(400);
      expect(r.body.error).toMatch(/daysOld/);
    });

    it('clears old events and audits the action when valid', () => {
      const { routes, audit } = harness();
      const old = audit.logEvent('u', 'old', 'r', 'login', 'ip', 'd', 'l', 'x', 'success');
      old.timestamp = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days old
      const r = res();
      routes['POST /api/audit/clear-old'](
        { body: { daysOld: 30 }, user: { userId: 'ceo', username: 'ceo', role: 'ceo' }, headers: {} },
        r
      );
      expect(r.body.success).toBe(true);
      expect(r.body.deleted).toBe(1);
      // The clear action itself was audited (a config_change event remains).
      expect(audit.getEventsByType('config_change').length).toBe(1);
    });
  });

  it('GET /api/audit/search clamps a negative limit and applies filters', () => {
    const { routes, audit } = harness();
    for (let i = 0; i < 4; i++) audit.logEvent('u', 'alice', 'r', 'login', 'ip', 'd', 'l', 'x', 'success');
    audit.logEvent('u', 'bob', 'r', 'login', 'ip', 'd', 'l', 'x', 'success');
    const r = res();
    routes['GET /api/audit/search']({ query: { username: 'alice', limit: '-5000' } }, r);
    expect(r.body.success).toBe(true);
    expect(r.body.count).toBeLessThanOrEqual(1); // negative limit clamped to 1
  });
});

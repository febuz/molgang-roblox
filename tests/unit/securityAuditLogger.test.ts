import { AuditLogger } from '../../src/security/audit-logger';

/**
 * Unit tests for the advanced security AuditLogger (distinct from the auth
 * CEOAuditLogger). Covers event logging + defaults, per-user/resource queries,
 * brute-force alerting, compliance report, export, and the health score.
 *
 * Clock is pinned to a fixed daytime so the "unusual access time" alert
 * (fires when hour < 6 or > 23) doesn't make alert counts non-deterministic.
 */

describe('AuditLogger (security)', () => {
  let log: AuditLogger;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(2026, 5, 3, 12, 0, 0) }); // local noon -> hour 12
    log = new AuditLogger();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('logEvent', () => {
    it('records an event with defaults and returns it', () => {
      const e = log.logEvent('u1', 'read', 'treasury', 'success');
      expect(e.userId).toBe('u1');
      expect(e.action).toBe('read');
      expect(e.resource).toBe('treasury');
      expect(e.status).toBe('success');
      expect(e.ipAddress).toBe('unknown');
      expect(e.userAgent).toBe('unknown');
      expect(log.getUserAuditLog('u1')).toHaveLength(1);
    });

    it('captures optional details', () => {
      const e = log.logEvent('u1', 'update', 'config', 'success', {
        ipAddress: '1.1.1.1',
        userAgent: 'jest',
        changes: { a: 1 },
        description: 'changed a',
      });
      expect(e.ipAddress).toBe('1.1.1.1');
      expect(e.userAgent).toBe('jest');
      expect(e.changes).toEqual({ a: 1 });
      expect(e.details).toBe('changed a');
    });
  });

  describe('queries (most-recent-first)', () => {
    beforeEach(() => {
      log.logEvent('alice', 'login', 'auth', 'success');
      log.logEvent('bob', 'read', 'treasury', 'success');
      log.logEvent('alice', 'read', 'treasury', 'failure');
    });

    it('filters by user, newest first', () => {
      const a = log.getUserAuditLog('alice');
      expect(a).toHaveLength(2);
      expect(a[0].action).toBe('read'); // most recent alice event first
      expect(a[1].action).toBe('login');
    });

    it('filters by resource', () => {
      expect(log.getResourceAuditLog('treasury')).toHaveLength(2);
      expect(log.getResourceAuditLog('auth')).toHaveLength(1);
    });

    it('respects the limit', () => {
      expect(log.getUserAuditLog('alice', 1)).toHaveLength(1);
    });
  });

  describe('brute-force alerting', () => {
    it('raises a warning alert after >5 failed attempts of the same action', () => {
      for (let i = 0; i < 6; i++) log.logEvent('mallory', 'login', 'auth', 'failure');
      const alerts = log.getSecurityAlerts();
      const bf = alerts.find(a => a.type === 'brute-force-attempt');
      expect(bf).toBeDefined();
      expect(bf!.level).toBe('warning');
      expect(bf!.source).toBe('mallory');
    });

    it('does not alert below the threshold', () => {
      for (let i = 0; i < 4; i++) log.logEvent('mallory', 'login', 'auth', 'failure');
      expect(log.getSecurityAlerts().some(a => a.type === 'brute-force-attempt')).toBe(false);
    });

    it('filters alerts by level', () => {
      for (let i = 0; i < 6; i++) log.logEvent('mallory', 'login', 'auth', 'failure');
      expect(log.getSecurityAlerts('warning').length).toBeGreaterThan(0);
      expect(log.getSecurityAlerts('critical')).toHaveLength(0);
    });
  });

  describe('getComplianceReport', () => {
    it('summarises recent events and computes success rate', () => {
      log.logEvent('u1', 'a', 'r1', 'success');
      log.logEvent('u1', 'b', 'r2', 'success');
      log.logEvent('u2', 'a', 'r1', 'failure');
      const rep = log.getComplianceReport(30);
      expect(rep.totalEvents).toBe(3);
      expect(rep.successfulActions).toBe(2);
      expect(rep.failedActions).toBe(1);
      expect(rep.successRate).toBe('66.67');
      expect(rep.uniqueUsers).toBe(2);
      expect(rep.uniqueResources).toBe(2);
      expect(rep.topActions.a).toBe(2);
    });

    it('excludes events older than the window', () => {
      const old = log.logEvent('u1', 'a', 'r1', 'success');
      old.timestamp = new Date(2026, 0, 1); // far in the past vs pinned noon
      log.logEvent('u1', 'b', 'r2', 'success');
      const rep = log.getComplianceReport(30);
      expect(rep.totalEvents).toBe(1); // only the recent one
    });

    it('reports N/A success rate with no events', () => {
      expect(log.getComplianceReport(30).successRate).toBe('N/A');
    });
  });

  describe('exportAuditLog', () => {
    beforeEach(() => {
      log.logEvent('alice', 'login', 'auth', 'success', { ipAddress: '1.1.1.1' });
      log.logEvent('bob', 'read', 'treasury', 'failure');
    });

    it('exports valid JSON', () => {
      const parsed = JSON.parse(log.exportAuditLog('json'));
      expect(parsed).toHaveLength(2);
      expect(parsed[0].userId).toBe('alice');
    });

    it('exports CSV with header + one row per event', () => {
      const lines = log.exportAuditLog('csv').split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('timestamp,userId,action,resource,status,ipAddress');
      expect(lines[1]).toContain('alice');
    });
  });

  describe('getSecurityHealthScore', () => {
    it('is a perfect, secure score for an empty log', () => {
      const h = log.getSecurityHealthScore();
      expect(h.score).toBe(100);
      expect(h.status).toBe('secure');
      expect(h.alerts24h).toBe(0);
    });

    it('drops the score and status when the failure rate is high', () => {
      // 3 failures + 17 successes = 15% failure rate (>10%); distinct patterns
      // so no brute-force alerts -> score 100 -10 -15 = 75 ("at-risk").
      for (let i = 0; i < 17; i++) log.logEvent(`u${i}`, 'read', 'r', 'success');
      for (let i = 0; i < 3; i++) log.logEvent(`f${i}`, 'read', 'r', 'failure');
      const h = log.getSecurityHealthScore();
      expect(h.failureRate).toBe(15);
      expect(h.score).toBe(75);
      expect(h.status).toBe('at-risk');
    });
  });
});

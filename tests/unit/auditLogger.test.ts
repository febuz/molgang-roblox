import CEOAuditLogger, { AuditEvent } from '../../src/auth/audit-logger';

/**
 * Unit tests for CEOAuditLogger (backlog 6.5.11).
 *
 * Covers: event creation + defaults, severity inference, critical-event
 * callbacks, all query accessors, statistics, CSV/JSON export, retention
 * cleanup, and the security score heuristic.
 */

const IP = '10.0.0.1';
const DEV = 'device-a';
const LOC = 'Amsterdam';

/** Log a basic event, returning the stored (mutable) event reference. */
function log(
  audit: CEOAuditLogger,
  overrides: Partial<{
    userId: string;
    username: string;
    role: string;
    eventType: Parameters<CEOAuditLogger['logEvent']>[3];
    ip: string;
    outcome: 'success' | 'failure';
    options: Parameters<CEOAuditLogger['logEvent']>[9];
  }> = {}
): AuditEvent {
  return audit.logEvent(
    overrides.userId ?? 'u1',
    overrides.username ?? 'ceo',
    overrides.role ?? 'CEO',
    overrides.eventType ?? 'login',
    overrides.ip ?? IP,
    DEV,
    LOC,
    'test event',
    overrides.outcome ?? 'success',
    overrides.options
  );
}

describe('CEOAuditLogger', () => {
  let audit: CEOAuditLogger;

  beforeEach(() => {
    audit = new CEOAuditLogger();
  });

  describe('logEvent', () => {
    it('creates an event with a unique id, timestamp, and copied fields', () => {
      const e = log(audit);
      expect(e.id).toMatch(/^audit_\d+_[a-z0-9]+$/);
      expect(e.timestamp).toBeInstanceOf(Date);
      expect(e.username).toBe('ceo');
      expect(e.role).toBe('CEO');
      expect(e.eventType).toBe('login');
      expect(e.outcome).toBe('success');
      expect(audit.getAllEvents()).toHaveLength(1);
    });

    it('generates distinct ids for successive events', () => {
      const a = log(audit);
      const b = log(audit);
      expect(a.id).not.toBe(b.id);
    });

    it('carries optional fields (resource, action, details, durationMs)', () => {
      const e = log(audit, {
        options: { resource: 'treasury', action: 'read', details: { rows: 7 }, durationMs: 42 },
      });
      expect(e.resource).toBe('treasury');
      expect(e.action).toBe('read');
      expect(e.details).toEqual({ rows: 7 });
      expect(e.durationMs).toBe(42);
    });

    it('trims to the most recent 10000 events', () => {
      for (let i = 0; i < 10005; i++) {
        log(audit, { username: `user${i}` });
      }
      const all = audit.getAllEvents(20000);
      expect(all).toHaveLength(10000);
      // Oldest five should have been shifted out; newest retained.
      expect(all[all.length - 1].username).toBe('user10004');
      expect(all.find(e => e.username === 'user0')).toBeUndefined();
    });
  });

  describe('severity inference', () => {
    it('marks permission_escalation as critical', () => {
      expect(log(audit, { eventType: 'permission_escalation' }).severity).toBe('critical');
    });

    it('marks sensitive_data_access / user_delete / config_change / invalid_access as critical', () => {
      expect(log(audit, { eventType: 'sensitive_data_access' }).severity).toBe('critical');
      expect(log(audit, { eventType: 'user_delete' }).severity).toBe('critical');
      expect(log(audit, { eventType: 'config_change' }).severity).toBe('critical');
      expect(log(audit, { eventType: 'invalid_access', outcome: 'success' }).severity).toBe('critical');
    });

    it('marks a failed permission_denied as warning', () => {
      expect(log(audit, { eventType: 'permission_denied', outcome: 'failure' }).severity).toBe('warning');
    });

    it('defaults benign events to info', () => {
      expect(log(audit, { eventType: 'login' }).severity).toBe('info');
      expect(log(audit, { eventType: 'logout' }).severity).toBe('info');
    });

    it('honours an explicit severity override', () => {
      expect(log(audit, { eventType: 'login', options: { severity: 'critical' } }).severity).toBe('critical');
    });
  });

  describe('critical-event callbacks', () => {
    it('invokes registered callbacks for critical events only', () => {
      const cb = jest.fn();
      audit.onCriticalEvent(cb);
      log(audit, { eventType: 'login' }); // info — no call
      expect(cb).not.toHaveBeenCalled();
      const crit = log(audit, { eventType: 'user_delete' });
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith(crit);
    });

    it('isolates a throwing callback without breaking logging', () => {
      audit.onCriticalEvent(() => {
        throw new Error('boom');
      });
      const good = jest.fn();
      audit.onCriticalEvent(good);
      expect(() => log(audit, { eventType: 'config_change' })).not.toThrow();
      expect(good).toHaveBeenCalledTimes(1);
      expect(audit.getAllEvents()).toHaveLength(1);
    });
  });

  describe('query accessors', () => {
    beforeEach(() => {
      log(audit, { username: 'alice', eventType: 'login', ip: '1.1.1.1' });
      log(audit, { username: 'bob', eventType: 'logout', ip: '2.2.2.2' });
      log(audit, { username: 'alice', eventType: 'data_access', ip: '1.1.1.1' });
    });

    it('filters by user', () => {
      expect(audit.getEventsByUser('alice')).toHaveLength(2);
      expect(audit.getEventsByUser('bob')).toHaveLength(1);
      expect(audit.getEventsByUser('nobody')).toHaveLength(0);
    });

    it('filters by event type', () => {
      expect(audit.getEventsByType('login')).toHaveLength(1);
      expect(audit.getEventsByType('data_access')).toHaveLength(1);
    });

    it('filters by severity', () => {
      expect(audit.getEventsBySeverity('info')).toHaveLength(3);
      expect(audit.getEventsBySeverity('critical')).toHaveLength(0);
    });

    it('filters by IP', () => {
      expect(audit.getEventsByIP('1.1.1.1')).toHaveLength(2);
      expect(audit.getEventsByIP('2.2.2.2')).toHaveLength(1);
    });

    it('respects the limit argument (returns the most recent slice)', () => {
      const last = audit.getAllEvents(1);
      expect(last).toHaveLength(1);
      expect(last[0].username).toBe('alice');
      expect(last[0].eventType).toBe('data_access');
    });

    it('filters by time range', () => {
      const events = audit.getAllEvents();
      // Backdate the first event well into the past.
      events[0].timestamp = new Date('2000-01-01T00:00:00Z');
      const recent = audit.getEventsByTimeRange(new Date('2020-01-01T00:00:00Z'), new Date('2999-01-01T00:00:00Z'));
      expect(recent).toHaveLength(2);
      const old = audit.getEventsByTimeRange(new Date('1999-01-01T00:00:00Z'), new Date('2001-01-01T00:00:00Z'));
      expect(old).toHaveLength(1);
    });
  });

  describe('getStatistics', () => {
    it('aggregates counts by type, severity, user, outcome and unique sets', () => {
      log(audit, { username: 'alice', eventType: 'login', outcome: 'success', ip: '1.1.1.1' });
      log(audit, { username: 'alice', eventType: 'logout', outcome: 'success', ip: '1.1.1.1' });
      log(audit, { username: 'bob', eventType: 'login', outcome: 'failure', ip: '2.2.2.2' });

      const stats = audit.getStatistics();
      expect(stats.total_events).toBe(3);
      expect(stats.total_users).toBe(2);
      expect(stats.total_ips).toBe(2);
      expect(stats.by_type.login).toBe(2);
      expect(stats.by_type.logout).toBe(1);
      expect(stats.by_user.alice).toBe(2);
      expect(stats.by_outcome.success).toBe(2);
      expect(stats.by_outcome.failure).toBe(1);
    });

    it('flags IPs with >= 3 failed logins for brute-force detection', () => {
      for (let i = 0; i < 4; i++) log(audit, { eventType: 'login', outcome: 'failure', ip: '9.9.9.9' });
      for (let i = 0; i < 2; i++) log(audit, { eventType: 'login', outcome: 'failure', ip: '8.8.8.8' });

      const stats = audit.getStatistics();
      const flagged = stats.failed_logins_by_ip;
      expect(flagged).toEqual([{ ip: '9.9.9.9', count: 4 }]);
    });
  });

  describe('exports', () => {
    it('exports CSV with a header row and one row per event', () => {
      log(audit, { username: 'alice', eventType: 'login' });
      log(audit, { username: 'bob', eventType: 'logout' });
      const csv = audit.exportAsCSV();
      const lines = csv.split('\n');
      expect(lines).toHaveLength(3); // header + 2 events
      expect(lines[0]).toContain('Timestamp');
      expect(lines[0]).toContain('Outcome');
      expect(csv).toContain('"alice"');
      expect(csv).toContain('"bob"');
    });

    it('exports JSON that round-trips to the stored events', () => {
      log(audit, { username: 'alice' });
      const parsed = JSON.parse(audit.exportAsJSON());
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].username).toBe('alice');
    });
  });

  describe('clearOldEvents', () => {
    it('removes events older than the cutoff and reports the deleted count', () => {
      const old = log(audit, { username: 'old' });
      log(audit, { username: 'fresh' });
      old.timestamp = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000); // 40 days ago

      const deleted = audit.clearOldEvents(30);
      expect(deleted).toBe(1);
      const remaining = audit.getAllEvents();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].username).toBe('fresh');
    });

    it('deletes nothing when all events are within the window', () => {
      log(audit);
      log(audit);
      expect(audit.clearOldEvents(30)).toBe(0);
      expect(audit.getAllEvents()).toHaveLength(2);
    });
  });

  describe('getSecurityScore', () => {
    it('returns a perfect score for an empty log', () => {
      expect(audit.getSecurityScore()).toBe(100);
    });

    it('penalises failed logins (2 points each, capped at 30)', () => {
      for (let i = 0; i < 3; i++) log(audit, { eventType: 'login', outcome: 'failure' });
      expect(audit.getSecurityScore()).toBe(94); // 100 - 3*2
    });

    it('caps the failed-login penalty at 30', () => {
      for (let i = 0; i < 50; i++) log(audit, { eventType: 'login', outcome: 'failure' });
      expect(audit.getSecurityScore()).toBe(70); // 100 - 30
    });

    it('penalises invalid access attempts (3 points each, capped at 30)', () => {
      for (let i = 0; i < 2; i++) log(audit, { eventType: 'invalid_access' });
      expect(audit.getSecurityScore()).toBe(94); // 100 - 2*3
    });

    it('awards a small bonus for properly logged sensitive access', () => {
      // Drive the base score below 100 first so the bonus is observable.
      for (let i = 0; i < 50; i++) log(audit, { eventType: 'login', outcome: 'failure' }); // -30 => 70
      for (let i = 0; i < 4; i++) log(audit, { eventType: 'sensitive_data_access', outcome: 'success' }); // +2
      expect(audit.getSecurityScore()).toBe(72);
    });

    it('never returns below 0', () => {
      for (let i = 0; i < 50; i++) log(audit, { eventType: 'login', outcome: 'failure' });
      for (let i = 0; i < 50; i++) log(audit, { eventType: 'invalid_access' });
      for (let i = 0; i < 50; i++) log(audit, { eventType: 'permission_denied' });
      expect(audit.getSecurityScore()).toBe(30); // 100 -30 -30 -10, clamped components
    });
  });
});

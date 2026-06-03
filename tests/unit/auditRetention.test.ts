import CEOAuditLogger from '../../src/auth/audit-logger';
import { AuditRetentionScheduler, DEFAULT_AUDIT_RETENTION } from '../../src/auth/audit-retention';

/**
 * Unit tests for AuditRetentionScheduler (backlog 6.5.17).
 *
 * Uses fake timers to verify the periodic sweep, plus a real CEOAuditLogger
 * with backdated events to verify actual deletion behaviour.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Log an event and backdate its timestamp by `ageDays` days. */
function logAged(audit: CEOAuditLogger, ageDays: number) {
  const e = audit.logEvent('u', 'user', 'CEO', 'login', '1.1.1.1', 'dev', 'loc', 'x', 'success');
  e.timestamp = new Date(Date.now() - ageDays * DAY);
  return e;
}

describe('AuditRetentionScheduler', () => {
  let audit: CEOAuditLogger;

  beforeEach(() => {
    audit = new CEOAuditLogger();
  });

  describe('config validation', () => {
    it('applies defaults when no config is given', () => {
      const s = new AuditRetentionScheduler(audit);
      const status = s.getStatus();
      expect(status.retentionDays).toBe(DEFAULT_AUDIT_RETENTION.retentionDays);
      expect(status.intervalMs).toBe(DEFAULT_AUDIT_RETENTION.intervalMs);
    });

    it('rejects a non-positive retentionDays', () => {
      expect(() => new AuditRetentionScheduler(audit, { retentionDays: 0 })).toThrow(/retentionDays/);
      expect(() => new AuditRetentionScheduler(audit, { retentionDays: -5 })).toThrow(/retentionDays/);
    });

    it('rejects a non-positive intervalMs', () => {
      expect(() => new AuditRetentionScheduler(audit, { intervalMs: 0 })).toThrow(/intervalMs/);
    });
  });

  describe('runOnce', () => {
    it('purges events older than the retention window and reports the count', () => {
      logAged(audit, 100); // old
      logAged(audit, 95); // old
      logAged(audit, 10); // fresh
      const s = new AuditRetentionScheduler(audit, { retentionDays: 90 });

      const deleted = s.runOnce();
      expect(deleted).toBe(2);
      expect(audit.getAllEvents()).toHaveLength(1);
    });

    it('updates lastRun / lastDeleted / totalDeleted statistics', () => {
      logAged(audit, 100);
      const s = new AuditRetentionScheduler(audit, { retentionDays: 90 });

      expect(s.getStatus().lastRun).toBeNull();
      s.runOnce();
      let status = s.getStatus();
      expect(status.lastRun).toBeInstanceOf(Date);
      expect(status.lastDeleted).toBe(1);
      expect(status.totalDeleted).toBe(1);

      logAged(audit, 200);
      s.runOnce();
      status = s.getStatus();
      expect(status.lastDeleted).toBe(1);
      expect(status.totalDeleted).toBe(2); // accumulates across sweeps
    });
  });

  describe('scheduling', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('does not sweep on start unless runOnStart is set', () => {
      const spy = jest.spyOn(audit, 'clearOldEvents');
      const s = new AuditRetentionScheduler(audit, { intervalMs: DAY, runOnStart: false });
      s.start();
      expect(spy).not.toHaveBeenCalled();
      s.stop();
    });

    it('sweeps immediately when runOnStart is true', () => {
      const spy = jest.spyOn(audit, 'clearOldEvents');
      const s = new AuditRetentionScheduler(audit, { intervalMs: DAY, runOnStart: true });
      s.start();
      expect(spy).toHaveBeenCalledTimes(1);
      s.stop();
    });

    it('sweeps once per interval tick', () => {
      const spy = jest.spyOn(audit, 'clearOldEvents');
      const s = new AuditRetentionScheduler(audit, { intervalMs: 1000 });
      s.start();
      jest.advanceTimersByTime(3000);
      expect(spy).toHaveBeenCalledTimes(3);
      s.stop();
    });

    it('is idempotent — a second start() does not add a second timer', () => {
      const spy = jest.spyOn(audit, 'clearOldEvents');
      const s = new AuditRetentionScheduler(audit, { intervalMs: 1000 });
      s.start();
      s.start();
      jest.advanceTimersByTime(1000);
      expect(spy).toHaveBeenCalledTimes(1); // not 2
      s.stop();
    });

    it('stops sweeping after stop()', () => {
      const spy = jest.spyOn(audit, 'clearOldEvents');
      const s = new AuditRetentionScheduler(audit, { intervalMs: 1000 });
      s.start();
      jest.advanceTimersByTime(1000);
      s.stop();
      jest.advanceTimersByTime(5000);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(s.isRunning()).toBe(false);
    });

    it('keeps the interval alive when a sweep throws', () => {
      const spy = jest.spyOn(audit, 'clearOldEvents').mockImplementation(() => {
        throw new Error('sweep boom');
      });
      const s = new AuditRetentionScheduler(audit, { intervalMs: 1000 });
      s.start();
      expect(() => jest.advanceTimersByTime(2000)).not.toThrow();
      expect(spy).toHaveBeenCalledTimes(2); // survived the first throw
      s.stop();
    });
  });

  describe('isRunning / getStatus', () => {
    it('reflects running state across start and stop', () => {
      const s = new AuditRetentionScheduler(audit, { intervalMs: DAY });
      expect(s.isRunning()).toBe(false);
      s.start();
      expect(s.isRunning()).toBe(true);
      expect(s.getStatus().running).toBe(true);
      s.stop();
      expect(s.isRunning()).toBe(false);
    });
  });
});

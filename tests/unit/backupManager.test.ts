import { BackupManager } from '../../src/automation/backup-manager';

/**
 * Tests for the in-memory BackupManager (no real fs). createBackup completes
 * on a 5s setTimeout, so fake timers drive completion.
 */

describe('BackupManager', () => {
  let b: BackupManager;
  beforeEach(() => {
    jest.useFakeTimers();
    b = new BackupManager();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('createBackup', () => {
    it('starts in-progress and completes on the timer', () => {
      const bk = b.createBackup('neo4j', 'full');
      expect(bk.status).toBe('in-progress');
      expect(bk.restorePoint).toBe(true); // full backups are restore points
      jest.advanceTimersByTime(5000);
      const done = b.getBackupStatus(bk.id)!;
      expect(done.status).toBe('completed');
      expect(done.verified).toBe(true);
    });

    it('gives same-db rapid backups distinct ids (collision fix)', () => {
      const a = b.createBackup('neo4j', 'incremental');
      const c = b.createBackup('neo4j', 'incremental');
      expect(a.id).not.toBe(c.id);
      expect(b.getBackupHistory('neo4j')).toHaveLength(2);
    });
  });

  describe('restore', () => {
    it('refuses an in-progress (not-ready) backup', () => {
      const bk = b.createBackup('redis', 'snapshot');
      expect(b.restore(bk.id)).toEqual({ success: false, error: 'Backup not ready' });
    });

    it('succeeds once the backup is completed + verified', () => {
      const bk = b.createBackup('redis', 'snapshot');
      jest.advanceTimersByTime(5000);
      const r = b.restore(bk.id);
      expect(r.success).toBe(true);
      expect(r.database).toBe('redis');
      expect(r.restoreId).toMatch(/^restore_/);
    });

    it('returns not-ready for an unknown backup', () => {
      expect(b.restore('nope').success).toBe(false);
    });
  });

  describe('recovery plans', () => {
    it('seeds 3 recovery plans', () => {
      expect(b.getAllRecoveryPlans()).toHaveLength(3);
      expect(b.getRecoveryPlan('recovery-neo4j')?.rto).toBe(15);
      expect(b.getRecoveryPlan('nope')).toBeNull();
    });

    it('testRecoveryPlan runs a known plan, errors on unknown', () => {
      expect(b.testRecoveryPlan('recovery-redis').status).toBe('running');
      expect(b.testRecoveryPlan('nope')).toEqual({ success: false, error: 'Plan not found' });
    });

    it('disaster-recovery status flags the stale (90d) plan as needing testing', () => {
      const s = b.getDisasterRecoveryStatus();
      expect(s.status).toBe('testing-needed');
      expect(s.recoveryPlans).toBe(3);
      expect(s.plansNeedingTest).toContain('Full System Recovery');
      expect(s.overallReadiness).toBe(67); // 2 of 3 plans tested
    });
  });

  describe('statistics + cleanup', () => {
    it('aggregates backup statistics by database', () => {
      b.createBackup('neo4j', 'full');
      b.createBackup('redis', 'full');
      b.createBackup('neo4j', 'incremental');
      const s = b.getBackupStatistics();
      expect(s.totalBackups).toBe(3);
      expect(s.byDatabase.neo4j).toBe(2);
      expect(s.byDatabase.redis).toBe(1);
      expect(s.retentionCompliance).toBe(true); // all 30d-future
      expect(s.totalSize).toBeGreaterThan(0);
    });

    it('cleanupOldBackups removes only past-retention backups', () => {
      const keep = b.createBackup('neo4j', 'full');
      const expired = b.createBackup('redis', 'full');
      expired.retention = new Date(Date.now() - 1000); // past retention
      expect(b.cleanupOldBackups()).toBe(1);
      expect(b.getBackupStatus(keep.id)).not.toBeNull();
      expect(b.getBackupStatus(expired.id)).toBeNull();
    });
  });
});

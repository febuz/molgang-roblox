/**
 * Audit Log Retention Scheduler (backlog 6.5.17)
 *
 * Periodically purges audit events older than a configured window using the
 * CEOAuditLogger's existing clearOldEvents(). Keeps the in-memory event buffer
 * bounded over long uptimes and enforces a data-retention policy.
 *
 * The interval timer is unref()'d so it never keeps the Node process alive on
 * its own — cleanup is best-effort background hygiene, not a reason to stay up.
 */

import CEOAuditLogger from './audit-logger';
import logger from '../utils/logger';

export interface AuditRetentionConfig {
  /** Events older than this many days are purged on each sweep. */
  retentionDays: number;
  /** How often to run a sweep, in milliseconds. */
  intervalMs: number;
  /** Run one sweep immediately when start() is called. */
  runOnStart: boolean;
}

export const DEFAULT_AUDIT_RETENTION: AuditRetentionConfig = {
  retentionDays: 90,
  intervalMs: 24 * 60 * 60 * 1000, // daily
  runOnStart: false,
};

export interface AuditRetentionStatus {
  running: boolean;
  retentionDays: number;
  intervalMs: number;
  lastRun: Date | null;
  lastDeleted: number;
  totalDeleted: number;
}

export class AuditRetentionScheduler {
  private timer?: ReturnType<typeof setInterval>;
  private readonly config: AuditRetentionConfig;
  private lastRun: Date | null = null;
  private lastDeleted = 0;
  private totalDeleted = 0;

  constructor(private readonly auditLogger: CEOAuditLogger, config: Partial<AuditRetentionConfig> = {}) {
    this.config = { ...DEFAULT_AUDIT_RETENTION, ...config };
    if (!Number.isFinite(this.config.retentionDays) || this.config.retentionDays <= 0) {
      throw new Error('AuditRetentionScheduler: retentionDays must be a positive number');
    }
    if (!Number.isFinite(this.config.intervalMs) || this.config.intervalMs <= 0) {
      throw new Error('AuditRetentionScheduler: intervalMs must be a positive number');
    }
  }

  /**
   * Run a single retention sweep. Returns the number of events deleted and
   * updates the running statistics. Safe to call manually (e.g. via an admin
   * endpoint) independent of the scheduled interval.
   */
  runOnce(): number {
    const deleted = this.auditLogger.clearOldEvents(this.config.retentionDays);
    this.lastRun = new Date();
    this.lastDeleted = deleted;
    this.totalDeleted += deleted;
    return deleted;
  }

  /**
   * Start the periodic sweep. Idempotent — calling start() while already
   * running is a no-op (the existing timer is left in place).
   */
  start(): void {
    if (this.timer) return;
    if (this.config.runOnStart) {
      this.safeSweep();
    }
    this.timer = setInterval(() => this.safeSweep(), this.config.intervalMs);
    // Do not let the cleanup timer alone hold the process open.
    if (typeof (this.timer as any).unref === 'function') {
      (this.timer as any).unref();
    }
    logger.info(
      `✓ Audit retention scheduler started — sweep every ${this.config.intervalMs}ms, ` +
        `keep last ${this.config.retentionDays} days`
    );
  }

  /** Stop the periodic sweep. Idempotent. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
      logger.info('✓ Audit retention scheduler stopped');
    }
  }

  isRunning(): boolean {
    return this.timer !== undefined;
  }

  getStatus(): AuditRetentionStatus {
    return {
      running: this.isRunning(),
      retentionDays: this.config.retentionDays,
      intervalMs: this.config.intervalMs,
      lastRun: this.lastRun,
      lastDeleted: this.lastDeleted,
      totalDeleted: this.totalDeleted,
    };
  }

  /** Run a sweep, swallowing errors so a bad sweep never kills the interval. */
  private safeSweep(): void {
    try {
      this.runOnce();
    } catch (error) {
      logger.error('Audit retention sweep failed:', error);
    }
  }
}

export default AuditRetentionScheduler;

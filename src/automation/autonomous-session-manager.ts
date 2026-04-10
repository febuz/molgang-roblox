/**
 * Autonomous Session Manager
 *
 * Enforces continuous work patterns to prevent invisible stalls
 * Monitors: commit frequency, progress output, task updates, context size
 */

import logger from '../utils/logger';

export interface SessionConfig {
  sessionDuration: number; // minutes
  phaseLength: number; // 15-30 min per phase
  commitMinFrequency: number; // min per commit (should be 10 or less)
  outputFrequency: number; // min between progress reports (should be 5)
  contextLimitTokens: number; // 150k triggers /compact
  compactThreshold: number; // 140k triggers warning
  staleCheckInterval: number; // check every N seconds
  maxSilenceDuration: number; // 5 min = 300000 ms
}

export interface WorkSession {
  id: string;
  startTime: Date;
  sessionConfig: SessionConfig;
  status: 'running' | 'paused' | 'completed' | 'stalled';
  phasesCompleted: number;
  commits: SessionCommit[];
  taskUpdates: SessionTaskUpdate[];
  progressReports: SessionProgressReport[];
  warnings: SessionWarning[];
  contextTokens: number;
}

export interface SessionCommit {
  timestamp: Date;
  message: string;
  hash: string;
  filesChanged: number;
  linesAdded: number;
}

export interface SessionTaskUpdate {
  timestamp: Date;
  taskId: string;
  status: string;
  activeForm: string;
}

export interface SessionProgressReport {
  timestamp: Date;
  phase: number;
  title: string;
  whatBuilt: string[];
  nextActions: string[];
  timeElapsed: number;
  estimatedRemaining: number;
}

export interface SessionWarning {
  timestamp: Date;
  type: 'context_high' | 'no_commit' | 'silent' | 'no_output' | 'stalled';
  severity: 'warning' | 'critical';
  message: string;
  action: string;
}

export class AutonomousSessionManager {
  private session: WorkSession | null = null;
  private checkInterval?: ReturnType<typeof setInterval>;

  /**
   * Start new autonomous work session
   */
  startSession(duration: number, config?: Partial<SessionConfig>): WorkSession {
    const sessionConfig: SessionConfig = {
      sessionDuration: duration,
      phaseLength: 20,
      commitMinFrequency: 10,
      outputFrequency: 5,
      contextLimitTokens: 150000,
      compactThreshold: 140000,
      staleCheckInterval: 10000, // Check every 10 seconds
      maxSilenceDuration: 300000, // 5 minutes
      ...config
    };

    this.session = {
      id: `session_${Date.now()}`,
      startTime: new Date(),
      sessionConfig,
      status: 'running',
      phasesCompleted: 0,
      commits: [],
      taskUpdates: [],
      progressReports: [],
      warnings: [],
      contextTokens: 0
    };

    logger.info(`
╔════════════════════════════════════════════════════╗
║   AUTONOMOUS SESSION STARTED                       ║
╠════════════════════════════════════════════════════╣
║  Duration: ${duration} minutes                          ║
║  Phase Length: ${sessionConfig.phaseLength} minutes         ║
║  Commit Frequency: Every ${sessionConfig.commitMinFrequency} min max  ║
║  Output Frequency: Every ${sessionConfig.outputFrequency} min max  ║
║  Stall Detection: ${sessionConfig.maxSilenceDuration / 1000}s silence limit ║
╚════════════════════════════════════════════════════╝
    `);

    // Start stall detection
    this.startStallDetection();

    return this.session;
  }

  /**
   * Record a git commit
   */
  recordCommit(message: string, hash: string, filesChanged: number, linesAdded: number): void {
    if (!this.session) {
      logger.warn('No active session for commit recording');
      return;
    }

    const commit: SessionCommit = {
      timestamp: new Date(),
      message,
      hash,
      filesChanged,
      linesAdded
    };

    this.session.commits.push(commit);

    // Check commit frequency
    const lastCommit = this.session.commits[this.session.commits.length - 2];
    if (lastCommit) {
      const minutesSinceLastCommit = (commit.timestamp.getTime() - lastCommit.timestamp.getTime()) / 60000;
      if (minutesSinceLastCommit > this.session.sessionConfig.commitMinFrequency) {
        this.addWarning(
          'no_commit',
          'warning',
          `${minutesSinceLastCommit.toFixed(1)} min since last commit (max: ${this.session.sessionConfig.commitMinFrequency})`,
          'Increase commit frequency - should commit every 10 min max'
        );
      }
    }

    logger.info(`✅ Commit recorded: "${message}" (+${linesAdded} lines, ${filesChanged} files)`);
  }

  /**
   * Record task status update
   */
  recordTaskUpdate(taskId: string, status: string, activeForm: string): void {
    if (!this.session) return;

    this.session.taskUpdates.push({
      timestamp: new Date(),
      taskId,
      status,
      activeForm
    });

    logger.info(`📝 Task updated: ${taskId} → ${status}`);
  }

  /**
   * Record progress report
   */
  recordProgressReport(
    phase: number,
    title: string,
    whatBuilt: string[],
    nextActions: string[]
  ): void {
    if (!this.session) return;

    const timeElapsed = (Date.now() - this.session.startTime.getTime()) / 60000;
    const estimatedRemaining = this.session.sessionConfig.sessionDuration - timeElapsed;

    const report: SessionProgressReport = {
      timestamp: new Date(),
      phase,
      title,
      whatBuilt,
      nextActions,
      timeElapsed,
      estimatedRemaining
    };

    this.session.progressReports.push(report);
    this.session.phasesCompleted = phase;

    logger.info(`
✅ PHASE ${phase} COMPLETE - ${title}
Time: ${timeElapsed.toFixed(0)}/${this.session.sessionConfig.sessionDuration} min

What Built:
${whatBuilt.map(w => `  • ${w}`).join('\n')}

Next:
${nextActions.map(n => `  • ${n}`).join('\n')}
    `);
  }

  /**
   * Update context token count (simulate from LLM provider)
   */
  updateContextTokens(tokens: number): void {
    if (!this.session) return;

    this.session.contextTokens = tokens;

    if (tokens >= this.session.sessionConfig.contextLimitTokens) {
      this.addWarning(
        'context_high',
        'critical',
        `Context at ${tokens} tokens (limit: ${this.session.sessionConfig.contextLimitTokens})`,
        'IMMEDIATELY run /compact to reset context'
      );
    } else if (tokens >= this.session.sessionConfig.compactThreshold) {
      this.addWarning(
        'context_high',
        'warning',
        `Context approaching limit: ${tokens} tokens`,
        'Consider running /compact soon'
      );
    }
  }

  /**
   * Start periodic stall detection
   */
  private startStallDetection(): void {
    if (!this.session) return;

    this.checkInterval = setInterval(() => {
      if (!this.session || this.session.status !== 'running') return;

      const now = Date.now();
      const sessionDuration = this.session.sessionConfig.sessionDuration * 60000;

      // Check session complete
      if (now - this.session.startTime.getTime() >= sessionDuration) {
        this.session.status = 'completed';
        this.completeSession();
        return;
      }

      // Check for stalls
      const lastActivity = this.getLastActivityTime();
      const silenceDuration = now - lastActivity;

      if (silenceDuration > this.session.sessionConfig.maxSilenceDuration) {
        this.session.status = 'stalled';
        this.addWarning(
          'silent',
          'critical',
          `${(silenceDuration / 1000).toFixed(0)}s of silence (max: ${this.session.sessionConfig.maxSilenceDuration / 1000}s)`,
          'Session stalled! Resume work immediately or investigate blocker.'
        );

        // Alert operator
        logger.error(`⚠️  STALL DETECTED: ${(silenceDuration / 1000).toFixed(0)}s silence`);
      }

      // Check output frequency
      const lastReport = this.session.progressReports[this.session.progressReports.length - 1];
      if (lastReport) {
        const minutesSinceReport = (now - lastReport.timestamp.getTime()) / 60000;
        if (minutesSinceReport > this.session.sessionConfig.outputFrequency + 5) {
          this.addWarning(
            'no_output',
            'warning',
            `${minutesSinceReport.toFixed(1)} min since last report`,
            'Output progress every 5 minutes'
          );
        }
      }

      // Check commit frequency
      const lastCommit = this.session.commits[this.session.commits.length - 1];
      if (lastCommit) {
        const minutesSinceCommit = (now - lastCommit.timestamp.getTime()) / 60000;
        if (minutesSinceCommit > this.session.sessionConfig.commitMinFrequency + 2) {
          this.addWarning(
            'no_commit',
            'warning',
            `${minutesSinceCommit.toFixed(1)} min since last commit`,
            'Commit every 10 minutes maximum'
          );
        }
      }
    }, this.session.sessionConfig.staleCheckInterval);
  }

  /**
   * Get last activity time (commit, update, or report)
   */
  private getLastActivityTime(): number {
    if (!this.session) return Date.now();

    const times = [
      this.session.commits[this.session.commits.length - 1]?.timestamp.getTime(),
      this.session.taskUpdates[this.session.taskUpdates.length - 1]?.timestamp.getTime(),
      this.session.progressReports[this.session.progressReports.length - 1]?.timestamp.getTime()
    ].filter(t => t !== undefined) as number[];

    return times.length > 0 ? Math.max(...times) : this.session.startTime.getTime();
  }

  /**
   * Add warning
   */
  private addWarning(
    type: SessionWarning['type'],
    severity: 'warning' | 'critical',
    message: string,
    action: string
  ): void {
    if (!this.session) return;

    // Avoid duplicate warnings
    const exists = this.session.warnings.some(
      w => w.type === type && w.timestamp.getTime() > Date.now() - 60000 // Same type in last minute
    );

    if (!exists) {
      this.session.warnings.push({
        timestamp: new Date(),
        type,
        severity,
        message,
        action
      });

      const emoji = severity === 'critical' ? '🚨' : '⚠️';
      logger.warn(`${emoji} ${message} → ${action}`);
    }
  }

  /**
   * Complete session
   */
  private completeSession(): void {
    if (!this.session) return;

    if (this.checkInterval) clearInterval(this.checkInterval);

    const duration = (Date.now() - this.session.startTime.getTime()) / 60000;
    const totalLines = this.session.commits.reduce((sum, c) => sum + c.linesAdded, 0);

    logger.info(`
╔════════════════════════════════════════════════════╗
║   AUTONOMOUS SESSION COMPLETE                      ║
╠════════════════════════════════════════════════════╣
║  Duration: ${duration.toFixed(1)} / ${this.session.sessionConfig.sessionDuration} minutes     ║
║  Phases: ${this.session.phasesCompleted}                               ║
║  Commits: ${this.session.commits.length}                              ║
║  Task Updates: ${this.session.taskUpdates.length}                     ║
║  Lines Added: ${totalLines}                         ║
║  Warnings: ${this.session.warnings.filter(w => w.severity === 'critical').length} critical      ║
╚════════════════════════════════════════════════════╝
    `);

    // Final report
    if (this.session.warnings.filter(w => w.severity === 'critical').length > 0) {
      logger.warn('⚠️  Review critical warnings above');
    }
  }

  /**
   * Get session stats
   */
  getStats(): Record<string, any> {
    if (!this.session) return {};

    const duration = (Date.now() - this.session.startTime.getTime()) / 60000;
    const totalLines = this.session.commits.reduce((sum, c) => sum + c.linesAdded, 0);
    const avgLinePerCommit = this.session.commits.length > 0 ? totalLines / this.session.commits.length : 0;

    return {
      session_id: this.session.id,
      status: this.session.status,
      duration_min: duration.toFixed(1),
      phases_completed: this.session.phasesCompleted,
      commits: this.session.commits.length,
      task_updates: this.session.taskUpdates.length,
      progress_reports: this.session.progressReports.length,
      total_lines_added: totalLines,
      avg_lines_per_commit: avgLinePerCommit.toFixed(0),
      context_tokens: this.session.contextTokens,
      warnings_critical: this.session.warnings.filter(w => w.severity === 'critical').length,
      warnings_total: this.session.warnings.length,
      commits_per_phase: this.session.phasesCompleted > 0
        ? (this.session.commits.length / this.session.phasesCompleted).toFixed(1)
        : 0,
      time_per_phase_min: this.session.phasesCompleted > 0
        ? (duration / this.session.phasesCompleted).toFixed(1)
        : 0
    };
  }

  /**
   * Get warnings
   */
  getWarnings(): SessionWarning[] {
    return this.session?.warnings || [];
  }

  /**
   * Stop session
   */
  stop(): void {
    if (this.checkInterval) clearInterval(this.checkInterval);
    if (this.session) {
      this.session.status = 'paused';
    }
  }
}

export default AutonomousSessionManager;

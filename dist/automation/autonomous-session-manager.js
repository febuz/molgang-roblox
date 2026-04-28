"use strict";
/**
 * Autonomous Session Manager
 *
 * Enforces continuous work patterns to prevent invisible stalls
 * Monitors: commit frequency, progress output, task updates, context size
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomousSessionManager = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class AutonomousSessionManager {
    constructor() {
        this.session = null;
    }
    /**
     * Start new autonomous work session
     */
    startSession(duration, config) {
        const sessionConfig = {
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
        logger_1.default.info(`
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
    recordCommit(message, hash, filesChanged, linesAdded) {
        if (!this.session) {
            logger_1.default.warn('No active session for commit recording');
            return;
        }
        const commit = {
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
                this.addWarning('no_commit', 'warning', `${minutesSinceLastCommit.toFixed(1)} min since last commit (max: ${this.session.sessionConfig.commitMinFrequency})`, 'Increase commit frequency - should commit every 10 min max');
            }
        }
        logger_1.default.info(`✅ Commit recorded: "${message}" (+${linesAdded} lines, ${filesChanged} files)`);
    }
    /**
     * Record task status update
     */
    recordTaskUpdate(taskId, status, activeForm) {
        if (!this.session)
            return;
        this.session.taskUpdates.push({
            timestamp: new Date(),
            taskId,
            status,
            activeForm
        });
        logger_1.default.info(`📝 Task updated: ${taskId} → ${status}`);
    }
    /**
     * Record progress report
     */
    recordProgressReport(phase, title, whatBuilt, nextActions) {
        if (!this.session)
            return;
        const timeElapsed = (Date.now() - this.session.startTime.getTime()) / 60000;
        const estimatedRemaining = this.session.sessionConfig.sessionDuration - timeElapsed;
        const report = {
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
        logger_1.default.info(`
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
    updateContextTokens(tokens) {
        if (!this.session)
            return;
        this.session.contextTokens = tokens;
        if (tokens >= this.session.sessionConfig.contextLimitTokens) {
            this.addWarning('context_high', 'critical', `Context at ${tokens} tokens (limit: ${this.session.sessionConfig.contextLimitTokens})`, 'IMMEDIATELY run /compact to reset context');
        }
        else if (tokens >= this.session.sessionConfig.compactThreshold) {
            this.addWarning('context_high', 'warning', `Context approaching limit: ${tokens} tokens`, 'Consider running /compact soon');
        }
    }
    /**
     * Start periodic stall detection
     */
    startStallDetection() {
        if (!this.session)
            return;
        this.checkInterval = setInterval(() => {
            if (!this.session || this.session.status !== 'running')
                return;
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
                this.addWarning('silent', 'critical', `${(silenceDuration / 1000).toFixed(0)}s of silence (max: ${this.session.sessionConfig.maxSilenceDuration / 1000}s)`, 'Session stalled! Resume work immediately or investigate blocker.');
                // Alert operator
                logger_1.default.error(`⚠️  STALL DETECTED: ${(silenceDuration / 1000).toFixed(0)}s silence`);
            }
            // Check output frequency
            const lastReport = this.session.progressReports[this.session.progressReports.length - 1];
            if (lastReport) {
                const minutesSinceReport = (now - lastReport.timestamp.getTime()) / 60000;
                if (minutesSinceReport > this.session.sessionConfig.outputFrequency + 5) {
                    this.addWarning('no_output', 'warning', `${minutesSinceReport.toFixed(1)} min since last report`, 'Output progress every 5 minutes');
                }
            }
            // Check commit frequency
            const lastCommit = this.session.commits[this.session.commits.length - 1];
            if (lastCommit) {
                const minutesSinceCommit = (now - lastCommit.timestamp.getTime()) / 60000;
                if (minutesSinceCommit > this.session.sessionConfig.commitMinFrequency + 2) {
                    this.addWarning('no_commit', 'warning', `${minutesSinceCommit.toFixed(1)} min since last commit`, 'Commit every 10 minutes maximum');
                }
            }
        }, this.session.sessionConfig.staleCheckInterval);
    }
    /**
     * Get last activity time (commit, update, or report)
     */
    getLastActivityTime() {
        if (!this.session)
            return Date.now();
        const times = [
            this.session.commits[this.session.commits.length - 1]?.timestamp.getTime(),
            this.session.taskUpdates[this.session.taskUpdates.length - 1]?.timestamp.getTime(),
            this.session.progressReports[this.session.progressReports.length - 1]?.timestamp.getTime()
        ].filter(t => t !== undefined);
        return times.length > 0 ? Math.max(...times) : this.session.startTime.getTime();
    }
    /**
     * Add warning
     */
    addWarning(type, severity, message, action) {
        if (!this.session)
            return;
        // Avoid duplicate warnings
        const exists = this.session.warnings.some(w => w.type === type && w.timestamp.getTime() > Date.now() - 60000 // Same type in last minute
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
            logger_1.default.warn(`${emoji} ${message} → ${action}`);
        }
    }
    /**
     * Complete session
     */
    completeSession() {
        if (!this.session)
            return;
        if (this.checkInterval)
            clearInterval(this.checkInterval);
        const duration = (Date.now() - this.session.startTime.getTime()) / 60000;
        const totalLines = this.session.commits.reduce((sum, c) => sum + c.linesAdded, 0);
        logger_1.default.info(`
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
            logger_1.default.warn('⚠️  Review critical warnings above');
        }
    }
    /**
     * Get session stats
     */
    getStats() {
        if (!this.session)
            return {};
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
    getWarnings() {
        return this.session?.warnings || [];
    }
    /**
     * Stop session
     */
    stop() {
        if (this.checkInterval)
            clearInterval(this.checkInterval);
        if (this.session) {
            this.session.status = 'paused';
        }
    }
}
exports.AutonomousSessionManager = AutonomousSessionManager;
exports.default = AutonomousSessionManager;
//# sourceMappingURL=autonomous-session-manager.js.map
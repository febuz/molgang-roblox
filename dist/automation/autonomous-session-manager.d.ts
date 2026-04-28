/**
 * Autonomous Session Manager
 *
 * Enforces continuous work patterns to prevent invisible stalls
 * Monitors: commit frequency, progress output, task updates, context size
 */
export interface SessionConfig {
    sessionDuration: number;
    phaseLength: number;
    commitMinFrequency: number;
    outputFrequency: number;
    contextLimitTokens: number;
    compactThreshold: number;
    staleCheckInterval: number;
    maxSilenceDuration: number;
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
export declare class AutonomousSessionManager {
    private session;
    private checkInterval?;
    /**
     * Start new autonomous work session
     */
    startSession(duration: number, config?: Partial<SessionConfig>): WorkSession;
    /**
     * Record a git commit
     */
    recordCommit(message: string, hash: string, filesChanged: number, linesAdded: number): void;
    /**
     * Record task status update
     */
    recordTaskUpdate(taskId: string, status: string, activeForm: string): void;
    /**
     * Record progress report
     */
    recordProgressReport(phase: number, title: string, whatBuilt: string[], nextActions: string[]): void;
    /**
     * Update context token count (simulate from LLM provider)
     */
    updateContextTokens(tokens: number): void;
    /**
     * Start periodic stall detection
     */
    private startStallDetection;
    /**
     * Get last activity time (commit, update, or report)
     */
    private getLastActivityTime;
    /**
     * Add warning
     */
    private addWarning;
    /**
     * Complete session
     */
    private completeSession;
    /**
     * Get session stats
     */
    getStats(): Record<string, any>;
    /**
     * Get warnings
     */
    getWarnings(): SessionWarning[];
    /**
     * Stop session
     */
    stop(): void;
}
export default AutonomousSessionManager;
//# sourceMappingURL=autonomous-session-manager.d.ts.map
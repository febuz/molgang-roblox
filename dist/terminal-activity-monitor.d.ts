/**
 * Terminal Activity Monitor
 * Tracks activities from both Terminal A (Alexander) and Terminal B (Cleopatra)
 * Integrates: Kafka messages, Selenium actions, approval prompts
 */
interface TerminalActivity {
    timestamp: string;
    terminal: 'A' | 'B';
    type: 'task' | 'approval' | 'action' | 'status' | 'error';
    agent: string;
    title: string;
    description?: string;
    priority?: 'critical' | 'high' | 'medium' | 'low';
    status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
    details?: any;
}
interface TerminalStatus {
    terminal: 'A' | 'B';
    agent: string;
    isActive: boolean;
    lastActivity: string;
    compactionNeeded: boolean;
    contextTokens: number;
    messageCount: number;
}
export declare class TerminalActivityMonitor {
    private activities;
    private terminalStatus;
    private maxActivities;
    constructor();
    private initializeTerminals;
    /**
     * Log an activity from either terminal
     */
    logActivity(terminal: 'A' | 'B', activity: Omit<TerminalActivity, 'timestamp' | 'terminal'>): TerminalActivity;
    /**
     * Log Kafka message activity
     */
    logKafkaMessage(terminal: 'A' | 'B', topic: string, message: any): TerminalActivity;
    /**
     * Log Selenium action
     */
    logSeleniumAction(terminal: 'A' | 'B', action: string, details: any): TerminalActivity;
    /**
     * Log approval prompt
     */
    logApprovalPrompt(terminal: 'A' | 'B', question: string, options: string[]): TerminalActivity;
    /**
     * Update context token count
     */
    updateContextTokens(terminal: 'A' | 'B', tokenCount: number): void;
    /**
     * Check if compaction is needed
     */
    isCompactionNeeded(terminal: 'A' | 'B'): boolean;
    /**
     * Get all activities
     */
    getActivities(limit?: number): TerminalActivity[];
    /**
     * Get activities for specific terminal
     */
    getTerminalActivities(terminal: 'A' | 'B', limit?: number): TerminalActivity[];
    /**
     * Get terminal status
     */
    getTerminalStatus(terminal?: 'A' | 'B'): TerminalStatus | Map<string, TerminalStatus>;
    /**
     * Update terminal status
     */
    private updateTerminalStatus;
    /**
     * Get high-priority activities (approvals, critical tasks)
     */
    getHighPriorityActivities(limit?: number): TerminalActivity[];
    /**
     * Get activity summary by terminal
     */
    getSummary(): {
        totalActivities: number;
        terminalA: {
            status: TerminalStatus | undefined;
            activities: number;
            highPriority: number;
        };
        terminalB: {
            status: TerminalStatus | undefined;
            activities: number;
            highPriority: number;
        };
    };
    /**
     * Setup message listeners (stub for future Kafka integration)
     */
    private setupMessageListeners;
}
export declare const activityMonitor: TerminalActivityMonitor;
export {};
//# sourceMappingURL=terminal-activity-monitor.d.ts.map
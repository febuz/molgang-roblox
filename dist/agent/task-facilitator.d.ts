/**
 * Task Facilitator - Prevents tasks from hanging
 *
 * Ensures continuous agent work by:
 * - Actively distributing pending tasks
 * - Breaking blocked tasks into sub-tasks
 * - Escalating overdue tasks
 * - Maintaining workload balance
 */
export interface FacilitatorConfig {
    maxTasksPerAgent: number;
    taskTimeoutMs: number;
    blockageCheckIntervalMs: number;
    rebalanceIntervalMs: number;
    escalationThresholdMs: number;
}
export interface TaskFacilitation {
    task_id: string;
    agent: string;
    status: 'pending' | 'assigned' | 'executing' | 'blocked' | 'escalated';
    priority: number;
    assigned_at?: Date;
    started_at?: Date;
    last_activity?: Date;
    blocked_by?: string[];
    subtasks?: string[];
    time_elapsed_ms: number;
}
export declare class TaskFacilitator {
    private config;
    private facilitations;
    private agentWorkload;
    private blockageCheckInterval?;
    private rebalanceInterval?;
    constructor(config?: Partial<FacilitatorConfig>);
    /**
     * Initialize agent workload tracking
     */
    private initializeAgents;
    /**
     * Register a new task for facilitation
     */
    registerTask(taskId: string, agent: string, priority?: number): TaskFacilitation;
    /**
     * Mark task as assigned to agent
     */
    assignTask(taskId: string, agent: string): boolean;
    /**
     * Mark task as executing
     */
    startTask(taskId: string): boolean;
    /**
     * Update task activity (prevent timeout)
     */
    updateActivity(taskId: string): void;
    /**
     * Mark task as completed
     */
    completeTask(taskId: string): boolean;
    /**
     * Mark task as blocked by other task(s)
     */
    blockTask(taskId: string, blockedBy: string[]): void;
    /**
     * Unblock task when dependency is resolved
     */
    unblockTask(taskId: string): void;
    /**
     * Check for hanging/blocked tasks every 10 seconds
     */
    private startBlockageChecker;
    /**
     * Reassign overdue task to less-loaded agent
     */
    private reassignOverdueTask;
    /**
     * Escalate task to Fill (CEO)
     */
    private escalateTask;
    /**
     * Find least-loaded agent
     */
    private findLessLoadedAgent;
    /**
     * Rebalance workload every 30 seconds
     */
    private startRebalancer;
    /**
     * Rebalance task distribution
     */
    private rebalanceWorkload;
    /**
     * Get task status
     */
    getTaskStatus(taskId: string): TaskFacilitation | undefined;
    /**
     * Get agent workload
     */
    getAgentWorkload(): Record<string, {
        current: number;
        max: number;
        availability: number;
    }>;
    /**
     * Get all pending/active tasks
     */
    getPendingTasks(): TaskFacilitation[];
    /**
     * Get blocked tasks
     */
    getBlockedTasks(): TaskFacilitation[];
    /**
     * Get escalated tasks
     */
    getEscalatedTasks(): TaskFacilitation[];
    /**
     * Get facilitation statistics
     */
    getStats(): Record<string, any>;
    /**
     * Stop facilitator
     */
    stop(): void;
}
export default TaskFacilitator;
//# sourceMappingURL=task-facilitator.d.ts.map
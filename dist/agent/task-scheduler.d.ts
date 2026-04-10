/**
 * Advanced Task Scheduler
 * Intelligent task routing, scheduling, and execution
 */
interface Task {
    id: string;
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    assignedTo: string;
    dependencies: string[];
    estimatedTime: number;
    deadline: Date;
    status: 'pending' | 'scheduled' | 'running' | 'completed' | 'failed';
    createdAt: Date;
    completedAt?: Date;
    result?: any;
}
export declare class TaskScheduler {
    private tasks;
    private schedule;
    private agentWorkload;
    constructor();
    /**
     * Schedule a new task
     */
    scheduleTask(task: Omit<Task, 'id' | 'status' | 'createdAt'>): Task;
    /**
     * Find best agent for task
     */
    private findBestAgent;
    /**
     * Get task status
     */
    getTaskStatus(taskId: string): Task | undefined;
    /**
     * Get agent schedule
     */
    getAgentSchedule(agent: string): Task[];
    /**
     * Get team schedule
     */
    getTeamSchedule(): Record<string, Task[]>;
    /**
     * Complete a task
     */
    completeTask(taskId: string, result?: any): Task | null;
    /**
     * Get statistics
     */
    getStatistics(): {
        total: number;
        completed: number;
        running: number;
        pending: number;
        scheduled: number;
        completionRate: number;
        agentWorkload: {
            [k: string]: number;
        };
        averageCompletionTime: number;
    };
}
export default TaskScheduler;
//# sourceMappingURL=task-scheduler.d.ts.map
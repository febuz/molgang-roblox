"use strict";
/**
 * Advanced Task Scheduler
 * Intelligent task routing, scheduling, and execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskScheduler = void 0;
class TaskScheduler {
    constructor() {
        this.tasks = new Map();
        this.schedule = new Map();
        this.agentWorkload = new Map();
        // Initialize agent workload tracking
        ['fill', 'kai', 'zip', 'mira', 'luna'].forEach(agent => {
            this.agentWorkload.set(agent, 0);
        });
    }
    /**
     * Schedule a new task
     */
    scheduleTask(task) {
        const newTask = {
            ...task,
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'pending',
            createdAt: new Date()
        };
        // Resolve dependencies
        if (task.dependencies.length > 0) {
            const allDependenciesComplete = task.dependencies.every(depId => {
                const depTask = this.tasks.get(depId);
                return depTask?.status === 'completed';
            });
            if (allDependenciesComplete) {
                newTask.status = 'scheduled';
            }
        }
        else {
            newTask.status = 'scheduled';
        }
        this.tasks.set(newTask.id, newTask);
        // Auto-assign if no agent specified
        if (!newTask.assignedTo) {
            newTask.assignedTo = this.findBestAgent(newTask);
        }
        // Add to schedule
        if (!this.schedule.has(newTask.assignedTo)) {
            this.schedule.set(newTask.assignedTo, []);
        }
        this.schedule.get(newTask.assignedTo).push(newTask);
        // Update workload
        const current = this.agentWorkload.get(newTask.assignedTo) || 0;
        this.agentWorkload.set(newTask.assignedTo, current + newTask.estimatedTime);
        return newTask;
    }
    /**
     * Find best agent for task
     */
    findBestAgent(task) {
        const agents = Array.from(this.agentWorkload.entries())
            .sort((a, b) => a[1] - b[1]);
        // Priority-based agent selection
        const agentSkills = {
            'fill': ['planning', 'decision', 'oversight'],
            'kai': ['infrastructure', 'architecture', 'optimization'],
            'zip': ['development', 'feature', 'implementation'],
            'mira': ['design', 'visual', 'creative'],
            'luna': ['performance', 'optimization', 'testing']
        };
        // Find matching agent
        for (const [agent, workload] of agents) {
            const skills = agentSkills[agent] || [];
            if (skills.some(skill => task.description.toLowerCase().includes(skill))) {
                return agent;
            }
        }
        // Default to least busy
        return agents[0][0];
    }
    /**
     * Get task status
     */
    getTaskStatus(taskId) {
        return this.tasks.get(taskId);
    }
    /**
     * Get agent schedule
     */
    getAgentSchedule(agent) {
        return (this.schedule.get(agent) || [])
            .sort((a, b) => {
            // Sort by priority, then deadline
            const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
            const pDiff = priorityMap[a.priority] - priorityMap[b.priority];
            if (pDiff !== 0)
                return pDiff;
            return a.deadline.getTime() - b.deadline.getTime();
        });
    }
    /**
     * Get team schedule
     */
    getTeamSchedule() {
        const schedule = {};
        for (const [agent, tasks] of this.schedule) {
            schedule[agent] = tasks.sort((a, b) => {
                const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
                return priorityMap[a.priority] - priorityMap[b.priority];
            });
        }
        return schedule;
    }
    /**
     * Complete a task
     */
    completeTask(taskId, result) {
        const task = this.tasks.get(taskId);
        if (!task)
            return null;
        task.status = 'completed';
        task.completedAt = new Date();
        task.result = result;
        // Update workload
        const current = this.agentWorkload.get(task.assignedTo) || 0;
        this.agentWorkload.set(task.assignedTo, Math.max(0, current - task.estimatedTime));
        // Resolve dependent tasks
        for (const [id, dependentTask] of this.tasks) {
            if (dependentTask.dependencies.includes(taskId)) {
                const allDependenciesComplete = dependentTask.dependencies.every(depId => {
                    const depTask = this.tasks.get(depId);
                    return depTask?.status === 'completed';
                });
                if (allDependenciesComplete && dependentTask.status === 'pending') {
                    dependentTask.status = 'scheduled';
                }
            }
        }
        return task;
    }
    /**
     * Get statistics
     */
    getStatistics() {
        const allTasks = Array.from(this.tasks.values());
        const completed = allTasks.filter(t => t.status === 'completed').length;
        const running = allTasks.filter(t => t.status === 'running').length;
        const pending = allTasks.filter(t => t.status === 'pending').length;
        return {
            total: allTasks.length,
            completed,
            running,
            pending,
            scheduled: allTasks.filter(t => t.status === 'scheduled').length,
            completionRate: allTasks.length > 0 ? (completed / allTasks.length) * 100 : 0,
            agentWorkload: Object.fromEntries(this.agentWorkload),
            averageCompletionTime: completed > 0
                ? allTasks
                    .filter(t => t.completedAt && t.createdAt)
                    .reduce((sum, t) => sum + (t.completedAt.getTime() - t.createdAt.getTime()), 0) / completed / 1000 / 60
                : 0
        };
    }
}
exports.TaskScheduler = TaskScheduler;
exports.default = TaskScheduler;
//# sourceMappingURL=task-scheduler.js.map
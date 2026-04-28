/**
 * Live Task Engine - agents actively progress through their tasks FOREVER.
 * When tasks complete, new ones are generated from each agent's task pool.
 * Tick rate: ~60-90s per subtask so progress is visible but not instant.
 *
 * State persists to /media/knight2/EDS2/virtualpc-state/task-state.json every
 * 30s so agent progress (especially Kai's GPU-heavy work) survives server
 * restarts instead of resetting to pool index 10.
 */
interface WorkLogEntry {
    timestamp: string;
    agent: string;
    role: string;
    taskId: string;
    taskTitle: string;
    subtask: string;
    action: 'subtask_completed' | 'task_started' | 'task_completed';
    minutesSpent: number;
    project: string;
    registeredFor: string;
}
export interface GameMilestone {
    id: string;
    name: string;
    description: string;
    category: 'zone' | 'system' | 'infrastructure' | 'art' | 'optimization';
    progress: number;
    status: 'not-started' | 'in-progress' | 'completed';
    contributors: string[];
}
export declare function tickEngine(): void;
export declare function getPerPersonBacklog(): {
    [key: string]: any;
};
export declare function getAgentProgress(agentName: string): {
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
    progress: number;
    focus: string;
    currentTask: string | null;
    currentSubtask: string | null | undefined;
};
export declare function getBacklogItems(): {
    id: string;
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    assigned_to: string;
    sprint: string;
    status: string;
    created_at: string;
    description: string;
}[];
export declare function getTaskDetail(taskId: string): {
    id: string;
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    assigned_to: string;
    status: "completed" | "pending" | "in-progress";
    sprint: string;
    description: string;
    estimated_hours: number;
    progress: number;
    subtasks: string[];
    started_at: string | undefined;
    completed_at: string | undefined;
    _subtasksDone: number;
} | null;
export declare function getGameMilestones(): GameMilestone[];
export declare function getGameStats(): {
    sprint: string;
    sprintNumber: number;
    tasksCompleted: number;
    tasksInProgress: number;
    completedLastMinute: number;
    completedLastHour: number;
    completedLast24h: number;
    lastCompletionTs: string | null;
    milestonesCompleted: number;
    milestonesInProgress: number;
    milestonesTotal: number;
    overallGameProgress: number;
    agentCount: number;
    uptime: number;
};
interface WorkLogEntry {
    timestamp: string;
    agent: string;
    role: string;
    taskId: string;
    taskTitle: string;
    subtask: string;
    action: 'subtask_completed' | 'task_started' | 'task_completed';
    minutesSpent: number;
    project: string;
    registeredFor: string;
}
export declare function logWork(agent: string, taskId: string, taskTitle: string, subtask: string, action: WorkLogEntry['action'], minutesSpent: number): void;
export declare function getWorkLog(agent?: string, limit?: number): WorkLogEntry[];
export declare function getWorkSummary(): {
    project: string;
    registeredFor: string;
    totalEntries: number;
    totalMinutesLogged: number;
    agents: {
        [agent: string]: {
            totalMinutes: number;
            tasksCompleted: number;
            subtasksCompleted: number;
            lastActivity: string;
        };
    };
    uptime: number;
};
interface Artifact {
    id: string;
    agent: string;
    taskId: string;
    taskTitle: string;
    timestamp: string;
    model: string;
    latencyMs: number;
    tokens: number;
    content: string;
    promptType: 'task_summary';
}
export declare function getAgentArtifacts(agent: string, limit?: number): Artifact[];
export declare function getAllArtifacts(limit?: number): Artifact[];
interface Proposal {
    id: string;
    from: string;
    to: string;
    timestamp: string;
    topic: string;
    content: string;
    model: string;
    latencyMs: number;
    tokens: number;
    status: 'delivered';
}
export declare function getAgentInbox(agent: string, limit?: number): Proposal[];
export declare function getAgentOutbox(agent: string, limit?: number): Proposal[];
export declare function getAllProposals(limit?: number): Proposal[];
export declare function getAgentInProgressDetail(agent: string): {
    id: string;
    title: string;
    priority: "low" | "medium" | "high" | "critical";
    description: string;
    estimated_hours: number;
    progress: number;
    started_at: string | undefined;
    sprint: string;
    subtasks: {
        name: string;
        done: boolean;
    }[];
    subtasksDone: number;
    subtasksTotal: number;
    currentSubtask: string | null;
    _secondsSinceLastTick: number;
}[];
export declare function getAgentCliLog(agent: string, limit?: number): {
    ts: string;
    line: string;
    level: "warn" | "ok" | "cmd" | "out" | "err";
}[];
interface SocialAgent {
    name: string;
    handle: string;
    role: string;
    avatar: string;
    color: string;
    headline: string;
    bio: string;
    specialties: string[];
}
export declare function getSocialRoster(): {
    stats: {
        tasksCompleted: number;
        subtasksCompleted: number;
        activeTasks: number;
        minutesLogged: number;
    };
    name: string;
    handle: string;
    role: string;
    avatar: string;
    color: string;
    headline: string;
    bio: string;
    specialties: string[];
}[];
export declare function getAgentSocialFeed(agent: string, limit?: number): {
    profile: SocialAgent;
    feed: ({
        id: string;
        type: "completion";
        timestamp: string;
        title: string;
        body: string;
        meta: {
            sprint: string;
            hours: number;
            priority: "low" | "medium" | "high" | "critical";
            subtasksDone: number;
        };
        reactions: {
            like: number;
            insight: number;
            celebrate: number;
        };
    } | {
        id: string;
        type: "progress";
        timestamp: string;
        title: string;
        body: string;
        meta: {
            taskId: string;
            minutes: number;
        };
        reactions: {
            like: number;
            insight: number;
            celebrate: number;
        };
    } | {
        id: string;
        type: "intro";
        timestamp: string;
        title: string;
        body: string;
        meta: {
            role: string;
        };
        reactions: {
            like: number;
            insight: number;
            celebrate: number;
        };
    })[];
    pinned: {
        id: string;
        type: "completion";
        timestamp: string;
        title: string;
        body: string;
        meta: {
            sprint: string;
            hours: number;
            priority: "low" | "medium" | "high" | "critical";
            subtasksDone: number;
        };
        reactions: {
            like: number;
            insight: number;
            celebrate: number;
        };
    }[];
} | null;
export {};
//# sourceMappingURL=task-engine.d.ts.map
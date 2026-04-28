/**
 * Commits Tracker - parses `git log` of the virtualpc repo and attributes
 * commits to agents. Mirrors the token-usage page layout.
 *
 * Attribution rules (in priority order):
 *  1. Co-Authored-By trailer naming a known agent
 *  2. Commit subject keyword match (e.g. "Mira", "Cleopatra", "Kai's")
 *  3. Fall through to "System" (unattributed)
 *
 * Results are cached for 30s to keep git-log calls cheap.
 */
export declare function getCommitSummary(): {
    repo: string;
    combined: {
        totalCommits: number;
        totalInsertions: number;
        totalDeletions: number;
        thisHour: number;
        today: number;
        thisWeek: number;
        thisMonth: number;
    };
    agents: {
        [agent: string]: {
            commits: number;
            insertions: number;
            deletions: number;
            thisHour: number;
            today: number;
            month: number;
            lastCommit: string | null;
        };
    };
    agentOrder: string[];
};
export declare function getCommitHourly(agent?: string): Array<{
    hour: string;
    commits: number;
    insertions: number;
    deletions: number;
}>;
export declare function getRecentCommits(limit?: number): Array<{
    sha: string;
    time: string;
    timestamp: string;
    agent: string;
    subject: string;
    files: number;
    insertions: number;
    deletions: number;
}>;
export declare function getRepoUrl(): string;
export declare function getCommitsForTask(taskId: string, completedAt?: string, limit?: number): Array<{
    sha: string;
    shortSha: string;
    subject: string;
    timestamp: string;
    url: string;
    matchedBy: 'taskid' | 'time';
}>;
/**
 * Batch lookup for the dashboard: given a list of {id, completed_at} pairs,
 * returns a map id → commits. Single git scan amortised across all requested
 * tasks (loadCommits is cached anyway).
 */
export declare function getCommitsForTasks(tasks: Array<{
    id: string;
    completed_at?: string;
}>, limit?: number): {
    [taskId: string]: ReturnType<typeof getCommitsForTask>;
};
//# sourceMappingURL=commits-tracker.d.ts.map
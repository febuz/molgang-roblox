/**
 * Claude Code Skills System Integration
 *
 * Exposes VirtualPC's LightRAG shared memory as custom MCP skills
 * Allows Claude Code users to access team knowledge, decisions, and precedents
 *
 * Skills Available:
 * 1. Query Team Memory
 * 2. Find Precedents
 * 3. Record Decision
 * 4. Get Agent Status
 * 5. Check Cost Status
 * 6. Access Learnings
 */
/**
 * Claude Code Skill: Query Team Memory
 *
 * Queries shared LightRAG memory for team decisions and context
 *
 * Example:
 * ```
 * const memory = await claudeCodeSkills.queryTeamMemory({
 *   topic: 'cache optimization',
 *   limit: 5
 * });
 * ```
 */
export declare function queryTeamMemory(params: {
    topic: string;
    limit?: number;
    agent?: string;
}): Promise<{
    topic: string;
    results: Array<{
        decision: string;
        agent: string;
        impact: string;
        reasoning: string;
        timestamp: string;
    }>;
    count: number;
}>;
/**
 * Claude Code Skill: Find Precedents
 *
 * Finds similar past decisions and their outcomes
 *
 * Example:
 * ```
 * const precedents = await claudeCodeSkills.findPrecedents({
 *   description: 'How to optimize database performance?',
 *   threshold: 0.8
 * });
 * ```
 */
export declare function findPrecedents(params: {
    description: string;
    threshold?: number;
    limit?: number;
}): Promise<{
    query: string;
    precedents: Array<{
        title: string;
        description: string;
        approach: string;
        result: string;
        lessons: string;
        agent: string;
        similarity: number;
    }>;
    count: number;
}>;
/**
 * Claude Code Skill: Record Decision
 *
 * Stores a decision in shared team memory
 *
 * Example:
 * ```
 * await claudeCodeSkills.recordDecision({
 *   agent: 'kai',
 *   decision: 'Implement microservices architecture',
 *   reasoning: 'Improves scalability and independent deployment',
 *   impact: 'Expected 3x better scalability'
 * });
 * ```
 */
export declare function recordDecision(params: {
    agent: string;
    decision: string;
    reasoning: string;
    impact: string;
    tags?: string[];
}): Promise<{
    status: 'recorded';
    decision_id: string;
    timestamp: string;
    access_key: string;
}>;
/**
 * Claude Code Skill: Get Agent Status
 *
 * Gets current status of all team agents
 *
 * Example:
 * ```
 * const status = await claudeCodeSkills.getAgentStatus();
 * ```
 */
export declare function getAgentStatus(): Promise<{
    agents: Array<{
        name: string;
        status: 'active' | 'idle' | 'offline';
        current_task?: string;
        tasks_completed: number;
        avg_quality: number;
        cost_total: number;
    }>;
    team_efficiency: number;
}>;
/**
 * Claude Code Skill: Check Cost Status
 *
 * Gets current cost tracking and budget status
 *
 * Example:
 * ```
 * const costs = await claudeCodeSkills.checkCostStatus();
 * if (costs.daily_exceeded) {
 *   console.log('Daily budget exceeded');
 * }
 * ```
 */
export declare function checkCostStatus(): Promise<{
    daily_cost: number;
    daily_budget: number;
    daily_remaining: number;
    daily_exceeded: boolean;
    monthly_cost: number;
    monthly_budget: number;
    monthly_remaining: number;
    monthly_exceeded: boolean;
    cost_reduction_percent: number;
    top_agents: Array<{
        agent: string;
        cost: number;
    }>;
}>;
/**
 * Claude Code Skill: Access Learnings
 *
 * Gets key learnings and best practices from team
 *
 * Example:
 * ```
 * const learnings = await claudeCodeSkills.accessLearnings({
 *   topic: 'performance optimization',
 *   category: 'best_practices'
 * });
 * ```
 */
export declare function accessLearnings(params: {
    topic?: string;
    category?: 'best_practices' | 'lessons_learned' | 'common_mistakes' | 'success_patterns';
    limit?: number;
}): Promise<{
    learnings: Array<{
        title: string;
        description: string;
        category: string;
        agent: string;
        impact_score: number;
        related_decision?: string;
    }>;
    count: number;
}>;
/**
 * Register all skills as Claude Code MCP capabilities
 */
export declare function registerClaudeCodeSkills(): {
    skills: Array<{
        name: string;
        description: string;
        parameters: Record<string, any>;
        returns: Record<string, any>;
    }>;
};
declare const _default: {
    queryTeamMemory: typeof queryTeamMemory;
    findPrecedents: typeof findPrecedents;
    recordDecision: typeof recordDecision;
    getAgentStatus: typeof getAgentStatus;
    checkCostStatus: typeof checkCostStatus;
    accessLearnings: typeof accessLearnings;
    registerClaudeCodeSkills: typeof registerClaudeCodeSkills;
};
export default _default;
//# sourceMappingURL=claude-code-skills.d.ts.map
"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryTeamMemory = queryTeamMemory;
exports.findPrecedents = findPrecedents;
exports.recordDecision = recordDecision;
exports.getAgentStatus = getAgentStatus;
exports.checkCostStatus = checkCostStatus;
exports.accessLearnings = accessLearnings;
exports.registerClaudeCodeSkills = registerClaudeCodeSkills;
const logger_1 = __importDefault(require("../utils/logger"));
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
async function queryTeamMemory(params) {
    try {
        const { topic, limit = 10, agent } = params;
        logger_1.default.info(`Claude Code: Querying memory for topic "${topic}"`);
        // TODO: Connect to LightRAG API
        const results = [
            {
                decision: 'Use Redis for distributed caching',
                agent: 'kai',
                impact: 'Reduced API latency from 2.5s to 0.8s',
                reasoning: 'Redis provides fast, distributed caching with automatic expiration',
                timestamp: new Date().toISOString()
            },
            {
                decision: 'Implement request batching for similar prompts',
                agent: 'zip',
                impact: 'Reduced API calls by 30%',
                reasoning: 'Batching similar requests reduces overhead and improves throughput',
                timestamp: new Date().toISOString()
            }
        ];
        return {
            topic,
            results: results.slice(0, limit),
            count: results.length
        };
    }
    catch (error) {
        logger_1.default.error('Failed to query team memory', error);
        throw error;
    }
}
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
async function findPrecedents(params) {
    try {
        const { description, threshold = 0.8, limit = 5 } = params;
        logger_1.default.info(`Claude Code: Finding precedents for "${description.substring(0, 50)}..."`);
        // TODO: Connect to LightRAG similarity search
        const precedents = [
            {
                title: 'Previous database optimization',
                description: 'Optimized query performance',
                approach: 'Added indexes and query caching',
                result: '+40% query throughput',
                lessons: 'Index strategy matters more than query rewrites',
                agent: 'kai',
                similarity: 0.95
            },
            {
                title: 'Cache optimization project',
                description: 'Improved cache hit rates',
                approach: 'Implemented multi-tier caching strategy',
                result: '+60% cache hit rate',
                lessons: 'LRU eviction is critical for memory management',
                agent: 'kai',
                similarity: 0.88
            }
        ];
        return {
            query: description,
            precedents: precedents
                .filter(p => p.similarity >= threshold)
                .slice(0, limit),
            count: precedents.length
        };
    }
    catch (error) {
        logger_1.default.error('Failed to find precedents', error);
        throw error;
    }
}
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
async function recordDecision(params) {
    try {
        const { agent, decision, reasoning, impact, tags = [] } = params;
        logger_1.default.info(`Claude Code: Recording decision from ${agent}`);
        // TODO: Connect to LightRAG API
        const decisionId = `dec-${Date.now()}`;
        return {
            status: 'recorded',
            decision_id: decisionId,
            timestamp: new Date().toISOString(),
            access_key: `Key available to team in shared memory`
        };
    }
    catch (error) {
        logger_1.default.error('Failed to record decision', error);
        throw error;
    }
}
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
async function getAgentStatus() {
    try {
        logger_1.default.info('Claude Code: Getting agent status');
        // TODO: Connect to agent monitoring API
        const agents = [
            {
                name: 'fill',
                status: 'active',
                current_task: 'Strategic planning',
                tasks_completed: 156,
                avg_quality: 0.94,
                cost_total: 2.34
            },
            {
                name: 'kai',
                status: 'idle',
                tasks_completed: 201,
                avg_quality: 0.96,
                cost_total: 1.89
            },
            {
                name: 'zip',
                status: 'active',
                current_task: 'Bug fixing',
                tasks_completed: 89,
                avg_quality: 0.91,
                cost_total: 0.67
            }
        ];
        return {
            agents,
            team_efficiency: 0.94
        };
    }
    catch (error) {
        logger_1.default.error('Failed to get agent status', error);
        throw error;
    }
}
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
async function checkCostStatus() {
    try {
        logger_1.default.info('Claude Code: Checking cost status');
        // TODO: Connect to cost analyzer API
        return {
            daily_cost: 2.34,
            daily_budget: 50,
            daily_remaining: 47.66,
            daily_exceeded: false,
            monthly_cost: 45.67,
            monthly_budget: 1500,
            monthly_remaining: 1454.33,
            monthly_exceeded: false,
            cost_reduction_percent: 87,
            top_agents: [
                { agent: 'kai', cost: 1.89 },
                { agent: 'fill', cost: 0.45 }
            ]
        };
    }
    catch (error) {
        logger_1.default.error('Failed to check cost status', error);
        throw error;
    }
}
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
async function accessLearnings(params) {
    try {
        const { topic, category, limit = 10 } = params;
        logger_1.default.info(`Claude Code: Accessing learnings for ${topic || 'all topics'}`);
        // TODO: Connect to LightRAG learnings API
        const learnings = [
            {
                title: 'Index Strategy Matters',
                description: 'When optimizing databases, proper indexing provides better ROI than query rewrites',
                category: 'best_practices',
                agent: 'kai',
                impact_score: 0.95,
                related_decision: 'dec-001'
            },
            {
                title: 'Cache Invalidation is Critical',
                description: 'Multi-instance caching requires careful invalidation strategy to prevent stale data',
                category: 'lessons_learned',
                agent: 'luna',
                impact_score: 0.88,
                related_decision: 'dec-002'
            },
            {
                title: 'Test in Prod for True Bottlenecks',
                description: 'Micro-optimizations without real-world load testing often miss the actual bottleneck',
                category: 'common_mistakes',
                agent: 'zip',
                impact_score: 0.82,
                related_decision: 'dec-003'
            }
        ];
        return {
            learnings: learnings.slice(0, limit),
            count: learnings.length
        };
    }
    catch (error) {
        logger_1.default.error('Failed to access learnings', error);
        throw error;
    }
}
/**
 * Register all skills as Claude Code MCP capabilities
 */
function registerClaudeCodeSkills() {
    return {
        skills: [
            {
                name: 'queryTeamMemory',
                description: 'Query shared team memory (LightRAG) for decisions, precedents, and context',
                parameters: {
                    topic: { type: 'string', description: 'Topic to search for (e.g., "cache optimization")' },
                    limit: { type: 'number', description: 'Maximum number of results (default: 10)' },
                    agent: { type: 'string', description: 'Filter by specific agent (optional)' }
                },
                returns: {
                    topic: 'string',
                    results: 'array of decisions with agent, impact, and reasoning',
                    count: 'number'
                }
            },
            {
                name: 'findPrecedents',
                description: 'Find similar past decisions and their outcomes using semantic similarity',
                parameters: {
                    description: { type: 'string', description: 'Description of what you want to do' },
                    threshold: { type: 'number', description: 'Similarity threshold 0.0-1.0 (default: 0.8)' },
                    limit: { type: 'number', description: 'Maximum results (default: 5)' }
                },
                returns: {
                    query: 'string',
                    precedents: 'array of similar past decisions with approach and results',
                    count: 'number'
                }
            },
            {
                name: 'recordDecision',
                description: 'Record a decision in shared team memory for others to learn from',
                parameters: {
                    agent: { type: 'string', description: 'Agent/person making decision' },
                    decision: { type: 'string', description: 'What decision was made' },
                    reasoning: { type: 'string', description: 'Why this decision was made' },
                    impact: { type: 'string', description: 'Expected or realized impact' },
                    tags: { type: 'array', description: 'Tags for categorization (optional)' }
                },
                returns: {
                    status: 'recorded',
                    decision_id: 'unique identifier for this decision',
                    timestamp: 'ISO timestamp',
                    access_key: 'how team accesses this decision'
                }
            },
            {
                name: 'getAgentStatus',
                description: 'Get current status of all team agents and their performance',
                parameters: {},
                returns: {
                    agents: 'array of agent status with tasks, quality, and costs',
                    team_efficiency: 'overall team efficiency score 0-1'
                }
            },
            {
                name: 'checkCostStatus',
                description: 'Check current cost tracking, budget status, and cost reduction metrics',
                parameters: {},
                returns: {
                    daily_cost: 'current daily spend',
                    daily_remaining: 'remaining daily budget',
                    monthly_remaining: 'remaining monthly budget',
                    cost_reduction_percent: 'cost savings percentage',
                    top_agents: 'agents with highest costs'
                }
            },
            {
                name: 'accessLearnings',
                description: 'Access key learnings and best practices from team experience',
                parameters: {
                    topic: { type: 'string', description: 'Specific topic to learn about (optional)' },
                    category: { type: 'string', description: 'Category: best_practices | lessons_learned | common_mistakes | success_patterns' },
                    limit: { type: 'number', description: 'Maximum results (default: 10)' }
                },
                returns: {
                    learnings: 'array of learnings with impact scores and related decisions',
                    count: 'total learnings available'
                }
            }
        ]
    };
}
exports.default = {
    queryTeamMemory,
    findPrecedents,
    recordDecision,
    getAgentStatus,
    checkCostStatus,
    accessLearnings,
    registerClaudeCodeSkills
};
//# sourceMappingURL=claude-code-skills.js.map
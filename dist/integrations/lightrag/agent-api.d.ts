/**
 * Agent API Wrapper for LightRAG
 *
 * Provides high-level API for agents to query and update shared memory.
 * Includes:
 * - LRU caching (1000 entries, TTL 1 hour)
 * - Rate limiting (100 queries/min per agent)
 * - Automatic query optimization
 * - Error handling and fallbacks
 */
import { LightRAGClient } from './client';
import { Decision, Context } from './schema';
interface QueryResult {
    success: boolean;
    results: any[];
    cached: boolean;
    cachedAt?: Date;
    queryTime: number;
    tokensSaved?: number;
}
interface MemoryStatus {
    connected: boolean;
    cacheSize: number;
    cacheHitRate: number;
    rateLimitStatus: Record<string, number>;
    lastError?: string;
    uptime: number;
}
export declare class AgentAPIWrapper {
    private client;
    private cache;
    private rateLimit;
    private startTime;
    readonly CACHE_MAX_SIZE = 1000;
    readonly CACHE_TTL: number;
    readonly RATE_LIMIT_WINDOW: number;
    readonly RATE_LIMIT_MAX = 100;
    constructor(client: LightRAGClient);
    /**
     * Query memory for context on a topic
     *
     * First checks cache, then LightRAG, then updates cache.
     */
    queryMemory(agent: string, topic: string): Promise<QueryResult>;
    /**
     * Add a decision to memory
     *
     * Stores decision and clears related caches.
     */
    addDecision(agent: string, decision: Decision): Promise<void>;
    /**
     * Find similar previous decisions
     */
    findPrecedent(topic: string, threshold?: number): Promise<any[]>;
    /**
     * Get full context for a project
     */
    getContext(projectId: string, include?: string[]): Promise<Context>;
    /**
     * Get current memory status
     */
    getMemoryStatus(): Promise<MemoryStatus>;
    /**
     * Clear cache (useful for testing or manual refresh)
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        entries: number;
        oldestEntry?: Date;
        newestEntry?: Date;
        largestEntry?: {
            key: string;
            size: number;
        };
    };
    private checkRateLimit;
    private getRateLimitStatus;
    private setInCache;
    private getFromCache;
    private getCacheEntry;
    private invalidateRelatedCaches;
}
export default AgentAPIWrapper;
//# sourceMappingURL=agent-api.d.ts.map
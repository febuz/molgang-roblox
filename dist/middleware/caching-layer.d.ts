/**
 * Caching Layer - Response Caching for Model Calls
 *
 * Caches model responses to reduce duplicate API calls
 * - Hash-based lookup for exact matches
 * - TTL: 1 hour
 * - Max size: 5000 entries
 * - Automatic LRU eviction
 */
export interface CachedResponse {
    prompt: string;
    model: string;
    response: string;
    tokens_prompt: number;
    tokens_completion: number;
    cost_usd: number;
    timestamp: number;
    ttl: number;
    hits: number;
}
export declare class CachingLayer {
    private cache;
    private readonly MAX_CACHE_SIZE;
    private readonly DEFAULT_TTL;
    private stats;
    /**
     * Generate cache key from prompt and model
     */
    private generateKey;
    /**
     * Get cached response
     */
    get(prompt: string, model: string): CachedResponse | null;
    /**
     * Set cached response
     */
    set(prompt: string, model: string, response: string, tokensPrompt: number, tokensCompletion: number, costUsd: number): void;
    /**
     * Clear entire cache
     */
    clear(): void;
    /**
     * Get cache statistics
     */
    getStats(): {
        size: number;
        hitRate: number;
        hits: number;
        misses: number;
        evictions: number;
        tokensSaved: number;
        costSaved: number;
    };
    /**
     * Get cache entries (for debugging)
     */
    getEntries(): Array<{
        model: string;
        promptLength: number;
        hits: number;
        age: number;
    }>;
    /**
     * Reset statistics
     */
    resetStats(): void;
}
export default CachingLayer;
//# sourceMappingURL=caching-layer.d.ts.map
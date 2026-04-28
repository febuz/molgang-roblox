interface CacheOptions {
    ttl?: number;
    namespace?: string;
}
interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    hitRate: number;
}
export declare class CacheManager {
    private redis;
    private stats;
    private defaultTTL;
    private namespace;
    constructor(redisUrl?: string);
    /**
     * Get value from cache
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in cache
     */
    set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>;
    /**
     * Delete key from cache
     */
    delete(key: string): Promise<boolean>;
    /**
     * Get or set (cache-aside pattern)
     */
    getOrSet<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T>;
    /**
     * Invalidate pattern (wildcard)
     */
    invalidatePattern(pattern: string): Promise<number>;
    /**
     * Batch get
     */
    mget<T>(keys: string[]): Promise<(T | null)[]>;
    /**
     * Batch set
     */
    mset<T>(items: Array<{
        key: string;
        value: T;
    }>, ttl?: number): Promise<boolean>;
    /**
     * Increment counter
     */
    increment(key: string, amount?: number): Promise<number>;
    /**
     * Check if key exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get remaining TTL
     */
    ttl(key: string): Promise<number>;
    /**
     * Clear all cache
     */
    clear(): Promise<boolean>;
    /**
     * Get cache statistics
     */
    getStats(): CacheStats;
    /**
     * Reset statistics
     */
    resetStats(): void;
    /**
     * Helper to get namespaced key
     */
    private getNamespacedKey;
    /**
     * Close connection
     */
    disconnect(): Promise<void>;
}
export default CacheManager;
//# sourceMappingURL=cacheManager.d.ts.map
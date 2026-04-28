"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class CacheManager {
    constructor(redisUrl) {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            hitRate: 0,
        };
        this.defaultTTL = 3600; // 1 hour
        this.namespace = 'virtualpc';
        this.redis = new ioredis_1.default(redisUrl || 'redis://localhost:6379');
    }
    /**
     * Get value from cache
     */
    async get(key) {
        try {
            const namespaced = this.getNamespacedKey(key);
            const value = await this.redis.get(namespaced);
            if (value) {
                this.stats.hits++;
                return JSON.parse(value);
            }
            else {
                this.stats.misses++;
                return null;
            }
        }
        catch (error) {
            console.error(`Cache get error for ${key}:`, error);
            return null;
        }
    }
    /**
     * Set value in cache
     */
    async set(key, value, options) {
        try {
            const namespaced = this.getNamespacedKey(key, options?.namespace);
            const ttl = options?.ttl ?? this.defaultTTL;
            const serialized = JSON.stringify(value);
            await this.redis.setex(namespaced, ttl, serialized);
            this.stats.sets++;
            return true;
        }
        catch (error) {
            console.error(`Cache set error for ${key}:`, error);
            return false;
        }
    }
    /**
     * Delete key from cache
     */
    async delete(key) {
        try {
            const namespaced = this.getNamespacedKey(key);
            await this.redis.del(namespaced);
            this.stats.deletes++;
            return true;
        }
        catch (error) {
            console.error(`Cache delete error for ${key}:`, error);
            return false;
        }
    }
    /**
     * Get or set (cache-aside pattern)
     */
    async getOrSet(key, fetcher, options) {
        const cached = await this.get(key);
        if (cached) {
            return cached;
        }
        const value = await fetcher();
        await this.set(key, value, options);
        return value;
    }
    /**
     * Invalidate pattern (wildcard)
     */
    async invalidatePattern(pattern) {
        try {
            const keys = await this.redis.keys(this.getNamespacedKey(pattern));
            if (keys.length === 0)
                return 0;
            const deleted = await this.redis.del(...keys);
            this.stats.deletes += deleted;
            return deleted;
        }
        catch (error) {
            console.error(`Cache pattern invalidation error:`, error);
            return 0;
        }
    }
    /**
     * Batch get
     */
    async mget(keys) {
        try {
            const namespaced = keys.map((k) => this.getNamespacedKey(k));
            const values = await this.redis.mget(...namespaced);
            return values.map((v) => {
                if (v) {
                    this.stats.hits++;
                    return JSON.parse(v);
                }
                else {
                    this.stats.misses++;
                    return null;
                }
            });
        }
        catch (error) {
            console.error(`Cache mget error:`, error);
            return keys.map(() => null);
        }
    }
    /**
     * Batch set
     */
    async mset(items, ttl) {
        try {
            const pipeline = this.redis.pipeline();
            const _ttl = ttl ?? this.defaultTTL;
            for (const { key, value } of items) {
                const namespaced = this.getNamespacedKey(key);
                pipeline.setex(namespaced, _ttl, JSON.stringify(value));
            }
            await pipeline.exec();
            this.stats.sets += items.length;
            return true;
        }
        catch (error) {
            console.error(`Cache mset error:`, error);
            return false;
        }
    }
    /**
     * Increment counter
     */
    async increment(key, amount = 1) {
        try {
            const namespaced = this.getNamespacedKey(key);
            return await this.redis.incrby(namespaced, amount);
        }
        catch (error) {
            console.error(`Cache increment error:`, error);
            return 0;
        }
    }
    /**
     * Check if key exists
     */
    async exists(key) {
        try {
            const namespaced = this.getNamespacedKey(key);
            const result = await this.redis.exists(namespaced);
            return result === 1;
        }
        catch (error) {
            console.error(`Cache exists error:`, error);
            return false;
        }
    }
    /**
     * Get remaining TTL
     */
    async ttl(key) {
        try {
            const namespaced = this.getNamespacedKey(key);
            return await this.redis.ttl(namespaced);
        }
        catch (error) {
            console.error(`Cache ttl error:`, error);
            return -1;
        }
    }
    /**
     * Clear all cache
     */
    async clear() {
        try {
            const pattern = this.getNamespacedKey('*');
            const keys = await this.redis.keys(pattern);
            if (keys.length === 0)
                return true;
            await this.redis.del(...keys);
            return true;
        }
        catch (error) {
            console.error(`Cache clear error:`, error);
            return false;
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            hitRate: total > 0 ? this.stats.hits / total : 0,
        };
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            hitRate: 0,
        };
    }
    /**
     * Helper to get namespaced key
     */
    getNamespacedKey(key, namespace) {
        const ns = namespace ?? this.namespace;
        return `${ns}:${key}`;
    }
    /**
     * Close connection
     */
    async disconnect() {
        await this.redis.disconnect();
    }
}
exports.CacheManager = CacheManager;
exports.default = CacheManager;
//# sourceMappingURL=cacheManager.js.map
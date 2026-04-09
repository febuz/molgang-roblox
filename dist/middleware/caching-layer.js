"use strict";
/**
 * Caching Layer - Response Caching for Model Calls
 *
 * Caches model responses to reduce duplicate API calls
 * - Hash-based lookup for exact matches
 * - TTL: 1 hour
 * - Max size: 5000 entries
 * - Automatic LRU eviction
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingLayer = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = __importDefault(require("../utils/logger"));
class CachingLayer {
    constructor() {
        this.cache = new Map();
        this.MAX_CACHE_SIZE = 5000;
        this.DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalTokensSaved: 0,
        };
    }
    /**
     * Generate cache key from prompt and model
     */
    generateKey(prompt, model) {
        const content = `${model}:${prompt}`;
        return crypto_1.default.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Get cached response
     */
    get(prompt, model) {
        const key = this.generateKey(prompt, model);
        const cached = this.cache.get(key);
        if (!cached) {
            this.stats.misses++;
            return null;
        }
        // Check TTL
        if (Date.now() - cached.timestamp > cached.ttl) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }
        // Update hits
        cached.hits++;
        this.stats.hits++;
        this.stats.totalTokensSaved += cached.tokens_completion;
        logger_1.default.debug(`Cache hit for model: ${model}`);
        return cached;
    }
    /**
     * Set cached response
     */
    set(prompt, model, response, tokensPrompt, tokensCompletion, costUsd) {
        // Implement LRU: remove oldest if at capacity
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            let oldestKey = '';
            let oldestTime = Infinity;
            for (const [key, entry] of this.cache.entries()) {
                if (entry.timestamp < oldestTime) {
                    oldestTime = entry.timestamp;
                    oldestKey = key;
                }
            }
            if (oldestKey) {
                this.cache.delete(oldestKey);
                this.stats.evictions++;
            }
        }
        const key = this.generateKey(prompt, model);
        this.cache.set(key, {
            prompt,
            model,
            response,
            tokens_prompt: tokensPrompt,
            tokens_completion: tokensCompletion,
            cost_usd: costUsd,
            timestamp: Date.now(),
            ttl: this.DEFAULT_TTL,
            hits: 0,
        });
        logger_1.default.debug(`Response cached for model: ${model}`);
    }
    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        logger_1.default.info('Cache cleared');
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
        // Approximate cost saved (avg $0.001 per 100 tokens)
        const costSaved = (this.stats.totalTokensSaved / 100) * 0.001;
        return {
            size: this.cache.size,
            hitRate: Math.round(hitRate * 100) / 100,
            hits: this.stats.hits,
            misses: this.stats.misses,
            evictions: this.stats.evictions,
            tokensSaved: this.stats.totalTokensSaved,
            costSaved,
        };
    }
    /**
     * Get cache entries (for debugging)
     */
    getEntries() {
        return Array.from(this.cache.values()).map((entry) => ({
            model: entry.model,
            promptLength: entry.prompt.length,
            hits: entry.hits,
            age: Date.now() - entry.timestamp,
        }));
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalTokensSaved: 0,
        };
    }
}
exports.CachingLayer = CachingLayer;
exports.default = CachingLayer;
//# sourceMappingURL=caching-layer.js.map
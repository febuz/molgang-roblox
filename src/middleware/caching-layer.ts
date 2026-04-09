/**
 * Caching Layer - Response Caching for Model Calls
 *
 * Caches model responses to reduce duplicate API calls
 * - Hash-based lookup for exact matches
 * - TTL: 1 hour
 * - Max size: 5000 entries
 * - Automatic LRU eviction
 */

import crypto from 'crypto';
import logger from '../utils/logger';

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

export class CachingLayer {
  private cache: Map<string, CachedResponse> = new Map();
  private readonly MAX_CACHE_SIZE = 5000;
  private readonly DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalTokensSaved: 0,
  };

  /**
   * Generate cache key from prompt and model
   */
  private generateKey(prompt: string, model: string): string {
    const content = `${model}:${prompt}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get cached response
   */
  get(prompt: string, model: string): CachedResponse | null {
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

    logger.debug(`Cache hit for model: ${model}`);
    return cached;
  }

  /**
   * Set cached response
   */
  set(
    prompt: string,
    model: string,
    response: string,
    tokensPrompt: number,
    tokensCompletion: number,
    costUsd: number
  ): void {
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

    logger.debug(`Response cached for model: ${model}`);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

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
  } {
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
  getEntries(): Array<{
    model: string;
    promptLength: number;
    hits: number;
    age: number;
  }> {
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
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalTokensSaved: 0,
    };
  }
}

export default CachingLayer;

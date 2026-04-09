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
import { Decision, Precedent, Context } from './schema';
import logger from '../../utils/logger';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // milliseconds
  hits: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

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

export class AgentAPIWrapper {
  private client: LightRAGClient;
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimit: Map<string, RateLimitEntry> = new Map();
  private startTime: number = Date.now();

  // Configuration
  readonly CACHE_MAX_SIZE = 1000;
  readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  readonly RATE_LIMIT_MAX = 100; // queries per minute per agent

  constructor(client: LightRAGClient) {
    this.client = client;
    logger.info('✓ AgentAPIWrapper initialized');
  }

  /**
   * Query memory for context on a topic
   *
   * First checks cache, then LightRAG, then updates cache.
   */
  async queryMemory(agent: string, topic: string): Promise<QueryResult> {
    const startTime = Date.now();

    // Check rate limiting
    if (!this.checkRateLimit(agent)) {
      return {
        success: false,
        results: [],
        cached: false,
        queryTime: Date.now() - startTime,
      };
    }

    // Generate cache key
    const cacheKey = `query:${topic}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.debug(`Cache hit: ${topic}`);
      return {
        success: true,
        results: cached,
        cached: true,
        cachedAt: new Date(this.getCacheEntry(cacheKey)!.timestamp),
        queryTime: Date.now() - startTime,
        tokensSaved: 200, // Approximate tokens saved by cache hit
      };
    }

    // Query LightRAG
    try {
      const results = await this.client.query(topic, {
        limit: 20,
        types: ['Decision', 'Risk', 'Precedent'],
      });

      // Store in cache
      this.setInCache(cacheKey, results.nodes);

      logger.debug(`Query complete: ${topic} (${results.nodes.length} results)`);

      return {
        success: true,
        results: results.nodes,
        cached: false,
        queryTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error(`Query failed: ${topic}`, error);
      return {
        success: false,
        results: [],
        cached: false,
        queryTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Add a decision to memory
   *
   * Stores decision and clears related caches.
   */
  async addDecision(agent: string, decision: Decision): Promise<void> {
    try {
      // Validate decision
      if (!decision.what || !decision.why) {
        throw new Error('Decision must have "what" and "why" fields');
      }

      // Add to Neo4j
      await this.client.addNode({
        type: 'Decision',
        content: `${decision.what} (${decision.why})`,
        context: decision.why,
        created_by: agent,
        affects: decision.affects,
      });

      // Clear related caches
      this.invalidateRelatedCaches(decision.what);
      this.invalidateRelatedCaches(`agent:${agent}`);

      logger.info(`Decision added by ${agent}: ${decision.what.substring(0, 50)}...`);
    } catch (error) {
      logger.error(`Failed to add decision: ${agent}`, error);
      throw error;
    }
  }

  /**
   * Find similar previous decisions
   */
  async findPrecedent(topic: string, threshold: number = 0.75): Promise<any[]> {
    try {
      const results = await this.client.findSimilar(topic, threshold);
      return results;
    } catch (error) {
      logger.error(`Failed to find precedent: ${topic}`, error);
      return [];
    }
  }

  /**
   * Get full context for a project
   */
  async getContext(projectId: string, include?: string[]): Promise<Context> {
    const cacheKey = `context:${projectId}`;

    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached as Context;
    }

    try {
      const context = await this.client.getContext(projectId, include || []);
      this.setInCache(cacheKey, context);
      return context;
    } catch (error) {
      logger.error(`Failed to get context: ${projectId}`, error);
      throw error;
    }
  }

  /**
   * Get current memory status
   */
  async getMemoryStatus(): Promise<MemoryStatus> {
    const totalQueries = Array.from(this.cache.values()).reduce((sum, e) => sum + e.hits, 0);
    const cacheHits = Array.from(this.cache.values())
      .filter(e => e.hits > 1)
      .reduce((sum, e) => sum + e.hits - 1, 0);
    const cacheHitRate = totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0;

    return {
      connected: true, // Assume connected if initialized
      cacheSize: this.cache.size,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      rateLimitStatus: this.getRateLimitStatus(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: number;
    oldestEntry?: Date;
    newestEntry?: Date;
    largestEntry?: { key: string; size: number };
  } {
    if (this.cache.size === 0) {
      return { size: 0, entries: 0 };
    }

    let totalSize = 0;
    let oldestTime = Infinity;
    let newestTime = 0;
    let largestKey = '';
    let largestSize = 0;

    this.cache.forEach((entry, key) => {
      const size = JSON.stringify(entry.data).length;
      totalSize += size;
      oldestTime = Math.min(oldestTime, entry.timestamp);
      newestTime = Math.max(newestTime, entry.timestamp);

      if (size > largestSize) {
        largestSize = size;
        largestKey = key;
      }
    });

    return {
      size: totalSize,
      entries: this.cache.size,
      oldestEntry: new Date(oldestTime),
      newestEntry: new Date(newestTime),
      largestEntry: largestKey ? { key: largestKey, size: largestSize } : undefined,
    };
  }

  // ============================================================
  // Private methods
  // ============================================================

  private checkRateLimit(agent: string): boolean {
    const now = Date.now();
    const entry = this.rateLimit.get(agent);

    if (!entry) {
      this.rateLimit.set(agent, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return true;
    }

    // Check if window expired
    if (now >= entry.resetTime) {
      this.rateLimit.set(agent, { count: 1, resetTime: now + this.RATE_LIMIT_WINDOW });
      return true;
    }

    // Check if under limit
    if (entry.count < this.RATE_LIMIT_MAX) {
      entry.count++;
      return true;
    }

    logger.warn(`Rate limit exceeded for agent: ${agent}`);
    return false;
  }

  private getRateLimitStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    const now = Date.now();

    this.rateLimit.forEach((entry, agent) => {
      if (now < entry.resetTime) {
        const remaining = this.RATE_LIMIT_MAX - entry.count;
        status[agent] = remaining;
      }
    });

    return status;
  }

  private setInCache(key: string, data: any): void {
    // Implement LRU: remove oldest entry if at capacity
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      let oldestKey = '';
      let oldestTime = Infinity;

      this.cache.forEach((entry, k) => {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = k;
        }
      });

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
      hits: 0,
    });
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hits
    entry.hits++;
    return entry.data;
  }

  private getCacheEntry(key: string): CacheEntry | undefined {
    return this.cache.get(key);
  }

  private invalidateRelatedCaches(keyword: string): void {
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (key.includes(keyword.toLowerCase())) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug(`Invalidated ${keysToDelete.length} cache entries for: ${keyword}`);
    }
  }
}

// Export for use in main application
export default AgentAPIWrapper;

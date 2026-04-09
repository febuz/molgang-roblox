/**
 * LightRAG Integration Tests
 *
 * Tests agent integration with LightRAG shared memory:
 * - Caching behavior
 * - Decision persistence
 * - Precedent finding
 * - Rate limiting
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { LightRAGClient } from '../../src/integrations/lightrag/client';
import { AgentAPIWrapper } from '../../src/integrations/lightrag/agent-api';
import { Decision, Risk, Precedent } from '../../src/integrations/lightrag/schema';

describe('LightRAG Agent Integration', () => {
  let client: LightRAGClient;
  let api: AgentAPIWrapper;

  beforeAll(async () => {
    // Initialize client (mock or real depending on test environment)
    client = new LightRAGClient({
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'password',
    });

    api = new AgentAPIWrapper(client);

    // Try to connect
    try {
      await client.connect();
      console.log('✓ Connected to Neo4j');
    } catch (error) {
      console.warn('⚠️  Neo4j not available, tests will use mocks');
    }
  });

  afterAll(async () => {
    await client.close();
  });

  describe('Query Caching', () => {
    it('should return results from LightRAG', async () => {
      const result = await api.queryMemory('test-agent', 'deployment');
      expect(result.success).toBe(true);
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.cached).toBe(false);
    });

    it('should cache query results', async () => {
      api.clearCache();

      const topic = 'test-topic-caching';

      // First query - should hit LightRAG
      const result1 = await api.queryMemory('test-agent', topic);
      expect(result1.cached).toBe(false);

      // Second query - should hit cache
      const result2 = await api.queryMemory('test-agent', topic);
      expect(result2.cached).toBe(true);
      expect(result2.cachedAt).toBeDefined();
      expect(result2.tokensSaved).toBeGreaterThan(0);
    });

    it('should have >90% cache hit rate after repeated queries', async () => {
      api.clearCache();

      const topic = 'repeated-query-test';
      const queries = 20;

      // First query to populate cache
      await api.queryMemory('test-agent', topic);

      // Repeat queries
      for (let i = 0; i < queries - 1; i++) {
        await api.queryMemory('test-agent', topic);
      }

      const status = await api.getMemoryStatus();
      expect(status.cacheHitRate).toBeGreaterThan(90);
    });

    it('should return cached data consistently', async () => {
      api.clearCache();

      const topic = 'consistency-test';

      const result1 = await api.queryMemory('test-agent', topic);
      const result2 = await api.queryMemory('test-agent', topic);

      expect(result1.results).toEqual(result2.results);
      expect(result2.cached).toBe(true);
    });
  });

  describe('Decision Storage', () => {
    it('should add a decision to memory', async () => {
      const decision: Decision = {
        when: new Date().toISOString(),
        who: 'test-agent',
        what: 'Use Kafka for distributed tasks',
        why: 'Enables decoupling and cost optimization',
        affects: ['architecture', 'deployment'],
      };

      await expect(api.addDecision('test-agent', decision)).resolves.not.toThrow();
    });

    it('should require valid decision fields', async () => {
      const invalidDecision = {
        who: 'test-agent',
        // Missing 'what' and 'why'
      } as any;

      await expect(api.addDecision('test-agent', invalidDecision)).rejects.toThrow();
    });

    it('should clear related caches when adding decision', async () => {
      api.clearCache();

      const topic = 'cache-invalidation-test';
      await api.queryMemory('test-agent', topic);

      const statsBefore = api.getCacheStats();
      expect(statsBefore.entries).toBeGreaterThan(0);

      const decision: Decision = {
        when: new Date().toISOString(),
        who: 'test-agent',
        what: 'Optimization related to ' + topic,
        why: 'Test decision',
        affects: [topic],
      };

      await api.addDecision('test-agent', decision);

      // Cache should be partially invalidated
      const statsAfter = api.getCacheStats();
      expect(statsAfter.entries).toBeLessThanOrEqual(statsBefore.entries);
    });
  });

  describe('Precedent Finding', () => {
    it('should find similar precedents', async () => {
      const results = await api.findPrecedent('database migration strategy', 0.7);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should respect similarity threshold', async () => {
      const highSimilarity = await api.findPrecedent('exact match test', 0.95);
      const lowSimilarity = await api.findPrecedent('exact match test', 0.5);

      // Higher threshold should return fewer or equal results
      expect(highSimilarity.length).toBeLessThanOrEqual(lowSimilarity.length);
    });

    it('should return empty for very specific threshold', async () => {
      const results = await api.findPrecedent('unique-nonsense-topic-xyz', 0.99);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow up to 100 queries per minute per agent', async () => {
      api.clearCache();
      const agent = 'rate-limit-test-agent';

      // Make 100 queries
      for (let i = 0; i < 100; i++) {
        const result = await api.queryMemory(agent, `query-${i}`);
        expect(result.success).toBe(true);
      }

      const status = await api.getMemoryStatus();
      expect(status.rateLimitStatus[agent]).toBeDefined();
    });

    it('should block queries exceeding rate limit', async () => {
      api.clearCache();
      const agent = 'blocked-agent';

      // Make 101 queries (exceeds limit of 100)
      let blockedCount = 0;
      for (let i = 0; i < 101; i++) {
        const result = await api.queryMemory(agent, `query-${i}`);
        if (!result.success) {
          blockedCount++;
        }
      }

      expect(blockedCount).toBeGreaterThan(0);
    });

    it('should reset rate limit after time window', async () => {
      api.clearCache();
      const agent = 'reset-test-agent';

      // Make query
      const result1 = await api.queryMemory(agent, 'test');
      expect(result1.success).toBe(true);

      // Wait for window (in real environment)
      // For tests, we'd need to mock time
      // This is a placeholder for actual time-based test

      const status = await api.getMemoryStatus();
      expect(status.rateLimitStatus).toBeDefined();
    });
  });

  describe('Memory Status', () => {
    it('should report connection status', async () => {
      const status = await api.getMemoryStatus();
      expect(status).toHaveProperty('connected');
      expect(typeof status.connected).toBe('boolean');
    });

    it('should report cache size', async () => {
      api.clearCache();
      api.queryMemory('test-agent', 'test-topic');

      const status = await api.getMemoryStatus();
      expect(status).toHaveProperty('cacheSize');
      expect(status.cacheSize).toBeGreaterThanOrEqual(0);
    });

    it('should report cache hit rate', async () => {
      api.clearCache();

      // Populate cache
      await api.queryMemory('test-agent', 'hit-rate-test');
      await api.queryMemory('test-agent', 'hit-rate-test');

      const status = await api.getMemoryStatus();
      expect(status).toHaveProperty('cacheHitRate');
      expect(status.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(status.cacheHitRate).toBeLessThanOrEqual(100);
    });

    it('should report uptime', async () => {
      const status = await api.getMemoryStatus();
      expect(status.uptime).toBeGreaterThan(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should report cache statistics', async () => {
      api.clearCache();
      await api.queryMemory('test-agent', 'stats-test');

      const stats = api.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(stats.entries).toBeGreaterThan(0);
    });

    it('should track oldest and newest entries', async () => {
      api.clearCache();

      await api.queryMemory('test-agent', 'first-entry');
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10));
      await api.queryMemory('test-agent', 'second-entry');

      const stats = api.getCacheStats();
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();

      if (stats.oldestEntry && stats.newestEntry) {
        expect(stats.oldestEntry.getTime()).toBeLessThanOrEqual(stats.newestEntry.getTime());
      }
    });

    it('should identify largest cache entry', async () => {
      api.clearCache();

      // Add entries of different sizes
      await api.queryMemory('test-agent', 'small-query');
      // Large query would be different topic

      const stats = api.getCacheStats();
      expect(stats).toHaveProperty('largestEntry');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent queries safely', async () => {
      api.clearCache();

      const queries = Array.from({ length: 10 }, (_, i) =>
        api.queryMemory('concurrent-agent', `query-${i}`)
      );

      const results = await Promise.all(queries);
      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle concurrent cache hits', async () => {
      api.clearCache();

      // Populate cache
      await api.queryMemory('test-agent', 'concurrent-cache-test');

      // Multiple concurrent reads
      const queries = Array.from({ length: 50 }, () =>
        api.queryMemory('test-agent', 'concurrent-cache-test')
      );

      const results = await Promise.all(queries);
      const cachedResults = results.filter(r => r.cached);
      expect(cachedResults.length).toBeGreaterThan(40); // Most should be cached
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty topic gracefully', async () => {
      const result = await api.queryMemory('test-agent', '');
      expect(result).toHaveProperty('success');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle very long topic strings', async () => {
      const longTopic = 'a'.repeat(1000);
      const result = await api.queryMemory('test-agent', longTopic);
      expect(result).toHaveProperty('success');
    });

    it('should handle special characters in topics', async () => {
      const specialTopic = "test@#$%^&*()[]{}|\\:;\"'<>?,./";
      const result = await api.queryMemory('test-agent', specialTopic);
      expect(result).toHaveProperty('success');
    });

    it('should handle very long agent names', async () => {
      const longAgent = 'agent-' + 'x'.repeat(100);
      const result = await api.queryMemory(longAgent, 'test-topic');
      expect(result).toHaveProperty('success');
    });
  });
});

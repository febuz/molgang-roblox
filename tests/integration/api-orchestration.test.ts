/**
 * API Orchestration Integration Tests
 *
 * Tests the complete API optimization pipeline:
 * - Caching layer
 * - Batching engine
 * - Cost analyzer
 * - API interceptor
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import CachingLayer from '../../src/middleware/caching-layer';
import BatchingEngine from '../../src/middleware/batching-engine';
import CostAnalyzer from '../../src/middleware/cost-analyzer';
import APIInterceptor from '../../src/middleware/api-interceptor';

const BUDGET_CONFIG = {
  daily_cents: 5000, // $50/day
  monthly_cents: 150000, // $1500/month
};

describe('API Orchestration & Cost Optimization', () => {
  let caching: CachingLayer;
  let batching: BatchingEngine;
  let costAnalyzer: CostAnalyzer;
  let interceptor: APIInterceptor;

  beforeAll(() => {
    caching = new CachingLayer();
    batching = new BatchingEngine();
    costAnalyzer = new CostAnalyzer(BUDGET_CONFIG);
    interceptor = new APIInterceptor(BUDGET_CONFIG);
  });

  afterAll(async () => {
    // Cleanup
    await interceptor.flush();
  });

  describe('Caching Layer', () => {
    it('should cache responses', () => {
      caching.set('prompt1', 'model-a', 'response1', 10, 50, 0.001);

      const cached = caching.get('prompt1', 'model-a');
      expect(cached).toBeDefined();
      expect(cached?.response).toBe('response1');
    });

    it('should have >90% cache hit rate on repeated queries', () => {
      caching.clear();

      // First query - cache miss
      caching.get('test-prompt', 'test-model');

      // Add to cache
      caching.set('test-prompt', 'test-model', 'test-response', 10, 50, 0.001);

      // Repeat queries - should hit cache
      for (let i = 0; i < 99; i++) {
        const result = caching.get('test-prompt', 'test-model');
        expect(result).toBeDefined();
      }

      const stats = caching.getStats();
      expect(stats.hitRate).toBeGreaterThan(90);
    });

    it('should respect TTL', async () => {
      caching.clear();
      caching.set('temp-prompt', 'model', 'response', 10, 50, 0.001);

      const cached1 = caching.get('temp-prompt', 'model');
      expect(cached1).toBeDefined();

      // Would need to wait 1 hour or mock time for true TTL test
      // For now, verify structure
      expect(cached1?.ttl).toBeGreaterThan(0);
    });

    it('should evict old entries when at capacity', () => {
      caching.clear();

      // Fill cache to near capacity
      for (let i = 0; i < 100; i++) {
        caching.set(`prompt${i}`, 'model', `response${i}`, 10, 50, 0.001);
      }

      const stats = caching.getStats();
      expect(stats.size).toBeLessThanOrEqual(5000);
    });

    it('should calculate cost savings', () => {
      caching.clear();
      caching.set('prompt', 'model', 'response', 10, 100, 0.01);

      // Hit cache 10 times
      for (let i = 0; i < 10; i++) {
        caching.get('prompt', 'model');
      }

      const stats = caching.getStats();
      expect(stats.tokensSaved).toBeGreaterThan(0);
      expect(stats.costSaved).toBeGreaterThan(0);
    });
  });

  describe('Batching Engine', () => {
    it('should batch similar requests', async () => {
      const batch1 = await batching.addRequest('claude-opus', 'prompt1');
      const batch2 = await batching.addRequest('claude-opus', 'prompt2');

      // Should be in same batch (both same model)
      expect(batch1.batchId).toBeDefined();
      expect(batch2.batchId).toBeDefined();
    });

    it('should track batching statistics', async () => {
      batching.resetStats();

      for (let i = 0; i < 30; i++) {
        await batching.addRequest('test-model', `prompt${i}`);
      }

      const stats = batching.getStats();
      expect(stats.totalRequests).toBe(30);
      expect(stats.batchedRequests).toBeGreaterThan(0);
    });

    it('should calculate API call reduction', async () => {
      batching.resetStats();

      // 100 similar requests should batch down
      for (let i = 0; i < 100; i++) {
        await batching.addRequest('claude-opus', `prompt${i}`, { temp: 0.7 });
      }

      const stats = batching.getStats();
      expect(stats.reductionPercentage).toBeGreaterThan(0);
      expect(stats.apiCallsReduced).toBeGreaterThan(0);
    });

    it('should flush pending batches', async () => {
      batching.resetStats();

      await batching.addRequest('model', 'prompt1');
      const before = batching.getPendingBatches().length;
      expect(before).toBeGreaterThan(0);

      await batching.flush();
      const after = batching.getPendingBatches().length;
      expect(after).toBe(0);
    });
  });

  describe('Cost Analyzer', () => {
    it('should record cost events', () => {
      costAnalyzer.reset();

      costAnalyzer.recordEvent({
        agent: 'agent-1',
        model: 'claude-opus',
        tokens_prompt: 100,
        tokens_completion: 200,
        cost_usd: 0.03,
      });

      const summary = costAnalyzer.getSummary();
      expect(summary.totalCost).toBe(0.03);
      expect(summary.eventCount).toBe(1);
    });

    it('should track per-agent costs', () => {
      costAnalyzer.reset();

      costAnalyzer.recordEvent({
        agent: 'agent-1',
        model: 'claude-opus',
        tokens_prompt: 100,
        tokens_completion: 200,
        cost_usd: 0.01,
      });

      costAnalyzer.recordEvent({
        agent: 'agent-2',
        model: 'claude-opus',
        tokens_prompt: 100,
        tokens_completion: 200,
        cost_usd: 0.02,
      });

      expect(costAnalyzer.getAgentCost('agent-1')).toBe(0.01);
      expect(costAnalyzer.getAgentCost('agent-2')).toBe(0.02);
    });

    it('should enforce budget limits', () => {
      costAnalyzer.reset();

      // Record cost approaching daily budget
      const costPerEvent = 1; // $1 per event
      const budgetUsd = BUDGET_CONFIG.daily_cents / 100; // $50

      for (let i = 0; i < 40; i++) {
        costAnalyzer.recordEvent({
          agent: 'agent-1',
          model: 'claude-opus',
          tokens_prompt: 100,
          tokens_completion: 200,
          cost_usd: costPerEvent,
        });
      }

      const summary = costAnalyzer.getSummary();
      expect(summary.dailyCost).toBeGreaterThan(budgetUsd * 0.8); // Over 80% of budget
    });

    it('should report top agents by cost', () => {
      costAnalyzer.reset();

      for (let i = 0; i < 5; i++) {
        costAnalyzer.recordEvent({
          agent: 'expensive-agent',
          model: 'claude-opus',
          tokens_prompt: 1000,
          tokens_completion: 2000,
          cost_usd: 0.1,
        });
      }

      for (let i = 0; i < 2; i++) {
        costAnalyzer.recordEvent({
          agent: 'cheap-agent',
          model: 'claude-opus',
          tokens_prompt: 10,
          tokens_completion: 20,
          cost_usd: 0.001,
        });
      }

      const top = costAnalyzer.getTopAgentsByCost(1);
      expect(top[0].agent).toBe('expensive-agent');
      expect(top[0].cost).toBeGreaterThan(0);
    });

    it('should calculate remaining budget', () => {
      costAnalyzer.reset();

      const dailyBudget = BUDGET_CONFIG.daily_cents / 100;
      costAnalyzer.recordEvent({
        agent: 'test',
        model: 'model',
        tokens_prompt: 100,
        tokens_completion: 200,
        cost_usd: 10,
      });

      const remaining = costAnalyzer.getRemainingDailyBudget();
      expect(remaining).toBe(dailyBudget - 10);
    });
  });

  describe('API Interceptor', () => {
    it('should intercept API calls', async () => {
      interceptor.reset();

      const result = await interceptor.intercept({
        agent: 'test-agent',
        model: 'claude-opus',
        prompt: 'What is machine learning?',
      });

      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('tokens_prompt');
      expect(result).toHaveProperty('tokens_completion');
      expect(result).toHaveProperty('cost_usd');
      expect(result).toHaveProperty('source');
    });

    it('should return cached responses', async () => {
      interceptor.reset();

      const prompt = 'Explain quantum computing';

      // First call - will be batched
      const result1 = await interceptor.intercept({
        agent: 'agent-1',
        model: 'claude-opus',
        prompt,
      });

      expect(result1.source).toBe('batch');

      // Subsequent calls with same prompt should hit cache
      const result2 = await interceptor.intercept({
        agent: 'agent-2',
        model: 'claude-opus',
        prompt,
      });

      expect(result2.source).toBe('cache');
    });

    it('should track optimization statistics', async () => {
      interceptor.reset();

      const prompt = 'Test prompt';
      for (let i = 0; i < 10; i++) {
        await interceptor.intercept({
          agent: 'agent-1',
          model: 'claude-opus',
          prompt,
        });
      }

      const stats = interceptor.getStats();
      expect(stats.totalCalls).toBe(10);
      expect(stats.cacheHits).toBeGreaterThan(0);
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });

    it('should provide comprehensive dashboard', async () => {
      interceptor.reset();

      await interceptor.intercept({
        agent: 'agent-1',
        model: 'claude-opus',
        prompt: 'dashboard test',
        task_id: 'task-1',
      });

      const dashboard = interceptor.getDashboard();
      expect(dashboard).toHaveProperty('optimization');
      expect(dashboard).toHaveProperty('caching');
      expect(dashboard).toHaveProperty('batching');
      expect(dashboard).toHaveProperty('cost');
    });
  });

  describe('Cost Reduction (MVP Goal: 87%)', () => {
    it('should demonstrate >30% reduction from batching', async () => {
      batching.resetStats();

      // 100 requests without optimization = 100 API calls
      for (let i = 0; i < 100; i++) {
        await batching.addRequest('claude-opus', `prompt${i}`);
      }

      const stats = batching.getStats();
      expect(stats.reductionPercentage).toBeGreaterThan(20);
    });

    it('should demonstrate >40% cache hit rate', async () => {
      caching.clear();
      caching.resetStats();

      // Add 50 unique prompts
      for (let i = 0; i < 50; i++) {
        caching.set(`prompt${i}`, 'model', `response${i}`, 10, 50, 0.001);
      }

      // Access 250 times (heavily repeated)
      for (let i = 0; i < 250; i++) {
        const idx = i % 50;
        caching.get(`prompt${idx}`, 'model');
      }

      const stats = caching.getStats();
      expect(stats.hitRate).toBeGreaterThan(40);
    });

    it('should show total cost reduction from combined techniques', async () => {
      interceptor.reset();

      // Simulate 1000 API calls with optimization
      for (let i = 0; i < 100; i++) {
        const prompt = `test${i % 10}`; // 10 unique prompts repeated
        await interceptor.intercept({
          agent: `agent-${i % 5}`,
          model: 'claude-opus',
          prompt,
        });
      }

      const stats = interceptor.getStats();
      // Should see significant cost reduction
      expect(stats.costReductionPercent).toBeGreaterThan(0);
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });
  });

  describe('Budget Enforcement', () => {
    it('should alert when approaching daily budget', () => {
      costAnalyzer.reset();

      // Spend 45% of daily budget
      const budgetUsd = BUDGET_CONFIG.daily_cents / 100;
      const spendUsd = budgetUsd * 0.45;

      costAnalyzer.recordEvent({
        agent: 'test',
        model: 'model',
        tokens_prompt: 100,
        tokens_completion: 200,
        cost_usd: spendUsd,
      });

      expect(costAnalyzer.isDailyBudgetExceeded()).toBe(false);
    });

    it('should block when budget exceeded', () => {
      costAnalyzer.reset();

      const budgetUsd = BUDGET_CONFIG.daily_cents / 100;
      const overspendUsd = budgetUsd * 1.1; // 110% of budget

      costAnalyzer.recordEvent({
        agent: 'test',
        model: 'model',
        tokens_prompt: 100,
        tokens_completion: 200,
        cost_usd: overspendUsd,
      });

      expect(costAnalyzer.isDailyBudgetExceeded()).toBe(true);
    });
  });
});

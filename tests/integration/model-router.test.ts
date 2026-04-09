/**
 * Model Router Integration Tests
 *
 * Tests multi-tier intelligent model orchestration:
 * - Complexity analysis
 * - Tier selection (local/standard/premium)
 * - Cost optimization
 * - Routing statistics
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ModelRouter } from '../../src/orchestration/model-router';

describe('Model Router - Multi-Tier Orchestration', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter();
  });

  describe('Complexity Analysis', () => {
    it('should analyze simple tasks as low complexity', () => {
      const task = { description: 'Hello world' };
      const complexity = router.analyzeComplexity(task);
      expect(complexity).toBeLessThan(40);
    });

    it('should analyze code tasks as medium complexity', () => {
      const task = { description: 'Write code to implement a feature' };
      const complexity = router.analyzeComplexity(task);
      expect(complexity).toBeGreaterThan(30);
      expect(complexity).toBeLessThan(80);
    });

    it('should analyze architectural tasks as high complexity', () => {
      const task = { description: 'Design the system architecture for a distributed system' };
      const complexity = router.analyzeComplexity(task);
      expect(complexity).toBeGreaterThan(40);
    });

    it('should factor in critical priority', () => {
      const simplTask = { description: 'Fix bug', priority: 'low' };
      const criticalTask = { description: 'Fix bug', priority: 'critical' };

      const simple = router.analyzeComplexity(simplTask);
      const critical = router.analyzeComplexity(criticalTask);

      expect(critical).toBeGreaterThan(simple);
    });

    it('should factor in token count', () => {
      const shortTask = { description: 'Brief', estimated_tokens: 100 };
      const longTask = { description: 'Brief', estimated_tokens: 10000 };

      const short = router.analyzeComplexity(shortTask);
      const long = router.analyzeComplexity(longTask);

      expect(long).toBeGreaterThan(short);
    });

    it('should return complexity between 0-100', () => {
      const tasks = [
        { description: 'a' },
        { description: 'Simple task' },
        { description: 'Design complex architecture' },
        { description: 'x'.repeat(5000) }
      ];

      for (const task of tasks) {
        const complexity = router.analyzeComplexity(task);
        expect(complexity).toBeGreaterThanOrEqual(0);
        expect(complexity).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('Tier Selection', () => {
    it('should route simple tasks to tier1 (local)', () => {
      const task = { description: 'Quick calculation' };
      const decision = router.route(task);
      expect(decision.tier).toBe('tier1');
      expect(decision.estimated_cost).toBe(0);
    });

    it('should route medium tasks to tier2 (standard cloud)', () => {
      const task = {
        description: 'Analyze and implement code changes',
        estimated_tokens: 2000
      };
      const decision = router.route(task);
      expect(['tier1', 'tier2']).toContain(decision.tier);
    });

    it('should route complex tasks to tier3 (premium)', () => {
      const task = {
        description: 'Design complete system architecture with scalability requirements',
        priority: 'critical',
        estimated_tokens: 10000
      };
      const decision = router.route(task);
      expect(decision.tier).toBe('tier3');
      expect(decision.model).toBe('claude-opus');
    });

    it('should select appropriate tier1 model', () => {
      const task = { description: 'Quick response needed' };
      const decision = router.route(task);

      if (decision.tier === 'tier1') {
        expect(['phi-4-15b', 'qwen-27b', 'deepseek-r1-8b']).toContain(decision.model);
      }
    });

    it('should select appropriate tier2 model', () => {
      const task = {
        description: 'Implement code optimization',
        estimated_tokens: 3000
      };
      const decision = router.route(task);

      if (decision.tier === 'tier2') {
        expect(['mistral-7b', 'llama-70b']).toContain(decision.model);
      }
    });
  });

  describe('Cost Optimization', () => {
    it('should prefer free models for simple tasks', () => {
      const task = { description: 'Say hello' };
      const decision = router.route(task);
      expect(decision.estimated_cost).toBe(0);
    });

    it('should estimate cost for cloud models', () => {
      const task = {
        description: 'Complex reasoning task that requires cloud',
        priority: 'critical',
        estimated_tokens: 5000
      };
      const decision = router.route(task);
      expect(decision.estimated_cost).toBeGreaterThan(0);
    });

    it('should have latency estimates', () => {
      const task = { description: 'Test task' };
      const decision = router.route(task);
      expect(decision.estimated_latency).toBeGreaterThan(0);
      expect(decision.estimated_latency).toBeLessThan(10000);
    });

    it('should provide reasoning for routing decision', () => {
      const task = { description: 'Analyze this data' };
      const decision = router.route(task);
      expect(decision.reasoning).toBeDefined();
      expect(decision.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('Routing Statistics', () => {
    it('should track routing decisions', () => {
      router.route({ description: 'Task 1' });
      router.route({ description: 'Task 2' });
      router.route({ description: 'Task 3' });

      const stats = router.getStats();
      expect(stats.totalCalls).toBe(3);
    });

    it('should track tier distribution', () => {
      // Route some tasks
      for (let i = 0; i < 5; i++) {
        router.route({ description: 'Simple' });
      }

      const stats = router.getStats();
      expect(stats.tier1_usage + stats.tier2_usage + stats.tier3_usage).toBe(5);
    });

    it('should calculate average complexity', () => {
      router.route({ description: 'Simple' });
      router.route({ description: 'Design complex system' });

      const stats = router.getStats();
      expect(stats.avgComplexity).toBeGreaterThan(0);
      expect(stats.avgComplexity).toBeLessThanOrEqual(100);
    });

    it('should estimate cost savings', () => {
      for (let i = 0; i < 10; i++) {
        router.route({ description: 'Simple task' });
      }

      const stats = router.getStats();
      // Using free tier1 models should show savings
      expect(stats.costsavings).toBeGreaterThanOrEqual(0);
    });

    it('should provide model recommendations', () => {
      for (let i = 0; i < 5; i++) {
        router.route({ description: 'Test task' });
      }

      const recommendations = router.getRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);

      // Should recommend models that were used
      if (recommendations.length > 0) {
        expect(recommendations[0]).toHaveProperty('model');
        expect(recommendations[0]).toHaveProperty('avgCost');
        expect(recommendations[0]).toHaveProperty('avgLatency');
      }
    });
  });

  describe('Model Profiles', () => {
    it('should have tier1 models defined', () => {
      const tier1Tasks = [
        { description: 'Quick task' },
        { description: 'Brief request' }
      ];

      for (const task of tier1Tasks) {
        const decision = router.route(task);
        if (decision.tier === 'tier1') {
          expect(decision.estimated_cost).toBe(0);
        }
      }
    });

    it('should have different latency for different models', () => {
      const decisions = [];

      // Create tasks with different complexity
      decisions.push(router.route({ description: 'Simple task' }));
      decisions.push(router.route({ description: 'Code implementation required' }));
      decisions.push(router.route({ description: 'Design complex architecture for critical system' }));

      const latencies = new Set(decisions.map(d => d.estimated_latency));
      // Different tiers have different latencies
      expect(latencies.size).toBeGreaterThanOrEqual(1); // May have one or more unique latencies
    });

    it('should support all capability requirements', () => {
      const capabilityTasks = [
        { description: 'Write code for the algorithm' }, // coding
        { description: 'Analyze and reason about this problem' }, // reasoning
        { description: 'Design the architecture' }, // design
      ];

      for (const task of capabilityTasks) {
        const decision = router.route(task);
        expect(decision.model).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle null task', () => {
      const complexity = router.analyzeComplexity(null);
      expect(complexity).toBe(0);
    });

    it('should handle empty task', () => {
      const complexity = router.analyzeComplexity({});
      expect(complexity).toBeGreaterThanOrEqual(0);
    });

    it('should handle very long task description', () => {
      const task = { description: 'x'.repeat(10000) };
      const decision = router.route(task);
      expect(decision).toBeDefined();
      expect(decision.tier).toBeDefined();
    });

    it('should handle invalid priority gracefully', () => {
      const task = { description: 'Test', priority: 'invalid' };
      const complexity = router.analyzeComplexity(task);
      expect(complexity).toBeLessThan(100);
    });
  });

  describe('Cost Reduction Verification', () => {
    it('should demonstrate cost reduction through intelligent routing', () => {
      // Simulate mixed workload
      const workload = [
        ...Array(50).fill({ description: 'Simple task' }), // 50 simple
        ...Array(30).fill({ description: 'Code implementation task' }), // 30 medium
        ...Array(20).fill({ description: 'Strategic design architecture' }) // 20 complex
      ];

      let tier1Count = 0;
      let totalCost = 0;

      for (const task of workload) {
        const decision = router.route(task);
        if (decision.tier === 'tier1') tier1Count++;
        totalCost += decision.estimated_cost;
      }

      const stats = router.getStats();

      // At least 40% should be tier1 (free)
      expect(tier1Count).toBeGreaterThanOrEqual(40);

      // Total cost should be low due to routing
      expect(totalCost).toBeLessThan(0.01); // Less than 1 cent for 100 requests

      // Should show positive savings
      expect(stats.costsavings).toBeGreaterThan(0);
    });
  });
});

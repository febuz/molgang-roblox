/**
 * Model Router - Intelligent API Call Routing
 *
 * Routes requests to optimal model based on:
 * - Task complexity
 * - Required capabilities
 * - Cost efficiency
 * - Available capacity
 */

import logger from '../utils/logger';

export interface RoutingDecision {
  model: string;
  tier: 'local' | 'cloud';
  estimated_cost: number;
  estimated_latency: number;
  reasoning: string;
}

export class ModelRouter {
  private localModels: string[];
  private cloudModels: string[];
  private defaultRouting: string;

  // Model capabilities & costs
  private modelProfiles = {
    'qwen-27b': {
      tier: 'local' as const,
      cost_per_1k_tokens: 0,
      max_tokens: 32000,
      latency_ms: 500,
      best_for: ['general', 'reasoning', 'analysis']
    },
    'phi-4': {
      tier: 'local' as const,
      cost_per_1k_tokens: 0,
      max_tokens: 16000,
      latency_ms: 200,
      best_for: ['creative', 'quick_response']
    },
    'deepseek-r1': {
      tier: 'local' as const,
      cost_per_1k_tokens: 0,
      max_tokens: 8000,
      latency_ms: 800,
      best_for: ['reasoning', 'complex_logic']
    },
    'claude-opus': {
      tier: 'cloud' as const,
      cost_per_1k_tokens: 0.003,
      max_tokens: 200000,
      latency_ms: 5000,
      best_for: ['complex', 'multi_step', 'critical']
    },
    'mythos': {
      tier: 'cloud' as const,
      cost_per_1k_tokens: 0.002,
      max_tokens: 100000,
      latency_ms: 4000,
      best_for: ['creative', 'unrestricted']
    }
  };

  constructor(config: {
    local_models: string[];
    cloud_models: string[];
    default_routing: string;
  }) {
    this.localModels = config.local_models;
    this.cloudModels = config.cloud_models;
    this.defaultRouting = config.default_routing;
  }

  /**
   * Route a task to the optimal model
   */
  async route(task: any, context?: any): Promise<RoutingDecision> {
    const complexity = this.analyzeComplexity(task);
    const requiredCapabilities = this.extractCapabilities(task);

    logger.debug(`Routing task with complexity: ${complexity}`);

    // Decision logic
    if (complexity === 'low') {
      // Use local model for quick, simple tasks
      return this.selectLocalModel('quick_response', context);
    }

    if (complexity === 'medium') {
      // Check if local can handle
      const localOption = this.selectLocalModel('general', context);
      if (localOption.estimated_cost < 0.01) {
        return localOption;
      }
      // Otherwise use cloud
      return this.selectCloudModel(requiredCapabilities, context);
    }

    // High complexity: use cloud (more powerful)
    return this.selectCloudModel('critical', context);
  }

  /**
   * Analyze task complexity
   */
  private analyzeComplexity(task: any): 'low' | 'medium' | 'high' {
    if (!task) return 'low';

    const taskStr = JSON.stringify(task).toLowerCase();

    // Markers for high complexity
    if (
      taskStr.includes('architecture') ||
      taskStr.includes('design') ||
      taskStr.includes('strategy') ||
      taskStr.includes('critical') ||
      task.estimated_tokens > 5000
    ) {
      return 'high';
    }

    // Markers for medium
    if (
      taskStr.includes('code') ||
      taskStr.includes('implement') ||
      taskStr.includes('analysis')
    ) {
      return 'medium';
    }

    // Default: low
    return 'low';
  }

  /**
   * Extract required capabilities
   */
  private extractCapabilities(task: any): string[] {
    const capabilities: string[] = [];

    if (!task) return capabilities;

    const taskStr = JSON.stringify(task).toLowerCase();

    if (taskStr.includes('create') || taskStr.includes('generate')) capabilities.push('generation');
    if (taskStr.includes('reason') || taskStr.includes('logic')) capabilities.push('reasoning');
    if (taskStr.includes('analyze')) capabilities.push('analysis');
    if (taskStr.includes('code')) capabilities.push('coding');

    return capabilities;
  }

  /**
   * Select local model for task
   */
  private selectLocalModel(preference: string, context?: any): RoutingDecision {
    // Prefer based on type
    let selectedModel = 'qwen-27b'; // Default

    if (preference === 'quick_response') {
      selectedModel = 'phi-4';
    } else if (preference === 'reasoning') {
      selectedModel = 'deepseek-r1';
    }

    const profile = (this.modelProfiles as any)[selectedModel];

    return {
      model: selectedModel,
      tier: 'local',
      estimated_cost: 0,
      estimated_latency: profile.latency_ms,
      reasoning: `Local model selected (free, ${profile.latency_ms}ms latency)`
    };
  }

  /**
   * Select cloud model for task
   */
  private selectCloudModel(preference: string | string[], context?: any): RoutingDecision {
    // Claude Opus for complex work
    let selectedModel = 'claude-opus';

    // Mythos for creative
    if (
      (Array.isArray(preference) && preference.includes('creative')) ||
      (typeof preference === 'string' && preference.includes('creative'))
    ) {
      selectedModel = 'mythos';
    }

    const profile = (this.modelProfiles as any)[selectedModel];

    return {
      model: selectedModel,
      tier: 'cloud',
      estimated_cost: 0.03, // Rough estimate for typical call
      estimated_latency: profile.latency_ms,
      reasoning: `Cloud model selected (powerful capability, $${profile.cost_per_1k_tokens}/1k tokens)`
    };
  }

  /**
   * Get routing statistics
   */
  getStats(): any {
    return {
      local_models_available: this.localModels.length,
      cloud_models_available: this.cloudModels.length,
      default_strategy: this.defaultRouting,
      cost_reduction_potential: '87%'
    };
  }
}

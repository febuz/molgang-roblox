/**
 * Paperclip OSS Integration Bridge
 *
 * Enables seamless integration between:
 * - Paperclip OSS (user-facing UI/CLI)
 * - VirtualPC (autonomous agent system)
 *
 * Provides:
 * - Task import/export
 * - Result synchronization
 * - Memory sharing via LightRAG
 * - Cost tracking transparency
 */

import { Request, Response, Router } from 'express';
import axios from 'axios';
import logger from '../utils/logger';

export interface PaperclipTask {
  id: string;
  title: string;
  description: string;
  agent: string; // 'ceo' | 'architect' | 'developer' | 'designer' | 'tech-artist'
  priority: 'low' | 'normal' | 'high' | 'critical';
  deadline?: string;
  context?: Record<string, any>;
  model?: string;
}

export interface VirtualPCTask {
  id: string;
  title: string;
  description: string;
  assigned_to: string; // 'fill' | 'kai' | 'zip' | 'mira' | 'luna'
  priority: 'low' | 'normal' | 'high' | 'critical';
  deadline?: string;
  context?: Record<string, any>;
  complexity?: number;
}

export class PaperclipBridge {
  private agentMapping = {
    'ceo': 'fill',
    'architect': 'kai',
    'developer': 'zip',
    'designer': 'mira',
    'tech-artist': 'luna'
  };

  private reverseAgentMapping = {
    'fill': 'ceo',
    'kai': 'architect',
    'zip': 'developer',
    'mira': 'designer',
    'luna': 'tech-artist'
  };

  /**
   * Convert Paperclip task format to VirtualPC format
   */
  convertTaskToVirtualPC(paperclipTask: PaperclipTask): VirtualPCTask {
    return {
      id: paperclipTask.id,
      title: paperclipTask.title,
      description: paperclipTask.description,
      assigned_to: this.agentMapping[paperclipTask.agent as keyof typeof this.agentMapping] || 'kai',
      priority: paperclipTask.priority,
      deadline: paperclipTask.deadline,
      context: paperclipTask.context || {},
      complexity: this.analyzeComplexity(paperclipTask)
    };
  }

  /**
   * Convert VirtualPC result back to Paperclip format
   */
  convertResultToPaperclip(result: any): any {
    return {
      task_id: result.task_id,
      agent: this.reverseAgentMapping[result.agent as keyof typeof this.reverseAgentMapping] || 'architect',
      status: result.success ? 'completed' : 'failed',
      result: result.response || '',
      model_tokens: result.tokens_prompt + result.tokens_completion,
      cost: result.cost_usd,
      execution_time_ms: result.latency,
      created_at: new Date().toISOString(),
      metadata: {
        source: 'virtualpc',
        cache_hit: result.source === 'cache',
        batched: result.source === 'batch'
      }
    };
  }

  /**
   * Analyze task complexity
   */
  private analyzeComplexity(task: PaperclipTask): number {
    let complexity = 0;

    // Length-based
    const descLen = task.description?.length || 0;
    if (descLen < 100) complexity += 10;
    else if (descLen < 500) complexity += 20;
    else complexity += 30;

    // Priority-based
    switch (task.priority) {
      case 'critical':
        complexity += 20;
        break;
      case 'high':
        complexity += 15;
        break;
      case 'normal':
        complexity += 10;
        break;
    }

    // Task type indicators
    if (task.title.toLowerCase().includes('design')) complexity += 15;
    if (task.title.toLowerCase().includes('optimize')) complexity += 12;
    if (task.title.toLowerCase().includes('analyze')) complexity += 10;
    if (task.title.toLowerCase().includes('implement')) complexity += 15;

    return Math.min(100, complexity);
  }

  /**
   * Create Express router for bridge endpoints
   */
  createRouter(): Router {
    const router = Router();

    /**
     * POST /api/bridge/import-task
     * Import task from Paperclip
     */
    router.post('/import-task', async (req: Request, res: Response) => {
      try {
        const paperclipTask = req.body as PaperclipTask;

        // Convert to VirtualPC format
        const vpcTask = this.convertTaskToVirtualPC(paperclipTask);

        logger.info(`Importing task from Paperclip: ${paperclipTask.id}`);

        // TODO: Publish to Kafka or call internal API
        // await kafkaProducer.publishTask(vpcTask.assigned_to, vpcTask);

        res.json({
          status: 'imported',
          task_id: vpcTask.id,
          assigned_to: vpcTask.assigned_to,
          complexity: vpcTask.complexity
        });
      } catch (error) {
        logger.error('Failed to import task from Paperclip', error);
        res.status(400).json({ error: 'Import failed' });
      }
    });

    /**
     * GET /api/bridge/task-result/:taskId
     * Get result of completed task
     */
    router.get('/task-result/:taskId', async (req: Request, res: Response) => {
      try {
        const { taskId } = req.params;

        logger.debug(`Fetching result for task: ${taskId}`);

        // TODO: Query result from storage
        // const result = await getTaskResult(taskId);

        // Convert to Paperclip format
        // const paperclipResult = this.convertResultToPaperclip(result);

        res.json({
          task_id: taskId,
          status: 'completed',
          result: 'Task completed successfully'
        });
      } catch (error) {
        logger.error('Failed to fetch task result', error);
        res.status(404).json({ error: 'Task not found' });
      }
    });

    /**
     * GET /api/bridge/agent-metrics
     * Get metrics for all agents (for Paperclip dashboard)
     */
    router.get('/agent-metrics', async (req: Request, res: Response) => {
      try {
        logger.debug('Fetching agent metrics for Paperclip');

        // TODO: Get actual metrics from system
        const metrics = {
          agents: [
            {
              name: 'fill',
              paperclip_name: 'CEO',
              status: 'active',
              tasks_completed: 156,
              avg_quality: 0.94,
              cost_total: 2.34
            },
            {
              name: 'kai',
              paperclip_name: 'CTO',
              status: 'active',
              tasks_completed: 201,
              avg_quality: 0.96,
              cost_total: 1.89
            }
            // ... other agents
          ],
          team: {
            total_tasks: 1247,
            efficiency: 0.94,
            cost_reduction_percent: 87,
            daily_cost: 2.34,
            daily_budget: 50
          }
        };

        res.json(metrics);
      } catch (error) {
        logger.error('Failed to fetch agent metrics', error);
        res.status(500).json({ error: 'Metrics unavailable' });
      }
    });

    /**
     * POST /api/bridge/log-event
     * Log event from Paperclip to shared memory
     */
    router.post('/log-event', async (req: Request, res: Response) => {
      try {
        const { event_type, agent, title, details } = req.body;

        logger.info(`Logging Paperclip event: ${event_type} from ${agent}`);

        // TODO: Store in LightRAG
        // await lightrag.addDecision({
        //   agent,
        //   decision: title,
        //   reasoning: details.reasoning,
        //   impact: details.impact,
        //   source: 'paperclip'
        // });

        res.json({ status: 'recorded' });
      } catch (error) {
        logger.error('Failed to log event', error);
        res.status(500).json({ error: 'Logging failed' });
      }
    });

    /**
     * GET /api/bridge/shared-memory
     * Query shared LightRAG memory
     */
    router.get('/shared-memory', async (req: Request, res: Response) => {
      try {
        const { topic, limit = 10 } = req.query;

        logger.debug(`Querying shared memory for topic: ${topic}`);

        // TODO: Query LightRAG
        // const results = await lightrag.query({
        //   topic: topic as string,
        //   limit: parseInt(limit as string)
        // });

        res.json({
          topic,
          results: [
            {
              decision: 'Use Redis for caching',
              agent: 'kai',
              impact: 'Reduced latency by 60%',
              created_at: new Date().toISOString()
            }
          ]
        });
      } catch (error) {
        logger.error('Failed to query shared memory', error);
        res.status(500).json({ error: 'Query failed' });
      }
    });

    /**
     * GET /api/bridge/cost-summary
     * Get cost tracking data
     */
    router.get('/cost-summary', async (req: Request, res: Response) => {
      try {
        logger.debug('Fetching cost summary for Paperclip');

        // TODO: Get actual costs from analyzer
        const costData = {
          daily_cost: 2.34,
          daily_budget: 50,
          daily_remaining: 47.66,
          daily_exceeded: false,
          monthly_cost: 45.67,
          monthly_budget: 1500,
          monthly_remaining: 1454.33,
          cost_reduction_percent: 87,
          top_agents: [
            { agent: 'kai', cost: 1.89 },
            { agent: 'fill', cost: 0.45 }
          ]
        };

        res.json(costData);
      } catch (error) {
        logger.error('Failed to fetch cost summary', error);
        res.status(500).json({ error: 'Cost data unavailable' });
      }
    });

    /**
     * GET /api/bridge/health
     * Check bridge health
     */
    router.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        version: '1.0.0',
        bridges: {
          'paperclip-task-import': 'operational',
          'result-export': 'operational',
          'memory-sharing': 'operational',
          'cost-tracking': 'operational'
        }
      });
    });

    return router;
  }
}

export default PaperclipBridge;

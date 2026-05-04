/**
 * Kafka Producer - Publish messages to Kafka topics
 *
 * Handles:
 * - Task publishing
 * - Result publishing
 * - Cost tracking
 * - Memory updates
 * - Batch optimization
 */

import { Kafka, Producer } from 'kafkajs';
import { v4 as uuid } from 'uuid';
import logger from '../../utils/logger';

export interface ProducerConfig {
  brokers: string[];
  clientId: string;
}

export class KafkaProducer {
  private kafka: Kafka;
  private producer: Producer;
  private connected: boolean = false;

  constructor(config: ProducerConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      idempotent: true,
      maxInFlightRequests: 5,
    });
  }

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      this.connected = true;
      logger.info('✓ Kafka Producer connected');
    } catch (error) {
      logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  /**
   * Publish a task to agent.tasks
   */
  async publishTask(agent: string, task: any): Promise<string> {
    if (!this.connected) {
      throw new Error('Producer not connected');
    }

    const taskId = uuid();
    const timestamp = new Date().toISOString();

    try {
      await this.producer.send({
        topic: 'agent.tasks',
        messages: [
          {
            key: agent,
            value: JSON.stringify({
              id: taskId,
              agent,
              ...task,
              assigned_at: timestamp,
            }),
            headers: {
              'correlation-id': taskId,
              'timestamp': timestamp,
            },
          },
        ],
      });

      logger.info(`Task published: ${taskId} → ${agent}`);
      return taskId;
    } catch (error) {
      logger.error(`Failed to publish task: ${agent}`, error);
      throw error;
    }
  }

  /**
   * Publish results from agent
   */
  async publishResult(taskId: string, agent: string, result: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Producer not connected');
    }

    const timestamp = new Date().toISOString();

    try {
      await this.producer.send({
        topic: 'agent.results',
        messages: [
          {
            key: taskId,
            value: JSON.stringify({
              task_id: taskId,
              agent,
              ...result,
              completed_at: timestamp,
            }),
            headers: {
              'correlation-id': taskId,
              'timestamp': timestamp,
            },
          },
        ],
      });

      logger.info(`Result published: ${taskId} from ${agent}`);
    } catch (error) {
      logger.error(`Failed to publish result: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * Publish API request to model.requests
   */
  async publishModelRequest(request: any): Promise<string> {
    if (!this.connected) {
      throw new Error('Producer not connected');
    }

    const requestId = uuid();
    const timestamp = new Date().toISOString();

    try {
      await this.producer.send({
        topic: 'model.requests',
        messages: [
          {
            key: request.model || 'default',
            value: JSON.stringify({
              id: requestId,
              ...request,
              requested_at: timestamp,
            }),
            headers: {
              'correlation-id': requestId,
              'timestamp': timestamp,
            },
          },
        ],
      });

      logger.debug(`Model request published: ${requestId} (${request.model})`);
      return requestId;
    } catch (error) {
      logger.error(`Failed to publish model request`, error);
      throw error;
    }
  }

  /**
   * Publish model response
   */
  async publishModelResponse(response: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Producer not connected');
    }

    const timestamp = new Date().toISOString();

    try {
      await this.producer.send({
        topic: 'model.responses',
        messages: [
          {
            key: response.request_id || 'default',
            value: JSON.stringify({
              ...response,
              completed_at: timestamp,
            }),
            headers: {
              'correlation-id': response.request_id,
              'timestamp': timestamp,
            },
          },
        ],
      });

      logger.debug(`Model response published: ${response.request_id}`);
    } catch (error) {
      logger.error(`Failed to publish model response`, error);
      throw error;
    }
  }

  /**
   * Track API cost
   */
  async trackCost(cost: {
    agent: string;
    model: string;
    tokens_prompt: number;
    tokens_completion: number;
    cost_usd: number;
    task_id?: string;
  }): Promise<void> {
    if (!this.connected) {
      throw new Error('Producer not connected');
    }

    const timestamp = new Date().toISOString();

    try {
      await this.producer.send({
        topic: 'cost.tracking',
        messages: [
          {
            key: cost.agent,
            value: JSON.stringify({
              id: uuid(),
              ...cost,
              timestamp,
            }),
          },
        ],
      });

      logger.debug(
        `Cost tracked: ${cost.agent} (${cost.model}) - $${cost.cost_usd.toFixed(4)}`
      );
    } catch (error) {
      logger.error(`Failed to track cost`, error);
      throw error;
    }
  }

  /**
   * Publish memory update (decision, risk, precedent)
   */
  async publishMemoryUpdate(update: {
    type: 'decision' | 'risk' | 'precedent' | 'context';
    content: string;
    agent: string;
    affects?: string[];
    metadata?: Record<string, any>;
  }): Promise<string> {
    if (!this.connected) {
      throw new Error('Producer not connected');
    }

    const updateId = uuid();
    const timestamp = new Date().toISOString();

    try {
      await this.producer.send({
        topic: 'lightrag.updates',
        messages: [
          {
            key: update.type,
            value: JSON.stringify({
              id: updateId,
              ...update,
              created_at: timestamp,
            }),
          },
        ],
      });

      logger.debug(`Memory update published: ${update.type} from ${update.agent}`);
      return updateId;
    } catch (error) {
      logger.error(`Failed to publish memory update`, error);
      throw error;
    }
  }

  /**
   * Publish health check
   */
  async publishHealthCheck(component: string, status: string, metrics?: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Producer not connected');
    }

    try {
      await this.producer.send({
        topic: 'system.health',
        messages: [
          {
            key: component,
            value: JSON.stringify({
              component,
              status,
              metrics: metrics || {},
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      });

      logger.debug(`Health check published: ${component} → ${status}`);
    } catch (error) {
      logger.error(`Failed to publish health check`, error);
      // Don't throw for health checks - they're non-critical
    }
  }

  /**
   * Publish a commit.audit event (recorded by post-commit git hook +
   * /api/audit/commit endpoint).
   */
  async publishCommitAudit(payload: {
    sha: string;
    shortSha: string;
    author: string;
    ts: string;
    subject: string;
    attributedAgent?: string;
    taskRef?: string | null;
    source?: string;
  }): Promise<void> {
    if (!this.connected) return;
    await this.producer.send({
      topic: 'commit.audit',
      messages: [{ key: payload.sha, value: JSON.stringify(payload) }],
    });
  }

  /**
   * Publish a task.failed event when a task hits a non-recoverable error
   * (LM Studio timeout, model load failure, artifact-gen exception).
   */
  async publishTaskFailed(payload: {
    task_id: string;
    agent: string;
    title?: string;
    failure_stage: 'artifact-gen' | 'chat' | 'tool' | 'other';
    error: string;
    ts: string;
  }): Promise<void> {
    if (!this.connected) return;
    await this.producer.send({
      topic: 'task.failed',
      messages: [{ key: payload.task_id, value: JSON.stringify(payload) }],
    });
  }

  /**
   * Batch publish messages
   */
  async publishBatch(topic: string, messages: any[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Producer not connected');
    }

    try {
      await this.producer.send({
        topic,
        messages: messages.map((msg) => ({
          key: msg.key || 'default',
          value: JSON.stringify(msg.value),
        })),
      });

      logger.debug(`Batch published: ${messages.length} messages → ${topic}`);
    } catch (error) {
      logger.error(`Failed to publish batch to ${topic}`, error);
      throw error;
    }
  }

  /**
   * Disconnect producer
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        await this.producer.disconnect();
        this.connected = false;
        logger.info('✓ Kafka Producer disconnected');
      } catch (error) {
        logger.error('Error disconnecting producer:', error);
      }
    }
  }

  /**
   * Get producer status
   */
  getStatus(): { connected: boolean; status: string } {
    return {
      connected: this.connected,
      status: this.connected ? 'operational' : 'disconnected',
    };
  }
}

export default KafkaProducer;

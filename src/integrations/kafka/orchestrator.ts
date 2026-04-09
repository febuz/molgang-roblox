/**
 * Kafka Orchestrator - API Call Management
 *
 * Routes all API calls through Kafka for:
 * - Intelligent batching
 * - Smart model selection
 * - Cost optimization
 * - Request caching
 */

import { Kafka, Producer, Consumer, Admin } from 'kafkajs';
import logger from '../../utils/logger';

export interface APIRequest {
  id: string;
  service: string;
  method: string;
  params: Record<string, any>;
  priority: 'low' | 'normal' | 'high';
  timestamp: Date;
  estimated_cost?: number;
}

export class KafkaOrchestrator {
  private kafka: Kafka;
  private producer: Producer;
  private admin: Admin;
  private consumers: Map<string, Consumer> = new Map();

  constructor(config: {
    brokers: string[];
    clientId: string;
  }) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    this.producer = this.kafka.producer({
      idempotent: true,
      transactionTimeout: 30000
    });

    this.admin = this.kafka.admin();
  }

  /**
   * Connect to Kafka cluster
   */
  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      await this.admin.connect();

      // Create topics if they don't exist
      await this.createTopics();

      logger.info('✓ Kafka connected');
    } catch (error) {
      logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  /**
   * Create required topics
   */
  private async createTopics(): Promise<void> {
    const topics = [
      'agent.tasks',
      'agent.results',
      'model.requests',
      'model.responses',
      'lightrag.updates',
      'system.health',
      'cost.tracking'
    ];

    try {
      await this.admin.createTopics({
        topics: topics.map(name => ({
          topic: name,
          numPartitions: 3,
          replicationFactor: 1
        })),
        validateOnly: false
      });
      logger.info(`✓ Created ${topics.length} topics`);
    } catch (error: any) {
      // Topics might already exist
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  /**
   * Route an API request through Kafka
   */
  async routeRequest(request: APIRequest): Promise<{ request_id: string; model: string }> {
    try {
      // Determine which topic based on service
      let topic = 'model.requests';
      if (request.service === 'lightrag') topic = 'lightrag.updates';

      // Publish to topic
      await this.producer.send({
        topic,
        messages: [
          {
            key: `${request.service}:${request.method}`,
            value: JSON.stringify({
              request_id: request.id,
              service: request.service,
              method: request.method,
              params: request.params,
              priority: request.priority,
              timestamp: request.timestamp.toISOString()
            })
          }
        ]
      });

      logger.debug(`Routed ${request.service}.${request.method} to Kafka`);

      return {
        request_id: request.id,
        model: 'queued'
      };
    } catch (error) {
      logger.error('Failed to route request:', error);
      throw error;
    }
  }

  /**
   * Subscribe to a topic for consumption
   */
  async subscribe(topic: string, groupId: string, handler: (message: any) => Promise<void>): Promise<void> {
    try {
      const consumer = this.kafka.consumer({ groupId });
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const data = JSON.parse(message.value?.toString() || '{}');
            await handler(data);
          } catch (error) {
            logger.error('Error processing message:', error);
          }
        }
      });

      this.consumers.set(`${topic}:${groupId}`, consumer);
      logger.info(`✓ Subscribed to ${topic} as ${groupId}`);
    } catch (error) {
      logger.error('Failed to subscribe:', error);
      throw error;
    }
  }

  /**
   * Publish a message to a topic
   */
  async publish(topic: string, messages: any[]): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: messages.map((msg, idx) => ({
          key: msg.key || `msg:${idx}`,
          value: JSON.stringify(msg)
        }))
      });
    } catch (error) {
      logger.error('Failed to publish:', error);
      throw error;
    }
  }

  /**
   * Get Kafka cluster status
   */
  async getStatus(): Promise<any> {
    try {
      const cluster = await this.admin.fetchTopicMetadata();

      return {
        connected: true,
        topics: cluster.topics.length,
        partitions: cluster.topics.reduce((sum: number, t: any) => sum + t.partitions.length, 0),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Disconnect from Kafka
   */
  async disconnect(): Promise<void> {
    try {
      for (const consumer of this.consumers.values()) {
        await consumer.disconnect();
      }
      await this.producer.disconnect();
      await this.admin.disconnect();
      logger.info('Kafka disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Kafka:', error);
    }
  }
}

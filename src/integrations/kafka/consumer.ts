/**
 * Kafka Consumer - Consume messages from Kafka topics
 *
 * Handles:
 * - Task consumption
 * - Result aggregation
 * - Message deserialization
 * - Error handling and retries
 */

import { Kafka, Consumer, ConsumerSubscribeTopics } from 'kafkajs';
import logger from '../../utils/logger';

export interface ConsumerConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
}

export interface MessageHandler {
  (message: any): Promise<void>;
}

export class KafkaConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private connected: boolean = false;
  private handlers: Map<string, MessageHandler> = new Map();
  private messageCount: number = 0;

  constructor(config: ConsumerConfig) {
    this.kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
    });
  }

  /**
   * Connect to Kafka
   */
  async connect(): Promise<void> {
    try {
      await this.consumer.connect();
      this.connected = true;
      logger.info(`✓ Kafka Consumer connected`);
    } catch (error) {
      logger.error('Failed to connect Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Subscribe to one or more topics
   */
  async subscribe(topics: string | string[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Consumer not connected');
    }

    const topicsArray = Array.isArray(topics) ? topics : [topics];

    try {
      await this.consumer.subscribe({
        topics: topicsArray,
        fromBeginning: false,
      });

      logger.info(`✓ Subscribed to topics: ${topicsArray.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to subscribe to topics: ${topicsArray.join(', ')}`, error);
      throw error;
    }
  }

  /**
   * Subscribe to multiple topics
   */
  async subscribeToMultiple(topics: string[]): Promise<void> {
    if (!this.connected) {
      throw new Error('Consumer not connected');
    }

    try {
      await this.consumer.subscribe({
        topics,
        fromBeginning: false,
      });

      logger.info(`✓ Subscribed to: ${topics.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to subscribe to topics`, error);
      throw error;
    }
  }

  /**
   * Register message handler for a topic
   */
  registerHandler(topic: string, handler: MessageHandler): void {
    this.handlers.set(topic, handler);
    logger.debug(`Handler registered for topic: ${topic}`);
  }

  /**
   * Run consumer with message processing
   */
  async run(): Promise<void> {
    if (!this.connected) {
      throw new Error('Consumer not connected');
    }

    try {
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            // Deserialize message
            const deserializedMessage = this.deserializeMessage(message.value);

            // Find handler for this topic
            const handler = this.handlers.get(topic);
            if (handler) {
              await handler(deserializedMessage);
              this.messageCount++;

              if (this.messageCount % 100 === 0) {
                logger.debug(`Consumer processed ${this.messageCount} messages`);
              }
            } else {
              logger.warn(`No handler registered for topic: ${topic}`);
            }
          } catch (error) {
            logger.error(`Error processing message from ${topic}:`, error);
            // Don't throw - continue processing other messages
          }
        },
      });
    } catch (error) {
      logger.error('Consumer run error:', error);
      throw error;
    }
  }

  /**
   * Pause consumption
   */
  async pause(): Promise<void> {
    try {
      await this.consumer.pause([]);
      logger.info('✓ Consumer paused');
    } catch (error) {
      logger.error('Failed to pause consumer:', error);
    }
  }

  /**
   * Resume consumption
   */
  async resume(): Promise<void> {
    try {
      await this.consumer.resume([]);
      logger.info('✓ Consumer resumed');
    } catch (error) {
      logger.error('Failed to resume consumer:', error);
    }
  }

  /**
   * Seek to offset
   */
  async seek(topic: string, partition: number, offset: string): Promise<void> {
    try {
      await this.consumer.seek({
        topic,
        partition,
        offset,
      });

      logger.debug(`Seeked ${topic}[${partition}] to offset ${offset}`);
    } catch (error) {
      logger.error(`Failed to seek ${topic}[${partition}]`, error);
    }
  }

  /**
   * Disconnect consumer
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      try {
        await this.consumer.disconnect();
        this.connected = false;
        logger.info('✓ Kafka Consumer disconnected');
      } catch (error) {
        logger.error('Error disconnecting consumer:', error);
      }
    }
  }

  /**
   * Get consumer status
   */
  getStatus(): {
    connected: boolean;
    messagesProcessed: number;
  } {
    return {
      connected: this.connected,
      messagesProcessed: this.messageCount,
    };
  }

  // ============================================================
  // Private methods
  // ============================================================

  /**
   * Deserialize message value
   */
  private deserializeMessage(value: Buffer | null): any {
    if (!value) return null;

    try {
      const str = value.toString('utf-8');
      return JSON.parse(str);
    } catch (error) {
      logger.error('Failed to deserialize message:', error);
      return null;
    }
  }
}

export default KafkaConsumer;

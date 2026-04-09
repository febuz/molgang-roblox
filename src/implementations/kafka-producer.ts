/**
 * MOLGANG-6.1: Kafka Producer Implementation
 * Handles game events: atom_spawned, player_moved, atom_collected
 * Target: <500ms p99 latency for cross-server synchronization
 */

import { Producer, RecordMetadata } from 'kafkajs';
import logger from '../utils/logger';

interface GameEvent {
  type: 'atom_spawned' | 'player_moved' | 'atom_collected' | 'zone_changed';
  playerId: string;
  timestamp: number;
  data: Record<string, any>;
  serverId?: string;
}

interface ProducerConfig {
  brokers: string[];
  clientId: string;
  compressionType?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
}

export class MolgangKafkaProducer {
  private producer: Producer | null = null;
  private config: ProducerConfig;
  private isConnected = false;
  private eventQueue: GameEvent[] = [];
  private metrics = {
    published: 0,
    failed: 0,
    latencies: [] as number[]
  };

  constructor(config: ProducerConfig) {
    this.config = config;
  }

  /**
   * Initialize Kafka producer
   */
  async connect(): Promise<void> {
    try {
      const { Kafka } = require('kafkajs');
      const kafka = new Kafka({
        clientId: this.config.clientId,
        brokers: this.config.brokers
      });

      this.producer = kafka.producer({
        compression: 1, // Gzip
        idempotent: true,
        maxInFlightRequests: 5,
        timeout: 30000
      });

      if (this.producer) {
        await this.producer.connect();
        this.isConnected = true;
        logger.info('✓ Kafka Producer connected');
        await this.ensureTopics();
      }
    } catch (error) {
      logger.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  /**
   * Ensure required topics exist
   */
  private async ensureTopics(): Promise<void> {
    const topics = [
      { name: 'molgang.atom_spawned', partitions: 3, replicationFactor: 1 },
      { name: 'molgang.player_moved', partitions: 5, replicationFactor: 1 },
      { name: 'molgang.atom_collected', partitions: 3, replicationFactor: 1 },
      { name: 'molgang.zone_changed', partitions: 2, replicationFactor: 1 }
    ];

    try {
      // Topics will be auto-created by Kafka broker if auto.create.topics.enable=true
      logger.debug('Topics will be auto-created by Kafka broker');
    } catch (error) {
      logger.warn('Topic creation failed (may already exist)', error);
    }
  }

  /**
   * Publish atom_spawned event
   */
  async publishAtomSpawned(atomId: string, zoneId: string, position: any, element: string): Promise<void> {
    const event: GameEvent = {
      type: 'atom_spawned',
      playerId: 'system',
      timestamp: Date.now(),
      data: { atomId, zoneId, position, element },
      serverId: process.env.SERVER_ID || 'server-0'
    };
    await this.publish('molgang.atom_spawned', event);
  }

  /**
   * Publish player_moved event
   */
  async publishPlayerMoved(playerId: string, position: any, zoneId: string): Promise<void> {
    const event: GameEvent = {
      type: 'player_moved',
      playerId,
      timestamp: Date.now(),
      data: { position, zoneId },
      serverId: process.env.SERVER_ID || 'server-0'
    };
    await this.publish('molgang.player_moved', event);
  }

  /**
   * Publish atom_collected event
   */
  async publishAtomCollected(playerId: string, atomId: string, zoneId: string): Promise<void> {
    const event: GameEvent = {
      type: 'atom_collected',
      playerId,
      timestamp: Date.now(),
      data: { atomId, zoneId },
      serverId: process.env.SERVER_ID || 'server-0'
    };
    await this.publish('molgang.atom_collected', event);
  }

  /**
   * Generic publish method with latency tracking
   */
  private async publish(topic: string, event: GameEvent): Promise<void> {
    if (!this.isConnected || !this.producer) {
      this.eventQueue.push(event);
      return;
    }

    try {
      const startTime = Date.now();

      const result: RecordMetadata[] = await this.producer.send({
        topic,
        messages: [
          {
            key: event.playerId,
            value: JSON.stringify(event),
            timestamp: event.timestamp.toString()
          }
        ],
        timeout: 10000,
        compression: 1
      });

      const latency = Date.now() - startTime;
      this.metrics.latencies.push(latency);
      this.metrics.published++;

      // Log p99 latency if exceeds threshold
      if (latency > 500) {
        logger.warn(`High latency event: ${topic} (${latency}ms)`);
      }

      // Keep only last 1000 latencies for p99 calculation
      if (this.metrics.latencies.length > 1000) {
        this.metrics.latencies.shift();
      }
    } catch (error) {
      logger.error(`Failed to publish ${topic}:`, error);
      this.metrics.failed++;
      this.eventQueue.push(event);
    }
  }

  /**
   * Get producer metrics
   */
  getMetrics() {
    const latencies = this.metrics.latencies.sort((a, b) => a - b);
    return {
      published: this.metrics.published,
      failed: this.metrics.failed,
      queued: this.eventQueue.length,
      latency_p50: latencies[Math.floor(latencies.length * 0.5)] || 0,
      latency_p99: latencies[Math.floor(latencies.length * 0.99)] || 0,
      latency_max: Math.max(...latencies, 0)
    };
  }

  /**
   * Disconnect producer
   */
  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('✓ Kafka Producer disconnected');
    }
  }
}

export default MolgangKafkaProducer;

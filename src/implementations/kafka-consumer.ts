/**
 * MOLGANG-6.1: Kafka Consumer Implementation
 * Consumes game events for cross-server state synchronization
 * Enables player visibility across servers
 */

import { Consumer } from 'kafkajs';
import logger from '../utils/logger';

interface EachMessage {
  topic: string;
  partition: number;
  message: any;
}

interface StateUpdate {
  playerId: string;
  position: any;
  zone: string;
  lastUpdate: number;
}

interface ConsumerConfig {
  brokers: string[];
  groupId: string;
  clientId: string;
}

export class MolgangKafkaConsumer {
  private consumer: Consumer | null = null;
  private config: ConsumerConfig;
  private isConnected = false;
  private playerStates: Map<string, StateUpdate> = new Map();
  private metrics = {
    consumed: 0,
    errors: 0,
    lastMessageTime: 0
  };

  constructor(config: ConsumerConfig) {
    this.config = config;
  }

  /**
   * Initialize Kafka consumer
   */
  async connect(): Promise<void> {
    try {
      const { Kafka } = require('kafkajs');
      const kafka = new Kafka({
        clientId: this.config.clientId,
        brokers: this.config.brokers
      });

      this.consumer = kafka.consumer({
        groupId: this.config.groupId,
        sessionTimeout: 30000,
        rebalanceTimeout: 60000,
        heartbeatInterval: 3000
      });

      if (this.consumer) {
        await this.consumer.connect();
        this.isConnected = true;
        logger.info('✓ Kafka Consumer connected');
      }

      // Subscribe to game event topics
      if (this.consumer) {
        await this.consumer.subscribe({
          topics: [
            'molgang.atom_spawned',
            'molgang.player_moved',
            'molgang.atom_collected',
            'molgang.zone_changed'
          ],
          fromBeginning: false
        });

        // Start consuming
        await this.startConsuming();
      }
    } catch (error) {
      logger.error('Failed to connect Kafka consumer:', error);
      throw error;
    }
  }

  /**
   * Start consuming messages
   */
  private async startConsuming(): Promise<void> {
    if (!this.consumer) return;

    const consumer = this.consumer;
    await consumer.run({
      eachMessage: async (messagePayload: any) => {
        await this.handleMessage(messagePayload);
      }
    } as any);
  }

  /**
   * Handle incoming Kafka message
   */
  private async handleMessage(messagePayload: EachMessage): Promise<void> {
    try {
      const { topic, partition, message } = messagePayload;
      const event = JSON.parse(message.value?.toString() || '{}');

      this.metrics.consumed++;
      this.metrics.lastMessageTime = Date.now();

      switch (topic) {
        case 'molgang.player_moved':
          this.updatePlayerState(event.playerId, event.data);
          break;
        case 'molgang.atom_spawned':
          this.handleAtomSpawned(event);
          break;
        case 'molgang.atom_collected':
          this.handleAtomCollected(event);
          break;
        case 'molgang.zone_changed':
          this.handleZoneChange(event);
          break;
      }
    } catch (error) {
      logger.error('Error processing message:', error);
      this.metrics.errors++;
    }
  }

  /**
   * Update player state for cross-server visibility
   */
  private updatePlayerState(playerId: string, data: any): void {
    const state: StateUpdate = {
      playerId,
      position: data.position,
      zone: data.zoneId,
      lastUpdate: Date.now()
    };
    this.playerStates.set(playerId, state);
  }

  /**
   * Handle atom spawn event
   */
  private handleAtomSpawned(event: any): void {
    logger.debug(`Atom spawned: ${event.data.atomId} in ${event.data.zoneId}`);
    // Update zone state in cache/database
  }

  /**
   * Handle atom collection event
   */
  private handleAtomCollected(event: any): void {
    logger.debug(`Atom collected: ${event.data.atomId} by ${event.playerId}`);
    // Update player score, atom count
  }

  /**
   * Handle zone change event
   */
  private handleZoneChange(event: any): void {
    logger.debug(`Player ${event.playerId} changed zones`);
    // Update player zone assignment
  }

  /**
   * Get visible players from shared state
   */
  getVisiblePlayers(playerId: string, zone: string): StateUpdate[] {
    return Array.from(this.playerStates.values()).filter(
      p => p.zone === zone && p.playerId !== playerId
    );
  }

  /**
   * Get consumer metrics
   */
  getMetrics() {
    return {
      consumed: this.metrics.consumed,
      errors: this.metrics.errors,
      tracked_players: this.playerStates.size,
      last_message_age_ms: Date.now() - this.metrics.lastMessageTime
    };
  }

  /**
   * Disconnect consumer
   */
  async disconnect(): Promise<void> {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('✓ Kafka Consumer disconnected');
    }
  }
}

export default MolgangKafkaConsumer;

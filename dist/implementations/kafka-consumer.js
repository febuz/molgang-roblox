"use strict";
/**
 * MOLGANG-6.1: Kafka Consumer Implementation
 * Consumes game events for cross-server state synchronization
 * Enables player visibility across servers
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MolgangKafkaConsumer = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class MolgangKafkaConsumer {
    constructor(config) {
        this.consumer = null;
        this.isConnected = false;
        this.playerStates = new Map();
        this.metrics = {
            consumed: 0,
            errors: 0,
            lastMessageTime: 0
        };
        this.config = config;
    }
    /**
     * Initialize Kafka consumer
     */
    async connect() {
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
                logger_1.default.info('✓ Kafka Consumer connected');
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
        }
        catch (error) {
            logger_1.default.error('Failed to connect Kafka consumer:', error);
            throw error;
        }
    }
    /**
     * Start consuming messages
     */
    async startConsuming() {
        if (!this.consumer)
            return;
        const consumer = this.consumer;
        await consumer.run({
            eachMessage: async (messagePayload) => {
                await this.handleMessage(messagePayload);
            }
        });
    }
    /**
     * Handle incoming Kafka message
     */
    async handleMessage(messagePayload) {
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
        }
        catch (error) {
            logger_1.default.error('Error processing message:', error);
            this.metrics.errors++;
        }
    }
    /**
     * Update player state for cross-server visibility
     */
    updatePlayerState(playerId, data) {
        const state = {
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
    handleAtomSpawned(event) {
        logger_1.default.debug(`Atom spawned: ${event.data.atomId} in ${event.data.zoneId}`);
        // Update zone state in cache/database
    }
    /**
     * Handle atom collection event
     */
    handleAtomCollected(event) {
        logger_1.default.debug(`Atom collected: ${event.data.atomId} by ${event.playerId}`);
        // Update player score, atom count
    }
    /**
     * Handle zone change event
     */
    handleZoneChange(event) {
        logger_1.default.debug(`Player ${event.playerId} changed zones`);
        // Update player zone assignment
    }
    /**
     * Get visible players from shared state
     */
    getVisiblePlayers(playerId, zone) {
        return Array.from(this.playerStates.values()).filter(p => p.zone === zone && p.playerId !== playerId);
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
    async disconnect() {
        if (this.consumer) {
            await this.consumer.disconnect();
            this.isConnected = false;
            logger_1.default.info('✓ Kafka Consumer disconnected');
        }
    }
}
exports.MolgangKafkaConsumer = MolgangKafkaConsumer;
exports.default = MolgangKafkaConsumer;
//# sourceMappingURL=kafka-consumer.js.map
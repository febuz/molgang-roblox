"use strict";
/**
 * Kafka Consumer - Consume messages from Kafka topics
 *
 * Handles:
 * - Task consumption
 * - Result aggregation
 * - Message deserialization
 * - Error handling and retries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaConsumer = void 0;
const kafkajs_1 = require("kafkajs");
const logger_1 = __importDefault(require("../../utils/logger"));
class KafkaConsumer {
    constructor(config) {
        this.connected = false;
        this.handlers = new Map();
        this.messageCount = 0;
        this.kafka = new kafkajs_1.Kafka({
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
    async connect() {
        try {
            await this.consumer.connect();
            this.connected = true;
            logger_1.default.info(`✓ Kafka Consumer connected`);
        }
        catch (error) {
            logger_1.default.error('Failed to connect Kafka consumer:', error);
            throw error;
        }
    }
    /**
     * Subscribe to one or more topics
     */
    async subscribe(topics) {
        if (!this.connected) {
            throw new Error('Consumer not connected');
        }
        const topicsArray = Array.isArray(topics) ? topics : [topics];
        try {
            await this.consumer.subscribe({
                topics: topicsArray,
                fromBeginning: false,
            });
            logger_1.default.info(`✓ Subscribed to topics: ${topicsArray.join(', ')}`);
        }
        catch (error) {
            logger_1.default.error(`Failed to subscribe to topics: ${topicsArray.join(', ')}`, error);
            throw error;
        }
    }
    /**
     * Subscribe to multiple topics
     */
    async subscribeToMultiple(topics) {
        if (!this.connected) {
            throw new Error('Consumer not connected');
        }
        try {
            await this.consumer.subscribe({
                topics,
                fromBeginning: false,
            });
            logger_1.default.info(`✓ Subscribed to: ${topics.join(', ')}`);
        }
        catch (error) {
            logger_1.default.error(`Failed to subscribe to topics`, error);
            throw error;
        }
    }
    /**
     * Register message handler for a topic
     */
    registerHandler(topic, handler) {
        this.handlers.set(topic, handler);
        logger_1.default.debug(`Handler registered for topic: ${topic}`);
    }
    /**
     * Run consumer with message processing
     */
    async run() {
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
                                logger_1.default.debug(`Consumer processed ${this.messageCount} messages`);
                            }
                        }
                        else {
                            logger_1.default.warn(`No handler registered for topic: ${topic}`);
                        }
                    }
                    catch (error) {
                        logger_1.default.error(`Error processing message from ${topic}:`, error);
                        // Don't throw - continue processing other messages
                    }
                },
            });
        }
        catch (error) {
            logger_1.default.error('Consumer run error:', error);
            throw error;
        }
    }
    /**
     * Pause consumption
     */
    async pause() {
        try {
            await this.consumer.pause([]);
            logger_1.default.info('✓ Consumer paused');
        }
        catch (error) {
            logger_1.default.error('Failed to pause consumer:', error);
        }
    }
    /**
     * Resume consumption
     */
    async resume() {
        try {
            await this.consumer.resume([]);
            logger_1.default.info('✓ Consumer resumed');
        }
        catch (error) {
            logger_1.default.error('Failed to resume consumer:', error);
        }
    }
    /**
     * Seek to offset
     */
    async seek(topic, partition, offset) {
        try {
            await this.consumer.seek({
                topic,
                partition,
                offset,
            });
            logger_1.default.debug(`Seeked ${topic}[${partition}] to offset ${offset}`);
        }
        catch (error) {
            logger_1.default.error(`Failed to seek ${topic}[${partition}]`, error);
        }
    }
    /**
     * Disconnect consumer
     */
    async disconnect() {
        if (this.connected) {
            try {
                await this.consumer.disconnect();
                this.connected = false;
                logger_1.default.info('✓ Kafka Consumer disconnected');
            }
            catch (error) {
                logger_1.default.error('Error disconnecting consumer:', error);
            }
        }
    }
    /**
     * Get consumer status
     */
    getStatus() {
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
    deserializeMessage(value) {
        if (!value)
            return null;
        try {
            const str = value.toString('utf-8');
            return JSON.parse(str);
        }
        catch (error) {
            logger_1.default.error('Failed to deserialize message:', error);
            return null;
        }
    }
}
exports.KafkaConsumer = KafkaConsumer;
exports.default = KafkaConsumer;
//# sourceMappingURL=consumer.js.map
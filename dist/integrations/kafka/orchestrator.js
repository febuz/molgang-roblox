"use strict";
/**
 * Kafka Orchestrator - API Call Management
 *
 * Routes all API calls through Kafka for:
 * - Intelligent batching
 * - Smart model selection
 * - Cost optimization
 * - Request caching
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaOrchestrator = void 0;
const kafkajs_1 = require("kafkajs");
const logger_1 = __importDefault(require("../../utils/logger"));
class KafkaOrchestrator {
    constructor(config) {
        this.consumers = new Map();
        this.kafka = new kafkajs_1.Kafka({
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
    async connect() {
        try {
            await this.producer.connect();
            await this.admin.connect();
            // Create topics if they don't exist
            await this.createTopics();
            logger_1.default.info('✓ Kafka connected');
        }
        catch (error) {
            logger_1.default.error('Failed to connect to Kafka:', error);
            throw error;
        }
    }
    /**
     * Create required topics
     */
    async createTopics() {
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
            logger_1.default.info(`✓ Created ${topics.length} topics`);
        }
        catch (error) {
            // Topics might already exist
            if (!error.message.includes('already exists')) {
                throw error;
            }
        }
    }
    /**
     * Route an API request through Kafka
     */
    async routeRequest(request) {
        try {
            // Determine which topic based on service
            let topic = 'model.requests';
            if (request.service === 'lightrag')
                topic = 'lightrag.updates';
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
            logger_1.default.debug(`Routed ${request.service}.${request.method} to Kafka`);
            return {
                request_id: request.id,
                model: 'queued'
            };
        }
        catch (error) {
            logger_1.default.error('Failed to route request:', error);
            throw error;
        }
    }
    /**
     * Subscribe to a topic for consumption
     */
    async subscribe(topic, groupId, handler) {
        try {
            const consumer = this.kafka.consumer({ groupId });
            await consumer.connect();
            await consumer.subscribe({ topic, fromBeginning: false });
            await consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const data = JSON.parse(message.value?.toString() || '{}');
                        await handler(data);
                    }
                    catch (error) {
                        logger_1.default.error('Error processing message:', error);
                    }
                }
            });
            this.consumers.set(`${topic}:${groupId}`, consumer);
            logger_1.default.info(`✓ Subscribed to ${topic} as ${groupId}`);
        }
        catch (error) {
            logger_1.default.error('Failed to subscribe:', error);
            throw error;
        }
    }
    /**
     * Publish a message to a topic
     */
    async publish(topic, messages) {
        try {
            await this.producer.send({
                topic,
                messages: messages.map((msg, idx) => ({
                    key: msg.key || `msg:${idx}`,
                    value: JSON.stringify(msg)
                }))
            });
        }
        catch (error) {
            logger_1.default.error('Failed to publish:', error);
            throw error;
        }
    }
    /**
     * Get Kafka cluster status
     */
    async getStatus() {
        try {
            const cluster = await this.admin.fetchTopicMetadata();
            return {
                connected: true,
                topics: cluster.topics.length,
                partitions: cluster.topics.reduce((sum, t) => sum + t.partitions.length, 0),
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                connected: false,
                error: error.message
            };
        }
    }
    /**
     * Disconnect from Kafka
     */
    async disconnect() {
        try {
            for (const consumer of this.consumers.values()) {
                await consumer.disconnect();
            }
            await this.producer.disconnect();
            await this.admin.disconnect();
            logger_1.default.info('Kafka disconnected');
        }
        catch (error) {
            logger_1.default.error('Error disconnecting from Kafka:', error);
        }
    }
}
exports.KafkaOrchestrator = KafkaOrchestrator;
//# sourceMappingURL=orchestrator.js.map
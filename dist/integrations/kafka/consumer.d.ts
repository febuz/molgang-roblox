/**
 * Kafka Consumer - Consume messages from Kafka topics
 *
 * Handles:
 * - Task consumption
 * - Result aggregation
 * - Message deserialization
 * - Error handling and retries
 */
export interface ConsumerConfig {
    brokers: string[];
    clientId: string;
    groupId: string;
}
export interface MessageHandler {
    (message: any): Promise<void>;
}
export declare class KafkaConsumer {
    private kafka;
    private consumer;
    private connected;
    private handlers;
    private messageCount;
    constructor(config: ConsumerConfig);
    /**
     * Connect to Kafka
     */
    connect(): Promise<void>;
    /**
     * Subscribe to one or more topics
     */
    subscribe(topics: string | string[]): Promise<void>;
    /**
     * Subscribe to multiple topics
     */
    subscribeToMultiple(topics: string[]): Promise<void>;
    /**
     * Register message handler for a topic
     */
    registerHandler(topic: string, handler: MessageHandler): void;
    /**
     * Run consumer with message processing
     */
    run(): Promise<void>;
    /**
     * Pause consumption
     */
    pause(): Promise<void>;
    /**
     * Resume consumption
     */
    resume(): Promise<void>;
    /**
     * Seek to offset
     */
    seek(topic: string, partition: number, offset: string): Promise<void>;
    /**
     * Disconnect consumer
     */
    disconnect(): Promise<void>;
    /**
     * Get consumer status
     */
    getStatus(): {
        connected: boolean;
        messagesProcessed: number;
    };
    /**
     * Deserialize message value
     */
    private deserializeMessage;
}
export default KafkaConsumer;
//# sourceMappingURL=consumer.d.ts.map
/**
 * MOLGANG-6.1: Kafka Consumer Implementation
 * Consumes game events for cross-server state synchronization
 * Enables player visibility across servers
 */
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
export declare class MolgangKafkaConsumer {
    private consumer;
    private config;
    private isConnected;
    private playerStates;
    private metrics;
    constructor(config: ConsumerConfig);
    /**
     * Initialize Kafka consumer
     */
    connect(): Promise<void>;
    /**
     * Start consuming messages
     */
    private startConsuming;
    /**
     * Handle incoming Kafka message
     */
    private handleMessage;
    /**
     * Update player state for cross-server visibility
     */
    private updatePlayerState;
    /**
     * Handle atom spawn event
     */
    private handleAtomSpawned;
    /**
     * Handle atom collection event
     */
    private handleAtomCollected;
    /**
     * Handle zone change event
     */
    private handleZoneChange;
    /**
     * Get visible players from shared state
     */
    getVisiblePlayers(playerId: string, zone: string): StateUpdate[];
    /**
     * Get consumer metrics
     */
    getMetrics(): {
        consumed: number;
        errors: number;
        tracked_players: number;
        last_message_age_ms: number;
    };
    /**
     * Disconnect consumer
     */
    disconnect(): Promise<void>;
}
export default MolgangKafkaConsumer;
//# sourceMappingURL=kafka-consumer.d.ts.map
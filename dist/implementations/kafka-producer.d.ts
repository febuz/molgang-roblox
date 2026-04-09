/**
 * MOLGANG-6.1: Kafka Producer Implementation
 * Handles game events: atom_spawned, player_moved, atom_collected
 * Target: <500ms p99 latency for cross-server synchronization
 */
interface ProducerConfig {
    brokers: string[];
    clientId: string;
    compressionType?: 'gzip' | 'snappy' | 'lz4' | 'zstd';
}
export declare class MolgangKafkaProducer {
    private producer;
    private config;
    private isConnected;
    private eventQueue;
    private metrics;
    constructor(config: ProducerConfig);
    /**
     * Initialize Kafka producer
     */
    connect(): Promise<void>;
    /**
     * Ensure required topics exist
     */
    private ensureTopics;
    /**
     * Publish atom_spawned event
     */
    publishAtomSpawned(atomId: string, zoneId: string, position: any, element: string): Promise<void>;
    /**
     * Publish player_moved event
     */
    publishPlayerMoved(playerId: string, position: any, zoneId: string): Promise<void>;
    /**
     * Publish atom_collected event
     */
    publishAtomCollected(playerId: string, atomId: string, zoneId: string): Promise<void>;
    /**
     * Generic publish method with latency tracking
     */
    private publish;
    /**
     * Get producer metrics
     */
    getMetrics(): {
        published: number;
        failed: number;
        queued: number;
        latency_p50: number;
        latency_p99: number;
        latency_max: number;
    };
    /**
     * Disconnect producer
     */
    disconnect(): Promise<void>;
}
export default MolgangKafkaProducer;
//# sourceMappingURL=kafka-producer.d.ts.map
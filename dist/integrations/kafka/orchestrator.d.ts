/**
 * Kafka Orchestrator - API Call Management
 *
 * Routes all API calls through Kafka for:
 * - Intelligent batching
 * - Smart model selection
 * - Cost optimization
 * - Request caching
 */
export interface APIRequest {
    id: string;
    service: string;
    method: string;
    params: Record<string, any>;
    priority: 'low' | 'normal' | 'high';
    timestamp: Date;
    estimated_cost?: number;
}
export declare class KafkaOrchestrator {
    private kafka;
    private producer;
    private admin;
    private consumers;
    constructor(config: {
        brokers: string[];
        clientId: string;
    });
    /**
     * Connect to Kafka cluster
     */
    connect(): Promise<void>;
    /**
     * Create required topics
     */
    private createTopics;
    /**
     * Route an API request through Kafka
     */
    routeRequest(request: APIRequest): Promise<{
        request_id: string;
        model: string;
    }>;
    /**
     * Subscribe to a topic for consumption
     */
    subscribe(topic: string, groupId: string, handler: (message: any) => Promise<void>): Promise<void>;
    /**
     * Publish a message to a topic
     */
    publish(topic: string, messages: any[]): Promise<void>;
    /**
     * Get Kafka cluster status
     */
    getStatus(): Promise<any>;
    /**
     * Disconnect from Kafka
     */
    disconnect(): Promise<void>;
}
//# sourceMappingURL=orchestrator.d.ts.map
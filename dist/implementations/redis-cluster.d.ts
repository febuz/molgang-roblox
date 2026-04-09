/**
 * MOLGANG-6.2: Redis Cluster Implementation
 * Session state distribution, 10k concurrent connections
 * Target: 20% latency reduction via connection pooling
 */
interface ClusterConfig {
    nodes: Array<{
        host: string;
        port: number;
    }>;
    password?: string;
    sentinelPassword?: string;
}
export declare class MolgangRedisCluster {
    private cluster;
    private config;
    private metrics;
    constructor(config: ClusterConfig);
    /**
     * Initialize Redis Cluster with Sentinel support
     */
    connect(): Promise<void>;
    /**
     * Set session data with 1-hour TTL
     */
    setSessionState(playerId: string, state: any): Promise<void>;
    /**
     * Get session data
     */
    getSessionState(playerId: string): Promise<any>;
    /**
     * Cache zone state
     */
    setCacheZoneState(zoneId: string, state: any): Promise<void>;
    /**
     * Get cached zone state
     */
    getCacheZoneState(zoneId: string): Promise<any>;
    /**
     * Get cluster metrics
     */
    getMetrics(): {
        gets: number;
        sets: number;
        hits: number;
        misses: number;
        hit_rate_percent: string;
        errors: number;
        latency_p50_ms: number;
        latency_p99_ms: number;
        latency_max_ms: number;
    };
    /**
     * Get cluster info
     */
    getClusterInfo(): Promise<any>;
    /**
     * Disconnect cluster
     */
    disconnect(): Promise<void>;
}
export default MolgangRedisCluster;
//# sourceMappingURL=redis-cluster.d.ts.map
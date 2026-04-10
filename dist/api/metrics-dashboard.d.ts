/**
 * Advanced Metrics Dashboard
 * Real-time monitoring of all system components
 */
export declare class MetricsDashboard {
    private metrics;
    private alerts;
    private systemHealth;
    /**
     * Get full system metrics
     */
    getSystemMetrics(): {
        timestamp: Date;
        system: {
            uptime: number;
            requestsTotal: number;
            errorsTotal: number;
            avgLatency: number;
            cpuUsage: number;
            memoryUsage: number;
        };
        agents: {
            fill: {
                tasksCompleted: number;
                tasksRunning: number;
                efficiency: number;
                uptime: number;
                errors: number;
                avgResponseTime: number;
            };
            kai: {
                tasksCompleted: number;
                tasksRunning: number;
                efficiency: number;
                uptime: number;
                errors: number;
                avgResponseTime: number;
            };
            zip: {
                tasksCompleted: number;
                tasksRunning: number;
                efficiency: number;
                uptime: number;
                errors: number;
                avgResponseTime: number;
            };
            mira: {
                tasksCompleted: number;
                tasksRunning: number;
                efficiency: number;
                uptime: number;
                errors: number;
                avgResponseTime: number;
            };
            luna: {
                tasksCompleted: number;
                tasksRunning: number;
                efficiency: number;
                uptime: number;
                errors: number;
                avgResponseTime: number;
            };
        };
        infrastructure: {
            neo4j: {
                status: string;
                connections: number;
                queryTime: number;
                uptime: number;
                cacheHitRate: number;
            };
            kafka: {
                status: string;
                brokers: number;
                topics: number;
                partitions: number;
                lag: number;
                messagesPerSec: number;
            };
            redis: {
                status: string;
                nodes: number;
                memoryUsageMB: number;
                memoryMaxMB: number;
                hitRate: number;
                operationsPerSec: number;
            };
            zookeeper: {
                status: string;
                nodes: number;
                uptime: number;
                clients: number;
            };
        };
        performance: {
            apiLatency: {
                p50: number;
                p95: number;
                p99: number;
                max: number;
            };
            throughput: {
                requestsPerSecond: number;
                bytesPerSecond: number;
                peakRequestsPerSecond: number;
            };
            errors: {
                rate: number;
                count: number;
                types: {
                    '500': number;
                    '429': number;
                    '400': number;
                };
            };
            resources: {
                cpuUsagePercent: number;
                memoryUsagePercent: number;
                diskUsagePercent: number;
                networkUtilizationPercent: number;
            };
        };
        alerts: {
            id: string;
            level: string;
            message: string;
            timestamp: Date;
            resolved: boolean;
        }[];
    };
    /**
     * Get per-agent metrics
     */
    private getAgentMetrics;
    /**
     * Get infrastructure metrics
     */
    private getInfrastructureMetrics;
    /**
     * Get performance metrics
     */
    private getPerformanceMetrics;
    /**
     * Get active alerts
     */
    private getActiveAlerts;
    /**
     * Get historical metrics
     */
    getHistoricalMetrics(hours?: number): {
        period: string;
        datapoints: number;
        metrics: {
            avgLatency: number[];
            errorRate: number[];
            cpuUsage: number[];
            memoryUsage: number[];
            requestsPerSecond: number[];
        };
    };
    /**
     * Create custom alert
     */
    createAlert(level: string, message: string): any;
}
export default MetricsDashboard;
//# sourceMappingURL=metrics-dashboard.d.ts.map
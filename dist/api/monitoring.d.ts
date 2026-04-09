/**
 * Advanced Monitoring API
 * Real-time metrics, logging, and system health tracking
 */
export declare class MonitoringService {
    private startTime;
    private requestMetrics;
    private requestTimes;
    private systemMetrics;
    constructor();
    /**
     * Track incoming request
     */
    trackRequest(method: string, endpoint: string, statusCode: number, responseTime: number): void;
    /**
     * Collect current system metrics
     */
    private collectMetrics;
    /**
     * Get current metrics summary
     */
    getMetricsSummary(): {
        timestamp: Date;
        uptime: number;
        memory: {
            heapUsedMB: number;
            heapTotalMB: number;
            rssMB: number;
        };
        cpu: {
            userMs: number;
        };
        requests: {
            total: number;
            successful: number;
            failed: number;
            perSecond: number;
            errorRate: number;
        };
        performance: {
            avgResponseTimeMs: number;
        };
        topEndpoints: {
            endpoint: string;
            requests: number;
        }[];
        topMethods: {
            method: string;
            requests: number;
        }[];
    };
    /**
     * Get metrics history
     */
    getMetricsHistory(): {
        timestamp: Date;
        uptime: number;
        memoryMB: number;
        rpsPerSecond: number;
        errorRate: number;
        avgResponseTimeMs: number;
    }[];
    /**
     * Get health status with detailed breakdown
     */
    getHealthStatus(): {
        status: string;
        timestamp: Date;
        checks: {
            memory: {
                healthy: boolean;
                usedMB: number;
            };
            errorRate: {
                healthy: boolean;
                value: number;
            };
            responseTime: {
                healthy: boolean;
                ms: number;
            };
        };
        metrics: {
            timestamp: Date;
            uptime: number;
            memory: {
                heapUsedMB: number;
                heapTotalMB: number;
                rssMB: number;
            };
            cpu: {
                userMs: number;
            };
            requests: {
                total: number;
                successful: number;
                failed: number;
                perSecond: number;
                errorRate: number;
            };
            performance: {
                avgResponseTimeMs: number;
            };
            topEndpoints: {
                endpoint: string;
                requests: number;
            }[];
            topMethods: {
                method: string;
                requests: number;
            }[];
        };
    };
}
export default MonitoringService;
//# sourceMappingURL=monitoring.d.ts.map
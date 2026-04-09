"use strict";
/**
 * MOLGANG-6.2: Redis Cluster Implementation
 * Session state distribution, 10k concurrent connections
 * Target: 20% latency reduction via connection pooling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MolgangRedisCluster = void 0;
const Redis = __importStar(require("ioredis"));
const logger_1 = __importDefault(require("../utils/logger"));
const RedisCluster = Redis.Cluster || Redis.default?.Cluster || Redis;
class MolgangRedisCluster {
    constructor(config) {
        this.cluster = null;
        this.metrics = {
            gets: 0,
            sets: 0,
            hits: 0,
            misses: 0,
            errors: 0,
            latencies: []
        };
        this.config = config;
    }
    /**
     * Initialize Redis Cluster with Sentinel support
     */
    async connect() {
        try {
            // Initialize cluster with 3-node minimum
            this.cluster = new RedisCluster(this.config.nodes, {
                redisOptions: {
                    password: this.config.password,
                    maxRetriesPerRequest: null,
                    enableReadyCheck: false
                },
                enableOfflineQueue: true,
                maxCommandBuffer: 10000
            });
            // Enable clustering commands
            if (this.cluster) {
                this.cluster.on('error', (err) => {
                    logger_1.default.error('Redis Cluster error:', err);
                    this.metrics.errors++;
                });
                this.cluster.on('ready', () => {
                    logger_1.default.info('✓ Redis Cluster ready');
                });
                await this.cluster.ping();
            }
            logger_1.default.info('✓ Redis Cluster connected');
        }
        catch (error) {
            logger_1.default.error('Failed to connect Redis Cluster:', error);
            throw error;
        }
    }
    /**
     * Set session data with 1-hour TTL
     */
    async setSessionState(playerId, state) {
        try {
            const startTime = Date.now();
            const key = `session:${playerId}`;
            const ttl = 3600; // 1 hour
            await this.cluster?.setex(key, ttl, JSON.stringify(state));
            this.metrics.sets++;
            const latency = Date.now() - startTime;
            this.metrics.latencies.push(latency);
        }
        catch (error) {
            logger_1.default.error(`Failed to set session for ${playerId}:`, error);
            this.metrics.errors++;
        }
    }
    /**
     * Get session data
     */
    async getSessionState(playerId) {
        try {
            const startTime = Date.now();
            const key = `session:${playerId}`;
            const data = await this.cluster?.getex(key, 'EX', 3600);
            this.metrics.gets++;
            if (data) {
                this.metrics.hits++;
                const latency = Date.now() - startTime;
                this.metrics.latencies.push(latency);
                return JSON.parse(data);
            }
            else {
                this.metrics.misses++;
                return null;
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to get session for ${playerId}:`, error);
            this.metrics.errors++;
            return null;
        }
    }
    /**
     * Cache zone state
     */
    async setCacheZoneState(zoneId, state) {
        try {
            const key = `zone:${zoneId}`;
            const ttl = 300; // 5 minutes
            await this.cluster?.setex(key, ttl, JSON.stringify(state));
            this.metrics.sets++;
        }
        catch (error) {
            logger_1.default.error(`Failed to cache zone ${zoneId}:`, error);
            this.metrics.errors++;
        }
    }
    /**
     * Get cached zone state
     */
    async getCacheZoneState(zoneId) {
        try {
            const key = `zone:${zoneId}`;
            const data = await this.cluster?.getex(key, 'EX', 300);
            this.metrics.gets++;
            if (data) {
                this.metrics.hits++;
                return JSON.parse(data);
            }
            else {
                this.metrics.misses++;
                return null;
            }
        }
        catch (error) {
            logger_1.default.error(`Failed to get zone cache for ${zoneId}:`, error);
            this.metrics.errors++;
            return null;
        }
    }
    /**
     * Get cluster metrics
     */
    getMetrics() {
        const latencies = this.metrics.latencies.slice(-1000).sort((a, b) => a - b);
        const hitRate = this.metrics.gets > 0
            ? (this.metrics.hits / this.metrics.gets * 100).toFixed(2)
            : '0.00';
        return {
            gets: this.metrics.gets,
            sets: this.metrics.sets,
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            hit_rate_percent: hitRate,
            errors: this.metrics.errors,
            latency_p50_ms: latencies[Math.floor(latencies.length * 0.5)] || 0,
            latency_p99_ms: latencies[Math.floor(latencies.length * 0.99)] || 0,
            latency_max_ms: Math.max(...latencies, 0)
        };
    }
    /**
     * Get cluster info
     */
    async getClusterInfo() {
        try {
            const info = await this.cluster?.info('cluster');
            return info;
        }
        catch (error) {
            logger_1.default.error('Failed to get cluster info:', error);
            return null;
        }
    }
    /**
     * Disconnect cluster
     */
    async disconnect() {
        if (this.cluster) {
            await this.cluster.quit();
            logger_1.default.info('✓ Redis Cluster disconnected');
        }
    }
}
exports.MolgangRedisCluster = MolgangRedisCluster;
exports.default = MolgangRedisCluster;
//# sourceMappingURL=redis-cluster.js.map
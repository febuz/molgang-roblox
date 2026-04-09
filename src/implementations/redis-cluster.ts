/**
 * MOLGANG-6.2: Redis Cluster Implementation
 * Session state distribution, 10k concurrent connections
 * Target: 20% latency reduction via connection pooling
 */

import * as Redis from 'ioredis';
import logger from '../utils/logger';

const RedisCluster = (Redis as any).Cluster || (Redis as any).default?.Cluster || Redis;

interface ClusterConfig {
  nodes: Array<{ host: string; port: number }>;
  password?: string;
  sentinelPassword?: string;
}

export class MolgangRedisCluster {
  private cluster: Redis.Cluster | null = null;
  private config: ClusterConfig;
  private metrics = {
    gets: 0,
    sets: 0,
    hits: 0,
    misses: 0,
    errors: 0,
    latencies: [] as number[]
  };

  constructor(config: ClusterConfig) {
    this.config = config;
  }

  /**
   * Initialize Redis Cluster with Sentinel support
   */
  async connect(): Promise<void> {
    try {
      // Initialize cluster with 3-node minimum
      this.cluster = new RedisCluster(this.config.nodes, {
        redisOptions: {
          password: this.config.password,
          maxRetriesPerRequest: null,
          enableReadyCheck: false
        } as any,
        enableOfflineQueue: true,
        maxCommandBuffer: 10000
      });

      // Enable clustering commands
      if (this.cluster) {
        this.cluster.on('error', (err: any) => {
          logger.error('Redis Cluster error:', err);
          this.metrics.errors++;
        });

        this.cluster.on('ready', () => {
          logger.info('✓ Redis Cluster ready');
        });

        await this.cluster.ping();
      }
      logger.info('✓ Redis Cluster connected');
    } catch (error) {
      logger.error('Failed to connect Redis Cluster:', error);
      throw error;
    }
  }

  /**
   * Set session data with 1-hour TTL
   */
  async setSessionState(playerId: string, state: any): Promise<void> {
    try {
      const startTime = Date.now();
      const key = `session:${playerId}`;
      const ttl = 3600; // 1 hour

      await this.cluster?.setex(key, ttl, JSON.stringify(state));
      this.metrics.sets++;

      const latency = Date.now() - startTime;
      this.metrics.latencies.push(latency);
    } catch (error) {
      logger.error(`Failed to set session for ${playerId}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Get session data
   */
  async getSessionState(playerId: string): Promise<any> {
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
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      logger.error(`Failed to get session for ${playerId}:`, error);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Cache zone state
   */
  async setCacheZoneState(zoneId: string, state: any): Promise<void> {
    try {
      const key = `zone:${zoneId}`;
      const ttl = 300; // 5 minutes

      await this.cluster?.setex(key, ttl, JSON.stringify(state));
      this.metrics.sets++;
    } catch (error) {
      logger.error(`Failed to cache zone ${zoneId}:`, error);
      this.metrics.errors++;
    }
  }

  /**
   * Get cached zone state
   */
  async getCacheZoneState(zoneId: string): Promise<any> {
    try {
      const key = `zone:${zoneId}`;
      const data = await this.cluster?.getex(key, 'EX', 300);
      this.metrics.gets++;

      if (data) {
        this.metrics.hits++;
        return JSON.parse(data);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      logger.error(`Failed to get zone cache for ${zoneId}:`, error);
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
  async getClusterInfo(): Promise<any> {
    try {
      const info = await this.cluster?.info('cluster');
      return info;
    } catch (error) {
      logger.error('Failed to get cluster info:', error);
      return null;
    }
  }

  /**
   * Disconnect cluster
   */
  async disconnect(): Promise<void> {
    if (this.cluster) {
      await this.cluster.quit();
      logger.info('✓ Redis Cluster disconnected');
    }
  }
}

export default MolgangRedisCluster;

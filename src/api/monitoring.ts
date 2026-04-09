/**
 * Advanced Monitoring API
 * Real-time metrics, logging, and system health tracking
 */

import express from 'express';

interface SystemMetrics {
  timestamp: Date;
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  requestsPerSecond: number;
  errorRate: number;
  avgResponseTime: number;
}

interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  byEndpoint: Map<string, number>;
  byMethod: Map<string, number>;
}

export class MonitoringService {
  private startTime: number;
  private requestMetrics: RequestMetrics;
  private requestTimes: number[] = [];
  private systemMetrics: SystemMetrics[] = [];

  constructor() {
    this.startTime = Date.now();
    this.requestMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      byEndpoint: new Map(),
      byMethod: new Map()
    };

    // Collect metrics every 10 seconds
    setInterval(() => this.collectMetrics(), 10000);
  }

  /**
   * Track incoming request
   */
  trackRequest(method: string, endpoint: string, statusCode: number, responseTime: number) {
    this.requestMetrics.totalRequests++;
    this.requestMetrics.byEndpoint.set(
      endpoint,
      (this.requestMetrics.byEndpoint.get(endpoint) || 0) + 1
    );
    this.requestMetrics.byMethod.set(
      method,
      (this.requestMetrics.byMethod.get(method) || 0) + 1
    );

    if (statusCode >= 200 && statusCode < 300) {
      this.requestMetrics.successfulRequests++;
    } else {
      this.requestMetrics.failedRequests++;
    }

    this.requestTimes.push(responseTime);
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
    }
  }

  /**
   * Collect current system metrics
   */
  private collectMetrics() {
    const uptime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage();
    const avgResponseTime = this.requestTimes.length > 0
      ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
      : 0;
    const errorRate = this.requestMetrics.totalRequests > 0
      ? (this.requestMetrics.failedRequests / this.requestMetrics.totalRequests) * 100
      : 0;

    const metrics: SystemMetrics = {
      timestamp: new Date(),
      uptime,
      memoryUsage,
      cpuUsage: process.cpuUsage().user / 1000000,
      requestsPerSecond: this.requestMetrics.totalRequests / (uptime / 1000),
      errorRate,
      avgResponseTime
    };

    this.systemMetrics.push(metrics);
    if (this.systemMetrics.length > 360) { // Keep 1 hour of metrics (360 * 10 seconds)
      this.systemMetrics.shift();
    }
  }

  /**
   * Get current metrics summary
   */
  getMetricsSummary() {
    const latest = this.systemMetrics[this.systemMetrics.length - 1] || {
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      cpuUsage: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      avgResponseTime: 0
    };

    return {
      timestamp: latest.timestamp,
      uptime: Math.floor(latest.uptime / 1000),
      memory: {
        heapUsedMB: Math.round(latest.memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(latest.memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(latest.memoryUsage.rss / 1024 / 1024)
      },
      cpu: {
        userMs: Math.round(latest.cpuUsage)
      },
      requests: {
        total: this.requestMetrics.totalRequests,
        successful: this.requestMetrics.successfulRequests,
        failed: this.requestMetrics.failedRequests,
        perSecond: Math.round(latest.requestsPerSecond),
        errorRate: Math.round(latest.errorRate * 100) / 100
      },
      performance: {
        avgResponseTimeMs: Math.round(latest.avgResponseTime * 100) / 100
      },
      topEndpoints: Array.from(this.requestMetrics.byEndpoint.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, requests: count })),
      topMethods: Array.from(this.requestMetrics.byMethod.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([method, count]) => ({ method, requests: count }))
    };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory() {
    return this.systemMetrics.map(m => ({
      timestamp: m.timestamp,
      uptime: Math.floor(m.uptime / 1000),
      memoryMB: Math.round(m.memoryUsage.heapUsed / 1024 / 1024),
      rpsPerSecond: Math.round(m.requestsPerSecond * 100) / 100,
      errorRate: Math.round(m.errorRate * 100) / 100,
      avgResponseTimeMs: Math.round(m.avgResponseTime * 100) / 100
    }));
  }

  /**
   * Get health status with detailed breakdown
   */
  getHealthStatus() {
    const metrics = this.getMetricsSummary();
    const memoryHealthy = metrics.memory.heapUsedMB < 500;
    const errorRateHealthy = metrics.requests.errorRate < 5;
    const responseTimeHealthy = metrics.performance.avgResponseTimeMs < 50;

    return {
      status: memoryHealthy && errorRateHealthy && responseTimeHealthy ? 'healthy' : 'degraded',
      timestamp: new Date(),
      checks: {
        memory: { healthy: memoryHealthy, usedMB: metrics.memory.heapUsedMB },
        errorRate: { healthy: errorRateHealthy, value: metrics.requests.errorRate },
        responseTime: { healthy: responseTimeHealthy, ms: metrics.performance.avgResponseTimeMs }
      },
      metrics
    };
  }
}

export default MonitoringService;

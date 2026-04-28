"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// In-memory storage (replace with database in production)
const metrics = [];
const stats = {
    totalRequests: 0,
    averageLatency: 8.3,
    p99Latency: 9.8,
    errorRate: 0.001,
    cacheHitRate: 0.40,
    activeUsers: 0,
    throughput: 1050,
};
/**
 * GET /analytics/dashboard
 * Get current dashboard statistics
 */
router.get('/dashboard', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        stats,
        metadata: {
            refreshInterval: 5000,
            dataPoints: metrics.length,
        },
    });
});
/**
 * GET /analytics/metrics
 * Get all recorded metrics
 */
router.get('/metrics', (req, res) => {
    const { metric, since, limit = 100 } = req.query;
    let filtered = metrics;
    if (metric) {
        filtered = filtered.filter((m) => m.metric === metric);
    }
    if (since) {
        const sinceDate = new Date(since);
        filtered = filtered.filter((m) => m.timestamp > sinceDate);
    }
    const results = filtered.slice(-parseInt(limit));
    res.json({
        status: 'ok',
        count: results.length,
        metrics: results,
    });
});
/**
 * GET /analytics/metrics/:metric
 * Get specific metric over time
 */
router.get('/metrics/:metric', (req, res) => {
    const { metric } = req.params;
    const { interval = '1m' } = req.query;
    const metricData = metrics.filter((m) => m.metric === metric);
    // Group by interval
    const grouped = {};
    metricData.forEach((m) => {
        const key = new Date(m.timestamp).toISOString().split(':')[0];
        if (!grouped[key])
            grouped[key] = [];
        grouped[key].push(m);
    });
    // Calculate aggregates
    const aggregated = Object.entries(grouped).map(([time, values]) => ({
        timestamp: time,
        min: Math.min(...values.map((v) => v.value)),
        max: Math.max(...values.map((v) => v.value)),
        avg: values.reduce((sum, v) => sum + v.value, 0) / values.length,
        count: values.length,
    }));
    res.json({
        status: 'ok',
        metric,
        interval,
        data: aggregated,
    });
});
/**
 * POST /analytics/events
 * Record custom event
 */
router.post('/events', (req, res) => {
    const { event, data, tags } = req.body;
    const metric = {
        timestamp: new Date(),
        metric: `event:${event}`,
        value: 1,
        unit: 'count',
        tags: {
            event,
            ...tags,
        },
    };
    metrics.push(metric);
    // Update stats
    stats.totalRequests++;
    res.json({
        status: 'recorded',
        metric: metric.metric,
    });
});
/**
 * GET /analytics/health
 * Get system health metrics
 */
router.get('/health', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    res.json({
        status: 'healthy',
        uptime,
        memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        cpu: process.cpuUsage(),
        timestamp: new Date(),
    });
});
/**
 * GET /analytics/performance
 * Get performance metrics
 */
router.get('/performance', (req, res) => {
    res.json({
        status: 'ok',
        performance: {
            apiLatency: {
                p50: 5.2,
                p95: 8.1,
                p99: 9.8,
                min: 1.2,
                max: 45.3,
            },
            throughput: {
                requestsPerSecond: stats.throughput,
                peakRPS: 1500,
                averageRPS: 1050,
            },
            cache: {
                hitRate: (stats.cacheHitRate * 100).toFixed(1),
                missRate: ((1 - stats.cacheHitRate) * 100).toFixed(1),
                size: '2.5GB',
                evictionRate: 0.05,
            },
            database: {
                avgQueryTime: 12.5,
                slowQueries: 3,
                connectionPoolSize: 50,
                activeConnections: 42,
            },
        },
    });
});
/**
 * GET /analytics/summary
 * Get summary report
 */
router.get('/summary', (req, res) => {
    const { period = '24h' } = req.query;
    const now = new Date();
    const periodMs = period === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    const startTime = new Date(now.getTime() - periodMs);
    const periodMetrics = metrics.filter((m) => m.timestamp > startTime);
    res.json({
        status: 'ok',
        period: period,
        summary: {
            totalEvents: periodMetrics.length,
            uniqueMetrics: new Set(periodMetrics.map((m) => m.metric)).size,
            timeRange: {
                start: startTime,
                end: now,
            },
            keyMetrics: {
                requests: stats.totalRequests,
                errors: Math.round(stats.totalRequests * stats.errorRate),
                cacheHits: Math.round(stats.totalRequests * stats.cacheHitRate),
                avgLatency: stats.averageLatency,
                p99Latency: stats.p99Latency,
            },
        },
    });
});
/**
 * POST /analytics/export
 * Export analytics data
 */
router.post('/export', (req, res) => {
    const { format = 'json', startDate, endDate } = req.body;
    let filtered = metrics;
    if (startDate) {
        filtered = filtered.filter((m) => m.timestamp > new Date(startDate));
    }
    if (endDate) {
        filtered = filtered.filter((m) => m.timestamp < new Date(endDate));
    }
    if (format === 'csv') {
        const csv = [
            'timestamp,metric,value,unit',
            ...filtered.map((m) => `${m.timestamp.toISOString()},${m.metric},${m.value},${m.unit}`),
        ].join('\n');
        res.set('Content-Type', 'text/csv');
        res.set('Content-Disposition', 'attachment; filename="analytics.csv"');
        res.send(csv);
    }
    else {
        res.json({
            status: 'ok',
            format,
            exportedAt: new Date(),
            recordCount: filtered.length,
            data: filtered,
        });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map
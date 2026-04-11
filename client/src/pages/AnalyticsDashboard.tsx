import React, { useState, useEffect } from 'react';
import './AnalyticsDashboard.css';

interface PerformanceMetrics {
  apiLatency: {
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  throughput: {
    requestsPerSecond: number;
    peakRPS: number;
    averageRPS: number;
  };
  cache: {
    hitRate: string;
    missRate: string;
    size: string;
    evictionRate: number;
  };
  database: {
    avgQueryTime: number;
    slowQueries: number;
    connectionPoolSize: number;
    activeConnections: number;
  };
}

interface DashboardStats {
  totalRequests: number;
  averageLatency: number;
  p99Latency: number;
  errorRate: number;
  cacheHitRate: number;
  activeUsers: number;
  throughput: number;
}

export const AnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [period, setPeriod] = useState<'1h' | '24h' | '7d'>('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [statsRes, metricsRes] = await Promise.all([
          fetch('/api/analytics/dashboard'),
          fetch('/api/analytics/performance'),
        ]);

        if (statsRes.ok && metricsRes.ok) {
          const statsData = await statsRes.json();
          const metricsData = await metricsRes.json();

          setStats(statsData.stats);
          setMetrics(metricsData.performance);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics-dashboard">
      <div className="analytics-header">
        <h1>📊 Analytics Dashboard</h1>
        <div className="period-selector">
          {(['1h', '24h', '7d'] as const).map((p) => (
            <button
              key={p}
              className={`period-btn ${period === p ? 'active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total Requests</div>
              <div className="metric-value">
                {stats.totalRequests.toLocaleString()}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Avg Latency</div>
              <div className="metric-value">{stats.averageLatency.toFixed(1)}ms</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">p99 Latency</div>
              <div className="metric-value">{stats.p99Latency.toFixed(1)}ms</div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Error Rate</div>
              <div className="metric-value">
                {(stats.errorRate * 100).toFixed(3)}%
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Cache Hit Rate</div>
              <div className="metric-value">
                {(stats.cacheHitRate * 100).toFixed(1)}%
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-label">Throughput</div>
              <div className="metric-value">{stats.throughput} req/s</div>
            </div>
          </div>

          {metrics && (
            <>
              <div className="section">
                <h2>🚀 API Performance</h2>
                <div className="performance-grid">
                  <div className="perf-card">
                    <div className="perf-metric">
                      <span className="perf-label">p50:</span>
                      <span className="perf-value">
                        {metrics.apiLatency.p50.toFixed(1)}ms
                      </span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">p95:</span>
                      <span className="perf-value">
                        {metrics.apiLatency.p95.toFixed(1)}ms
                      </span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">p99:</span>
                      <span className="perf-value">
                        {metrics.apiLatency.p99.toFixed(1)}ms
                      </span>
                    </div>
                  </div>

                  <div className="perf-card">
                    <div className="perf-metric">
                      <span className="perf-label">Avg RPS:</span>
                      <span className="perf-value">
                        {metrics.throughput.averageRPS}
                      </span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">Peak RPS:</span>
                      <span className="perf-value">
                        {metrics.throughput.peakRPS}
                      </span>
                    </div>
                    <div className="perf-metric">
                      <span className="perf-label">Current RPS:</span>
                      <span className="perf-value">
                        {metrics.throughput.requestsPerSecond}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="section">
                <h2>💾 Cache Performance</h2>
                <div className="cache-stats">
                  <div className="stat-row">
                    <span>Hit Rate:</span>
                    <span className="stat-value">{metrics.cache.hitRate}%</span>
                  </div>
                  <div className="stat-row">
                    <span>Miss Rate:</span>
                    <span className="stat-value">{metrics.cache.missRate}%</span>
                  </div>
                  <div className="stat-row">
                    <span>Cache Size:</span>
                    <span className="stat-value">{metrics.cache.size}</span>
                  </div>
                  <div className="stat-row">
                    <span>Eviction Rate:</span>
                    <span className="stat-value">
                      {(metrics.cache.evictionRate * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="section">
                <h2>🗄️ Database Metrics</h2>
                <div className="db-stats">
                  <div className="stat-row">
                    <span>Avg Query Time:</span>
                    <span className="stat-value">
                      {metrics.database.avgQueryTime.toFixed(1)}ms
                    </span>
                  </div>
                  <div className="stat-row">
                    <span>Slow Queries:</span>
                    <span className="stat-value">
                      {metrics.database.slowQueries}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span>Connection Pool:</span>
                    <span className="stat-value">
                      {metrics.database.activeConnections}/
                      {metrics.database.connectionPoolSize}
                    </span>
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="export-section">
                  <button className="export-btn">📥 Export Data</button>
                  <button className="export-btn secondary">📋 Generate Report</button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;

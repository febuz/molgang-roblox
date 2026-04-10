/**
 * Advanced Analytics Engine
 * Performance analysis, trend detection, and insights
 */

interface AnalyticsEvent {
  id: string;
  type: string;
  agent: string;
  timestamp: Date;
  duration: number;
  status: 'success' | 'failure';
  metadata: Record<string, any>;
}

interface Insight {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  data: any;
  timestamp: Date;
}

export class AdvancedAnalytics {
  private events: AnalyticsEvent[] = [];
  private insights: Insight[] = [];

  /**
   * Track event
   */
  trackEvent(type: string, agent: string, duration: number, status: 'success' | 'failure', metadata?: any): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: `event_${Date.now()}`,
      type,
      agent,
      timestamp: new Date(),
      duration,
      status,
      metadata: metadata || {}
    };

    this.events.push(event);
    if (this.events.length > 10000) {
      this.events.shift();
    }

    this.analyzeEvent(event);
    return event;
  }

  /**
   * Analyze event for insights
   */
  private analyzeEvent(event: AnalyticsEvent): void {
    // Analyze performance
    if (event.duration > 10000) {
      this.addInsight({
        title: `Slow task detected: ${event.type}`,
        description: `${event.agent} took ${event.duration}ms to complete ${event.type}`,
        priority: event.duration > 30000 ? 'high' : 'medium',
        recommendation: 'Consider optimization or scaling',
        data: { duration: event.duration, agent: event.agent },
        timestamp: new Date()
      });
    }

    // Analyze failures
    if (event.status === 'failure') {
      this.addInsight({
        title: `Task failure: ${event.type}`,
        description: `${event.agent} failed to complete ${event.type}`,
        priority: 'high',
        recommendation: 'Investigate and retry',
        data: { agent: event.agent, type: event.type, metadata: event.metadata },
        timestamp: new Date()
      });
    }
  }

  /**
   * Add insight
   */
  private addInsight(insight: Insight): void {
    this.insights.push(insight);
    if (this.insights.length > 1000) {
      this.insights.shift();
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(agentName?: string, hoursBack: number = 24): any {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const filtered = agentName
      ? this.events.filter(e => e.agent === agentName && e.timestamp >= cutoffTime)
      : this.events.filter(e => e.timestamp >= cutoffTime);

    const successful = filtered.filter(e => e.status === 'success');
    const failed = filtered.filter(e => e.status === 'failure');

    const avgDuration = successful.length > 0
      ? successful.reduce((sum, e) => sum + e.duration, 0) / successful.length
      : 0;

    return {
      period: `${hoursBack}h`,
      totalEvents: filtered.length,
      successful: successful.length,
      failed: failed.length,
      successRate: filtered.length > 0 ? (successful.length / filtered.length) * 100 : 0,
      averageDuration: Math.round(avgDuration),
      minDuration: successful.length > 0 ? Math.min(...successful.map(e => e.duration)) : 0,
      maxDuration: successful.length > 0 ? Math.max(...successful.map(e => e.duration)) : 0,
      eventsByType: this.groupByType(filtered),
      agentPerformance: this.getAgentPerformance(filtered)
    };
  }

  /**
   * Group events by type
   */
  private groupByType(events: AnalyticsEvent[]): Record<string, number> {
    const groups: Record<string, number> = {};
    events.forEach(e => {
      groups[e.type] = (groups[e.type] || 0) + 1;
    });
    return groups;
  }

  /**
   * Get agent performance
   */
  private getAgentPerformance(events: AnalyticsEvent[]): Record<string, any> {
    const agents: Record<string, any> = {};

    events.forEach(e => {
      if (!agents[e.agent]) {
        agents[e.agent] = { events: 0, successful: 0, failed: 0, totalDuration: 0 };
      }
      agents[e.agent].events++;
      if (e.status === 'success') {
        agents[e.agent].successful++;
        agents[e.agent].totalDuration += e.duration;
      } else {
        agents[e.agent].failed++;
      }
    });

    // Calculate statistics
    for (const agent in agents) {
      const data = agents[agent];
      data.successRate = data.events > 0 ? (data.successful / data.events) * 100 : 0;
      data.avgDuration = data.successful > 0 ? data.totalDuration / data.successful : 0;
    }

    return agents;
  }

  /**
   * Get trends
   */
  getTrends(hoursBack: number = 24): any {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp >= cutoffTime);

    // Group by hour
    const hourly: Record<string, any> = {};
    recentEvents.forEach(e => {
      const hour = new Date(e.timestamp.getTime()).toISOString().slice(0, 13) + ':00:00Z';
      if (!hourly[hour]) {
        hourly[hour] = { events: 0, successful: 0, avgDuration: 0, totalDuration: 0 };
      }
      hourly[hour].events++;
      if (e.status === 'success') {
        hourly[hour].successful++;
        hourly[hour].totalDuration += e.duration;
      }
    });

    // Calculate averages
    for (const hour in hourly) {
      if (hourly[hour].successful > 0) {
        hourly[hour].avgDuration = hourly[hour].totalDuration / hourly[hour].successful;
      }
    }

    return {
      period: `${hoursBack}h`,
      trends: hourly,
      overallTrend: recentEvents.length > 0 ? 'stable' : 'no-data'
    };
  }

  /**
   * Get actionable insights
   */
  getInsights(priority?: string): Insight[] {
    if (!priority) return this.insights;
    return this.insights.filter(i => i.priority === priority);
  }

  /**
   * Get health score
   */
  getHealthScore(): any {
    const recentEvents = this.events.filter(
      e => e.timestamp >= new Date(Date.now() - 60 * 60 * 1000)
    );

    const successful = recentEvents.filter(e => e.status === 'success').length;
    const total = recentEvents.length || 1;
    const successRate = (successful / total) * 100;

    let healthScore = 100;
    if (successRate < 95) healthScore -= 5;
    if (successRate < 90) healthScore -= 10;
    if (this.insights.some(i => i.priority === 'critical')) healthScore -= 20;

    return {
      score: Math.max(0, healthScore),
      status: healthScore >= 90 ? 'excellent' : healthScore >= 70 ? 'good' : 'needs-attention',
      successRate: Math.round(successRate * 10) / 10,
      criticalIssues: this.insights.filter(i => i.priority === 'critical').length,
      recentEvents: recentEvents.length
    };
  }
}

export default AdvancedAnalytics;

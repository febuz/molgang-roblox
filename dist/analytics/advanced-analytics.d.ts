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
export declare class AdvancedAnalytics {
    private events;
    private insights;
    /**
     * Track event
     */
    trackEvent(type: string, agent: string, duration: number, status: 'success' | 'failure', metadata?: any): AnalyticsEvent;
    /**
     * Analyze event for insights
     */
    private analyzeEvent;
    /**
     * Add insight
     */
    private addInsight;
    /**
     * Get performance report
     */
    getPerformanceReport(agentName?: string, hoursBack?: number): any;
    /**
     * Group events by type
     */
    private groupByType;
    /**
     * Get agent performance
     */
    private getAgentPerformance;
    /**
     * Get trends
     */
    getTrends(hoursBack?: number): any;
    /**
     * Get actionable insights
     */
    getInsights(priority?: string): Insight[];
    /**
     * Get health score
     */
    getHealthScore(): any;
}
export default AdvancedAnalytics;
//# sourceMappingURL=advanced-analytics.d.ts.map
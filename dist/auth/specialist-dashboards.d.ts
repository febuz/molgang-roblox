/**
 * Specialist Dashboards
 *
 * Role-specific views:
 * - CEO: Full system view, audit logs, financial data
 * - CTO: Infrastructure, systems, performance metrics
 * - Developer: Tasks, code review, feature backlog
 * - Artist: Design assets, creative work, feedback
 * - Tech Artist: Performance metrics, optimization opportunities
 */
export interface CEODashboard {
    totalAgents: number;
    activeAgents: number;
    systemHealth: number;
    auditAlerts: number;
    criticalIssues: number;
    costThisMonth: number;
    taskCompletion: number;
    teamEmpployeeStatus: Array<{
        username: string;
        role: string;
        status: string;
        lastSeen: Date;
    }>;
}
export interface CTODashboard {
    systemUptime: number;
    infrastructure: {
        databases: {
            count: number;
            healthy: number;
        };
        services: {
            count: number;
            healthy: number;
        };
        deployments: {
            count: number;
            successful: number;
        };
    };
    performance: {
        avgLatency: number;
        errorRate: number;
        throughput: number;
    };
    security: {
        failedLogins: number;
        suspiciousActivities: number;
        securityScore: number;
    };
    latestDeployment: {
        timestamp: Date;
        status: string;
    };
}
export interface DeveloperDashboard {
    assignedTasks: number;
    tasksCompleted: number;
    currentTask?: {
        title: string;
        priority: string;
        dueDate: Date;
    };
    codeReviews: number;
    pullRequests: number;
    buildStatus: string;
    recentCommits: Array<{
        message: string;
        timestamp: Date;
    }>;
}
export interface ArtistDashboard {
    activeProjects: number;
    designTasks: number;
    feedbackItems: number;
    assetLibrary: {
        total: number;
        recentlyAdded: number;
    };
    collaborators: Array<{
        name: string;
        role: string;
    }>;
    recentDesigns: Array<{
        name: string;
        updatedAt: Date;
    }>;
}
export interface TechArtistDashboard {
    performanceMetrics: {
        gpuUsage: number;
        memoryUsage: number;
        cpuUsage: number;
    };
    optimizationOpportunities: number;
    activeOptimizations: number;
    shaderCompilationStatus: string;
    benchmarks: Array<{
        name: string;
        fps: number;
    }>;
    recommendations: string[];
}
export declare class SpecialistDashboards {
    /**
     * Get CEO Dashboard
     */
    getCEODashboard(): CEODashboard;
    /**
     * Get CTO Dashboard
     */
    getCTODashboard(): CTODashboard;
    /**
     * Get Developer Dashboard
     */
    getDeveloperDashboard(): DeveloperDashboard;
    /**
     * Get Artist Dashboard
     */
    getArtistDashboard(): ArtistDashboard;
    /**
     * Get Tech Artist Dashboard
     */
    getTechArtistDashboard(): TechArtistDashboard;
    /**
     * Get dashboard by role
     */
    getDashboard(role: string): Record<string, any>;
}
export default SpecialistDashboards;
//# sourceMappingURL=specialist-dashboards.d.ts.map
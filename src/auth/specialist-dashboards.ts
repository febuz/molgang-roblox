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

import logger from '../utils/logger';

export interface CEODashboard {
  totalAgents: number;
  activeAgents: number;
  systemHealth: number; // 0-100
  auditAlerts: number;
  criticalIssues: number;
  costThisMonth: number;
  taskCompletion: number;
  teamEmpployeeStatus: Array<{ username: string; role: string; status: string; lastSeen: Date }>;
}

export interface CTODashboard {
  systemUptime: number; // percentage
  infrastructure: {
    databases: { count: number; healthy: number };
    services: { count: number; healthy: number };
    deployments: { count: number; successful: number };
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
  latestDeployment: { timestamp: Date; status: string };
}

export interface DeveloperDashboard {
  assignedTasks: number;
  tasksCompleted: number;
  currentTask?: { title: string; priority: string; dueDate: Date };
  codeReviews: number;
  pullRequests: number;
  buildStatus: string;
  recentCommits: Array<{ message: string; timestamp: Date }>;
}

export interface ArtistDashboard {
  activeProjects: number;
  designTasks: number;
  feedbackItems: number;
  assetLibrary: { total: number; recentlyAdded: number };
  collaborators: Array<{ name: string; role: string }>;
  recentDesigns: Array<{ name: string; updatedAt: Date }>;
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
  benchmarks: Array<{ name: string; fps: number }>;
  recommendations: string[];
}

export class SpecialistDashboards {
  /**
   * Get CEO Dashboard
   */
  getCEODashboard(): CEODashboard {
    return {
      totalAgents: 5,
      activeAgents: 4,
      systemHealth: 96,
      auditAlerts: 0,
      criticalIssues: 0,
      costThisMonth: 125.43,
      taskCompletion: 87,
      teamEmpployeeStatus: [
        { username: 'kai', role: 'cto', status: 'working', lastSeen: new Date() },
        { username: 'zip', role: 'developer', status: 'working', lastSeen: new Date() },
        { username: 'mira', role: 'artist', status: 'idle', lastSeen: new Date(Date.now() - 30 * 60000) },
        { username: 'luna', role: 'tech_artist', status: 'working', lastSeen: new Date() }
      ]
    };
  }

  /**
   * Get CTO Dashboard
   */
  getCTODashboard(): CTODashboard {
    return {
      systemUptime: 99.98,
      infrastructure: {
        databases: { count: 3, healthy: 3 },
        services: { count: 8, healthy: 8 },
        deployments: { count: 12, successful: 12 }
      },
      performance: {
        avgLatency: 45.2,
        errorRate: 0.001,
        throughput: 1250
      },
      security: {
        failedLogins: 0,
        suspiciousActivities: 0,
        securityScore: 95
      },
      latestDeployment: {
        timestamp: new Date(Date.now() - 2 * 60 * 60000),
        status: 'successful'
      }
    };
  }

  /**
   * Get Developer Dashboard
   */
  getDeveloperDashboard(): DeveloperDashboard {
    return {
      assignedTasks: 8,
      tasksCompleted: 23,
      currentTask: {
        title: 'Implement payment integration',
        priority: 'high',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60000)
      },
      codeReviews: 5,
      pullRequests: 3,
      buildStatus: 'passing',
      recentCommits: [
        { message: 'Fix bug in user authentication', timestamp: new Date(Date.now() - 60 * 60000) },
        { message: 'Add payment gateway integration', timestamp: new Date(Date.now() - 120 * 60000) },
        { message: 'Update database schema', timestamp: new Date(Date.now() - 240 * 60000) }
      ]
    };
  }

  /**
   * Get Artist Dashboard
   */
  getArtistDashboard(): ArtistDashboard {
    return {
      activeProjects: 3,
      designTasks: 12,
      feedbackItems: 4,
      assetLibrary: { total: 247, recentlyAdded: 12 },
      collaborators: [
        { name: 'Kai', role: 'CTO' },
        { name: 'Zip', role: 'Developer' },
        { name: 'Luna', role: 'Tech Artist' }
      ],
      recentDesigns: [
        { name: 'UI mockup v2.3', updatedAt: new Date(Date.now() - 60 * 60000) },
        { name: 'Game logo variations', updatedAt: new Date(Date.now() - 120 * 60000) },
        { name: 'Character sheet - main hero', updatedAt: new Date(Date.now() - 240 * 60000) }
      ]
    };
  }

  /**
   * Get Tech Artist Dashboard
   */
  getTechArtistDashboard(): TechArtistDashboard {
    return {
      performanceMetrics: {
        gpuUsage: 67,
        memoryUsage: 52,
        cpuUsage: 38
      },
      optimizationOpportunities: 7,
      activeOptimizations: 2,
      shaderCompilationStatus: 'success',
      benchmarks: [
        { name: 'Main scene (1080p)', fps: 144 },
        { name: 'Battle scene (1080p)', fps: 98 },
        { name: 'Cutscene (4K)', fps: 60 }
      ],
      recommendations: [
        'Optimize main battle shader (potential 15% FPS gain)',
        'Reduce particle count in explosion effects (15% VRAM savings)',
        'Batch draw calls in UI rendering (10% CPU savings)',
        'Consider LOD system for distant geometry'
      ]
    };
  }

  /**
   * Get dashboard by role
   */
  getDashboard(role: string): Record<string, any> {
    switch (role) {
      case 'ceo':
        return { success: true, dashboard: this.getCEODashboard(), role: 'ceo' };
      case 'cto':
        return { success: true, dashboard: this.getCTODashboard(), role: 'cto' };
      case 'developer':
        return { success: true, dashboard: this.getDeveloperDashboard(), role: 'developer' };
      case 'artist':
        return { success: true, dashboard: this.getArtistDashboard(), role: 'artist' };
      case 'tech_artist':
        return { success: true, dashboard: this.getTechArtistDashboard(), role: 'tech_artist' };
      default:
        return { success: false, error: 'Unknown role' };
    }
  }
}

export default SpecialistDashboards;

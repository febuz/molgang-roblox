/**
 * Real-time Dashboard Service
 *
 * WebSocket server for live agent status, task completion, and hive mind activity.
 * Integrates with Hive Mind + task-engine + agent-orchestrator.
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import logger from '../utils/logger';
import { hiveMind } from '../orchestration/hive-mind';
import { taskEngine } from '../task-engine';
import { agentOrchestrator } from '../orchestration/agent-orchestrator';

export class RealtimeDashboard {
  private io: SocketIOServer;
  private realtimeData: any = {};

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
      transports: ['websocket', 'polling'],
    });

    this.setupHandlers();
    this.startPolling();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupHandlers(): void {
    this.io.on('connection', (socket) => {
      logger.info(`[Dashboard] Client connected: ${socket.id}`);

      socket.on('request-initial-state', () => {
        socket.emit('dashboard-state', this.buildDashboardState());
      });

      socket.on('disconnect', () => {
        logger.info(`[Dashboard] Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Periodically broadcast updates to all connected clients
   */
  private startPolling(): void {
    setInterval(() => {
      const state = this.buildDashboardState();

      // Only broadcast if state changed
      if (JSON.stringify(state) !== JSON.stringify(this.realtimeData)) {
        this.realtimeData = state;
        this.io.emit('dashboard-update', state);
      }
    }, 1000); // 1-second polling
  }

  /**
   * Build current dashboard state from all sources
   */
  private buildDashboardState(): any {
    return {
      timestamp: new Date().toISOString(),

      // Hive Mind activity
      hive_mind: {
        recent_entries: hiveMind.getRecentHiveMind(10),
        inter_agent_tasks: hiveMind.getInterAgentTasks({ status: 'pending' }),
      },

      // Task engine status
      tasks: {
        all: (taskEngine as any).getTasks?.() || [],
        summary: (taskEngine as any).getTaskSummary?.() || { total: 0, completed: 0, pending: 0 },
      },

      // Agent orchestrator stats
      agents: agentOrchestrator.getStats(),

      // Metadata
      meta: {
        server_uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
      },
    };
  }

  /**
   * Broadcast a specific event to all clients
   */
  broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * Get socket.io instance for advanced usage
   */
  getInstance(): SocketIOServer {
    return this.io;
  }
}

export const realtimeDashboard = { getInstance: () => null };

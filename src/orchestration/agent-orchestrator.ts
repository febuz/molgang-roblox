/**
 * Multi-Agent Message Orchestrator
 *
 * Inspired by Fill's ClaudeClaw orchestrator.
 * Routes incoming messages/commands to the right agent based on:
 * 1. Explicit @agent-id mention
 * 2. Active session for that user
 * 3. Keyword matching per agent
 * 4. Default fallback to Fill (CEO)
 */

import logger from '../utils/logger';
import * as taskEngine from '../task-engine';

export interface RouteDecision {
  agentId: string;
  reason: 'mention' | 'active_session' | 'keyword' | 'default';
  matchedKeyword?: string;
  cleanedMessage: string;
  confidence: number; // 0.0 - 1.0
}

interface ActiveSession {
  userId: string;
  agentId: string;
  startedAt: Date;
  lastActivity: Date;
  messageCount: number;
}

export class AgentOrchestrator {
  private activeSessions = new Map<string, ActiveSession>();
  private readonly AGENT_KEYWORDS: Record<string, string[]> = {
    fill: ['strategy', 'decision', 'approval', 'roadmap', 'okr', 'partner', 'investor', 'governance'],
    kai: ['deploy', 'infrastructure', 'database', 'ci/cd', 'docker', 'kubernetes', 'gpu', 'performance'],
    zip: ['feature', 'ui', 'dashboard', 'frontend', 'component', 'design', 'layout', 'responsive'],
    mira: ['design', 'creative', 'style', 'visual', 'icon', 'brand', 'color', 'animation'],
    luna: ['test', 'qa', 'quality', 'bug', 'verification', 'validation', 'coverage', 'defect'],
  };

  private readonly MENTION_RE = /^@([a-z][a-z0-9_-]{0,29})\b\s*/i;
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Route a message to the appropriate agent
   */
  routeMessage(userId: string, rawMessage: string): RouteDecision {
    const message = rawMessage.trimStart();

    // 1. Check for explicit mention
    const mentionMatch = this.MENTION_RE.exec(message);
    if (mentionMatch) {
      const agentId = mentionMatch[1].toLowerCase();
      if (this.isValidAgent(agentId)) {
        return {
          agentId,
          reason: 'mention',
          cleanedMessage: message.slice(mentionMatch[0].length).trim(),
          confidence: 1.0,
        };
      }
    }

    // 2. Check for active session
    const activeSession = this.activeSessions.get(userId);
    if (activeSession && this.isSessionActive(activeSession)) {
      activeSession.lastActivity = new Date();
      activeSession.messageCount++;
      return {
        agentId: activeSession.agentId,
        reason: 'active_session',
        cleanedMessage: message,
        confidence: 0.9,
      };
    }

    // 3. Keyword matching
    const keywordMatch = this.findKeywordMatch(message);
    if (keywordMatch) {
      return {
        agentId: keywordMatch.agentId,
        reason: 'keyword',
        matchedKeyword: keywordMatch.keyword,
        cleanedMessage: message,
        confidence: keywordMatch.confidence,
      };
    }

    // 4. Default to Fill (CEO)
    return {
      agentId: 'fill',
      reason: 'default',
      cleanedMessage: message,
      confidence: 0.5,
    };
  }

  /**
   * Start an active session for a user with specific agent
   */
  startSession(userId: string, agentId: string): void {
    if (!this.isValidAgent(agentId)) {
      logger.warn(`[Orchestrator] Invalid agent: ${agentId}`);
      return;
    }

    this.activeSessions.set(userId, {
      userId,
      agentId,
      startedAt: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
    });

    logger.info(`[Orchestrator] Started session: ${userId} → ${agentId}`);
  }

  /**
   * End session for a user
   */
  endSession(userId: string): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      logger.info(`[Orchestrator] Ended session: ${userId} (${session.messageCount} messages)`);
      this.activeSessions.delete(userId);
    }
  }

  /**
   * Get active session for user
   */
  getSession(userId: string): ActiveSession | undefined {
    const session = this.activeSessions.get(userId);
    if (session && this.isSessionActive(session)) {
      return session;
    }

    if (session && !this.isSessionActive(session)) {
      this.activeSessions.delete(userId);
    }

    return undefined;
  }

  /**
   * Create inter-agent task (coordination)
   */
  async createInterAgentTask(
    fromAgentId: string,
    toAgentId: string,
    taskTitle: string,
    description: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<{ id: string; status: string }> {
    logger.info(`[Orchestrator] Inter-agent task: ${fromAgentId} → ${toAgentId}: ${taskTitle}`);

    // Create task in task engine
    try {
      const task = (taskEngine as any).createTask?.({
        title: taskTitle,
        description,
        assigned_to: toAgentId,
        priority,
        origin_agent: fromAgentId,
      }) || {
        id: `iat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
      };

      return {
        id: task.id,
        status: task.status || 'pending',
      };
    } catch (e: any) {
      logger.error(`[Orchestrator] Failed to create inter-agent task: ${e.message}`);
      return {
        id: `iat_${Date.now()}_error`,
        status: 'error',
      };
    }
  }

  /**
   * Get routing statistics for dashboard
   */
  getStats(): {
    activeSessions: number;
    sessionsByAgent: Record<string, number>;
    totalMessages: number;
  } {
    const now = new Date();
    let totalMessages = 0;
    const sessionsByAgent: Record<string, number> = {};

    for (const session of this.activeSessions.values()) {
      const ageMs = now.getTime() - session.lastActivity.getTime();
      if (ageMs < this.SESSION_TIMEOUT_MS) {
        totalMessages += session.messageCount;
        sessionsByAgent[session.agentId] = (sessionsByAgent[session.agentId] || 0) + 1;
      }
    }

    return {
      activeSessions: this.activeSessions.size,
      sessionsByAgent,
      totalMessages,
    };
  }

  /**
   * Private: Check if agent is valid
   */
  private isValidAgent(agentId: string): boolean {
    const validAgents = ['fill', 'kai', 'zip', 'mira', 'luna'];
    return validAgents.includes(agentId.toLowerCase());
  }

  /**
   * Private: Check if session is still active
   */
  private isSessionActive(session: ActiveSession): boolean {
    const ageMs = Date.now() - session.lastActivity.getTime();
    return ageMs < this.SESSION_TIMEOUT_MS;
  }

  /**
   * Private: Find keyword match
   */
  private findKeywordMatch(message: string): { agentId: string; keyword: string; confidence: number } | null {
    const lowerMessage = message.toLowerCase();

    for (const [agentId, keywords] of Object.entries(this.AGENT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          // Higher confidence if keyword is at start or appears multiple times
          let confidence = 0.7;
          if (lowerMessage.startsWith(keyword)) confidence = 0.85;
          if ((lowerMessage.match(new RegExp(keyword, 'g')) || []).length > 1) confidence += 0.1;

          return { agentId, keyword, confidence: Math.min(confidence, 1.0) };
        }
      }
    }

    return null;
  }
}

// Singleton instance
export const agentOrchestrator = new AgentOrchestrator();

/**
 * Terminal Activity Monitor
 * Tracks activities from both Terminal A (Alexander) and Terminal B (Cleopatra)
 * Integrates: Kafka messages, Selenium actions, approval prompts
 */

interface TerminalActivity {
  timestamp: string;
  terminal: 'A' | 'B';
  type: 'task' | 'approval' | 'action' | 'status' | 'error';
  agent: string;
  title: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
  details?: any;
}

interface TerminalStatus {
  terminal: 'A' | 'B';
  agent: string;
  isActive: boolean;
  lastActivity: string;
  compactionNeeded: boolean;
  contextTokens: number;
  messageCount: number;
}

export class TerminalActivityMonitor {
  private activities: TerminalActivity[] = [];
  private terminalStatus: Map<string, TerminalStatus> = new Map();
  private maxActivities = 1000;

  constructor() {
    this.initializeTerminals();
    this.setupMessageListeners();
    logger.info('✓ Terminal Activity Monitor initialized');
  }

  private initializeTerminals() {
    this.terminalStatus.set('A', {
      terminal: 'A',
      agent: 'Alexander',
      isActive: true,
      lastActivity: new Date().toISOString(),
      compactionNeeded: false,
      contextTokens: 20000,
      messageCount: 0
    });

    this.terminalStatus.set('B', {
      terminal: 'B',
      agent: 'Cleopatra',
      isActive: true,
      lastActivity: new Date().toISOString(),
      compactionNeeded: false,
      contextTokens: 25000,
      messageCount: 0
    });
  }

  /**
   * Log an activity from either terminal
   */
  logActivity(terminal: 'A' | 'B', activity: Omit<TerminalActivity, 'timestamp' | 'terminal'>) {
    const fullActivity: TerminalActivity = {
      ...activity,
      terminal,
      timestamp: new Date().toISOString()
    };

    this.activities.push(fullActivity);

    // Keep array size manageable
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(-this.maxActivities);
    }

    // Update terminal status
    this.updateTerminalStatus(terminal);

    return fullActivity;
  }

  /**
   * Log Kafka message activity
   */
  logKafkaMessage(terminal: 'A' | 'B', topic: string, message: any) {
    return this.logActivity(terminal, {
      type: 'status',
      agent: message.agent || 'System',
      title: `Kafka: ${topic}`,
      description: JSON.stringify(message),
      details: { kafkaTopic: topic, message }
    });
  }

  /**
   * Log Selenium action
   */
  logSeleniumAction(terminal: 'A' | 'B', action: string, details: any) {
    return this.logActivity(terminal, {
      type: 'action',
      agent: terminal === 'A' ? 'Alexander' : 'Cleopatra',
      title: `Selenium: ${action}`,
      description: details?.description,
      details
    });
  }

  /**
   * Log approval prompt
   */
  logApprovalPrompt(terminal: 'A' | 'B', question: string, options: string[]) {
    return this.logActivity(terminal, {
      type: 'approval',
      agent: terminal === 'A' ? 'Alexander' : 'Cleopatra',
      title: 'Approval Required',
      description: question,
      priority: 'critical',
      details: { options }
    });
  }

  /**
   * Update context token count
   */
  updateContextTokens(terminal: 'A' | 'B', tokenCount: number) {
    const status = this.terminalStatus.get(terminal);
    if (status) {
      status.contextTokens = tokenCount;
      status.compactionNeeded = tokenCount > 130000;
    }
  }

  /**
   * Check if compaction is needed
   */
  isCompactionNeeded(terminal: 'A' | 'B'): boolean {
    const status = this.terminalStatus.get(terminal);
    return status?.compactionNeeded || false;
  }

  /**
   * Get all activities
   */
  getActivities(limit = 50): TerminalActivity[] {
    return this.activities.slice(-limit);
  }

  /**
   * Get activities for specific terminal
   */
  getTerminalActivities(terminal: 'A' | 'B', limit = 50): TerminalActivity[] {
    return this.activities
      .filter(a => a.terminal === terminal)
      .slice(-limit);
  }

  /**
   * Get terminal status
   */
  getTerminalStatus(terminal?: 'A' | 'B'): TerminalStatus | Map<string, TerminalStatus> {
    if (terminal) {
      return this.terminalStatus.get(terminal) || {};
    }
    return this.terminalStatus;
  }

  /**
   * Update terminal status
   */
  private updateTerminalStatus(terminal: 'A' | 'B') {
    const status = this.terminalStatus.get(terminal);
    if (status) {
      status.lastActivity = new Date().toISOString();
      status.messageCount++;

      // Flag compaction if tokens too high
      if (status.contextTokens > 130000) {
        status.compactionNeeded = true;
        logger.warn(`⚠️ COMPACTION NEEDED: Terminal ${terminal} (${status.contextTokens} tokens)`);
      }
    }
  }

  /**
   * Get high-priority activities (approvals, critical tasks)
   */
  getHighPriorityActivities(limit = 20): TerminalActivity[] {
    return this.activities
      .filter(a => a.priority === 'critical' || a.type === 'approval')
      .slice(-limit);
  }

  /**
   * Get activity summary by terminal
   */
  getSummary() {
    return {
      totalActivities: this.activities.length,
      terminalA: {
        status: this.terminalStatus.get('A'),
        activities: this.activities.filter(a => a.terminal === 'A').length,
        highPriority: this.activities.filter(a => a.terminal === 'A' && a.priority === 'critical').length
      },
      terminalB: {
        status: this.terminalStatus.get('B'),
        activities: this.activities.filter(a => a.terminal === 'B').length,
        highPriority: this.activities.filter(a => a.terminal === 'B' && a.priority === 'critical').length
      }
    };
  }

  /**
   * Setup message listeners (stub for future Kafka integration)
   */
  private setupMessageListeners() {
    // This would listen to Kafka topics and Selenium WebDriver events
    // For now, it's a placeholder for future integration
    logger.debug('Message listeners configured (awaiting Kafka/Selenium integration)');
  }
}

// Export singleton instance
export const activityMonitor = new TerminalActivityMonitor();

import logger from './utils/logger';

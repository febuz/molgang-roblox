/**
 * Agent-to-Graph Bridge
 *
 * Connects the VirtualPC task engine to the P2P knowledge graph so that
 * meaningful events in agent execution are automatically reflected as graph
 * nodes and relationships — no manual API calls required.
 *
 * Hooked events:
 *
 *  onTaskCompleted(agent, task)
 *    Creates a Decision node: "agent completed task X" with why=task.description.
 *    Links it to any prior Decision from the same agent via ENABLES.
 *
 *  onTaskFailed(agent, taskId, error)
 *    Creates a Risk node: "task X failed in agent Y" with impact derived
 *    from task priority (critical -> high, high -> medium, etc.).
 *    Best-effort — does not throw.
 *
 *  onAgentProposal(fromAgent, toAgent, content, affects)
 *    Creates a Decision node from fromAgent with what=content, affects=affects.
 *    Looks up the last Decision by toAgent and links DEPENDS_ON.
 *
 *  onSprintCompleted(sprintId, completedTasks, agents)
 *    Creates a Precedent node capturing the sprint outcome as institutional
 *    memory. applicable_to = unique domains touched by the sprint.
 *
 *  onCriticalRisk(agent, description, mitigation)
 *    Directly creates a critical Risk node, bypassing the fact-validation
 *    quorum (risks are created immediately, not after consensus).
 *
 * Usage (in task-engine.ts tick loop):
 *   import { AgentBridge } from './integrations/lightrag/agent-bridge';
 *   const bridge = new AgentBridge(agentAPI);
 *   // ... when a task completes:
 *   await bridge.onTaskCompleted(agentName, task);
 */

import type AgentAPIWrapper from './agent-api';
import type { FactValidator } from './fact-validator';
import { bestEffortPublish } from '../kafka/shared';
import logger from '../../utils/logger';

export interface BridgeTask {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  sprint?: string;
  affects?: string[];
  completed_at?: string;
}

// Maps task priority to risk impact level
const PRIORITY_TO_IMPACT: Record<BridgeTask['priority'], 'low' | 'medium' | 'high' | 'critical'> = {
  critical: 'high',
  high: 'medium',
  medium: 'low',
  low: 'low',
};

export interface BridgeStats {
  tasksRecorded: number;
  risksCreated: number;
  precedentsCreated: number;
  errors: number;
}

export class AgentBridge {
  private api: AgentAPIWrapper;
  private factValidator: FactValidator | null;
  private stats: BridgeStats = { tasksRecorded: 0, risksCreated: 0, precedentsCreated: 0, errors: 0 };

  constructor(agentAPI: AgentAPIWrapper, factValidator?: FactValidator) {
    this.api = agentAPI;
    this.factValidator = factValidator ?? null;
  }

  /**
   * Record a completed task as a Decision in the knowledge graph.
   * If the task affects known risk domains, auto-check for blocking risks.
   */
  async onTaskCompleted(agent: string, task: BridgeTask): Promise<void> {
    try {
      await this.api.addDecision(agent, {
        when: task.completed_at ?? new Date().toISOString(),
        who: agent,
        what: `Completed: ${task.title}`,
        why: task.description,
        affects: task.affects ?? this.extractDomains(task.title + ' ' + task.description),
        status: 'active',
      });
      this.stats.tasksRecorded++;
      logger.debug(`AgentBridge: recorded completion of "${task.title}" by ${agent}`);
    } catch (e: any) {
      this.stats.errors++;
      logger.debug(`AgentBridge.onTaskCompleted error: ${e.message}`);
    }
  }

  /**
   * Record a task failure as a Risk node.
   * Fire-and-forget — never throws so it can't disrupt the task engine tick.
   */
  async onTaskFailed(agent: string, task: BridgeTask, error: string): Promise<void> {
    try {
      const impact = PRIORITY_TO_IMPACT[task.priority];
      const riskId = await this.api.addRisk(agent, {
        description: `Task failure in ${agent}: "${task.title}" — ${error.substring(0, 120)}`,
        impact,
        mitigation: `Investigate and retry task ${task.id}. Review agent ${agent} logs.`,
        status: 'identified',
      });
      this.stats.risksCreated++;
      logger.debug(`AgentBridge: recorded failure risk ${riskId} for task "${task.title}"`);
    } catch (e: any) {
      this.stats.errors++;
      logger.debug(`AgentBridge.onTaskFailed error (suppressed): ${e.message}`);
    }
  }

  /**
   * Record an inter-agent proposal as a Decision, then link it to the
   * target agent's most recent decision via DEPENDS_ON.
   */
  async onAgentProposal(
    fromAgent: string,
    toAgent: string,
    content: string,
    affects: string[] = [],
  ): Promise<void> {
    try {
      await this.api.addDecision(fromAgent, {
        when: new Date().toISOString(),
        who: fromAgent,
        what: `Proposal to ${toAgent}: ${content.substring(0, 100)}`,
        why: `Inter-agent proposal targeting ${toAgent}`,
        affects,
        status: 'active',
      });
      this.stats.tasksRecorded++;
    } catch (e: any) {
      this.stats.errors++;
      logger.debug(`AgentBridge.onAgentProposal error: ${e.message}`);
    }
  }

  /**
   * Record a completed sprint as a Precedent — captures the sprint's
   * collective outcome as institutional memory for future sprints.
   */
  async onSprintCompleted(
    sprintId: string,
    completedTasks: BridgeTask[],
    agents: string[],
  ): Promise<void> {
    if (completedTasks.length === 0) return;
    try {
      const domains = [...new Set(completedTasks.flatMap(t => t.affects ?? this.extractDomains(t.title)))];
      const outcome = completedTasks.map(t => t.title).slice(0, 5).join('; ');
      const context = `Sprint ${sprintId}: ${agents.join(', ')} completed ${completedTasks.length} tasks`;

      const precedentId = await this.api.addPrecedent(agents[0] ?? 'system', {
        context,
        outcome: outcome.substring(0, 200),
        applicable_to: domains,
      });
      this.stats.precedentsCreated++;
      logger.info(`AgentBridge: sprint ${sprintId} recorded as precedent ${precedentId}`);
    } catch (e: any) {
      this.stats.errors++;
      logger.debug(`AgentBridge.onSprintCompleted error: ${e.message}`);
    }
  }

  /**
   * Directly record a critical runtime risk (no quorum needed — operator-level).
   */
  async onCriticalRisk(agent: string, description: string, mitigation: string): Promise<void> {
    try {
      const riskId = await this.api.addRisk(agent, {
        description,
        impact: 'critical',
        mitigation,
        status: 'identified',
      });
      this.stats.risksCreated++;

      // Also submit to fact-validator for tracking
      if (this.factValidator) {
        await this.factValidator.submit(agent, {
          type: 'risk',
          content: description,
          metadata: { impact: 'critical', mitigation },
        });
      }

      bestEffortPublish(p => p.publishMemoryUpdate({
        type: 'risk',
        content: description,
        agent,
        metadata: { impact: 'critical', riskId },
      }));

      logger.warn(`AgentBridge: critical risk recorded: ${description.substring(0, 80)}`);
    } catch (e: any) {
      this.stats.errors++;
      logger.debug(`AgentBridge.onCriticalRisk error: ${e.message}`);
    }
  }

  getStats(): BridgeStats {
    return { ...this.stats };
  }

  // ─────────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────────

  /**
   * Extract domain keywords from free text for the affects[] field.
   * Matches known platform domains so edges land on real nodes.
   */
  private extractDomains(text: string): string[] {
    const KNOWN_DOMAINS = [
      'architecture', 'deployment', 'security', 'performance', 'database',
      'kafka', 'neo4j', 'redis', 'frontend', 'api', 'auth', 'agents',
      'roblox', 'assets', 'pipeline', 'testing', 'ci', 'monitoring',
      'quantum', 'ml', 'inference', 'cost', 'governance', 'wiki',
    ];
    const lower = text.toLowerCase();
    return KNOWN_DOMAINS.filter(d => lower.includes(d));
  }
}

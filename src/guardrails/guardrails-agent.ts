/**
 * 007 — Rogue Agent Watch (guardrails agent)
 *
 * Suspicious-activity monitoring + manual intervention layer behind the
 * /api/guardrails/* routes in index.ts. In-memory, capped stores: alerts
 * (rule firings), incidents (escalated alert groups), interventions
 * (manual operator actions), and toggleable detection rules.
 *
 * This module restores the boot dependency of index.ts (the import predates
 * this file's commit). Detection here is heuristic — the cryptographic
 * guarantees live in the P2P stack; 007 watches the *operational* plane.
 */

import { v4 as uuid } from 'uuid';
import logger from '../utils/logger';

export const MAX_ALERTS = 10_000;
export const MAX_INCIDENTS = 1_000;
export const MAX_INTERVENTIONS = 1_000;

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type InterventionType = 'pause_agent' | 'kill_task' | 'block_model' | 'throttle' | 'note';
export type InterventionResult = 'applied' | 'noop' | 'failed';

export interface GuardrailAlert {
  id: string;
  ruleId: string;
  severity: AlertSeverity;
  agent?: string;
  message: string;
  createdAt: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface GuardrailIncident {
  id: string;
  title: string;
  agent?: string;
  alertIds: string[];
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface InterventionRecord {
  id: string;
  type: InterventionType;
  targetAgent?: string;
  targetTask?: string;
  targetModel?: string;
  reason: string;
  initiatedBy: string;
  result: InterventionResult;
  createdAt: string;
}

export interface GuardrailRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  enabled: boolean;
}

export interface SystemHealth {
  status: 'ok' | 'degraded';
  monitoring: boolean;
  startedAt: string | null;
  alerts: { total: number; unacknowledged: number; bySeverity: Record<AlertSeverity, number> };
  incidents: { total: number; open: number };
  interventions: number;
  rules: { total: number; enabled: number };
}

const DEFAULT_RULES: GuardrailRule[] = [
  { id: 'runaway-spend', name: 'Runaway spend', description: 'Agent exceeds its per-hour cost budget', severity: 'critical', enabled: true },
  { id: 'task-loop', name: 'Task loop', description: 'Same task re-queued more than 5 times in 10 minutes', severity: 'high', enabled: true },
  { id: 'rapid-fire-api', name: 'Rapid-fire API', description: 'More than 100 outbound calls/minute from one agent', severity: 'high', enabled: true },
  { id: 'off-hours-push', name: 'Off-hours push', description: 'git push outside the configured working window', severity: 'medium', enabled: true },
  { id: 'unknown-model', name: 'Unknown model', description: 'Completion requested from a model not in the roster', severity: 'medium', enabled: true },
  { id: 'secret-pattern', name: 'Secret in output', description: 'Agent output matches a credential pattern', severity: 'critical', enabled: true },
];

export class GuardrailsAgent {
  private alerts: GuardrailAlert[] = [];
  private incidents: GuardrailIncident[] = [];
  private interventions: InterventionRecord[] = [];
  private rules = new Map<string, GuardrailRule>(DEFAULT_RULES.map(r => [r.id, { ...r }]));
  private monitoring = false;
  private startedAt: string | null = null;

  start(): void {
    if (this.monitoring) return;
    this.monitoring = true;
    this.startedAt = new Date().toISOString();
    logger.info('🎯 007 guardrails monitoring started');
  }

  stop(): void {
    this.monitoring = false;
  }

  // ── Alerts ──────────────────────────────────────────────────────────────────

  /** Raise an alert from a rule firing. Disabled rules are silently dropped. */
  raiseAlert(params: { ruleId: string; message: string; agent?: string; severity?: AlertSeverity }): GuardrailAlert | null {
    const rule = this.rules.get(params.ruleId);
    if (rule && !rule.enabled) return null;
    const alert: GuardrailAlert = {
      id: `alert_${uuid()}`,
      ruleId: params.ruleId,
      severity: params.severity ?? rule?.severity ?? 'medium',
      agent: params.agent,
      message: params.message,
      createdAt: new Date().toISOString(),
      acknowledged: false,
    };
    this.alerts.push(alert);
    if (this.alerts.length > MAX_ALERTS) this.alerts.shift();
    return alert;
  }

  getAlerts(opts: { severity?: string; acknowledged?: boolean; agent?: string; limit?: number } = {}): GuardrailAlert[] {
    let out = [...this.alerts].reverse();   // newest first
    if (opts.severity) out = out.filter(a => a.severity === opts.severity);
    if (opts.acknowledged !== undefined) out = out.filter(a => a.acknowledged === opts.acknowledged);
    if (opts.agent) out = out.filter(a => a.agent === opts.agent);
    return out.slice(0, Math.max(1, Math.min(opts.limit ?? 100, 1000)));
  }

  acknowledgeAlert(id: string, by: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (!alert) return false;
    alert.acknowledged = true;
    alert.acknowledgedBy = by;
    alert.acknowledgedAt = new Date().toISOString();
    return true;
  }

  // ── Incidents ───────────────────────────────────────────────────────────────

  openIncident(params: { title: string; agent?: string; alertIds?: string[] }): GuardrailIncident {
    const incident: GuardrailIncident = {
      id: `inc_${uuid()}`,
      title: params.title,
      agent: params.agent,
      alertIds: params.alertIds ?? [],
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    this.incidents.push(incident);
    if (this.incidents.length > MAX_INCIDENTS) this.incidents.shift();
    return incident;
  }

  getIncidents(opts: { resolved?: boolean; agent?: string; limit?: number } = {}): GuardrailIncident[] {
    let out = [...this.incidents].reverse();
    if (opts.resolved !== undefined) out = out.filter(i => i.resolved === opts.resolved);
    if (opts.agent) out = out.filter(i => i.agent === opts.agent);
    return out.slice(0, Math.max(1, Math.min(opts.limit ?? 100, 1000)));
  }

  resolveIncident(id: string): boolean {
    const incident = this.incidents.find(i => i.id === id);
    if (!incident || incident.resolved) return false;
    incident.resolved = true;
    incident.resolvedAt = new Date().toISOString();
    return true;
  }

  // ── Interventions ──────────────────────────────────────────────────────────

  intervene(params: {
    type: InterventionType | string;
    targetAgent?: string;
    targetTask?: string;
    targetModel?: string;
    reason: string;
    initiatedBy: string;
  }): InterventionRecord {
    const validTypes: InterventionType[] = ['pause_agent', 'kill_task', 'block_model', 'throttle', 'note'];
    const valid = validTypes.includes(params.type as InterventionType);
    const record: InterventionRecord = {
      id: `int_${uuid()}`,
      type: (valid ? params.type : 'note') as InterventionType,
      targetAgent: params.targetAgent,
      targetTask: params.targetTask,
      targetModel: params.targetModel,
      reason: params.reason,
      initiatedBy: params.initiatedBy,
      // Interventions are recorded as audit facts; actual enforcement hooks
      // (pausing an agent, killing a task) attach where those systems live.
      result: valid ? 'applied' : 'failed',
      createdAt: new Date().toISOString(),
    };
    this.interventions.push(record);
    if (this.interventions.length > MAX_INTERVENTIONS) this.interventions.shift();
    if (valid) logger.warn(`007 intervention: ${record.type} (${record.reason}) by ${record.initiatedBy}`);
    return record;
  }

  getInterventions(limit = 100): InterventionRecord[] {
    return [...this.interventions].reverse().slice(0, Math.max(1, Math.min(limit, 1000)));
  }

  // ── Rules ───────────────────────────────────────────────────────────────────

  getRules(): GuardrailRule[] {
    return [...this.rules.values()];
  }

  setRuleEnabled(id: string, enabled: boolean): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    rule.enabled = enabled;
    return true;
  }

  // ── Health ──────────────────────────────────────────────────────────────────

  getSystemHealth(): SystemHealth {
    const bySeverity: Record<AlertSeverity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    let unacknowledged = 0;
    for (const a of this.alerts) {
      bySeverity[a.severity] += 1;
      if (!a.acknowledged) unacknowledged += 1;
    }
    const openIncidents = this.incidents.filter(i => !i.resolved).length;
    return {
      status: openIncidents > 0 || bySeverity.critical > 0 ? 'degraded' : 'ok',
      monitoring: this.monitoring,
      startedAt: this.startedAt,
      alerts: { total: this.alerts.length, unacknowledged, bySeverity },
      incidents: { total: this.incidents.length, open: openIncidents },
      interventions: this.interventions.length,
      rules: { total: this.rules.size, enabled: [...this.rules.values()].filter(r => r.enabled).length },
    };
  }
}

/** Module-level singleton — index.ts wires the REST routes around it. */
export const guardrailsAgent = new GuardrailsAgent();

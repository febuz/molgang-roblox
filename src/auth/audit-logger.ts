/**
 * CEO Audit Logging System
 *
 * Comprehensive audit trail:
 * - Login/logout events
 * - Data access (sensitive, financial)
 * - Configuration changes
 * - User management (create, modify, delete)
 * - Command execution
 * - Permission escalations
 * - IP address, device ID, location
 * - Timestamp, duration, outcome
 */

import logger from '../utils/logger';

export type AuditEventType =
  | 'login' | 'logout'
  | 'data_access' | 'sensitive_data_access'
  | 'config_change' | 'user_create' | 'user_modify' | 'user_delete'
  | 'command_execute' | 'permission_escalation'
  | 'permission_denied' | 'invalid_access'
  | 'session_timeout' | 'password_change';

export type AuditEventSeverity = 'info' | 'warning' | 'critical';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  username: string;
  role: string;
  eventType: AuditEventType;
  severity: AuditEventSeverity;
  ipAddress: string;
  deviceId: string;
  location: string;
  description: string;
  resource?: string; // What was accessed/modified
  action?: string; // What was done
  outcome: 'success' | 'failure';
  details?: Record<string, any>;
  durationMs?: number;
}

export class CEOAuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents: number = 10000; // Keep last 10k events
  private criticalEventCallbacks: Array<(event: AuditEvent) => void> = [];

  /**
   * Log audit event
   */
  logEvent(
    userId: string,
    username: string,
    role: string,
    eventType: AuditEventType,
    ipAddress: string,
    deviceId: string,
    location: string,
    description: string,
    outcome: 'success' | 'failure',
    options?: {
      severity?: AuditEventSeverity;
      resource?: string;
      action?: string;
      details?: Record<string, any>;
      durationMs?: number;
    }
  ): AuditEvent {
    const event: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      username,
      role,
      eventType,
      severity: options?.severity || this.determineSeverity(eventType, outcome),
      ipAddress,
      deviceId,
      location,
      description,
      resource: options?.resource,
      action: options?.action,
      outcome,
      details: options?.details,
      durationMs: options?.durationMs
    };

    this.events.push(event);

    // Keep only last N events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Alert on critical events
    if (event.severity === 'critical') {
      this.triggerCriticalAlert(event);
    }

    // Log to system
    const icon = event.severity === 'critical' ? '🚨' : event.severity === 'warning' ? '⚠️' : 'ℹ️';
    logger.info(
      `${icon} AUDIT: ${event.username} (${event.role}) - ${event.eventType} - ${event.outcome} ` +
      `[${event.ipAddress} / ${event.deviceId} / ${event.location}]`
    );

    return event;
  }

  /**
   * Determine severity based on event type and outcome
   */
  private determineSeverity(eventType: AuditEventType, outcome: 'success' | 'failure'): AuditEventSeverity {
    const criticalEvents = [
      'permission_escalation',
      'sensitive_data_access',
      'user_delete',
      'config_change',
      'invalid_access'
    ];

    if (outcome === 'failure' && ['permission_denied', 'invalid_access'].includes(eventType)) {
      return 'warning';
    }

    if (criticalEvents.includes(eventType)) {
      return 'critical';
    }

    return 'info';
  }

  /**
   * Trigger callback for critical events
   */
  private triggerCriticalAlert(event: AuditEvent): void {
    this.criticalEventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Critical event callback failed:', error);
      }
    });
  }

  /**
   * Register callback for critical events
   */
  onCriticalEvent(callback: (event: AuditEvent) => void): void {
    this.criticalEventCallbacks.push(callback);
  }

  /**
   * Get events by user
   */
  getEventsByUser(username: string, limit: number = 100): AuditEvent[] {
    return this.events
      .filter(e => e.username === username)
      .slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: AuditEventType, limit: number = 100): AuditEvent[] {
    return this.events
      .filter(e => e.eventType === eventType)
      .slice(-limit);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: AuditEventSeverity, limit: number = 100): AuditEvent[] {
    return this.events
      .filter(e => e.severity === severity)
      .slice(-limit);
  }

  /**
   * Get events in time range
   */
  getEventsByTimeRange(startTime: Date, endTime: Date, limit: number = 1000): AuditEvent[] {
    return this.events
      .filter(e => e.timestamp >= startTime && e.timestamp <= endTime)
      .slice(-limit);
  }

  /**
   * Get events from IP address
   */
  getEventsByIP(ipAddress: string, limit: number = 100): AuditEvent[] {
    return this.events
      .filter(e => e.ipAddress === ipAddress)
      .slice(-limit);
  }

  /**
   * Get all events
   */
  getAllEvents(limit: number = 100): AuditEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get audit statistics
   */
  getStatistics(): Record<string, any> {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = { info: 0, warning: 0, critical: 0 };
    const byUser: Record<string, number> = {};
    const byOutcome: Record<string, number> = { success: 0, failure: 0 };

    this.events.forEach(event => {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
      bySeverity[event.severity]++;
      byUser[event.username] = (byUser[event.username] || 0) + 1;
      byOutcome[event.outcome]++;
    });

    // Get unique users and IPs
    const uniqueUsers = new Set(this.events.map(e => e.username)).size;
    const uniqueIPs = new Set(this.events.map(e => e.ipAddress)).size;

    // Get failed login attempts (brute force detection)
    const failedLogins = this.events.filter(e => e.eventType === 'login' && e.outcome === 'failure');
    const failedLoginsByIP: Record<string, number> = {};
    failedLogins.forEach(e => {
      failedLoginsByIP[e.ipAddress] = (failedLoginsByIP[e.ipAddress] || 0) + 1;
    });

    return {
      total_events: this.events.length,
      total_users: uniqueUsers,
      total_ips: uniqueIPs,
      by_type: byType,
      by_severity: bySeverity,
      by_user: byUser,
      by_outcome: byOutcome,
      failed_logins_by_ip: Object.entries(failedLoginsByIP)
        .filter(([, count]) => count >= 3)
        .map(([ip, count]) => ({ ip, count }))
        .sort((a, b) => b.count - a.count)
    };
  }

  /**
   * Export audit log (CSV)
   */
  exportAsCSV(): string {
    const headers = [
      'Timestamp',
      'User',
      'Role',
      'Event Type',
      'Severity',
      'IP Address',
      'Device ID',
      'Location',
      'Description',
      'Outcome',
      'Duration (ms)'
    ];

    const rows = this.events.map(e => [
      e.timestamp.toISOString(),
      e.username,
      e.role,
      e.eventType,
      e.severity,
      e.ipAddress,
      e.deviceId,
      e.location,
      e.description,
      e.outcome,
      e.durationMs || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Export audit log (JSON)
   */
  exportAsJSON(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Clear old events (older than N days)
   */
  clearOldEvents(daysOld: number): number {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const beforeCount = this.events.length;

    this.events = this.events.filter(e => e.timestamp > cutoffDate);

    const deleted = beforeCount - this.events.length;
    logger.info(`✓ Cleared ${deleted} audit events older than ${daysOld} days`);

    return deleted;
  }

  /**
   * Get audit health score (0-100)
   * Based on: low security events, failed logins, suspicious access
   */
  getSecurityScore(): number {
    let score = 100;

    // Penalize failed logins
    const failedLogins = this.events.filter(e => e.eventType === 'login' && e.outcome === 'failure').length;
    score -= Math.min(failedLogins * 2, 30);

    // Penalize permission denied events
    const permissionDenied = this.events.filter(e => e.eventType === 'permission_denied').length;
    score -= Math.min(permissionDenied, 10);

    // Penalize invalid access attempts
    const invalidAccess = this.events.filter(e => e.eventType === 'invalid_access').length;
    score -= Math.min(invalidAccess * 3, 30);

    // Bonus for sensitive data access logged properly
    const sensitiveAccess = this.events.filter(
      e => e.eventType === 'sensitive_data_access' && e.outcome === 'success'
    ).length;
    score += Math.min(sensitiveAccess * 0.5, 10);

    return Math.max(0, Math.min(100, score));
  }
}

export default CEOAuditLogger;

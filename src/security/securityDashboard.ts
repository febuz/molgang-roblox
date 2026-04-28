/**
 * Security Dashboard
 *
 * Composites signals from CEOAuditLogger + AuthSystem into a single
 * structured response for the CEO dashboard. Computes a weighted score
 * out of 100, surfaces individual signal contributions, and lifts threat
 * indicators that need attention (brute force IPs, low 2FA adoption, etc.)
 * into a top-level array so the UI can render them prominently.
 *
 * Pure read-only — does not mutate either source.
 */

import CEOAuditLogger, { AuditEvent } from '../auth/audit-logger';
import AuthSystem from '../auth/auth-system';

export interface ThreatIndicator {
  level: 'low' | 'medium' | 'high';
  category: string;
  message: string;
  details?: Record<string, any>;
}

export interface SecurityDashboardSnapshot {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  computed_at: string;
  signals: {
    audit_score: number;            // 0-100 from audit-logger
    twofa_adoption_pct: number;     // 0-100
    failed_login_rate_24h: number;  // failures per active user, last 24h
    critical_events_24h: number;
    suspicious_ips: number;         // IPs with ≥3 failed logins
    active_sessions: number;
  };
  threats: ThreatIndicator[];
  user_breakdown: {
    total_users: number;
    twofa_enabled: number;
    twofa_pct: number;
    by_role: Record<string, number>;
  };
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SUSPICIOUS_IP_FAIL_THRESHOLD = 3;

export class SecurityDashboard {
  constructor(
    private readonly authSystem: AuthSystem,
    private readonly auditLogger: CEOAuditLogger
  ) {}

  snapshot(): SecurityDashboardSnapshot {
    const now = Date.now();
    const sinceDay = new Date(now - ONE_DAY_MS);

    const events = this.auditLogger.getAllEvents(10_000);
    const recent = events.filter(e => new Date(e.timestamp) >= sinceDay);

    const failedLogins24h = recent.filter(
      e => e.eventType === 'login' && e.outcome === 'failure'
    );
    const criticalEvents24h = recent.filter(e => e.severity === 'critical');

    // IPs with multiple failed logins — same threshold the existing
    // statistics endpoint uses, so dashboards stay consistent.
    const failedByIp = countByIp(failedLogins24h);
    const suspiciousIps = Object.entries(failedByIp).filter(
      ([, n]) => n >= SUSPICIOUS_IP_FAIL_THRESHOLD
    );

    const users = this.authSystem.getAllUsers();
    const twofaCount = users.filter(u => u.totpEnabled).length;
    const twofaPct = users.length === 0 ? 0 : (twofaCount / users.length) * 100;

    const sessionStats = this.authSystem.getSessionStats();
    const activeUsers = Math.max(1, users.filter(u => u.status === 'active').length);

    const auditScore = this.auditLogger.getSecurityScore();
    const failedLoginRate = failedLogins24h.length / activeUsers;

    // Composite score: blend the audit score with 2FA adoption (a strong
    // proactive control). Then dock points for live threats.
    let score = 0.7 * auditScore + 0.3 * twofaPct;
    if (suspiciousIps.length > 0) score -= Math.min(20, suspiciousIps.length * 5);
    if (criticalEvents24h.length > 0) score -= Math.min(15, criticalEvents24h.length * 3);
    score = Math.max(0, Math.min(100, score));

    const threats: ThreatIndicator[] = [];

    if (twofaPct < 50) {
      threats.push({
        level: twofaPct < 20 ? 'high' : 'medium',
        category: '2fa_adoption',
        message: `Only ${twofaCount}/${users.length} users have 2FA enabled`,
        details: { twofa_pct: twofaPct },
      });
    }

    for (const [ip, count] of suspiciousIps) {
      threats.push({
        level: count >= 10 ? 'high' : 'medium',
        category: 'brute_force',
        message: `${count} failed logins from ${ip} in the last 24h`,
        details: { ip, failed_count: count },
      });
    }

    if (criticalEvents24h.length > 0) {
      threats.push({
        level: criticalEvents24h.length >= 5 ? 'high' : 'medium',
        category: 'critical_events',
        message: `${criticalEvents24h.length} critical audit events in the last 24h`,
        details: { count: criticalEvents24h.length },
      });
    }

    const byRole: Record<string, number> = {};
    for (const u of users) byRole[u.role] = (byRole[u.role] || 0) + 1;

    return {
      score: Math.round(score * 10) / 10,
      grade: gradeFromScore(score),
      computed_at: new Date(now).toISOString(),
      signals: {
        audit_score: auditScore,
        twofa_adoption_pct: Math.round(twofaPct * 10) / 10,
        failed_login_rate_24h: Math.round(failedLoginRate * 100) / 100,
        critical_events_24h: criticalEvents24h.length,
        suspicious_ips: suspiciousIps.length,
        active_sessions: sessionStats.totalActiveSessions,
      },
      threats,
      user_breakdown: {
        total_users: users.length,
        twofa_enabled: twofaCount,
        twofa_pct: Math.round(twofaPct * 10) / 10,
        by_role: byRole,
      },
    };
  }
}

function countByIp(events: AuditEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) out[e.ipAddress] = (out[e.ipAddress] || 0) + 1;
  return out;
}

function gradeFromScore(score: number): SecurityDashboardSnapshot['grade'] {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export default SecurityDashboard;

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
import CEOAuditLogger from '../auth/audit-logger';
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
        audit_score: number;
        twofa_adoption_pct: number;
        failed_login_rate_24h: number;
        critical_events_24h: number;
        suspicious_ips: number;
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
export declare class SecurityDashboard {
    private readonly authSystem;
    private readonly auditLogger;
    constructor(authSystem: AuthSystem, auditLogger: CEOAuditLogger);
    snapshot(): SecurityDashboardSnapshot;
}
export default SecurityDashboard;
//# sourceMappingURL=securityDashboard.d.ts.map
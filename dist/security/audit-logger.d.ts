/**
 * Advanced Audit Logging System
 * Security events, access logs, and compliance tracking
 */
interface AuditEvent {
    id: string;
    timestamp: Date;
    userId: string;
    action: string;
    resource: string;
    status: 'success' | 'failure';
    ipAddress: string;
    userAgent: string;
    changes?: Record<string, any>;
    details?: string;
}
interface SecurityAlert {
    id: string;
    timestamp: Date;
    level: 'info' | 'warning' | 'critical';
    type: string;
    description: string;
    source: string;
    action: string;
}
export declare class AuditLogger {
    private auditLog;
    private securityAlerts;
    private accessPatterns;
    /**
     * Log audit event
     */
    logEvent(userId: string, action: string, resource: string, status: 'success' | 'failure', details?: {
        ipAddress?: string;
        userAgent?: string;
        changes?: Record<string, any>;
        description?: string;
    }): AuditEvent;
    /**
     * Analyze activity for suspicious patterns
     */
    private analyzeActivity;
    /**
     * Create security alert
     */
    private createAlert;
    /**
     * Get audit log for user
     */
    getUserAuditLog(userId: string, limit?: number): AuditEvent[];
    /**
     * Get audit log for resource
     */
    getResourceAuditLog(resource: string, limit?: number): AuditEvent[];
    /**
     * Get security alerts
     */
    getSecurityAlerts(level?: string, limit?: number): SecurityAlert[];
    /**
     * Get compliance report
     */
    getComplianceReport(days?: number): any;
    /**
     * Get top actions
     */
    private getTopActions;
    /**
     * Get failed attempts
     */
    private getFailedAttempts;
    /**
     * Export audit log
     */
    exportAuditLog(format: 'json' | 'csv', limit?: number): string;
    /**
     * Get security health score
     */
    getSecurityHealthScore(): any;
}
export default AuditLogger;
//# sourceMappingURL=audit-logger.d.ts.map
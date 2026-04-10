"use strict";
/**
 * Advanced Audit Logging System
 * Security events, access logs, and compliance tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
class AuditLogger {
    constructor() {
        this.auditLog = [];
        this.securityAlerts = [];
        this.accessPatterns = new Map();
    }
    /**
     * Log audit event
     */
    logEvent(userId, action, resource, status, details) {
        const event = {
            id: `audit_${Date.now()}`,
            timestamp: new Date(),
            userId,
            action,
            resource,
            status,
            ipAddress: details?.ipAddress || 'unknown',
            userAgent: details?.userAgent || 'unknown',
            changes: details?.changes,
            details: details?.description
        };
        this.auditLog.push(event);
        if (this.auditLog.length > 100000) {
            this.auditLog.shift();
        }
        // Analyze for suspicious activity
        this.analyzeActivity(event);
        return event;
    }
    /**
     * Analyze activity for suspicious patterns
     */
    analyzeActivity(event) {
        // Track access patterns
        const pattern = `${event.userId}_${event.action}`;
        if (!this.accessPatterns.has(pattern)) {
            this.accessPatterns.set(pattern, { count: 0, lastTime: new Date() });
        }
        const pData = this.accessPatterns.get(pattern);
        pData.count++;
        pData.lastTime = new Date();
        // Alert on suspicious patterns
        if (event.status === 'failure') {
            // Multiple failed attempts
            if (pData.count > 5) {
                this.createAlert('warning', 'brute-force-attempt', `Multiple failed ${event.action} attempts from user ${event.userId}`, event.userId);
            }
        }
        // Alert on unusual access times
        const hour = new Date().getHours();
        if (hour < 6 || hour > 23) {
            this.createAlert('info', 'unusual-access-time', `${event.userId} accessed ${event.resource} at unusual time`, event.userId);
        }
    }
    /**
     * Create security alert
     */
    createAlert(level, type, description, source) {
        const alert = {
            id: `alert_${Date.now()}`,
            timestamp: new Date(),
            level: level,
            type,
            description,
            source,
            action: 'logged'
        };
        this.securityAlerts.push(alert);
        if (this.securityAlerts.length > 10000) {
            this.securityAlerts.shift();
        }
        return alert;
    }
    /**
     * Get audit log for user
     */
    getUserAuditLog(userId, limit = 100) {
        return this.auditLog
            .filter(e => e.userId === userId)
            .slice(-limit)
            .reverse();
    }
    /**
     * Get audit log for resource
     */
    getResourceAuditLog(resource, limit = 100) {
        return this.auditLog
            .filter(e => e.resource === resource)
            .slice(-limit)
            .reverse();
    }
    /**
     * Get security alerts
     */
    getSecurityAlerts(level, limit = 100) {
        const filtered = level
            ? this.securityAlerts.filter(a => a.level === level)
            : this.securityAlerts;
        return filtered.slice(-limit).reverse();
    }
    /**
     * Get compliance report
     */
    getComplianceReport(days = 30) {
        const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const recentEvents = this.auditLog.filter(e => e.timestamp >= cutoffTime);
        const failedActions = recentEvents.filter(e => e.status === 'failure');
        const successfulActions = recentEvents.filter(e => e.status === 'success');
        return {
            period: `${days} days`,
            totalEvents: recentEvents.length,
            successfulActions: successfulActions.length,
            failedActions: failedActions.length,
            successRate: recentEvents.length > 0
                ? ((successfulActions.length / recentEvents.length) * 100).toFixed(2)
                : 'N/A',
            uniqueUsers: new Set(recentEvents.map(e => e.userId)).size,
            uniqueResources: new Set(recentEvents.map(e => e.resource)).size,
            topActions: this.getTopActions(recentEvents),
            failedAttempts: this.getFailedAttempts(failedActions),
            alerts: this.securityAlerts.filter(a => a.timestamp >= cutoffTime).length
        };
    }
    /**
     * Get top actions
     */
    getTopActions(events) {
        const actions = {};
        events.forEach(e => {
            actions[e.action] = (actions[e.action] || 0) + 1;
        });
        // Sort by count
        return Object.fromEntries(Object.entries(actions).sort((a, b) => b[1] - a[1]).slice(0, 10));
    }
    /**
     * Get failed attempts
     */
    getFailedAttempts(events) {
        const failures = {};
        events.forEach(e => {
            const key = `${e.userId}_${e.action}`;
            failures[key] = (failures[key] || 0) + 1;
        });
        return Object.fromEntries(Object.entries(failures).sort((a, b) => b[1] - a[1]).slice(0, 10));
    }
    /**
     * Export audit log
     */
    exportAuditLog(format, limit = 10000) {
        const data = this.auditLog.slice(-limit);
        if (format === 'json') {
            return JSON.stringify(data, null, 2);
        }
        else {
            // CSV format
            const headers = ['timestamp', 'userId', 'action', 'resource', 'status', 'ipAddress'];
            const rows = data.map(e => [
                e.timestamp.toISOString(),
                e.userId,
                e.action,
                e.resource,
                e.status,
                e.ipAddress
            ]);
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
    }
    /**
     * Get security health score
     */
    getSecurityHealthScore() {
        const recentEvents = this.auditLog.filter(e => e.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000));
        const failureRate = recentEvents.length > 0
            ? (recentEvents.filter(e => e.status === 'failure').length / recentEvents.length) * 100
            : 0;
        const alertCount = this.securityAlerts.filter(a => a.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
        let score = 100;
        if (failureRate > 5)
            score -= 10;
        if (failureRate > 10)
            score -= 15;
        if (alertCount > 5)
            score -= 20;
        if (alertCount > 10)
            score -= 30;
        return {
            score: Math.max(0, score),
            status: score >= 80 ? 'secure' : score >= 60 ? 'at-risk' : 'critical',
            failureRate: Math.round(failureRate * 100) / 100,
            alerts24h: alertCount,
            criticalAlerts: this.securityAlerts.filter(a => a.level === 'critical').length
        };
    }
}
exports.AuditLogger = AuditLogger;
exports.default = AuditLogger;
//# sourceMappingURL=audit-logger.js.map
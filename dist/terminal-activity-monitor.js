"use strict";
/**
 * Terminal Activity Monitor
 * Tracks activities from both Terminal A (Alexander) and Terminal B (Cleopatra)
 * Integrates: Kafka messages, Selenium actions, approval prompts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityMonitor = exports.TerminalActivityMonitor = void 0;
const logger_1 = __importDefault(require("./utils/logger"));
class TerminalActivityMonitor {
    constructor() {
        this.activities = [];
        this.terminalStatus = new Map();
        this.maxActivities = 1000;
        this.initializeTerminals();
        this.setupMessageListeners();
        logger_1.default.info('✓ Terminal Activity Monitor initialized');
    }
    initializeTerminals() {
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
    logActivity(terminal, activity) {
        const fullActivity = {
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
    logKafkaMessage(terminal, topic, message) {
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
    logSeleniumAction(terminal, action, details) {
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
    logApprovalPrompt(terminal, question, options) {
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
    updateContextTokens(terminal, tokenCount) {
        const status = this.terminalStatus.get(terminal);
        if (status) {
            status.contextTokens = tokenCount;
            status.compactionNeeded = tokenCount > 130000;
        }
    }
    /**
     * Check if compaction is needed
     */
    isCompactionNeeded(terminal) {
        const status = this.terminalStatus.get(terminal);
        return status?.compactionNeeded || false;
    }
    /**
     * Get all activities
     */
    getActivities(limit = 50) {
        return this.activities.slice(-limit);
    }
    /**
     * Get activities for specific terminal
     */
    getTerminalActivities(terminal, limit = 50) {
        return this.activities
            .filter(a => a.terminal === terminal)
            .slice(-limit);
    }
    /**
     * Get terminal status
     */
    getTerminalStatus(terminal) {
        if (terminal) {
            const status = this.terminalStatus.get(terminal);
            return status || { terminal, agent: '', isActive: false, lastActivity: '', compactionNeeded: false, contextTokens: 0, messageCount: 0 };
        }
        return this.terminalStatus;
    }
    /**
     * Update terminal status
     */
    updateTerminalStatus(terminal) {
        const status = this.terminalStatus.get(terminal);
        if (status) {
            status.lastActivity = new Date().toISOString();
            status.messageCount++;
            // Flag compaction if tokens too high
            if (status.contextTokens > 130000) {
                status.compactionNeeded = true;
                logger_1.default.warn(`⚠️ COMPACTION NEEDED: Terminal ${terminal} (${status.contextTokens} tokens)`);
            }
        }
    }
    /**
     * Get high-priority activities (approvals, critical tasks)
     */
    getHighPriorityActivities(limit = 20) {
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
    setupMessageListeners() {
        // This would listen to Kafka topics and Selenium WebDriver events
        // For now, it's a placeholder for future integration
        logger_1.default.debug('Message listeners configured (awaiting Kafka/Selenium integration)');
    }
}
exports.TerminalActivityMonitor = TerminalActivityMonitor;
// Export singleton instance
exports.activityMonitor = new TerminalActivityMonitor();
//# sourceMappingURL=terminal-activity-monitor.js.map
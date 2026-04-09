"use strict";
/**
 * OpenClaw Integration Handler
 * Autonomous agent command execution without approval
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenClawHandler = void 0;
class OpenClawHandler {
    constructor() {
        this.commandQueue = [];
        this.executedCommands = [];
    }
    /**
     * Queue command for execution (no approval required)
     */
    queueCommand(agent, command, params) {
        const cmd = {
            id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            agent,
            command,
            params,
            timestamp: new Date(),
            status: 'pending'
        };
        this.commandQueue.push(cmd);
        this.executeCommand(cmd);
        return cmd;
    }
    /**
     * Execute command immediately
     */
    executeCommand(cmd) {
        cmd.status = 'executing';
        // Simulate command execution
        setTimeout(() => {
            try {
                cmd.result = this.processCommand(cmd.agent, cmd.command, cmd.params);
                cmd.status = 'completed';
            }
            catch (error) {
                cmd.error = error.message;
                cmd.status = 'failed';
            }
            this.executedCommands.push(cmd);
            if (this.executedCommands.length > 1000) {
                this.executedCommands.shift();
            }
        }, Math.random() * 1000);
    }
    /**
     * Process command for specific agent
     */
    processCommand(agent, command, params) {
        switch (command) {
            case 'start-task':
                return { status: 'started', task: params?.taskId };
            case 'pause-task':
                return { status: 'paused', task: params?.taskId };
            case 'resume-task':
                return { status: 'resumed', task: params?.taskId };
            case 'complete-task':
                return { status: 'completed', task: params?.taskId };
            case 'get-status':
                return {
                    agent,
                    status: 'operational',
                    tasksRunning: Math.floor(Math.random() * 5),
                    uptime: process.uptime()
                };
            case 'execute-memory-query':
                return {
                    query: params?.query,
                    results: ['result_1', 'result_2', 'result_3'],
                    count: 3
                };
            case 'trigger-analysis':
                return {
                    analysis_type: params?.type,
                    status: 'running',
                    estimatedTime: 5000
                };
            case 'collect-metrics':
                return {
                    timestamp: new Date(),
                    memory: process.memoryUsage().heapUsed / 1024 / 1024,
                    uptime: process.uptime()
                };
            default:
                throw new Error(`Unknown command: ${command}`);
        }
    }
    /**
     * Get command status
     */
    getCommandStatus(commandId) {
        return this.commandQueue.find(c => c.id === commandId) ||
            this.executedCommands.find(c => c.id === commandId);
    }
    /**
     * Get all commands for an agent
     */
    getAgentCommands(agent, limit = 50) {
        return [
            ...this.commandQueue.filter(c => c.agent === agent),
            ...this.executedCommands.filter(c => c.agent === agent)
        ].slice(-limit);
    }
    /**
     * Get command history
     */
    getCommandHistory(limit = 100) {
        return [
            ...this.commandQueue,
            ...this.executedCommands
        ].slice(-limit);
    }
    /**
     * Get execution statistics
     */ getStats() {
        const completed = this.executedCommands.filter(c => c.status === 'completed').length;
        const failed = this.executedCommands.filter(c => c.status === 'failed').length;
        const total = completed + failed;
        return {
            totalCommands: this.commandQueue.length + this.executedCommands.length,
            completed,
            failed,
            successRate: total > 0 ? (completed / total) * 100 : 0,
            byAgent: this.getCommandsByAgent(),
            recentCommands: this.getCommandHistory(10)
        };
    }
    /**
     * Get commands grouped by agent
     */
    getCommandsByAgent() {
        const agents = new Set();
        [...this.commandQueue, ...this.executedCommands].forEach(c => agents.add(c.agent));
        const result = {};
        agents.forEach(agent => {
            result[agent] = [...this.commandQueue, ...this.executedCommands]
                .filter(c => c.agent === agent).length;
        });
        return result;
    }
    /**
     * Cancel a queued command
     */
    cancelCommand(commandId) {
        const index = this.commandQueue.findIndex(c => c.id === commandId);
        if (index !== -1 && this.commandQueue[index].status === 'pending') {
            const cmd = this.commandQueue[index];
            cmd.status = 'failed';
            cmd.error = 'Cancelled by user';
            this.executedCommands.push(this.commandQueue.splice(index, 1)[0]);
            return true;
        }
        return false;
    }
    /**
     * Clear all history
     */
    clearHistory() {
        this.commandQueue = [];
        this.executedCommands = [];
    }
}
exports.OpenClawHandler = OpenClawHandler;
exports.default = OpenClawHandler;
//# sourceMappingURL=openclaw-handler.js.map
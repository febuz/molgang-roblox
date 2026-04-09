"use strict";
/**
 * OpenClaw API Routes
 * Command execution, monitoring, and control endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupOpenClawRoutes = setupOpenClawRoutes;
const openclaw_handler_1 = __importDefault(require("./openclaw-handler"));
const handler = new openclaw_handler_1.default();
function setupOpenClawRoutes(app) {
    // Queue a new command (no approval required)
    app.post('/api/openclaw/command', (req, res) => {
        try {
            const { agent, command, params } = req.body;
            if (!agent || !command) {
                return res.status(400).json({ error: 'agent and command required' });
            }
            const cmd = handler.queueCommand(agent, command, params);
            return res.json({ success: true, command: cmd });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });
    // Get command status
    app.get('/api/openclaw/command/:id', (req, res) => {
        try {
            const cmd = handler.getCommandStatus(req.params.id);
            if (!cmd) {
                return res.status(404).json({ error: 'Command not found' });
            }
            return res.json({ success: true, command: cmd });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });
    // Get agent commands
    app.get('/api/openclaw/agent/:agent/commands', (req, res) => {
        try {
            const commands = handler.getAgentCommands(req.params.agent);
            return res.json({ success: true, agent: req.params.agent, commands });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });
    // Get command history
    app.get('/api/openclaw/history', (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const commands = handler.getCommandHistory(limit);
            return res.json({ success: true, commands });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });
    // Get execution statistics
    app.get('/api/openclaw/stats', (req, res) => {
        try {
            const stats = handler.getStats();
            return res.json({ success: true, ...stats });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });
    // Cancel a command
    app.post('/api/openclaw/command/:id/cancel', (req, res) => {
        try {
            const cancelled = handler.cancelCommand(req.params.id);
            return res.json({ success: cancelled });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });
    // Clear history
    app.post('/api/openclaw/clear', (req, res) => {
        try {
            handler.clearHistory();
            return res.json({ success: true });
        }
        catch (error) {
            return res.status(500).json({ error: error.message });
        }
    });
}
exports.default = setupOpenClawRoutes;
//# sourceMappingURL=openclaw-api.js.map
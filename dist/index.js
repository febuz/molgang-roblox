"use strict";
/**
 * Custom Paperclip - Fork with LightRAG, Kafka, Autonomous Agents
 *
 * Main entry point for the custom Paperclip system.
 * Initializes: LightRAG, Kafka, Model Router, Agent Executor
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = require("dotenv");
const logger_1 = __importDefault(require("./utils/logger"));
const orchestrator_1 = require("./integrations/kafka/orchestrator");
const client_1 = require("./integrations/lightrag/client");
const agent_api_1 = require("./integrations/lightrag/agent-api");
const model_router_1 = require("./orchestration/model-router");
const register_1 = require("./skills/register");
// Load environment
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3100;
// Middleware
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        components: {
            api: 'operational',
            lightrag: 'checking...',
            kafka: 'checking...',
            models: 'checking...'
        }
    });
});
/**
 * Initialize all system components
 */
async function initialize() {
    logger_1.default.info('🚀 Custom Paperclip starting...');
    try {
        // 1. Initialize LightRAG (shared memory)
        logger_1.default.info('📊 Initializing LightRAG...');
        const lightrag = new client_1.LightRAGClient({
            neo4j_url: process.env.NEO4J_URI || 'bolt://localhost:7687',
            neo4j_username: process.env.NEO4J_USER || 'neo4j',
            neo4j_password: process.env.NEO4J_PASSWORD || 'password'
        });
        await lightrag.connect();
        logger_1.default.info('✓ LightRAG connected');
        // 1b. Initialize Agent API Wrapper (with caching + rate limiting)
        logger_1.default.info('📦 Initializing Agent API Wrapper...');
        const agentAPI = new agent_api_1.AgentAPIWrapper(lightrag);
        logger_1.default.info('✓ Agent API Wrapper ready (caching + rate limiting)');
        // 2. Initialize Kafka (message orchestration)
        logger_1.default.info('🔄 Initializing Kafka...');
        const kafka = new orchestrator_1.KafkaOrchestrator({
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            clientId: 'custom-paperclip'
        });
        await kafka.connect();
        logger_1.default.info('✓ Kafka connected');
        // 3. Initialize Model Router (intelligent routing)
        logger_1.default.info('🤖 Initializing Model Router...');
        const modelRouter = new model_router_1.ModelRouter({
            local_models: ['qwen-27b', 'phi-4', 'deepseek-r1'],
            cloud_models: ['claude-opus', 'mythos'],
            default_routing: 'intelligent'
        });
        logger_1.default.info('✓ Model Router ready');
        // 4. Register LightRAG as skills (Claude Code integration)
        logger_1.default.info('🎯 Registering LightRAG skills...');
        (0, register_1.registerSkills)(lightrag);
        logger_1.default.info('✓ Skills registered');
        // 5. Setup API routes
        setupRoutes(app, { lightrag, agentAPI, kafka, modelRouter });
        // 6. Start server
        app.listen(PORT, () => {
            logger_1.default.info(`
╔════════════════════════════════════════════════╗
║  Custom Paperclip Ready                        ║
╠════════════════════════════════════════════════╣
║  Status: Running                               ║
║  Port: ${PORT}                                 ║
║  Components: LightRAG, Kafka, Model Router    ║
║  Agents: Ready to execute                      ║
╚════════════════════════════════════════════════╝
      `);
        });
    }
    catch (error) {
        logger_1.default.error('❌ Initialization failed:', error);
        process.exit(1);
    }
}
/**
 * Setup API routes
 */
function setupRoutes(app, components) {
    const { lightrag, agentAPI, kafka, modelRouter } = components;
    // ========== Agent Memory API (with caching + rate limiting) ==========
    app.post('/api/memory/query', async (req, res) => {
        try {
            const { agent, topic, filters } = req.body;
            const result = await agentAPI.queryMemory(agent || 'anonymous', topic);
            res.json({ success: true, ...result });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    app.post('/api/memory/add-decision', async (req, res) => {
        try {
            const { agent, decision } = req.body;
            await agentAPI.addDecision(agent || 'anonymous', decision);
            res.json({ success: true });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    app.post('/api/memory/find-precedent', async (req, res) => {
        try {
            const { topic, threshold } = req.body;
            const results = await agentAPI.findPrecedent(topic, threshold || 0.75);
            res.json({ success: true, precedents: results });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    app.get('/api/memory/status', async (req, res) => {
        try {
            const status = await agentAPI.getMemoryStatus();
            res.json({ success: true, ...status });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    app.get('/api/memory/cache-stats', (req, res) => {
        try {
            const stats = agentAPI.getCacheStats();
            res.json({ success: true, ...stats });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    // ========== Raw Memory API (direct LightRAG access) ==========
    app.post('/api/memory/query-raw', async (req, res) => {
        try {
            const { query, filters } = req.body;
            const result = await lightrag.query(query, filters);
            res.json({ success: true, result });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    app.post('/api/memory/add-fact', async (req, res) => {
        try {
            const { fact, context, type, affects } = req.body;
            const result = await lightrag.addNode({
                type, content: fact, context, affects
            });
            res.json({ success: true, node_id: result.id });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    // Model routing routes
    app.post('/api/model/route', async (req, res) => {
        try {
            const { task, context } = req.body;
            const selected = await modelRouter.route(task, context);
            res.json({ success: true, selected_model: selected });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });
    // Kafka routes
    app.get('/api/kafka/status', async (req, res) => {
        try {
            const status = await kafka.getStatus();
            res.json(status);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
    logger_1.default.info('✓ Routes configured');
}
// Start the system
initialize().catch(error => {
    logger_1.default.error('Fatal error:', error);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map
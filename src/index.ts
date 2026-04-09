/**
 * Custom Paperclip - Fork with LightRAG, Kafka, Autonomous Agents
 *
 * Main entry point for the custom Paperclip system.
 * Initializes: LightRAG, Kafka, Model Router, Agent Executor
 */

import express from 'express';
import { config } from 'dotenv';
import logger from './utils/logger';
import { KafkaOrchestrator } from './integrations/kafka/orchestrator';
import { LightRAGClient } from './integrations/lightrag/client';
import { AgentAPIWrapper } from './integrations/lightrag/agent-api';
import { ModelRouter } from './orchestration/model-router';
import { registerSkills } from './skills/register';

// Load environment
config();

const app = express();
const PORT = process.env.PORT || 3100;

// Middleware
app.use(express.json());

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
  logger.info('🚀 Custom Paperclip starting...');

  try {
    // 1. Initialize LightRAG (shared memory)
    logger.info('📊 Initializing LightRAG...');
    const lightrag = new LightRAGClient({
      neo4j_url: process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j_username: process.env.NEO4J_USER || 'neo4j',
      neo4j_password: process.env.NEO4J_PASSWORD || 'password'
    });
    await lightrag.connect();
    logger.info('✓ LightRAG connected');

    // 1b. Initialize Agent API Wrapper (with caching + rate limiting)
    logger.info('📦 Initializing Agent API Wrapper...');
    const agentAPI = new AgentAPIWrapper(lightrag);
    logger.info('✓ Agent API Wrapper ready (caching + rate limiting)');

    // 2. Initialize Kafka (message orchestration)
    logger.info('🔄 Initializing Kafka...');
    const kafka = new KafkaOrchestrator({
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      clientId: 'custom-paperclip'
    });
    await kafka.connect();
    logger.info('✓ Kafka connected');

    // 3. Initialize Model Router (intelligent routing)
    logger.info('🤖 Initializing Model Router...');
    const modelRouter = new ModelRouter({
      local_models: ['qwen-27b', 'phi-4', 'deepseek-r1'],
      cloud_models: ['claude-opus', 'mythos'],
      default_routing: 'intelligent'
    });
    logger.info('✓ Model Router ready');

    // 4. Register LightRAG as skills (Claude Code integration)
    logger.info('🎯 Registering LightRAG skills...');
    registerSkills(lightrag);
    logger.info('✓ Skills registered');

    // 5. Setup API routes
    setupRoutes(app, { lightrag, agentAPI, kafka, modelRouter });

    // 6. Start server
    app.listen(PORT, () => {
      logger.info(`
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

  } catch (error) {
    logger.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

/**
 * Setup API routes
 */
function setupRoutes(app: express.Express, components: any) {
  const { lightrag, agentAPI, kafka, modelRouter } = components;

  // ========== Agent Memory API (with caching + rate limiting) ==========

  app.post('/api/memory/query', async (req, res) => {
    try {
      const { agent, topic, filters } = req.body;
      const result = await agentAPI.queryMemory(agent || 'anonymous', topic);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/memory/add-decision', async (req, res) => {
    try {
      const { agent, decision } = req.body;
      await agentAPI.addDecision(agent || 'anonymous', decision);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/memory/find-precedent', async (req, res) => {
    try {
      const { topic, threshold } = req.body;
      const results = await agentAPI.findPrecedent(topic, threshold || 0.75);
      res.json({ success: true, precedents: results });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/memory/status', async (req, res) => {
    try {
      const status = await agentAPI.getMemoryStatus();
      res.json({ success: true, ...status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/memory/cache-stats', (req, res) => {
    try {
      const stats = agentAPI.getCacheStats();
      res.json({ success: true, ...stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ========== Raw Memory API (direct LightRAG access) ==========

  app.post('/api/memory/query-raw', async (req, res) => {
    try {
      const { query, filters } = req.body;
      const result = await lightrag.query(query, filters);
      res.json({ success: true, result });
    } catch (error: any) {
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
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Model routing routes
  app.post('/api/model/route', async (req, res) => {
    try {
      const { task, context } = req.body;
      const selected = await modelRouter.route(task, context);
      res.json({ success: true, selected_model: selected });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Kafka routes
  app.get('/api/kafka/status', async (req, res) => {
    try {
      const status = await kafka.getStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  logger.info('✓ Routes configured');
}

// Start the system
initialize().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});

export default app;

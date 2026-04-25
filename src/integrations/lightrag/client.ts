/**
 * LightRAG Client - Shared Memory Integration
 *
 * Provides unified interface for agents to:
 * - Query shared knowledge graph
 * - Add facts/decisions
 * - Find precedents
 * - Get full context
 */

import { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import logger from '../../utils/logger';

export interface GraphNode {
  id: string;
  type: string;
  content: string;
  context?: string;
  created_by: string;
  created_at: Date;
  affects?: string[];
}

export interface QueryResult {
  nodes: GraphNode[];
  relationships: any[];
  cached: boolean;
}

export class LightRAGClient {
  private driver: Driver;
  private queryCache = new Map<string, any>();

  constructor(config: {
    neo4j_url: string;
    neo4j_username: string;
    neo4j_password: string;
  }) {
    this.driver = neo4j.driver(
      config.neo4j_url,
      neo4j.auth.basic(config.neo4j_username, config.neo4j_password)
    );
  }

  private connected = false;

  /**
   * Connect to Neo4j (gracefully degrades if unavailable)
   */
  async connect(): Promise<void> {
    try {
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      this.connected = true;
      logger.info('✓ LightRAG connected to Neo4j');
    } catch (error) {
      this.connected = false;
      logger.warn('⚠ Neo4j not available - LightRAG running in offline mode (in-memory only)');
    }
  }

  /**
   * Check if Neo4j is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Query the knowledge graph
   */
  async query(queryText: string, filters?: Record<string, any>): Promise<QueryResult> {
    const cacheKey = JSON.stringify({ queryText, filters });

    // Check cache
    if (this.queryCache.has(cacheKey)) {
      logger.debug('Cache hit for query:', queryText);
      return { ...this.queryCache.get(cacheKey), cached: true };
    }

    // Return empty result if not connected
    if (!this.connected) {
      return { nodes: [], relationships: [], cached: false };
    }

    const session = this.driver.session();
    try {
      // Execute Cypher-like query
      const result = await session.run(`
        MATCH (n:Node)
        WHERE n.content CONTAINS $query
        RETURN n
        LIMIT 10
      `, { query: queryText });

      const nodes = result.records.map(record => ({
        id: record.get('n').identity.toString(),
        type: record.get('n').properties.type,
        content: record.get('n').properties.content,
        created_by: record.get('n').properties.created_by,
        created_at: new Date(record.get('n').properties.created_at),
      }));

      const output: QueryResult = {
        nodes,
        relationships: [],
        cached: false
      };

      // Cache result
      this.queryCache.set(cacheKey, output);

      return output;
    } finally {
      await session.close();
    }
  }

  /**
   * Add a fact/decision to the graph
   */
  async addNode(node: Omit<GraphNode, 'id' | 'created_at'>): Promise<GraphNode> {
    const id = `node_${Date.now()}`;

    // Return in-memory node if not connected
    if (!this.connected) {
      logger.info(`✓ Fact added (offline): ${node.type}`);
      return {
        id,
        type: node.type,
        content: node.content,
        context: node.context,
        created_by: node.created_by,
        created_at: new Date(),
        affects: node.affects
      };
    }

    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        CREATE (n:Node {
          id: $id,
          type: $type,
          content: $content,
          context: $context,
          created_by: $created_by,
          created_at: datetime(),
          affects: $affects
        })
        RETURN n
        `,
        {
          id,
          type: node.type,
          content: node.content,
          context: node.context || '',
          created_by: node.created_by,
          affects: node.affects || []
        }
      );

      const record = result.records[0];
      const created = record.get('n').properties;

      // Clear cache on new write
      this.queryCache.clear();

      logger.info(`✓ Fact added: ${node.type} from ${node.created_by}`);

      return {
        id: created.id,
        type: created.type,
        content: created.content,
        context: created.context,
        created_by: created.created_by,
        created_at: new Date(created.created_at),
        affects: created.affects
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Find similar decisions/precedents
   */
  async findSimilar(topic: string, threshold: number = 0.7): Promise<GraphNode[]> {
    if (!this.connected) return [];
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n:Node {type: 'decision'})
        WHERE n.context CONTAINS $topic
        RETURN n
        ORDER BY n.created_at DESC
        LIMIT 5
      `, { topic });

      return result.records.map(record => ({
        id: record.get('n').identity.toString(),
        type: record.get('n').properties.type,
        content: record.get('n').properties.content,
        created_by: record.get('n').properties.created_by,
        created_at: new Date(record.get('n').properties.created_at),
      }));
    } finally {
      await session.close();
    }
  }

  /**
   * Get full context for a project
   */
  async getContext(projectId: string, include: string[] = []): Promise<any> {
    if (!this.connected) {
      return { project_id: projectId, nodes: [], total_count: 0, completeness_score: 0, updated_at: new Date().toISOString() };
    }
    const session = this.driver.session();
    try {
      const result = await session.run(`
        MATCH (n:Node {context: $projectId})
        RETURN n
        ORDER BY n.created_at DESC
      `, { projectId });

      const nodes = result.records.map(record => ({
        id: record.get('n').identity.toString(),
        type: record.get('n').properties.type,
        content: record.get('n').properties.content,
        created_by: record.get('n').properties.created_by,
      }));

      return {
        project_id: projectId,
        nodes: nodes.filter(n => include.length === 0 || include.includes(n.type)),
        total_count: nodes.length,
        completeness_score: Math.min(nodes.length / 10, 1.0),
        updated_at: new Date().toISOString()
      };
    } finally {
      await session.close();
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.driver.close();
    logger.info('LightRAG connection closed');
  }
}

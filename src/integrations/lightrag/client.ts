/**
 * LightRAG Client - Shared Memory Integration
 *
 * Provides unified interface for agents to:
 * - Query shared knowledge graph
 * - Add facts/decisions
 * - Find precedents
 * - Get full context
 * - Create typed nodes and relationships (P2P sync)
 */

import { Driver } from 'neo4j-driver';
import neo4j from 'neo4j-driver';
import logger from '../../utils/logger';
import { INDEXES } from './schema';
import { QUANTUM_INDEXES } from './quantum-schema';
import { NFC_INDEXES } from './nfc-schema';

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
  // Monotonic suffix so two nodes added in the same millisecond get distinct
  // ids — otherwise CREATE would produce duplicate-id graph nodes (corrupting
  // the shared knowledge graph under bulk ingest).
  private nodeSeq = 0;

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
   * Connect to Neo4j (gracefully degrades if unavailable).
   * On success, initialises schema indexes so queries can use full-text search.
   */
  async connect(): Promise<void> {
    try {
      const session = this.driver.session();
      await session.run('RETURN 1');
      await session.close();
      this.connected = true;
      logger.info('✓ LightRAG connected to Neo4j');
      await this.initIndexes();
    } catch (error) {
      this.connected = false;
      logger.warn('⚠ Neo4j not available - LightRAG running in offline mode (in-memory only)');
    }
  }

  /**
   * Run all schema index definitions (idempotent — IF NOT EXISTS).
   */
  async initIndexes(): Promise<void> {
    if (!this.connected) return;
    const session = this.driver.session();
    try {
      for (const cypher of [...Object.values(INDEXES), ...Object.values(QUANTUM_INDEXES), ...Object.values(NFC_INDEXES)]) {
        await session.run(cypher);
      }
      logger.info('✓ LightRAG indexes initialised (core + quantum + NFC)');
    } catch (err: any) {
      logger.warn(`LightRAG: index init failed (non-fatal): ${err.message}`);
    } finally {
      await session.close();
    }
  }

  /**
   * Check if Neo4j is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Query the knowledge graph.
   * Uses full-text index (node_search) when available, falls back to
   * substring CONTAINS so the API works before indexes are warmed.
   */
  async query(queryText: string, filters?: Record<string, any>): Promise<QueryResult> {
    const cacheKey = JSON.stringify({ queryText, filters });

    if (this.queryCache.has(cacheKey)) {
      logger.debug('Cache hit for query:', queryText);
      return { ...this.queryCache.get(cacheKey), cached: true };
    }

    if (!this.connected) {
      return { nodes: [], relationships: [], cached: false };
    }

    const limit = filters?.limit ?? 20;
    const session = this.driver.session();
    try {
      // Prefer full-text index; the CALL … YIELD pattern is safe whether or
      // not the index exists — Neo4j throws, we catch and fall through.
      let records: any[] = [];
      try {
        const ft = await session.run(
          `CALL db.index.fulltext.queryNodes('node_search', $q)
           YIELD node AS n, score
           RETURN n ORDER BY score DESC LIMIT $lim`,
          { q: queryText, lim: neo4j.int(limit) },
        );
        records = ft.records;
      } catch {
        // Full-text index not ready; use substring fallback.
        const fb = await session.run(
          `MATCH (n) WHERE n.content CONTAINS $q RETURN n LIMIT $lim`,
          { q: queryText, lim: neo4j.int(limit) },
        );
        records = fb.records;
      }

      const nodes: GraphNode[] = records.map(r => {
        const p = r.get('n').properties;
        return {
          id: p.id ?? r.get('n').identity.toString(),
          type: p.type ?? 'Node',
          content: p.content ?? '',
          context: p.context,
          created_by: p.created_by ?? 'unknown',
          created_at: p.created_at ? new Date(p.created_at) : new Date(),
          affects: p.affects ?? [],
        };
      });

      const output: QueryResult = { nodes, relationships: [], cached: false };
      if (this.queryCache.size < 1000) {
        this.queryCache.set(cacheKey, output);
      }
      return output;
    } finally {
      await session.close();
    }
  }

  /**
   * Add a fact/decision to the graph
   */
  async addNode(node: Omit<GraphNode, 'id' | 'created_at'>): Promise<GraphNode> {
    const id = `node_${Date.now()}_${this.nodeSeq++}`;

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
   * Create a directed relationship between two existing nodes.
   * No-ops (logs a warning) if either node is not found.
   */
  async addEdge(
    fromId: string,
    relType: string,
    toId: string,
    props?: Record<string, any>,
  ): Promise<void> {
    if (!this.connected) {
      logger.debug(`addEdge offline: ${fromId} -[${relType}]-> ${toId}`);
      return;
    }
    const session = this.driver.session();
    try {
      // relType comes from the trusted RELATIONSHIPS enum internally; callers
      // outside this module should validate against that enum before calling.
      const safeRel = relType.replace(/[^A-Z_]/g, '_');
      await session.run(
        `MATCH (a {id: $from}), (b {id: $to})
         MERGE (a)-[r:\`${safeRel}\`]->(b)
         SET r += $props`,
        { from: fromId, to: toId, props: props ?? {} },
      );
      this.queryCache.clear();
      logger.debug(`Edge created: ${fromId} -[${relType}]-> ${toId}`);
    } finally {
      await session.close();
    }
  }

  /**
   * MERGE a typed node by its stable id (idempotent — safe for P2P replay).
   * Uses the correct Neo4j label so schema indexes apply.
   */
  async mergeTypedNode(
    id: string,
    label: string,
    props: Record<string, any>,
  ): Promise<void> {
    if (!this.connected) {
      logger.debug(`mergeTypedNode offline: ${label}(${id})`);
      return;
    }
    const safeLabel = label.replace(/[^A-Za-z0-9_]/g, '_');
    const session = this.driver.session();
    try {
      await session.run(
        `MERGE (n:\`${safeLabel}\` {id: $id})
         SET n += $props, n.updated_at = datetime()`,
        { id, props },
      );
      this.queryCache.clear();
      logger.debug(`Merged node: ${safeLabel}(${id})`);
    } finally {
      await session.close();
    }
  }

  /**
   * Read all nodes of a given typed label.
   * Returns raw property maps; callers must validate/convert.
   */
  async getTypedNodes(label: string): Promise<Record<string, any>[]> {
    if (!this.connected) return [];
    const safeLabel = label.replace(/[^A-Za-z0-9_]/g, '_');
    const session = this.driver.session();
    try {
      const result = await session.run(
        `MATCH (n:\`${safeLabel}\`) RETURN n`,
      );
      return result.records.map(r => r.get('n').properties);
    } catch (e: any) {
      logger.warn(`getTypedNodes(${safeLabel}): ${e.message}`);
      return [];
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

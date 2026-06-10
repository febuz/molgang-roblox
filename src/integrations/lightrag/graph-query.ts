/**
 * Knowledge Graph Query Builder
 *
 * Provides a structured, chainable query DSL for the P2P knowledge graph.
 * Translates a GraphQuery object into a Cypher query and executes it
 * against Neo4j — or returns an empty result when offline.
 *
 * Usage:
 *   const results = await buildQuery(lightrag)
 *     .type('decision')
 *     .createdBy('kai')
 *     .since('2026-01-01')
 *     .affectsAny(['kafka', 'distributed'])
 *     .relatedTo('risk', 'AFFECTS')
 *     .orderBy('created_at', 'desc')
 *     .limit(20)
 *     .execute();
 *
 * REST:
 *   POST /api/graph/query — execute a GraphQuery JSON body
 *   GET  /api/graph/query/builder — return supported query fields
 */

import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type NodeLabel =
  | 'Decision' | 'Risk' | 'Precedent' | 'Context' | 'Fact' | 'Node'
  | 'QuantumCircuit' | 'QuantumAlgorithm' | 'QuantumResource' | 'Qubit' | 'QuantumGate'
  | 'EntanglementPair' | string;

export type SortField = 'created_at' | 'updated_at' | 'content' | 'id' | string;
export type SortDir = 'asc' | 'desc';

export interface GraphQuery {
  types?: string[];
  labels?: NodeLabel[];
  createdBy?: string;
  since?: string;
  until?: string;
  affectsAny?: string[];
  affectsAll?: string[];
  contentContains?: string;
  ids?: string[];
  relatedTo?: {
    targetId?: string;
    relType?: string;
    direction?: 'outgoing' | 'incoming' | 'both';
  };
  validationState?: 'pending' | 'confirmed' | 'contested' | 'rejected';
  impactLevel?: 'low' | 'medium' | 'high' | 'critical';
  orderBy?: SortField;
  sortDir?: SortDir;
  limit?: number;
  skip?: number;
  includeEdges?: boolean;
}

export interface GraphQueryResult {
  nodes: QueryNode[];
  edges?: QueryEdge[];
  total: number;
  queryMs: number;
  offline: boolean;
}

export interface QueryNode {
  id: string;
  labels: string[];
  type: string;
  content: string;
  created_by: string;
  created_at: string;
  affects: string[];
  [key: string]: unknown;
}

export interface QueryEdge {
  fromId: string;
  relType: string;
  toId: string;
  props: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Query builder (fluent API)
// ──────────────────────────────────────────────────────────────────────────────

export class GraphQueryBuilder {
  private q: GraphQuery = {};
  private lightrag: LightRAGClient;

  constructor(lightrag: LightRAGClient) {
    this.lightrag = lightrag;
  }

  type(...types: string[]): this { this.q.types = types; return this; }
  label(...labels: NodeLabel[]): this { this.q.labels = labels; return this; }
  createdBy(agent: string): this { this.q.createdBy = agent; return this; }
  since(iso: string): this { this.q.since = iso; return this; }
  until(iso: string): this { this.q.until = iso; return this; }
  affectsAny(tags: string[]): this { this.q.affectsAny = tags; return this; }
  affectsAll(tags: string[]): this { this.q.affectsAll = tags; return this; }
  contains(text: string): this { this.q.contentContains = text; return this; }
  ids(ids: string[]): this { this.q.ids = ids; return this; }
  relatedTo(targetId: string, relType?: string, direction: 'outgoing' | 'incoming' | 'both' = 'both'): this {
    this.q.relatedTo = { targetId, relType, direction }; return this;
  }
  validationState(state: GraphQuery['validationState']): this { this.q.validationState = state; return this; }
  impactLevel(level: GraphQuery['impactLevel']): this { this.q.impactLevel = level; return this; }
  orderBy(field: SortField, dir: SortDir = 'desc'): this { this.q.orderBy = field; this.q.sortDir = dir; return this; }
  limit(n: number): this { this.q.limit = n; return this; }
  skip(n: number): this { this.q.skip = n; return this; }
  withEdges(): this { this.q.includeEdges = true; return this; }

  toQuery(): GraphQuery { return { ...this.q }; }

  async execute(): Promise<GraphQueryResult> {
    return executeGraphQuery(this.lightrag, this.q);
  }
}

export function buildQuery(lightrag: LightRAGClient): GraphQueryBuilder {
  return new GraphQueryBuilder(lightrag);
}

// ──────────────────────────────────────────────────────────────────────────────
// Query executor
// ──────────────────────────────────────────────────────────────────────────────

export async function executeGraphQuery(
  lightrag: LightRAGClient,
  query: GraphQuery,
): Promise<GraphQueryResult> {
  const t0 = Date.now();

  if (!lightrag.isConnected()) {
    return { nodes: [], edges: [], total: 0, queryMs: 0, offline: true };
  }

  const { cypher, params } = buildCypher(query);
  const driver = (lightrag as any).driver;
  const session = driver.session();

  try {
    const result = await session.run(cypher, params);

    const nodes: QueryNode[] = result.records.map((rec: any) => {
      const node = rec.get('n');
      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries<any>(node.properties)) {
        props[k] = v && typeof v === 'object' && 'low' in v ? v.low : v;
      }
      return {
        id: String(props.id ?? node.identity.toString()),
        labels: node.labels,
        type: String(props.type ?? node.labels[0] ?? 'Node').toLowerCase(),
        content: String(props.content ?? ''),
        created_by: String(props.created_by ?? ''),
        created_at: String(props.created_at ?? ''),
        affects: Array.isArray(props.affects) ? (props.affects as string[]) : [],
        ...props,
      } as QueryNode;
    });

    let edges: QueryEdge[] = [];
    if (query.includeEdges && nodes.length > 0) {
      const ids = nodes.map(n => n.id);
      const edgeRes = await session.run(`
        MATCH (a)-[r]->(b)
        WHERE a.id IN $ids AND b.id IN $ids
        RETURN a.id AS fromId, type(r) AS relType, b.id AS toId, properties(r) AS props
        LIMIT 1000
      `, { ids });
      edges = edgeRes.records.map((rec: any) => ({
        fromId: rec.get('fromId'),
        relType: rec.get('relType'),
        toId: rec.get('toId'),
        props: rec.get('props') ?? {},
      }));
    }

    return { nodes, edges, total: nodes.length, queryMs: Date.now() - t0, offline: false };
  } finally {
    await session.close();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Cypher builder
// ──────────────────────────────────────────────────────────────────────────────

function buildCypher(q: GraphQuery): { cypher: string; params: Record<string, any> } {
  const params: Record<string, any> = {};
  const conditions: string[] = [];

  // Label filter — build MATCH clause dynamically.
  // Labels/types come from the REST body and cannot be parameterized in Cypher,
  // so they MUST pass through sanitizeLabel before interpolation.
  let matchLabel = '';
  if (q.labels && q.labels.length > 0) {
    matchLabel = `:${sanitizeLabel(q.labels[0])}`;
  } else if (q.types && q.types.length > 0) {
    // Map type strings to labels
    const labelMap: Record<string, string> = {
      decision: 'Decision', risk: 'Risk', precedent: 'Precedent',
      context: 'Context', fact: 'Fact', node: 'Node',
    };
    const mapped = q.types.map(t => labelMap[t.toLowerCase()] ?? sanitizeLabel(t));
    if (mapped.length === 1) {
      matchLabel = `:${mapped[0]}`;
    }
    // For multiple types we use a WHERE filter below
    if (q.types.length > 1) {
      const labelConditions = mapped.map(l => `n:${l}`).join(' OR ');
      conditions.push(`(${labelConditions})`);
    }
  }

  // id filter
  if (q.ids && q.ids.length > 0) {
    params.ids = q.ids;
    conditions.push('n.id IN $ids');
  }

  // createdBy
  if (q.createdBy) {
    params.createdBy = q.createdBy;
    conditions.push('n.created_by = $createdBy');
  }

  // since / until
  if (q.since) {
    params.since = q.since;
    conditions.push('n.created_at >= $since');
  }
  if (q.until) {
    params.until = q.until;
    conditions.push('n.created_at <= $until');
  }

  // affectsAny
  if (q.affectsAny && q.affectsAny.length > 0) {
    params.affectsAny = q.affectsAny;
    conditions.push('any(tag IN $affectsAny WHERE tag IN n.affects)');
  }

  // affectsAll
  if (q.affectsAll && q.affectsAll.length > 0) {
    params.affectsAll = q.affectsAll;
    conditions.push('all(tag IN $affectsAll WHERE tag IN n.affects)');
  }

  // contentContains — prefer fulltext index, fall back to CONTAINS
  if (q.contentContains) {
    params.contentContains = q.contentContains;
    conditions.push('toLower(n.content) CONTAINS toLower($contentContains)');
  }

  // validationState
  if (q.validationState) {
    params.validationState = q.validationState;
    conditions.push('n.validation_state = $validationState');
  }

  // impactLevel
  if (q.impactLevel) {
    params.impactLevel = q.impactLevel;
    conditions.push('n.impact = $impactLevel');
  }

  // Related-to traversal: handled via a sub-clause
  let relatedClause = '';
  if (q.relatedTo?.targetId) {
    params.relTargetId = q.relatedTo.targetId;
    const relType = q.relatedTo.relType ? `[:${sanitizeRelType(q.relatedTo.relType)}]` : '';
    const dir = q.relatedTo.direction ?? 'both';
    if (dir === 'outgoing') {
      relatedClause = `MATCH (n)-${relType}->(target) WHERE target.id = $relTargetId WITH n`;
    } else if (dir === 'incoming') {
      relatedClause = `MATCH (n)<-${relType}-(target) WHERE target.id = $relTargetId WITH n`;
    } else {
      relatedClause = `MATCH (n)-${relType}-(target) WHERE target.id = $relTargetId WITH n`;
    }
  }

  // Pagination — floor to integers: Neo4j rejects floats in SKIP/LIMIT
  const limit = Math.max(1, Math.floor(Math.min(q.limit ?? 50, 500)) || 50);
  const skip = Math.max(0, Math.floor(q.skip ?? 0) || 0);
  params.limit = limit;
  params.skip = skip;

  // Order by — field name cannot be parameterized, sanitize before interpolation
  const orderField = sanitizeIdentifier(q.orderBy ?? 'created_at') || 'created_at';
  const orderDir = q.sortDir === 'asc' ? 'ASC' : 'DESC';

  // Assemble
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const cypher = [
    `MATCH (n${matchLabel})`,
    whereClause,
    relatedClause,
    `RETURN n ORDER BY n.${orderField} ${orderDir}`,
    `SKIP $skip LIMIT $limit`,
  ].filter(Boolean).join('\n');

  return { cypher, params };
}

function sanitizeRelType(t: string): string {
  return t.replace(/[^A-Z0-9_]/gi, '_').toUpperCase();
}

/** Strip anything that is not a valid Neo4j label character. */
function sanitizeLabel(l: string): string {
  return String(l).replace(/[^A-Za-z0-9_]/g, '_');
}

/** Strip anything that is not a valid property identifier character. */
function sanitizeIdentifier(f: string): string {
  return String(f).replace(/[^A-Za-z0-9_]/g, '');
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

export function registerQueryRoutes(app: Express, lightrag: LightRAGClient): void {

  /** POST /api/graph/query — execute a GraphQuery JSON body */
  app.post('/api/graph/query', async (req: Request, res: Response): Promise<void> => {
    try {
      const query = req.body as GraphQuery;
      if (typeof query !== 'object' || Array.isArray(query)) {
        res.status(400).json({ success: false, error: 'Body must be a GraphQuery object' }); return;
      }
      // Sanitise limit
      if (query.limit !== undefined) query.limit = Math.min(query.limit, 500);
      const result = await executeGraphQuery(lightrag, query);
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /** GET /api/graph/query/builder — describe supported query fields */
  app.get('/api/graph/query/builder', (_req: Request, res: Response): void => {
    res.json({
      fields: {
        types: 'string[] — node type filter (decision, risk, precedent, context, fact)',
        labels: 'string[] — Neo4j label filter',
        createdBy: 'string — filter by creator agent',
        since: 'ISO string — created_at >= since',
        until: 'ISO string — created_at <= until',
        affectsAny: 'string[] — at least one affect tag matches',
        affectsAll: 'string[] — all affect tags must match',
        contentContains: 'string — substring match on content',
        ids: 'string[] — exact id list',
        relatedTo: '{ targetId, relType?, direction? } — traversal filter',
        validationState: 'pending | confirmed | contested | rejected',
        impactLevel: 'low | medium | high | critical',
        orderBy: 'created_at | updated_at | content | id',
        sortDir: 'asc | desc',
        limit: 'number (max 500, default 50)',
        skip: 'number (default 0)',
        includeEdges: 'boolean — include edges between returned nodes',
      },
      example: {
        types: ['decision'],
        createdBy: 'kai',
        since: '2026-01-01T00:00:00Z',
        affectsAny: ['kafka', 'distributed'],
        orderBy: 'created_at',
        sortDir: 'desc',
        limit: 10,
        includeEdges: true,
      },
    });
  });

  logger.info('✓ Graph Query API registered (/api/graph/query)');
}

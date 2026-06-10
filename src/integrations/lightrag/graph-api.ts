/**
 * Knowledge Graph REST API
 *
 * Full typed CRUD surface for every node and relationship type in the P2P
 * knowledge graph. Mounts on /api/graph/* via registerGraphRoutes(app, lightrag).
 *
 * Node endpoints:
 *   GET    /api/graph/nodes              - list/search nodes (full-text, type filter, pagination)
 *   GET    /api/graph/nodes/:id          - get single node with its relationships
 *   POST   /api/graph/nodes              - create a typed node
 *   PATCH  /api/graph/nodes/:id          - update node properties
 *   DELETE /api/graph/nodes/:id          - soft-delete (sets status=archived)
 *
 * Relationship endpoints:
 *   GET    /api/graph/edges              - list edges (from, to, type filters)
 *   POST   /api/graph/edges              - create a relationship
 *   DELETE /api/graph/edges/:fromId/:type/:toId - remove a specific edge
 *
 * Traversal endpoints:
 *   GET    /api/graph/neighbors/:id      - adjacent nodes (depth, relType filter)
 *   GET    /api/graph/path/:fromId/:toId - shortest path between two nodes
 *   GET    /api/graph/subgraph           - ego-graph around a seed node
 *
 * Visualization endpoint:
 *   GET    /api/graph/visualize          - vis.js / D3 compatible {nodes, edges} payload
 *
 * Export endpoint:
 *   GET    /api/graph/export             - full graph as JSON-LD
 *
 * Stats endpoint:
 *   GET    /api/graph/stats              - node/edge counts by label
 */

import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import {
  findSimilar,
  detectDuplicates,
  suggestEdges,
  clusterNodes,
  rankAgents,
  MLNode,
} from './graph-ml';
import logger from '../../utils/logger';

// ── Helpers ────────────────────────────────────────────────────────────────────

function neo4jSession(lightrag: LightRAGClient): any {
  return (lightrag as any).driver.session();
}

function toObj(record: any, key: string): any {
  const node = record.get(key);
  if (!node) return null;
  const props: Record<string, any> = {};
  for (const [k, v] of Object.entries<any>(node.properties)) {
    // Flatten Neo4j integers
    props[k] = v && typeof v === 'object' && 'low' in v ? v.low : v;
  }
  return {
    id: props.id ?? node.identity.toString(),
    labels: node.labels,
    ...props,
  };
}

function parseLimit(query: any, def = 50, max = 500): number {
  const n = parseInt(query.limit ?? String(def), 10);
  return Math.max(1, Math.min(isNaN(n) ? def : n, max));
}

function parseSkip(query: any): number {
  const n = parseInt(query.skip ?? '0', 10);
  return Math.max(0, isNaN(n) ? 0 : n);
}

// ── Main registration function ─────────────────────────────────────────────────

export function registerGraphRoutes(app: Express, lightrag: LightRAGClient): void {

  // ── GET /api/graph/stats ──────────────────────────────────────────────────
  app.get('/api/graph/stats', async (_req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.json({ success: true, offline: true, stats: {} }); return; }
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run(`
        MATCH (n)
        UNWIND labels(n) AS lbl
        RETURN lbl AS label, count(*) AS count
        ORDER BY count DESC
      `);
      const stats: Record<string, number> = {};
      for (const r of result.records) {
        const lbl = r.get('label');
        const cnt = r.get('count');
        stats[lbl] = cnt && typeof cnt === 'object' && 'low' in cnt ? cnt.low : cnt;
      }
      const edgeResult = await session.run('MATCH ()-[r]->() RETURN count(r) AS total');
      const totalEdges = edgeResult.records[0]?.get('total')?.low ?? 0;
      res.json({ success: true, nodesByLabel: stats, totalNodes: Object.values(stats).reduce((a, b) => a + b, 0), totalEdges });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── GET /api/graph/nodes ──────────────────────────────────────────────────
  app.get('/api/graph/nodes', async (req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.json({ success: true, nodes: [], total: 0 }); return; }
    const { q, type, agent } = req.query;
    const limit = parseLimit(req.query);
    const skip = parseSkip(req.query);
    const session = neo4jSession(lightrag);
    try {
      const where: string[] = [];
      const params: Record<string, any> = { limit, skip };

      if (type) { where.push('$type IN labels(n)'); params.type = String(type); }
      if (agent) { where.push('n.created_by = $agent'); params.agent = String(agent); }

      let cypher: string;
      if (q) {
        // Try full-text first
        try {
          const ft = await session.run(
            `CALL db.index.fulltext.queryNodes('node_search', $q) YIELD node AS n, score
             ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
             RETURN n, score ORDER BY score DESC SKIP $skip LIMIT $limit`,
            { ...params, q: String(q) }
          );
          const nodes = ft.records.map((r: any) => toObj(r, 'n'));
          res.json({ success: true, nodes, total: nodes.length, query: q }); return;
        } catch {
          where.push('(n.content CONTAINS $q OR n.description CONTAINS $q)');
          params.q = String(q);
        }
      }

      cypher = `MATCH (n) ${where.length ? 'WHERE ' + where.join(' AND ') : ''} RETURN n SKIP $skip LIMIT $limit`;
      const result = await session.run(cypher, params);
      const nodes = result.records.map((r: any) => toObj(r, 'n'));
      res.json({ success: true, nodes, total: nodes.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── GET /api/graph/nodes/:id ──────────────────────────────────────────────
  app.get('/api/graph/nodes/:id', async (req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.status(503).json({ success: false, error: 'graph offline' }); return; }
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run(`
        MATCH (n {id: $id})
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n,
               collect(DISTINCT {type: type(r), targetId: m.id, targetLabel: labels(m)[0], props: properties(r)}) AS outEdges
      `, { id: req.params.id });
      if (result.records.length === 0) { res.status(404).json({ success: false, error: 'not found' }); return; }
      const node = toObj(result.records[0], 'n');
      const outEdges = result.records[0].get('outEdges') ?? [];
      res.json({ success: true, node, outEdges });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── POST /api/graph/nodes ─────────────────────────────────────────────────
  app.post('/api/graph/nodes', async (req: Request, res: Response) => {
    const { label, id, ...props } = req.body;
    if (!label) { res.status(400).json({ success: false, error: 'label required' }); return; }
    if (!props.content && !props.description) {
      res.status(400).json({ success: false, error: 'content or description required' }); return;
    }
    try {
      const { v4: uuid } = await import('uuid');
      const nodeId = id ?? `node_${uuid()}`;
      await lightrag.mergeTypedNode(nodeId, label, { id: nodeId, ...props, created_at: new Date().toISOString() });
      res.status(201).json({ success: true, id: nodeId });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ── PATCH /api/graph/nodes/:id ────────────────────────────────────────────
  app.patch('/api/graph/nodes/:id', async (req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.status(503).json({ success: false, error: 'graph offline' }); return; }
    const session = neo4jSession(lightrag);
    try {
      // Determine label from existing node
      const labelResult = await session.run('MATCH (n {id: $id}) RETURN labels(n)[0] AS lbl', { id: req.params.id });
      if (labelResult.records.length === 0) { res.status(404).json({ success: false, error: 'not found' }); return; }
      const label = labelResult.records[0].get('lbl') ?? 'Node';
      await lightrag.mergeTypedNode(req.params.id, label, { ...req.body, updated_at: new Date().toISOString() });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── DELETE /api/graph/nodes/:id (soft delete) ─────────────────────────────
  app.delete('/api/graph/nodes/:id', async (req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.status(503).json({ success: false, error: 'graph offline' }); return; }
    const session = neo4jSession(lightrag);
    try {
      await session.run(`MATCH (n {id: $id}) SET n.status = 'archived', n.archived_at = datetime()`, { id: req.params.id });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── GET /api/graph/edges ──────────────────────────────────────────────────
  app.get('/api/graph/edges', async (req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.json({ success: true, edges: [] }); return; }
    const limit = parseLimit(req.query, 100);
    const session = neo4jSession(lightrag);
    try {
      const where: string[] = [];
      const params: Record<string, any> = { limit };
      if (req.query.from) { where.push('a.id = $from'); params.from = String(req.query.from); }
      if (req.query.to)   { where.push('b.id = $to');   params.to   = String(req.query.to); }
      if (req.query.type) { where.push('type(r) = $rtype'); params.rtype = String(req.query.type); }
      const result = await session.run(
        `MATCH (a)-[r]->(b) ${where.length ? 'WHERE ' + where.join(' AND ') : ''} RETURN a.id AS from, type(r) AS type, b.id AS to, properties(r) AS props LIMIT $limit`,
        params
      );
      const edges = result.records.map((rec: any) => ({
        from: rec.get('from'),
        type: rec.get('type'),
        to: rec.get('to'),
        props: rec.get('props'),
      }));
      res.json({ success: true, edges });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── POST /api/graph/edges ─────────────────────────────────────────────────
  app.post('/api/graph/edges', async (req: Request, res: Response) => {
    const { fromId, relType, toId, props } = req.body;
    if (!fromId || !relType || !toId) {
      res.status(400).json({ success: false, error: 'fromId, relType, toId required' }); return;
    }
    try {
      await lightrag.addEdge(fromId, relType, toId, props);
      res.status(201).json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ── DELETE /api/graph/edges/:fromId/:type/:toId ───────────────────────────
  app.delete('/api/graph/edges/:fromId/:type/:toId', async (req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.status(503).json({ success: false, error: 'graph offline' }); return; }
    const { fromId, type, toId } = req.params;
    const safeType = type.replace(/[^A-Z_]/g, '_');
    const session = neo4jSession(lightrag);
    try {
      await session.run(
        `MATCH (a {id: $from})-[r:\`${safeType}\`]->(b {id: $to}) DELETE r`,
        { from: fromId, to: toId }
      );
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── GET /api/graph/neighbors/:id ──────────────────────────────────────────
  app.get('/api/graph/neighbors/:id', async (req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.json({ success: true, neighbors: [] }); return; }
    const depth = Math.min(parseInt(String(req.query.depth ?? '1'), 10), 4);
    const session = neo4jSession(lightrag);
    try {
      const relFilter = req.query.relType ? `[r:${String(req.query.relType).replace(/[^A-Z_]/g, '_')}*1..${depth}]` : `[r*1..${depth}]`;
      const result = await session.run(
        `MATCH (n {id: $id})-${relFilter}-(m) RETURN DISTINCT m LIMIT 100`,
        { id: req.params.id }
      );
      const neighbors = result.records.map((r: any) => toObj(r, 'm'));
      res.json({ success: true, neighbors, depth });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── GET /api/graph/path/:fromId/:toId ─────────────────────────────────────
  app.get('/api/graph/path/:fromId/:toId', async (req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.json({ success: true, path: null }); return; }
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run(
        `MATCH p = shortestPath((a {id: $from})-[*..10]-(b {id: $to})) RETURN p LIMIT 1`,
        { from: req.params.fromId, to: req.params.toId }
      );
      if (result.records.length === 0) { res.json({ success: true, path: null, found: false }); return; }
      const path = result.records[0].get('p');
      const nodeIds = path.segments.map((s: any) => s.start.properties.id).concat([path.end.properties.id]);
      const rels = path.segments.map((s: any) => ({ type: s.relationship.type, from: s.start.properties.id, to: s.end.properties.id }));
      res.json({ success: true, found: true, nodeIds, rels, length: path.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── GET /api/graph/visualize ──────────────────────────────────────────────
  app.get('/api/graph/visualize', async (req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.json({ success: true, nodes: [], edges: [], offline: true }); return; }
    const limit = parseLimit(req.query, 200, 1000);
    const session = neo4jSession(lightrag);
    try {
      // Fetch nodes
      const nResult = await session.run(
        `MATCH (n) WHERE NOT n.status = 'archived' RETURN n LIMIT $limit`,
        { limit }
      );
      const nodes = nResult.records.map((r: any) => {
        const obj = toObj(r, 'n');
        return {
          id: obj.id,
          label: (obj.labels?.[0] ?? 'Node'),
          title: (obj.content ?? obj.description ?? obj.name ?? obj.id ?? '').substring(0, 80),
          group: obj.labels?.[0] ?? 'Node',
          color: labelColor(obj.labels?.[0] ?? 'Node'),
        };
      });

      // Fetch edges between the returned nodes
      const ids = nodes.map((n: any) => n.id);
      const eResult = await session.run(
        `MATCH (a)-[r]->(b) WHERE a.id IN $ids AND b.id IN $ids RETURN a.id AS from, type(r) AS type, b.id AS to LIMIT 2000`,
        { ids }
      );
      const edges = eResult.records.map((r: any) => ({
        from: r.get('from'),
        to: r.get('to'),
        label: r.get('type'),
        arrows: 'to',
      }));

      res.json({ success: true, nodes, edges, nodeCount: nodes.length, edgeCount: edges.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── GET /api/graph/export ─────────────────────────────────────────────────
  app.get('/api/graph/export', async (req: Request, res: Response) => {
    if (!lightrag.isConnected()) { res.json({ success: true, graph: { nodes: [], edges: [] } }); return; }
    const session = neo4jSession(lightrag);
    try {
      const nResult = await session.run('MATCH (n) RETURN n LIMIT 5000');
      const eResult = await session.run('MATCH (a)-[r]->(b) RETURN a.id AS from, type(r) AS type, b.id AS to, properties(r) AS props LIMIT 10000');
      const graphNodes = nResult.records.map((r: any) => toObj(r, 'n'));
      const graphEdges = eResult.records.map((r: any) => ({
        from: r.get('from'), type: r.get('type'), to: r.get('to'), props: r.get('props'),
      }));
      res.setHeader('Content-Disposition', 'attachment; filename="knowledge-graph.json"');
      res.json({
        '@context': 'https://schema.org/',
        exportedAt: new Date().toISOString(),
        graph: { nodes: graphNodes, edges: graphEdges },
        nodeCount: graphNodes.length,
        edgeCount: graphEdges.length,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  // ── ML endpoints ─────────────────────────────────────────────────────────────

  /** Load up to `limit` nodes from Neo4j as MLNode objects for ML operations. */
  async function loadMLNodes(limit = 500): Promise<MLNode[]> {
    if (!lightrag.isConnected()) return [];
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run(
        'MATCH (n) WHERE n.content IS NOT NULL RETURN n LIMIT $limit',
        { limit },
      );
      return result.records.map((rec: any) => {
        const node = toObj(rec, 'n');
        return {
          id: node.id,
          type: node.type ?? (node.labels?.[0] ?? 'Node').toLowerCase(),
          content: node.content ?? '',
          created_by: node.created_by,
          affects: node.affects ?? [],
        } as MLNode;
      });
    } finally {
      await session.close();
    }
  }

  /** GET /api/graph/ml/similar/:id — top-K most similar nodes */
  app.get('/api/graph/ml/similar/:id', async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const topK = Math.min(parseInt(String(req.query.k ?? '10'), 10), 50);
    if (!lightrag.isConnected()) {
      res.json({ id, similar: [], offline: true }); return;
    }
    try {
      const nodes = await loadMLNodes();
      const target = nodes.find(n => n.id === id);
      if (!target) { res.status(404).json({ success: false, error: 'Node not found' }); return; }
      const similar = findSimilar(target, nodes, topK);
      res.json({ id, similar, count: similar.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /** GET /api/graph/ml/duplicates — near-duplicate node pairs */
  app.get('/api/graph/ml/duplicates', async (req: Request, res: Response): Promise<void> => {
    const threshold = parseFloat(String(req.query.threshold ?? '0.8'));
    if (!lightrag.isConnected()) {
      res.json({ duplicates: [], offline: true }); return;
    }
    try {
      const nodes = await loadMLNodes();
      const duplicates = detectDuplicates(nodes, threshold);
      res.json({ duplicates, count: duplicates.length, threshold });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /** GET /api/graph/ml/suggest-edges — ML-suggested new relationships */
  app.get('/api/graph/ml/suggest-edges', async (req: Request, res: Response): Promise<void> => {
    const minScore = parseFloat(String(req.query.minScore ?? '0.4'));
    if (!lightrag.isConnected()) {
      res.json({ suggestions: [], offline: true }); return;
    }
    try {
      const nodes = await loadMLNodes(200);
      const suggestions = suggestEdges(nodes, minScore).slice(0, 50);
      res.json({ suggestions, count: suggestions.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /** GET /api/graph/ml/clusters — k-means topic clusters */
  app.get('/api/graph/ml/clusters', async (req: Request, res: Response): Promise<void> => {
    const k = Math.min(parseInt(String(req.query.k ?? '6'), 10), 20);
    if (!lightrag.isConnected()) {
      res.json({ clusters: [], offline: true }); return;
    }
    try {
      const nodes = await loadMLNodes();
      const clusters = clusterNodes(nodes, k);
      res.json({
        clusters: clusters.map(c => ({
          id: c.id,
          size: c.nodes.length,
          topTerms: c.topTerms,
          nodeIds: c.nodes,
        })),
        k,
        totalNodes: nodes.length,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /** GET /api/graph/ml/reputation — agent reputation rankings from fact-vote history */
  app.get('/api/graph/ml/reputation', async (req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) {
      res.json({ agents: [], offline: true }); return;
    }
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run(`
        MATCH (fv:FactVote)
        RETURN fv.voter AS voter, fv.vote AS vote,
               fv.factId AS factId, fv.factFinalState AS factFinalState,
               fv.submittedBy AS submittedBy
        LIMIT 5000
      `);
      const history = result.records.map((r: any) => ({
        factId: r.get('factId'),
        voter: r.get('voter'),
        vote: r.get('vote'),
        factFinalState: r.get('factFinalState'),
        submittedBy: r.get('submittedBy'),
      }));
      const agents = rankAgents(history);
      res.json({ agents, count: agents.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    } finally {
      await session.close();
    }
  });

  logger.info('✓ Graph REST API registered (/api/graph/*)');
}

// ── Color palette for vis.js visualization ────────────────────────────────────

function labelColor(label: string): string {
  const palette: Record<string, string> = {
    Decision:         '#4A90D9',
    Risk:             '#E74C3C',
    Precedent:        '#27AE60',
    Context:          '#9B59B6',
    Fact:             '#F39C12',
    FactVote:         '#E67E22',
    QuantumCircuit:   '#1ABC9C',
    QuantumAlgorithm: '#16A085',
    Qubit:            '#2ECC71',
    QuantumGate:      '#3498DB',
    EntanglementPair: '#8E44AD',
    QuantumResource:  '#C0392B',
    Asset:            '#7F8C8D',
    governance:       '#BDC3C7',
    wiki:             '#95A5A6',
    Node:             '#BDC3C7',
  };
  return palette[label] ?? '#BDC3C7';
}

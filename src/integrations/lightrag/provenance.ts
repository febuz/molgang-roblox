/**
 * Knowledge Provenance Tracker
 *
 * Records the full lineage chain for every derived fact in the P2P graph,
 * answering the question "how did we reach this conclusion?"
 *
 * Provenance types:
 *   - 'agent'     — directly asserted by a human agent
 *   - 'inference' — derived by an inference rule (R1-R6)
 *   - 'p2p'       — received from a remote peer via Kafka or gossip
 *   - 'validated' — originally 'agent' but confirmed by quorum (3+ validators)
 *   - 'promoted'  — a confirmed Fact promoted to a domain node by R5
 *
 * Each provenance record links:
 *   - the target node id
 *   - the source(s) that caused it
 *   - the rule or agent that created the edge
 *   - a timestamp
 *
 * REST:
 *   GET /api/graph/provenance/:nodeId         — full lineage chain for a node
 *   GET /api/graph/provenance/:nodeId/summary — depth + source types
 *   POST /api/graph/provenance/record         — manually record a provenance entry
 */

import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export type ProvenanceType = 'agent' | 'inference' | 'p2p' | 'validated' | 'promoted';

export interface ProvenanceRecord {
  id: string;
  nodeId: string;
  type: ProvenanceType;
  sourceNodeIds: string[];
  agent?: string;
  rule?: string;
  peer?: string;
  ts: string;
  note?: string;
}

export interface ProvenanceChain {
  nodeId: string;
  depth: number;
  records: ProvenanceRecord[];
  sourceTypes: Record<ProvenanceType, number>;
}

// ──────────────────────────────────────────────────────────────────────────────
// In-memory store (backed by Neo4j when connected)
// ──────────────────────────────────────────────────────────────────────────────

const provenanceStore = new Map<string, ProvenanceRecord[]>();

export function recordProvenance(record: Omit<ProvenanceRecord, 'id' | 'ts'> & { ts?: string }): ProvenanceRecord {
  const full: ProvenanceRecord = {
    id: uuid(),
    ts: new Date().toISOString(),
    ...record,
  };
  const existing = provenanceStore.get(full.nodeId) ?? [];
  existing.push(full);
  provenanceStore.set(full.nodeId, existing);
  return full;
}

export function getProvenance(nodeId: string): ProvenanceRecord[] {
  return provenanceStore.get(nodeId) ?? [];
}

/**
 * Walk the provenance chain recursively up to maxDepth levels.
 * Returns all ProvenanceRecords that contributed to the given node.
 */
export function buildProvenanceChain(
  nodeId: string,
  maxDepth = 5,
  visited = new Set<string>(),
): ProvenanceChain {
  const records: ProvenanceRecord[] = [];
  const queue: Array<{ id: string; d: number }> = [{ id: nodeId, d: 0 }];
  let deepest = 0;

  while (queue.length > 0) {
    const { id, d } = queue.shift()!;
    if (visited.has(id) || d > maxDepth) continue;
    visited.add(id);

    const nodeRecords = getProvenance(id);
    if (nodeRecords.length > 0) deepest = Math.max(deepest, d);
    records.push(...nodeRecords);

    // Walk up to source nodes
    for (const rec of nodeRecords) {
      for (const srcId of rec.sourceNodeIds) {
        if (!visited.has(srcId)) {
          queue.push({ id: srcId, d: d + 1 });
        }
      }
    }
  }

  const sourceTypes: Record<ProvenanceType, number> = {
    agent: 0, inference: 0, p2p: 0, validated: 0, promoted: 0,
  };
  for (const r of records) {
    sourceTypes[r.type] = (sourceTypes[r.type] ?? 0) + 1;
  }

  return { nodeId, depth: deepest, records, sourceTypes };
}

/**
 * Persist a provenance record to Neo4j as a ProvenanceRecord node.
 * Gracefully no-ops when offline.
 */
export async function persistProvenance(
  lightrag: LightRAGClient,
  record: ProvenanceRecord,
): Promise<void> {
  if (!lightrag.isConnected()) return;
  try {
    await lightrag.mergeTypedNode(record.id, 'ProvenanceRecord', {
      nodeId: record.nodeId,
      type: record.type,
      sourceNodeIds: record.sourceNodeIds,
      agent: record.agent ?? null,
      rule: record.rule ?? null,
      peer: record.peer ?? null,
      ts: record.ts,
      note: record.note ?? null,
    });
    // Link to the target node
    await lightrag.addEdge(record.id, 'PROVENANCE_OF', record.nodeId, { type: record.type });
    // Link to each source
    for (const srcId of record.sourceNodeIds) {
      await lightrag.addEdge(srcId, 'SOURCE_OF', record.id, { rule: record.rule ?? null });
    }
  } catch (e: any) {
    logger.warn(`provenance persist failed for ${record.id}: ${e.message}`);
  }
}

/**
 * Load provenance records from Neo4j for a node and populate in-memory store.
 * Used for bootstrapping after snapshot restore.
 */
export async function loadProvenance(lightrag: LightRAGClient, nodeId: string): Promise<ProvenanceRecord[]> {
  if (!lightrag.isConnected()) return [];
  const driver = (lightrag as any).driver;
  const session = driver.session();
  try {
    const res = await session.run(`
      MATCH (pr:ProvenanceRecord)-[:PROVENANCE_OF]->(n)
      WHERE n.id = $nodeId
      RETURN pr ORDER BY pr.ts ASC
    `, { nodeId });

    const records: ProvenanceRecord[] = res.records.map((rec: any) => {
      const p = rec.get('pr').properties;
      return {
        id: p.id,
        nodeId: p.nodeId,
        type: p.type as ProvenanceType,
        sourceNodeIds: p.sourceNodeIds ?? [],
        agent: p.agent ?? undefined,
        rule: p.rule ?? undefined,
        peer: p.peer ?? undefined,
        ts: p.ts,
        note: p.note ?? undefined,
      };
    });

    // Populate in-memory store
    provenanceStore.set(nodeId, records);
    return records;
  } finally {
    await session.close();
  }
}

/** Clear the in-memory store (for testing). */
export function clearProvenanceStore(): void {
  provenanceStore.clear();
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

export function registerProvenanceRoutes(app: Express, lightrag: LightRAGClient): void {

  /** GET /api/graph/provenance/:nodeId — full lineage chain */
  app.get('/api/graph/provenance/:nodeId', async (req: Request, res: Response): Promise<void> => {
    const { nodeId } = req.params;
    const maxDepth = Math.min(parseInt(String(req.query.depth ?? '5'), 10), 10);

    // Try to load from Neo4j first (populates in-memory store)
    await loadProvenance(lightrag, nodeId).catch(() => {});

    const chain = buildProvenanceChain(nodeId, maxDepth);
    res.json({ success: true, provenance: chain });
  });

  /** GET /api/graph/provenance/:nodeId/summary — compact lineage summary */
  app.get('/api/graph/provenance/:nodeId/summary', async (req: Request, res: Response): Promise<void> => {
    const { nodeId } = req.params;
    await loadProvenance(lightrag, nodeId).catch(() => {});
    const chain = buildProvenanceChain(nodeId, 3);
    const summary = {
      nodeId,
      totalRecords: chain.records.length,
      sourceTypes: chain.sourceTypes,
      directSource: chain.records[0]?.type ?? 'unknown',
      firstSeen: chain.records.reduce<string | null>((min, r) => (!min || r.ts < min) ? r.ts : min, null),
    };
    res.json({ success: true, summary });
  });

  /** POST /api/graph/provenance/record — manually record a provenance entry */
  app.post('/api/graph/provenance/record', async (req: Request, res: Response): Promise<void> => {
    const { nodeId, type, sourceNodeIds, agent, rule, peer, note } = req.body ?? {};
    if (!nodeId || !type) {
      res.status(400).json({ success: false, error: 'nodeId and type are required' }); return;
    }
    const validTypes: ProvenanceType[] = ['agent', 'inference', 'p2p', 'validated', 'promoted'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ success: false, error: `type must be one of: ${validTypes.join(', ')}` }); return;
    }
    const record = recordProvenance({
      nodeId,
      type,
      sourceNodeIds: Array.isArray(sourceNodeIds) ? sourceNodeIds : [],
      agent, rule, peer, note,
    });
    await persistProvenance(lightrag, record).catch(() => {});
    res.status(201).json({ success: true, record });
  });

  logger.info('✓ Knowledge Provenance API registered (/api/graph/provenance)');
}

/**
 * Graph Snapshot — Checkpoint and Restore for P2P Bootstrap
 *
 * When a new node joins the P2P cluster it needs to bootstrap its local
 * Neo4j from an existing peer's state rather than waiting for Kafka
 * replay (which may be limited by retention). This module provides:
 *
 *   - takeSnapshot(lightrag)      — dump the full graph to a SnapshotData object
 *   - restoreSnapshot(lightrag, s) — replay a snapshot into a fresh Neo4j via MERGE
 *   - serializeSnapshot(s)        — compress to a Buffer (JSON + gzip)
 *   - deserializeSnapshot(buf)    — decompress back to SnapshotData
 *
 * REST routes (registered via registerSnapshotRoutes):
 *   GET  /api/graph/snapshot         — download the full graph as gzipped JSON
 *   POST /api/graph/snapshot/restore  — upload and restore a snapshot
 *   GET  /api/graph/snapshot/status   — snapshot metadata (node count, taken_at)
 *
 * Design:
 *   - Snapshot is always idempotent to restore (uses MERGE on id).
 *   - Large graphs are streamed in pages of 1000 nodes.
 *   - Snapshots are signed with a SHA-256 checksum for integrity.
 *   - Offline-safe: all endpoints return { offline: true } when Neo4j is down.
 */

import { createHash } from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface SnapshotNode {
  id: string;
  labels: string[];
  props: Record<string, unknown>;
}

export interface SnapshotEdge {
  fromId: string;
  relType: string;
  toId: string;
  props: Record<string, unknown>;
}

export interface SnapshotData {
  version: '1';
  takenAt: string;
  nodeCount: number;
  edgeCount: number;
  checksum: string;
  nodes: SnapshotNode[];
  edges: SnapshotEdge[];
}

export interface SnapshotStatus {
  nodeCount: number;
  edgeCount: number;
  takenAt: string | null;
  checksum: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Core functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Dump the full graph to a SnapshotData structure.
 * Nodes are fetched in pages of 1000 to avoid memory pressure.
 */
export async function takeSnapshot(lightrag: LightRAGClient): Promise<SnapshotData> {
  if (!lightrag.isConnected()) {
    throw new Error('Cannot take snapshot: LightRAG is offline');
  }

  const driver = (lightrag as any).driver;
  const session = driver.session();
  const nodes: SnapshotNode[] = [];
  const edges: SnapshotEdge[] = [];

  try {
    // Paginate nodes
    let skip = 0;
    const PAGE = 1000;
    while (true) {
      const res = await session.run(
        'MATCH (n) WHERE n.id IS NOT NULL RETURN n SKIP $skip LIMIT $limit',
        { skip, limit: PAGE },
      );
      if (res.records.length === 0) break;
      for (const rec of res.records) {
        const node = rec.get('n');
        const props: Record<string, unknown> = {};
        for (const [k, v] of Object.entries<any>(node.properties)) {
          props[k] = v && typeof v === 'object' && 'low' in v ? v.low : v;
        }
        nodes.push({ id: String(props.id ?? node.identity.toString()), labels: node.labels, props });
      }
      skip += PAGE;
      if (res.records.length < PAGE) break;
    }

    // Fetch all edges
    const edgeRes = await session.run(`
      MATCH (a)-[r]->(b)
      WHERE a.id IS NOT NULL AND b.id IS NOT NULL
      RETURN a.id AS fromId, type(r) AS relType, b.id AS toId, properties(r) AS props
      LIMIT 50000
    `);
    for (const rec of edgeRes.records) {
      const rawProps = rec.get('props') as Record<string, any>;
      const props: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rawProps)) {
        props[k] = v && typeof v === 'object' && 'low' in v ? v.low : v;
      }
      edges.push({
        fromId: rec.get('fromId'),
        relType: rec.get('relType'),
        toId: rec.get('toId'),
        props,
      });
    }
  } finally {
    await session.close();
  }

  const takenAt = new Date().toISOString();
  const payload = JSON.stringify({ nodes, edges });
  const checksum = createHash('sha256').update(payload).digest('hex');

  return {
    version: '1',
    takenAt,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    checksum,
    nodes,
    edges,
  };
}

/**
 * Replay a snapshot into the local graph via idempotent MERGE.
 * Returns the number of nodes and edges written.
 */
export async function restoreSnapshot(
  lightrag: LightRAGClient,
  snapshot: SnapshotData,
): Promise<{ nodesWritten: number; edgesWritten: number }> {
  if (!lightrag.isConnected()) {
    throw new Error('Cannot restore snapshot: LightRAG is offline');
  }

  // Verify checksum
  const payload = JSON.stringify({ nodes: snapshot.nodes, edges: snapshot.edges });
  const checksum = createHash('sha256').update(payload).digest('hex');
  if (checksum !== snapshot.checksum) {
    throw new Error(`Snapshot checksum mismatch: expected ${snapshot.checksum}, got ${checksum}`);
  }

  let nodesWritten = 0;
  let edgesWritten = 0;

  for (const node of snapshot.nodes) {
    const label = node.labels[0] ?? 'Node';
    try {
      await lightrag.mergeTypedNode(node.id, label, node.props);
      nodesWritten++;
    } catch (e: any) {
      logger.warn(`restoreSnapshot: failed to merge node ${node.id}: ${e.message}`);
    }
  }

  for (const edge of snapshot.edges) {
    try {
      await lightrag.addEdge(edge.fromId, edge.relType, edge.toId, edge.props as Record<string, any>);
      edgesWritten++;
    } catch (e: any) {
      logger.warn(`restoreSnapshot: failed to add edge ${edge.fromId}->${edge.toId}: ${e.message}`);
    }
  }

  logger.info(`restoreSnapshot: wrote ${nodesWritten} nodes + ${edgesWritten} edges`);
  return { nodesWritten, edgesWritten };
}

/**
 * Gzip-compress a SnapshotData to a Buffer for HTTP transfer or file storage.
 */
export function serializeSnapshot(snapshot: SnapshotData): Buffer {
  return gzipSync(Buffer.from(JSON.stringify(snapshot), 'utf-8'));
}

/**
 * Decompress a Buffer produced by serializeSnapshot back to SnapshotData.
 */
export function deserializeSnapshot(buf: Buffer): SnapshotData {
  const raw = gunzipSync(buf).toString('utf-8');
  const data = JSON.parse(raw) as SnapshotData;
  if (data.version !== '1') throw new Error(`Unknown snapshot version: ${data.version}`);
  return data;
}

/**
 * Compute basic status from a snapshot without Neo4j access.
 */
export function snapshotStatus(snapshot: SnapshotData | null): SnapshotStatus {
  if (!snapshot) return { nodeCount: 0, edgeCount: 0, takenAt: null, checksum: null };
  return {
    nodeCount: snapshot.nodeCount,
    edgeCount: snapshot.edgeCount,
    takenAt: snapshot.takenAt,
    checksum: snapshot.checksum,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

let _cachedSnapshot: SnapshotData | null = null;

export function registerSnapshotRoutes(app: Express, lightrag: LightRAGClient): void {

  /** GET /api/graph/snapshot — download the full graph as gzipped JSON */
  app.get('/api/graph/snapshot', async (_req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) {
      res.json({ offline: true, nodeCount: 0, edgeCount: 0 }); return;
    }
    try {
      const snapshot = await takeSnapshot(lightrag);
      _cachedSnapshot = snapshot;
      const buf = serializeSnapshot(snapshot);
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', 'attachment; filename="graph-snapshot.json.gz"');
      res.setHeader('X-Snapshot-Checksum', snapshot.checksum);
      res.setHeader('X-Snapshot-Nodes', String(snapshot.nodeCount));
      res.setHeader('X-Snapshot-Edges', String(snapshot.edgeCount));
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /** POST /api/graph/snapshot/restore — upload and restore a snapshot */
  app.post('/api/graph/snapshot/restore', async (req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) {
      res.status(503).json({ success: false, error: 'Offline' }); return;
    }
    try {
      let snapshot: SnapshotData;
      // Accept either raw gzip buffer or plain JSON body
      const body = req.body;
      if (Buffer.isBuffer(body) || (body instanceof Uint8Array)) {
        snapshot = deserializeSnapshot(Buffer.from(body));
      } else if (body && typeof body === 'object' && body.version) {
        snapshot = body as SnapshotData;
      } else {
        res.status(400).json({ success: false, error: 'Expected snapshot JSON or gzip body' }); return;
      }
      const result = await restoreSnapshot(lightrag, snapshot);
      _cachedSnapshot = snapshot;
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  /** GET /api/graph/snapshot/status — snapshot metadata */
  app.get('/api/graph/snapshot/status', (_req: Request, res: Response): void => {
    res.json({
      offline: !lightrag.isConnected(),
      ...snapshotStatus(_cachedSnapshot),
    });
  });

  logger.info('✓ Graph Snapshot API registered (/api/graph/snapshot)');
}

/**
 * Deterministic Graph State Root
 *
 * Computes a Merkle root over all nodes in the knowledge graph.
 * The root is deterministic: same graph state → same root hash.
 *
 * Algorithm (sha256-merkle-v1):
 *   1. Fetch all nodes from Neo4j (ordered by id)
 *   2. Canonicalize each node's properties (sorted-key JSON)
 *   3. SHA-256 hash each canonical string → leaf hashes
 *   4. Build a binary Merkle tree bottom-up (Bitcoin-style: duplicate last leaf when odd)
 *   5. Return the 64-char hex root hash
 *
 * The root is suitable for:
 *   - On-chain anchoring via AnchorRegistry.anchor(root) on Ethereum / Tron
 *   - OpenTimestamps calendar commitment (free BTC anchoring)
 *   - FROST threshold-Schnorr group signing (RFC 9591)
 *   - BLS vote aggregation: R = H(root ‖ news-item-id ‖ round)
 */

import { createHash } from 'crypto';
import type { LightRAGClient } from './client';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface GraphStateRoot {
  root: string;                        // 64-char hex SHA-256 Merkle root
  nodeCount: number;
  computedAt: string;                  // ISO timestamp
  algorithm: 'sha256-merkle-v1';
}

// ──────────────────────────────────────────────────────────────────────────────
// Canonical serialization
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Produce a canonical (deterministic) JSON string.
 * Object keys are sorted alphabetically at every level.
 * Arrays preserve insertion order (order-sensitive by design).
 */
export function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + (obj as unknown[]).map(canonicalize).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize((obj as any)[k])).join(',') + '}';
}

/** SHA-256 of a UTF-8 string, returned as a 64-char lowercase hex string. */
export function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

// ──────────────────────────────────────────────────────────────────────────────
// Merkle tree
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Build a binary Merkle root from an ordered list of leaf hashes.
 * Odd-length levels duplicate the last leaf (Bitcoin convention).
 * Returns a 64-char hex string.
 */
export function buildMerkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return sha256('empty');
  if (leaves.length === 1) return leaves[0];

  let level = [...leaves];
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : left;
      next.push(sha256(left + right));
    }
    level = next;
  }
  return level[0];
}

// ──────────────────────────────────────────────────────────────────────────────
// Live graph root computation
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all nodes from Neo4j and compute the deterministic Merkle root.
 * Pages through the graph in batches of 1000 for large graphs.
 * Returns an offline-safe fallback when Neo4j is not connected.
 */
export async function computeGraphStateRoot(lightrag: LightRAGClient): Promise<GraphStateRoot> {
  if (!(lightrag as any).connected) {
    return {
      root: sha256('offline'),
      nodeCount: 0,
      computedAt: new Date().toISOString(),
      algorithm: 'sha256-merkle-v1',
    };
  }

  const driver = (lightrag as any).driver;
  const allNodes: Array<{ id: unknown; props: Record<string, unknown> }> = [];
  let skip = 0;
  const pageSize = 1000;

  while (true) {
    const session = driver.session();
    try {
      // ORDER BY n.id gives deterministic paging even without pagination cursors.
      // Plain JS integers pack as Bolt INTEGER — safe for SKIP/LIMIT.
      const result = await session.run(
        'MATCH (n) RETURN n.id AS id, properties(n) AS props ORDER BY n.id SKIP $skip LIMIT $limit',
        { skip, limit: pageSize },
      );
      const records: any[] = result.records;
      if (records.length === 0) break;
      for (const rec of records) {
        allNodes.push({ id: rec.get('id'), props: rec.get('props') ?? {} });
      }
      if (records.length < pageSize) break;
      skip += pageSize;
    } finally {
      await session.close();
    }
  }

  // Sort by id for determinism (paging already ordered, but guard against nulls)
  allNodes.sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? '')));

  const leafHashes = allNodes.map(n => sha256(canonicalize({ id: n.id, ...n.props })));
  const root = buildMerkleRoot(leafHashes);

  logger.debug(`Graph state root: ${root.substring(0, 16)}… over ${allNodes.length} nodes`);
  return {
    root,
    nodeCount: allNodes.length,
    computedAt: new Date().toISOString(),
    algorithm: 'sha256-merkle-v1',
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// In-memory root computation (snapshot / test path)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Compute the Merkle root from a pre-fetched list of nodes (faster, no Neo4j needed).
 * Nodes are sorted by id internally, so insertion order does not matter.
 */
export function computeRootFromNodes(
  nodes: Array<{ id: string; [key: string]: unknown }>,
): GraphStateRoot {
  const sorted = [...nodes].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const leafHashes = sorted.map(n => sha256(canonicalize(n)));
  const root = buildMerkleRoot(leafHashes);
  return {
    root,
    nodeCount: nodes.length,
    computedAt: new Date().toISOString(),
    algorithm: 'sha256-merkle-v1',
  };
}

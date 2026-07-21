/**
 * Asset knowledge graph — ingests shared/asset-registry.json into Neo4j
 * via the LightRAG client so the canonical Roblox-side asset list is
 * queryable as a graph (asset → category → origin → web_mirror).
 *
 * Two query surfaces emerge:
 *
 *   - Per-zone / per-category: "which character textures are missing on web?"
 *     answered by Cypher `MATCH (a:Asset {category:'character'})
 *                          WHERE NOT (a)-[:MIRRORED_AS]->(:Asset {origin:'web'})
 *                          RETURN a.origin_path`
 *
 *   - Roblox→Web alignment: every Roblox asset gets a MIRRORED_AS edge to
 *     its web counterpart when the heuristic basename match found one.
 *     Orphans (no edge) are the work queue for Mira/Luna.
 *
 * Idempotent: MERGE on every node. Safe to re-run whenever the registry
 * regenerates. If LightRAG is offline (Neo4j unreachable), this module
 * silently noops — same graceful-degradation pattern as the rest of the
 * LightRAG integration.
 */

import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utils/logger';
import type { LightRAGClient } from './client';
import { ASSET_REGISTRY_PATH } from '../../config/paths';

const REGISTRY_PATH = path.resolve(__dirname, '..', '..', '..', '..', 'molgang-web/shared/asset-registry.json')
  // Fallback — molgang-web checkout might live elsewhere via env override.
  ;
const REGISTRY_OVERRIDE = process.env.ASSET_REGISTRY_PATH;

interface Asset {
  id: string;
  origin: 'roblox' | 'web';
  origin_path: string;
  category: string;
  ext: string;
  size_bytes: number;
  web_mirror_path?: string | null;
}

function readRegistry(): Asset[] {
  const candidates = [
    REGISTRY_OVERRIDE,
    REGISTRY_PATH,
    ASSET_REGISTRY_PATH,
  ].filter(Boolean) as string[];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
        return doc.assets || [];
      }
    } catch (e: any) {
      logger.warn(`asset-graph: failed to read ${p}: ${e.message}`);
    }
  }
  return [];
}

/**
 * Ingest the full asset registry into Neo4j. Returns a summary that
 * the boot path logs so we can tell at a glance whether the graph is
 * populated. Safe to re-run; uses MERGE everywhere.
 */
export async function ingestAssetRegistry(lightrag: LightRAGClient): Promise<{ ingested: number; mirrored: number; orphan: number; offline?: boolean; }> {
  if (!lightrag.isConnected()) {
    return { ingested: 0, mirrored: 0, orphan: 0, offline: true };
  }
  const assets = readRegistry();
  if (!assets.length) {
    logger.warn('asset-graph: registry is empty or not found — run scripts/build-asset-registry.js first');
    return { ingested: 0, mirrored: 0, orphan: 0 };
  }

  // Reach into the underlying driver. The LightRAGClient encapsulates a
  // Neo4j driver; we use its session() helper. Add a tiny method below.
  const session = (lightrag as any).driver.session();
  let mirrored = 0, orphan = 0;
  try {
    for (const a of assets) {
      await session.run(
        `MERGE (asset:Asset {id: $id})
         SET asset.origin = $origin,
             asset.origin_path = $origin_path,
             asset.category = $category,
             asset.ext = $ext,
             asset.size_bytes = $size_bytes
         MERGE (cat:Category {name: $category})
         MERGE (origin:Origin {name: $origin})
         MERGE (asset)-[:OF_CATEGORY]->(cat)
         MERGE (asset)-[:FROM_ORIGIN]->(origin)`,
        a as any,
      );
      if (a.origin === 'roblox' && a.web_mirror_path) {
        mirrored++;
        await session.run(
          `MATCH (rob:Asset {id: $id})
           MERGE (web:Asset {id: $webId})
           SET web.origin = 'web', web.origin_path = $webPath
           MERGE (rob)-[:MIRRORED_AS]->(web)`,
          { id: a.id, webId: 'web:mirror:' + a.id, webPath: a.web_mirror_path },
        );
      } else if (a.origin === 'roblox') {
        orphan++;
      }
    }
    logger.info(`✓ asset-graph: ingested ${assets.length} assets (${mirrored} mirrored, ${orphan} orphan)`);
    return { ingested: assets.length, mirrored, orphan };
  } finally {
    await session.close();
  }
}

export async function queryAssets(lightrag: LightRAGClient, opts: {
  category?: string;
  origin?: 'roblox' | 'web';
  orphan_only?: boolean;
  limit?: number;
} = {}): Promise<any[]> {
  if (!lightrag.isConnected()) return [];
  const session = (lightrag as any).driver.session();
  // Neo4j requires LIMIT as a strict integer; JS numbers cross the bolt
  // wire as floats unless wrapped in neo4j.int(). Either-or — easier here
  // to inline the limit into the Cypher string after sanitizing.
  const lim = Math.max(1, Math.min(500, Math.floor(opts.limit ?? 50)));
  try {
    const where: string[] = [];
    const params: any = {};
    if (opts.category)   { where.push('a.category = $category'); params.category = opts.category; }
    if (opts.origin)     { where.push('a.origin = $origin');     params.origin   = opts.origin; }
    if (opts.orphan_only) {
      where.push('a.origin = "roblox" AND NOT (a)-[:MIRRORED_AS]->(:Asset)');
    }
    const cy = `MATCH (a:Asset)
                ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                RETURN a.id AS id, a.origin AS origin, a.origin_path AS path,
                       a.category AS category, a.ext AS ext, a.size_bytes AS size_bytes
                LIMIT ${lim}`;
    const result = await session.run(cy, params);
    return result.records.map((r: any) => r.toObject());
  } finally {
    await session.close();
  }
}

export async function getCategorySummary(lightrag: LightRAGClient): Promise<any[]> {
  if (!lightrag.isConnected()) return [];
  const session = (lightrag as any).driver.session();
  try {
    // Aggregate per-category counts. Earlier version grouped by
    // (category, origin, per-asset mirrored count) which collapsed each
    // unique combination to a single row → total=1 per category. Fix:
    // count assets per category, sum origin breakdown via CASE, count
    // mirrored edges via a list-comprehension on the relation.
    const r = await session.run(
      `MATCH (a:Asset)
       RETURN a.category AS category,
              count(a) AS total,
              sum(CASE WHEN a.origin = 'roblox' THEN 1 ELSE 0 END) AS roblox,
              sum(CASE WHEN a.origin = 'web' THEN 1 ELSE 0 END) AS web,
              count { (a)-[:MIRRORED_AS]->(:Asset) } AS mirrored
       ORDER BY total DESC`,
    );
    return r.records.map((rec: any) => {
      const o = rec.toObject();
      // Neo4j returns integers as {low, high}; flatten.
      for (const k of ['total', 'roblox', 'web', 'mirrored']) {
        if (o[k] && typeof o[k] === 'object' && 'low' in o[k]) o[k] = o[k].low;
      }
      return o;
    });
  } finally {
    await session.close();
  }
}

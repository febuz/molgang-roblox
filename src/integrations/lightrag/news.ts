/**
 * P2P News Publication — "Newsgroup 2.0"
 *
 * A news item is a CLAIM, not a verified truth. Model:
 *
 *   claimedFact      — the fact being claimed (text)
 *   source           — bron: where the claim originates (url, sensor, agent…)
 *   factTimeNs       — claimed time the FACT occurred, in nanoseconds since
 *                      epoch. Stored as a decimal string: epoch-ns ≈ 1.7e18
 *                      exceeds Number.MAX_SAFE_INTEGER (9e15), so JS numbers
 *                      would silently corrupt it. Agent-attested claim — the
 *                      chain only ever proves an upper bound.
 *   claimTime        — HLC timestamp of the claim itself (hlc.ts, sortable)
 *   publicationTime  — ISO wall clock of actual publication (instant)
 *   claimer          — agent id making the claim
 *   coordinates      — sparse matrix position of the item in a semantic space
 *                      of max 888 888 888 dimensions. Only non-zero entries
 *                      are stored: [{ dim, value }, …]
 *
 * Lifecycle (instant-publish, verify-later):
 *   1. publish()           → status 'unverified', signed, returned immediately
 *   2. markDistributed()   → status 'p2p' once gossiped to ≥1 peer
 *   3. markAnchored()      → status 'anchored' once the graph root containing
 *                            the item is committed on-chain / via OTS
 *
 * Every item carries the graph state root at publication time plus an
 * Ed25519 signature (Node built-in crypto) over the canonical payload.
 *
 * REST (registerNewsRoutes):
 *   POST /api/news              — publish a claim (instant, unverified)
 *   GET  /api/news              — list news (HLC-ordered, filters)
 *   POST /api/news/anchor       — anchor all unanchored items
 *   GET  /api/news/keys/public  — this node's publishing public key (PEM)
 *   GET  /api/news/:id          — single item
 *   POST /api/news/:id/verify   — re-verify the signature
 */

import { generateKeyPairSync, sign as edSign, verify as edVerify, createPublicKey, KeyObject } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import type { AttentionChainService } from './attention-chain';
import { HLCTimestamp, HLC_ZERO, hlcNow, hlcRecv, hlcToString, hlcFromString } from './hlc';
import { computeGraphStateRoot, canonicalize, sha256 } from './graph-state-root';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

/** Hard cap on the dimensionality of the sparse semantic space. */
export const MAX_DIMENSIONS = 888_888_888;

/** Cap on non-zero entries per item — keeps gossip payloads bounded. */
export const MAX_SPARSE_ENTRIES = 1024;

/** DoS bounds: field lengths + total in-memory items. Unauthenticated
 *  publish/receive must not allow memory exhaustion. */
export const MAX_FACT_LENGTH = 8192;
export const MAX_SOURCE_LENGTH = 1024;
export const MAX_CLAIMER_LENGTH = 256;
export const MAX_NEWS_ITEMS = 100_000;

export interface SparseCoordinate {
  dim: number;                    // 0 <= dim < MAX_DIMENSIONS, integer
  value: number;                  // non-zero coordinate value
}

export type NewsStatus = 'unverified' | 'p2p' | 'anchored';

export interface NewsItem {
  id: string;
  claimedFact: string;            // geclaimd feit
  source: string;                 // bron
  factTimeNs: string;             // feittijd — nanoseconds since epoch (decimal string)
  claimTime: string;              // claimtijd — serialized HLC (sortable string)
  publicationTime: string;        // publicatietijd — ISO wall clock, set at publish
  claimer: string;                // agent id
  coordinates: SparseCoordinate[]; // sparse matrix position
  status: NewsStatus;             // unverified → p2p → anchored
  graphRoot: string;              // graph state root at publication time
  publicKeyPem: string;           // claimer's Ed25519 public key
  signature: string;              // base64 Ed25519 over signingPayload
  anchorId?: string;              // AnchorRecord/OtsStamp id once anchored
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Current wall-clock time in nanoseconds since epoch, as a decimal string. */
export function nowNs(): string {
  return (BigInt(Date.now()) * 1_000_000n).toString();
}

/** Validate a factTimeNs string: digits only, fits a u64-ish range. */
export function isValidFactTimeNs(s: unknown): s is string {
  return typeof s === 'string' && /^\d{1,20}$/.test(s);
}

/**
 * Validate sparse coordinates: integer dims within [0, MAX_DIMENSIONS),
 * finite non-zero values, no duplicate dims, bounded entry count.
 * Returns an error string, or null when valid.
 */
export function validateCoordinates(coords: unknown): string | null {
  if (coords === undefined || coords === null) return null; // optional
  if (!Array.isArray(coords)) return 'coordinates must be an array';
  if (coords.length > MAX_SPARSE_ENTRIES) {
    return `too many sparse entries: ${coords.length} > ${MAX_SPARSE_ENTRIES}`;
  }
  const seen = new Set<number>();
  for (const c of coords) {
    if (typeof c?.dim !== 'number' || !Number.isInteger(c.dim)) {
      return 'each coordinate needs an integer dim';
    }
    if (c.dim < 0 || c.dim >= MAX_DIMENSIONS) {
      return `dim ${c.dim} out of range [0, ${MAX_DIMENSIONS})`;
    }
    if (typeof c.value !== 'number' || !Number.isFinite(c.value) || c.value === 0) {
      return `value at dim ${c.dim} must be a finite non-zero number`;
    }
    if (seen.has(c.dim)) return `duplicate dim ${c.dim}`;
    seen.add(c.dim);
  }
  return null;
}

/** Field-length validation shared by publish() and receive(). */
export function validateClaimFields(
  item: Pick<NewsItem, 'claimedFact' | 'source' | 'claimer'>,
): string | null {
  if (typeof item.claimedFact !== 'string' || item.claimedFact.length === 0) return 'claimedFact required';
  if (item.claimedFact.length > MAX_FACT_LENGTH) return `claimedFact exceeds ${MAX_FACT_LENGTH} chars`;
  if (typeof item.source !== 'string' || item.source.length === 0) return 'source required';
  if (item.source.length > MAX_SOURCE_LENGTH) return `source exceeds ${MAX_SOURCE_LENGTH} chars`;
  if (typeof item.claimer !== 'string' || item.claimer.length === 0) return 'claimer required';
  if (item.claimer.length > MAX_CLAIMER_LENGTH) return `claimer exceeds ${MAX_CLAIMER_LENGTH} chars`;
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Signing
// ──────────────────────────────────────────────────────────────────────────────

/**
 * The exact bytes that get signed: canonical JSON of the immutable claim
 * fields. `status` and `anchorId` are EXCLUDED — they mutate during the
 * unverified → p2p → anchored lifecycle and must not break the signature.
 */
export function signingPayload(
  item: Omit<NewsItem, 'signature' | 'publicKeyPem' | 'status' | 'anchorId'>,
): string {
  return canonicalize({
    id: item.id,
    claimedFact: item.claimedFact,
    source: item.source,
    factTimeNs: item.factTimeNs,
    claimTime: item.claimTime,
    publicationTime: item.publicationTime,
    claimer: item.claimer,
    coordinates: item.coordinates,
    graphRoot: item.graphRoot,
  });
}

/** Generate a fresh Ed25519 keypair for a publishing agent. */
export function generateNewsKeypair(): { publicKeyPem: string; privateKey: KeyObject } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKey,
  };
}

/** Verify a news item's Ed25519 signature against its embedded public key. */
export function verifyNewsItem(item: NewsItem): VerifyResult {
  try {
    const payload = signingPayload(item);
    const publicKey = createPublicKey(item.publicKeyPem);
    const ok = edVerify(null, Buffer.from(payload, 'utf8'), publicKey, Buffer.from(item.signature, 'base64'));
    return ok ? { valid: true } : { valid: false, reason: 'signature mismatch' };
  } catch (e: any) {
    return { valid: false, reason: e.message };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// News service
// ──────────────────────────────────────────────────────────────────────────────

export class NewsService {
  private lightrag: LightRAGClient;
  private hlcState: HLCTimestamp = HLC_ZERO;
  private privateKey: KeyObject;
  private publicKeyPem: string;
  private items = new Map<string, NewsItem>();
  private attentionService?: AttentionChainService;
  private onPublish?: (item: NewsItem) => void;

  constructor(
    lightrag: LightRAGClient,
    keypair?: { publicKeyPem: string; privateKey: KeyObject },
    opts?: { attentionService?: AttentionChainService },
  ) {
    this.lightrag = lightrag;
    const kp = keypair ?? generateNewsKeypair();
    this.privateKey = kp.privateKey;
    this.publicKeyPem = kp.publicKeyPem;
    this.attentionService = opts?.attentionService;
  }

  getPublicKeyPem(): string {
    return this.publicKeyPem;
  }

  /** Late binding for the publish hook (services are constructed in dependency
   *  order) — same pattern as ValueChainService.setOnTransfer. The hook fires
   *  for locally published items; failures in the hook never block publish. */
  setOnPublish(hook: (item: NewsItem) => void): void {
    this.onPublish = hook;
  }

  /** Current HLC state (advances on publish and on receive). */
  getHlcState(): HLCTimestamp {
    return this.hlcState;
  }

  /**
   * Publish a claim — INSTANT. The item is signed and returned immediately
   * with status 'unverified'; graph persistence runs in the background and
   * anchoring happens later (markAnchored).
   */
  async publish(params: {
    claimedFact: string;
    source: string;
    claimer: string;
    factTimeNs?: string;          // defaults to "now" — claimed fact time
    coordinates?: SparseCoordinate[];
  }): Promise<NewsItem> {
    const fieldError = validateClaimFields(params);
    if (fieldError) throw new Error(fieldError);
    if (this.items.size >= MAX_NEWS_ITEMS) throw new Error('news store full');
    const coordError = validateCoordinates(params.coordinates);
    if (coordError) throw new Error(coordError);
    const factTimeNs = params.factTimeNs ?? nowNs();
    if (!isValidFactTimeNs(factTimeNs)) {
      throw new Error(`factTimeNs must be a decimal nanosecond string, got "${params.factTimeNs}"`);
    }

    this.hlcState = hlcNow(this.hlcState);
    const stateRoot = await computeGraphStateRoot(this.lightrag);

    const unsigned = {
      id: `news_${uuid()}`,
      claimedFact: params.claimedFact,
      source: params.source,
      factTimeNs,
      claimTime: hlcToString(this.hlcState),
      publicationTime: new Date().toISOString(),
      claimer: params.claimer,
      coordinates: params.coordinates ?? [],
      graphRoot: stateRoot.root,
    };

    const signature = edSign(null, Buffer.from(signingPayload(unsigned), 'utf8'), this.privateKey).toString('base64');

    const item: NewsItem = {
      ...unsigned,
      status: 'unverified',
      publicKeyPem: this.publicKeyPem,
      signature,
    };

    this.items.set(item.id, item);
    // Fire-and-forget persistence — publication must not wait for Neo4j
    void this.persistItem(item);
    if (this.onPublish) {
      try { this.onPublish(item); } catch (e: any) { logger.warn(`news onPublish hook: ${e.message}`); }
    }
    logger.info(`📰 Claim published (unverified): "${item.claimedFact.substring(0, 60)}" by ${item.claimer} @ ${item.claimTime}`);
    return item;
  }

  /**
   * Ingest a news item received from a peer (gossip / Kafka).
   * Verifies the signature, advances the local HLC past the item's claim
   * time, and stores it. Rejects invalid signatures and bad coordinates.
   */
  async receive(item: NewsItem): Promise<VerifyResult> {
    const fieldError = validateClaimFields(item);
    if (fieldError) return { valid: false, reason: fieldError };
    if (!this.items.has(item.id) && this.items.size >= MAX_NEWS_ITEMS) {
      return { valid: false, reason: 'news store full' };
    }
    const coordError = validateCoordinates(item.coordinates);
    if (coordError) return { valid: false, reason: coordError };
    if (!isValidFactTimeNs(item.factTimeNs)) {
      return { valid: false, reason: 'invalid factTimeNs' };
    }
    const result = verifyNewsItem(item);
    if (!result.valid) {
      logger.warn(`news rejected (${result.reason}): ${item.id}`);
      return result;
    }
    // Advance local HLC so subsequent local publishes sort after this item
    this.hlcState = hlcRecv(this.hlcState, hlcFromString(item.claimTime));

    // A received item has by definition crossed the P2P boundary
    this.items.set(item.id, { ...item, status: item.status === 'anchored' ? 'anchored' : 'p2p' });
    void this.persistItem(this.items.get(item.id)!);
    return result;
  }

  /** Mark an item as distributed via P2P (gossip layer callback). */
  markDistributed(id: string): boolean {
    const item = this.items.get(id);
    if (!item || item.status === 'anchored') return false;
    item.status = 'p2p';
    void this.persistItem(item);
    return true;
  }

  /**
   * Mark items as anchored — called after the graph state root containing
   * them has been committed via AnchorService or OtsService.
   * Returns the number of items transitioned.
   */
  markAnchored(ids: string[], anchorId: string): number {
    let n = 0;
    for (const id of ids) {
      const item = this.items.get(id);
      if (!item || item.status === 'anchored') continue;
      item.status = 'anchored';
      item.anchorId = anchorId;
      void this.persistItem(item);
      n++;
    }
    if (n > 0) logger.info(`⚓ ${n} news item(s) anchored under ${anchorId}`);
    return n;
  }

  /** Ids of all items not yet anchored (for the anchoring round). */
  unanchoredIds(): string[] {
    return Array.from(this.items.values())
      .filter(i => i.status !== 'anchored')
      .map(i => i.id);
  }

  list(filter?: {
    claimer?: string;
    status?: NewsStatus;
    limit?: number;
    orderBy?: 'claimTime' | 'attention';
  }): NewsItem[] {
    let all = Array.from(this.items.values());
    if (filter?.claimer) all = all.filter(i => i.claimer === filter.claimer);
    if (filter?.status) all = all.filter(i => i.status === filter.status);

    if (filter?.orderBy === 'attention' && this.attentionService) {
      // Rank by live decayed attention score — most-attended items surface first.
      // Falls back to claimTime ordering when no attention service is wired.
      const svc = this.attentionService;
      all.sort((a, b) => svc.attentionOf(b.id).score - svc.attentionOf(a.id).score);
    } else {
      // Default: newest-first by HLC claim time (lexicographic == chronological)
      all.sort((a, b) => (a.claimTime < b.claimTime ? 1 : a.claimTime > b.claimTime ? -1 : 0));
    }
    return all.slice(0, filter?.limit ?? 50);
  }

  get(id: string): NewsItem | undefined {
    return this.items.get(id);
  }

  /** Persist to the graph as a NewsItem node (offline-safe, never throws). */
  private async persistItem(item: NewsItem): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      await this.lightrag.mergeTypedNode(item.id, 'NewsItem', {
        ...item,
        // Neo4j cannot store nested maps — flatten coordinates to parallel arrays
        coordinates: undefined,
        coordDims: item.coordinates.map(c => c.dim),
        coordValues: item.coordinates.map(c => c.value),
        content: `${item.claimedFact.substring(0, 200)} (bron: ${item.source})`,
        contentHash: sha256(item.claimedFact),
      });
    } catch (e: any) {
      logger.warn(`news persist: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

/**
 * `anchorFn` is the pluggable anchoring backend (AnchorService.anchorAll or
 * OtsService.stampCurrentRoot wrapped). Keeps news.ts free of a hard
 * dependency on the chain modules.
 */
export function registerNewsRoutes(
  app: Express,
  service: NewsService,
  anchorFn?: () => Promise<{ anchorId: string }>,
): void {

  app.post('/api/news', async (req: Request, res: Response): Promise<void> => {
    const { claimedFact, source, claimer, factTimeNs, coordinates } = req.body ?? {};
    if (!claimedFact || !source || !claimer) {
      res.status(400).json({ success: false, error: 'claimedFact, source, claimer required' }); return;
    }
    try {
      const item = await service.publish({ claimedFact, source, claimer, factTimeNs, coordinates });
      res.status(201).json({ success: true, item });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.get('/api/news', (req: Request, res: Response): void => {
    const { claimer, status, orderBy } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 200);
    const items = service.list({
      claimer: claimer || undefined,
      status: (status as NewsStatus) || undefined,
      limit,
      orderBy: orderBy === 'attention' ? 'attention' : 'claimTime',
    });
    res.json({ success: true, count: items.length, items });
  });

  // NB: registered BEFORE /api/news/:id — Express matches in order and
  // 'anchor' would otherwise be captured as :id.
  app.post('/api/news/anchor', async (_req: Request, res: Response): Promise<void> => {
    const pending = service.unanchoredIds();
    if (pending.length === 0) {
      res.json({ success: true, anchored: 0, message: 'nothing to anchor' }); return;
    }
    try {
      const anchorId = anchorFn
        ? (await anchorFn()).anchorId
        : `local_${Date.now()}`; // no chain backend configured — local mark only
      const n = service.markAnchored(pending, anchorId);
      res.json({ success: true, anchored: n, anchorId, mode: anchorFn ? 'chain' : 'local' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/news/keys/public', (_req: Request, res: Response): void => {
    res.json({ success: true, publicKeyPem: service.getPublicKeyPem() });
  });

  app.get('/api/news/:id', (req: Request, res: Response): void => {
    const item = service.get(req.params.id);
    if (!item) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, item });
  });

  app.post('/api/news/:id/verify', (req: Request, res: Response): void => {
    const item = service.get(req.params.id);
    if (!item) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    const result = verifyNewsItem(item);
    res.json({ success: true, ...result });
  });

  logger.info('✓ News API registered (/api/news/*)');
}

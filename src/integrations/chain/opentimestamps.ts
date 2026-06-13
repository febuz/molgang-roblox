/**
 * OpenTimestamps Integration — free Bitcoin anchoring
 *
 * Direct BTC anchoring every 15 minutes would cost ~$1000–2600/month in
 * transaction fees. OpenTimestamps calendar servers aggregate thousands of
 * submitted digests into ONE Merkle root that gets committed to Bitcoin via
 * OP_RETURN — making the anchor free for everyone in the batch.
 *
 * Protocol (https://opentimestamps.org):
 *   POST /digest with the raw 32-byte SHA-256 digest as the request body
 *   → calendar returns a binary timestamp proof fragment ("pending
 *     attestation") that upgrades to a full Bitcoin attestation once the
 *     calendar's next aggregation transaction confirms (~hours).
 *
 * This module submits graph state roots to multiple public calendars,
 * stores the pending proofs (in-memory + graph), and exposes REST routes.
 *
 * REST (registerOtsRoutes):
 *   POST /api/ots/stamp        — stamp the current graph state root
 *   GET  /api/ots/stamps       — list submitted stamps
 *   GET  /api/ots/stamps/:id   — single stamp with calendar proofs
 */

import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from '../lightrag/client';
import { computeGraphStateRoot } from '../lightrag/graph-state-root';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface CalendarProof {
  calendar: string;               // calendar base URL
  proofBase64?: string;           // binary proof fragment, base64-encoded
  error?: string;                 // populated when submission failed
  submittedAt: string;
}

export interface OtsStamp {
  id: string;
  digest: string;                 // 64-char hex SHA-256 (graph state root)
  nodeCount: number;
  proofs: CalendarProof[];
  status: 'pending' | 'partial' | 'failed';
  createdAt: string;
}

/** Public OpenTimestamps calendar servers (run by independent operators). */
export const DEFAULT_CALENDARS = [
  'https://a.pool.opentimestamps.org',
  'https://b.pool.opentimestamps.org',
  'https://alice.btc.calendar.opentimestamps.org',
  'https://bob.btc.calendar.opentimestamps.org',
];

// ──────────────────────────────────────────────────────────────────────────────
// Calendar client
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Submit a 32-byte digest to one calendar server.
 * Returns the binary proof fragment from the calendar.
 */
export async function submitToCalendar(
  calendarUrl: string,
  digestHex: string,
  timeoutMs = 10_000,
): Promise<Buffer> {
  const clean = digestHex.replace(/^0x/, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(clean)) {
    throw new Error(`Invalid digest: expected 32-byte hex, got "${digestHex}"`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${calendarUrl.replace(/\/$/, '')}/digest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/vnd.opentimestamps.v1',
      },
      body: Buffer.from(clean, 'hex'),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`calendar ${calendarUrl} returned ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Submit a digest to multiple calendars in parallel.
 * A stamp is usable as soon as ONE calendar accepts it; we record per-calendar
 * outcomes so partial failures are visible.
 */
export async function stampDigest(
  digestHex: string,
  calendars: string[] = DEFAULT_CALENDARS,
): Promise<CalendarProof[]> {
  const results = await Promise.allSettled(
    calendars.map(cal => submitToCalendar(cal, digestHex)),
  );
  return results.map((r, i) => {
    const base: CalendarProof = {
      calendar: calendars[i],
      submittedAt: new Date().toISOString(),
    };
    if (r.status === 'fulfilled') {
      base.proofBase64 = r.value.toString('base64');
    } else {
      base.error = r.reason?.message ?? String(r.reason);
    }
    return base;
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Stamp service
// ──────────────────────────────────────────────────────────────────────────────

export class OtsService {
  private lightrag: LightRAGClient;
  private calendars: string[];
  private stamps: OtsStamp[] = [];
  private seq = 0;

  constructor(lightrag: LightRAGClient, calendars: string[] = DEFAULT_CALENDARS) {
    this.lightrag = lightrag;
    this.calendars = calendars;
  }

  /**
   * Stamp the current graph state root with all configured calendars.
   * Status: 'pending' when every calendar accepted, 'partial' when at least
   * one did, 'failed' when none did.
   */
  async stampCurrentRoot(): Promise<OtsStamp> {
    const stateRoot = await computeGraphStateRoot(this.lightrag);
    const proofs = await stampDigest(stateRoot.root, this.calendars);

    const okCount = proofs.filter(p => p.proofBase64).length;
    const stamp: OtsStamp = {
      id: `ots_${Date.now()}_${this.seq++}`,
      digest: stateRoot.root,
      nodeCount: stateRoot.nodeCount,
      proofs,
      status: okCount === proofs.length ? 'pending' : okCount > 0 ? 'partial' : 'failed',
      createdAt: new Date().toISOString(),
    };

    this.stamps.push(stamp);
    if (this.stamps.length > 200) this.stamps.shift();
    await this.persistStamp(stamp);

    logger.info(`🕐 OTS stamp ${stamp.id}: ${okCount}/${proofs.length} calendars accepted`);
    return stamp;
  }

  getStamps(): OtsStamp[] {
    return [...this.stamps];
  }

  getStamp(id: string): OtsStamp | undefined {
    return this.stamps.find(s => s.id === id);
  }

  /** Persist the stamp in the knowledge graph (offline-safe). Proof bytes stay in memory. */
  private async persistStamp(stamp: OtsStamp): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      await this.lightrag.mergeTypedNode(stamp.id, 'OtsStamp', {
        id: stamp.id,
        digest: stamp.digest,
        nodeCount: stamp.nodeCount,
        status: stamp.status,
        calendarsAccepted: stamp.proofs.filter(p => p.proofBase64).length,
        calendarsTotal: stamp.proofs.length,
        createdAt: stamp.createdAt,
        content: `OTS stamp of root ${stamp.digest.substring(0, 16)} (${stamp.status})`,
      });
    } catch (e: any) {
      logger.warn(`ots persist: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

export function registerOtsRoutes(app: Express, service: OtsService): void {

  app.post('/api/ots/stamp', async (_req: Request, res: Response): Promise<void> => {
    try {
      const stamp = await service.stampCurrentRoot();
      res.status(201).json({ success: true, stamp: { ...stamp, proofs: stamp.proofs.map(p => ({ ...p, proofBase64: p.proofBase64 ? `${p.proofBase64.substring(0, 32)}…` : undefined })) } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/ots/stamps', (_req: Request, res: Response): void => {
    const stamps = service.getStamps().map(s => ({
      id: s.id,
      digest: s.digest,
      status: s.status,
      calendarsAccepted: s.proofs.filter(p => p.proofBase64).length,
      createdAt: s.createdAt,
    }));
    res.json({ success: true, count: stamps.length, stamps });
  });

  app.get('/api/ots/stamps/:id', (req: Request, res: Response): void => {
    const stamp = service.getStamp(req.params.id);
    if (!stamp) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, stamp });
  });

  logger.info('✓ OpenTimestamps API registered (/api/ots/*)');
}

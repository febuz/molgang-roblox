/**
 * Non Fungable Commodity (NFC) REST API
 *
 * Mounts on /api/nfc/* via registerNFCRoutes(app, lightrag).
 *
 *   POST /api/nfc/registry           — create a new NFC series registry
 *   GET  /api/nfc/registry           — list registries
 *   POST /api/nfc/tokens             — mint a new NFCToken
 *   GET  /api/nfc/tokens             — list tokens (filter by holder, commodity, locked)
 *   GET  /api/nfc/tokens/:id         — get a single token
 *   POST /api/nfc/tokens/:id/granularise — split into 10 sub-tokens (1:10)
 *   POST /api/nfc/tokens/:id/lock    — create a lockup contract for a token
 *   GET  /api/nfc/lockups            — list lockups (filter by holder, status, type)
 *   GET  /api/nfc/lockups/:id        — get a single lockup
 *   POST /api/nfc/lockups/:id/redeem — mark lockup as redeemed
 *   GET  /api/nfc/market             — commodity market data
 *   GET  /api/nfc/stats              — summary stats (total tokens, locked %, BTC backed)
 */

import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import {
  createNFCToken,
  createLockupContract,
  createRegistry,
  granularise,
  persistNFCToken,
  persistLockup,
  persistRegistry,
  isNFCToken,
  isLockupContract,
  NFCToken,
  LockupContract,
} from './nfc-schema';
import logger from '../../utils/logger';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function neo4jSession(lightrag: LightRAGClient): any {
  return (lightrag as any).driver.session();
}

function toProps(record: any, key: string): Record<string, any> | null {
  const node = record.get(key);
  if (!node) return null;
  const props: Record<string, any> = {};
  for (const [k, v] of Object.entries<any>(node.properties)) {
    props[k] = v && typeof v === 'object' && 'low' in v ? v.low : v;
  }
  return props;
}

// ──────────────────────────────────────────────────────────────────────────────
// Route registration
// ──────────────────────────────────────────────────────────────────────────────

export function registerNFCRoutes(app: Express, lightrag: LightRAGClient): void {

  // ── Registry ─────────────────────────────────────────────────────────────────

  app.post('/api/nfc/registry', async (req: Request, res: Response): Promise<void> => {
    const { series_name, commodity_type, total_supply, base_asset, base_ratio, issuer, description } = req.body ?? {};
    if (!series_name || !commodity_type || !total_supply || !issuer) {
      res.status(400).json({ success: false, error: 'series_name, commodity_type, total_supply, issuer required' }); return;
    }
    const registry = createRegistry({ series_name, commodity_type, total_supply, base_asset, base_ratio, issuer, description: description ?? '' });
    if (lightrag.isConnected()) {
      await persistRegistry(lightrag, registry).catch(e => logger.warn(`NFC registry persist: ${e.message}`));
    }
    res.status(201).json({ success: true, registry });
  });

  app.get('/api/nfc/registry', async (_req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) { res.json({ registries: [], offline: true }); return; }
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run('MATCH (r:NFCRegistry) RETURN r ORDER BY r.issued_at DESC LIMIT 100');
      const registries = result.records.map((rec: any) => toProps(rec, 'r')).filter(Boolean);
      res.json({ registries, count: registries.length });
    } finally { await session.close(); }
  });

  // ── Tokens ───────────────────────────────────────────────────────────────────

  app.post('/api/nfc/tokens', async (req: Request, res: Response): Promise<void> => {
    const { commodity_type, base_asset, base_ratio, quantity, unit, provenance,
            certification, holder, issuer, series_id, valuation_usd } = req.body ?? {};
    if (!commodity_type || quantity === undefined || !unit || !holder || !issuer || !series_id) {
      res.status(400).json({ success: false, error: 'commodity_type, quantity, unit, holder, issuer, series_id required' }); return;
    }
    const token = createNFCToken({ commodity_type, base_asset, base_ratio, quantity, unit,
      provenance: provenance ?? 'unknown', certification, holder, issuer, series_id, valuation_usd });
    if (lightrag.isConnected()) {
      await persistNFCToken(lightrag, token).catch(e => logger.warn(`NFC token persist: ${e.message}`));
    }
    res.status(201).json({ success: true, token });
  });

  app.get('/api/nfc/tokens', async (req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) { res.json({ tokens: [], offline: true }); return; }
    const { holder, commodity, locked } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: Record<string, any> = {};
    if (holder) { conditions.push('t.holder = $holder'); params.holder = holder; }
    if (commodity) { conditions.push('t.commodity_type = $commodity'); params.commodity = commodity; }
    if (locked !== undefined) { conditions.push('t.locked = $locked'); params.locked = locked === 'true'; }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run(
        `MATCH (t:NFCToken) ${where} RETURN t ORDER BY t.created_at DESC LIMIT 200`,
        params,
      );
      const tokens = result.records.map((rec: any) => toProps(rec, 't')).filter(Boolean);
      res.json({ tokens, count: tokens.length });
    } finally { await session.close(); }
  });

  app.get('/api/nfc/tokens/:id', async (req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) { res.status(503).json({ success: false, error: 'Offline' }); return; }
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run('MATCH (t:NFCToken {id: $id}) RETURN t', { id: req.params.id });
      if (result.records.length === 0) { res.status(404).json({ success: false, error: 'Not found' }); return; }
      res.json({ success: true, token: toProps(result.records[0], 't') });
    } finally { await session.close(); }
  });

  /** POST /api/nfc/tokens/:id/granularise — split 1 token into N sub-tokens (1:10) */
  app.post('/api/nfc/tokens/:id/granularise', async (req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) { res.status(503).json({ success: false, error: 'Offline' }); return; }
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run('MATCH (t:NFCToken {id: $id}) RETURN t', { id: req.params.id });
      if (result.records.length === 0) { res.status(404).json({ success: false, error: 'Token not found' }); return; }
      const parentProps = toProps(result.records[0], 't') as any;
      if (!isNFCToken(parentProps)) { res.status(400).json({ success: false, error: 'Invalid token data' }); return; }

      const subTokens = granularise(parentProps, req.body?.new_holder);
      for (const sub of subTokens) {
        await persistNFCToken(lightrag, sub).catch(e => logger.warn(`granularise persist: ${e.message}`));
      }
      res.status(201).json({ success: true, subTokens, count: subTokens.length });
    } finally { await session.close(); }
  });

  /** POST /api/nfc/tokens/:id/lock — create a lockup contract */
  app.post('/api/nfc/tokens/:id/lock', async (req: Request, res: Response): Promise<void> => {
    const { holder, lockup_type, duration_months, early_exit_penalty_pct, conditions } = req.body ?? {};
    if (!holder) { res.status(400).json({ success: false, error: 'holder required' }); return; }
    const contract = createLockupContract({
      token_id: req.params.id,
      holder,
      lockup_type,
      duration_months,
      early_exit_penalty_pct,
      conditions,
    });
    if (lightrag.isConnected()) {
      await persistLockup(lightrag, contract).catch(e => logger.warn(`lockup persist: ${e.message}`));
      // Mark token as locked
      await lightrag.mergeTypedNode(req.params.id, 'NFCToken', { locked: true }).catch(() => {});
    }
    res.status(201).json({ success: true, contract });
  });

  // ── Lockups ──────────────────────────────────────────────────────────────────

  app.get('/api/nfc/lockups', async (req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) { res.json({ lockups: [], offline: true }); return; }
    const { holder, status, lockup_type } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: Record<string, any> = {};
    if (holder) { conditions.push('l.holder = $holder'); params.holder = holder; }
    if (status) { conditions.push('l.status = $status'); params.status = status; }
    if (lockup_type) { conditions.push('l.lockup_type = $lockup_type'); params.lockup_type = lockup_type; }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run(
        `MATCH (l:LockupContract) ${where} RETURN l ORDER BY l.unlock_at ASC LIMIT 200`,
        params,
      );
      const lockups = result.records.map((rec: any) => toProps(rec, 'l')).filter(Boolean);
      res.json({ lockups, count: lockups.length });
    } finally { await session.close(); }
  });

  app.get('/api/nfc/lockups/:id', async (req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) { res.status(503).json({ success: false, error: 'Offline' }); return; }
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run('MATCH (l:LockupContract {id: $id}) RETURN l', { id: req.params.id });
      if (result.records.length === 0) { res.status(404).json({ success: false, error: 'Not found' }); return; }
      res.json({ success: true, lockup: toProps(result.records[0], 'l') });
    } finally { await session.close(); }
  });

  app.post('/api/nfc/lockups/:id/redeem', async (req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) { res.status(503).json({ success: false, error: 'Offline' }); return; }
    await lightrag.mergeTypedNode(req.params.id, 'LockupContract', {
      status: 'redeemed',
      redeemed_at: new Date().toISOString(),
      redeemed_by: req.body?.agent ?? 'unknown',
    }).catch(e => { throw e; });
    res.json({ success: true, id: req.params.id, status: 'redeemed' });
  });

  // ── Market data ──────────────────────────────────────────────────────────────

  app.get('/api/nfc/market', async (_req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) { res.json({ markets: [], offline: true }); return; }
    const session = neo4jSession(lightrag);
    try {
      const result = await session.run(
        'MATCH (m:CommodityMarket) RETURN m ORDER BY m.last_updated DESC LIMIT 50',
      );
      const markets = result.records.map((rec: any) => toProps(rec, 'm')).filter(Boolean);
      res.json({ markets, count: markets.length });
    } finally { await session.close(); }
  });

  // ── Stats ────────────────────────────────────────────────────────────────────

  app.get('/api/nfc/stats', async (_req: Request, res: Response): Promise<void> => {
    if (!lightrag.isConnected()) {
      res.json({ totalTokens: 0, lockedTokens: 0, activeLockups: 0, offline: true }); return;
    }
    const session = neo4jSession(lightrag);
    try {
      const [tokensRes, lockedRes, lockupsRes] = await Promise.all([
        session.run('MATCH (t:NFCToken) RETURN count(t) AS c'),
        session.run('MATCH (t:NFCToken {locked: true}) RETURN count(t) AS c'),
        session.run("MATCH (l:LockupContract {status: 'active'}) RETURN count(l) AS c"),
      ]);
      const toN = (r: any) => {
        const raw = r.records[0]?.get('c');
        return raw && typeof raw === 'object' && 'low' in raw ? raw.low : Number(raw ?? 0);
      };
      res.json({
        totalTokens: toN(tokensRes),
        lockedTokens: toN(lockedRes),
        activeLockups: toN(lockupsRes),
        offline: false,
      });
    } finally { await session.close(); }
  });

  logger.info('✓ NFC REST API registered (/api/nfc/*)');
}

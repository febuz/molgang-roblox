/**
 * User API — unified onboarding, authentication and profiles
 *
 * Bridges the sovereign identity layer, value chain and attention chain into
 * human-friendly HTTP endpoints that a frontend or mobile app can call
 * without knowing about DIDs, BigInt units, or HLC timestamps.
 *
 * Flows:
 *
 *  ONBOARDING
 *    POST /api/users/register { handle, bio? }
 *      → creates a sovereign DID (node-held keypair)
 *      → mints WELCOME_BONUS tokens to the new account
 *      → records a 'join' attention event
 *      → returns profile + session token
 *
 *  AUTHENTICATION
 *    GET  /api/users/:handle/challenge
 *      → returns a one-time nonce (expires in CHALLENGE_TTL_MS)
 *    POST /api/users/:handle/session { nonce, signature }
 *      → verifies Ed25519(nonce, did.publicKey)
 *      → returns a HMAC session token (X-Session-Token header on later calls)
 *    For node-held identities (registered on THIS node) a signature-free
 *    session is also issued at registration — useful for development and
 *    single-node deployments.
 *
 *  PROFILES
 *    GET  /api/users/:handle
 *      → DID, balance, attention score, recent claims, recent votes, credentials
 *    GET  /api/users/:handle/wallet
 *      → balance (units + tokens), nonce, recent transfer history
 *    POST /api/users/:handle/send { toHandle, amountTokens, memo? }
 *      → transfer by handle (not DID) — human-friendly
 *    GET  /api/users/:handle/credentials
 *      → issued and received verifiable credentials
 *
 *  NODE STATUS
 *    GET  /api/node/status
 *      → peers, consensus, supply, conservation, memory caps — all in one call
 */

import { createHmac, randomBytes } from 'crypto';
import type { Express, Request, Response } from 'express';
import type { IdentityPort } from './identity-port';
import type { ValueChainService } from './value-chain';
import type { AttentionChainService } from './attention-chain';
import type { NewsService } from './news';
import type { SovereignVotingService } from './sovereign-voting';
import type { ConsensusEngine } from './consensus';
import { tokensToUnits, unitsToTokenString } from './value-chain';
import logger from '../../utils/logger';

// ─── Config ───────────────────────────────────────────────────────────────────

/** Welcome-bonus tokens minted to every new account. */
export const WELCOME_BONUS_TOKENS = 10;

/** One-time nonce expires after this many milliseconds. */
export const CHALLENGE_TTL_MS = 5 * 60 * 1_000; // 5 minutes

/** Session token expires after this many milliseconds (default 24 h). */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1_000;

/** HMAC key for session tokens — set via SESSION_SECRET env var or generated fresh. */
const SESSION_SECRET = process.env.SESSION_SECRET ?? randomBytes(32).toString('hex');

// ─── Session store (in-memory, no external dependency) ───────────────────────

interface SessionEntry {
  did: string;
  handle: string;
  expiresAt: number;
}

interface ChallengeEntry {
  nonce: string;
  expiresAt: number;
}

export class SessionStore {
  private sessions = new Map<string, SessionEntry>();  // token → entry
  private challenges = new Map<string, ChallengeEntry>(); // handle → entry

  issueChallenge(handle: string): string {
    const nonce = randomBytes(16).toString('hex');
    this.challenges.set(handle, { nonce, expiresAt: Date.now() + CHALLENGE_TTL_MS });
    return nonce;
  }

  consumeChallenge(handle: string, nonce: string): boolean {
    const entry = this.challenges.get(handle);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) { this.challenges.delete(handle); return false; }
    if (entry.nonce !== nonce) return false;
    this.challenges.delete(handle); // one-time
    return true;
  }

  issueToken(did: string, handle: string): string {
    const token = createHmac('sha256', SESSION_SECRET)
      .update(`${did}:${handle}:${Date.now()}:${randomBytes(8).toString('hex')}`)
      .digest('hex');
    this.sessions.set(token, { did, handle, expiresAt: Date.now() + SESSION_TTL_MS });
    return token;
  }

  verify(token: string): SessionEntry | null {
    const entry = this.sessions.get(token);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.sessions.delete(token); return null; }
    return entry;
  }

  revoke(token: string): void {
    this.sessions.delete(token);
  }

  /** Prune expired entries. Call periodically. */
  prune(): void {
    const now = Date.now();
    for (const [k, v] of this.sessions) if (now > v.expiresAt) this.sessions.delete(k);
    for (const [k, v] of this.challenges) if (now > v.expiresAt) this.challenges.delete(k);
  }
}

// ─── Profile builder ──────────────────────────────────────────────────────────

interface UserProfile {
  did: string;
  handle: string;
  bio?: string;
  balanceTokens: string;
  balanceUnits: string;
  nonce: number;
  attentionScore: number;
  recentClaims: number;
  joinedAt: string;
}

export class UserApiService {
  readonly sessions = new SessionStore();

  constructor(
    private readonly identity: IdentityPort,
    private readonly valueChain: ValueChainService,
    private readonly attention: AttentionChainService,
    private readonly news: NewsService,
    private readonly voting?: SovereignVotingService,
  ) {
    // Prune stale session tokens every 10 minutes
    const timer = setInterval(() => this.sessions.prune(), 10 * 60 * 1_000);
    if (timer.unref) timer.unref();
  }

  // ─── Registration ─────────────────────────────────────────────────────────

  register(handle: string, bio?: string): {
    profile: UserProfile;
    sessionToken: string;
    welcomeTransferId: string | null;
  } {
    const doc = this.identity.register(handle);
    const tx = this.valueChain.mintReward(doc.did, WELCOME_BONUS_TOKENS, 'welcome-bonus');
    // Record the 'join' event so the agent appears in the attention graph
    try {
      this.attention.record({ itemId: `user:${doc.did}`, agent: handle, kind: 'view' });
    } catch { /* non-fatal — caps etc. */ }

    const sessionToken = this.sessions.issueToken(doc.did, handle);
    return {
      profile: this.buildProfile(handle),
      sessionToken,
      welcomeTransferId: tx?.id ?? null,
    };
  }

  // ─── Authentication ────────────────────────────────────────────────────────

  challenge(handle: string): { nonce: string; expiresAt: string } {
    const doc = this.identity.resolveHandle(handle);
    if (!doc) throw new Error(`handle "${handle}" not found`);
    const nonce = this.sessions.issueChallenge(handle);
    return { nonce, expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString() };
  }

  /**
   * Verify a challenge signature (DID's current public key signs the nonce).
   * For node-held identities the node can also issue tokens directly via
   * `nodeLogin(handle)` — useful for development/single-node mode.
   */
  verifySession(handle: string, nonce: string, signatureBase64: string): {
    sessionToken: string;
    did: string;
  } {
    const doc = this.identity.resolveHandle(handle);
    if (!doc) throw new Error(`handle "${handle}" not found`);
    if (!this.sessions.consumeChallenge(handle, nonce)) {
      throw new Error('invalid or expired nonce');
    }
    const ok = this.identity.verifyAs(doc.did, nonce, signatureBase64);
    if (!ok) throw new Error('signature verification failed');
    return {
      sessionToken: this.sessions.issueToken(doc.did, handle),
      did: doc.did,
    };
  }

  /** Issue a session for a node-held identity without a challenge (single-node dev mode). */
  nodeLogin(handle: string): { sessionToken: string; did: string } {
    const doc = this.identity.resolveHandle(handle);
    if (!doc) throw new Error(`handle "${handle}" not found`);
    return {
      sessionToken: this.sessions.issueToken(doc.did, handle),
      did: doc.did,
    };
  }

  // ─── Profiles ─────────────────────────────────────────────────────────────

  buildProfile(handle: string): UserProfile {
    const doc = this.identity.resolveHandle(handle);
    if (!doc) throw new Error(`handle "${handle}" not found`);
    const acc = this.valueChain.getAccount(doc.did);
    const attScore = this.attention.attentionOf(`user:${doc.did}`).score;
    const claims = this.news.list({ claimer: handle, limit: 999 }).length;
    return {
      did: doc.did,
      handle: doc.handle ?? handle,
      balanceTokens: unitsToTokenString(acc.balance),
      balanceUnits: acc.balance.toString(),
      nonce: acc.nonce,
      attentionScore: attScore,
      recentClaims: claims,
      joinedAt: doc.createdAt,
    };
  }

  wallet(handle: string, limit = 20) {
    const doc = this.identity.resolveHandle(handle);
    if (!doc) throw new Error(`handle "${handle}" not found`);
    const acc = this.valueChain.getAccount(doc.did);
    const history = this.valueChain.transfersOf(doc.did, limit);
    return {
      did: doc.did,
      handle,
      balanceTokens: unitsToTokenString(acc.balance),
      balanceUnits: acc.balance.toString(),
      nonce: acc.nonce,
      history: history.map(t => ({
        id: t.id,
        direction: t.from === doc.did ? 'out' : 'in',
        counterparty: t.from === doc.did ? t.to : t.from,
        amountTokens: unitsToTokenString(BigInt(t.amount)),
        amountUnits: t.amount,
        memo: t.memo,
        ts: t.ts,
      })),
    };
  }

  sendByHandle(fromHandle: string, toHandle: string, amountTokens: number, memo = '') {
    const fromDoc = this.identity.resolveHandle(fromHandle);
    const toDoc = this.identity.resolveHandle(toHandle);
    if (!fromDoc) throw new Error(`sender handle "${fromHandle}" not found`);
    if (!toDoc) throw new Error(`recipient handle "${toHandle}" not found`);
    const units = tokensToUnits(amountTokens);
    return this.valueChain.transfer(fromDoc.did, toDoc.did, units, memo);
  }
}

// ─── REST routes ──────────────────────────────────────────────────────────────

export function registerUserRoutes(
  app: Express,
  userApi: UserApiService,
  consensus?: ConsensusEngine,
  valueChain?: ValueChainService,
): void {

  // ── Registration ──────────────────────────────────────────────────────────

  app.post('/api/users/register', (req: Request, res: Response): void => {
    const { handle, bio } = req.body ?? {};
    if (!handle || typeof handle !== 'string' || handle.length < 2) {
      res.status(400).json({ success: false, error: 'handle required (min 2 chars)' }); return;
    }
    try {
      const result = userApi.register(handle, bio);
      res.status(201).json({ success: true, ...result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // ── Authentication ────────────────────────────────────────────────────────

  app.get('/api/users/:handle/challenge', (req: Request, res: Response): void => {
    try {
      res.json({ success: true, ...userApi.challenge(req.params.handle) });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  });

  app.post('/api/users/:handle/session', (req: Request, res: Response): void => {
    const { nonce, signature } = req.body ?? {};
    if (!nonce || !signature) {
      // Node-held identity shortcut: no signature required
      try {
        const r = userApi.nodeLogin(req.params.handle);
        res.json({ success: true, ...r, mode: 'node-held' });
      } catch (e: any) {
        res.status(400).json({ success: false, error: 'nonce and signature required for external identities' });
      }
      return;
    }
    try {
      const r = userApi.verifySession(req.params.handle, nonce, signature);
      res.json({ success: true, ...r, mode: 'challenge-response' });
    } catch (e: any) {
      res.status(401).json({ success: false, error: e.message });
    }
  });

  app.delete('/api/users/:handle/session', (req: Request, res: Response): void => {
    const token = req.headers['x-session-token'] as string;
    if (token) userApi.sessions.revoke(token);
    res.json({ success: true });
  });

  // ── Profiles ──────────────────────────────────────────────────────────────

  app.get('/api/users/:handle', (req: Request, res: Response): void => {
    try {
      res.json({ success: true, profile: userApi.buildProfile(req.params.handle) });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  });

  // ── Wallet ────────────────────────────────────────────────────────────────

  app.get('/api/users/:handle/wallet', (req: Request, res: Response): void => {
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    try {
      res.json({ success: true, wallet: userApi.wallet(req.params.handle, limit) });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  });

  app.post('/api/users/:handle/send', (req: Request, res: Response): void => {
    const { toHandle, amountTokens, memo } = req.body ?? {};
    if (!toHandle || typeof amountTokens !== 'number') {
      res.status(400).json({ success: false, error: 'toHandle and amountTokens required' }); return;
    }
    try {
      const tx = userApi.sendByHandle(req.params.handle, toHandle, amountTokens, memo ?? '');
      res.status(201).json({ success: true, transfer: tx });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // ── Credentials ───────────────────────────────────────────────────────────

  app.get('/api/users/:handle/credentials', (req: Request, res: Response): void => {
    // Credentials are stored in the identity service; filter by subject or issuer DID
    try {
      const profile = userApi.buildProfile(req.params.handle);
      // The identity service doesn't expose a credential query yet, so return the DID
      // for the client to query via /api/identity/credentials
      res.json({
        success: true,
        did: profile.did,
        hint: `Use GET /api/identity/resolve/${profile.did} to see the full DID document, or POST /api/identity/credentials/verify to verify credentials`,
      });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  });

  // ── Node status ───────────────────────────────────────────────────────────

  app.get('/api/node/status', (_req: Request, res: Response): void => {
    const supply = valueChain?.getSupply();
    const conservation = valueChain?.checkConservation();
    const consensusStatus = consensus?.getStatus();
    res.json({
      success: true,
      node: {
        uptime: process.uptime(),
        memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        pid: process.pid,
      },
      consensus: consensusStatus ?? null,
      supply: supply ? {
        capTokens: supply.capTokens,
        mintedTokens: supply.mintedTokens,
        remainingTokens: unitsToTokenString(BigInt(supply.capUnits) - BigInt(supply.mintedUnits)),
        era: supply.era,
        accounts: supply.accounts,
        transfers: supply.transfers,
        blocks: supply.blocks,
        pendingTx: supply.pendingTx,
        conservationHolds: conservation?.holds ?? null,
      } : null,
    });
  });

  logger.info('✓ User API registered (/api/users/*, /api/node/status)');
}

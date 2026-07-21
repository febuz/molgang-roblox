/**
 * Feed API — the main user-facing content experience
 *
 * Newsgroup 2.0: a P2P news feed where:
 *   - content is published as signed claims (news.ts)
 *   - ranking is by decaying attention (attention-chain.ts)
 *   - reactions earn token rewards for authors (value-chain.ts)
 *   - real-time updates stream over SSE (/api/feed/stream)
 *
 * REST:
 *   GET  /api/feed                   — paginated feed, enriched with author + attention
 *   GET  /api/feed/trending          — top-attention items (configurable window)
 *   GET  /api/feed/search?q=...      — full-text search on claimedFact + source
 *   POST /api/feed/:id/react         — react (like|share|reply|validate) → attention + reward
 *   GET  /api/feed/stream            — SSE stream of newly published items
 *   POST /api/feed/publish           — publish a news claim as a registered user (DID-signed)
 *   GET  /api/feed/:id               — single enriched item
 *   GET  /api/feed/:id/reactions     — reaction breakdown for one item
 */

import type { Express, Request, Response } from 'express';
import type { NewsService, NewsItem } from './news';
import type { AttentionChainService } from './attention-chain';
import type { IdentityResolverPort } from './identity-port';
import type { ValueChainService } from './value-chain';
import { unitsToTokenString } from './value-chain';
import logger from '../../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReactionKind = 'like' | 'share' | 'reply' | 'validate';

/** Maps our user-facing reaction kinds to the attention-chain kinds. */
const REACTION_TO_ATTENTION: Record<ReactionKind, string> = {
  like: 'view',
  share: 'share',
  reply: 'reply',
  validate: 'validate',
};

/** Reward tokens minted to the item author per reaction kind. */
export const REACTION_REWARD: Record<ReactionKind, number> = {
  like: 0.1,
  share: 0.5,
  reply: 1,
  validate: 2,
};

export interface EnrichedItem {
  id: string;
  claimedFact: string;
  source: string;
  claimer: string;
  claimerDid?: string;
  publicationTime: string;
  status: string;
  attentionScore: number;
  reactionCounts: Record<ReactionKind, number>;
  totalReactions: number;
  anchorId?: string;
  coordinates?: Array<{ dim: number; value: number }>;
}

// ─── FeedService ──────────────────────────────────────────────────────────────

export class FeedService {
  /** Reaction log: itemId → kind → Set<agentHandle>. Prevents double-counting. */
  private reactions = new Map<string, Map<ReactionKind, Set<string>>>();

  /** SSE subscribers for real-time feed. */
  private subscribers = new Set<Response>();

  constructor(
    private readonly news: NewsService,
    private readonly attention: AttentionChainService,
    private readonly identity: IdentityResolverPort,
    private readonly valueChain?: ValueChainService,
  ) {}

  // ─── Hook called by news service when a new item is published ─────────────

  /**
   * Wire this to news.onPublish so new items push to SSE subscribers.
   * Returns a cleanup handle.
   */
  notifySubscribers(item: NewsItem): void {
    if (this.subscribers.size === 0) return;
    const enriched = this.enrich(item);
    const data = `data: ${JSON.stringify({ event: 'new-item', item: enriched })}\n\n`;
    for (const res of this.subscribers) {
      try { res.write(data); } catch { this.subscribers.delete(res); }
    }
  }

  // ─── Enrichment ───────────────────────────────────────────────────────────

  enrich(item: NewsItem): EnrichedItem {
    const score = this.attention.attentionOf(item.id);
    const counts = this.getReactionCounts(item.id);
    const doc = this.identity.resolveHandle(item.claimer);
    return {
      id: item.id,
      claimedFact: item.claimedFact,
      source: item.source,
      claimer: item.claimer,
      claimerDid: doc?.did,
      publicationTime: item.publicationTime,
      status: item.status,
      attentionScore: Math.round(score.score * 100) / 100,
      reactionCounts: counts,
      totalReactions: Object.values(counts).reduce((a, b) => a + b, 0),
      anchorId: item.anchorId,
      coordinates: item.coordinates,
    };
  }

  private getReactionCounts(itemId: string): Record<ReactionKind, number> {
    const buckets = this.reactions.get(itemId);
    return {
      like: buckets?.get('like')?.size ?? 0,
      share: buckets?.get('share')?.size ?? 0,
      reply: buckets?.get('reply')?.size ?? 0,
      validate: buckets?.get('validate')?.size ?? 0,
    };
  }

  // ─── Feed ─────────────────────────────────────────────────────────────────

  getFeed(opts: {
    limit?: number;
    offset?: number;
    claimer?: string;
    status?: string;
    orderBy?: 'attention' | 'time';
  } = {}): { items: EnrichedItem[]; total: number; hasMore: boolean } {
    const limit = Math.min(opts.limit ?? 20, 100);
    const offset = opts.offset ?? 0;

    const all = this.news.list({
      claimer: opts.claimer,
      status: opts.status as any,
      limit: 10_000,
      orderBy: opts.orderBy === 'attention' ? 'attention' : 'claimTime',
    });

    const enriched = all.map(item => this.enrich(item));
    if (opts.orderBy === 'attention') {
      enriched.sort((a, b) => b.attentionScore - a.attentionScore);
    }

    const page = enriched.slice(offset, offset + limit);
    return { items: page, total: all.length, hasMore: offset + limit < all.length };
  }

  // ─── Trending ─────────────────────────────────────────────────────────────

  getTrending(opts: { windowHours?: number; limit?: number } = {}): EnrichedItem[] {
    const limit = Math.min(opts.limit ?? 10, 50);
    const windowMs = (opts.windowHours ?? 24) * 60 * 60 * 1_000;
    const cutoff = Date.now() - windowMs;

    const all = this.news.list({ limit: 10_000, orderBy: 'attention' });
    return all
      .filter(item => new Date(item.publicationTime).getTime() > cutoff)
      .map(item => this.enrich(item))
      .sort((a, b) => b.attentionScore - a.attentionScore)
      .slice(0, limit);
  }

  // ─── Search ───────────────────────────────────────────────────────────────

  search(q: string, opts: { limit?: number; offset?: number } = {}): {
    items: EnrichedItem[];
    total: number;
    query: string;
  } {
    if (!q || q.length < 2) return { items: [], total: 0, query: q };
    const limit = Math.min(opts.limit ?? 20, 100);
    const offset = opts.offset ?? 0;
    const lower = q.toLowerCase();

    const all = this.news.list({ limit: 10_000, orderBy: 'claimTime' });
    const matches = all.filter(item =>
      item.claimedFact.toLowerCase().includes(lower) ||
      item.source.toLowerCase().includes(lower) ||
      item.claimer.toLowerCase().includes(lower)
    );

    const enriched = matches
      .map(item => this.enrich(item))
      .sort((a, b) => b.attentionScore - a.attentionScore);

    return {
      items: enriched.slice(offset, offset + limit),
      total: matches.length,
      query: q,
    };
  }

  // ─── Reactions ────────────────────────────────────────────────────────────

  react(itemId: string, agentHandle: string, kind: ReactionKind): {
    recorded: boolean;
    reason?: string;
    attentionScore: number;
    rewardTxId?: string;
    reactionCounts: Record<ReactionKind, number>;
  } {
    const item = this.news.get(itemId);
    if (!item) return { recorded: false, reason: 'item not found', attentionScore: 0, reactionCounts: this.getReactionCounts(itemId) };

    // Idempotency: one reaction per kind per agent per item
    let buckets = this.reactions.get(itemId);
    if (!buckets) { buckets = new Map(); this.reactions.set(itemId, buckets); }
    let agents = buckets.get(kind);
    if (!agents) { agents = new Set(); buckets.set(kind, agents); }
    if (agents.has(agentHandle)) {
      return {
        recorded: false,
        reason: 'already reacted',
        attentionScore: this.attention.attentionOf(itemId).score,
        reactionCounts: this.getReactionCounts(itemId),
      };
    }
    agents.add(agentHandle);

    // Record attention event
    try {
      this.attention.record({
        itemId,
        agent: agentHandle,
        kind: REACTION_TO_ATTENTION[kind] as any,
      });
    } catch { /* caps hit — non-fatal */ }

    // Mint reward to the item's author (if the author is a registered identity)
    let rewardTxId: string | undefined;
    if (this.valueChain) {
      const authorDid = this.identity.didForHandle(item.claimer);
      if (authorDid) {
        const reward = REACTION_REWARD[kind];
        const tx = this.valueChain.mintReward(authorDid, reward, `reaction:${kind}:${agentHandle}`);
        rewardTxId = tx?.id;
      }
    }

    return {
      recorded: true,
      attentionScore: this.attention.attentionOf(itemId).score,
      rewardTxId,
      reactionCounts: this.getReactionCounts(itemId),
    };
  }
}

// ─── REST routes ──────────────────────────────────────────────────────────────

export function registerFeedRoutes(app: Express, feed: FeedService): void {

  // ── Feed ──────────────────────────────────────────────────────────────────

  app.get('/api/feed', (req: Request, res: Response): void => {
    const { claimer, status, orderBy } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    const result = feed.getFeed({
      limit, offset,
      claimer: claimer || undefined,
      status: status || undefined,
      orderBy: orderBy === 'attention' ? 'attention' : 'time',
    });
    res.json({ success: true, ...result });
  });

  // ── Trending ──────────────────────────────────────────────────────────────

  app.get('/api/feed/trending', (req: Request, res: Response): void => {
    const windowHours = Math.min(parseInt(String(req.query.hours ?? '24'), 10) || 24, 168);
    const limit = Math.min(parseInt(String(req.query.limit ?? '10'), 10) || 10, 50);
    res.json({ success: true, items: feed.getTrending({ windowHours, limit }) });
  });

  // ── Search — registered BEFORE /api/feed/:id ──────────────────────────────

  app.get('/api/feed/search', (req: Request, res: Response): void => {
    const { q } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    if (!q) { res.status(400).json({ success: false, error: 'q parameter required' }); return; }
    res.json({ success: true, ...feed.search(q, { limit, offset }) });
  });

  // ── SSE stream ────────────────────────────────────────────────────────────

  app.get('/api/feed/stream', (req: Request, res: Response): void => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send a heartbeat comment every 30s so the connection stays alive
    const heartbeat = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch { cleanup(); }
    }, 30_000);
    if ((heartbeat as any).unref) (heartbeat as any).unref();

    const subscribers = (feed as any).subscribers as Set<Response>;
    subscribers.add(res);

    const cleanup = () => {
      clearInterval(heartbeat);
      subscribers.delete(res);
    };
    req.on('close', cleanup);
    res.on('error', cleanup);

    // Send current feed on connect so the client bootstraps immediately
    const { items } = feed.getFeed({ limit: 20, orderBy: 'attention' });
    res.write(`data: ${JSON.stringify({ event: 'snapshot', items })}\n\n`);
  });

  // ── Publish (user-friendly POST that uses the registered identity) ────────

  app.post('/api/feed/publish', async (req: Request, res: Response): Promise<void> => {
    // Delegates to POST /api/news — kept here so clients only need /api/feed/*
    const { claimedFact, source, claimer, factTimeNs, coordinates } = req.body ?? {};
    if (!claimedFact || !source || !claimer) {
      res.status(400).json({ success: false, error: 'claimedFact, source, claimer required' }); return;
    }
    try {
      const item = await (feed as any).news.publish({ claimedFact, source, claimer, factTimeNs, coordinates });
      feed.notifySubscribers(item);
      res.status(201).json({ success: true, item: feed.enrich(item) });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  // ── Single item ───────────────────────────────────────────────────────────

  app.get('/api/feed/:id', (req: Request, res: Response): void => {
    const item = (feed as any).news.get(req.params.id) as NewsItem | undefined;
    if (!item) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, item: feed.enrich(item) });
  });

  // ── Reactions ─────────────────────────────────────────────────────────────

  app.post('/api/feed/:id/react', (req: Request, res: Response): void => {
    const { agent, kind } = req.body ?? {};
    if (!agent || !kind) {
      res.status(400).json({ success: false, error: 'agent and kind required' }); return;
    }
    const valid: ReactionKind[] = ['like', 'share', 'reply', 'validate'];
    if (!valid.includes(kind)) {
      res.status(400).json({ success: false, error: `kind must be one of: ${valid.join(', ')}` }); return;
    }
    const result = feed.react(req.params.id, agent, kind as ReactionKind);
    res.status(result.recorded ? 200 : 409).json({ success: result.recorded, ...result });
  });

  app.get('/api/feed/:id/reactions', (req: Request, res: Response): void => {
    const item = (feed as any).news.get(req.params.id);
    if (!item) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    const enriched = feed.enrich(item as NewsItem);
    res.json({ success: true, itemId: req.params.id, reactionCounts: enriched.reactionCounts, total: enriched.totalReactions });
  });

  logger.info('✓ Feed API registered (/api/feed/*)');
}

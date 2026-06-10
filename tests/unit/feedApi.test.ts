/**
 * Feed API tests — enriched feed, reactions, search, trending, SSE stream
 */

import {
  FeedService,
  type ReactionKind,
  REACTION_REWARD,
} from '../../src/integrations/lightrag/feed-api';
import { NewsService } from '../../src/integrations/lightrag/news';
import { AttentionChainService } from '../../src/integrations/lightrag/attention-chain';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { ValueChainService, tokensToUnits, unitsToTokenString } from '../../src/integrations/lightrag/value-chain';

const offlineRag = { isConnected: () => false } as any;

function makeStack() {
  const identity = new SovereignIdentityService(offlineRag);
  const chain = new ValueChainService(offlineRag, { identity });
  const attention = new AttentionChainService(offlineRag);
  const news = new NewsService(offlineRag, undefined, { attentionService: attention });
  const feed = new FeedService(news, attention, identity, chain);
  return { identity, chain, attention, news, feed };
}

async function publishItems(news: NewsService, count: number) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(await news.publish({
      claimedFact: `Fact number ${i}: hello world ${i % 3 === 0 ? 'crypto' : 'news'}`,
      source: `https://example.com/${i}`,
      claimer: `author${i % 2}`,
    }));
  }
  return items;
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

describe('FeedService – feed', () => {
  it('returns an empty feed when no items are published', () => {
    const { feed } = makeStack();
    const result = feed.getFeed();
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('returns enriched items', async () => {
    const { news, feed } = makeStack();
    await publishItems(news, 3);
    const { items } = feed.getFeed({ limit: 10 });
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      claimedFact: expect.stringContaining('Fact'),
      claimer: expect.any(String),
      attentionScore: expect.any(Number),
      reactionCounts: { like: 0, share: 0, reply: 0, validate: 0 },
      totalReactions: 0,
    });
  });

  it('respects limit and offset (pagination)', async () => {
    const { news, feed } = makeStack();
    await publishItems(news, 10);
    const page1 = feed.getFeed({ limit: 4, offset: 0 });
    const page2 = feed.getFeed({ limit: 4, offset: 4 });
    expect(page1.items).toHaveLength(4);
    expect(page2.items).toHaveLength(4);
    expect(page1.hasMore).toBe(true);
    expect(page1.total).toBe(10);
    // No overlap between pages
    const ids1 = new Set(page1.items.map(i => i.id));
    const ids2 = new Set(page2.items.map(i => i.id));
    for (const id of ids2) expect(ids1.has(id)).toBe(false);
  });

  it('filters by claimer', async () => {
    const { news, feed } = makeStack();
    await publishItems(news, 6); // alternates author0 and author1
    const { items } = feed.getFeed({ limit: 20, claimer: 'author0' });
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.claimer).toBe('author0');
  });

  it('orders by attention when requested', async () => {
    const { news, feed, identity, chain, attention } = makeStack();
    const alice = identity.register('alice');
    const bob = identity.register('bob');
    chain.mintReward(alice.did, 100);
    chain.mintReward(bob.did, 100);
    const [item1, item2] = await publishItems(news, 2);
    // Give item2 more reactions
    for (let i = 0; i < 5; i++) {
      attention.record({ itemId: item2.id, agent: `voter${i}`, kind: 'validate' });
    }
    const { items } = feed.getFeed({ limit: 10, orderBy: 'attention' });
    const pos1 = items.findIndex(i => i.id === item2.id);
    const pos2 = items.findIndex(i => i.id === item1.id);
    expect(pos1).toBeLessThan(pos2); // item2 ranked higher
  });
});

// ─── Reactions ────────────────────────────────────────────────────────────────

describe('FeedService – reactions', () => {
  it('like records an attention event and increments reaction count', async () => {
    const { news, feed } = makeStack();
    const [item] = await publishItems(news, 1);
    const result = feed.react(item.id, 'alice', 'like');
    expect(result.recorded).toBe(true);
    expect(result.reactionCounts.like).toBe(1);
    expect(result.attentionScore).toBeGreaterThan(0);
  });

  it('validate mints reward to the author', async () => {
    const { news, feed, identity, chain } = makeStack();
    identity.register('author0');
    const authorDid = identity.didForHandle('author0')!;
    const [item] = await publishItems(news, 1);
    const balanceBefore = chain.getAccount(authorDid).balance;
    const result = feed.react(item.id, 'reader', 'validate');
    expect(result.recorded).toBe(true);
    expect(result.rewardTxId).toBeDefined();
    expect(chain.getAccount(authorDid).balance).toBeGreaterThan(balanceBefore);
  });

  it('like mints a smaller reward than validate', async () => {
    expect(REACTION_REWARD.like).toBeLessThan(REACTION_REWARD.validate);
  });

  it('double-react by same agent is rejected', async () => {
    const { news, feed } = makeStack();
    const [item] = await publishItems(news, 1);
    feed.react(item.id, 'alice', 'like');
    const r2 = feed.react(item.id, 'alice', 'like');
    expect(r2.recorded).toBe(false);
    expect(r2.reason).toContain('already reacted');
    expect(r2.reactionCounts.like).toBe(1); // still only 1
  });

  it('different agents can react independently', async () => {
    const { news, feed } = makeStack();
    const [item] = await publishItems(news, 1);
    feed.react(item.id, 'alice', 'like');
    feed.react(item.id, 'bob', 'like');
    const r3 = feed.react(item.id, 'carol', 'like');
    expect(r3.reactionCounts.like).toBe(3);
  });

  it('different reaction kinds are tracked separately', async () => {
    const { news, feed } = makeStack();
    const [item] = await publishItems(news, 1);
    feed.react(item.id, 'alice', 'like');
    feed.react(item.id, 'alice', 'share'); // different kind — allowed
    const counts = feed.react(item.id, 'alice', 'reply').reactionCounts;
    expect(counts.like).toBe(1);
    expect(counts.share).toBe(1);
    expect(counts.reply).toBe(1);
  });

  it('react to unknown item returns not found', () => {
    const { feed } = makeStack();
    const result = feed.react('nonexistent-id', 'alice', 'like');
    expect(result.recorded).toBe(false);
    expect(result.reason).toContain('not found');
  });
});

// ─── Search ───────────────────────────────────────────────────────────────────

describe('FeedService – search', () => {
  it('finds items by keyword in claimedFact', async () => {
    const { news, feed } = makeStack();
    await publishItems(news, 6);
    const { items, total, query } = feed.search('crypto');
    expect(query).toBe('crypto');
    expect(total).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.claimedFact.toLowerCase()).toContain('crypto');
    }
  });

  it('search is case-insensitive', async () => {
    const { news, feed } = makeStack();
    await publishItems(news, 6);
    const lower = feed.search('crypto').total;
    const upper = feed.search('CRYPTO').total;
    expect(lower).toBe(upper);
  });

  it('returns empty results for no match', async () => {
    const { news, feed } = makeStack();
    await publishItems(news, 5);
    const { items, total } = feed.search('xyznonexistent');
    expect(items).toHaveLength(0);
    expect(total).toBe(0);
  });

  it('rejects query shorter than 2 chars', () => {
    const { feed } = makeStack();
    const { items, total } = feed.search('a');
    expect(items).toHaveLength(0);
    expect(total).toBe(0);
  });

  it('search respects limit and offset', async () => {
    const { news, feed } = makeStack();
    // Publish 10 items that all match 'hello'
    for (let i = 0; i < 10; i++) {
      await news.publish({ claimedFact: `hello world ${i}`, source: 'src', claimer: 'alice' });
    }
    const p1 = feed.search('hello', { limit: 4, offset: 0 });
    const p2 = feed.search('hello', { limit: 4, offset: 4 });
    expect(p1.items).toHaveLength(4);
    expect(p2.items).toHaveLength(4);
    expect(p1.total).toBe(10);
  });

  it('finds items by source URL', async () => {
    const { news, feed } = makeStack();
    await news.publish({ claimedFact: 'some fact', source: 'https://reuters.com/article/1', claimer: 'alice' });
    await news.publish({ claimedFact: 'other fact', source: 'https://bbc.com/news/2', claimer: 'bob' });
    const { items } = feed.search('reuters');
    expect(items).toHaveLength(1);
    expect(items[0].source).toContain('reuters');
  });
});

// ─── Trending ─────────────────────────────────────────────────────────────────

describe('FeedService – trending', () => {
  it('returns items ordered by attention', async () => {
    const { news, feed, attention } = makeStack();
    const [item1, item2, item3] = await publishItems(news, 3);
    // Give item2 the most attention
    for (let i = 0; i < 10; i++) {
      attention.record({ itemId: item2.id, agent: `u${i}`, kind: 'validate' });
    }
    for (let i = 0; i < 3; i++) {
      attention.record({ itemId: item1.id, agent: `v${i}`, kind: 'view' });
    }
    const trending = feed.getTrending({ limit: 3 });
    expect(trending[0].id).toBe(item2.id); // most attention
  });

  it('trending returns at most `limit` items', async () => {
    const { news, feed } = makeStack();
    await publishItems(news, 20);
    const trending = feed.getTrending({ limit: 5 });
    expect(trending.length).toBeLessThanOrEqual(5);
  });

  it('empty feed returns empty trending', () => {
    const { feed } = makeStack();
    expect(feed.getTrending()).toHaveLength(0);
  });
});

// ─── SSE notifications ────────────────────────────────────────────────────────

describe('FeedService – SSE notifications', () => {
  it('notifySubscribers writes enriched item to all subscribers', async () => {
    const { news, feed } = makeStack();
    const written: string[] = [];
    const fakeRes = {
      write: (data: string) => { written.push(data); },
    } as any;
    (feed as any).subscribers.add(fakeRes);
    const item = await news.publish({ claimedFact: 'live update', source: 'src', claimer: 'alice' });
    feed.notifySubscribers(item);
    expect(written).toHaveLength(1);
    const parsed = JSON.parse(written[0].replace('data: ', '').trim());
    expect(parsed.event).toBe('new-item');
    expect(parsed.item.claimedFact).toBe('live update');
  });

  it('dead subscriber is removed from the set', () => {
    const { feed } = makeStack();
    const fakeRes = {
      write: () => { throw new Error('broken pipe'); },
    } as any;
    (feed as any).subscribers.add(fakeRes);
    expect((feed as any).subscribers.size).toBe(1);
    feed.notifySubscribers({ id: 'x', claimedFact: 'f', source: 's', claimer: 'c', publicationTime: '', status: 'unverified', anchorId: '', claimTime: '' as any, signature: '', publicKeyPem: '', stateRoot: '', coordinates: [] } as any);
    expect((feed as any).subscribers.size).toBe(0);
  });
});

// ─── enrich ───────────────────────────────────────────────────────────────────

describe('FeedService – enrich', () => {
  it('enrich includes claimerDid when author is registered', async () => {
    const { news, feed, identity } = makeStack();
    const doc = identity.register('alice');
    const item = await news.publish({ claimedFact: 'f', source: 's', claimer: 'alice' });
    const enriched = feed.enrich(item);
    expect(enriched.claimerDid).toBe(doc.did);
  });

  it('enrich sets claimerDid to undefined when author is unregistered', async () => {
    const { news, feed } = makeStack();
    const item = await news.publish({ claimedFact: 'f', source: 's', claimer: 'anon' });
    const enriched = feed.enrich(item);
    expect(enriched.claimerDid).toBeUndefined();
  });
});

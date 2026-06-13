import {
  computePostId,
  validatePost,
  MicroPostStore,
  DaoParamStore,
  DEFAULT_DAO_PARAMS,
  MICRO_POST_SCHEMA,
  type MicroPost,
  type DaoParams,
} from '../../src/integrations/lightrag/micro-post';

// ── helpers ───────────────────────────────────────────────────────────────────

function makePost(overrides: Partial<MicroPost> & { line1?: string; line2?: string; author?: string; ts?: string } = {}): MicroPost {
  const line1 = overrides.line1 ?? 'Hello P2P world';
  const line2 = overrides.line2 ?? '';
  const author = overrides.author ?? 'did:key:z6Mktest';
  const ts = overrides.ts ?? '2026-06-13T00:00:00.000Z';
  const id = overrides.id ?? computePostId(line1, line2, author, ts);
  return {
    schema: MICRO_POST_SCHEMA,
    id,
    line1,
    line2,
    author,
    signature: '',
    ts,
    ...overrides,
  };
}

function futureIso(msFromNow: number): string {
  return new Date(Date.now() + msFromNow).toISOString();
}

// ── 1. computePostId ──────────────────────────────────────────────────────────

describe('computePostId', () => {
  it('returns a 64-char hex string', () => {
    const id = computePostId('a', 'b', 'did:key:z', '2026-01-01T00:00:00Z');
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic', () => {
    const id1 = computePostId('hello', '', 'did:key:z', '2026-01-01T00:00:00Z');
    const id2 = computePostId('hello', '', 'did:key:z', '2026-01-01T00:00:00Z');
    expect(id1).toBe(id2);
  });

  it('changes when any field changes', () => {
    const base = computePostId('hello', '', 'did:key:z', '2026-01-01T00:00:00Z');
    expect(computePostId('hello!', '', 'did:key:z', '2026-01-01T00:00:00Z')).not.toBe(base);
    expect(computePostId('hello', 'world', 'did:key:z', '2026-01-01T00:00:00Z')).not.toBe(base);
    expect(computePostId('hello', '', 'did:key:other', '2026-01-01T00:00:00Z')).not.toBe(base);
  });
});

// ── 2. validatePost ───────────────────────────────────────────────────────────

describe('validatePost', () => {
  it('accepts a valid post', () => {
    expect(validatePost(makePost())).toEqual({ ok: true });
  });

  it('rejects blank line1', () => {
    const p = makePost({ line1: '   ' });
    const v = validatePost({ ...p, id: 'bad' });
    expect(v.ok).toBe(false);
  });

  it('rejects line1 over maxLineLength', () => {
    const p = makePost({ line1: 'x'.repeat(141) });
    const result = validatePost(p);
    expect(result.ok).toBe(false);
    expect((result as any).reason).toMatch(/exceeds/);
  });

  it('rejects line2 over maxLineLength', () => {
    const p = makePost({ line2: 'y'.repeat(141) });
    const result = validatePost(p);
    expect(result.ok).toBe(false);
  });

  it('rejects tampered id', () => {
    const p = makePost();
    const tampered = { ...p, id: p.id.replace('a', 'b').replace('0', '1') };
    const result = validatePost(tampered);
    expect(result.ok).toBe(false);
    expect((result as any).reason).toMatch(/mismatch/);
  });

  it('rejects when requireTtl is true but no ttl provided', () => {
    const params: DaoParams = { ...DEFAULT_DAO_PARAMS, requireTtl: true };
    const result = validatePost(makePost(), params);
    expect(result.ok).toBe(false);
    expect((result as any).reason).toMatch(/require/i);
  });

  it('accepts post with valid TTL', () => {
    const ttl = { expiresAt: futureIso(2 * 60 * 60 * 1_000) };
    const ts = new Date().toISOString();
    const p = makePost({ ts, ttl });
    expect(validatePost(p)).toEqual({ ok: true });
  });

  it('rejects TTL shorter than minTtlMs', () => {
    const ts = new Date().toISOString();
    const ttl = { expiresAt: new Date(Date.now() + 30_000).toISOString() };  // 30 s < 1 h
    const p = makePost({ ts, ttl });
    const result = validatePost(p);
    expect(result.ok).toBe(false);
    expect((result as any).reason).toMatch(/short/i);
  });

  it('rejects already-expired post', () => {
    const ts = '2020-01-01T00:00:00.000Z';
    const ttl = { expiresAt: '2020-01-02T00:00:00.000Z' };
    const p = makePost({ ts, ttl });
    const result = validatePost(p);
    expect(result.ok).toBe(false);
    expect((result as any).reason).toMatch(/expired/);
  });
});

// ── 3. MicroPostStore ─────────────────────────────────────────────────────────

describe('MicroPostStore', () => {
  it('stores and retrieves a post by id', () => {
    const store = new MicroPostStore();
    const post = makePost();
    expect(store.add(post)).toEqual({ ok: true });
    expect(store.get(post.id)).toEqual(post);
  });

  it('add is idempotent', () => {
    const store = new MicroPostStore();
    const post = makePost();
    store.add(post);
    expect(store.add(post)).toEqual({ ok: true });
    expect(store.size()).toBe(1);
  });

  it('rejects invalid posts', () => {
    const store = new MicroPostStore();
    const bad = { ...makePost(), id: 'notahash' };
    const result = store.add(bad);
    expect(result.ok).toBe(false);
  });

  it('evicts LRU when over maxStoredPosts', () => {
    const store = new MicroPostStore({ ...DEFAULT_DAO_PARAMS, maxStoredPosts: 3 });
    const posts = Array.from({ length: 4 }, (_, i) => {
      const ts = new Date(Date.now() + i).toISOString();
      return makePost({ line1: `post ${i}`, ts });
    });
    posts.forEach(p => store.add(p));
    expect(store.size()).toBe(3);
    expect(store.get(posts[0].id)).toBeUndefined();  // oldest evicted
    expect(store.get(posts[3].id)).toBeDefined();
  });

  it('returns undefined and evicts expired TTL post on get()', () => {
    const store = new MicroPostStore();
    const ts = '2020-06-01T00:00:00.000Z';
    // Bypass expiry validation by directly inserting
    const post = makePost({ ts });
    (store as any).posts.set(post.id, {
      ...post,
      ttl: { expiresAt: '2020-06-01T01:00:00.000Z' },
    });
    (store as any).order.push(post.id);

    expect(store.get(post.id)).toBeUndefined();
    expect(store.size()).toBe(0);
  });

  it('list() returns newest first and excludes expired', () => {
    const store = new MicroPostStore();
    const a = makePost({ line1: 'first', ts: '2026-01-01T00:00:00.000Z' });
    const b = makePost({ line1: 'second', ts: '2026-01-02T00:00:00.000Z' });
    store.add(a);
    store.add(b);
    const result = store.list(10, 0);
    expect(result[0].id).toBe(b.id);
    expect(result[1].id).toBe(a.id);
  });

  it('setChainAnchor attaches anchor to TTL post', () => {
    const store = new MicroPostStore();
    const ts = new Date().toISOString();
    const ttl = { expiresAt: futureIso(2 * 60 * 60 * 1_000) };
    const post = makePost({ ts, ttl });
    store.add(post);

    const ok = store.setChainAnchor(post.id, { network: 'vpc-mainnet', txHash: '0xabc', minedAt: ts });
    expect(ok).toBe(true);
    expect(store.get(post.id)?.ttl?.chainAnchor?.txHash).toBe('0xabc');
  });

  it('setChainAnchor returns false for post without TTL', () => {
    const store = new MicroPostStore();
    const post = makePost();
    store.add(post);
    expect(store.setChainAnchor(post.id, { network: 'x', txHash: 'y' })).toBe(false);
  });
});

// ── 4. DaoParamStore ──────────────────────────────────────────────────────────

describe('DaoParamStore', () => {
  function makeDao() {
    const store = new MicroPostStore();
    const dao = new DaoParamStore(store);
    return { store, dao };
  }

  it('propose() creates an open proposal', () => {
    const { dao } = makeDao();
    const p = dao.propose('did:key:z', { maxLineLength: 200 }, 'more room');
    expect(p.status).toBe('open');
    expect(p.changes.maxLineLength).toBe(200);
  });

  it('vote yes with quorum applies the param change', () => {
    const { store, dao } = makeDao();
    dao.registerVoter('did:key:a');
    dao.registerVoter('did:key:b');
    const p = dao.propose('did:key:a', { maxLineLength: 200 }, 'test');
    dao.vote(p.id, 'did:key:a', true);
    dao.vote(p.id, 'did:key:b', true);
    expect(store.params.maxLineLength).toBe(200);
    expect(dao.getProposal(p.id)?.status).toBe('accepted');
  });

  it('vote no with quorum rejects the proposal', () => {
    const { store, dao } = makeDao();
    dao.registerVoter('did:key:a');
    dao.registerVoter('did:key:b');
    const p = dao.propose('did:key:a', { maxLineLength: 200 }, 'test');
    dao.vote(p.id, 'did:key:a', false);
    dao.vote(p.id, 'did:key:b', false);
    expect(store.params.maxLineLength).toBe(DEFAULT_DAO_PARAMS.maxLineLength);
    expect(dao.getProposal(p.id)?.status).toBe('rejected');
  });

  it('duplicate vote is rejected', () => {
    const { dao } = makeDao();
    // register 3 voters so 1 vote alone does not reach 51% quorum
    dao.registerVoter('did:key:a');
    dao.registerVoter('did:key:b');
    dao.registerVoter('did:key:c');
    const p = dao.propose('did:key:a', { maxLineLength: 200 }, 'test');
    dao.vote(p.id, 'did:key:a', true);
    const result = dao.vote(p.id, 'did:key:a', true);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/already voted/);
  });

  it('vote on non-existent proposal returns error', () => {
    const { dao } = makeDao();
    const result = dao.vote('ghost', 'did:key:a', true);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/not found/);
  });

  it('listProposals filters by status', () => {
    const { dao } = makeDao();
    dao.propose('did:key:a', { maxLineLength: 200 }, 'p1');
    dao.propose('did:key:a', { maxLineLength: 300 }, 'p2');
    expect(dao.listProposals('open').length).toBe(2);
    expect(dao.listProposals('accepted').length).toBe(0);
  });
});

// ── 5. 2-line contract ────────────────────────────────────────────────────────

describe('2-line contract', () => {
  it('maxLines is always 2', () => {
    expect(DEFAULT_DAO_PARAMS.maxLines).toBe(2);
    const store = new MicroPostStore();
    expect(store.params.maxLines).toBe(2);
  });

  it('a post with only line1 is valid (line2 defaults to empty string)', () => {
    const p = makePost({ line1: 'one liner', line2: '' });
    expect(validatePost(p)).toEqual({ ok: true });
  });

  it('a post with both lines is valid', () => {
    const p = makePost({ line1: 'line one', line2: 'line two' });
    expect(validatePost(p)).toEqual({ ok: true });
  });
});

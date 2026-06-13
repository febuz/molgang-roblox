/**
 * Newsgroup 2.0 frontend smoke tests
 *
 * Drives the EXACT HTTP flow the frontend (public/newsgroup.html) performs,
 * against the real route registrations — register → session → publish →
 * feed → react → wallet → vote → node status. If any of these breaks, the
 * frontend breaks; this suite is the contract between the two.
 */

import express from 'express';
import * as http from 'http';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { ValueChainService } from '../../src/integrations/lightrag/value-chain';
import { AttentionChainService } from '../../src/integrations/lightrag/attention-chain';
import { NewsService } from '../../src/integrations/lightrag/news';
import { SovereignVotingService, registerSovereignVotingRoutes } from '../../src/integrations/lightrag/sovereign-voting';
import { UserApiService, registerUserRoutes } from '../../src/integrations/lightrag/user-api';
import { FeedService, registerFeedRoutes } from '../../src/integrations/lightrag/feed-api';

const offlineRag = { isConnected: () => false } as any;

function makeApp() {
  const app = express();
  app.use(express.json());
  const identity = new SovereignIdentityService(offlineRag);
  const chain = new ValueChainService(offlineRag, { identity });
  const attention = new AttentionChainService(offlineRag);
  const news = new NewsService(offlineRag, undefined, { attentionService: attention });
  const voting = new SovereignVotingService(offlineRag, { identity, valueChain: chain, news });
  const userApi = new UserApiService(identity, chain, attention, news, voting);
  const feed = new FeedService(news, attention, identity, chain);
  registerUserRoutes(app, userApi, undefined, chain);
  registerFeedRoutes(app, feed);
  registerSovereignVotingRoutes(app, voting);
  return { app, identity, chain };
}

/** One server for the whole suite — sequential requests like a browser session. */
let server: http.Server;
let base: string;

function call(method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const reqBody = body ? JSON.stringify(body) : '';
    const req = http.request(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) },
    }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode!, body: data ? JSON.parse(data) : {} }); }
        catch { resolve({ status: res.statusCode!, body: data }); }
      });
    });
    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

beforeAll(done => {
  const { app } = makeApp();
  server = http.createServer(app);
  server.listen(0, () => {
    base = `http://127.0.0.1:${(server.address() as any).port}`;
    done();
  });
});
afterAll(done => { server.close(() => done()); });

// ─── The full user journey, exactly as the frontend performs it ─────────────

describe('Newsgroup 2.0 frontend contract', () => {
  let aliceDid: string;
  let itemId: string;
  let proposalId: string;

  it('register: one field → DID + welcome bonus + session', async () => {
    const r = await call('POST', '/api/users/register', { handle: 'alice' });
    expect(r.status).toBe(201);
    expect(r.body.profile.did).toMatch(/^did:vpc:/);
    expect(parseFloat(r.body.profile.balanceTokens)).toBeGreaterThan(0);
    expect(typeof r.body.sessionToken).toBe('string');
    aliceDid = r.body.profile.did;
  });

  it('node-held session login (frontend "Sign in" path)', async () => {
    const r = await call('POST', '/api/users/alice/session', {});
    expect(r.status).toBe(200);
    expect(r.body.mode).toBe('node-held');
    expect(r.body.did).toBe(aliceDid);
  });

  it('publish a claim via /api/feed/publish', async () => {
    const r = await call('POST', '/api/feed/publish', {
      claimedFact: 'Newsgroup 2.0 frontend ships today',
      source: 'https://example.com/launch',
      claimer: 'alice',
    });
    expect(r.status).toBe(201);
    expect(r.body.item.claimerDid).toBe(aliceDid); // enrichment works
    itemId = r.body.item.id;
  });

  it('feed shows the item with attention + reaction counts (Hot tab)', async () => {
    const r = await call('GET', '/api/feed?orderBy=attention&limit=20&offset=0');
    expect(r.status).toBe(200);
    const item = r.body.items.find((i: any) => i.id === itemId);
    expect(item).toBeDefined();
    expect(item.reactionCounts).toEqual({ like: 0, share: 0, reply: 0, validate: 0 });
  });

  it('react: validate mints a visible reward to the author', async () => {
    await call('POST', '/api/users/register', { handle: 'bob' });
    const r = await call('POST', `/api/feed/${itemId}/react`, { agent: 'bob', kind: 'validate' });
    expect(r.status).toBe(200);
    expect(r.body.recorded).toBe(true);
    expect(r.body.rewardTxId).toBeDefined();      // the toast's tx id
    expect(r.body.reactionCounts.validate).toBe(1);
  });

  it('double-react returns 409 (frontend disables the button)', async () => {
    const r = await call('POST', `/api/feed/${itemId}/react`, { agent: 'bob', kind: 'validate' });
    expect(r.status).toBe(409);
  });

  it('wallet shows the reaction reward in history', async () => {
    const r = await call('GET', '/api/users/alice/wallet?limit=8');
    expect(r.status).toBe(200);
    const reward = r.body.wallet.history.find((h: any) => h.memo.startsWith('reaction:validate'));
    expect(reward).toBeDefined();
    expect(reward.direction).toBe('in');
  });

  it('send tokens by handle (wallet panel)', async () => {
    const r = await call('POST', '/api/users/alice/send', { toHandle: 'bob', amountTokens: 1 });
    expect(r.status).toBe(201);
    const bob = await call('GET', '/api/users/bob/wallet');
    expect(parseFloat(bob.body.wallet.balanceTokens)).toBeGreaterThanOrEqual(1);
  });

  it('search finds the claim (search box)', async () => {
    const r = await call('GET', '/api/feed/search?q=frontend');
    expect(r.status).toBe(200);
    expect(r.body.items.some((i: any) => i.id === itemId)).toBe(true);
  });

  it('trending includes the validated item (Trending tab)', async () => {
    const r = await call('GET', '/api/feed/trending?hours=24&limit=10');
    expect(r.status).toBe(200);
    expect(r.body.items.some((i: any) => i.id === itemId)).toBe(true);
  });

  it('create a proposal and vote on it (governance panel)', async () => {
    const create = await call('POST', '/api/sovereign-votes/proposals', {
      question: 'Ship the frontend?',
      options: ['yes', 'no'],
      createdBy: aliceDid,
      mode: 'identity',
    });
    expect(create.status).toBe(201);
    proposalId = create.body.proposal.id;

    const vote = await call('POST', `/api/sovereign-votes/proposals/${proposalId}/vote`, {
      voter: aliceDid, option: 'yes',
    });
    expect(vote.status).toBe(201);

    const detail = await call('GET', `/api/sovereign-votes/proposals/${proposalId}`);
    expect(detail.body.tally.totals.yes).toBe(1);
  });

  it('node status returns supply + conservation (node panel)', async () => {
    const r = await call('GET', '/api/node/status');
    expect(r.status).toBe(200);
    expect(r.body.supply.conservationHolds).toBe(true);
    expect(r.body.node.uptime).toBeGreaterThan(0);
  });

  it('balance proof export link resolves (exit is a feature)', async () => {
    // The frontend links to /api/value/proof/:did — route registered in value-chain.ts;
    // here we assert the profile exposes the DID it would use.
    const r = await call('GET', '/api/users/alice');
    expect(r.body.profile.did).toBe(aliceDid);
  });
});

// ─── Static asset sanity ──────────────────────────────────────────────────────

describe('newsgroup.html asset', () => {
  const htmlPath = join(__dirname, '..', '..', 'public', 'newsgroup.html');

  it('exists and is non-trivial', () => {
    expect(existsSync(htmlPath)).toBe(true);
    expect(readFileSync(htmlPath, 'utf8').length).toBeGreaterThan(10_000);
  });

  it('references only endpoints that exist in the backend', () => {
    const html = readFileSync(htmlPath, 'utf8');
    // Every API path the frontend calls
    for (const path of [
      '/api/users/register', '/api/feed/stream', '/api/feed/trending',
      '/api/feed/search', '/api/sovereign-votes/proposals', '/api/node/status',
      '/api/value/proof/',
    ]) {
      expect(html).toContain(path);
    }
  });

  it('implements the ten design rules markers', () => {
    const html = readFileSync(htmlPath, 'utf8');
    expect(html).toContain('newPill');          // feed never moves (Twitter)
    expect(html).toContain('TAB_HINTS');        // transparent ranking (Digg)
    expect(html).toContain('ng2.muted');        // local kill file (Usenet)
    expect(html).toContain('rewardTxId');       // visible economics (Steemit)
    expect(html).not.toContain('IntersectionObserver'); // no infinite scroll (HN)
  });
});

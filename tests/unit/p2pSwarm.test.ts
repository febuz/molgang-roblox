/**
 * Unit tests for p2p-swarm.ts — BitTorrent/Bitcoin/gossipsub lessons.
 * All offline — no network.
 */

import {
  P2PSwarm,
  SWARM_DEFAULTS,
  registerSwarmRoutes,
} from '../../src/integrations/lightrag/p2p-swarm';
import express from 'express';
import http from 'http';

async function callRoute(
  app: express.Express,
  method: 'get' | 'post',
  path: string,
  body?: any,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      const reqBody = body ? JSON.stringify(body) : '';
      const req = http.request(`http://127.0.0.1:${port}${path}`, {
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) },
      }, (res) => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode ?? 200, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode ?? 200, body: data }); }
        });
      });
      req.on('error', e => { server.close(); reject(e); });
      if (reqBody) req.write(reqBody);
      req.end();
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Peer table + PEX (lesson 6 — eclipse resistance)
// ──────────────────────────────────────────────────────────────────────────────

describe('peer table + PEX', () => {
  it('adds config peers, rejects self and duplicates', () => {
    const swarm = new P2PSwarm({ myUrl: 'http://me:3100' });
    expect(swarm.addPeer('http://a:3100')).toBe(true);
    expect(swarm.addPeer('http://a:3100')).toBe(false);  // duplicate
    expect(swarm.addPeer('http://me:3100')).toBe(false); // self
    expect(swarm.peerUrls()).toEqual(['http://a:3100']);
  });

  it('caps the peer table at maxPeers', () => {
    const swarm = new P2PSwarm({ maxPeers: 3 });
    for (let i = 0; i < 5; i++) swarm.addPeer(`http://p${i}:3100`);
    expect(swarm.peerUrls()).toHaveLength(3);
  });

  it('PEX accepts at most pexPerSource new peers per offer (eclipse defense)', () => {
    const swarm = new P2PSwarm(); // default pexPerSource = 2
    const offered = ['http://s1:1', 'http://s2:1', 'http://s3:1', 'http://s4:1'];
    const accepted = swarm.offerPeers('http://attacker:1', offered);
    expect(accepted).toHaveLength(SWARM_DEFAULTS.pexPerSource);
    expect(swarm.peerUrls()).toHaveLength(2);
  });

  it('PEX rejects non-http urls', () => {
    const swarm = new P2PSwarm();
    const accepted = swarm.offerPeers('http://x:1', ['ftp://evil:21', 'not-a-url', 'http://ok:1']);
    expect(accepted).toEqual(['http://ok:1']);
  });

  it('PEX-discovered peers start choked (must earn a slot)', () => {
    const swarm = new P2PSwarm();
    swarm.offerPeers('http://x:1', ['http://newbie:1']);
    expect(swarm.getPeer('http://newbie:1')!.choked).toBe(true);
    expect(swarm.getPeer('http://newbie:1')!.source).toBe('pex');
  });

  it('knownPeers samples non-banned peers up to the limit', () => {
    const swarm = new P2PSwarm();
    for (let i = 0; i < 12; i++) swarm.addPeer(`http://p${i}:1`);
    expect(swarm.knownPeers(5)).toHaveLength(5);
    expect(swarm.knownPeers()).toHaveLength(SWARM_DEFAULTS.pexSampleSize);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Scoring + ban (lesson 5)
// ──────────────────────────────────────────────────────────────────────────────

describe('scoring and banning', () => {
  it('successful rounds raise the score, failures lower it', () => {
    const swarm = new P2PSwarm();
    swarm.addPeer('http://a:1');
    swarm.recordPushOk('http://a:1', 10);
    swarm.recordPullOk('http://a:1', 5);
    expect(swarm.getPeer('http://a:1')!.score).toBeGreaterThan(2);
    swarm.recordPushFail('http://a:1');
    swarm.recordPushFail('http://a:1');
    expect(swarm.getPeer('http://a:1')!.score).toBeLessThan(2.6);
  });

  it('useful-nodes bonus is capped (cannot whitewash with one giant payload)', () => {
    const swarm = new P2PSwarm();
    swarm.addPeer('http://a:1');
    swarm.recordPullOk('http://a:1', 1_000_000);
    expect(swarm.getPeer('http://a:1')!.score).toBeLessThanOrEqual(3);
  });

  it('invalid payloads carry the steepest penalty and lead to a ban', () => {
    const swarm = new P2PSwarm();
    swarm.addPeer('http://evil:1');
    for (let i = 0; i < 5; i++) swarm.recordInvalid('http://evil:1');
    const p = swarm.getPeer('http://evil:1')!;
    expect(p.banned).toBe(true);
    expect(p.bannedUntil).not.toBeNull();
  });

  it('banned peers are never selected', () => {
    const swarm = new P2PSwarm();
    swarm.addPeer('http://evil:1');
    for (let i = 0; i < 5; i++) swarm.recordInvalid('http://evil:1');
    swarm.rechoke();
    expect(swarm.selectPeer()).toBeNull();
  });

  it('expired bans are lifted with a clean slate on rechoke', () => {
    const swarm = new P2PSwarm({ banCooldownMs: -1 }); // expires immediately
    swarm.addPeer('http://flaky:1');
    for (let i = 0; i < 5; i++) swarm.recordInvalid('http://flaky:1');
    expect(swarm.getPeer('http://flaky:1')!.banned).toBe(true);
    swarm.rechoke();
    const p = swarm.getPeer('http://flaky:1')!;
    expect(p.banned).toBe(false);
    expect(p.score).toBe(0);
  });

  it('scores decay every rechoke (old sins fade)', () => {
    const swarm = new P2PSwarm();
    swarm.addPeer('http://a:1');
    swarm.recordPushOk('http://a:1', 1);
    const before = swarm.getPeer('http://a:1')!.score;
    swarm.rechoke();
    expect(swarm.getPeer('http://a:1')!.score).toBeLessThan(before);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Tit-for-tat choking + optimistic unchoke (lessons 1 + 2)
// ──────────────────────────────────────────────────────────────────────────────

describe('choking', () => {
  it('unchokes the top reciprocating peers, chokes the rest', () => {
    const swarm = new P2PSwarm({ unchokeSlots: 2, optimisticInterval: 999 });
    for (const u of ['http://good:1', 'http://ok:1', 'http://meh:1', 'http://bad:1']) swarm.addPeer(u);
    // good reciprocates heavily, ok a bit, meh nothing, bad fails
    swarm.recordPullOk('http://good:1', 20);
    swarm.recordPullOk('http://good:1', 20);
    swarm.recordPullOk('http://ok:1', 5);
    swarm.recordPushFail('http://bad:1');
    swarm.rechoke();
    expect(swarm.getPeer('http://good:1')!.choked).toBe(false);
    expect(swarm.getPeer('http://ok:1')!.choked).toBe(false);
    expect(swarm.getPeer('http://meh:1')!.choked).toBe(true);
    expect(swarm.getPeer('http://bad:1')!.choked).toBe(true);
  });

  it('reciprocity bonus: a giving peer outranks a silent sink with equal score', () => {
    const swarm = new P2PSwarm();
    swarm.addPeer('http://giver:1');
    swarm.addPeer('http://sink:1');
    const giver = swarm.getPeer('http://giver:1')!;
    const sink = swarm.getPeer('http://sink:1')!;
    giver.nodesReceived = 50; giver.nodesSent = 50;   // ratio 1
    sink.nodesReceived = 0; sink.nodesSent = 100;     // free-rider
    expect(swarm.effectiveRank(giver)).toBeGreaterThan(swarm.effectiveRank(sink));
  });

  it('optimistic unchoke gives one choked peer a slot every Nth rechoke', () => {
    const swarm = new P2PSwarm({ unchokeSlots: 1, optimisticInterval: 2 });
    for (const u of ['http://top:1', 'http://chump1:1', 'http://chump2:1']) swarm.addPeer(u);
    swarm.recordPullOk('http://top:1', 20);
    swarm.rechoke(); // round 1: no optimistic
    expect(swarm.getAllPeers().filter(p => p.optimistic)).toHaveLength(0);
    swarm.rechoke(); // round 2: optimistic slot granted
    const optimistic = swarm.getAllPeers().filter(p => p.optimistic);
    expect(optimistic).toHaveLength(1);
    expect(optimistic[0].choked).toBe(false);
    expect(['http://chump1:1', 'http://chump2:1']).toContain(optimistic[0].url);
  });

  it('selectPeer falls back to any non-banned peer before the first rechoke', () => {
    const swarm = new P2PSwarm();
    swarm.addPeer('http://only:1');
    expect(swarm.selectPeer()).toBe('http://only:1');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Rarest-first + endgame (lessons 3 + 4)
// ──────────────────────────────────────────────────────────────────────────────

describe('replication tracking', () => {
  it('sortRarestFirst orders ascending by known replication', () => {
    const swarm = new P2PSwarm();
    swarm.recordReplicated('common', 'http://a:1');
    swarm.recordReplicated('common', 'http://b:1');
    swarm.recordReplicated('semi', 'http://a:1');
    const sorted = swarm.sortRarestFirst([{ id: 'common' }, { id: 'semi' }, { id: 'rare' }]);
    expect(sorted.map(s => s.id)).toEqual(['rare', 'semi', 'common']);
  });

  it('replication counts distinct peers only', () => {
    const swarm = new P2PSwarm();
    swarm.recordReplicated('x', 'http://a:1');
    swarm.recordReplicated('x', 'http://a:1');
    expect(swarm.replicationOf('x')).toBe(1);
  });

  it('rarest lists the least-replicated items first', () => {
    const swarm = new P2PSwarm();
    swarm.recordReplicated('popular', 'http://a:1');
    swarm.recordReplicated('popular', 'http://b:1');
    swarm.recordReplicated('lonely', 'http://a:1');
    const rarest = swarm.rarest(10);
    expect(rarest[0].itemId).toBe('lonely');
  });

  it('endgame: few unreplicated items fan out to multiple unchoked peers', () => {
    const swarm = new P2PSwarm({ unchokeSlots: 3, endgameThreshold: 5, optimisticInterval: 999 });
    for (const u of ['http://a:1', 'http://b:1', 'http://c:1']) {
      swarm.addPeer(u);
      swarm.recordPullOk(u, 5);
    }
    swarm.rechoke();
    const targets = swarm.selectPushTargets(['fresh_1', 'fresh_2']); // both replication 0
    expect(targets.length).toBeGreaterThan(1);
  });

  it('no endgame for well-replicated deltas: single target', () => {
    const swarm = new P2PSwarm({ optimisticInterval: 999 });
    for (const u of ['http://a:1', 'http://b:1', 'http://c:1']) {
      swarm.addPeer(u);
      swarm.recordPullOk(u, 5);
    }
    swarm.recordReplicated('old_1', 'http://a:1');
    swarm.rechoke();
    const targets = swarm.selectPushTargets(['old_1']);
    expect(targets).toHaveLength(1);
  });

  it('no endgame above the threshold: single target', () => {
    const swarm = new P2PSwarm({ endgameThreshold: 2, optimisticInterval: 999 });
    for (const u of ['http://a:1', 'http://b:1']) {
      swarm.addPeer(u);
      swarm.recordPullOk(u, 5);
    }
    swarm.rechoke();
    const targets = swarm.selectPushTargets(['n1', 'n2', 'n3', 'n4']);
    expect(targets).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Stats + REST
// ──────────────────────────────────────────────────────────────────────────────

describe('stats and REST API', () => {
  it('getStats aggregates table state', () => {
    const swarm = new P2PSwarm();
    swarm.addPeer('http://a:1');
    swarm.offerPeers('http://a:1', ['http://b:1']);
    const stats = swarm.getStats();
    expect(stats.peers).toBe(2);
    expect(stats.fromPex).toBe(1);
  });

  it('GET /api/swarm/peers returns ranked peer detail', async () => {
    const swarm = new P2PSwarm();
    swarm.addPeer('http://a:1');
    swarm.recordPullOk('http://a:1', 3);
    const app = express();
    registerSwarmRoutes(app, swarm);
    const { body } = await callRoute(app, 'get', '/api/swarm/peers');
    expect(body.peersDetail).toHaveLength(1);
    expect(body.peersDetail[0].effectiveRank).toBeGreaterThan(0);
  });

  it('GET /api/swarm/replication returns the rarest items', async () => {
    const swarm = new P2PSwarm();
    swarm.recordReplicated('item_1', 'http://a:1');
    const app = express();
    registerSwarmRoutes(app, swarm);
    const { body } = await callRoute(app, 'get', '/api/swarm/replication');
    expect(body.rarest[0].itemId).toBe('item_1');
  });

  it('POST /api/swarm/peers adds a peer (409 on duplicate, 400 on junk)', async () => {
    const swarm = new P2PSwarm();
    const app = express();
    app.use(express.json());
    registerSwarmRoutes(app, swarm);
    expect((await callRoute(app, 'post', '/api/swarm/peers', { url: 'http://new:1' })).status).toBe(201);
    expect((await callRoute(app, 'post', '/api/swarm/peers', { url: 'http://new:1' })).status).toBe(409);
    expect((await callRoute(app, 'post', '/api/swarm/peers', { url: 'junk' })).status).toBe(400);
  });
});

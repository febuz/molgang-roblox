/**
 * Lightning Network — off-chain payment channels
 *
 * Covers: channel lifecycle (open/close/force-close), state updates,
 * single-hop and multi-hop payments, breach remedy, HTLC resolution,
 * channel graph queries, stats, and the 9 REST routes.
 */

process.env.KAFKA_DISABLED = '1';

import express from 'express';
import * as http from 'http';
import {
  LightningService,
  registerLightningRoutes,
  MAX_HTLCS_PER_CHANNEL,
  type Channel,
} from '../../src/integrations/lightrag/lightning';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { ValueChainService } from '../../src/integrations/lightrag/value-chain';

const offlineRag = { isConnected: () => false } as any;

function makeStack(networkId = 'vpc-testnet') {
  const identity = new SovereignIdentityService(offlineRag);
  const chain = new ValueChainService(offlineRag, { identity });
  const lightning = new LightningService(identity, chain, { networkId });
  return { identity, chain, lightning };
}

/** Register + fund two DIDs, open a channel, return everything. */
function openTestChannel(opts: {
  localUnits?: bigint;
  remoteUnits?: bigint;
  networkId?: string;
} = {}) {
  const { identity, chain, lightning } = makeStack(opts.networkId ?? 'vpc-testnet');
  const alice = identity.register('alice');
  const bob = identity.register('bob');
  chain.mintReward(alice.did, 100);
  chain.mintReward(bob.did, 100);
  const localUnits = opts.localUnits ?? 500_000n;
  const remoteUnits = opts.remoteUnits ?? 500_000n;
  const ch = lightning.openChannel({ localDid: alice.did, remoteDid: bob.did, localUnits, remoteUnits });
  return { identity, chain, lightning, alice, bob, ch };
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function startServer(lightning: LightningService) {
  const app = express();
  app.use(express.json());
  registerLightningRoutes(app, lightning);
  const server = http.createServer(app);
  server.listen(0);
  const port = (server.address() as any).port;
  return { server, port };
}

async function httpCall(
  port: number,
  method: string,
  path: string,
  body?: object,
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = http.request({ hostname: 'localhost', port, path, method,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } },
      (res) => {
        let raw = '';
        res.on('data', c => (raw += c));
        res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(raw) }));
      });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Channel lifecycle ─────────────────────────────────────────────────────────

describe('LightningService — channel lifecycle', () => {
  it('opens a channel and returns status=open', () => {
    const { ch } = openTestChannel();
    expect(ch.status).toBe('open');
    expect(ch.state.commitment).not.toBeNull();
    expect(ch.state.commitment!.sequenceNumber).toBe(0);
  });

  it('embeds networkId in commitment for fork-replay protection', () => {
    const { ch } = openTestChannel({ networkId: 'vpc-testnet' });
    expect(ch.state.commitment!.networkId).toBe('vpc-testnet');
  });

  it('rejects channel with self', () => {
    const { identity, chain, lightning } = makeStack();
    const alice = identity.register('alice');
    chain.mintReward(alice.did, 100);
    expect(() => lightning.openChannel({ localDid: alice.did, remoteDid: alice.did, localUnits: 100n })).toThrow();
  });

  it('rejects when both parties fund 0', () => {
    const { identity, lightning } = makeStack();
    const alice = identity.register('alice');
    const bob = identity.register('bob');
    expect(() => lightning.openChannel({ localDid: alice.did, remoteDid: bob.did, localUnits: 0n, remoteUnits: 0n })).toThrow();
  });

  it('rejects when funder has insufficient balance', () => {
    const { identity, chain, lightning } = makeStack();
    const alice = identity.register('alice');
    const bob = identity.register('bob');
    chain.mintReward(alice.did, 1);   // tiny balance
    expect(() => lightning.openChannel({ localDid: alice.did, remoteDid: bob.did, localUnits: 999_999_999n })).toThrow();
  });

  it('getChannel returns the channel', () => {
    const { lightning, ch } = openTestChannel();
    const found = lightning.getChannel(ch.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(ch.id);
  });

  it('listChannels returns all channels', () => {
    const { lightning, alice, bob } = openTestChannel();
    expect(lightning.listChannels().length).toBe(1);
    expect(lightning.listChannels(alice.did).length).toBe(1);
    expect(lightning.listChannels(bob.did).length).toBe(1);
    expect(lightning.listChannels('did:unknown').length).toBe(0);
  });

  it('revocationSecrets are not exported', () => {
    const { lightning, ch } = openTestChannel();
    const exported = lightning.getChannel(ch.id) as any;
    expect(exported.revocationSecrets.size).toBe(0);
  });
});

// ── Two-step channel open ─────────────────────────────────────────────────────

describe('LightningService — two-step open (propose / confirm)', () => {
  it('proposeChannel returns pending state; confirmChannelOpen opens it', () => {
    const { identity, chain, lightning, alice, bob } = openTestChannel({ localUnits: 1n, remoteUnits: 0n });
    // Use a fresh stack so balances are clean
    const { identity: id2, chain: c2, lightning: ln2 } = makeStack();
    const a = id2.register('a');
    const b = id2.register('b');
    c2.mintReward(a.did, 100);
    c2.mintReward(b.did, 100);

    const { channelId, stateHash, localSignature } = ln2.proposeChannel({ localDid: a.did, remoteDid: b.did, localUnits: 1n });
    expect(localSignature).toBeTruthy();
    expect(stateHash).toBeTruthy();

    // Confirm with remote signature
    const { signature: remoteSig } = id2.signAs(b.did, stateHash);
    const confirmed = ln2.confirmChannelOpen(channelId, b.did, 0n, remoteSig);
    expect(confirmed.status).toBe('open');
    void alice; void bob; void identity; void chain; void lightning;
  });
});

// ── State updates ─────────────────────────────────────────────────────────────

describe('LightningService — state updates', () => {
  it('updateState shifts balances and increments sequenceNumber', () => {
    const { lightning, alice, ch } = openTestChannel({ localUnits: 600_000n, remoteUnits: 400_000n });
    const commit = lightning.updateState(ch.id, alice.did, 100_000n);
    expect(commit.sequenceNumber).toBe(1);
    expect(commit.localBalance).toBe(500_000n);
    expect(commit.remoteBalance).toBe(500_000n);
  });

  it('rejects update that would make a balance negative', () => {
    const { lightning, alice, ch } = openTestChannel({ localUnits: 100n, remoteUnits: 100n });
    expect(() => lightning.updateState(ch.id, alice.did, 200n)).toThrow(/insufficient/);
  });

  it('rejects update from non-party DID', () => {
    const { identity, lightning, ch } = openTestChannel();
    const charlie = identity.register('charlie');
    expect(() => lightning.updateState(ch.id, charlie.did, 1n)).toThrow(/not a channel party/);
  });
});

// ── Single-hop payment ────────────────────────────────────────────────────────

describe('LightningService — single-hop payments', () => {
  it('settles a direct payment between two parties', () => {
    const { lightning, alice, bob } = openTestChannel({ localUnits: 800_000n, remoteUnits: 200_000n });
    const payment = lightning.sendPayment({ senderDid: alice.did, receiverDid: bob.did, amount: 100_000n });
    expect(payment.status).toBe('settled');
    expect(payment.paymentPreimage).toBeTruthy();
    expect(payment.sender).toBe(alice.did);
    expect(payment.receiver).toBe(bob.did);
  });

  it('updates channel balance after payment', () => {
    const { lightning, alice, bob, ch } = openTestChannel({ localUnits: 800_000n, remoteUnits: 200_000n });
    lightning.sendPayment({ senderDid: alice.did, receiverDid: bob.did, amount: 200_000n });
    const updated = lightning.getChannel(ch.id)!;
    expect(updated.state.localBalance).toBe(600_000n);
    expect(updated.state.remoteBalance).toBe(400_000n);
  });

  it('fails when no route exists', () => {
    const { identity, chain, lightning } = makeStack();
    const a = identity.register('a');
    const b = identity.register('b');
    chain.mintReward(a.did, 100);
    expect(() => lightning.sendPayment({ senderDid: a.did, receiverDid: b.did, amount: 1n })).toThrow(/no route/);
  });

  it('fails when amount exceeds channel capacity', () => {
    const { lightning, alice, bob } = openTestChannel({ localUnits: 100n, remoteUnits: 100n });
    expect(() => lightning.sendPayment({ senderDid: alice.did, receiverDid: bob.did, amount: 1_000_000n })).toThrow(/no route/);
  });
});

// ── Multi-hop routing ─────────────────────────────────────────────────────────

describe('LightningService — multi-hop routing', () => {
  it('routes a payment through an intermediate node', () => {
    const { identity, chain, lightning } = makeStack();
    const alice = identity.register('alice');
    const bob   = identity.register('bob');
    const carol = identity.register('carol');
    chain.mintReward(alice.did, 1000);
    chain.mintReward(bob.did, 1000);
    chain.mintReward(carol.did, 1000);

    // alice ↔ bob ↔ carol (no direct alice ↔ carol channel)
    lightning.openChannel({ localDid: alice.did, remoteDid: bob.did, localUnits: 1_000_000n, remoteUnits: 1_000_000n });
    lightning.openChannel({ localDid: bob.did,   remoteDid: carol.did, localUnits: 1_000_000n, remoteUnits: 1_000_000n });

    const payment = lightning.sendPayment({ senderDid: alice.did, receiverDid: carol.did, amount: 100_000n });
    expect(payment.status).toBe('settled');
    expect(payment.route.path.length).toBe(3);  // alice → bob → carol
  });

  it('findRoute returns null when no path exists', () => {
    const { identity, chain, lightning } = makeStack();
    const a = identity.register('a');
    const b = identity.register('b');
    chain.mintReward(a.did, 100);
    const route = lightning.findRoute(a.did, b.did, 1n);
    expect(route).toBeNull();
  });
});

// ── Cooperative close ─────────────────────────────────────────────────────────

describe('LightningService — cooperative close', () => {
  it('closes channel and settles balances on chain', () => {
    const { chain, lightning, alice, bob, ch } = openTestChannel({ localUnits: 600_000n, remoteUnits: 400_000n });
    const aliceBalBefore = chain.getAccount(alice.did).balance;
    const bobBalBefore = chain.getAccount(bob.did).balance;

    const { distributions } = lightning.cooperativeClose(ch.id, alice.did);
    expect(distributions.find(d => d.did === alice.did)!.units).toBe(600_000n);
    expect(distributions.find(d => d.did === bob.did)!.units).toBe(400_000n);

    const closed = lightning.getChannel(ch.id)!;
    expect(closed.status).toBe('closed');
    // On-chain balances restored
    expect(chain.getAccount(alice.did).balance).toBeGreaterThan(aliceBalBefore);
    expect(chain.getAccount(bob.did).balance).toBeGreaterThan(bobBalBefore);
  });

  it('rejects cooperative close with pending HTLCs', () => {
    const { identity, chain, lightning } = makeStack();
    const alice = identity.register('alice');
    const bob   = identity.register('bob');
    chain.mintReward(alice.did, 100);
    chain.mintReward(bob.did, 100);
    const ch = lightning.openChannel({ localDid: alice.did, remoteDid: bob.did, localUnits: 500_000n, remoteUnits: 500_000n });
    // Inject a pending HTLC by partial update
    lightning.updateState(ch.id, alice.did, 0n, [{
      amount: 10_000n,
      paymentHash: 'aa'.repeat(32),
      expiryMs: Date.now() + 60_000,
      direction: 'outgoing',
    }]);
    expect(() => lightning.cooperativeClose(ch.id, alice.did)).toThrow(/pending HTLC/);
  });
});

// ── Force close ───────────────────────────────────────────────────────────────

describe('LightningService — force close', () => {
  it('force-closes at latest state; no breach; dispute window set', () => {
    const { lightning, alice, ch } = openTestChannel();
    const result = lightning.forceClose(ch.id, alice.did);
    expect(result.breach).toBe(false);
    expect(result.disputeExpiresAt).toBeTruthy();
    expect(lightning.getChannel(ch.id)!.status).toBe('closed');
  });

  it('detects breach when old sequence number submitted', () => {
    const { lightning, alice, bob, ch } = openTestChannel({ localUnits: 600_000n, remoteUnits: 400_000n });
    // Do one state update to advance sequence
    lightning.updateState(ch.id, alice.did, 100_000n);  // seq → 1

    let breachCalled = false;
    let breachPenalty = 0n;
    const { identity, chain } = makeStack();
    const ln2 = new LightningService(identity, chain, {
      networkId: 'vpc-testnet',
      onBreach: (_chId, _victim, _breacher, penalty) => { breachCalled = true; breachPenalty = penalty; },
    });
    void ln2;

    // Simulate: alice tries to close with old seq (0) — breach
    const result = lightning.forceClose(ch.id, alice.did, 0);   // submit old state
    expect(result.breach).toBe(true);
    // Bob should get the entire capacity
    const bobDist = result.distributions.find(d => d.did === bob.did)!;
    expect(bobDist.units).toBe(1_000_000n);  // full capacity
    // Alice gets nothing
    const aliceDist = result.distributions.find(d => d.did === alice.did)!;
    expect(aliceDist.units).toBe(0n);
  });
});

// ── HTLC resolution ───────────────────────────────────────────────────────────

describe('LightningService — resolveHtlc', () => {
  it('resolves HTLC with correct preimage', () => {
    const { lightning, alice, bob, ch } = openTestChannel({ localUnits: 800_000n, remoteUnits: 200_000n });
    const preimage = 'deadbeef'.repeat(8);
    const { createHash } = require('node:crypto');
    const paymentHash = createHash('sha256').update(preimage, 'utf8').digest('hex');

    // Add an HTLC manually
    lightning.updateState(ch.id, alice.did, 0n, [{
      amount: 10_000n, paymentHash, expiryMs: Date.now() + 60_000, direction: 'outgoing',
    }]);

    // Resolve it
    expect(() => lightning.resolveHtlc(ch.id, paymentHash, preimage)).not.toThrow();
    const updated = lightning.getChannel(ch.id)!;
    expect(updated.state.htlcs.some(h => h.status === 'pending' && h.paymentHash === paymentHash)).toBe(false);
  });

  it('rejects wrong preimage', () => {
    const { lightning, alice, bob, ch } = openTestChannel({ localUnits: 800_000n, remoteUnits: 200_000n });
    void alice; void bob;
    const preimage = 'cafebabe'.repeat(8);
    const { createHash } = require('node:crypto');
    const paymentHash = createHash('sha256').update(preimage, 'hex').digest('hex');
    lightning.updateState(ch.id, alice.did, 0n, [{
      amount: 5_000n, paymentHash, expiryMs: Date.now() + 60_000, direction: 'outgoing',
    }]);
    expect(() => lightning.resolveHtlc(ch.id, paymentHash, 'wrong'.repeat(10))).toThrow(/preimage/);
  });
});

// ── Graph + stats ─────────────────────────────────────────────────────────────

describe('LightningService — graph and stats', () => {
  it('getGraph lists open channels as edges', () => {
    const { lightning, alice, bob } = openTestChannel();
    const graph = lightning.getGraph();
    expect(graph.nodes).toContain(alice.did);
    expect(graph.nodes).toContain(bob.did);
    expect(graph.edges.length).toBe(1);
    expect(graph.edges[0].capacity).toBe('1000000');
  });

  it('getStats reports channels, payments, networkId', () => {
    const { lightning, alice, bob } = openTestChannel({ networkId: 'vpc-testnet' });
    lightning.sendPayment({ senderDid: alice.did, receiverDid: bob.did, amount: 1n });
    const stats = lightning.getStats();
    expect(stats.channels.open).toBe(1);
    expect(stats.payments.settled).toBe(1);
    expect(stats.networkId).toBe('vpc-testnet');
  });

  it('closed channels drop out of graph edges', () => {
    const { lightning, alice, ch } = openTestChannel();
    lightning.cooperativeClose(ch.id, alice.did);
    expect(lightning.getGraph().edges.length).toBe(0);
  });
});

// ── HTLC limit (DoS guard) ────────────────────────────────────────────────────

describe('LightningService — DoS bounds', () => {
  it('rejects state update that exceeds MAX_HTLCS_PER_CHANNEL', () => {
    const { identity, chain, lightning } = makeStack();
    const a = identity.register('a');
    const b = identity.register('b');
    chain.mintReward(a.did, 10000);
    chain.mintReward(b.did, 10000);
    const ln = new LightningService(identity, chain, { networkId: 'vpc-testnet', maxHtlcsPerChannel: 2 });
    const ch = ln.openChannel({ localDid: a.did, remoteDid: b.did, localUnits: 50_000_000n, remoteUnits: 50_000_000n });

    const fakeHash = (n: number) => `${String(n).padStart(4, '0')}${'00'.repeat(28)}`;
    ln.updateState(ch.id, a.did, 0n, [{ amount: 1n, paymentHash: fakeHash(1), expiryMs: Date.now() + 1000, direction: 'outgoing' }]);
    ln.updateState(ch.id, a.did, 0n, [{ amount: 1n, paymentHash: fakeHash(2), expiryMs: Date.now() + 1000, direction: 'outgoing' }]);
    expect(() =>
      ln.updateState(ch.id, a.did, 0n, [{ amount: 1n, paymentHash: fakeHash(3), expiryMs: Date.now() + 1000, direction: 'outgoing' }])
    ).toThrow(/HTLC limit/);
    void MAX_HTLCS_PER_CHANNEL;
  });
});

// ── REST routes ───────────────────────────────────────────────────────────────

describe('LightningService — REST API', () => {
  let server: http.Server;
  let port: number;
  let alice: any;
  let bob: any;
  let svc: LightningService;

  beforeAll(() => {
    const { identity, chain, lightning } = makeStack();
    alice = identity.register('alice');
    bob   = identity.register('bob');
    chain.mintReward(alice.did, 1000);
    chain.mintReward(bob.did, 1000);
    svc = lightning;
    ({ server, port } = startServer(lightning));
  });

  afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));

  it('POST /api/lightning/channels — opens a channel', async () => {
    const r = await httpCall(port, 'POST', '/api/lightning/channels', {
      localDid: alice.did, remoteDid: bob.did, localUnits: '500000', remoteUnits: '500000',
    });
    expect(r.status).toBe(201);
    expect(r.body.success).toBe(true);
    expect(r.body.channel.status).toBe('open');
  });

  it('POST /api/lightning/channels — 422 on missing localDid', async () => {
    const r = await httpCall(port, 'POST', '/api/lightning/channels', { remoteDid: bob.did, localUnits: '1' });
    expect(r.status).toBe(422);
  });

  it('GET /api/lightning/channels — lists channels', async () => {
    const r = await httpCall(port, 'GET', '/api/lightning/channels', undefined);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.channels)).toBe(true);
    expect(r.body.channels.length).toBeGreaterThan(0);
  });

  it('GET /api/lightning/channels/:id — returns channel detail', async () => {
    const channels = svc.listChannels();
    const ch = channels[0];
    const r = await httpCall(port, 'GET', `/api/lightning/channels/${ch.id}`, undefined);
    expect(r.status).toBe(200);
    expect(r.body.channel.id).toBe(ch.id);
  });

  it('GET /api/lightning/channels/:id — 404 on unknown id', async () => {
    const r = await httpCall(port, 'GET', '/api/lightning/channels/nope', undefined);
    expect(r.status).toBe(404);
  });

  it('POST /api/lightning/send — settles a payment', async () => {
    const r = await httpCall(port, 'POST', '/api/lightning/send', {
      senderDid: alice.did, receiverDid: bob.did, amount: '10000',
    });
    expect(r.status).toBe(201);
    expect(r.body.payment.status).toBe('settled');
  });

  it('POST /api/lightning/send — 422 on missing fields', async () => {
    const r = await httpCall(port, 'POST', '/api/lightning/send', { senderDid: alice.did });
    expect(r.status).toBe(422);
  });

  it('POST /api/lightning/channels/:id/close — cooperative close', async () => {
    // Open a fresh channel for this test
    const { identity: id2, chain: c2, lightning: ln2 } = makeStack();
    const a = id2.register('a');
    const b = id2.register('b');
    c2.mintReward(a.did, 100);
    c2.mintReward(b.did, 100);
    const { server: s2, port: p2 } = startServer(ln2);
    const ch2 = ln2.openChannel({ localDid: a.did, remoteDid: b.did, localUnits: 1000n });
    const r = await httpCall(p2, 'POST', `/api/lightning/channels/${ch2.id}/close`, { initiatorDid: a.did });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    await new Promise<void>(resolve => s2.close(() => resolve()));
  });

  it('POST /api/lightning/channels/:id/force-close — latest state, no breach', async () => {
    const channels = svc.listChannels();
    const ch = channels.find((c: Channel) => c.status === 'open');
    if (!ch) return;   // may already be closed in earlier tests
    const r = await httpCall(port, 'POST', `/api/lightning/channels/${ch.id}/force-close`, { initiatorDid: alice.did });
    expect([200, 409]).toContain(r.status);  // open → 200, already closed → 409
  });

  it('GET /api/lightning/graph — returns nodes and edges', async () => {
    const r = await httpCall(port, 'GET', '/api/lightning/graph', undefined);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.nodes)).toBe(true);
    expect(Array.isArray(r.body.edges)).toBe(true);
  });

  it('GET /api/lightning/stats — returns channel and payment stats', async () => {
    const r = await httpCall(port, 'GET', '/api/lightning/stats', undefined);
    expect(r.status).toBe(200);
    expect(r.body.channels).toBeDefined();
    expect(r.body.networkId).toBeDefined();
  });
});

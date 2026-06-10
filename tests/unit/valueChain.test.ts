/**
 * Unit tests for value-chain.ts — capped-supply ledger with halving eras,
 * self-certifying transfers and hash-chained settlement blocks. All offline.
 */

import {
  ValueChainService,
  Transfer,
  transferPayload,
  transferHash,
  verifyTransfer,
  eraOf,
  rewardMultiplier,
  registerValueRoutes,
  SUPPLY_CAP,
  COINBASE,
  BLOCK_GENESIS,
} from '../../src/integrations/lightrag/value-chain';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { LightRAGClient } from '../../src/integrations/lightrag/client';
import express from 'express';
import http from 'http';

function makeOfflineClient(): LightRAGClient {
  return new LightRAGClient({
    neo4j_url: 'bolt://localhost:7687',
    neo4j_username: 'neo4j',
    neo4j_password: 'test',
  });
}

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

function makeStack() {
  const client = makeOfflineClient();
  const identity = new SovereignIdentityService(client);
  const chain = new ValueChainService(client, { identity });
  return { client, identity, chain };
}

// ──────────────────────────────────────────────────────────────────────────────
// Supply economics — halving eras
// ──────────────────────────────────────────────────────────────────────────────

describe('eraOf / rewardMultiplier (Bitcoin halving schedule)', () => {
  it('era 0 below half the cap', () => {
    expect(eraOf(0)).toBe(0);
    expect(eraOf(SUPPLY_CAP / 2 - 1)).toBe(0);
    expect(rewardMultiplier(0)).toBe(1);
  });

  it('era 1 between cap/2 and 3cap/4', () => {
    expect(eraOf(SUPPLY_CAP / 2)).toBe(1);
    expect(eraOf(SUPPLY_CAP * 0.74)).toBe(1);
    expect(rewardMultiplier(SUPPLY_CAP / 2)).toBe(0.5);
  });

  it('era 2 between 3cap/4 and 7cap/8', () => {
    expect(eraOf(SUPPLY_CAP * 0.75)).toBe(2);
    expect(rewardMultiplier(SUPPLY_CAP * 0.75)).toBe(0.25);
  });

  it('era keeps climbing toward the cap', () => {
    expect(eraOf(SUPPLY_CAP * 0.99)).toBeGreaterThanOrEqual(6);
  });

  it('the cap is the thematic 888 888 888', () => {
    expect(SUPPLY_CAP).toBe(888_888_888);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Minting
// ──────────────────────────────────────────────────────────────────────────────

describe('ValueChainService.mintReward', () => {
  it('mints to a registered identity at era-0 full rate', async () => {
    const { client, identity, chain } = makeStack();
    const doc = identity.register('kai');
    const tx = chain.mintReward(doc.did, 8, 'attention:anchor');
    expect(tx).not.toBeNull();
    expect(tx!.from).toBe(COINBASE);
    expect(tx!.amount).toBe(8);
    expect(chain.getAccount(doc.did).balance).toBe(8);
    expect(chain.getSupply().minted).toBe(8);
    await client.close();
  });

  it('refuses to mint to an UNREGISTERED did (sybil gate)', async () => {
    const { client, chain } = makeStack();
    const tx = chain.mintReward('did:vpc:' + 'a'.repeat(32), 8);
    expect(tx).toBeNull();
    expect(chain.getSupply().minted).toBe(0);
    await client.close();
  });

  it('rejects non-positive base amounts', async () => {
    const { client, identity, chain } = makeStack();
    const doc = identity.register('kai');
    expect(chain.mintReward(doc.did, 0)).toBeNull();
    expect(chain.mintReward(doc.did, -5)).toBeNull();
    await client.close();
  });

  it('rewardAttention tags the memo with the kind', async () => {
    const { client, identity, chain } = makeStack();
    const doc = identity.register('kai');
    const tx = chain.rewardAttention(doc.did, 'validate', 5);
    expect(tx!.memo).toBe('attention:validate');
    await client.close();
  });

  it('mints without identity service when none is wired (open mode)', async () => {
    const client = makeOfflineClient();
    const chain = new ValueChainService(client); // no identity gate
    const tx = chain.mintReward('did:vpc:' + 'b'.repeat(32), 3);
    expect(tx).not.toBeNull();
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Transfers — signatures, nonces, double-spend
// ──────────────────────────────────────────────────────────────────────────────

describe('transfers', () => {
  it('node-held transfer moves balance and bumps the nonce', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const tx = chain.transfer(a.did, b.did, 30, 'payment');
    expect(verifyTransfer(tx)).toEqual({ valid: true });
    expect(chain.getAccount(a.did).balance).toBe(70);
    expect(chain.getAccount(b.did).balance).toBe(30);
    expect(chain.getAccount(a.did).nonce).toBe(1);
    await client.close();
  });

  it('rejects overspending', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 10);
    expect(() => chain.transfer(a.did, b.did, 999)).toThrow(/insufficient/);
    await client.close();
  });

  it('replaying the same signed transfer is rejected (nonce + id)', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const tx = chain.transfer(a.did, b.did, 10);
    // Replay the exact transfer: duplicate id
    expect(chain.submitTransfer(tx).reason).toMatch(/duplicate/);
    // Replay with a fresh id but the old nonce: bad nonce
    const replay = { ...tx, id: 'tx_fresh' };
    expect(chain.submitTransfer(replay).reason).toMatch(/nonce|signature/);
    await client.close();
  });

  it('rejects a transfer whose sender DID does not derive from the key', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const m = identity.register('mallory');
    chain.mintReward(a.did, 100);
    // Mallory signs a transfer claiming to be from Alice
    const unsigned = { id: 'tx_forged', from: a.did, to: m.did, amount: 50, nonce: 1, memo: '' };
    const { signature, publicKeyPem } = identity.signAs(m.did, transferPayload(unsigned));
    const forged: Transfer = { ...unsigned, ts: new Date().toISOString(), publicKeyPem, signature };
    expect(chain.submitTransfer(forged).reason).toMatch(/does not derive/);
    expect(chain.getAccount(a.did).balance).toBe(100);
    await client.close();
  });

  it('rejects a tampered amount (signature breaks)', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const unsigned = { id: 'tx_x', from: a.did, to: b.did, amount: 1, nonce: 1, memo: '' };
    const { signature, publicKeyPem } = identity.signAs(a.did, transferPayload(unsigned));
    const tampered: Transfer = { ...unsigned, amount: 99, ts: new Date().toISOString(), publicKeyPem, signature };
    expect(chain.submitTransfer(tampered).reason).toMatch(/mismatch/);
    await client.close();
  });

  it('coinbase transfers cannot be submitted from outside', async () => {
    const { client, chain } = makeStack();
    const fake: Transfer = {
      id: 'tx_evil', from: COINBASE, to: 'did:vpc:' + 'c'.repeat(32),
      amount: 1_000_000, nonce: 1, memo: 'free money',
      ts: new Date().toISOString(), publicKeyPem: '', signature: '',
    };
    expect(chain.submitTransfer(fake).reason).toMatch(/coinbase/);
    expect(chain.getSupply().minted).toBe(0);
    await client.close();
  });

  it('transfersOf lists both directions', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    chain.transfer(a.did, b.did, 10);
    const history = chain.transfersOf(a.did);
    expect(history.length).toBe(2); // mint in + transfer out
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Blocks
// ──────────────────────────────────────────────────────────────────────────────

describe('settlement blocks', () => {
  it('seals pending transfers into a hash-chained block', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    chain.mintReward(a.did, 100);
    const block = chain.sealBlock();
    expect(block).not.toBeNull();
    expect(block!.height).toBe(0);
    expect(block!.prevHash).toBe(BLOCK_GENESIS);
    expect(block!.txIds).toHaveLength(1);
    await client.close();
  });

  it('returns null when nothing is pending', async () => {
    const { client, chain } = makeStack();
    expect(chain.sealBlock()).toBeNull();
    await client.close();
  });

  it('blocks chain by prev hash and the whole chain verifies', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const b0 = chain.sealBlock()!;
    chain.transfer(a.did, b.did, 25);
    const b1 = chain.sealBlock()!;
    expect(b1.prevHash).toBe(b0.hash);
    expect(b1.height).toBe(1);
    expect(chain.verifyChain()).toEqual({ valid: true });
    await client.close();
  });

  it('transferHash is stable across ts differences (ts not signed)', async () => {
    const t1 = { id: 'x', from: 'a', to: 'b', amount: 1, nonce: 1, memo: '', ts: '2026-01-01', publicKeyPem: '', signature: '' } as Transfer;
    const t2 = { ...t1, ts: '2026-06-06' };
    expect(transferHash(t1)).toBe(transferHash(t2));
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST API
// ──────────────────────────────────────────────────────────────────────────────

describe('Value REST API', () => {
  let client: LightRAGClient;
  let identity: SovereignIdentityService;
  let chain: ValueChainService;
  let app: express.Express;

  beforeEach(() => {
    client = makeOfflineClient();
    identity = new SovereignIdentityService(client);
    chain = new ValueChainService(client, { identity });
    app = express();
    app.use(express.json());
    registerValueRoutes(app, chain);
  });

  afterEach(async () => { await client.close(); });

  it('GET /api/value/supply reports cap, minted, era', async () => {
    const { body } = await callRoute(app, 'get', '/api/value/supply');
    expect(body.cap).toBe(SUPPLY_CAP);
    expect(body.minted).toBe(0);
    expect(body.era).toBe(0);
  });

  it('GET /api/value/balance/:did returns a zero account for unknown DIDs', async () => {
    const { body } = await callRoute(app, 'get', `/api/value/balance/did:vpc:${'d'.repeat(32)}`);
    expect(body.account.balance).toBe(0);
    expect(body.account.nonce).toBe(0);
  });

  it('POST /api/value/transfer transfers between node-held identities', async () => {
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const { status, body } = await callRoute(app, 'post', '/api/value/transfer', {
      from: a.did, to: b.did, amount: 40,
    });
    expect(status).toBe(201);
    expect(body.transfer.amount).toBe(40);
  });

  it('POST /api/value/transfer 400s on overspend', async () => {
    const a = identity.register('alice');
    const b = identity.register('bob');
    const { status } = await callRoute(app, 'post', '/api/value/transfer', {
      from: a.did, to: b.did, amount: 40,
    });
    expect(status).toBe(400);
  });

  it('POST /api/value/transfer/submit accepts an externally signed transfer', async () => {
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const unsigned = { id: 'tx_ext', from: a.did, to: b.did, amount: 5, nonce: 1, memo: '' };
    const { signature, publicKeyPem } = identity.signAs(a.did, transferPayload(unsigned));
    const tx = { ...unsigned, ts: new Date().toISOString(), publicKeyPem, signature };
    const { status } = await callRoute(app, 'post', '/api/value/transfer/submit', tx);
    expect(status).toBe(201);
  });

  it('blocks seal + list via REST with chain verification', async () => {
    const a = identity.register('alice');
    chain.mintReward(a.did, 100);
    const sealed = await callRoute(app, 'post', '/api/value/blocks/seal');
    expect(sealed.body.sealed).toBe(true);
    const { body } = await callRoute(app, 'get', '/api/value/blocks');
    expect(body.blocks).toHaveLength(1);
    expect(body.verification.valid).toBe(true);
  });
});

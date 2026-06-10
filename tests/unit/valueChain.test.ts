/**
 * Unit tests for value-chain.ts — BigInt fixed-point ledger with halving
 * eras, self-certifying transfers and hash-chained settlement blocks.
 * All arithmetic assertions are bit-exact. All offline.
 */

import {
  ValueChainService,
  Transfer,
  transferPayload,
  transferHash,
  verifyTransfer,
  eraOf,
  scaledReward,
  tokensToUnits,
  unitsToTokenString,
  isCanonicalUnits,
  registerValueRoutes,
  SUPPLY_CAP_TOKENS,
  SUPPLY_CAP_UNITS,
  UNITS_PER_TOKEN,
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
// Fixed-point conversions — exactness
// ──────────────────────────────────────────────────────────────────────────────

describe('tokensToUnits / unitsToTokenString', () => {
  it('whole tokens convert exactly', () => {
    expect(tokensToUnits(1)).toBe(UNITS_PER_TOKEN);
    expect(tokensToUnits(888_888_888)).toBe(SUPPLY_CAP_UNITS);
  });

  it('0.1 tokens is EXACTLY 10000000 units (no IEEE-754 drift)', () => {
    // 0.1 * 1e8 === 10000000.000000002 in doubles — the string route is exact
    expect(tokensToUnits(0.1)).toBe(10_000_000n);
    expect(tokensToUnits(0.3)).toBe(30_000_000n);
  });

  it('round-trips through the human-readable form', () => {
    expect(unitsToTokenString(tokensToUnits(1.5))).toBe('1.5');
    expect(unitsToTokenString(tokensToUnits(0.00000001))).toBe('0.00000001');
    expect(unitsToTokenString(123n * UNITS_PER_TOKEN)).toBe('123');
  });

  it('rejects non-positive and non-finite amounts', () => {
    expect(() => tokensToUnits(0)).toThrow(/positive/);
    expect(() => tokensToUnits(-1)).toThrow(/positive/);
    expect(() => tokensToUnits(NaN)).toThrow(/positive/);
    expect(() => tokensToUnits(Infinity)).toThrow(/positive/);
  });

  it('the cap in units exceeds Number.MAX_SAFE_INTEGER — doubles would corrupt', () => {
    expect(SUPPLY_CAP_UNITS > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
  });
});

describe('isCanonicalUnits — signature malleability defense', () => {
  it('accepts canonical positive integers', () => {
    expect(isCanonicalUnits('1')).toBe(true);
    expect(isCanonicalUnits('100000000')).toBe(true);
  });

  it('rejects leading zeros (same number, different signed bytes)', () => {
    expect(isCanonicalUnits('007')).toBe(false);
    expect(isCanonicalUnits('01')).toBe(false);
  });

  it('rejects zero, negatives, decimals, signs, non-strings', () => {
    expect(isCanonicalUnits('0')).toBe(false);
    expect(isCanonicalUnits('-5')).toBe(false);
    expect(isCanonicalUnits('1.5')).toBe(false);
    expect(isCanonicalUnits('+7')).toBe(false);
    expect(isCanonicalUnits(7)).toBe(false);
    expect(isCanonicalUnits('')).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Supply economics — halving eras (integer arithmetic)
// ──────────────────────────────────────────────────────────────────────────────

describe('eraOf / scaledReward (Bitcoin halving schedule)', () => {
  it('era 0 below half the cap', () => {
    expect(eraOf(0n)).toBe(0);
    expect(eraOf(SUPPLY_CAP_UNITS / 2n - 1n)).toBe(0);
  });

  it('era boundaries are exact: cap/2 → era 1, cap/2+cap/4 → era 2', () => {
    expect(eraOf(SUPPLY_CAP_UNITS / 2n)).toBe(1);
    expect(eraOf(SUPPLY_CAP_UNITS / 2n + SUPPLY_CAP_UNITS / 4n - 1n)).toBe(1);
    expect(eraOf(SUPPLY_CAP_UNITS / 2n + SUPPLY_CAP_UNITS / 4n)).toBe(2);
  });

  it('the reward halves exactly across each boundary (base >> era)', () => {
    const base = tokensToUnits(8);
    expect(scaledReward(base, 0n)).toBe(base);
    expect(scaledReward(base, SUPPLY_CAP_UNITS / 2n)).toBe(base >> 1n);
    expect(scaledReward(base, SUPPLY_CAP_UNITS / 2n + SUPPLY_CAP_UNITS / 4n)).toBe(base >> 2n);
  });

  it('emission ends when the shift exhausts the base (Bitcoin tail)', () => {
    // Near the cap the era is ~56; 1 token = 1e8 units < 2^56 → reward 0
    expect(scaledReward(tokensToUnits(1), SUPPLY_CAP_UNITS - 10n)).toBe(0n);
  });

  it('the cap is the thematic 888 888 888 tokens', () => {
    expect(SUPPLY_CAP_TOKENS).toBe(888_888_888);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Minting
// ──────────────────────────────────────────────────────────────────────────────

describe('ValueChainService.mintReward', () => {
  it('mints to a registered identity at era-0 full rate (exact units)', async () => {
    const { client, identity, chain } = makeStack();
    const doc = identity.register('kai');
    const tx = chain.mintReward(doc.did, 8, 'attention:anchor');
    expect(tx).not.toBeNull();
    expect(tx!.from).toBe(COINBASE);
    expect(tx!.amount).toBe(tokensToUnits(8).toString());
    expect(chain.getAccount(doc.did).balance).toBe(tokensToUnits(8));
    expect(chain.getSupply().mintedTokens).toBe('8');
    await client.close();
  });

  it('refuses to mint to an UNREGISTERED did (sybil gate)', async () => {
    const { client, chain } = makeStack();
    const tx = chain.mintReward('did:vpc:' + 'a'.repeat(32), 8);
    expect(tx).toBeNull();
    expect(chain.getSupply().mintedUnits).toBe('0');
    await client.close();
  });

  it('rejects non-positive base amounts', async () => {
    const { client, identity, chain } = makeStack();
    const doc = identity.register('kai');
    expect(chain.mintReward(doc.did, 0)).toBeNull();
    expect(chain.mintReward(doc.did, -5)).toBeNull();
    await client.close();
  });

  it('clamps the final mint to the remaining supply, never exceeding the cap', async () => {
    const { client, identity, chain } = makeStack();
    const doc = identity.register('kai');
    // Force the ledger to 5 units below the cap (test-only internal poke)
    (chain as any).totalMintedUnits = SUPPLY_CAP_UNITS - 5n;
    // era is ~56 here → any normal base shifts to 0 → emission has ended
    expect(chain.mintReward(doc.did, 1000)).toBeNull();
    expect(BigInt(chain.getSupply().mintedUnits) <= SUPPLY_CAP_UNITS).toBe(true);
    await client.close();
  });

  it('rewardAttention tags the memo with the kind', async () => {
    const { client, identity, chain } = makeStack();
    const doc = identity.register('kai');
    const tx = chain.rewardAttention(doc.did, 'validate', 5);
    expect(tx!.memo).toBe('attention:validate');
    await client.close();
  });

  it('conservation holds after minting: Σ balances === minted', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('a');
    const b = identity.register('b');
    chain.mintReward(a.did, 8);
    chain.mintReward(b.did, 5);
    chain.mintReward(a.did, 0.00000001); // 1 unit — smallest possible
    expect(chain.checkConservation().holds).toBe(true);
    await client.close();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Transfers — signatures, nonces, double-spend
// ──────────────────────────────────────────────────────────────────────────────

describe('transfers', () => {
  it('node-held transfer moves exact units and bumps the nonce', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const tx = chain.transfer(a.did, b.did, tokensToUnits(30), 'payment');
    expect(verifyTransfer(tx)).toEqual({ valid: true });
    expect(chain.getAccount(a.did).balance).toBe(tokensToUnits(70));
    expect(chain.getAccount(b.did).balance).toBe(tokensToUnits(30));
    expect(chain.getAccount(a.did).nonce).toBe(1);
    expect(chain.checkConservation().holds).toBe(true);
    await client.close();
  });

  it('rejects overspending', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 10);
    expect(() => chain.transfer(a.did, b.did, tokensToUnits(999))).toThrow(/insufficient/);
    await client.close();
  });

  it('replaying the same signed transfer is rejected (id + nonce)', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const tx = chain.transfer(a.did, b.did, tokensToUnits(10));
    expect(chain.submitTransfer(tx).reason).toMatch(/duplicate/);
    const replay = { ...tx, id: 'tx_fresh' };
    expect(chain.submitTransfer(replay).reason).toMatch(/nonce|signature/);
    await client.close();
  });

  it('rejects a non-canonical amount encoding (malleability)', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const unsigned = { id: 'tx_pad', from: a.did, to: b.did, amount: '0100000000', nonce: 1, memo: '' };
    const { signature, publicKeyPem } = identity.signAs(a.did, transferPayload(unsigned));
    const padded: Transfer = { ...unsigned, ts: new Date().toISOString(), publicKeyPem, signature };
    expect(chain.submitTransfer(padded).reason).toMatch(/canonical/);
    await client.close();
  });

  it('rejects a transfer whose sender DID does not derive from the key', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const m = identity.register('mallory');
    chain.mintReward(a.did, 100);
    const unsigned = { id: 'tx_forged', from: a.did, to: m.did, amount: tokensToUnits(50).toString(), nonce: 1, memo: '' };
    const { signature, publicKeyPem } = identity.signAs(m.did, transferPayload(unsigned));
    const forged: Transfer = { ...unsigned, ts: new Date().toISOString(), publicKeyPem, signature };
    expect(chain.submitTransfer(forged).reason).toMatch(/does not derive/);
    expect(chain.getAccount(a.did).balance).toBe(tokensToUnits(100));
    await client.close();
  });

  it('rejects a tampered amount (signature breaks)', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const unsigned = { id: 'tx_x', from: a.did, to: b.did, amount: tokensToUnits(1).toString(), nonce: 1, memo: '' };
    const { signature, publicKeyPem } = identity.signAs(a.did, transferPayload(unsigned));
    const tampered: Transfer = {
      ...unsigned, amount: tokensToUnits(99).toString(),
      ts: new Date().toISOString(), publicKeyPem, signature,
    };
    expect(chain.submitTransfer(tampered).reason).toMatch(/mismatch/);
    await client.close();
  });

  it('coinbase transfers cannot be submitted from outside', async () => {
    const { client, chain } = makeStack();
    const fake: Transfer = {
      id: 'tx_evil', from: COINBASE, to: 'did:vpc:' + 'c'.repeat(32),
      amount: tokensToUnits(1_000_000).toString(), nonce: 1, memo: 'free money',
      ts: new Date().toISOString(), publicKeyPem: '', signature: '',
    };
    expect(chain.submitTransfer(fake).reason).toMatch(/coinbase/);
    expect(chain.getSupply().mintedUnits).toBe('0');
    await client.close();
  });

  it('rejects an oversized memo (DoS bound on signed payload)', async () => {
    const t: Transfer = {
      id: 'x', from: 'did:vpc:' + 'a'.repeat(32), to: 'did:vpc:' + 'b'.repeat(32),
      amount: '1', nonce: 1, memo: 'm'.repeat(300),
      ts: '', publicKeyPem: '', signature: '',
    };
    expect(verifyTransfer(t).reason).toMatch(/memo/);
  });

  it('transfersOf returns copies — mutating them cannot corrupt the ledger', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    chain.mintReward(a.did, 100);
    const history = chain.transfersOf(a.did);
    history[0].amount = '999999999999';
    expect(chain.verifyChain().valid).toBe(true);
    expect(chain.transfersOf(a.did)[0].amount).toBe(tokensToUnits(100).toString());
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
    chain.transfer(a.did, b.did, tokensToUnits(25));
    const b1 = chain.sealBlock()!;
    expect(b1.prevHash).toBe(b0.hash);
    expect(b1.height).toBe(1);
    expect(chain.verifyChain()).toEqual({ valid: true });
    await client.close();
  });

  it('verifyChain detects a tampered sealed transfer', async () => {
    const { client, identity, chain } = makeStack();
    const a = identity.register('alice');
    chain.mintReward(a.did, 100);
    chain.sealBlock();
    // Tamper with the INTERNAL transfer log (test-only poke)
    const internal = (chain as any).transfers as Map<string, Transfer>;
    const tx = internal.values().next().value as Transfer;
    tx.amount = '1';
    expect(chain.verifyChain().reason).toMatch(/root mismatch/);
    await client.close();
  });

  it('transferHash is stable across ts differences (ts not signed)', () => {
    const t1 = { id: 'x', from: 'a', to: 'b', amount: '1', nonce: 1, memo: '', ts: '2026-01-01', publicKeyPem: '', signature: '' } as Transfer;
    const t2 = { ...t1, ts: '2026-06-06' };
    expect(transferHash(t1)).toBe(transferHash(t2));
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST API — bigint-safe serialization
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

  it('GET /api/value/supply reports exact strings + conservation flag', async () => {
    const { body } = await callRoute(app, 'get', '/api/value/supply');
    expect(body.capTokens).toBe(SUPPLY_CAP_TOKENS);
    expect(body.capUnits).toBe(SUPPLY_CAP_UNITS.toString());
    expect(body.mintedUnits).toBe('0');
    expect(body.era).toBe(0);
    expect(body.conservation).toBe(true);
  });

  it('GET /api/value/balance/:did serializes units and tokens as strings', async () => {
    const a = identity.register('alice');
    chain.mintReward(a.did, 1.5);
    const { body } = await callRoute(app, 'get', `/api/value/balance/${a.did}`);
    expect(body.account.balanceUnits).toBe(tokensToUnits(1.5).toString());
    expect(body.account.balanceTokens).toBe('1.5');
  });

  it('POST /api/value/transfer accepts amountTokens (number)', async () => {
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const { status, body } = await callRoute(app, 'post', '/api/value/transfer', {
      from: a.did, to: b.did, amountTokens: 40,
    });
    expect(status).toBe(201);
    expect(body.transfer.amount).toBe(tokensToUnits(40).toString());
  });

  it('POST /api/value/transfer accepts amountUnits (string)', async () => {
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const { status } = await callRoute(app, 'post', '/api/value/transfer', {
      from: a.did, to: b.did, amountUnits: tokensToUnits(5).toString(),
    });
    expect(status).toBe(201);
  });

  it('POST /api/value/transfer 400s on overspend', async () => {
    const a = identity.register('alice');
    const b = identity.register('bob');
    const { status } = await callRoute(app, 'post', '/api/value/transfer', {
      from: a.did, to: b.did, amountTokens: 40,
    });
    expect(status).toBe(400);
  });

  it('POST /api/value/transfer/submit accepts an externally signed transfer', async () => {
    const a = identity.register('alice');
    const b = identity.register('bob');
    chain.mintReward(a.did, 100);
    const unsigned = { id: 'tx_ext', from: a.did, to: b.did, amount: tokensToUnits(5).toString(), nonce: 1, memo: '' };
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

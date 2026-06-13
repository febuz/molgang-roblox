/**
 * Quantum-resistant wallet vault + PQ wallet proofs — unit tests
 *
 * Covers docs/POST-QUANTUM-WALLET.md §4 (vault) and §5 (proof): encryption
 * round-trips, tamper rejection, seed re-derivation, and the end-to-end
 * quantum-safe ownership proof against a live value chain.
 */

import express from 'express';
import * as http from 'http';
import {
  encryptVault, decryptVault, EncryptedVault, VaultContents,
  PqWalletService, registerPqRoutes, verifyWalletProof, WalletProof,
  MIN_PASSPHRASE_LENGTH,
} from '../../src/integrations/lightrag/wallet-vault';
import { HashBasedSigner } from '../../src/integrations/lightrag/pq-crypto';
import { verifySMTProof } from '../../src/integrations/lightrag/sparse-merkle';
import { SovereignIdentityService } from '../../src/integrations/lightrag/identity';
import { ValueChainService, tokensToUnits } from '../../src/integrations/lightrag/value-chain';

const offlineRag = { isConnected: () => false } as any;

function makeStack() {
  const identity = new SovereignIdentityService(offlineRag);
  const chain = new ValueChainService(offlineRag, { identity });
  // Small PQ trees keep enrollment fast in tests (h=4 → 16 sigs, ~5 ms)
  const pq = new PqWalletService(identity, chain, { treeHeight: 4 });
  return { identity, chain, pq };
}

// ─── 1. Vault encryption ─────────────────────────────────────────────────────

describe('Vault encryption (AES-256-GCM + scrypt)', () => {
  const payload = { secret: 'pq-master-seed-hex', n: 42 };

  it('round-trips with the right passphrase', () => {
    const vault = encryptVault(payload, 'correct horse battery staple');
    expect(decryptVault(vault, 'correct horse battery staple')).toEqual(payload);
  });

  it('rejects a wrong passphrase', () => {
    const vault = encryptVault(payload, 'right-passphrase');
    expect(() => decryptVault(vault, 'wrong-passphrase')).toThrow(/wrong passphrase or tampered/);
  });

  it('rejects tampered ciphertext (GCM auth)', () => {
    const vault = encryptVault(payload, 'tamper-test-pass');
    const ct = Buffer.from(vault.ciphertext, 'base64');
    ct[0] ^= 0xff;
    const bad: EncryptedVault = { ...vault, ciphertext: ct.toString('base64') };
    expect(() => decryptVault(bad, 'tamper-test-pass')).toThrow(/tampered/);
  });

  it('rejects a tampered auth tag', () => {
    const vault = encryptVault(payload, 'tag-tamper-pass');
    const tag = Buffer.from(vault.authTag, 'hex');
    tag[0] ^= 0x01;
    expect(() => decryptVault({ ...vault, authTag: tag.toString('hex') }, 'tag-tamper-pass')).toThrow();
  });

  it('refuses short passphrases', () => {
    expect(() => encryptVault(payload, 'short')).toThrow(new RegExp(`${MIN_PASSPHRASE_LENGTH}`));
  });

  it('two encryptions of the same payload differ (fresh salt + iv)', () => {
    const a = encryptVault(payload, 'same-passphrase!');
    const b = encryptVault(payload, 'same-passphrase!');
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });

  it('stores KDF parameters in the envelope (future-proof upgrades)', () => {
    const vault = encryptVault(payload, 'kdf-params-pass');
    expect(vault.kdf).toBe('scrypt');
    expect(vault.kdfParams.N).toBe(2 ** 15);
    expect(vault.version).toBe(1);
  });
});

// ─── 2. Enrollment ───────────────────────────────────────────────────────────

describe('PQ enrollment', () => {
  it('enroll binds a hash-based root to the handle DID', () => {
    const { identity, pq } = makeStack();
    identity.register('alice');
    const r = pq.enroll('alice');
    expect(r.pqRoot).toMatch(/^[0-9a-f]{64}$/);
    expect(r.remainingSignatures).toBe(16);
    expect(r.alreadyEnrolled).toBe(false);
  });

  it('re-enrollment is idempotent (same root, no silent key replacement)', () => {
    const { identity, pq } = makeStack();
    identity.register('alice');
    const first = pq.enroll('alice');
    const second = pq.enroll('alice');
    expect(second.pqRoot).toBe(first.pqRoot);
    expect(second.alreadyEnrolled).toBe(true);
  });

  it('status reflects enrollment and remaining budget', () => {
    const { identity, pq } = makeStack();
    identity.register('bob');
    expect(pq.status('bob').enrolled).toBe(false);
    pq.enroll('bob');
    const s = pq.status('bob');
    expect(s.enrolled).toBe(true);
    expect(s.remainingSignatures).toBe(16);
  });

  it('unknown handle throws', () => {
    const { pq } = makeStack();
    expect(() => pq.enroll('ghost')).toThrow(/unknown handle/);
  });
});

// ─── 3. The quantum-safe wallet proof ────────────────────────────────────────

describe('Quantum-safe wallet proof (end-to-end, SHA-256 only)', () => {
  function fundedStack() {
    const { identity, chain, pq } = makeStack();
    const alice = identity.register('alice');
    const bob = identity.register('bob');
    chain.mintReward(alice.did, 50);
    chain.transfer(alice.did, bob.did, tokensToUnits(10));
    pq.enroll('alice');
    return { identity, chain, pq, alice, bob };
  }

  it('prove → verify round-trips against the live chain', () => {
    const { pq } = fundedStack();
    const proof = pq.prove('alice');
    expect(verifyWalletProof(proof)).toEqual({ valid: true });
  });

  it('the proof commits to the exact balance and nonce', () => {
    const { chain, pq, alice } = fundedStack();
    const proof = pq.prove('alice');
    const acc = chain.getAccount(alice.did);
    expect(proof.payload.balanceUnits).toBe(acc.balance.toString());
    expect(proof.payload.nonce).toBe(acc.nonce);
    expect(proof.payload.stateRoot).toBe(chain.getStateRoot());
  });

  it('the embedded SMT proof independently verifies (hash-only chain)', () => {
    const { pq } = fundedStack();
    const proof = pq.prove('alice');
    expect(verifySMTProof(proof.smtProof, proof.payload.stateRoot)).toBe(true);
  });

  it('a doctored balance is rejected even with a valid SMT proof', () => {
    const { pq } = fundedStack();
    const proof = pq.prove('alice');
    const forged: WalletProof = {
      ...proof,
      payload: { ...proof.payload, balanceUnits: '999999999', balanceTokens: '9.99' },
    };
    const r = verifyWalletProof(forged);
    expect(r.valid).toBe(false); // PQ signature no longer covers the payload
  });

  it('a swapped PQ root is rejected', () => {
    const { pq } = fundedStack();
    const proof = pq.prove('alice');
    const other = new HashBasedSigner(undefined, 4);
    expect(verifyWalletProof({ ...proof, pqRoot: other.root }).valid).toBe(false);
  });

  it('a stale state root is rejected (proof pins chain state)', () => {
    const { chain, pq, alice, bob } = fundedStack();
    const proof = pq.prove('alice');
    // Mutate the chain: the old proof's stateRoot no longer matches the leaf
    chain.transfer(alice.did, bob.did, tokensToUnits(5));
    const fresh = pq.prove('alice');
    expect(fresh.payload.stateRoot).not.toBe(proof.payload.stateRoot);
    // The OLD proof still verifies — against its OWN (older) state root.
    // What must fail is mixing the old payload with the NEW root:
    const mixed: WalletProof = {
      ...proof,
      payload: { ...proof.payload, stateRoot: fresh.payload.stateRoot },
    };
    expect(verifyWalletProof(mixed).valid).toBe(false);
  });

  it('each proof consumes one one-time signature index', () => {
    const { pq } = fundedStack();
    const before = pq.status('alice').remainingSignatures!;
    pq.prove('alice');
    pq.prove('alice');
    expect(pq.status('alice').remainingSignatures).toBe(before - 2);
  });

  it('proving without enrollment throws', () => {
    const { identity, pq } = makeStack();
    identity.register('carol');
    expect(() => pq.prove('carol')).toThrow(/not PQ-enrolled/);
  });

  it('incomplete proofs are rejected, not crashed on', () => {
    expect(verifyWalletProof({} as any).valid).toBe(false);
    const { pq } = fundedStack();
    const proof = pq.prove('alice');
    expect(verifyWalletProof({ ...proof, pqSignature: undefined as any }).valid).toBe(false);
    expect(verifyWalletProof({
      ...proof,
      payload: { ...proof.payload, balanceUnits: 'not-a-number' },
    }).valid).toBe(false);
  });
});

// ─── 4. Vault export — custody transfer ──────────────────────────────────────

describe('Vault export', () => {
  it('exports an encrypted vault whose seed re-derives the same PQ key', () => {
    const { identity, pq } = makeStack();
    identity.register('alice');
    const { pqRoot } = pq.enroll('alice');

    const vault = pq.exportVault('alice', 'my-strong-passphrase');
    const contents = decryptVault<VaultContents>(vault, 'my-strong-passphrase');
    expect(contents.pqRoot).toBe(pqRoot);

    // Re-derive the key from the exported seed — identical root
    const restored = new HashBasedSigner(Buffer.from(contents.pqMasterSeed, 'hex'), contents.pqHeight);
    expect(restored.root).toBe(pqRoot);
  });

  it('vault state travels with the seed (used indexes preserved)', () => {
    const { identity, chain, pq } = makeStack();
    const alice = identity.register('alice');
    chain.mintReward(alice.did, 10);
    pq.enroll('alice');
    pq.prove('alice'); // consume index 0
    pq.prove('alice'); // consume index 1

    const vault = pq.exportVault('alice', 'state-travel-pass');
    const contents = decryptVault<VaultContents>(vault, 'state-travel-pass');
    expect(contents.pqState.usedIndexes).toEqual([0, 1]);

    // A restored signer must NOT reuse those indexes
    const restored = new HashBasedSigner(Buffer.from(contents.pqMasterSeed, 'hex'), contents.pqHeight);
    restored.restoreState(contents.pqState);
    expect(restored.sign('post-restore').index).toBe(2);
  });

  it('export without enrollment throws', () => {
    const { identity, pq } = makeStack();
    identity.register('dave');
    expect(() => pq.exportVault('dave', 'whatever-pass')).toThrow(/not PQ-enrolled/);
  });
});

// ─── 5. HTTP route contract ──────────────────────────────────────────────────

describe('PQ wallet HTTP routes', () => {
  let server: http.Server;
  let base: string;

  beforeAll(done => {
    const { identity, chain, pq } = makeStack();
    const alice = identity.register('alice');
    chain.mintReward(alice.did, 25);
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    registerPqRoutes(app, pq);
    server = http.createServer(app);
    server.listen(0, () => {
      base = `http://127.0.0.1:${(server.address() as any).port}`;
      done();
    });
  });
  afterAll(done => { server.close(() => done()); });

  function call(method: string, path: string, body?: unknown): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const reqBody = body ? JSON.stringify(body) : '';
      const req = http.request(`${base}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(reqBody) },
      }, res => {
        let data = '';
        res.on('data', c => (data += c));
        res.on('end', () => resolve({ status: res.statusCode!, body: data ? JSON.parse(data) : {} }));
      });
      req.on('error', reject);
      if (reqBody) req.write(reqBody);
      req.end();
    });
  }

  it('full journey: enroll → status → prove → verify → vault export', async () => {
    const enroll = await call('POST', '/api/users/alice/pq/enroll');
    expect(enroll.status).toBe(201);
    expect(enroll.body.pqRoot).toMatch(/^[0-9a-f]{64}$/);

    const status = await call('GET', '/api/users/alice/pq/status');
    expect(status.status).toBe(200);
    expect(status.body.enrolled).toBe(true);

    const prove = await call('POST', '/api/users/alice/pq/prove');
    expect(prove.status).toBe(201);
    expect(prove.body.proof.pqRoot).toBe(enroll.body.pqRoot);

    const verify = await call('POST', '/api/pq/verify', { proof: prove.body.proof });
    expect(verify.status).toBe(200);
    expect(verify.body.valid).toBe(true);

    const vault = await call('POST', '/api/users/alice/vault/export', { passphrase: 'http-test-passphrase' });
    expect(vault.status).toBe(201);
    expect(vault.body.vault.kdf).toBe('scrypt');
  });

  it('verify rejects a forged proof with 422', async () => {
    const prove = await call('POST', '/api/users/alice/pq/prove');
    const forged = {
      ...prove.body.proof,
      payload: { ...prove.body.proof.payload, balanceUnits: '123456789' },
    };
    const verify = await call('POST', '/api/pq/verify', { proof: forged });
    expect(verify.status).toBe(422);
    expect(verify.body.valid).toBe(false);
  });

  it('vault export without passphrase → 400; unknown handle → 400; missing proof → 400', async () => {
    expect((await call('POST', '/api/users/alice/vault/export', {})).status).toBe(400);
    expect((await call('POST', '/api/users/ghost/pq/enroll')).status).toBe(400);
    expect((await call('POST', '/api/pq/verify', {})).status).toBe(400);
  });
});

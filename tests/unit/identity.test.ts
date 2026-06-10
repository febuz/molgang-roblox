/**
 * Unit tests for identity.ts — sovereign self-certifying DIDs.
 * All offline (Node crypto Ed25519).
 */

import {
  SovereignIdentityService,
  IdentityDocument,
  didFromPublicKey,
  isValidDid,
  verifyIdentityDocument,
  keyHistory,
  registerIdentityRoutes,
  DID_PREFIX,
} from '../../src/integrations/lightrag/identity';
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

// ──────────────────────────────────────────────────────────────────────────────
// DID derivation
// ──────────────────────────────────────────────────────────────────────────────

describe('didFromPublicKey / isValidDid', () => {
  let client: LightRAGClient;
  let service: SovereignIdentityService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new SovereignIdentityService(client);
  });

  afterEach(async () => { await client.close(); });

  it('derives a did:vpc: DID with 32 hex chars', () => {
    const doc = service.register();
    expect(doc.did.startsWith(DID_PREFIX)).toBe(true);
    expect(isValidDid(doc.did)).toBe(true);
  });

  it('the DID is self-certifying: it derives from the genesis key', () => {
    const doc = service.register();
    expect(didFromPublicKey(doc.genesisKeyPem)).toBe(doc.did);
  });

  it('derivation is deterministic and key-unique', () => {
    const a = service.register();
    const b = service.register();
    expect(didFromPublicKey(a.genesisKeyPem)).toBe(a.did);
    expect(a.did).not.toBe(b.did);
  });

  it('rejects malformed DIDs', () => {
    expect(isValidDid('did:vpc:short')).toBe(false);
    expect(isValidDid('did:key:abcdef')).toBe(false);
    expect(isValidDid(42)).toBe(false);
    expect(isValidDid(null)).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// register / resolve / handles
// ──────────────────────────────────────────────────────────────────────────────

describe('SovereignIdentityService.register/resolve', () => {
  let client: LightRAGClient;
  let service: SovereignIdentityService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new SovereignIdentityService(client);
  });

  afterEach(async () => { await client.close(); });

  it('registers and resolves by DID', () => {
    const doc = service.register('kai');
    expect(service.resolve(doc.did)).toEqual(doc);
  });

  it('resolves by handle', () => {
    const doc = service.register('kai');
    expect(service.resolveHandle('kai')?.did).toBe(doc.did);
    expect(service.didForHandle('kai')).toBe(doc.did);
  });

  it('rejects duplicate handles', () => {
    service.register('kai');
    expect(() => service.register('kai')).toThrow(/already registered/);
  });

  it('didForHandle returns null for unknown handles', () => {
    expect(service.didForHandle('ghost')).toBeNull();
  });

  it('fresh documents verify end-to-end', () => {
    const doc = service.register('kai');
    expect(verifyIdentityDocument(doc)).toEqual({ valid: true });
  });

  it('stats count identities and rotations', () => {
    service.register('a');
    const b = service.register('b');
    service.rotateKey(b.did);
    const stats = service.getStats();
    expect(stats.identities).toBe(2);
    expect(stats.totalRotations).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Key rotation
// ──────────────────────────────────────────────────────────────────────────────

describe('key rotation', () => {
  let client: LightRAGClient;
  let service: SovereignIdentityService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new SovereignIdentityService(client);
  });

  afterEach(async () => { await client.close(); });

  it('rotation keeps the DID but changes the active key', () => {
    const doc = service.register('kai');
    const before = doc.publicKeyPem;
    const after = service.rotateKey(doc.did);
    expect(after.did).toBe(doc.did);
    expect(after.publicKeyPem).not.toBe(before);
    expect(after.rotations).toHaveLength(1);
  });

  it('a rotated document still verifies end-to-end', () => {
    const doc = service.register('kai');
    service.rotateKey(doc.did);
    service.rotateKey(doc.did);
    expect(verifyIdentityDocument(service.resolve(doc.did)!)).toEqual({ valid: true });
  });

  it('keyHistory lists genesis plus all rotated keys in order', () => {
    const doc = service.register('kai');
    const genesis = doc.genesisKeyPem;
    service.rotateKey(doc.did);
    const second = service.resolve(doc.did)!.publicKeyPem;
    const history = keyHistory(service.resolve(doc.did)!);
    expect(history).toEqual([genesis, second]);
  });

  it('signing after rotation uses the NEW key', () => {
    const doc = service.register('kai');
    service.rotateKey(doc.did);
    const { signature } = service.signAs(doc.did, 'hello');
    expect(service.verifyAs(doc.did, 'hello', signature)).toBe(true);
  });

  it('a signature from the OLD key fails against the current key', () => {
    const doc = service.register('kai');
    const { signature } = service.signAs(doc.did, 'hello'); // signed with genesis key
    service.rotateKey(doc.did);
    expect(service.verifyAs(doc.did, 'hello', signature)).toBe(false);
  });

  it('rotation fails for an unknown or non-node-held DID', () => {
    expect(() => service.rotateKey('did:vpc:' + '0'.repeat(32))).toThrow(/no node-held/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Document tamper detection + receive
// ──────────────────────────────────────────────────────────────────────────────

describe('verifyIdentityDocument — tamper detection', () => {
  let client: LightRAGClient;
  let service: SovereignIdentityService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new SovereignIdentityService(client);
  });

  afterEach(async () => { await client.close(); });

  it('detects a swapped genesis key (DID no longer derives)', () => {
    const a = service.register();
    const b = service.register();
    const forged: IdentityDocument = { ...a, genesisKeyPem: b.genesisKeyPem };
    expect(verifyIdentityDocument(forged).reason).toMatch(/does not derive/);
  });

  it('detects a forged current key without a rotation', () => {
    const a = service.register();
    const b = service.register();
    const forged: IdentityDocument = { ...a, publicKeyPem: b.publicKeyPem };
    expect(verifyIdentityDocument(forged).reason).toMatch(/current key/);
  });

  it('detects a tampered rotation (new key swapped)', () => {
    const a = service.register();
    service.rotateKey(a.did);
    const b = service.register();
    const doc = service.resolve(a.did)!;
    const forged: IdentityDocument = {
      ...doc,
      rotations: [{ ...doc.rotations[0], newKeyPem: b.publicKeyPem }],
      publicKeyPem: b.publicKeyPem,
    };
    const result = verifyIdentityDocument(forged);
    expect(result.valid).toBe(false);
  });
});

describe('SovereignIdentityService.receive', () => {
  let clientA: LightRAGClient;
  let clientB: LightRAGClient;
  let peerA: SovereignIdentityService;
  let peerB: SovereignIdentityService;

  beforeEach(() => {
    clientA = makeOfflineClient();
    clientB = makeOfflineClient();
    peerA = new SovereignIdentityService(clientA);
    peerB = new SovereignIdentityService(clientB);
  });

  afterEach(async () => { await clientA.close(); await clientB.close(); });

  it('accepts a valid peer document', () => {
    const doc = peerA.register('kai');
    expect(peerB.receive(doc).accepted).toBe(true);
    expect(peerB.resolve(doc.did)?.did).toBe(doc.did);
  });

  it('rejects an invalid document', () => {
    const a = peerA.register();
    const b = peerA.register();
    const forged = { ...a, genesisKeyPem: b.genesisKeyPem };
    expect(peerB.receive(forged).accepted).toBe(false);
  });

  it('longest-rotation-chain wins: stale copies are rejected', () => {
    const doc = peerA.register('kai');
    // Snapshot the pre-rotation state — rotateKey mutates the live doc
    const stale = JSON.parse(JSON.stringify(doc));
    peerB.receive(stale);
    peerA.rotateKey(doc.did);
    const rotated = peerA.resolve(doc.did)!;
    expect(peerB.receive(rotated).accepted).toBe(true);       // newer chain
    expect(peerB.receive(stale).accepted).toBe(false);        // stale copy
  });

  it('rejects a handle takeover by a different DID', () => {
    const real = peerA.register('kai');
    peerB.receive(real);
    const imposter = peerA.register(); // no handle, then claim 'kai'
    const forged = { ...imposter, handle: 'kai' };
    // forged doc still verifies cryptographically (handle is not signed),
    // but the handle is taken by another DID
    expect(peerB.receive(forged).reason).toMatch(/taken/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Verifiable credentials
// ──────────────────────────────────────────────────────────────────────────────

describe('verifiable credentials', () => {
  let client: LightRAGClient;
  let service: SovereignIdentityService;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new SovereignIdentityService(client);
  });

  afterEach(async () => { await client.close(); });

  it('issues and verifies a credential', () => {
    const issuer = service.register('authority');
    const subject = service.register('kai');
    const vc = service.issueCredential(issuer.did, subject.did, { role: 'validator' });
    expect(service.verifyCredential(vc)).toEqual({ valid: true });
  });

  it('a credential survives issuer key rotation', () => {
    const issuer = service.register('authority');
    const subject = service.register('kai');
    const vc = service.issueCredential(issuer.did, subject.did, { role: 'validator' });
    service.rotateKey(issuer.did);
    expect(service.verifyCredential(vc)).toEqual({ valid: true });
  });

  it('rejects a tampered claim', () => {
    const issuer = service.register('authority');
    const subject = service.register('kai');
    const vc = service.issueCredential(issuer.did, subject.did, { role: 'validator' });
    const forged = { ...vc, claim: { role: 'admin' } };
    expect(service.verifyCredential(forged).reason).toMatch(/mismatch/);
  });

  it('rejects a credential signed with a key the issuer never owned', () => {
    const issuer = service.register('authority');
    const subject = service.register('kai');
    const other = service.register('mallory');
    const vc = service.issueCredential(issuer.did, subject.did, { role: 'validator' });
    const forged = { ...vc, issuerKeyPem: other.publicKeyPem };
    expect(service.verifyCredential(forged).reason).toMatch(/never controlled/);
  });

  it('fails for an unknown subject', () => {
    const issuer = service.register('authority');
    expect(() => service.issueCredential(issuer.did, 'did:vpc:' + 'f'.repeat(32), {})).toThrow(/unknown subject/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// REST API
// ──────────────────────────────────────────────────────────────────────────────

describe('Identity REST API', () => {
  let client: LightRAGClient;
  let service: SovereignIdentityService;
  let app: express.Express;

  beforeEach(() => {
    client = makeOfflineClient();
    service = new SovereignIdentityService(client);
    app = express();
    app.use(express.json());
    registerIdentityRoutes(app, service);
  });

  afterEach(async () => { await client.close(); });

  it('POST /api/identity/register creates an identity', async () => {
    const { status, body } = await callRoute(app, 'post', '/api/identity/register', { handle: 'kai' });
    expect(status).toBe(201);
    expect(isValidDid(body.identity.did)).toBe(true);
    expect(body.identity.handle).toBe('kai');
  });

  it('POST /api/identity/register rejects a duplicate handle', async () => {
    await callRoute(app, 'post', '/api/identity/register', { handle: 'kai' });
    const { status } = await callRoute(app, 'post', '/api/identity/register', { handle: 'kai' });
    expect(status).toBe(400);
  });

  it('GET /api/identity/resolve/:did returns doc + verification', async () => {
    const { body: reg } = await callRoute(app, 'post', '/api/identity/register', {});
    const { body } = await callRoute(app, 'get', `/api/identity/resolve/${reg.identity.did}`);
    expect(body.verification.valid).toBe(true);
  });

  it('GET /api/identity/resolve/:did 404s on unknown DID', async () => {
    const { status } = await callRoute(app, 'get', `/api/identity/resolve/did:vpc:${'0'.repeat(32)}`);
    expect(status).toBe(404);
  });

  it('POST /api/identity/:did/rotate rotates the key', async () => {
    const { body: reg } = await callRoute(app, 'post', '/api/identity/register', {});
    const { body } = await callRoute(app, 'post', `/api/identity/${reg.identity.did}/rotate`);
    expect(body.identity.rotations).toHaveLength(1);
  });

  it('credential issue + verify round-trip via REST', async () => {
    const { body: a } = await callRoute(app, 'post', '/api/identity/register', { handle: 'authority' });
    const { body: b } = await callRoute(app, 'post', '/api/identity/register', { handle: 'kai' });
    const { status, body: issued } = await callRoute(app, 'post', '/api/identity/credentials', {
      issuer: a.identity.did, subject: b.identity.did, claim: { role: 'validator' },
    });
    expect(status).toBe(201);
    const { body: verified } = await callRoute(app, 'post', '/api/identity/credentials/verify', issued.credential);
    expect(verified.valid).toBe(true);
  });

  it('GET /api/identity returns stats + list', async () => {
    await callRoute(app, 'post', '/api/identity/register', { handle: 'kai' });
    const { body } = await callRoute(app, 'get', '/api/identity');
    expect(body.identities).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// DoS bounds
// ──────────────────────────────────────────────────────────────────────────────

describe('DoS caps', () => {
  it('register() rejects beyond maxIdentities', async () => {
    const client = makeOfflineClient();
    const service = new SovereignIdentityService(client, { maxIdentities: 2 });
    service.register('a');
    service.register('b');
    expect(() => service.register('c')).toThrow(/table full/);
    await client.close();
  });

  it('receive() rejects NEW identities beyond the cap but still accepts updates', async () => {
    const clientA = makeOfflineClient();
    const clientB = makeOfflineClient();
    const peerA = new SovereignIdentityService(clientA);
    const peerB = new SovereignIdentityService(clientB, { maxIdentities: 1 });
    const known = peerA.register('known');
    expect(peerB.receive(JSON.parse(JSON.stringify(known))).accepted).toBe(true);
    // Table is now full — a second NEW identity is rejected
    const stranger = peerA.register('stranger');
    expect(peerB.receive(stranger).reason).toMatch(/table full/);
    // …but a rotation update for the KNOWN identity still lands
    peerA.rotateKey(known.did);
    expect(peerB.receive(peerA.resolve(known.did)!).accepted).toBe(true);
    await clientA.close();
    await clientB.close();
  });

  it('oversized handles are rejected', async () => {
    const client = makeOfflineClient();
    const service = new SovereignIdentityService(client);
    expect(() => service.register('h'.repeat(65))).toThrow(/exceeds/);
    await client.close();
  });
});

/**
 * Sovereign Identity — self-certifying DIDs over Ed25519
 *
 * The identity layer that "sovereign identified voting" and the value chain
 * build on. Design rules, learned from did:key / Bitcoin / SSI systems:
 *
 *  - SELF-CERTIFYING: the DID is derived from the first public key —
 *    did:vpc:<sha256(publicKeyPem)[0..32]>. Anyone can check that a key
 *    belongs to a DID with one hash; no registry has to be trusted.
 *
 *  - KEY ROTATION WITHOUT IDENTITY LOSS: the DID stays bound to the ORIGINAL
 *    key forever, but the active key can rotate. Each rotation is a
 *    hash-chained event signed by the PREVIOUS key — exactly the attention
 *    chain trick, applied to keys. A stolen current key cannot rewrite
 *    history; a verifier replays the rotation chain from the genesis key.
 *
 *  - VERIFIABLE CREDENTIALS: any DID can issue a signed claim about another
 *    DID. Credentials carry the issuer key used at issuance, and remain
 *    verifiable after the issuer rotates (the old key is still in the
 *    issuer's rotation history).
 *
 * REST (registerIdentityRoutes):
 *   POST /api/identity/register            — create a sovereign identity
 *   GET  /api/identity                     — stats + list
 *   GET  /api/identity/resolve/:did        — resolve DID document
 *   GET  /api/identity/handle/:handle      — resolve by handle
 *   POST /api/identity/:did/rotate         — rotate the active key
 *   POST /api/identity/credentials         — issue a verifiable credential
 *   POST /api/identity/credentials/verify  — verify a credential
 */

import { generateKeyPairSync, sign as edSign, verify as edVerify, createPublicKey, KeyObject } from 'crypto';
import { v4 as uuid } from 'uuid';
import type { Express, Request, Response } from 'express';
import type { LightRAGClient } from './client';
import { canonicalize, sha256 } from './graph-state-root';
import { constantTimeEqual } from './constant-time';
import type { IdentityPort } from './identity-port';
import logger from '../../utils/logger';

/** DoS bound: the in-memory identity table is capped (unauthenticated
 *  registration would otherwise allow memory exhaustion). */
export const MAX_IDENTITIES = 100_000;
export const MAX_HANDLE_LENGTH = 64;

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export const DID_PREFIX = 'did:vpc:';

/** Rotation chains start from this constant (same pattern as attention GENESIS). */
export const ROTATION_GENESIS = sha256('identity-rotation-genesis');

export interface KeyRotation {
  did: string;
  prevKeyPem: string;            // the key being retired
  newKeyPem: string;             // the key taking over
  rotatedAt: string;             // ISO wall clock
  prev: string;                  // hash of the previous rotation (or ROTATION_GENESIS)
  hash: string;                  // sha256 over the canonical rotation body
  signature: string;             // base64 Ed25519 by the PREVIOUS key
}

export interface IdentityDocument {
  did: string;
  genesisKeyPem: string;         // the key the DID was derived from — never changes
  publicKeyPem: string;          // CURRENT active key (last rotation, or genesis)
  handle?: string;               // optional human-readable name (unique per node)
  createdAt: string;
  rotations: KeyRotation[];
}

export interface VerifiableCredential {
  id: string;
  issuer: string;                // issuer DID
  subject: string;               // subject DID
  claim: Record<string, unknown>;
  issuedAt: string;
  issuerKeyPem: string;          // key used at issuance (survives later rotations)
  signature: string;             // base64 Ed25519 over the canonical credential body
}

// ──────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Derive the self-certifying DID from a public key PEM. */
export function didFromPublicKey(publicKeyPem: string): string {
  return DID_PREFIX + sha256(publicKeyPem.trim()).substring(0, 32);
}

export function isValidDid(s: unknown): s is string {
  return typeof s === 'string' && new RegExp(`^${DID_PREFIX}[0-9a-f]{32}$`).test(s);
}

/** Canonical body that a rotation's hash and signature cover. */
export function rotationBody(r: Pick<KeyRotation, 'did' | 'prevKeyPem' | 'newKeyPem' | 'rotatedAt' | 'prev'>): string {
  return canonicalize({
    did: r.did,
    prevKeyPem: r.prevKeyPem,
    newKeyPem: r.newKeyPem,
    rotatedAt: r.rotatedAt,
    prev: r.prev,
  });
}

/** Canonical body that a credential's signature covers. */
export function credentialBody(
  c: Pick<VerifiableCredential, 'id' | 'issuer' | 'subject' | 'claim' | 'issuedAt'>,
): string {
  return canonicalize({
    id: c.id,
    issuer: c.issuer,
    subject: c.subject,
    claim: c.claim,
    issuedAt: c.issuedAt,
  });
}

/**
 * Verify a full identity document: DID derives from the genesis key, every
 * rotation link verifies (hash, signature by the retiring key, prev chain),
 * and the current key equals the last rotation's new key.
 */
export function verifyIdentityDocument(doc: IdentityDocument): { valid: boolean; reason?: string } {
  if (didFromPublicKey(doc.genesisKeyPem) !== doc.did) {
    return { valid: false, reason: 'did does not derive from genesis key' };
  }
  let activeKey = doc.genesisKeyPem;
  let prev = ROTATION_GENESIS;
  for (let i = 0; i < doc.rotations.length; i++) {
    const r = doc.rotations[i];
    if (r.did !== doc.did) return { valid: false, reason: `rotation ${i}: wrong did` };
    if (r.prevKeyPem !== activeKey) return { valid: false, reason: `rotation ${i}: does not retire the active key` };
    if (!constantTimeEqual(r.prev, prev)) return { valid: false, reason: `rotation ${i}: broken prev pointer` };
    if (!constantTimeEqual(sha256(rotationBody(r)), r.hash)) return { valid: false, reason: `rotation ${i}: bad hash` };
    try {
      const key = createPublicKey(r.prevKeyPem);
      const ok = edVerify(null, Buffer.from(rotationBody(r), 'utf8'), key, Buffer.from(r.signature, 'base64'));
      if (!ok) return { valid: false, reason: `rotation ${i}: bad signature` };
    } catch {
      return { valid: false, reason: `rotation ${i}: unusable key` };
    }
    activeKey = r.newKeyPem;
    prev = r.hash;
  }
  if (doc.publicKeyPem !== activeKey) {
    return { valid: false, reason: 'current key does not match rotation chain' };
  }
  return { valid: true };
}

/** All keys a DID has ever controlled, in chronological order. */
export function keyHistory(doc: IdentityDocument): string[] {
  return [doc.genesisKeyPem, ...doc.rotations.map(r => r.newKeyPem)];
}

// ──────────────────────────────────────────────────────────────────────────────
// Service
// ──────────────────────────────────────────────────────────────────────────────

export class SovereignIdentityService implements IdentityPort {
  private lightrag: LightRAGClient;
  private docs = new Map<string, IdentityDocument>();
  private handles = new Map<string, string>();          // handle → did
  private privateKeys = new Map<string, KeyObject>();   // did → CURRENT private key (node-held)
  private maxIdentities: number;

  constructor(lightrag: LightRAGClient, opts: { maxIdentities?: number } = {}) {
    this.lightrag = lightrag;
    this.maxIdentities = opts.maxIdentities ?? MAX_IDENTITIES;
  }

  /** Create a fresh sovereign identity. The node holds the private key. */
  register(handle?: string): IdentityDocument {
    if (this.docs.size >= this.maxIdentities) {
      throw new Error('identity table full');
    }
    if (handle && handle.length > MAX_HANDLE_LENGTH) {
      throw new Error(`handle exceeds ${MAX_HANDLE_LENGTH} chars`);
    }
    if (handle && this.handles.has(handle)) {
      throw new Error(`handle "${handle}" already registered`);
    }
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const did = didFromPublicKey(publicKeyPem);

    const doc: IdentityDocument = {
      did,
      genesisKeyPem: publicKeyPem,
      publicKeyPem,
      handle,
      createdAt: new Date().toISOString(),
      rotations: [],
    };
    this.docs.set(did, doc);
    if (handle) this.handles.set(handle, did);
    this.privateKeys.set(did, privateKey);
    void this.persistDoc(doc);
    logger.info(`🪪 Sovereign identity registered: ${did}${handle ? ` (${handle})` : ''}`);
    return doc;
  }

  /**
   * Ingest an externally-controlled identity document (from a peer). The
   * document must verify end-to-end; this node never holds its private key.
   */
  receive(doc: IdentityDocument): { accepted: boolean; reason?: string } {
    if (!this.docs.has(doc.did) && this.docs.size >= this.maxIdentities) {
      return { accepted: false, reason: 'identity table full' };
    }
    if (doc.handle && doc.handle.length > MAX_HANDLE_LENGTH) {
      return { accepted: false, reason: `handle exceeds ${MAX_HANDLE_LENGTH} chars` };
    }
    const check = verifyIdentityDocument(doc);
    if (!check.valid) return { accepted: false, reason: check.reason };
    const existing = this.docs.get(doc.did);
    // Longest-valid-chain wins: a peer doc may carry rotations we missed
    if (existing && existing.rotations.length >= doc.rotations.length) {
      return { accepted: false, reason: 'no newer rotations than local copy' };
    }
    if (doc.handle && this.handles.has(doc.handle) && this.handles.get(doc.handle) !== doc.did) {
      return { accepted: false, reason: `handle "${doc.handle}" taken by another did` };
    }
    // Deep copy — the caller's object must not alias our stored state
    // (a later mutation on the peer side would otherwise rewrite our copy)
    const copy: IdentityDocument = { ...doc, rotations: doc.rotations.map(r => ({ ...r })) };
    this.docs.set(copy.did, copy);
    if (copy.handle) this.handles.set(copy.handle, copy.did);
    void this.persistDoc(copy);
    return { accepted: true };
  }

  resolve(did: string): IdentityDocument | undefined {
    return this.docs.get(did);
  }

  resolveHandle(handle: string): IdentityDocument | undefined {
    const did = this.handles.get(handle);
    return did ? this.docs.get(did) : undefined;
  }

  didForHandle(handle: string): string | null {
    return this.handles.get(handle) ?? null;
  }

  list(): IdentityDocument[] {
    return Array.from(this.docs.values());
  }

  /** Rotate the active key of a node-held identity. Signed by the OLD key. */
  rotateKey(did: string): IdentityDocument {
    const doc = this.docs.get(did);
    const oldPrivate = this.privateKeys.get(did);
    if (!doc || !oldPrivate) throw new Error(`no node-held identity for ${did}`);

    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const newKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const prev = doc.rotations.length > 0 ? doc.rotations[doc.rotations.length - 1].hash : ROTATION_GENESIS;

    const unsigned = {
      did,
      prevKeyPem: doc.publicKeyPem,
      newKeyPem,
      rotatedAt: new Date().toISOString(),
      prev,
    };
    const hash = sha256(rotationBody(unsigned));
    const signature = edSign(null, Buffer.from(rotationBody(unsigned), 'utf8'), oldPrivate).toString('base64');

    doc.rotations.push({ ...unsigned, hash, signature });
    doc.publicKeyPem = newKeyPem;
    this.privateKeys.set(did, privateKey);
    void this.persistDoc(doc);
    logger.info(`🔁 Key rotated for ${did} (rotation #${doc.rotations.length})`);
    return doc;
  }

  /** Sign arbitrary bytes as a node-held DID with its CURRENT key. */
  signAs(did: string, message: string): { signature: string; publicKeyPem: string } {
    const doc = this.docs.get(did);
    const key = this.privateKeys.get(did);
    if (!doc || !key) throw new Error(`no node-held identity for ${did}`);
    return {
      signature: edSign(null, Buffer.from(message, 'utf8'), key).toString('base64'),
      publicKeyPem: doc.publicKeyPem,
    };
  }

  /** Verify a signature against a DID's CURRENT key. */
  verifyAs(did: string, message: string, signature: string): boolean {
    const doc = this.docs.get(did);
    if (!doc) return false;
    try {
      const key = createPublicKey(doc.publicKeyPem);
      return edVerify(null, Buffer.from(message, 'utf8'), key, Buffer.from(signature, 'base64'));
    } catch {
      return false;
    }
  }

  // ── Verifiable credentials ──────────────────────────────────────────────────

  issueCredential(issuerDid: string, subjectDid: string, claim: Record<string, unknown>): VerifiableCredential {
    const issuer = this.docs.get(issuerDid);
    const key = this.privateKeys.get(issuerDid);
    if (!issuer || !key) throw new Error(`no node-held identity for issuer ${issuerDid}`);
    if (!this.docs.has(subjectDid)) throw new Error(`unknown subject ${subjectDid}`);

    const unsigned = {
      id: `vc_${uuid()}`,
      issuer: issuerDid,
      subject: subjectDid,
      claim,
      issuedAt: new Date().toISOString(),
    };
    const signature = edSign(null, Buffer.from(credentialBody(unsigned), 'utf8'), key).toString('base64');
    const vc: VerifiableCredential = { ...unsigned, issuerKeyPem: issuer.publicKeyPem, signature };
    void this.persistCredential(vc);
    return vc;
  }

  /**
   * Verify a credential: the signature must check out against the embedded
   * issuer key, and that key must appear in the issuer's key history (so
   * credentials survive issuer key rotation but a never-owned key fails).
   */
  verifyCredential(vc: VerifiableCredential): { valid: boolean; reason?: string } {
    const issuer = this.docs.get(vc.issuer);
    if (!issuer) return { valid: false, reason: 'unknown issuer' };
    if (!keyHistory(issuer).includes(vc.issuerKeyPem)) {
      return { valid: false, reason: 'issuer never controlled this key' };
    }
    try {
      const key = createPublicKey(vc.issuerKeyPem);
      const ok = edVerify(null, Buffer.from(credentialBody(vc), 'utf8'), key, Buffer.from(vc.signature, 'base64'));
      return ok ? { valid: true } : { valid: false, reason: 'signature mismatch' };
    } catch (e: any) {
      return { valid: false, reason: e.message };
    }
  }

  getStats() {
    return {
      identities: this.docs.size,
      handles: this.handles.size,
      nodeHeldKeys: this.privateKeys.size,
      totalRotations: Array.from(this.docs.values()).reduce((s, d) => s + d.rotations.length, 0),
    };
  }

  // ── Persistence (offline-safe) ──────────────────────────────────────────────

  private async persistDoc(doc: IdentityDocument): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      await this.lightrag.mergeTypedNode(doc.did.replace(/:/g, '_'), 'SovereignIdentity', {
        did: doc.did,
        handle: doc.handle ?? '',
        created_at: doc.createdAt,
        rotation_count: doc.rotations.length,
        content: `Sovereign identity ${doc.handle ?? doc.did}`,
      });
    } catch (e: any) {
      logger.warn(`identity persist: ${e.message}`);
    }
  }

  private async persistCredential(vc: VerifiableCredential): Promise<void> {
    if (!this.lightrag.isConnected()) return;
    try {
      await this.lightrag.mergeTypedNode(vc.id, 'VerifiableCredential', {
        issuer: vc.issuer,
        subject: vc.subject,
        issued_at: vc.issuedAt,
        content: `Credential by ${vc.issuer} about ${vc.subject}`,
      });
      await this.lightrag.addEdge(vc.id, 'ISSUED_BY', vc.issuer.replace(/:/g, '_'), {});
      await this.lightrag.addEdge(vc.id, 'ABOUT', vc.subject.replace(/:/g, '_'), {});
    } catch (e: any) {
      logger.warn(`credential persist: ${e.message}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// REST routes
// ──────────────────────────────────────────────────────────────────────────────

export function registerIdentityRoutes(app: Express, service: SovereignIdentityService): void {

  app.post('/api/identity/register', (req: Request, res: Response): void => {
    try {
      const doc = service.register(req.body?.handle);
      res.status(201).json({ success: true, identity: doc });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.get('/api/identity', (_req: Request, res: Response): void => {
    res.json({ success: true, ...service.getStats(), identities: service.list() });
  });

  // NB: fixed paths registered before parameterized siblings (Express order)
  app.post('/api/identity/credentials', (req: Request, res: Response): void => {
    const { issuer, subject, claim } = req.body ?? {};
    if (!issuer || !subject || !claim) {
      res.status(400).json({ success: false, error: 'issuer, subject, claim required' }); return;
    }
    try {
      res.status(201).json({ success: true, credential: service.issueCredential(issuer, subject, claim) });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/identity/credentials/verify', (req: Request, res: Response): void => {
    const vc = req.body as VerifiableCredential;
    if (!vc?.signature || !vc?.issuer) {
      res.status(400).json({ success: false, error: 'credential body required' }); return;
    }
    res.json({ success: true, ...service.verifyCredential(vc) });
  });

  app.get('/api/identity/resolve/:did', (req: Request, res: Response): void => {
    const doc = service.resolve(req.params.did);
    if (!doc) { res.status(404).json({ success: false, error: 'unknown did' }); return; }
    res.json({ success: true, identity: doc, verification: verifyIdentityDocument(doc) });
  });

  app.get('/api/identity/handle/:handle', (req: Request, res: Response): void => {
    const doc = service.resolveHandle(req.params.handle);
    if (!doc) { res.status(404).json({ success: false, error: 'unknown handle' }); return; }
    res.json({ success: true, identity: doc });
  });

  app.post('/api/identity/:did/rotate', (req: Request, res: Response): void => {
    try {
      res.json({ success: true, identity: service.rotateKey(req.params.did) });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  logger.info('✓ Sovereign Identity API registered (/api/identity/*)');
}

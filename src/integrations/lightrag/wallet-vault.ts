/**
 * Quantum-Resistant Wallet Vault + Post-Quantum Wallet Proofs
 *
 * Two responsibilities (full analysis in docs/POST-QUANTUM-WALLET.md):
 *
 * 1. VAULT — wallet secrets encrypted at rest with AES-256-GCM under a
 *    scrypt-derived key. Symmetric cryptography at 256-bit key size is
 *    quantum-resistant: Grover's algorithm halves the exponent, leaving
 *    2^128 quantum work — out of reach indefinitely. scrypt (N=2^15, r=8,
 *    p=1) makes passphrase brute-force memory-hard; GCM authenticates, so
 *    a tampered vault fails loudly instead of decrypting to garbage.
 *
 * 2. PQ WALLET PROOF — the end-to-end quantum-safe ownership statement:
 *
 *        { account state + SMT inclusion proof + state root }
 *        signed with a hash-based signature (pq-crypto.ts)
 *
 *    Every link in this proof chain rests ONLY on SHA-256 (+ AES for the
 *    vault): the SMT proof is hash-based, the state root is hash-based,
 *    and the signature is hash-based. NO elliptic-curve assumption appears
 *    anywhere — a quantum adversary capable of breaking every Ed25519 key
 *    in the ledger still cannot forge this proof.
 *
 * Custody model: like the sovereign identity service, the node holds PQ master
 * seeds in memory; the vault export is how a user takes custody. Seeds are
 * NEVER persisted in plaintext (ChainStore does not see this service).
 *
 * REST (registerPqRoutes):
 *   POST /api/users/:handle/pq/enroll       — generate + bind a PQ key
 *   GET  /api/users/:handle/pq/status       — root, remaining signatures
 *   POST /api/users/:handle/pq/prove        — quantum-safe wallet proof
 *   POST /api/pq/verify                     — stateless proof verification
 *   POST /api/users/:handle/vault/export    — encrypted vault {passphrase}
 */

import {
  createCipheriv, createDecipheriv, randomBytes, scryptSync,
} from 'crypto';
import type { Express, Request, Response } from 'express';
import {
  HashBasedSigner, HbsSignature, HbsState, verifyHbsSignature,
  HBS_DEFAULT_HEIGHT,
} from './pq-crypto';
import { verifySMTProof, SMTProof } from './sparse-merkle';
import type { IdentityResolverPort } from './identity-port';
import type { ValueChainService, Transfer } from './value-chain';
import { unitsToTokenString, accountLeafValue, tokensToUnits } from './value-chain';
import { canonicalize, sha256 } from './graph-state-root';
import logger from '../../utils/logger';

// ─── Vault encryption (quantum-safe symmetric) ───────────────────────────────

export const VAULT_VERSION = 1;

/** scrypt parameters — memory-hard passphrase stretching (~32 MB). */
export const VAULT_SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const MIN_PASSPHRASE_LENGTH = 8;

export interface EncryptedVault {
  version: number;
  kdf: 'scrypt';
  kdfParams: { N: number; r: number; p: number };
  salt: string;        // hex, 16 bytes
  iv: string;          // hex, 12 bytes
  ciphertext: string;  // base64
  authTag: string;     // hex, 16 bytes — GCM integrity
}

export function encryptVault(payload: object, passphrase: string): EncryptedVault {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
    throw new Error(`passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`);
  }
  const salt = randomBytes(16);
  const key = scryptSync(passphrase, salt, 32, VAULT_SCRYPT);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    version: VAULT_VERSION,
    kdf: 'scrypt',
    kdfParams: { N: VAULT_SCRYPT.N, r: VAULT_SCRYPT.r, p: VAULT_SCRYPT.p },
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    ciphertext: ciphertext.toString('base64'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

/** Throws on wrong passphrase OR any tampering (GCM auth failure). */
export function decryptVault<T = unknown>(vault: EncryptedVault, passphrase: string): T {
  if (vault.version !== VAULT_VERSION) throw new Error('vault version mismatch');
  if (vault.kdf !== 'scrypt') throw new Error('unsupported KDF');
  const key = scryptSync(passphrase, Buffer.from(vault.salt, 'hex'), 32, {
    ...vault.kdfParams, maxmem: VAULT_SCRYPT.maxmem,
  });
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(vault.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(vault.authTag, 'hex'));
  try {
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(vault.ciphertext, 'base64')),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8')) as T;
  } catch {
    throw new Error('vault decryption failed: wrong passphrase or tampered data');
  }
}

/** What a vault export contains. */
export interface VaultContents {
  did: string;
  handle?: string;
  pqMasterSeed: string;   // hex — re-derives the full PQ key
  pqHeight: number;
  pqState: HbsState;      // used indexes — MUST travel with the seed
  pqRoot: string;
  exportedAt: string;
}

// ─── PQ wallet proof ─────────────────────────────────────────────────────────

/** The exact payload a wallet proof signature covers (canonicalized). */
export interface WalletProofPayload {
  version: number;
  did: string;
  balanceUnits: string;
  balanceTokens: string;
  nonce: number;
  stateRoot: string;
  issuedAt: string;
}

export interface WalletProof {
  payload: WalletProofPayload;
  smtProof: SMTProof;      // account → stateRoot (hash-based)
  pqRoot: string;          // hash-based public key bound to the DID
  pqSignature: HbsSignature; // hash-based signature over the payload
}

export function walletProofMessage(payload: WalletProofPayload): string {
  return sha256(canonicalize(payload));
}

/**
 * Stateless verification of a full quantum-safe wallet proof:
 *  1. The hash-based signature verifies under the claimed PQ root.
 *  2. The SMT proof verifies under the payload's state root.
 *  3. The SMT leaf value commits to exactly the claimed (balance, nonce).
 * The caller must independently know (a) that pqRoot is bound to the DID
 * (via /api/users/:handle/pq/status or an out-of-band enrollment record)
 * and (b) a trusted stateRoot (e.g. from a finalized block).
 */
export function verifyWalletProof(proof: WalletProof): { valid: boolean; reason?: string } {
  const { payload, smtProof, pqRoot, pqSignature } = proof;
  if (!payload || !smtProof || !pqRoot || !pqSignature) {
    return { valid: false, reason: 'incomplete proof' };
  }
  if (!verifyHbsSignature(walletProofMessage(payload), pqSignature, pqRoot)) {
    return { valid: false, reason: 'post-quantum signature invalid' };
  }
  if (!verifySMTProof(smtProof, payload.stateRoot)) {
    return { valid: false, reason: 'SMT proof does not verify against state root' };
  }
  let expectedLeaf: string;
  try {
    expectedLeaf = accountLeafValue({ balance: BigInt(payload.balanceUnits), nonce: payload.nonce });
  } catch {
    return { valid: false, reason: 'malformed balanceUnits' };
  }
  if (smtProof.included && smtProof.value !== expectedLeaf) {
    return { valid: false, reason: 'SMT leaf does not match claimed account state' };
  }
  if (!smtProof.included && (payload.balanceUnits !== '0' || payload.nonce !== 0)) {
    return { valid: false, reason: 'non-inclusion proof but non-zero account claimed' };
  }
  return { valid: true };
}

// ─── Service ─────────────────────────────────────────────────────────────────

interface PqEnrollment {
  did: string;
  signer: HashBasedSigner;
  enrolledAt: string;
}

export class PqWalletService {
  private enrollments = new Map<string, PqEnrollment>(); // did → enrollment

  constructor(
    private readonly identity: IdentityResolverPort,
    private readonly valueChain: ValueChainService,
    private readonly opts: { treeHeight?: number } = {},
  ) {}

  private resolveDid(handle: string): string {
    const doc = this.identity.list().find(d => d.handle === handle);
    if (!doc) throw new Error(`unknown handle: ${handle}`);
    return doc.did;
  }

  /**
   * Generate a fresh hash-based key and bind it to the handle's DID.
   * Idempotent per DID — re-enrolling returns the existing key info
   * (a second key would silently orphan the first one's state).
   */
  enroll(handle: string): { did: string; pqRoot: string; remainingSignatures: number; alreadyEnrolled: boolean } {
    const did = this.resolveDid(handle);
    const existing = this.enrollments.get(did);
    if (existing) {
      const info = existing.signer.getInfo();
      return { did, pqRoot: info.root, remainingSignatures: info.remainingSignatures, alreadyEnrolled: true };
    }
    const signer = new HashBasedSigner(undefined, this.opts.treeHeight ?? HBS_DEFAULT_HEIGHT);
    this.enrollments.set(did, { did, signer, enrolledAt: new Date().toISOString() });
    const info = signer.getInfo();
    logger.info(`🔐 PQ key enrolled for ${did}: root=${info.root.slice(0, 16)}… (${info.totalSignatures} one-time sigs)`);
    return { did, pqRoot: info.root, remainingSignatures: info.remainingSignatures, alreadyEnrolled: false };
  }

  status(handle: string): { did: string; enrolled: boolean; pqRoot?: string; remainingSignatures?: number; enrolledAt?: string } {
    const did = this.resolveDid(handle);
    const e = this.enrollments.get(did);
    if (!e) return { did, enrolled: false };
    const info = e.signer.getInfo();
    return {
      did, enrolled: true, pqRoot: info.root,
      remainingSignatures: info.remainingSignatures, enrolledAt: e.enrolledAt,
    };
  }

  /**
   * Build the quantum-safe wallet proof for the CURRENT chain state. Consumes
   * one one-time signature index.
   */
  prove(handle: string): WalletProof {
    const did = this.resolveDid(handle);
    const e = this.enrollments.get(did);
    if (!e) throw new Error('not PQ-enrolled — POST /pq/enroll first');

    const { account, proof, stateRoot } = this.valueChain.proveAccount(did);
    const payload: WalletProofPayload = {
      version: VAULT_VERSION,
      did,
      balanceUnits: account.balance.toString(),
      balanceTokens: unitsToTokenString(account.balance),
      nonce: account.nonce,
      stateRoot,
      issuedAt: new Date().toISOString(),
    };
    const pqSignature = e.signer.sign(walletProofMessage(payload));
    return { payload, smtProof: proof, pqRoot: e.signer.root, pqSignature };
  }

  /** The enrolled PQ root for a DID, if any — the value-chain binding check
   *  resolves through this (valueChain.setPqRootResolver). */
  getEnrolledRoot(did: string): string | undefined {
    return this.enrollments.get(did)?.signer.root;
  }

  /**
   * Phase-2 hybrid transfer (POST-QUANTUM-WALLET.md §6): node-held Ed25519
   * signature PLUS a hash-based co-signature over the same payload bytes.
   * Consumes one one-time signature index.
   */
  transferHybrid(handle: string, toDid: string, amountUnits: bigint | string, memo = ''): Transfer {
    const did = this.resolveDid(handle);
    const e = this.enrollments.get(did);
    if (!e) throw new Error('not PQ-enrolled — POST /pq/enroll first');
    return this.valueChain.transfer(did, toDid, amountUnits, memo, {
      pqCoSign: (payload: string) => ({ pqRoot: e.signer.root, pqSignature: e.signer.sign(payload) }),
    });
  }

  /** Encrypted vault export — the user takes custody of the PQ key. */
  exportVault(handle: string, passphrase: string): EncryptedVault {
    const did = this.resolveDid(handle);
    const e = this.enrollments.get(did);
    if (!e) throw new Error('not PQ-enrolled — nothing to export');
    const doc = this.identity.resolve(did);
    const contents: VaultContents = {
      did,
      handle: doc?.handle,
      pqMasterSeed: e.signer.exportSeed().toString('hex'),
      pqHeight: e.signer.getInfo().height,
      pqState: e.signer.exportState(),
      pqRoot: e.signer.root,
      exportedAt: new Date().toISOString(),
    };
    return encryptVault(contents, passphrase);
  }
}

// ─── REST routes ─────────────────────────────────────────────────────────────

export function registerPqRoutes(app: Express, svc: PqWalletService): void {

  app.post('/api/users/:handle/pq/enroll', (req: Request, res: Response): void => {
    try {
      const result = svc.enroll(req.params.handle);
      res.status(result.alreadyEnrolled ? 200 : 201).json({ success: true, ...result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.get('/api/users/:handle/pq/status', (req: Request, res: Response): void => {
    try {
      res.json({ success: true, ...svc.status(req.params.handle) });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  });

  app.post('/api/users/:handle/pq/prove', (req: Request, res: Response): void => {
    try {
      const proof = svc.prove(req.params.handle);
      res.status(201).json({ success: true, proof });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/pq/verify', (req: Request, res: Response): void => {
    const proof = req.body?.proof as WalletProof | undefined;
    if (!proof) {
      res.status(400).json({ success: false, error: 'proof body required' }); return;
    }
    const result = verifyWalletProof(proof);
    res.status(result.valid ? 200 : 422).json({ success: result.valid, ...result });
  });

  app.post('/api/users/:handle/pq/transfer', (req: Request, res: Response): void => {
    const { to, units, tokens, memo } = req.body ?? {};
    if (!to) { res.status(400).json({ success: false, error: 'to DID required' }); return; }
    let amountUnits: bigint | string;
    try {
      if (units !== undefined) amountUnits = String(units);
      else if (typeof tokens === 'number') amountUnits = tokensToUnits(tokens);
      else { res.status(400).json({ success: false, error: 'units or tokens required' }); return; }
    } catch (e: any) {
      res.status(422).json({ success: false, error: e.message }); return;
    }
    try {
      const tx = svc.transferHybrid(req.params.handle, String(to), amountUnits, memo ? String(memo) : '');
      res.status(201).json({ success: true, transfer: tx });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  app.post('/api/users/:handle/vault/export', (req: Request, res: Response): void => {
    const passphrase = req.body?.passphrase;
    if (typeof passphrase !== 'string') {
      res.status(400).json({ success: false, error: 'passphrase required' }); return;
    }
    try {
      const vault = svc.exportVault(req.params.handle, passphrase);
      res.status(201).json({ success: true, vault });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  });

  logger.info('✓ Post-quantum wallet API registered (/api/users/:handle/pq/*, /api/pq/verify)');
}

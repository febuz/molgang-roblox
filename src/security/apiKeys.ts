/**
 * Service-to-service API key management (backlog: VirtualPC Auth improvement
 * "API key management for service-to-service auth").
 *
 * Self-contained primitive — does not touch the auth routes/system. Keys are
 * shown once at issue time as `vpk_<id>.<secret>`; only a scrypt hash of the
 * secret is retained, so a leak of the stored records cannot reconstruct keys.
 * Verification is constant-time. Keys can carry scopes, expire, and be revoked.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const PREFIX = 'vpk_';
const ID_BYTES = 6; // 12 hex chars — public, non-secret identifier
const SECRET_BYTES = 24; // 192-bit secret
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

export interface ApiKeyRecord {
  id: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  expiresAt?: Date;
  revoked: boolean;
  /** scrypt hash + salt of the secret (never the secret itself). */
  hash: string;
  salt: string;
}

/** Public view of a key (safe to list — no hash/salt). */
export interface ApiKeyInfo {
  id: string;
  name: string;
  scopes: string[];
  createdAt: Date;
  expiresAt?: Date;
  revoked: boolean;
}

export interface IssuedApiKey {
  /** The full key — shown ONCE, never recoverable afterwards. */
  key: string;
  info: ApiKeyInfo;
}

export interface VerifyResult {
  ok: boolean;
  reason?: 'malformed' | 'unknown' | 'revoked' | 'expired' | 'bad_secret';
  info?: ApiKeyInfo;
}

function toInfo(r: ApiKeyRecord): ApiKeyInfo {
  return {
    id: r.id,
    name: r.name,
    scopes: [...r.scopes],
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    revoked: r.revoked,
  };
}

export class ApiKeyManager {
  private readonly keys = new Map<string, ApiKeyRecord>();

  /** Override for tests; real calls use the wall clock. */
  protected now(): number {
    return Date.now();
  }

  /**
   * Issue a new key for a service. Returns the full key string ONCE — store it
   * securely; only its hash is kept here.
   */
  issue(name: string, opts: { scopes?: string[]; ttlMs?: number } = {}): IssuedApiKey {
    if (!name || typeof name !== 'string') throw new Error('ApiKeyManager.issue: name is required');
    const id = randomBytes(ID_BYTES).toString('hex');
    const secret = randomBytes(SECRET_BYTES).toString('base64url');
    const salt = randomBytes(SALT_BYTES);
    const hash = scryptSync(secret, salt, SCRYPT_KEYLEN);

    const record: ApiKeyRecord = {
      id,
      name,
      scopes: opts.scopes ? [...opts.scopes] : [],
      createdAt: new Date(this.now()),
      expiresAt: opts.ttlMs ? new Date(this.now() + opts.ttlMs) : undefined,
      revoked: false,
      hash: hash.toString('base64'),
      salt: salt.toString('base64'),
    };
    this.keys.set(id, record);
    return { key: `${PREFIX}${id}.${secret}`, info: toInfo(record) };
  }

  /** Verify a presented key. Constant-time secret comparison; never throws. */
  verify(presented: string): VerifyResult {
    if (typeof presented !== 'string' || !presented.startsWith(PREFIX)) {
      return { ok: false, reason: 'malformed' };
    }
    const body = presented.slice(PREFIX.length);
    const dot = body.indexOf('.');
    if (dot <= 0 || dot === body.length - 1) return { ok: false, reason: 'malformed' };
    const id = body.slice(0, dot);
    const secret = body.slice(dot + 1);

    const record = this.keys.get(id);
    if (!record) return { ok: false, reason: 'unknown' };
    if (record.revoked) return { ok: false, reason: 'revoked', info: toInfo(record) };
    if (record.expiresAt && this.now() > record.expiresAt.getTime()) {
      return { ok: false, reason: 'expired', info: toInfo(record) };
    }

    const expected = Buffer.from(record.hash, 'base64');
    const derived = scryptSync(secret, Buffer.from(record.salt, 'base64'), SCRYPT_KEYLEN);
    if (derived.length !== expected.length || !timingSafeEqual(derived, expected)) {
      return { ok: false, reason: 'bad_secret' };
    }
    return { ok: true, info: toInfo(record) };
  }

  /** Revoke a key by id. Returns true if a key was revoked. */
  revoke(id: string): boolean {
    const record = this.keys.get(id);
    if (!record || record.revoked) return false;
    record.revoked = true;
    return true;
  }

  /** True if a verified key carries the given scope. */
  hasScope(info: ApiKeyInfo, scope: string): boolean {
    return info.scopes.includes(scope);
  }

  /** List all keys (public info only — no hashes). */
  list(): ApiKeyInfo[] {
    return [...this.keys.values()].map(toInfo);
  }
}

export default ApiKeyManager;

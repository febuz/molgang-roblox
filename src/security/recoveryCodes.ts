/**
 * 2FA recovery (backup) codes.
 *
 * Self-contained primitive (no auth-route/system edits): generates one-time
 * codes a user keeps to regain access if they lose their TOTP authenticator.
 * Codes are shown ONCE; only scrypt hashes are stored. Verification is
 * constant-time, dash/case-insensitive, and single-use (consumed on success).
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Crockford-ish base32 alphabet — no ambiguous 0/O/1/I/L.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LEN = 10; // -> formatted as XXXXX-XXXXX
const DEFAULT_COUNT = 10;
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

interface CodeRecord {
  hash: string;
  salt: string;
  usedAt?: Date;
}

/** Normalize for hashing/compare: strip dashes/space, uppercase. */
function normalize(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

function randomCode(): string {
  const bytes = randomBytes(CODE_LEN);
  let raw = '';
  for (let i = 0; i < CODE_LEN; i++) raw += ALPHABET[bytes[i] % ALPHABET.length];
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export class RecoveryCodeManager {
  private readonly sets = new Map<string, CodeRecord[]>();

  /** Override for tests. */
  protected now(): number {
    return Date.now();
  }

  private hash(code: string, salt: Buffer): Buffer {
    return scryptSync(normalize(code), salt, SCRYPT_KEYLEN);
  }

  /**
   * Generate a fresh set of codes for a user, replacing any existing set.
   * Returns the plaintext codes ONCE — they are not recoverable afterwards.
   */
  generate(userId: string, count: number = DEFAULT_COUNT): string[] {
    if (!userId) throw new Error('RecoveryCodeManager.generate: userId is required');
    const n = Math.max(1, Math.min(Math.floor(count) || DEFAULT_COUNT, 50));
    const codes: string[] = [];
    const records: CodeRecord[] = [];
    for (let i = 0; i < n; i++) {
      const code = randomCode();
      const salt = randomBytes(SALT_BYTES);
      records.push({ hash: this.hash(code, salt).toString('base64'), salt: salt.toString('base64') });
      codes.push(code);
    }
    this.sets.set(userId, records);
    return codes;
  }

  /**
   * Verify a code for a user. On the first matching unused code, marks it used
   * (single-use) and returns true. Constant-time per candidate.
   */
  verify(userId: string, code: string): boolean {
    if (typeof code !== 'string' || !code.trim()) return false;
    const records = this.sets.get(userId);
    if (!records) return false;

    for (const record of records) {
      if (record.usedAt) continue;
      const expected = Buffer.from(record.hash, 'base64');
      const derived = this.hash(code, Buffer.from(record.salt, 'base64'));
      if (derived.length === expected.length && timingSafeEqual(derived, expected)) {
        record.usedAt = new Date(this.now());
        return true;
      }
    }
    return false;
  }

  /** Number of unused codes remaining for a user. */
  remaining(userId: string): number {
    const records = this.sets.get(userId);
    return records ? records.filter(r => !r.usedAt).length : 0;
  }

  /** Whether a user has a recovery-code set. */
  has(userId: string): boolean {
    return this.sets.has(userId);
  }

  /** Remove a user's codes entirely (e.g. on 2FA disable). */
  clear(userId: string): void {
    this.sets.delete(userId);
  }
}

export default RecoveryCodeManager;

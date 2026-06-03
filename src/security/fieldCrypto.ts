/**
 * Field-level encryption for sensitive data at rest (backlog 6.5.20).
 *
 * AES-256-GCM with a random 96-bit IV per value and an authentication tag, so
 * tampering (or a wrong key) is detected on decrypt rather than silently
 * returning garbage. Tokens are versioned and self-describing:
 *
 *     v1:<iv-b64>:<tag-b64>:<ciphertext-b64>
 *
 * Intended for fields like TOTP secrets and PII that must be readable by the
 * app (unlike passwords, which are one-way hashed — see AuthSystem).
 */

import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

const VERSION = 'v1';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit nonce, recommended for GCM
const KEY_BYTES = 32; // AES-256
const HEX64 = /^[0-9a-fA-F]{64}$/;
const KEY_SALT = 'virtualpc-field-crypto-v1'; // fixed salt for passphrase derivation

export class FieldCrypto {
  private readonly key: Buffer;

  /**
   * @param secret Either a 64-char hex string (used as the raw 32-byte key) or
   *   any other non-empty string (a passphrase, from which a key is derived via
   *   scrypt). Supplying a real 32-byte key is strongly preferred in production.
   */
  constructor(secret: string) {
    if (!secret || typeof secret !== 'string') {
      throw new Error('FieldCrypto: a non-empty key/passphrase is required');
    }
    this.key = HEX64.test(secret) ? Buffer.from(secret, 'hex') : scryptSync(secret, KEY_SALT, KEY_BYTES);
  }

  /** Build from process.env.FIELD_ENCRYPTION_KEY. Throws if it is not set. */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): FieldCrypto {
    const secret = env.FIELD_ENCRYPTION_KEY;
    if (!secret) {
      throw new Error('FieldCrypto.fromEnv: FIELD_ENCRYPTION_KEY is not set');
    }
    return new FieldCrypto(secret);
  }

  /** Encrypt a plaintext string into a versioned token. */
  encrypt(plaintext: string): string {
    if (typeof plaintext !== 'string') {
      throw new Error('FieldCrypto.encrypt: plaintext must be a string');
    }
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  /** Decrypt a token produced by encrypt(). Throws on tampering or wrong key. */
  decrypt(token: string): string {
    if (typeof token !== 'string') {
      throw new Error('FieldCrypto.decrypt: token must be a string');
    }
    const parts = token.split(':');
    if (parts.length !== 4 || parts[0] !== VERSION) {
      throw new Error('FieldCrypto.decrypt: malformed or unsupported token');
    }
    const [, ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    if (iv.length !== IV_BYTES) {
      throw new Error('FieldCrypto.decrypt: bad IV length');
    }
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    // .final() throws if the auth tag does not verify (tamper / wrong key).
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  /** True if a value looks like a token this class produced. */
  isEncrypted(value: unknown): boolean {
    return typeof value === 'string' && value.startsWith(`${VERSION}:`) && value.split(':').length === 4;
  }

  /** Encrypt unless already encrypted; passes null/undefined through unchanged. */
  encryptField<T extends string | null | undefined>(value: T): T | string {
    if (value === null || value === undefined) return value;
    return this.isEncrypted(value) ? value : this.encrypt(value as string);
  }

  /** Decrypt if it's a token; otherwise return as-is (handles legacy plaintext). */
  decryptField<T extends string | null | undefined>(value: T): T | string {
    if (value === null || value === undefined) return value;
    return this.isEncrypted(value) ? this.decrypt(value as string) : value;
  }
}

export default FieldCrypto;

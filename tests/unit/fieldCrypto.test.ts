import FieldCrypto from '../../src/security/fieldCrypto';

/**
 * Unit tests for FieldCrypto (backlog 6.5.20).
 * AES-256-GCM round-trips, IV uniqueness, tamper/wrong-key detection,
 * key normalisation, and the null-safe field helpers.
 */

const HEX_KEY = 'a'.repeat(64); // valid 32-byte hex key
const OTHER_HEX_KEY = 'b'.repeat(64);

describe('FieldCrypto', () => {
  let fc: FieldCrypto;

  beforeEach(() => {
    fc = new FieldCrypto(HEX_KEY);
  });

  describe('construction', () => {
    it('throws on an empty key', () => {
      expect(() => new FieldCrypto('')).toThrow(/key/);
    });

    it('accepts a 64-hex-char raw key and a passphrase alike', () => {
      expect(() => new FieldCrypto(HEX_KEY)).not.toThrow();
      expect(() => new FieldCrypto('correct horse battery staple')).not.toThrow();
    });

    it('fromEnv reads FIELD_ENCRYPTION_KEY and throws when unset', () => {
      expect(() => FieldCrypto.fromEnv({} as NodeJS.ProcessEnv)).toThrow(/FIELD_ENCRYPTION_KEY/);
      const fromEnv = FieldCrypto.fromEnv({ FIELD_ENCRYPTION_KEY: HEX_KEY } as any);
      const token = fromEnv.encrypt('hi');
      expect(new FieldCrypto(HEX_KEY).decrypt(token)).toBe('hi');
    });
  });

  describe('round-trip', () => {
    it('decrypts back to the original plaintext', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      expect(fc.decrypt(fc.encrypt(secret))).toBe(secret);
    });

    it('round-trips unicode and empty strings', () => {
      for (const s of ['', '🔐 sécret — 秘密', 'a'.repeat(5000)]) {
        expect(fc.decrypt(fc.encrypt(s))).toBe(s);
      }
    });

    it('produces a versioned 4-part token that differs from the plaintext', () => {
      const token = fc.encrypt('plaintext');
      expect(token).not.toContain('plaintext');
      expect(token.startsWith('v1:')).toBe(true);
      expect(token.split(':')).toHaveLength(4);
    });

    it('uses a fresh IV each call (same input -> different ciphertext)', () => {
      expect(fc.encrypt('same')).not.toBe(fc.encrypt('same'));
    });
  });

  describe('integrity / confidentiality', () => {
    it('fails to decrypt with the wrong key', () => {
      const token = fc.encrypt('topsecret');
      expect(() => new FieldCrypto(OTHER_HEX_KEY).decrypt(token)).toThrow();
    });

    it('detects a tampered ciphertext (GCM auth tag)', () => {
      const token = fc.encrypt('topsecret');
      const parts = token.split(':');
      const data = Buffer.from(parts[3], 'base64');
      data[0] ^= 0xff; // flip a byte
      parts[3] = data.toString('base64');
      expect(() => fc.decrypt(parts.join(':'))).toThrow();
    });

    it('detects a tampered auth tag', () => {
      const token = fc.encrypt('topsecret');
      const parts = token.split(':');
      const tag = Buffer.from(parts[2], 'base64');
      tag[0] ^= 0xff;
      parts[2] = tag.toString('base64');
      expect(() => fc.decrypt(parts.join(':'))).toThrow();
    });

    it('rejects malformed / unsupported tokens', () => {
      expect(() => fc.decrypt('not-a-token')).toThrow(/malformed/);
      expect(() => fc.decrypt('v2:a:b:c')).toThrow(/unsupported|malformed/);
      expect(() => fc.decrypt('v1:only:three')).toThrow(/malformed/);
    });
  });

  describe('isEncrypted', () => {
    it('recognises its own tokens and rejects plaintext', () => {
      expect(fc.isEncrypted(fc.encrypt('x'))).toBe(true);
      expect(fc.isEncrypted('plain text')).toBe(false);
      expect(fc.isEncrypted('v1:incomplete')).toBe(false);
      expect(fc.isEncrypted(null)).toBe(false);
      expect(fc.isEncrypted(42)).toBe(false);
    });
  });

  describe('field helpers', () => {
    it('encryptField is idempotent and null-safe', () => {
      expect(fc.encryptField(null)).toBeNull();
      expect(fc.encryptField(undefined)).toBeUndefined();
      const once = fc.encryptField('secret') as string;
      expect(fc.isEncrypted(once)).toBe(true);
      // Re-encrypting an already-encrypted value is a no-op.
      expect(fc.encryptField(once)).toBe(once);
    });

    it('decryptField handles tokens, legacy plaintext, and null', () => {
      const token = fc.encrypt('secret');
      expect(fc.decryptField(token)).toBe('secret');
      expect(fc.decryptField('legacy-plaintext')).toBe('legacy-plaintext'); // passthrough
      expect(fc.decryptField(null)).toBeNull();
    });

    it('encryptField then decryptField is the identity for real values', () => {
      const v = 'sensitive@example.com';
      expect(fc.decryptField(fc.encryptField(v) as string)).toBe(v);
    });
  });
});

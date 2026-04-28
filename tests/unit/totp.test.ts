import {
  base32Encode,
  base32Decode,
  generateSecret,
  generateTotp,
  verifyTotp,
  otpauthUri,
  TOTP_PERIOD_SECONDS,
} from '../../src/auth/totp';

/**
 * RFC 6238 Appendix B uses the ASCII secret "12345678901234567890". The
 * spec lists 8-digit reference codes; this implementation produces 6 digits,
 * so the expected values below are the last 6 digits of those references.
 */
const RFC_SECRET_ASCII = '12345678901234567890';
const RFC_SECRET_BASE32 = base32Encode(Buffer.from(RFC_SECRET_ASCII));

describe('base32 round-trip', () => {
  it('encodes then decodes arbitrary bytes back to the original', () => {
    const original = Buffer.from([0x00, 0x01, 0x7f, 0xff, 0xab, 0xcd, 0xef]);
    expect(base32Decode(base32Encode(original)).equals(original)).toBe(true);
  });

  it('throws on invalid base32 input', () => {
    expect(() => base32Decode('!!!')).toThrow();
  });
});

describe('generateSecret', () => {
  it('returns a 32-character (20 raw bytes) base32 string', () => {
    const s = generateSecret();
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Decode(s).length).toBe(20);
  });

  it('returns a different value each call', () => {
    expect(generateSecret()).not.toBe(generateSecret());
  });
});

describe('TOTP RFC 6238 vectors (last 6 digits)', () => {
  const cases: [number, string][] = [
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ];

  for (const [unixSec, expected] of cases) {
    it(`t=${unixSec}s → ${expected}`, () => {
      expect(generateTotp(RFC_SECRET_BASE32, unixSec * 1000)).toBe(expected);
    });
  }
});

describe('verifyTotp', () => {
  const NOW = 1700000000_000;

  it('accepts a code generated for the current step', () => {
    const code = generateTotp(RFC_SECRET_BASE32, NOW);
    expect(verifyTotp(RFC_SECRET_BASE32, code, NOW)).toBe(true);
  });

  it('accepts a code from one step earlier (clock-skew tolerance)', () => {
    const codePrev = generateTotp(RFC_SECRET_BASE32, NOW - TOTP_PERIOD_SECONDS * 1000);
    expect(verifyTotp(RFC_SECRET_BASE32, codePrev, NOW)).toBe(true);
  });

  it('accepts a code from one step later', () => {
    const codeNext = generateTotp(RFC_SECRET_BASE32, NOW + TOTP_PERIOD_SECONDS * 1000);
    expect(verifyTotp(RFC_SECRET_BASE32, codeNext, NOW)).toBe(true);
  });

  it('rejects a code from two steps earlier (outside tolerance)', () => {
    const codeOld = generateTotp(RFC_SECRET_BASE32, NOW - 2 * TOTP_PERIOD_SECONDS * 1000);
    expect(verifyTotp(RFC_SECRET_BASE32, codeOld, NOW)).toBe(false);
  });

  it('rejects a malformed code', () => {
    expect(verifyTotp(RFC_SECRET_BASE32, 'abcdef', NOW)).toBe(false);
    expect(verifyTotp(RFC_SECRET_BASE32, '12345', NOW)).toBe(false);
    expect(verifyTotp(RFC_SECRET_BASE32, '1234567', NOW)).toBe(false);
  });
});

describe('otpauthUri', () => {
  it('builds a parseable otpauth:// URI', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const uri = otpauthUri({
      secretBase32: secret,
      issuer: 'VirtualPC',
      accountName: 'ceo@virtualpc.local',
    });
    expect(uri.startsWith('otpauth://totp/VirtualPC%3A')).toBe(true);
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain('issuer=VirtualPC');
    expect(uri).toContain('algorithm=SHA1');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});

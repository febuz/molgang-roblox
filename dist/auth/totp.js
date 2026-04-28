"use strict";
/**
 * TOTP (RFC 6238) — Time-based One-Time Password.
 *
 * 30-second period, 6 digits, HMAC-SHA1. Verified against the test vectors
 * in RFC 6238 Appendix B.
 *
 * Secrets are stored as base32 (RFC 4648, no padding) so they can be pasted
 * directly into authenticator apps. otpauth:// URI lets apps QR-import.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOTP_DIGITS = exports.TOTP_PERIOD_SECONDS = void 0;
exports.base32Encode = base32Encode;
exports.base32Decode = base32Decode;
exports.generateSecret = generateSecret;
exports.generateTotp = generateTotp;
exports.verifyTotp = verifyTotp;
exports.otpauthUri = otpauthUri;
const crypto_1 = require("crypto");
exports.TOTP_PERIOD_SECONDS = 30;
exports.TOTP_DIGITS = 6;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
/**
 * Encode raw bytes as RFC 4648 base32 (no padding).
 */
function base32Encode(buf) {
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0)
        out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    return out;
}
/**
 * Decode RFC 4648 base32 (case-insensitive, padding optional). Throws on
 * characters outside the alphabet so a typo'd secret fails loudly.
 */
function base32Decode(input) {
    const cleaned = input.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
    let bits = 0;
    let value = 0;
    const out = [];
    for (const c of cleaned) {
        const idx = BASE32_ALPHABET.indexOf(c);
        if (idx < 0)
            throw new Error(`Invalid base32 character: ${c}`);
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}
/**
 * Generate a 160-bit (20-byte) secret as base32 — matches Google
 * Authenticator's default key length and SHA-1 block size.
 */
function generateSecret() {
    return base32Encode((0, crypto_1.randomBytes)(20));
}
/**
 * HOTP — HMAC-SHA1 of the 8-byte counter, then dynamic truncation per
 * RFC 4226 section 5.3.
 */
function hotp(secret, counter) {
    const counterBuf = Buffer.alloc(8);
    // counter is at most ~5e10 for any plausible TOTP epoch — fits in 32 bits
    // for the next ~6800 years from 1970, so writing the high half as 0 is fine.
    counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
    counterBuf.writeUInt32BE(counter >>> 0, 4);
    const hmac = (0, crypto_1.createHmac)('sha1', secret).update(counterBuf).digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const code = ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    return (code % 10 ** exports.TOTP_DIGITS).toString().padStart(exports.TOTP_DIGITS, '0');
}
/**
 * Generate the TOTP code for the given timestamp (defaults to now).
 */
function generateTotp(secretBase32, atUnixMs = Date.now()) {
    const secret = base32Decode(secretBase32);
    const counter = Math.floor(atUnixMs / 1000 / exports.TOTP_PERIOD_SECONDS);
    return hotp(secret, counter);
}
/**
 * Verify a user-supplied 6-digit code against the secret. Accepts ±1 step
 * (so up to 30s skew before/after) which is the de-facto standard tolerance.
 * Constant-time compare to avoid leaking which step matched.
 */
function verifyTotp(secretBase32, code, atUnixMs = Date.now()) {
    if (!/^\d{6}$/.test(code))
        return false;
    const secret = base32Decode(secretBase32);
    const counter = Math.floor(atUnixMs / 1000 / exports.TOTP_PERIOD_SECONDS);
    const expected = Buffer.from(code);
    for (const skew of [-1, 0, 1]) {
        const candidate = Buffer.from(hotp(secret, counter + skew));
        if (candidate.length === expected.length && (0, crypto_1.timingSafeEqual)(candidate, expected)) {
            return true;
        }
    }
    return false;
}
/**
 * Build an otpauth:// URI per the Google Authenticator key-uri format so
 * authenticator apps can QR-import. issuer + accountName are URL-encoded.
 */
function otpauthUri(opts) {
    const label = encodeURIComponent(`${opts.issuer}:${opts.accountName}`);
    const params = new URLSearchParams({
        secret: opts.secretBase32,
        issuer: opts.issuer,
        algorithm: 'SHA1',
        digits: String(exports.TOTP_DIGITS),
        period: String(exports.TOTP_PERIOD_SECONDS),
    });
    return `otpauth://totp/${label}?${params.toString()}`;
}
//# sourceMappingURL=totp.js.map
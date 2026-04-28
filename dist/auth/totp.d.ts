/**
 * TOTP (RFC 6238) — Time-based One-Time Password.
 *
 * 30-second period, 6 digits, HMAC-SHA1. Verified against the test vectors
 * in RFC 6238 Appendix B.
 *
 * Secrets are stored as base32 (RFC 4648, no padding) so they can be pasted
 * directly into authenticator apps. otpauth:// URI lets apps QR-import.
 */
export declare const TOTP_PERIOD_SECONDS = 30;
export declare const TOTP_DIGITS = 6;
/**
 * Encode raw bytes as RFC 4648 base32 (no padding).
 */
export declare function base32Encode(buf: Buffer): string;
/**
 * Decode RFC 4648 base32 (case-insensitive, padding optional). Throws on
 * characters outside the alphabet so a typo'd secret fails loudly.
 */
export declare function base32Decode(input: string): Buffer;
/**
 * Generate a 160-bit (20-byte) secret as base32 — matches Google
 * Authenticator's default key length and SHA-1 block size.
 */
export declare function generateSecret(): string;
/**
 * Generate the TOTP code for the given timestamp (defaults to now).
 */
export declare function generateTotp(secretBase32: string, atUnixMs?: number): string;
/**
 * Verify a user-supplied 6-digit code against the secret. Accepts ±1 step
 * (so up to 30s skew before/after) which is the de-facto standard tolerance.
 * Constant-time compare to avoid leaking which step matched.
 */
export declare function verifyTotp(secretBase32: string, code: string, atUnixMs?: number): boolean;
/**
 * Build an otpauth:// URI per the Google Authenticator key-uri format so
 * authenticator apps can QR-import. issuer + accountName are URL-encoded.
 */
export declare function otpauthUri(opts: {
    secretBase32: string;
    issuer: string;
    accountName: string;
}): string;
//# sourceMappingURL=totp.d.ts.map
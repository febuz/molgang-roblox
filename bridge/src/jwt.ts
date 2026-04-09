/**
 * bridge/src/jwt.ts
 * HS256 JWT signing and verification using Web Crypto API
 * (no external library — runs natively in Cloudflare Workers)
 */

import type { SessionPayload } from "./types";

const ALG = { name: "HMAC", hash: "SHA-256" };

// Import the raw secret string as a CryptoKey
async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey("raw", enc.encode(secret), ALG, false, [
    "sign",
    "verify",
  ]);
}

// base64url encode (no padding)
function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// base64url decode
function b64urlDecode(str: string): ArrayBuffer {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

/**
 * Sign a JWT with HS256.
 * Returns compact JWT string: header.payload.signature
 */
export async function signJWT(
  payload: SessionPayload,
  secret: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = new TextEncoder();

  const headerB64 = b64url(enc.encode(JSON.stringify(header)).buffer as ArrayBuffer);
  const payloadB64 = b64url(enc.encode(JSON.stringify(payload)).buffer as ArrayBuffer);
  const sigInput = `${headerB64}.${payloadB64}`;

  const key = await getKey(secret);
  const sigBuf = await crypto.subtle.sign(ALG, key, enc.encode(sigInput));
  const sigB64 = b64url(sigBuf);

  return `${sigInput}.${sigB64}`;
}

/**
 * Verify a JWT and return the payload.
 * Throws if signature invalid or token expired.
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<SessionPayload> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed token");
  }

  const [headerB64, payloadB64, sigB64] = parts;
  const sigInput = `${headerB64}.${payloadB64}`;
  const enc = new TextEncoder();

  // Verify header
  let header: { alg: string; typ: string };
  try {
    header = JSON.parse(atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    throw new Error("Invalid header");
  }
  if (header.alg !== "HS256") {
    throw new Error("Unsupported algorithm");
  }

  // Verify signature
  const key = await getKey(secret);
  const sigBuf = b64urlDecode(sigB64);
  const valid = await crypto.subtle.verify(ALG, key, sigBuf, enc.encode(sigInput));
  if (!valid) {
    throw new Error("Invalid signature");
  }

  // Decode payload
  let payload: SessionPayload;
  try {
    payload = JSON.parse(atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    throw new Error("Invalid payload");
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error("Token expired");
  }

  return payload;
}

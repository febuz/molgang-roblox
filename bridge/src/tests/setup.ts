/**
 * Vitest setup: polyfill Web Crypto for Node.js test environment
 * (Cloudflare Workers have globalThis.crypto natively)
 */
import { webcrypto } from "crypto";

if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

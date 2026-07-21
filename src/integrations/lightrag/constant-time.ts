/**
 * Constant-time equality for hash/digest strings.
 *
 * String `===` short-circuits on the first differing character, leaking the
 * length of the matching prefix through timing. For the hash comparisons in
 * this codebase the compared values are public (event hashes, block hashes,
 * Merkle roots), so the leak is largely theoretical — but verification code
 * gets copied into contexts where the operands ARE secret (MACs, session
 * tokens), so the verification layer uses timingSafeEqual uniformly as
 * defense-in-depth. The length comparison itself is not constant-time;
 * digest lengths are fixed and public by construction.
 */

import { timingSafeEqual } from 'crypto';

export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Hybrid Logical Clock (HLC) — Kulkarni et al. 2014
 * "Logical Physical Clocks and Consistent Snapshots in Globally Distributed Databases"
 *
 * An HLC timestamp has two components:
 *   l — physical component: wall-clock milliseconds (upper bound from chain)
 *   c — logical counter: breaks ties when l is the same across nodes
 *
 * Key properties:
 *   - Monotonically non-decreasing: each hlcNow() call yields ts >= previous ts
 *   - Causally ordered: if A happened-before B, compare(A.ts, B.ts) < 0
 *   - Close to wall clock: |ts.l - Date.now()| <= max drift (1 minute default)
 *   - Chain gives only an upper bound ("existed before block N"); the HLC gives
 *     the fine-grained, agent-attested ordering between events within that block.
 */

export interface HLCTimestamp {
  readonly l: number; // physical component — wall-clock ms
  readonly c: number; // logical counter — tiebreaker within the same ms
}

/** Maximum tolerated clock drift from a remote peer (ms). */
const MAX_DRIFT_MS = 60_000;

/**
 * Advance the HLC for a locally-generated event.
 * Returns a timestamp strictly greater than state.
 */
export function hlcNow(state: HLCTimestamp): HLCTimestamp {
  const wall = Date.now();
  const l = Math.max(state.l, wall);
  const c = l === state.l ? state.c + 1 : 0;
  return { l, c };
}

/**
 * Advance the HLC upon receiving a remote message.
 * The result satisfies: result > state AND result > remote.
 * Rejects remote timestamps more than MAX_DRIFT_MS ahead of wall clock.
 */
export function hlcRecv(state: HLCTimestamp, remote: HLCTimestamp): HLCTimestamp {
  if (remote.l - Date.now() > MAX_DRIFT_MS) {
    // Remote is suspiciously far ahead — ignore drift, fall back to local advance
    return hlcNow(state);
  }
  const l = Math.max(state.l, remote.l, Date.now());
  let c: number;
  if (l === state.l && l === remote.l) {
    c = Math.max(state.c, remote.c) + 1;
  } else if (l === state.l) {
    c = state.c + 1;
  } else if (l === remote.l) {
    c = remote.c + 1;
  } else {
    c = 0;
  }
  return { l, c };
}

/**
 * Total order on HLC timestamps.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 * Safe to pass directly to Array.sort().
 */
export function hlcCompare(a: HLCTimestamp, b: HLCTimestamp): number {
  if (a.l !== b.l) return a.l - b.l;
  return a.c - b.c;
}

/**
 * Serialize to a zero-padded sortable string.
 * Format: "<15-digit-wall-ms>.<8-digit-counter>"
 * Lexicographic sort order == chronological order.
 */
export function hlcToString(ts: HLCTimestamp): string {
  return `${String(ts.l).padStart(15, '0')}.${String(ts.c).padStart(8, '0')}`;
}

/**
 * Parse a serialized HLC string back to an HLCTimestamp.
 */
export function hlcFromString(s: string): HLCTimestamp {
  const dot = s.indexOf('.');
  return {
    l: parseInt(s.slice(0, dot), 10),
    c: parseInt(s.slice(dot + 1), 10),
  };
}

/** Zero-value HLC state — use as the initial state for a new agent. */
export const HLC_ZERO: HLCTimestamp = { l: 0, c: 0 };

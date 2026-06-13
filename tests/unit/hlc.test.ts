/**
 * Unit tests for Hybrid Logical Clock (hlc.ts)
 * All tests are pure — no network, no Neo4j required.
 */

import {
  HLC_ZERO,
  HLCTimestamp,
  hlcCompare,
  hlcFromString,
  hlcNow,
  hlcRecv,
  hlcToString,
} from '../../src/integrations/lightrag/hlc';

// ──────────────────────────────────────────────────────────────────────────────
// hlcNow
// ──────────────────────────────────────────────────────────────────────────────

describe('hlcNow', () => {
  it('returns l >= current wall clock', () => {
    const before = Date.now();
    const ts = hlcNow(HLC_ZERO);
    expect(ts.l).toBeGreaterThanOrEqual(before);
  });

  it('resets counter to 0 when wall clock advances past state.l', () => {
    const past: HLCTimestamp = { l: 1000, c: 5 };
    const ts = hlcNow(past);
    expect(ts.c).toBe(0);
    expect(ts.l).toBeGreaterThan(past.l);
  });

  it('increments counter when state.l is ahead of wall clock', () => {
    const future: HLCTimestamp = { l: Date.now() + 10_000, c: 3 };
    const ts = hlcNow(future);
    expect(ts.l).toBe(future.l);
    expect(ts.c).toBe(4);
  });

  it('produces 100 strictly monotonic timestamps in sequence', () => {
    let state = HLC_ZERO;
    const timestamps: HLCTimestamp[] = [];
    for (let i = 0; i < 100; i++) {
      state = hlcNow(state);
      timestamps.push(state);
    }
    for (let i = 1; i < timestamps.length; i++) {
      expect(hlcCompare(timestamps[i - 1], timestamps[i])).toBeLessThan(0);
    }
  });

  it('HLC_ZERO is the correct starting state', () => {
    expect(HLC_ZERO).toEqual({ l: 0, c: 0 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// hlcRecv
// ──────────────────────────────────────────────────────────────────────────────

describe('hlcRecv', () => {
  it('result is greater than both state and remote', () => {
    const state: HLCTimestamp = { l: 1000, c: 2 };
    const remote: HLCTimestamp = { l: 1100, c: 0 };
    const ts = hlcRecv(state, remote);
    expect(hlcCompare(ts, state)).toBeGreaterThan(0);
    expect(hlcCompare(ts, remote)).toBeGreaterThan(0);
  });

  it('uses max(state.c, remote.c) + 1 when both l values equal the maximum', () => {
    const l = Date.now() + 5_000;
    const state: HLCTimestamp = { l, c: 3 };
    const remote: HLCTimestamp = { l, c: 7 };
    const ts = hlcRecv(state, remote);
    expect(ts.l).toBe(l);
    expect(ts.c).toBe(8); // max(3, 7) + 1
  });

  it('uses remote.c + 1 when remote.l is strictly greatest', () => {
    const future = Date.now() + 5_000;
    const state: HLCTimestamp = { l: 1000, c: 10 };
    const remote: HLCTimestamp = { l: future, c: 4 };
    const ts = hlcRecv(state, remote);
    expect(ts.l).toBe(future);
    expect(ts.c).toBe(5);
  });

  it('uses state.c + 1 when state.l is strictly greatest and matches wall', () => {
    const future = Date.now() + 5_000;
    const state: HLCTimestamp = { l: future, c: 9 };
    const remote: HLCTimestamp = { l: 1000, c: 100 };
    const ts = hlcRecv(state, remote);
    expect(ts.l).toBe(future);
    expect(ts.c).toBe(10);
  });

  it('falls back to hlcNow when remote is more than 60s ahead', () => {
    const farFuture = Date.now() + 120_000;
    const state: HLCTimestamp = { l: Date.now(), c: 0 };
    const remote: HLCTimestamp = { l: farFuture, c: 0 };
    const ts = hlcRecv(state, remote);
    // Should NOT accept the far-future l value
    expect(ts.l).toBeLessThan(farFuture);
  });

  it('accepts remote 59s ahead (within tolerance)', () => {
    const nearFuture = Date.now() + 59_000;
    const state: HLCTimestamp = { l: 1000, c: 0 };
    const remote: HLCTimestamp = { l: nearFuture, c: 2 };
    const ts = hlcRecv(state, remote);
    expect(ts.l).toBeGreaterThanOrEqual(nearFuture);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// hlcCompare
// ──────────────────────────────────────────────────────────────────────────────

describe('hlcCompare', () => {
  it('returns negative when a.l < b.l', () => {
    expect(hlcCompare({ l: 100, c: 0 }, { l: 200, c: 0 })).toBeLessThan(0);
  });

  it('returns positive when a.l > b.l', () => {
    expect(hlcCompare({ l: 300, c: 0 }, { l: 200, c: 0 })).toBeGreaterThan(0);
  });

  it('returns negative when l equal but a.c < b.c', () => {
    expect(hlcCompare({ l: 100, c: 1 }, { l: 100, c: 5 })).toBeLessThan(0);
  });

  it('returns positive when l equal but a.c > b.c', () => {
    expect(hlcCompare({ l: 100, c: 9 }, { l: 100, c: 5 })).toBeGreaterThan(0);
  });

  it('returns 0 for identical timestamps', () => {
    expect(hlcCompare({ l: 100, c: 3 }, { l: 100, c: 3 })).toBe(0);
  });

  it('sorts an array of timestamps into chronological order', () => {
    const ts: HLCTimestamp[] = [
      { l: 200, c: 1 },
      { l: 100, c: 0 },
      { l: 200, c: 0 },
      { l: 150, c: 5 },
    ];
    ts.sort(hlcCompare);
    expect(ts[0]).toEqual({ l: 100, c: 0 });
    expect(ts[1]).toEqual({ l: 150, c: 5 });
    expect(ts[2]).toEqual({ l: 200, c: 0 });
    expect(ts[3]).toEqual({ l: 200, c: 1 });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// hlcToString / hlcFromString
// ──────────────────────────────────────────────────────────────────────────────

describe('hlcToString / hlcFromString', () => {
  it('round-trips losslessly', () => {
    const ts: HLCTimestamp = { l: 1_749_500_000_000, c: 42 };
    expect(hlcFromString(hlcToString(ts))).toEqual(ts);
  });

  it('lexicographic order matches chronological order for different l', () => {
    const a: HLCTimestamp = { l: 1000, c: 0 };
    const b: HLCTimestamp = { l: 2000, c: 0 };
    expect(hlcToString(a) < hlcToString(b)).toBe(true);
  });

  it('lexicographic order matches counter order when l is equal', () => {
    const a: HLCTimestamp = { l: 1000, c: 0 };
    const b: HLCTimestamp = { l: 1000, c: 1 };
    expect(hlcToString(a) < hlcToString(b)).toBe(true);
  });

  it('physical component is zero-padded to 15 digits', () => {
    const s = hlcToString({ l: 1000, c: 0 });
    const [physical] = s.split('.');
    expect(physical).toHaveLength(15);
  });

  it('logical counter is zero-padded to 8 digits', () => {
    const s = hlcToString({ l: 1000, c: 5 });
    const [, counter] = s.split('.');
    expect(counter).toHaveLength(8);
  });

  it('parses zero-padded string back to correct numbers', () => {
    const ts = hlcFromString('000001700000000.00000007');
    expect(ts.l).toBe(1_700_000_000);
    expect(ts.c).toBe(7);
  });
});

import {
  profileColumn,
  profileDataset,
  detectOutliers,
  referentialCheck,
} from '../../src/data-quality/profiler';

/**
 * Unit tests for the data-quality profiler — column profiling, outlier and
 * duplicate detection, referential integrity, and the quality score.
 */

describe('detectOutliers', () => {
  it('flags a clear outlier via IQR', () => {
    const out = detectOutliers([10, 11, 12, 13, 12, 11, 10, 200]);
    expect(out).toContain(200);
  });
  it('returns none for tiny samples', () => {
    expect(detectOutliers([1, 2, 3])).toEqual([]);
  });
});

describe('profileColumn', () => {
  it('counts nulls, distinct, and types', () => {
    const c = profileColumn('status', ['a', 'b', 'a', '', null, 'c']);
    expect(c.nulls).toBe(2);          // '' and null
    expect(c.distinct).toBe(3);       // a, b, c
    expect(c.typeConsistent).toBe(true);
    expect(c.topValues[0]).toEqual({ value: 'a', count: 2 });
  });
  it('detects mixed types as inconsistent', () => {
    const c = profileColumn('x', [1, 'two', 3]);
    expect(c.typeConsistent).toBe(false);
    expect(Object.keys(c.types).sort()).toEqual(['number', 'string']);
  });
  it('produces numeric stats incl. outliers for numeric columns', () => {
    const c = profileColumn('n', [10, 11, 12, 13, 12, 11, 10, 200]);
    expect(c.numeric).toBeDefined();
    expect(c.numeric!.min).toBe(10);
    expect(c.numeric!.max).toBe(200);
    expect(c.numeric!.outliers).toBeGreaterThan(0);
  });
});

describe('profileDataset', () => {
  it('scores a clean dataset high and an empty one at 100/empty', () => {
    const clean = profileDataset([{ id: 1, name: 'a' }, { id: 2, name: 'b' }], { keyField: 'id' });
    expect(clean.qualityScore).toBeGreaterThanOrEqual(90);
    expect(clean.duplicateRows).toBe(0);

    const empty = profileDataset([]);
    expect(empty.rowCount).toBe(0);
    expect(empty.findings[0].kind).toBe('empty');
  });

  it('penalizes duplicates, nulls, and type inconsistency with findings', () => {
    const dirty = profileDataset([
      { id: 1, v: 1 }, { id: 1, v: 2 },             // duplicate id
      { id: 2, v: 'oops' },                          // type inconsistency on v
      { id: 3, v: null }, { id: 4, v: null }, { id: 5, v: null }, // many nulls on v
    ], { keyField: 'id' });
    const kinds = dirty.findings.map(f => f.kind);
    expect(kinds).toContain('duplicates');
    expect(kinds).toContain('type-inconsistency');
    expect(dirty.qualityScore).toBeLessThan(90);
  });
});

describe('referentialCheck', () => {
  it('finds orphan foreign keys', () => {
    const comments = [{ planId: 'p1' }, { planId: 'p2' }, { planId: 'pX' }];
    const r = referentialCheck(comments, 'planId', new Set(['p1', 'p2']));
    expect(r.orphanCount).toBe(1);
    expect(r.orphans).toEqual(['pX']);
  });
  it('ignores null/absent foreign keys', () => {
    const r = referentialCheck([{ planId: null }, {}], 'planId', new Set(['p1']));
    expect(r.orphanCount).toBe(0);
  });
});

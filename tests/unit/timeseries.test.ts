import { parseCsv, analyzeCsv } from '../../src/timeseries';

describe('timeseries', () => {
  describe('parseCsv', () => {
    it('splits header + rows on comma/semicolon/tab and drops blank lines', () => {
      const { header, rows } = parseCsv('a,b\n1,2\n\n3;4');
      expect(header).toEqual(['a', 'b']);
      expect(rows).toEqual([['1', '2'], ['3', '4']]);
    });

    it('returns empty for empty input', () => {
      expect(parseCsv('')).toEqual({ header: [], rows: [] });
    });
  });

  describe('analyzeCsv', () => {
    it('returns zeros for empty input', () => {
      const r = analyzeCsv('');
      expect(r.rowCount).toBe(0);
      expect(r.columns).toEqual([]);
    });

    it('computes mean/std/min/max for a numeric column', () => {
      const r = analyzeCsv('v\n2\n4\n6');
      const col = r.columns.find(c => c.name === 'v')!;
      expect(col.count).toBe(3);
      expect(col.mean).toBe(4);
      expect(col.std).toBe(2); // sample std of [2,4,6]
      expect(col.min).toBe(2);
      expect(col.max).toBe(6);
    });

    it('detects a timestamp column by name', () => {
      const r = analyzeCsv('time,v\n2020-01-01,5\n2020-01-02,6\n2020-01-03,7');
      expect(r.timestampColumn).toBe('time');
    });

    it('finds a strong Pearson correlation between linearly-related columns', () => {
      const r = analyzeCsv('x,y\n1,2\n2,4\n3,6\n4,8\n5,10');
      const pair = r.correlations.find(c => (c.a === 'x' && c.b === 'y') || (c.a === 'y' && c.b === 'x'))!;
      expect(pair).toBeDefined();
      expect(pair.pearson).toBeCloseTo(1, 3);
    });

    it('flags a clear z-score outlier as an anomaly', () => {
      const csv = 'x\n' + Array(19).fill('1').join('\n') + '\n100';
      const r = analyzeCsv(csv);
      const top = r.topAnomalies.find(a => a.value === 100);
      expect(top).toBeDefined();
      expect(top!.column).toBe('x');
      expect(Math.abs(top!.z)).toBeGreaterThan(3);
    });

    it('does not flag anomalies in a uniform column (std 0)', () => {
      const r = analyzeCsv('x\n' + Array(10).fill('5').join('\n'));
      const col = r.columns.find(c => c.name === 'x')!;
      expect(col.std).toBe(0);
      expect(col.anomalies).toHaveLength(0);
    });

    it('ignores non-numeric columns', () => {
      const r = analyzeCsv('label,v\nfoo,1\nbar,2\nbaz,3');
      expect(r.columns.map(c => c.name)).toEqual(['v']); // 'label' not numeric
    });
  });
});

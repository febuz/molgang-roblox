/**
 * Data-quality profiler — the pure core of the continuous data-quality daemon.
 *
 * Real data-management departments expect every dataset to be profiled and
 * monitored: column profiles, null rates, type consistency, duplicates, numeric
 * outliers, referential integrity, and a single quality score that can trend and
 * trip an SLA. This module is pure (no I/O) so the rules are unit-tested and
 * cannot drift; the daemon (./index.ts) loads datasets and applies them.
 */

export type JSONValue = string | number | boolean | null | object;

export interface ColumnProfile {
  name: string;
  count: number;            // non-undefined occurrences
  nulls: number;            // null / undefined / '' occurrences
  nullRate: number;         // nulls / total rows (0..1)
  distinct: number;
  /** Observed primitive types and their counts — multiple types = inconsistency. */
  types: Record<string, number>;
  typeConsistent: boolean;
  /** Numeric summary when the column is (mostly) numeric. */
  numeric?: { min: number; max: number; mean: number; median: number; outliers: number };
  topValues: Array<{ value: string; count: number }>;
}

export interface DatasetProfile {
  rowCount: number;
  columns: ColumnProfile[];
  duplicateRows: number;
  /** 0..100 — higher is healthier. */
  qualityScore: number;
  findings: Finding[];
}

export interface Finding {
  severity: 'info' | 'warn' | 'error';
  kind: 'nulls' | 'type-inconsistency' | 'duplicates' | 'outliers' | 'referential' | 'empty';
  column?: string;
  message: string;
}

function typeOf(v: JSONValue): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}
function isBlank(v: any): boolean {
  return v === null || v === undefined || v === '';
}
function median(sorted: number[]): number {
  if (!sorted.length) return 0;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/** IQR outlier detection — returns the values beyond 1.5·IQR of Q1/Q3. */
export function detectOutliers(nums: number[]): number[] {
  if (nums.length < 4) return [];
  const s = [...nums].sort((a, b) => a - b);
  const q = (p: number) => { const i = (s.length - 1) * p; const lo = Math.floor(i); const hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  const q1 = q(0.25), q3 = q(0.75), iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
  return s.filter(n => n < lo || n > hi);
}

/** Profile a single column across the rows. */
export function profileColumn(name: string, values: JSONValue[]): ColumnProfile {
  const total = values.length;
  const types: Record<string, number> = {};
  const seen = new Map<string, number>();
  const nums: number[] = [];
  let nulls = 0, count = 0;

  for (const v of values) {
    if (v === undefined) continue;
    count++;
    if (isBlank(v)) { nulls++; continue; }
    const t = typeOf(v);
    types[t] = (types[t] || 0) + 1;
    if (t === 'number') nums.push(v as number);
    const key = t === 'object' || t === 'array' ? `[${t}]` : String(v);
    seen.set(key, (seen.get(key) || 0) + 1);
  }

  const topValues = Array.from(seen.entries())
    .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value, c]) => ({ value, count: c }));

  const nonNullTypes = Object.keys(types);
  const prof: ColumnProfile = {
    name, count, nulls,
    nullRate: total ? Number((nulls / total).toFixed(3)) : 0,
    distinct: seen.size,
    types,
    typeConsistent: nonNullTypes.length <= 1,
    topValues,
  };

  if (nums.length >= Math.max(1, Math.floor((count - nulls) * 0.6))) {
    const s = [...nums].sort((a, b) => a - b);
    prof.numeric = {
      min: s[0] ?? 0, max: s[s.length - 1] ?? 0,
      mean: nums.length ? Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(3)) : 0,
      median: median(s),
      outliers: detectOutliers(nums).length,
    };
  }
  return prof;
}

/** Profile a dataset (array of record objects) and compute findings + a score. */
export function profileDataset(records: any[], opts: { keyField?: string } = {}): DatasetProfile {
  const rows = Array.isArray(records) ? records : [];
  const findings: Finding[] = [];
  if (rows.length === 0) {
    return { rowCount: 0, columns: [], duplicateRows: 0, qualityScore: 100, findings: [{ severity: 'info', kind: 'empty', message: 'dataset is empty' }] };
  }

  // Column union across all rows.
  const cols = new Set<string>();
  for (const r of rows) if (r && typeof r === 'object') for (const k of Object.keys(r)) cols.add(k);

  const columns = Array.from(cols).map(c => profileColumn(c, rows.map(r => (r ? r[c] : undefined))));

  // Duplicate rows (by key field if given, else by JSON identity).
  const idSeen = new Map<string, number>();
  for (const r of rows) {
    const k = opts.keyField && r ? String(r[opts.keyField]) : JSON.stringify(r);
    idSeen.set(k, (idSeen.get(k) || 0) + 1);
  }
  const duplicateRows = Array.from(idSeen.values()).filter(n => n > 1).reduce((a, n) => a + (n - 1), 0);

  // Findings.
  for (const col of columns) {
    if (col.nullRate >= 0.5) findings.push({ severity: 'warn', kind: 'nulls', column: col.name, message: `${(col.nullRate * 100).toFixed(0)}% null/blank` });
    if (!col.typeConsistent) findings.push({ severity: 'error', kind: 'type-inconsistency', column: col.name, message: `mixed types: ${Object.keys(col.types).join(', ')}` });
    if (col.numeric && col.numeric.outliers > 0) findings.push({ severity: 'info', kind: 'outliers', column: col.name, message: `${col.numeric.outliers} numeric outlier(s)` });
  }
  if (duplicateRows > 0) findings.push({ severity: 'warn', kind: 'duplicates', message: `${duplicateRows} duplicate row(s)` + (opts.keyField ? ` on '${opts.keyField}'` : '') });

  // Score: start 100, subtract for issues, floor 0.
  let score = 100;
  for (const col of columns) {
    score -= Math.round(col.nullRate * 12);
    if (!col.typeConsistent) score -= 15;
  }
  score -= Math.min(20, Math.round((duplicateRows / rows.length) * 100));
  const qualityScore = Math.max(0, Math.min(100, score));

  return { rowCount: rows.length, columns, duplicateRows, qualityScore, findings };
}

/**
 * Referential integrity: which `childKey` values in child rows have no matching
 * value in the parent key set (orphans).
 */
export function referentialCheck(childRows: any[], childKey: string, parentValues: Set<string>): { orphans: string[]; orphanCount: number } {
  const orphans = new Set<string>();
  for (const r of childRows || []) {
    if (!r || r[childKey] === undefined || r[childKey] === null) continue;
    const v = String(r[childKey]);
    if (!parentValues.has(v)) orphans.add(v);
  }
  return { orphans: Array.from(orphans), orphanCount: orphans.size };
}

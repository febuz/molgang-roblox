/**
 * Data-quality daemon — continuous monitoring of the platform's own datasets.
 *
 * Loads the data/*.json stores, profiles each (./profiler), computes a quality
 * score + findings, checks each against an SLA, and caches a report. A periodic
 * scan keeps it fresh; the HTTP surface lets dashboards + agents read it and
 * trigger remediation. This is the "real data-management department" capability
 * from docs/CAPABILITY-CHARTER.md §2/§5.
 */
import type { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';
import { profileDataset, DatasetProfile } from './profiler';

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
/** Quality-score SLA — below this, a dataset breaches and is flagged. */
const SLA_MIN_SCORE = 70;
/** Continuous-scan interval. */
const SCAN_INTERVAL_MS = 15 * 60 * 1000;

export interface DatasetReport extends DatasetProfile {
  dataset: string;
  recordsPath: string;       // where the array was found in the file
  slaBreached: boolean;
}
export interface DataQualityReport {
  scannedAt: string;
  datasets: DatasetReport[];
  summary: { datasets: number; avgScore: number; breaches: number; totalFindings: number };
}

let cached: DataQualityReport | null = null;

/** Find the primary array of records inside a parsed JSON file. */
function extractRecords(json: any): { records: any[]; recordsPath: string; keyField?: string } {
  if (Array.isArray(json)) return { records: json, recordsPath: '(root)', keyField: 'id' };
  if (json && typeof json === 'object') {
    // Prefer a top-level array property (e.g. {entries:[...]}, {plans:[...]}).
    const arrayProps = Object.entries(json).filter(([, v]) => Array.isArray(v)) as Array<[string, any[]]>;
    if (arrayProps.length) {
      arrayProps.sort((a, b) => b[1].length - a[1].length);
      const [k, v] = arrayProps[0];
      const keyField = v[0] && typeof v[0] === 'object' && 'id' in v[0] ? 'id' : undefined;
      return { records: v, recordsPath: k, keyField };
    }
  }
  return { records: [], recordsPath: '(none)' };
}

/** Scan every data/*.json file and rebuild the report. */
export function scan(): DataQualityReport {
  const datasets: DatasetReport[] = [];
  let files: string[] = [];
  try { files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')); } catch { /* no dir */ }

  for (const f of files) {
    try {
      const json = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
      const { records, recordsPath, keyField } = extractRecords(json);
      const prof = profileDataset(records, { keyField });
      const slaBreached = prof.rowCount > 0 && prof.qualityScore < SLA_MIN_SCORE;
      datasets.push({ dataset: f.replace(/\.json$/, ''), recordsPath, slaBreached, ...prof });
    } catch (e: any) {
      datasets.push({ dataset: f.replace(/\.json$/, ''), recordsPath: '(parse-error)', slaBreached: true,
        rowCount: 0, columns: [], duplicateRows: 0, qualityScore: 0,
        findings: [{ severity: 'error', kind: 'empty', message: `parse error: ${e.message}` }] });
    }
  }

  datasets.sort((a, b) => a.qualityScore - b.qualityScore);
  const scored = datasets.filter(d => d.rowCount > 0);
  const report: DataQualityReport = {
    scannedAt: new Date().toISOString(),
    datasets,
    summary: {
      datasets: datasets.length,
      avgScore: scored.length ? Math.round(scored.reduce((a, d) => a + d.qualityScore, 0) / scored.length) : 100,
      breaches: datasets.filter(d => d.slaBreached).length,
      totalFindings: datasets.reduce((a, d) => a + d.findings.length, 0),
    },
  };
  cached = report;
  if (report.summary.breaches > 0) {
    logger.warn(`[data-quality] ${report.summary.breaches} dataset(s) below SLA ${SLA_MIN_SCORE}: ` +
      datasets.filter(d => d.slaBreached).map(d => `${d.dataset}(${d.qualityScore})`).join(', '));
  }
  return report;
}

/** Register routes + start the continuous-scan timer. */
export function registerDataQualityRoutes(app: Express): void {
  app.get('/api/dataquality/report', (_req, res) => {
    res.json({ success: true, report: cached || scan() });
  });
  app.post('/api/dataquality/scan', (_req, res) => {
    res.json({ success: true, report: scan() });
  });
  app.get('/api/dataquality/profile/:dataset', (req, res) => {
    const rep = cached || scan();
    const d = rep.datasets.find(x => x.dataset === req.params.dataset);
    if (!d) { res.status(404).json({ success: false, error: 'dataset not found' }); return; }
    res.json({ success: true, profile: d });
  });

  try { scan(); } catch (e: any) { logger.warn(`[data-quality] initial scan failed: ${e.message}`); }
  const t = setInterval(() => { try { scan(); } catch { /* keep daemon alive */ } }, SCAN_INTERVAL_MS);
  if (typeof (t as any).unref === 'function') (t as any).unref();
  logger.info(`[data-quality] daemon online — SLA ${SLA_MIN_SCORE}, scan every ${SCAN_INTERVAL_MS / 60000}m`);
}

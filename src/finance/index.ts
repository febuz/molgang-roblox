/**
 * Finance routes — the intangible-asset (immateriële activa) capitalization
 * report + the per-feature ROI view, built from the REAL git history.
 *
 * GET  /api/finance/capitalization        → balance sheet + per-feature ROI
 * POST /api/finance/value {id, value}      → PO/MoneyGod sets a feature's
 *                                            business value (drives ROI; never
 *                                            fabricated — only what's entered)
 * See docs/FEATURE-CAPITALIZATION.md.
 */
import type { Express } from 'express';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';
import { CapitalizationPolicy } from './feature-capitalization';
import { parseFeatureCommits, buildCapitalizationReport } from './capitalization-report';

const VALUES_STORE = path.join(__dirname, '..', '..', 'data', 'feature-values.json');
const POLICY: CapitalizationPolicy = {
  blendedHourlyRate: 90,      // € blended agent labor rate
  hoursPerCommit: 2,
  capitalizableRate: 0.8,     // IAS38/RJ210 development recognition
  usefulLifeMonths: 36,
  tokensPerHour: 0,
};

function loadValues(): Record<string, number> {
  try { return JSON.parse(fs.readFileSync(VALUES_STORE, 'utf8')).values || {}; } catch { return {}; }
}
function saveValues(values: Record<string, number>) {
  try { fs.mkdirSync(path.dirname(VALUES_STORE), { recursive: true }); fs.writeFileSync(VALUES_STORE, JSON.stringify({ values }, null, 2)); }
  catch { /* best-effort */ }
}

function gitLog(): string {
  // Base preference: the released line if available, else local history.
  for (const range of ['vpc/master', 'master', 'HEAD']) {
    try {
      return execSync(`git log ${range} -n 400 --no-merges --format='C%x09%H%x09%s' --numstat`,
        { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    } catch { /* try next */ }
  }
  return '';
}

export function registerFinanceRoutes(app: Express): void {
  app.get('/api/finance/capitalization', (_req, res) => {
    try {
      const features = parseFeatureCommits(gitLog());
      const report = buildCapitalizationReport(features, POLICY, loadValues());
      res.json({ success: true, policy: POLICY, ...report });
    } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
  });

  app.post('/api/finance/value', (req, res) => {
    const { id, value } = req.body || {};
    if (!id || typeof value !== 'number') { res.status(400).json({ success: false, error: 'id and numeric value required' }); return; }
    const values = loadValues(); values[id] = value; saveValues(values);
    res.json({ success: true, id, value });
  });

  logger.info('[finance] capitalization routes online — /api/finance/capitalization');
}

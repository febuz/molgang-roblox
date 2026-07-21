#!/usr/bin/env tsx
/**
 * Worker delivery overview — how many features each worker delivers + balance.
 *
 *   ts-node scripts/worker-delivery-overview.ts [--base vpc/master] [--json]
 *
 * Gathers delivery records from competing branches named `feat/<item>-<who>`
 * (merged into the base = delivered, otherwise in-progress), tallies them per
 * worker, and prints a balance report with the Product Owner's suggested next
 * assignee (the least-loaded eligible engineer). Source of truth for the
 * eligible roster is the model-diversity table in docs/VIRTUALPC-ARCHITECTURE.md
 * §12.4. Pure scoreboard logic lives in src/review/delivery-scoreboard.ts.
 */
import { execSync } from 'child_process';
import {
  balanceReport, parseEngineerFromBranch, DeliveryRecord,
} from '../src/review/delivery-scoreboard';

// Eligible engineers (mirror of arch §12.4 — slightly different advanced models).
const ENGINEERS = ['Kai', 'Zip', 'Pixel', 'Luna', 'Atlas'];

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
function sh(cmd: string): string {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch { return ''; }
}

const BASE = arg('base', 'vpc/master')!;

function gather(): DeliveryRecord[] {
  const records: DeliveryRecord[] = [];
  const branches = sh('git branch -a --format=%(refname:short)')
    .split('\n').map(b => b.trim().replace(/^remotes\//, '')).filter(Boolean);
  const seen = new Set<string>();
  for (const b of branches) {
    const short = b.replace(/^[^/]+\//, m => (b.startsWith('vpc/') || b.startsWith('origin/') ? '' : m));
    const parsed = parseEngineerFromBranch(short) || parseEngineerFromBranch(b.replace(/^[^/]+\//, ''));
    if (!parsed) continue;
    if (!ENGINEERS.includes(parsed.worker)) continue;
    const key = `${parsed.worker}:${parsed.feature}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Merged into BASE → delivered, else in-progress.
    const merged = sh(`git branch -a --merged ${BASE} --format=%(refname:short)`).includes(parsed.worker);
    records.push({ worker: parsed.worker, feature: parsed.feature, status: merged ? 'delivered' : 'in_progress' });
  }
  return records;
}

const records = gather();
const report = balanceReport(records, ENGINEERS);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('\n📊 Worker delivery overview  (features per worker)\n');
  console.log('  worker     delivered  in-progress  features');
  console.log('  ─────────  ─────────  ───────────  ────────');
  for (const t of report.perWorker) {
    console.log(`  ${t.worker.padEnd(9)}  ${String(t.delivered).padStart(9)}  ${String(t.inProgress).padStart(11)}  ${t.features.join(', ') || '—'}`);
  }
  console.log(`\n  total delivered: ${report.totalDelivered}  ·  mean ${report.mean}  ·  stdev ${report.stdev}`);
  console.log(`  most-loaded: ${report.mostLoaded ?? '—'}  ·  least-loaded: ${report.leastLoaded ?? '—'}`);
  console.log(`  ${report.imbalanced ? '⚠ IMBALANCED — rebalance' : '✓ balanced'}  ·  suggested next assignee: ${report.nextAssignee ?? '—'}\n`);
}

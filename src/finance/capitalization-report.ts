/**
 * Capitalization report — turn the real git history into the intangible-asset
 * (immateriële activa) balance sheet.
 *
 * Source is REAL effort, never synthetic: conventional-commit subjects + their
 * numstat (lines added) on the release line. `feat`/`fix` commits are delivered
 * development features (capitalizable); `docs`/`chore`/`test`/`refactor` are
 * treated as research/maintenance (expensed). Commits are grouped by their
 * `(backlog X.Y.Z)` ref so multiple commits roll into one feature. Effort hours
 * are derived from lines-added at a configurable LOC/hour rate.
 *
 * Pure (no git/IO here) so it is unit-tested; the registrar feeds it `git log`.
 */
import { FeatureRecord, CapitalizationPolicy, balanceSheet, featureROI, BalanceSheet, FeatureROI } from './feature-capitalization';

const DEVELOPMENT_TYPES = new Set(['feat', 'fix', 'perf']);
const RESEARCH_TYPES = new Set(['docs', 'chore', 'test', 'refactor', 'style', 'build', 'ci']);

export interface ParseOptions {
  /** Developer lines-of-code per hour (effort proxy). Default 30. */
  locPerHour?: number;
}

/**
 * Parse `git log --format='C\t%H\t%s' --numstat` text into FeatureRecords,
 * grouping commits by their backlog ref (or commit scope) and summing additions.
 */
export function parseFeatureCommits(gitLog: string, opts: ParseOptions = {}): FeatureRecord[] {
  const locPerHour = opts.locPerHour ?? 30;
  type Acc = { id: string; title: string; phase: 'development' | 'research'; commits: number; additions: number };
  const groups = new Map<string, Acc>();
  let cur: Acc | null = null;

  for (const raw of (gitLog || '').split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line.startsWith('C\t')) {
      const [, , subjectRaw = ''] = line.split('\t');
      const subject = subjectRaw.trim();
      const cc = /^(\w+)(?:\([^)]*\))?!?:\s*(.*)$/.exec(subject);
      const type = cc ? cc[1].toLowerCase() : 'other';
      if (!DEVELOPMENT_TYPES.has(type) && !RESEARCH_TYPES.has(type)) { cur = null; continue; }
      const phase = DEVELOPMENT_TYPES.has(type) ? 'development' : 'research';
      const backlog = /backlog[ -]([0-9][0-9.]*)/i.exec(subject);
      const scope = /^\w+\(([^)]+)\)/.exec(subject);
      const key = backlog ? `backlog-${backlog[1]}` : scope ? `${type}-${scope[1]}` : subject.slice(0, 40);
      cur = groups.get(key) || { id: key, title: cc ? cc[2] : subject, phase, commits: 0, additions: 0 };
      // A group is development if any of its commits are development.
      if (phase === 'development') cur.phase = 'development';
      cur.commits++;
      groups.set(key, cur);
    } else if (cur && /^\d+\t\d+\t/.test(line)) {
      const add = parseInt(line.split('\t')[0], 10);
      if (!isNaN(add)) cur.additions += add;
    }
  }

  return Array.from(groups.values()).map(g => ({
    id: g.id,
    title: g.title,
    phase: g.phase,
    effort: { hours: Number((g.additions / locPerHour).toFixed(2)), commits: g.commits },
  }));
}

export interface CapitalizationReport {
  balanceSheet: BalanceSheet;
  roi: FeatureROI[];
  generatedFrom: { features: number; developmentFeatures: number };
}

/**
 * Build the capitalization report: balance sheet + per-feature ROI. Optional
 * `businessValues` (PO/MoneyGod input, never fabricated) drive ROI where present.
 */
export function buildCapitalizationReport(
  features: FeatureRecord[],
  policy: CapitalizationPolicy,
  businessValues: Record<string, number> = {},
): CapitalizationReport {
  const withValues = features.map(f =>
    typeof businessValues[f.id] === 'number' ? { ...f, businessValue: businessValues[f.id] } : f);
  return {
    balanceSheet: balanceSheet(withValues, policy),
    roi: withValues.map(f => featureROI(f, policy)).sort((a, b) => b.roi - a.roi),
    generatedFrom: {
      features: features.length,
      developmentFeatures: features.filter(f => f.phase === 'development').length,
    },
  };
}

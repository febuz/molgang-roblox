import { parseFeatureCommits, buildCapitalizationReport } from '../../src/finance/capitalization-report';
import { CapitalizationPolicy } from '../../src/finance/feature-capitalization';

/**
 * Unit tests for the capitalization report — parsing real git history into
 * FeatureRecords and rolling them into the intangible-asset balance sheet.
 */

// `git log --format='C\t%H\t%s' --numstat` style text.
const LOG = [
  'C\tabc123\tfeat(auth): add login (backlog 6.5.11)',
  '60\t0\tsrc/auth/login.ts',
  '30\t0\ttests/unit/login.test.ts',
  'C\tdef456\tfix(auth): handle null session (backlog 6.5.11)',  // same backlog -> same feature
  '15\t2\tsrc/auth/login.ts',
  'C\tghi789\tdocs: update README',                              // research -> expensed
  '40\t0\tREADME.md',
  'C\tjkl012\tchore: bump deps',                                  // research
  '5\t5\tpackage.json',
  'C\tmno345\tMerge pull request #9',                             // not conventional -> skipped
  '0\t0\t',
].join('\n');

const policy: CapitalizationPolicy = { blendedHourlyRate: 100, capitalizableRate: 0.8, usefulLifeMonths: 36 };

describe('parseFeatureCommits', () => {
  const feats = parseFeatureCommits(LOG, { locPerHour: 30 });

  it('groups commits by backlog ref and sums additions', () => {
    const auth = feats.find(f => f.id === 'backlog-6.5.11');
    expect(auth).toBeDefined();
    expect(auth!.phase).toBe('development');
    expect(auth!.effort.commits).toBe(2);
    // additions: 60+30+15 = 105 -> /30 = 3.5h
    expect(auth!.effort.hours).toBe(3.5);
  });

  it('classifies docs/chore as research (expensed) and skips non-conventional commits', () => {
    expect(feats.find(f => f.title.includes('README'))!.phase).toBe('research');
    expect(feats.some(f => f.title.includes('Merge pull request'))).toBe(false);
  });
});

describe('buildCapitalizationReport', () => {
  it('builds a balance sheet from real commits; research is expensed', () => {
    const feats = parseFeatureCommits(LOG);
    const rep = buildCapitalizationReport(feats, policy);
    expect(rep.generatedFrom.developmentFeatures).toBe(1); // only the auth feature
    expect(rep.balanceSheet.totalCapitalized).toBeGreaterThan(0);
    // research features contribute to expensed, not capitalized
    expect(rep.balanceSheet.totalExpensed).toBeGreaterThan(0);
  });

  it('uses supplied business values for ROI (never fabricated)', () => {
    const feats = parseFeatureCommits(LOG);
    const rep = buildCapitalizationReport(feats, policy, { 'backlog-6.5.11': 5000 });
    const auth = rep.roi.find(r => r.id === 'backlog-6.5.11')!;
    expect(auth.value).toBe(5000);
    expect(auth.verdict).toBe('build');
  });
});

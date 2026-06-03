import {
  estimateHours,
  capitalizeFeature,
  balanceSheet,
  featureROI,
  CapitalizationPolicy,
  FeatureRecord,
} from '../../src/finance/feature-capitalization';

/**
 * Unit tests for feature capitalization — accounting for agent effort and
 * capitalizing delivered features as intangible assets (immateriële activa).
 */

const policy: CapitalizationPolicy = {
  blendedHourlyRate: 100,
  hoursPerCommit: 2,
  hoursPerStoryPoint: 4,
  tokensPerHour: 0,
  capitalizableRate: 0.8,
  usefulLifeMonths: 36,
};

describe('estimateHours', () => {
  it('uses explicit hours when present', () => {
    expect(estimateHours({ hours: 10, commits: 5 }, policy)).toBe(10);
  });
  it('estimates from commits + story points when hours absent', () => {
    expect(estimateHours({ commits: 3, storyPoints: 2 }, policy)).toBe(3 * 2 + 2 * 4); // 14
  });
  it('adds token-equivalent hours when configured', () => {
    expect(estimateHours({ commits: 1, tokens: 1000 }, { ...policy, tokensPerHour: 500 })).toBe(2 + 2); // 2h commit + 2h tokens
  });
});

describe('capitalizeFeature', () => {
  it('capitalizes development-phase cost at the capitalizable rate', () => {
    const c = capitalizeFeature(
      { id: 'f1', title: 'Persistence tier', phase: 'development', effort: { hours: 10 }, deliveredMonthsAgo: 0 },
      policy,
    );
    expect(c.laborCost).toBe(1000);          // 10h * 100
    expect(c.capitalizedValue).toBe(800);    // 1000 * 0.8
    expect(c.expensed).toBe(200);            // remainder expensed
    expect(c.netBookValue).toBe(800);        // no amortization yet
  });

  it('expenses research-phase cost entirely (no asset)', () => {
    const c = capitalizeFeature(
      { id: 'r1', title: 'Spike', phase: 'research', effort: { hours: 5 } },
      policy,
    );
    expect(c.capitalizedValue).toBe(0);
    expect(c.expensed).toBe(500);
    expect(c.netBookValue).toBe(0);
  });

  it('amortizes straight-line over the useful life', () => {
    const c = capitalizeFeature(
      { id: 'f2', title: 'Cost dashboard', phase: 'development', effort: { hours: 10 }, deliveredMonthsAgo: 18 },
      policy, // usefulLife 36 → 50% amortized
    );
    expect(c.capitalizedValue).toBe(800);
    expect(c.accumulatedAmortization).toBe(400);
    expect(c.netBookValue).toBe(400);
  });

  it('caps amortization at the full value past the useful life', () => {
    const c = capitalizeFeature(
      { id: 'f3', title: 'Old feature', phase: 'development', effort: { hours: 10 }, deliveredMonthsAgo: 99 },
      policy,
    );
    expect(c.accumulatedAmortization).toBe(800);
    expect(c.netBookValue).toBe(0);
  });
});

describe('featureROI (token-aware economic reasoning)', () => {
  it('says build when business value clears the cost (incl. tokens)', () => {
    const f: FeatureRecord = { id: 'x', title: 'High value', phase: 'development', effort: { hours: 10 }, businessValue: 5000 };
    const r = featureROI(f, policy);            // cost 1000, value 5000 → roi 5
    expect(r.cost).toBe(1000);
    expect(r.roi).toBe(5);
    expect(r.verdict).toBe('build');
  });
  it('says skip when value cannot justify the token/effort spend', () => {
    const f: FeatureRecord = { id: 'y', title: 'Token sink', phase: 'development', effort: { hours: 10, tokens: 0 }, businessValue: 300 };
    const r = featureROI(f, policy);            // cost 1000, value 300 → roi 0.3
    expect(r.verdict).toBe('skip');
  });
  it('counts tokens as cost so a token-heavy feature has lower ROI', () => {
    const tokenPolicy = { ...policy, tokensPerHour: 100 };
    const cheap = featureROI({ id: 'a', title: 'a', phase: 'development', effort: { hours: 5 }, businessValue: 1000 }, tokenPolicy);
    const tokenHeavy = featureROI({ id: 'b', title: 'b', phase: 'development', effort: { hours: 5, tokens: 50000 }, businessValue: 1000 }, tokenPolicy);
    expect(tokenHeavy.cost).toBeGreaterThan(cheap.cost);   // 50000 tokens add labor-hours → cost
    expect(tokenHeavy.roi).toBeLessThan(cheap.roi);
  });
});

describe('balanceSheet', () => {
  const features: FeatureRecord[] = [
    { id: 'a', title: 'A', phase: 'development', effort: { commits: 5 }, deliveredMonthsAgo: 0 },   // 10h -> 1000 cost -> 800 cap
    { id: 'b', title: 'B', phase: 'development', effort: { hours: 20 }, deliveredMonthsAgo: 36 },    // 2000 cost -> 1600 cap, fully amortized
    { id: 'c', title: 'C', phase: 'research', effort: { hours: 5 } },                                // 500 expensed
  ];

  it('rolls features into the intangible-asset section', () => {
    const bs = balanceSheet(features, policy);
    expect(bs.totalLaborCost).toBe(1000 + 2000 + 500);
    expect(bs.totalCapitalized).toBe(800 + 1600);        // research excluded
    expect(bs.totalAmortization).toBe(1600);             // B fully amortized
    expect(bs.netIntangibleAssets).toBe(800);            // only A remains on the books
    expect(bs.totalExpensed).toBe(200 + 400 + 500);      // non-capitalizable remainders + research
  });
});

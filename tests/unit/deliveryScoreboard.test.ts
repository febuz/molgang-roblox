import {
  tallyDeliveries,
  balanceReport,
  parseEngineerFromBranch,
  DeliveryRecord,
} from '../../src/review/delivery-scoreboard';

/**
 * Unit tests for the delivery scoreboard — per-worker feature counts and the
 * workload-balance report the Product Owner uses to pick the next assignee.
 */

const recs: DeliveryRecord[] = [
  { worker: 'Zip', feature: '6.5.11', status: 'delivered' },
  { worker: 'Zip', feature: '6.5.17', status: 'delivered' },
  { worker: 'Zip', feature: '6.5.20', status: 'in_progress' },
  { worker: 'Pixel', feature: '6.5.19', status: 'delivered' },
  { worker: 'Luna', feature: '6.5.12', status: 'in_progress' },
  // duplicate (worker, feature) must not double-count
  { worker: 'Zip', feature: '6.5.11', status: 'delivered' },
];

describe('tallyDeliveries', () => {
  it('counts delivered + in-progress per worker, de-duped, sorted by delivered desc', () => {
    const t = tallyDeliveries(recs);
    expect(t[0]).toMatchObject({ worker: 'Zip', delivered: 2, inProgress: 1 });
    expect(t.find(x => x.worker === 'Pixel')!.delivered).toBe(1);
    expect(t.find(x => x.worker === 'Luna')!.delivered).toBe(0);
    // de-dup: Zip's 6.5.11 counted once
    expect(t[0].features).toEqual(['6.5.11', '6.5.17']);
  });

  it('ignores records with no worker', () => {
    expect(tallyDeliveries([{ worker: '', feature: 'x', status: 'delivered' }])).toHaveLength(0);
  });
});

describe('balanceReport', () => {
  const workers = ['Zip', 'Pixel', 'Luna', 'Atlas'];

  it('includes zero-delivery eligible workers and names them least-loaded', () => {
    const r = balanceReport(recs, workers);
    expect(r.perWorker).toHaveLength(4);
    expect(r.totalDelivered).toBe(3); // Zip 2 + Pixel 1 + Luna 0 + Atlas 0
    expect(r.mostLoaded).toBe('Zip');
    // Atlas & Luna both 0 delivered; Luna has 1 in-progress so Atlas is least loaded
    expect(r.leastLoaded).toBe('Atlas');
    expect(r.nextAssignee).toBe('Atlas');
  });

  it('flags imbalance when the spread exceeds the threshold', () => {
    const heavy: DeliveryRecord[] = [
      ...Array.from({ length: 5 }, (_, i) => ({ worker: 'Zip', feature: `f${i}`, status: 'delivered' as const })),
    ];
    const r = balanceReport(heavy, ['Zip', 'Pixel'], 2);
    expect(r.imbalanced).toBe(true);       // spread 5 - 0 = 5 > 2
    expect(r.nextAssignee).toBe('Pixel');
  });

  it('reports balanced when spread is within threshold', () => {
    const even: DeliveryRecord[] = [
      { worker: 'Zip', feature: 'a', status: 'delivered' },
      { worker: 'Pixel', feature: 'b', status: 'delivered' },
    ];
    const r = balanceReport(even, ['Zip', 'Pixel'], 2);
    expect(r.imbalanced).toBe(false);
    expect(r.mean).toBe(1);
    expect(r.stdev).toBe(0);
  });
});

describe('parseEngineerFromBranch', () => {
  it('extracts feature + worker from feat/<item>-<who>', () => {
    expect(parseEngineerFromBranch('feat/cost-dashboard-Pixel'))
      .toEqual({ feature: 'cost-dashboard', worker: 'Pixel' });
  });

  it('returns null for non-competing branch names', () => {
    expect(parseEngineerFromBranch('master')).toBeNull();
    expect(parseEngineerFromBranch('feat/no-worker-suffix-')).toBeNull();
  });
});

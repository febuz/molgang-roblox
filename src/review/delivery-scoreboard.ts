/**
 * Delivery scoreboard — how many features each worker delivers, and how to keep
 * the load balanced.
 *
 * The Product Owner uses this to (a) see per-worker throughput and (b) pick the
 * next assignee so no engineer is starved or overloaded. Pure logic (no I/O) so
 * it is unit-testable; the runner (scripts/worker-delivery-overview.ts) feeds it
 * records gathered from merged `feat/<item>-<who>` branches + backlog completions.
 */

export interface DeliveryRecord {
  /** Engineer/worker name, e.g. 'Zip'. */
  worker: string;
  /** Feature / backlog item id, e.g. '6.5.19'. */
  feature: string;
  /** 'delivered' = merged/completed; 'in_progress' = open branch. */
  status: 'delivered' | 'in_progress';
}

export interface WorkerTally {
  worker: string;
  delivered: number;
  inProgress: number;
  features: string[];
}

export interface BalanceReport {
  perWorker: WorkerTally[];
  totalDelivered: number;
  mean: number;
  /** Population standard deviation of delivered counts across eligible workers. */
  stdev: number;
  mostLoaded: string | null;
  leastLoaded: string | null;
  /** Least-loaded eligible worker — the PO's suggested next assignee. */
  nextAssignee: string | null;
  /** True when the spread is wide enough that the PO should rebalance. */
  imbalanced: boolean;
}

/** Tally delivered + in-progress features per worker, de-duped by (worker, feature). */
export function tallyDeliveries(records: DeliveryRecord[]): WorkerTally[] {
  const byWorker = new Map<string, { delivered: Set<string>; inProgress: Set<string> }>();
  for (const r of records) {
    if (!r.worker) continue;
    const slot = byWorker.get(r.worker) ?? { delivered: new Set(), inProgress: new Set() };
    (r.status === 'delivered' ? slot.delivered : slot.inProgress).add(r.feature);
    byWorker.set(r.worker, slot);
  }
  return Array.from(byWorker.entries())
    .map(([worker, s]) => ({
      worker,
      delivered: s.delivered.size,
      inProgress: s.inProgress.size,
      features: Array.from(s.delivered).sort(),
    }))
    .sort((a, b) => b.delivered - a.delivered || a.worker.localeCompare(b.worker));
}

/**
 * Build a balance report over the *eligible* worker roster (so a worker with
 * zero deliveries still counts as least-loaded and gets the next item).
 *
 * @param imbalanceThreshold max delivered - min delivered that is tolerable
 *        before the PO should rebalance (default 2).
 */
export function balanceReport(
  records: DeliveryRecord[],
  eligibleWorkers: string[],
  imbalanceThreshold = 2,
): BalanceReport {
  const tallies = tallyDeliveries(records);
  const map = new Map(tallies.map(t => [t.worker, t]));
  // Ensure every eligible worker appears, even with zero deliveries.
  const perWorker: WorkerTally[] = eligibleWorkers.map(w =>
    map.get(w) ?? { worker: w, delivered: 0, inProgress: 0, features: [] },
  ).sort((a, b) => b.delivered - a.delivered || a.worker.localeCompare(b.worker));

  const counts = perWorker.map(t => t.delivered);
  const totalDelivered = counts.reduce((a, b) => a + b, 0);
  const n = perWorker.length || 1;
  const mean = totalDelivered / n;
  const variance = counts.reduce((a, c) => a + (c - mean) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);

  const mostLoaded = perWorker.length ? perWorker[0].worker : null;
  // Least loaded = fewest delivered, then fewest in-progress, then name order.
  const leastSorted = [...perWorker].sort(
    (a, b) => a.delivered - b.delivered || a.inProgress - b.inProgress || a.worker.localeCompare(b.worker),
  );
  const leastLoaded = leastSorted.length ? leastSorted[0].worker : null;
  const spread = counts.length ? Math.max(...counts) - Math.min(...counts) : 0;

  return {
    perWorker,
    totalDelivered,
    mean: Number(mean.toFixed(2)),
    stdev: Number(stdev.toFixed(2)),
    mostLoaded,
    leastLoaded,
    nextAssignee: leastLoaded,
    imbalanced: spread > imbalanceThreshold,
  };
}

/** Parse the worker tag from a competing-branch name `feat/<item>-<who>`. */
export function parseEngineerFromBranch(branch: string): { feature: string; worker: string } | null {
  const m = /^feat\/(.+)-([A-Za-z][A-Za-z0-9]*)$/.exec(branch.trim());
  return m ? { feature: m[1], worker: m[2] } : null;
}

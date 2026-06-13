/**
 * Requirements traceability — the pure core of the USDP requirements register.
 *
 * USDP (Jacobson/Booch/Rumbaugh) is use-case-driven and architecture-centric.
 * This holds the requirement model + the traceability rules: which requirements
 * are covered by an implementation (a feature/commit), which are verified (have
 * a test trace and acceptance criteria), and the coverage figures the PO tracks.
 * Pure (no I/O), unit-tested.
 */

export type RequirementType = 'functional' | 'non-functional' | 'constraint';
export type RequirementStatus = 'proposed' | 'accepted' | 'implemented' | 'verified' | 'rejected';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

export interface Trace {
  kind: 'feature' | 'commit' | 'test';
  ref: string;
}

export interface Requirement {
  id: string;
  backlogRef?: string;
  title: string;
  type: RequirementType;
  /** The use case this requirement serves (USDP). */
  useCase?: string;
  /** Acceptance criteria — testable conditions. */
  acceptance: string[];
  priority: Priority;
  status: RequirementStatus;
  owner?: string;
  traces: Trace[];
  createdAt: string;
  updatedAt: string;
}

export function validateRequirement(r: Partial<Requirement>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!r.title || !String(r.title).trim()) errors.push('title required');
  if (!r.type || !['functional', 'non-functional', 'constraint'].includes(r.type)) errors.push('type must be functional|non-functional|constraint');
  if (r.priority && !['low', 'medium', 'high', 'critical'].includes(r.priority)) errors.push('invalid priority');
  return { ok: errors.length === 0, errors };
}

/** Covered = has at least one feature/commit trace. */
export function isCovered(r: Requirement): boolean {
  return r.traces.some(t => t.kind === 'feature' || t.kind === 'commit');
}

/** Verified = covered + has acceptance criteria + at least one test trace. */
export function isVerified(r: Requirement): boolean {
  return isCovered(r) && r.acceptance.length > 0 && r.traces.some(t => t.kind === 'test');
}

export interface TraceabilityReport {
  total: number;
  covered: number;
  verified: number;
  coveragePct: number;
  verifiedPct: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  /** Requirements with no implementation trace — the gap. */
  uncovered: Array<{ id: string; title: string; priority: Priority }>;
}

export function traceabilityReport(requirements: Requirement[]): TraceabilityReport {
  const reqs = (requirements || []).filter(r => r.status !== 'rejected');
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let covered = 0, verified = 0;
  const uncovered: TraceabilityReport['uncovered'] = [];

  for (const r of reqs) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byType[r.type] = (byType[r.type] || 0) + 1;
    if (isCovered(r)) covered++; else uncovered.push({ id: r.id, title: r.title, priority: r.priority });
    if (isVerified(r)) verified++;
  }

  const total = reqs.length;
  // Surface the most important gaps first.
  const order: Priority[] = ['critical', 'high', 'medium', 'low'];
  uncovered.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority));

  return {
    total, covered, verified,
    coveragePct: total ? Math.round((covered / total) * 100) : 100,
    verifiedPct: total ? Math.round((verified / total) * 100) : 100,
    byStatus, byType, uncovered,
  };
}

/** Derive the status a requirement should carry from its traces (USDP lifecycle). */
export function deriveStatus(r: Requirement): RequirementStatus {
  if (r.status === 'rejected') return 'rejected';
  if (isVerified(r)) return 'verified';
  if (isCovered(r)) return 'implemented';
  return r.status === 'proposed' ? 'proposed' : 'accepted';
}

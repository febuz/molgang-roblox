import {
  validateRequirement,
  isCovered,
  isVerified,
  traceabilityReport,
  deriveStatus,
  Requirement,
} from '../../src/requirements/traceability';

/**
 * Unit tests for the USDP requirements register traceability core.
 */

function req(over: Partial<Requirement> = {}): Requirement {
  return {
    id: 'r1', title: 'Login', type: 'functional', acceptance: ['user can log in'],
    priority: 'high', status: 'accepted', traces: [], createdAt: 't', updatedAt: 't', ...over,
  };
}

describe('validateRequirement', () => {
  it('requires title and a valid type', () => {
    expect(validateRequirement({ title: 'x', type: 'functional' }).ok).toBe(true);
    expect(validateRequirement({ type: 'functional' }).ok).toBe(false);
    expect(validateRequirement({ title: 'x', type: 'bogus' as any }).ok).toBe(false);
  });
});

describe('coverage + verification', () => {
  it('covered needs a feature/commit trace; verified also needs a test trace + acceptance', () => {
    expect(isCovered(req())).toBe(false);
    const covered = req({ traces: [{ kind: 'feature', ref: 'auth' }] });
    expect(isCovered(covered)).toBe(true);
    expect(isVerified(covered)).toBe(false);                    // no test trace
    const verified = req({ traces: [{ kind: 'feature', ref: 'auth' }, { kind: 'test', ref: 'login.test' }] });
    expect(isVerified(verified)).toBe(true);
  });
  it('a test trace alone does not make it covered', () => {
    expect(isCovered(req({ traces: [{ kind: 'test', ref: 't' }] }))).toBe(false);
  });
});

describe('traceabilityReport', () => {
  const reqs: Requirement[] = [
    req({ id: 'a', priority: 'critical', traces: [] }),                                   // uncovered, critical
    req({ id: 'b', priority: 'low', traces: [{ kind: 'feature', ref: 'f' }] }),           // covered
    req({ id: 'c', traces: [{ kind: 'feature', ref: 'f' }, { kind: 'test', ref: 't' }] }),// verified
    req({ id: 'd', status: 'rejected' }),                                                 // excluded
  ];

  it('computes coverage, verification, and orders gaps by priority', () => {
    const r = traceabilityReport(reqs);
    expect(r.total).toBe(3);                 // rejected excluded
    expect(r.covered).toBe(2);
    expect(r.verified).toBe(1);
    expect(r.coveragePct).toBe(67);
    expect(r.uncovered[0].id).toBe('a');     // critical gap first
  });

  it('reports 100% for an empty register', () => {
    expect(traceabilityReport([]).coveragePct).toBe(100);
  });
});

describe('deriveStatus', () => {
  it('moves through the USDP lifecycle from traces', () => {
    expect(deriveStatus(req({ traces: [] }))).toBe('accepted');
    expect(deriveStatus(req({ traces: [{ kind: 'feature', ref: 'f' }] }))).toBe('implemented');
    expect(deriveStatus(req({ traces: [{ kind: 'feature', ref: 'f' }, { kind: 'test', ref: 't' }] }))).toBe('verified');
    expect(deriveStatus(req({ status: 'rejected' }))).toBe('rejected');
  });
});

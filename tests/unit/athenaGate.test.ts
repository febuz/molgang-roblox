import {
  parseJestSummary,
  classifyFailures,
  isIntegrationSuite,
  decideGate,
  AthenaVerdict,
  JestSummary,
} from '../../src/review/athena-gate';

/**
 * Unit tests for the Athena review gate.
 *
 * Encodes the reviewer rule: Athena (Opus 4.8) approves a release candidate
 * ONLY when the feature works AND the unit + regression suite is clean on the
 * whole. Integration suites that fail purely because infra is offline (Kafka)
 * are environmental and do not block; a failing *unit* suite always blocks.
 */

// A real tail captured from `npx jest` against the virtualpc suite.
const REAL_JEST_TAIL = `
FAIL tests/integration/kafka.test.ts (10.476 s)
FAIL tests/integration/api.test.ts
FAIL tests/integration/lightrag.test.ts
PASS tests/unit/authMiddleware.test.ts (11.392 s)
  ● Kafka Producer › should publish
    Producer not connected
Test Suites: 5 failed, 13 passed, 18 total
Tests:       19 failed, 216 passed, 235 total
Snapshots:   0 total
`;

function approvingVerdict(over: Partial<AthenaVerdict> = {}): AthenaVerdict {
  return { featureWorks: true, reviewedTests: true, approve: true, feedback: [], ...over };
}

describe('parseJestSummary', () => {
  it('parses suite + test counts and failing suites from a real tail', () => {
    const s = parseJestSummary(REAL_JEST_TAIL);
    expect(s.parsed).toBe(true);
    expect(s.suitesFailed).toBe(5);
    expect(s.suitesPassed).toBe(13);
    expect(s.testsFailed).toBe(19);
    expect(s.testsPassed).toBe(216);
    expect(s.testsTotal).toBe(235);
    expect(s.failedSuites).toContain('tests/integration/kafka.test.ts');
    expect(s.failedSuites).toHaveLength(3);
  });

  it('handles an all-green run (no "failed" segment)', () => {
    const s = parseJestSummary('Test Suites: 18 passed, 18 total\nTests: 235 passed, 235 total');
    expect(s.parsed).toBe(true);
    expect(s.suitesFailed).toBe(0);
    expect(s.testsFailed).toBe(0);
    expect(s.failedSuites).toHaveLength(0);
  });

  it('flags parsed=false when summary lines are missing', () => {
    expect(parseJestSummary('nonsense output').parsed).toBe(false);
  });
});

describe('isIntegrationSuite', () => {
  it('detects integration suites by path', () => {
    expect(isIntegrationSuite('tests/integration/kafka.test.ts')).toBe(true);
    expect(isIntegrationSuite('tests/integration.test.ts')).toBe(true);
    expect(isIntegrationSuite('tests/unit/authMiddleware.test.ts')).toBe(false);
  });
});

describe('classifyFailures', () => {
  it('marks Kafka integration failure as environmental when infra is down', () => {
    const c = classifyFailures(['tests/integration/kafka.test.ts'], 'Producer not connected', false);
    expect(c[0].klass).toBe('environmental');
  });

  it('marks the same integration failure as a regression when infra is up', () => {
    const c = classifyFailures(['tests/integration/kafka.test.ts'], 'Producer not connected', true);
    expect(c[0].klass).toBe('regression');
  });

  it('always treats a failing unit suite as a regression', () => {
    const c = classifyFailures(['tests/unit/authMiddleware.test.ts'], 'expected 1 to be 2', false);
    expect(c[0].klass).toBe('regression');
  });
});

describe('decideGate', () => {
  const greenUnit: JestSummary = {
    suitesPassed: 13, suitesFailed: 5, suitesTotal: 18,
    testsPassed: 216, testsFailed: 19, testsTotal: 235,
    failedSuites: ['tests/integration/kafka.test.ts', 'tests/integration/api.test.ts'],
    parsed: true,
  };

  it('APPROVES when unit suite is green, only env integration fails, and Athena approves', () => {
    const d = decideGate({ jest: greenUnit, verdict: approvingVerdict(), liveInfraUp: false });
    expect(d.approved).toBe(true);
    expect(d.blocking).toHaveLength(0);
    expect(d.environmental.length).toBeGreaterThan(0);
  });

  it('BLOCKS when a unit suite is failing (real regression)', () => {
    const jest: JestSummary = { ...greenUnit, failedSuites: ['tests/unit/authMiddleware.test.ts'] };
    const d = decideGate({ jest, verdict: approvingVerdict() });
    expect(d.approved).toBe(false);
    expect(d.blocking.join(' ')).toMatch(/regression/i);
  });

  it('BLOCKS when Athena cannot confirm the feature works', () => {
    const d = decideGate({ jest: greenUnit, verdict: approvingVerdict({ featureWorks: false }) });
    expect(d.approved).toBe(false);
    expect(d.blocking.join(' ')).toMatch(/feature works/i);
  });

  it('BLOCKS when Athena has not reviewed the test run', () => {
    const d = decideGate({ jest: greenUnit, verdict: approvingVerdict({ reviewedTests: false }) });
    expect(d.approved).toBe(false);
    expect(d.blocking.join(' ')).toMatch(/reviewed the unit/i);
  });

  it('BLOCKS when Athena requests changes even if tests are green', () => {
    const d = decideGate({ jest: greenUnit, verdict: approvingVerdict({ approve: false }) });
    expect(d.approved).toBe(false);
    expect(d.blocking.join(' ')).toMatch(/requested changes/i);
  });

  it('BLOCKS when no tests ran at all', () => {
    const empty: JestSummary = { ...greenUnit, testsTotal: 0, testsPassed: 0, testsFailed: 0, failedSuites: [] };
    const d = decideGate({ jest: empty, verdict: approvingVerdict() });
    expect(d.approved).toBe(false);
    expect(d.blocking.join(' ')).toMatch(/No tests ran/i);
  });

  it('BLOCKS an integration failure that is NOT recognised as infra-related', () => {
    const jest: JestSummary = { ...greenUnit, failedSuites: ['tests/integration/weird.test.ts'] };
    const d = decideGate({ jest, verdict: approvingVerdict(), liveInfraUp: false });
    expect(d.approved).toBe(false);
  });
});

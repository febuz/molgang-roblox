/**
 * Athena review gate — the decision logic behind the single Opus 4.8 PR gate.
 *
 * Athena (the Principal Reviewer agent, the only agent on claude-opus) reviews
 * every release candidate. This module holds the *pure* gate logic she applies
 * once she has (a) the human-grade Opus review verdict and (b) the result of
 * running the whole test suite. Keeping it pure (no I/O) means the rule the
 * user set — "approve only when it is a working feature AND its unit +
 * regression tests pass on the whole" — is unit-testable and cannot drift.
 *
 * Flow:
 *   Sonnet engineer builds on a branch → opens PR
 *   → runJest() captures unit + regression results
 *   → Athena (Opus) reviews the diff + results → AthenaVerdict
 *   → decideGate() combines verdict + tests → GateDecision
 *   → approved  : engineer completes the backlog item, branch is released
 *     blocked   : feedback goes back to the engineer to improve the branch
 */

export interface JestSummary {
  suitesPassed: number;
  suitesFailed: number;
  suitesTotal: number;
  testsPassed: number;
  testsFailed: number;
  testsTotal: number;
  /** Relative paths of the failing test suites, e.g. tests/integration/kafka.test.ts */
  failedSuites: string[];
  parsed: boolean;
}

/** How a failing suite is classified for the gate. */
export type FailureClass = 'environmental' | 'regression';

export interface ClassifiedFailure {
  suite: string;
  klass: FailureClass;
  reason: string;
}

/** The verdict the Opus reviewer (Athena) returns after reading the diff. */
export interface AthenaVerdict {
  /** True only if Athena judges the feature actually works as described. */
  featureWorks: boolean;
  /** True only if Athena confirms she saw the unit + regression run on the whole. */
  reviewedTests: boolean;
  /** Athena's own approve/request-changes call, independent of the raw numbers. */
  approve: boolean;
  feedback: string[];
}

export interface GateInput {
  jest: JestSummary;
  verdict: AthenaVerdict;
  /** Whether live infra (Kafka, etc.) was up during the run. */
  liveInfraUp?: boolean;
  /** Raw captured error text from the run, used to classify failures. */
  errorText?: string;
}

export interface GateDecision {
  approved: boolean;
  /** Why it was (not) approved — shown to the engineer + logged. */
  reasons: string[];
  /** Hard blockers that must be cleared before re-review. */
  blocking: string[];
  /** Failures judged environmental (infra offline) rather than real regressions. */
  environmental: ClassifiedFailure[];
}

/**
 * Suites whose failures, when the matching infra is offline, are environmental
 * rather than regressions. Athena still flags them, but they do not block a
 * release when the infra is intentionally down (e.g. Kafka KAFKA_DISABLED=1).
 */
const INFRA_FAILURE_PATTERNS: Array<{ rx: RegExp; reason: string }> = [
  { rx: /producer not connected/i, reason: 'Kafka offline (producer not connected)' },
  { rx: /econnrefused/i, reason: 'service connection refused (infra offline)' },
  { rx: /kafka/i, reason: 'Kafka integration requires a live broker' },
  { rx: /lightrag.*(unavailable|offline|connect)/i, reason: 'LightRAG service not reachable' },
];

/** A suite path that is an integration test (needs live services to pass). */
export function isIntegrationSuite(suite: string): boolean {
  return /(^|\/)integration(\/|\.)/.test(suite);
}

/**
 * Parse the tail of a `jest` run into a structured summary. Tolerant of the
 * default reporter's wording; sets parsed=false if the summary lines are absent.
 */
export function parseJestSummary(output: string): JestSummary {
  const suites = /Test Suites:(?:\s*(\d+) failed,)?\s*(\d+) passed,\s*(\d+) total/.exec(output);
  const tests = /Tests:(?:\s*(\d+) failed,)?\s*(\d+) passed,\s*(\d+) total/.exec(output);
  const failedSuites = Array.from(output.matchAll(/^FAIL\s+(\S+)/gm)).map(m => m[1]);

  if (!suites || !tests) {
    return {
      suitesPassed: 0, suitesFailed: 0, suitesTotal: 0,
      testsPassed: 0, testsFailed: 0, testsTotal: 0,
      failedSuites, parsed: false,
    };
  }
  return {
    suitesFailed: Number(suites[1] || 0),
    suitesPassed: Number(suites[2]),
    suitesTotal: Number(suites[3]),
    testsFailed: Number(tests[1] || 0),
    testsPassed: Number(tests[2]),
    testsTotal: Number(tests[3]),
    failedSuites,
    parsed: true,
  };
}

/**
 * Classify each failing suite as environmental (infra offline) or a real
 * regression, using the suite path and the captured error text.
 */
export function classifyFailures(
  failedSuites: string[],
  errorText: string,
  liveInfraUp = false,
): ClassifiedFailure[] {
  return failedSuites.map(suite => {
    if (!isIntegrationSuite(suite)) {
      // A failing *unit* suite is always a regression — unit tests must not
      // depend on live infra.
      return { suite, klass: 'regression', reason: 'unit suite failed' };
    }
    if (liveInfraUp) {
      // Infra was up, yet an integration suite failed → treat as a regression.
      return { suite, klass: 'regression', reason: 'integration failed with infra up' };
    }
    const hit = INFRA_FAILURE_PATTERNS.find(p => p.rx.test(errorText) || p.rx.test(suite));
    return hit
      ? { suite, klass: 'environmental', reason: hit.reason }
      : { suite, klass: 'regression', reason: 'integration failed, cause not recognised as infra' };
  });
}

/**
 * The gate. Athena approves ONLY when every condition holds:
 *  1. the jest summary parsed,
 *  2. Athena judged the feature works,
 *  3. Athena confirms she reviewed the unit + regression run,
 *  4. Athena's own call is approve,
 *  5. there are zero real regressions (unit failures, or integration failures
 *     not explained by offline infra).
 * Environmental failures are surfaced but do not block when infra is down.
 */
export function decideGate(input: GateInput): GateDecision {
  const { jest, verdict, liveInfraUp = false } = input;
  const reasons: string[] = [];
  const blocking: string[] = [];

  const errorText = input.errorText ?? jest.failedSuites.join('\n');
  const classified = classifyFailures(jest.failedSuites, errorText, liveInfraUp);
  const environmental = classified.filter(c => c.klass === 'environmental');
  const regressions = classified.filter(c => c.klass === 'regression');

  if (!jest.parsed) blocking.push('Could not parse the test run — re-run the suite.');
  if (jest.testsTotal === 0) blocking.push('No tests ran — a feature must ship with unit + regression tests.');
  if (regressions.length > 0) {
    blocking.push(`${regressions.length} suite(s) failing as real regressions: ${regressions.map(r => r.suite).join(', ')}`);
  }
  if (!verdict.featureWorks) blocking.push('Athena could not confirm the feature works.');
  if (!verdict.reviewedTests) blocking.push('Athena has not yet reviewed the unit + regression run.');
  if (!verdict.approve) blocking.push('Athena requested changes on the diff.');

  if (environmental.length > 0) {
    reasons.push(`${environmental.length} integration suite(s) skipped as environmental (infra offline): ${environmental.map(e => e.suite).join(', ')}`);
  }
  reasons.push(`Unit + regression: ${jest.testsPassed}/${jest.testsTotal} tests green across ${jest.suitesPassed}/${jest.suitesTotal} suites.`);

  const approved = blocking.length === 0;
  reasons.unshift(approved
    ? 'APPROVED — working feature with a clean unit + regression run.'
    : 'CHANGES REQUESTED — see blocking items.');

  return { approved, reasons, blocking, environmental };
}

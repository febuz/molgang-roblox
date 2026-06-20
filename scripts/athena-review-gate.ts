#!/usr/bin/env tsx
/**
 * Athena review-gate runner — drives the Opus 4.8 PR gate end to end.
 *
 *   ts-node scripts/athena-review-gate.ts [--base vpc/master] [--head HEAD]
 *           [--verdict path/to/verdict.json] [--apply] [--api http://localhost:3100]
 *
 * Stage 1 (packet):  builds a review packet for the release candidate
 *                    (commit list + diffstat + backlog refs) and runs the whole
 *                    jest suite, writing the packet to /tmp for Athena (Opus).
 * Stage 2 (gate):    given Athena's verdict JSON, applies the pure gate
 *                    (src/review/athena-gate.ts).
 * Stage 3 (act):     posts feedback to the forum; on approval (+ --apply) marks
 *                    the referenced backlog items complete (the engineer who
 *                    built them "completes" them) and prints the release command.
 *
 * It never pushes to GitHub on its own — release stays an explicit human step.
 */
import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import {
  parseJestSummary, decideGate, AthenaVerdict, GateDecision,
} from '../src/review/athena-gate';

function arg(name: string, def?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
function sh(cmd: string): string {
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }
  catch (e: any) { return (e.stdout || '') + (e.stderr || ''); }
}

const BASE = arg('base', 'vpc/master')!;
const HEAD = arg('head', 'HEAD')!;
const API = arg('api', 'http://localhost:3100')!;

function buildPacket() {
  const range = `${BASE}..${HEAD}`;
  const commits = sh(`git log ${range} --format=%H%x09%s`).trim().split('\n').filter(Boolean)
    .map(l => { const [hash, ...s] = l.split('\t'); return { hash: hash.slice(0, 8), subject: s.join('\t') }; });
  const diffstat = sh(`git diff --stat ${range}`).trim();
  // Backlog refs like "(backlog 6.5.19)" or "backlog-12345" in commit subjects.
  const backlogRefs = Array.from(new Set(
    commits.flatMap(c => Array.from(c.subject.matchAll(/backlog[ -]([0-9][0-9.]*)/gi)).map(m => m[1])),
  ));
  console.log(`\n📦 Release candidate ${range}: ${commits.length} commit(s), ${backlogRefs.length} backlog ref(s)`);
  return { range, commits, diffstat, backlogRefs };
}

function runSuite() {
  console.log('\n🧪 Running full jest suite (unit + regression on the whole)...');
  const out = sh('npx jest --silent --reporters=default 2>&1');
  const jest = parseJestSummary(out);
  console.log(`   suites ${jest.suitesPassed}/${jest.suitesTotal} · tests ${jest.testsPassed}/${jest.testsTotal} green` +
    (jest.failedSuites.length ? ` · failing: ${jest.failedSuites.join(', ')}` : ''));
  return { jest, errorText: out };
}

async function post(path: string, body: any) {
  try {
    const r = await fetch(`${API}${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return await r.json().catch(() => ({}));
  } catch (e: any) { return { error: e.message }; }
}

async function act(decision: GateDecision, packet: ReturnType<typeof buildPacket>, verdict: AthenaVerdict) {
  const summary = [
    `Athena (Opus 4.8) review of ${packet.range}`,
    ...decision.reasons.map(r => `• ${r}`),
    ...decision.blocking.map(b => `⛔ ${b}`),
    ...verdict.feedback.map(f => `↪ ${f}`),
  ].join('\n');

  // Feedback always goes to the cross-team forum so engineers see it.
  await post('/api/forum/cross/thread', {
    title: `Athena review: ${packet.range} — ${decision.approved ? 'APPROVED' : 'CHANGES REQUESTED'}`,
    body: summary, author: 'Athena',
  });

  if (decision.approved && flag('apply')) {
    for (const ref of packet.backlogRefs) {
      const r = await post(`/api/backlog/${ref}/status`, { status: 'completed', completed_by: 'engineer', reviewed_by: 'Athena' });
      console.log(`   ✅ backlog ${ref} → completed (${r?.success ? 'ok' : 'see api'})`);
    }
    console.log(`\n🚀 Approved. Release with:\n   git push vpc ${HEAD}:master\n`);
  } else if (!decision.approved) {
    console.log('\n↩  Changes requested — feedback posted to /api/forum/cross for the engineer to address.');
  }
}

(async () => {
  const packet = buildPacket();
  const { jest, errorText } = runSuite();
  writeFileSync('/tmp/athena-review-packet.json', JSON.stringify({ ...packet, jest }, null, 2));
  console.log('   packet → /tmp/athena-review-packet.json (hand to Athena/Opus for verdict)');

  const verdictPath = arg('verdict');
  if (!verdictPath) {
    console.log('\nNo --verdict supplied. Stage 1 complete; re-run with --verdict <file> once Athena (Opus) has reviewed.');
    return;
  }
  if (!existsSync(verdictPath)) { console.error(`verdict file not found: ${verdictPath}`); process.exit(2); }
  const verdict: AthenaVerdict = JSON.parse(readFileSync(verdictPath, 'utf8'));

  const liveInfraUp = /"kafka":"operational"/.test(sh(`curl -s --max-time 4 ${API}/api/health`));
  const decision = decideGate({ jest, verdict, liveInfraUp, errorText });

  console.log('\n──────── Athena gate decision ────────');
  decision.reasons.forEach(r => console.log(`  ${r}`));
  decision.blocking.forEach(b => console.log(`  ⛔ ${b}`));
  console.log('──────────────────────────────────────');

  await act(decision, packet, verdict);
  process.exit(decision.approved ? 0 : 1);
})();

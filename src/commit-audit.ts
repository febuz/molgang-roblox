/**
 * Commit audit trail — every git commit recorded so we can answer
 * "what happened, when, by whom, for which task".
 *
 * Source of records:
 *   - scripts/git-hooks/post-commit fires after every commit and POSTs to
 *     /api/audit/commit with the SHA, subject, author, and timestamp.
 *   - On startup the audit is back-filled from `git log` so nothing is lost
 *     if the hook wasn't installed yet (idempotent — same SHA never inserted twice).
 *
 * Storage: append-only JSONL on EDS2. Cheap to scan, easy to grep.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { AGENT_NAMES } from './agent-registry';

const STATE_DIR = process.env.AUDIT_STATE_DIR || '/media/knight2/EDS2/virtualpc-state';
const AUDIT_FILE = path.join(STATE_DIR, 'commit-audit.jsonl');
const REPO_PATH = path.resolve(__dirname, '..');

export interface CommitAuditEntry {
  sha: string;
  shortSha: string;
  author: string;
  timestamp: string;        // ISO
  subject: string;
  attributedAgent: string;  // best-effort agent attribution
  taskRef?: string;         // task id mentioned in the subject, if any
  recordedAt: string;       // when we ingested this — distinguishes hook vs backfill
  source: 'hook' | 'backfill' | 'api';
}

function ensureDir(): void {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  if (!fs.existsSync(AUDIT_FILE)) fs.writeFileSync(AUDIT_FILE, '');
}

function attributeAgent(subject: string): string {
  // Word-boundary match so "Vice" doesn't match the "vice" inside "service",
  // "Kai" doesn't match "kafka", "Mira" doesn't match "miracle", etc. Sort
  // by length-desc so multi-word names (Hermes-Roblox, Tester-Web-Sam) are
  // tried before their prefixes.
  const sorted = [...AGENT_NAMES].sort((a, b) => b.length - a.length);
  for (const a of sorted) {
    // Escape any regex specials in the agent name (Hermes-Roblox has -)
    const safe = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${safe}\\b`, 'i');
    if (re.test(subject)) return a;
  }
  return 'System';
}

function extractTaskRef(subject: string): string | undefined {
  // Match task-XXXX or backlog X.Y.Z patterns
  const taskId = subject.match(/\btask-\d+\b/i);
  if (taskId) return taskId[0];
  const backlog = subject.match(/backlog\s+([\d.]+)/i);
  if (backlog) return `backlog-${backlog[1]}`;
  return undefined;
}

function readAll(): CommitAuditEntry[] {
  ensureDir();
  const raw = fs.readFileSync(AUDIT_FILE, 'utf8');
  if (!raw.trim()) return [];
  const out: CommitAuditEntry[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip malformed line */ }
  }
  return out;
}

function appendOne(entry: CommitAuditEntry): void {
  ensureDir();
  fs.appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n');
}

/** Has this SHA been recorded already? Cheap check by tail-scan first. */
function hasSha(sha: string, cache: Set<string>): boolean {
  return cache.has(sha);
}

function loadShaCache(): Set<string> {
  return new Set(readAll().map(e => e.sha));
}

export function record(input: { sha: string; subject: string; author: string; timestamp?: string; source?: 'hook' | 'api' }): { ok: true; entry: CommitAuditEntry } | { ok: false; reason: string } {
  const cache = loadShaCache();
  if (cache.has(input.sha)) {
    return { ok: false, reason: 'already recorded' };
  }
  const ts = input.timestamp || new Date().toISOString();
  const entry: CommitAuditEntry = {
    sha: input.sha,
    shortSha: input.sha.slice(0, 8),
    author: input.author,
    timestamp: ts,
    subject: input.subject,
    attributedAgent: attributeAgent(input.subject),
    taskRef: extractTaskRef(input.subject),
    recordedAt: new Date().toISOString(),
    source: input.source || 'api',
  };
  appendOne(entry);

  // Publish to Kafka commit.audit topic so the audit consumer + future
  // replicas see the same event. Best-effort — failure logs but doesn't
  // affect the local-jsonl recording. Architecture doc § 4.1 lists this
  // as a producer; the wire is here.
  // Lazy import to avoid pulling kafka into tools that just want to read
  // the audit log without producer-side dependencies.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { bestEffortPublish } = require('./integrations/kafka/shared');
    bestEffortPublish((p: any) => p.publishCommitAudit({
      sha: entry.sha,
      shortSha: entry.shortSha,
      author: entry.author,
      ts: entry.timestamp,
      subject: entry.subject,
      attributedAgent: entry.attributedAgent,
      taskRef: entry.taskRef,
      source: entry.source,
    }));
  } catch { /* shared.ts not loadable in some test envs — silently skip */ }

  return { ok: true, entry };
}

export function list(filter?: { agent?: string; taskRef?: string; sinceTs?: string; limit?: number }): CommitAuditEntry[] {
  let entries = readAll();
  if (filter?.agent) entries = entries.filter(e => e.attributedAgent === filter.agent);
  if (filter?.taskRef) entries = entries.filter(e => e.taskRef === filter.taskRef);
  if (filter?.sinceTs) {
    const cutoff = new Date(filter.sinceTs).getTime();
    entries = entries.filter(e => new Date(e.timestamp).getTime() >= cutoff);
  }
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (filter?.limit) entries = entries.slice(0, filter.limit);
  return entries;
}

export function summary() {
  const entries = readAll();
  const byAgent: { [agent: string]: number } = {};
  const bySource: { [source: string]: number } = {};
  for (const e of entries) {
    byAgent[e.attributedAgent] = (byAgent[e.attributedAgent] || 0) + 1;
    bySource[e.source] = (bySource[e.source] || 0) + 1;
  }
  const newest = entries.length ? entries.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b)) : null;
  const oldest = entries.length ? entries.reduce((a, b) => (new Date(a.timestamp) < new Date(b.timestamp) ? a : b)) : null;
  return {
    total: entries.length,
    byAgent,
    bySource,
    newestSha: newest?.shortSha,
    newestAt: newest?.timestamp,
    oldestSha: oldest?.shortSha,
    oldestAt: oldest?.timestamp,
    file: AUDIT_FILE,
  };
}

/**
 * Backfill from `git log`. Idempotent: SHAs already in the audit file are
 * skipped. Run on startup so an audit log that was started after the repo
 * already had history catches up to where we are.
 */
export function backfillFromGit(maxCommits = 1000): { added: number; skipped: number } {
  ensureDir();
  const cache = loadShaCache();
  let added = 0;
  let skipped = 0;
  try {
    // %H sha • %an author • %at unix-ts • %s subject — separated by tab so the
    // subject can contain anything except a literal tab.
    const out = execSync(
      `git -C "${REPO_PATH}" log -n ${maxCommits} --pretty=format:'%H%x09%an <%ae>%x09%at%x09%s'`,
      { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
    );
    for (const line of out.split('\n')) {
      if (!line.trim()) continue;
      const [sha, author, atUnix, ...subjParts] = line.split('\t');
      if (!sha || hasSha(sha, cache)) { skipped++; continue; }
      const subject = subjParts.join('\t');
      const entry: CommitAuditEntry = {
        sha,
        shortSha: sha.slice(0, 8),
        author,
        timestamp: new Date(parseInt(atUnix, 10) * 1000).toISOString(),
        subject,
        attributedAgent: attributeAgent(subject),
        taskRef: extractTaskRef(subject),
        recordedAt: new Date().toISOString(),
        source: 'backfill',
      };
      appendOne(entry);
      cache.add(sha);
      added++;
    }
  } catch (e: any) {
    // Non-fatal — just log via stderr if git fails (e.g. shallow clone)
    process.stderr.write(`commit-audit backfill: ${e.message}\n`);
  }
  return { added, skipped };
}

/**
 * Commits Tracker - parses `git log` of the virtualpc repo and attributes
 * commits to agents. Mirrors the token-usage page layout.
 *
 * Attribution rules (in priority order):
 *  1. Co-Authored-By trailer naming a known agent
 *  2. Commit subject keyword match (e.g. "Mira", "Cleopatra", "Kai's")
 *  3. Fall through to "System" (unattributed)
 *
 * Results are cached for 30s to keep git-log calls cheap.
 */

import { execSync } from 'child_process';
import * as path from 'path';

const REPO_PATH = path.resolve(__dirname, '..');
const CACHE_TTL_MS = 30_000;

const KNOWN_AGENTS = [
  'Fill', 'Kai', 'Zip', 'Mira', 'Luna',
  'Cleopatra', 'Alexander', 'MoneyGod',
  'Claude', // Opus/Sonnet commits get attributed here
];

interface ParsedCommit {
  sha: string;
  shortSha: string;
  timestamp: number; // ms
  author: string;
  subject: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  attributedAgent: string;
}

let cache: { at: number; commits: ParsedCommit[] } | null = null;

function runGit(args: string): string {
  try {
    return execSync(`git -C "${REPO_PATH}" ${args}`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch (e) {
    return '';
  }
}

function attribute(subject: string, body: string): string {
  const hay = (subject + ' ' + body).toLowerCase();

  // 1. Co-Authored-By trailer
  const coAuth = /co-authored-by:\s*([^\n<]+)/i.exec(body);
  if (coAuth) {
    const name = coAuth[1].trim();
    // Claude models commit as co-author — attribute to "Claude" agent bucket
    if (/claude|opus|sonnet|haiku/i.test(name)) return 'Claude';
    for (const a of KNOWN_AGENTS) {
      if (name.toLowerCase().includes(a.toLowerCase())) return a;
    }
  }

  // 2. Subject keyword
  for (const a of KNOWN_AGENTS) {
    const rx = new RegExp('\\b' + a + '\\b', 'i');
    if (rx.test(subject)) return a;
  }

  // 3. Subject patterns common to each agent's domain
  if (/\bcleopatra|executive|authority|governance|ratif/i.test(hay)) return 'Cleopatra';
  if (/\bmoneygod|molcoin|economy|carbon credit|anti-farm|molco2/i.test(hay)) return 'MoneyGod';
  if (/\balexander|adr|arbitr|tech-stack|ratif/i.test(hay)) return 'Alexander';
  if (/\bkafka|redis|k8s|kubernetes|ci\/cd|gpu|infrastructure|schema|anti-cheat/i.test(hay)) return 'Kai';
  if (/\bshader|webgl|gltf|blender|particle|render|mobile/i.test(hay)) return 'Luna';
  if (/\bfigma|logo|icon|ui kit|portrait|sprite|npc|visual/i.test(hay)) return 'Mira';
  if (/\bport:|chemistry|molecule|factory|recipe|quest|playwright|testplay/i.test(hay)) return 'Zip';
  if (/\broadmap|okr|partnership|compliance|budget|migration plan/i.test(hay)) return 'Fill';

  return 'System';
}

function parseNumstat(block: string): { files: number; ins: number; del: number } {
  const lines = block.split('\n').filter(Boolean);
  let files = 0, ins = 0, del = 0;
  for (const l of lines) {
    const m = /^(\d+|-)\t(\d+|-)\t/.exec(l);
    if (!m) continue;
    files++;
    if (m[1] !== '-') ins += parseInt(m[1], 10);
    if (m[2] !== '-') del += parseInt(m[2], 10);
  }
  return { files, ins, del };
}

function loadCommits(): ParsedCommit[] {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.commits;

  // Delimited format: sha %n author %n timestamp %n subject %n body %n numstat
  const SEP = '---COMMIT-BOUNDARY-7f3e---';
  const raw = runGit(`log --pretty=format:"${SEP}%H%n%an <%ae>%n%at%n%s%n%b%n--NUMSTAT--" --numstat -n 500`);
  if (!raw) return [];

  const commits: ParsedCommit[] = [];
  const blocks = raw.split(SEP).filter(Boolean);
  for (const block of blocks) {
    const [sha, author, ts, subject, ...rest] = block.split('\n');
    if (!sha) continue;
    const numIdx = rest.findIndex(l => l === '--NUMSTAT--');
    const body = numIdx >= 0 ? rest.slice(0, numIdx).join('\n') : rest.join('\n');
    const numstat = numIdx >= 0 ? rest.slice(numIdx + 1).join('\n') : '';
    const n = parseNumstat(numstat);
    commits.push({
      sha: sha.trim(),
      shortSha: sha.trim().slice(0, 8),
      timestamp: parseInt(ts.trim(), 10) * 1000,
      author: author.trim(),
      subject: subject.trim(),
      filesChanged: n.files,
      insertions: n.ins,
      deletions: n.del,
      attributedAgent: attribute(subject.trim(), body),
    });
  }
  cache = { at: Date.now(), commits };
  return commits;
}

// === PUBLIC API ===

export function getCommitSummary() {
  const commits = loadCommits();
  const now = Date.now();
  const hourAgo = now - 3600_000;
  const dayAgo = now - 86_400_000;
  const weekAgo = now - 7 * 86_400_000;
  const monthAgo = now - 30 * 86_400_000;

  const total = commits.length;
  const totalIns = commits.reduce((s, c) => s + c.insertions, 0);
  const totalDel = commits.reduce((s, c) => s + c.deletions, 0);
  const thisHour = commits.filter(c => c.timestamp > hourAgo).length;
  const today = commits.filter(c => c.timestamp > dayAgo).length;
  const thisWeek = commits.filter(c => c.timestamp > weekAgo).length;
  const thisMonth = commits.filter(c => c.timestamp > monthAgo).length;

  // Per-agent breakdown
  const byAgent: { [agent: string]: { commits: number; insertions: number; deletions: number; thisHour: number; today: number; month: number; lastCommit: string | null } } = {};
  for (const c of commits) {
    const a = c.attributedAgent;
    if (!byAgent[a]) byAgent[a] = { commits: 0, insertions: 0, deletions: 0, thisHour: 0, today: 0, month: 0, lastCommit: null };
    const b = byAgent[a];
    b.commits++;
    b.insertions += c.insertions;
    b.deletions += c.deletions;
    if (c.timestamp > hourAgo) b.thisHour++;
    if (c.timestamp > dayAgo) b.today++;
    if (c.timestamp > monthAgo) b.month++;
    if (!b.lastCommit) b.lastCommit = new Date(c.timestamp).toISOString();
  }

  return {
    repo: path.basename(REPO_PATH),
    combined: {
      totalCommits: total,
      totalInsertions: totalIns,
      totalDeletions: totalDel,
      thisHour,
      today,
      thisWeek,
      thisMonth,
    },
    agents: byAgent,
    agentOrder: Object.keys(byAgent).sort((a, b) => (byAgent[b].commits - byAgent[a].commits)),
  };
}

export function getCommitHourly(agent?: string): Array<{ hour: string; commits: number; insertions: number; deletions: number }> {
  const commits = loadCommits();
  const now = new Date();
  const buckets: Array<{ hour: string; commits: number; insertions: number; deletions: number }> = [];
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3600_000);
    h.setMinutes(0, 0, 0);
    buckets.push({
      hour: String(h.getHours()).padStart(2, '0') + ':00',
      commits: 0,
      insertions: 0,
      deletions: 0,
    });
  }
  const startTs = now.getTime() - 24 * 3600_000;
  for (const c of commits) {
    if (c.timestamp < startTs) continue;
    if (agent && c.attributedAgent !== agent) continue;
    const hoursAgo = Math.floor((now.getTime() - c.timestamp) / 3600_000);
    const idx = 23 - hoursAgo;
    if (idx < 0 || idx > 23) continue;
    buckets[idx].commits++;
    buckets[idx].insertions += c.insertions;
    buckets[idx].deletions += c.deletions;
  }
  return buckets;
}

export function getRecentCommits(limit = 30): Array<{
  sha: string;
  time: string;
  timestamp: string;
  agent: string;
  subject: string;
  files: number;
  insertions: number;
  deletions: number;
}> {
  const commits = loadCommits();
  return commits.slice(0, limit).map(c => ({
    sha: c.shortSha,
    time: new Date(c.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    timestamp: new Date(c.timestamp).toISOString(),
    agent: c.attributedAgent,
    subject: c.subject,
    files: c.filesChanged,
    insertions: c.insertions,
    deletions: c.deletions,
  }));
}

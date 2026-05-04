/**
 * Scrum-of-scrums infrastructure — standup feed + bug-report ingestion
 * for each scrum team (roblox / web / marketing) and the cross-team
 * scrum-of-scrums.
 *
 * Five Hermes coordinator agents run the daily standups; testers file
 * bug reports against their team. Fill (CEO) chairs the cross-team
 * sync that aggregates from each scrum.
 *
 * Persistence: data/scrum.json with dirty-flag + 5s save pattern.
 *
 * Read endpoints are open to any agent that wants to know "what did
 * the web team report yesterday?" — bugs feed into the task engine
 * via the regenerate-tasks loop (queued).
 */
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utils/logger';

export type ScrumTeam = 'cross' | 'scrum-roblox' | 'scrum-web' | 'scrum-marketing';

export interface StandupItem {
  id: string;
  team: ScrumTeam;
  agent: string;
  /** Free-text: what the agent did, what's blocking, what's next */
  body: string;
  /** ISO timestamp */
  at: string;
}

export type BugSeverity = 'p0-blocker' | 'p1-major' | 'p2-minor' | 'p3-cosmetic';

export interface BugReport {
  id: string;
  team: ScrumTeam;
  /** Reporting agent (typically a Tester-* slot) */
  reporter: string;
  /** One-line summary */
  title: string;
  /** Steps to reproduce + expected/actual */
  body: string;
  severity: BugSeverity;
  /** What part of the game / surface this hits */
  surface?: string;
  /** Status — open until resolved */
  status: 'open' | 'triaged' | 'fixed' | 'wontfix';
  /** Optional link to a forum thread / commit / PR */
  refs?: string[];
  at: string;
  updatedAt: string;
}

interface ScrumState {
  standups: StandupItem[];
  bugs: BugReport[];
}

const SCRUM_PATH = path.join(__dirname, '..', '..', '..', 'data', 'scrum.json');
let state: ScrumState = { standups: [], bugs: [] };
let loaded = false;
let dirty = false;

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  if (!fs.existsSync(SCRUM_PATH)) {
    state = { standups: [], bugs: [] };
    return;
  }
  try {
    const raw = fs.readFileSync(SCRUM_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    state = {
      standups: Array.isArray(parsed.standups) ? parsed.standups : [],
      bugs: Array.isArray(parsed.bugs) ? parsed.bugs : [],
    };
  } catch (e: any) {
    logger.warn(`scrum: load failed ${e.message}`);
    state = { standups: [], bugs: [] };
  }
}

let saveTimer: NodeJS.Timeout | null = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; save(); }, 5000);
}

function save() {
  if (!dirty) return;
  try {
    fs.mkdirSync(path.dirname(SCRUM_PATH), { recursive: true });
    fs.writeFileSync(SCRUM_PATH, JSON.stringify(state, null, 2));
    dirty = false;
  } catch (e: any) {
    logger.warn(`scrum: save failed ${e.message}`);
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Standups ────────────────────────────────────────────────────────
export function logStandup(team: ScrumTeam, agent: string, body: string): StandupItem {
  ensureLoaded();
  const item: StandupItem = { id: newId('su'), team, agent, body, at: new Date().toISOString() };
  state.standups.push(item);
  // Keep last 1000 per team
  const teamItems = state.standups.filter(s => s.team === team);
  if (teamItems.length > 1000) {
    const drop = teamItems.length - 1000;
    const ids = new Set(teamItems.slice(0, drop).map(s => s.id));
    state.standups = state.standups.filter(s => !ids.has(s.id));
  }
  dirty = true;
  scheduleSave();
  return item;
}

export function listStandups(team?: ScrumTeam, limit = 50): StandupItem[] {
  ensureLoaded();
  let out = team ? state.standups.filter(s => s.team === team) : state.standups;
  return out.slice(-limit).reverse();
}

// ─── Bugs ────────────────────────────────────────────────────────────
export function fileBug(args: {
  team: ScrumTeam;
  reporter: string;
  title: string;
  body: string;
  severity?: BugSeverity;
  surface?: string;
  refs?: string[];
}): BugReport {
  ensureLoaded();
  const now = new Date().toISOString();
  const bug: BugReport = {
    id: newId('bug'),
    team: args.team,
    reporter: args.reporter,
    title: args.title,
    body: args.body,
    severity: args.severity || 'p2-minor',
    surface: args.surface,
    status: 'open',
    refs: args.refs,
    at: now,
    updatedAt: now,
  };
  state.bugs.push(bug);
  dirty = true;
  scheduleSave();
  return bug;
}

export function listBugs(filter?: { team?: ScrumTeam; status?: BugReport['status']; severity?: BugSeverity; reporter?: string; limit?: number }): BugReport[] {
  ensureLoaded();
  let out = [...state.bugs];
  if (filter?.team) out = out.filter(b => b.team === filter.team);
  if (filter?.status) out = out.filter(b => b.status === filter.status);
  if (filter?.severity) out = out.filter(b => b.severity === filter.severity);
  if (filter?.reporter) out = out.filter(b => b.reporter === filter.reporter);
  out.sort((a, b) => b.at.localeCompare(a.at));
  return filter?.limit ? out.slice(0, filter.limit) : out;
}

export function updateBug(id: string, patch: Partial<Pick<BugReport, 'status' | 'severity' | 'body' | 'refs'>>): BugReport | undefined {
  ensureLoaded();
  const bug = state.bugs.find(b => b.id === id);
  if (!bug) return undefined;
  Object.assign(bug, patch, { updatedAt: new Date().toISOString() });
  dirty = true;
  scheduleSave();
  return bug;
}

export function summary(): { byTeam: Record<string, { standups: number; bugs: { open: number; total: number } }> } {
  ensureLoaded();
  const byTeam: Record<string, { standups: number; bugs: { open: number; total: number } }> = {};
  const teams: ScrumTeam[] = ['cross', 'scrum-roblox', 'scrum-web', 'scrum-marketing'];
  for (const t of teams) {
    const standupCount = state.standups.filter(s => s.team === t).length;
    const bugs = state.bugs.filter(b => b.team === t);
    byTeam[t] = {
      standups: standupCount,
      bugs: { open: bugs.filter(b => b.status === 'open').length, total: bugs.length },
    };
  }
  return { byTeam };
}

export function flushSync() { if (dirty) save(); }

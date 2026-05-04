/**
 * Kami integration — doc-brief queue.
 *
 * Kami (https://github.com/tw93/kami) is a Claude Code SKILL — it runs
 * inside a Claude Code session, auto-triggers on natural-language doc
 * requests ("make a one-pager", "build me a portfolio"), and produces
 * typeset HTML / PDF / slide decks under a parchment + ink-blue design
 * language.
 *
 * Because a skill needs a real Claude Code session (with the user's
 * keychain auth + skills mounted), virtualpc cannot render Kami output
 * itself — that would require recursively shelling out to `claude`,
 * which conflicts with auth boundaries and the autoloop hook.
 *
 * Pattern instead: virtualpc agents *queue* a brief here describing
 * what they want. A Claude Code session (interactive user, or an
 * automated cron job that shells `claude` with hooks disabled) drains
 * the queue, runs Kami via the skill, writes output to docs/kami/, and
 * marks the brief delivered.
 *
 * Persists to data/kami-briefs.json with the same dirty-flag + 5s save
 * pattern as the rest of virtualpc.
 */
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utils/logger';

export type KamiDocType = 'one-pager' | 'long-doc' | 'letter' | 'portfolio' | 'resume' | 'slides' | 'white-paper';
export type KamiLanguage = 'en' | 'zh' | 'ja';
export type KamiStatus = 'queued' | 'in-progress' | 'delivered' | 'cancelled';

export interface KamiBrief {
  id: string;
  /** Requesting agent (e.g. Mira, Governor, Kimi) */
  requester: string;
  type: KamiDocType;
  language: KamiLanguage;
  /** Title shown on the document */
  title: string;
  /** Audience / brief context, free text */
  audience?: string;
  /** Key points / outline as markdown — what the doc must contain */
  outline: string;
  /** Source material the renderer should pull from (URLs, file paths,
   *  governance ids the renderer should look up). */
  sources?: string[];
  /** Where the rendered output should land; relative to repo root. */
  outputPath: string;
  status: KamiStatus;
  /** Set when status moves to delivered */
  deliveredAt?: string;
  /** Renderer notes (errors, choices made) */
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface KamiState {
  briefs: KamiBrief[];
}

const KAMI_PATH = path.join(__dirname, '..', '..', '..', 'data', 'kami-briefs.json');
let state: KamiState = { briefs: [] };
let loaded = false;
let dirty = false;

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  if (!fs.existsSync(KAMI_PATH)) { state = { briefs: [] }; return; }
  try {
    const parsed = JSON.parse(fs.readFileSync(KAMI_PATH, 'utf8'));
    state.briefs = Array.isArray(parsed.briefs) ? parsed.briefs : [];
  } catch (e: any) {
    logger.warn(`kami: load failed ${e.message}`);
    state = { briefs: [] };
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
    fs.mkdirSync(path.dirname(KAMI_PATH), { recursive: true });
    fs.writeFileSync(KAMI_PATH, JSON.stringify(state, null, 2));
    dirty = false;
  } catch (e: any) { logger.warn(`kami: save failed ${e.message}`); }
}

function newId(): string {
  return `brief-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function queueBrief(args: {
  requester: string;
  type: KamiDocType;
  language?: KamiLanguage;
  title: string;
  audience?: string;
  outline: string;
  sources?: string[];
  outputPath?: string;
}): KamiBrief {
  ensureLoaded();
  const now = new Date().toISOString();
  const id = newId();
  const brief: KamiBrief = {
    id,
    requester: args.requester,
    type: args.type,
    language: args.language || 'en',
    title: args.title,
    audience: args.audience,
    outline: args.outline,
    sources: args.sources,
    outputPath: args.outputPath || `docs/kami/${id}.html`,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
  };
  state.briefs.push(brief);
  dirty = true;
  scheduleSave();
  return brief;
}

export function listBriefs(filter?: { status?: KamiStatus; requester?: string; limit?: number }): KamiBrief[] {
  ensureLoaded();
  let out = [...state.briefs];
  if (filter?.status) out = out.filter(b => b.status === filter.status);
  if (filter?.requester) out = out.filter(b => b.requester === filter.requester);
  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return filter?.limit ? out.slice(0, filter.limit) : out;
}

export function getBrief(id: string): KamiBrief | undefined {
  ensureLoaded();
  return state.briefs.find(b => b.id === id);
}

export function setStatus(id: string, status: KamiStatus, notes?: string): KamiBrief | undefined {
  ensureLoaded();
  const b = state.briefs.find(x => x.id === id);
  if (!b) return undefined;
  b.status = status;
  if (notes) b.notes = notes;
  if (status === 'delivered') b.deliveredAt = new Date().toISOString();
  b.updatedAt = new Date().toISOString();
  dirty = true;
  scheduleSave();
  return b;
}

export function summary(): { byStatus: Record<KamiStatus, number>; byType: Record<string, number> } {
  ensureLoaded();
  const byStatus: Record<KamiStatus, number> = { queued: 0, 'in-progress': 0, delivered: 0, cancelled: 0 };
  const byType: Record<string, number> = {};
  for (const b of state.briefs) {
    byStatus[b.status] = (byStatus[b.status] || 0) + 1;
    byType[b.type] = (byType[b.type] || 0) + 1;
  }
  return { byStatus, byType };
}

export function flushSync() { if (dirty) save(); }

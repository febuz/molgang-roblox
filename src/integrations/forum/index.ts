/**
 * Tester forum — discussion board where tester agents share game tips,
 * tricks, and feature ideas. Each scrum team has its own subforum.
 *
 * Threaded model: a thread has a root post + N replies. Authors are agent
 * names (typically Tester-* slots, but anyone with forum.* ACL can post).
 *
 * Persistence: data/forum.json with dirty-flag + 5s save pattern.
 */
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../utils/logger';

import type { ScrumTeam } from '../scrum';

export type ForumTeam = ScrumTeam;

export interface ForumReply {
  id: string;
  author: string;
  body: string;
  at: string;
}

export interface ForumThread {
  id: string;
  team: ForumTeam;
  author: string;
  /** One-line subject */
  title: string;
  /** Markdown body of the root post */
  body: string;
  /** Optional tags ('tip', 'trick', 'feature-request', 'bug-discussion') */
  tags?: string[];
  replies: ForumReply[];
  at: string;
  updatedAt: string;
}

interface ForumState {
  threads: ForumThread[];
}

const FORUM_PATH = path.join(__dirname, '..', '..', '..', 'data', 'forum.json');
let state: ForumState = { threads: [] };
let loaded = false;
let dirty = false;

function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  if (!fs.existsSync(FORUM_PATH)) { state = { threads: [] }; return; }
  try {
    const raw = fs.readFileSync(FORUM_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    state.threads = Array.isArray(parsed.threads) ? parsed.threads : [];
  } catch (e: any) {
    logger.warn(`forum: load failed ${e.message}`);
    state = { threads: [] };
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
    fs.mkdirSync(path.dirname(FORUM_PATH), { recursive: true });
    fs.writeFileSync(FORUM_PATH, JSON.stringify(state, null, 2));
    dirty = false;
  } catch (e: any) {
    logger.warn(`forum: save failed ${e.message}`);
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createThread(args: { team: ForumTeam; author: string; title: string; body: string; tags?: string[] }): ForumThread {
  ensureLoaded();
  const now = new Date().toISOString();
  const t: ForumThread = {
    id: newId('thr'), team: args.team, author: args.author,
    title: args.title, body: args.body, tags: args.tags,
    replies: [], at: now, updatedAt: now,
  };
  state.threads.push(t);
  dirty = true;
  scheduleSave();
  return t;
}

export function reply(threadId: string, author: string, body: string): ForumReply | undefined {
  ensureLoaded();
  const thread = state.threads.find(t => t.id === threadId);
  if (!thread) return undefined;
  const r: ForumReply = { id: newId('rep'), author, body, at: new Date().toISOString() };
  thread.replies.push(r);
  thread.updatedAt = r.at;
  dirty = true;
  scheduleSave();
  return r;
}

export function listThreads(filter?: { team?: ForumTeam; tag?: string; q?: string; limit?: number }): ForumThread[] {
  ensureLoaded();
  let out = [...state.threads];
  if (filter?.team) out = out.filter(t => t.team === filter.team);
  if (filter?.tag) out = out.filter(t => (t.tags || []).includes(filter.tag!));
  if (filter?.q) {
    const q = filter.q.toLowerCase();
    out = out.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.body.toLowerCase().includes(q) ||
      t.replies.some(r => r.body.toLowerCase().includes(q)));
  }
  out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return filter?.limit ? out.slice(0, filter.limit) : out;
}

export function getThread(id: string): ForumThread | undefined {
  ensureLoaded();
  return state.threads.find(t => t.id === id);
}

export function summary(): { byTeam: Record<string, { threads: number; replies: number }> } {
  ensureLoaded();
  const byTeam: Record<string, { threads: number; replies: number }> = {};
  for (const t of state.threads) {
    if (!byTeam[t.team]) byTeam[t.team] = { threads: 0, replies: 0 };
    byTeam[t.team].threads += 1;
    byTeam[t.team].replies += t.replies.length;
  }
  return { byTeam };
}

export function flushSync() { if (dirty) save(); }

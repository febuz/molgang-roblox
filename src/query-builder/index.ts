/**
 * Query builder — saved, parameterised, versioned queries over the platform's
 * knowledge surfaces (corpus/LightRAG, wiki, codegraph, memory).
 *
 * "Especially query building" from docs/CAPABILITY-CHARTER.md §2: agents and the
 * local Paperclip models reuse curated queries instead of re-phrasing the same
 * question. Each query has a template with {{params}}, a typed param list, and a
 * version history so a known-good query can't silently change.
 *
 * Pure helpers (renderTemplate, validateParams, bumpVersion) have no I/O and are
 * unit-tested; the registrar persists and dispatches.
 */
import type { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export type QueryTarget = 'corpus' | 'wiki' | 'codegraph' | 'memory';

export interface ParamDef {
  name: string;
  required?: boolean;
  default?: string;
  description?: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  target: QueryTarget;
  /** Template with {{param}} placeholders, e.g. "fugacity of {{species}}". */
  template: string;
  params: ParamDef[];
  version: number;
  author: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  history: Array<{ version: number; template: string; updatedAt: string }>;
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Render a template, substituting {{name}} from params (then defaults). */
export function renderTemplate(template: string, params: Record<string, string>, defs: ParamDef[] = []): { rendered: string; missing: string[] } {
  const defaults = new Map(defs.map(d => [d.name, d.default]));
  const missing: string[] = [];
  const rendered = (template || '').replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, name) => {
    const v = params[name] ?? defaults.get(name);
    if (v === undefined || v === '') { missing.push(name); return ''; }
    return String(v);
  });
  return { rendered, missing: Array.from(new Set(missing)) };
}

/** Validate supplied params against the definitions (required + unknown). */
export function validateParams(defs: ParamDef[], params: Record<string, string>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const known = new Set(defs.map(d => d.name));
  for (const d of defs) {
    if (d.required && (params[d.name] === undefined || params[d.name] === '') && d.default === undefined) {
      errors.push(`missing required param: ${d.name}`);
    }
  }
  for (const k of Object.keys(params)) if (!known.has(k)) errors.push(`unknown param: ${k}`);
  return { ok: errors.length === 0, errors };
}

/** Produce the next version of a query, pushing the prior template into history. */
export function bumpVersion(q: SavedQuery, patch: Partial<Pick<SavedQuery, 'template' | 'name' | 'description' | 'params' | 'tags' | 'target'>>, at: string): SavedQuery {
  const history = [...q.history, { version: q.version, template: q.template, updatedAt: q.updatedAt }];
  return {
    ...q,
    ...patch,
    version: q.version + 1,
    updatedAt: at,
    history,
  };
}

// ── Store + routes ──────────────────────────────────────────────────────────

const STORE = path.join(__dirname, '..', '..', 'data', 'queries.json');
let queries: SavedQuery[] = [];
let loaded = false;

function load() { try { queries = JSON.parse(fs.readFileSync(STORE, 'utf8')).queries || []; } catch { queries = []; } loaded = true; }
function save() { try { fs.mkdirSync(path.dirname(STORE), { recursive: true }); fs.writeFileSync(STORE, JSON.stringify({ queries }, null, 2)); } catch { /* best-effort */ } }
let seq = 0;
const uid = () => `q-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Map a target + rendered query string to the platform endpoint that runs it. */
function targetUrl(target: QueryTarget, q: string): string {
  const base = 'http://localhost:' + (process.env.PORT || '3100');
  const e = encodeURIComponent(q);
  switch (target) {
    case 'corpus': return `${base}/api/corpus/search?q=${e}`;
    case 'wiki': return `${base}/api/wiki?q=${e}`;
    case 'codegraph': return `${base}/api/codegraph/search?q=${e}`;
    case 'memory': return `${base}/api/memory/query?q=${e}`;
  }
}

export function registerQueryRoutes(app: Express): void {
  if (!loaded) load();

  app.get('/api/queries', (_req, res) => {
    res.json({ success: true, queries: queries.map(q => ({ id: q.id, name: q.name, target: q.target, version: q.version, params: q.params.map(p => p.name), tags: q.tags })) });
  });

  app.get('/api/queries/:id', (req, res) => {
    const q = queries.find(x => x.id === req.params.id);
    if (!q) { res.status(404).json({ success: false, error: 'query not found' }); return; }
    res.json({ success: true, query: q });
  });

  app.post('/api/queries', (req, res) => {
    const b = req.body || {};
    if (!b.name || !b.target || !b.template) { res.status(400).json({ success: false, error: 'name, target, template required' }); return; }
    if (!['corpus', 'wiki', 'codegraph', 'memory'].includes(b.target)) { res.status(400).json({ success: false, error: 'invalid target' }); return; }
    const now = new Date().toISOString();
    const q: SavedQuery = {
      id: uid(), name: b.name, description: b.description, target: b.target, template: b.template,
      params: Array.isArray(b.params) ? b.params : [], version: 1, author: b.author || 'Coordinator',
      tags: Array.isArray(b.tags) ? b.tags : [], createdAt: now, updatedAt: now, history: [],
    };
    queries.unshift(q); save();
    res.json({ success: true, query: q });
  });

  app.put('/api/queries/:id', (req, res) => {
    const i = queries.findIndex(x => x.id === req.params.id);
    if (i < 0) { res.status(404).json({ success: false, error: 'query not found' }); return; }
    queries[i] = bumpVersion(queries[i], req.body || {}, new Date().toISOString()); save();
    res.json({ success: true, query: queries[i] });
  });

  app.get('/api/queries/:id/history', (req, res) => {
    const q = queries.find(x => x.id === req.params.id);
    if (!q) { res.status(404).json({ success: false, error: 'query not found' }); return; }
    res.json({ success: true, current: q.version, history: q.history });
  });

  app.post('/api/queries/:id/run', async (req, res) => {
    const q = queries.find(x => x.id === req.params.id);
    if (!q) { res.status(404).json({ success: false, error: 'query not found' }); return; }
    const params = (req.body && req.body.params) || {};
    const v = validateParams(q.params, params);
    if (!v.ok) { res.status(400).json({ success: false, errors: v.errors }); return; }
    const { rendered, missing } = renderTemplate(q.template, params, q.params);
    if (missing.length) { res.status(400).json({ success: false, error: 'unfilled params', missing }); return; }
    try {
      const r = await fetch(targetUrl(q.target, rendered));
      const data = await r.json().catch(() => ({}));
      res.json({ success: true, query: q.id, target: q.target, rendered, result: data });
    } catch (e: any) {
      res.json({ success: true, query: q.id, target: q.target, rendered, result: null, dispatchError: e.message });
    }
  });
}

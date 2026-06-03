/**
 * Plan review — make plans available from VirtualPC and let a human comment on
 * specific parts of them, then feed those comments back to the agents.
 *
 * Opus is used mainly for architecture, so the workflow is: an architect agent
 * (or the Coordinator) posts a plan as markdown; it is split into sections; a
 * human comments per-section and marks each section accepted / needs-changes;
 * the aggregated feedback is relayed to the agents (forum) so the Sonnet
 * engineers improve against precise, section-anchored notes.
 *
 * Pure helpers (splitMarkdownIntoSections, aggregateFeedback, planStatus) have
 * no I/O and are unit-tested. Persistence is a flat JSON file like the other
 * modules.
 */
import type { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export type SectionStatus = 'open' | 'accepted' | 'needs-changes';
export type PlanStatus = 'in-review' | 'approved' | 'changes-requested';

export interface PlanComment {
  id: string;
  sectionId: string;
  author: string;
  text: string;
  createdAt: string;
  resolved: boolean;
}

export interface PlanSection {
  id: string;
  heading: string;
  body: string;
  status: SectionStatus;
}

export interface Plan {
  id: string;
  title: string;
  author: string;       // e.g. 'Athena' / 'Coordinator' / an architect agent
  model?: string;       // e.g. 'claude-opus'
  createdAt: string;
  sections: PlanSection[];
  comments: PlanComment[];
}

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Slugify a heading into a stable-ish section id. */
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'section';
}

/**
 * Split a markdown plan into sections on ATX headings (#, ##, ###). Text before
 * the first heading becomes an "Overview" section. Section ids are unique.
 */
export function splitMarkdownIntoSections(md: string): PlanSection[] {
  const lines = (md || '').split('\n');
  const sections: PlanSection[] = [];
  const used = new Set<string>();
  let cur: PlanSection | null = null;
  const push = () => { if (cur && (cur.heading || cur.body.trim())) sections.push({ ...cur, body: cur.body.replace(/\s+$/, '') }); };
  const idFor = (h: string) => { let base = slug(h); let id = base, i = 2; while (used.has(id)) id = `${base}-${i++}`; used.add(id); return id; };

  for (const line of lines) {
    const m = /^(#{1,3})\s+(.*)$/.exec(line);
    if (m) {
      push();
      const heading = m[2].trim();
      cur = { id: idFor(heading), heading, body: '', status: 'open' };
    } else {
      // Don't open the synthetic Overview on leading blank lines (so empty
      // input yields no sections); only once real pre-heading text appears.
      if (!cur) { if (!line.trim()) continue; cur = { id: idFor('overview'), heading: 'Overview', body: '', status: 'open' }; }
      cur.body += line + '\n';
    }
  }
  push();
  return sections;
}

/** Overall plan status from its sections. */
export function planStatus(sections: PlanSection[]): PlanStatus {
  if (sections.some(s => s.status === 'needs-changes')) return 'changes-requested';
  if (sections.length > 0 && sections.every(s => s.status === 'accepted')) return 'approved';
  return 'in-review';
}

/**
 * Build the feedback digest the engineers act on: every section that needs
 * changes or carries unresolved comments, with the comments anchored to it.
 */
export function aggregateFeedback(plan: Plan): { status: PlanStatus; digest: string; actionable: number } {
  const bySection = new Map<string, PlanComment[]>();
  for (const c of plan.comments) {
    if (c.resolved) continue;
    const arr = bySection.get(c.sectionId) ?? [];
    arr.push(c); bySection.set(c.sectionId, arr);
  }
  const lines: string[] = [`Plan: ${plan.title} — ${planStatus(plan.sections).toUpperCase()}`];
  let actionable = 0;
  for (const s of plan.sections) {
    const cs = bySection.get(s.id) ?? [];
    if (s.status === 'needs-changes' || cs.length) {
      actionable++;
      lines.push(`\n### ${s.heading} [${s.status}]`);
      for (const c of cs) lines.push(`  • (${c.author}) ${c.text}`);
      if (s.status === 'needs-changes' && !cs.length) lines.push('  • marked needs-changes (no note)');
    }
  }
  if (actionable === 0) lines.push('\nNo open comments — all sections accepted.');
  return { status: planStatus(plan.sections), digest: lines.join('\n'), actionable };
}

// ── Store + routes ──────────────────────────────────────────────────────────

const STORE = path.join(__dirname, '..', '..', 'data', 'plans.json');
let plans: Plan[] = [];

function load() {
  try { plans = JSON.parse(fs.readFileSync(STORE, 'utf8')).plans || []; } catch { plans = []; }
}
function save() {
  try { fs.mkdirSync(path.dirname(STORE), { recursive: true }); fs.writeFileSync(STORE, JSON.stringify({ plans }, null, 2)); }
  catch { /* best-effort */ }
}
// Monotonic-ish id without Date.now coupling in tests of the pure helpers.
let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function createPlan(input: { title: string; author?: string; model?: string; markdown?: string; sections?: PlanSection[] }): Plan {
  const sections = input.sections?.length ? input.sections : splitMarkdownIntoSections(input.markdown || '');
  const plan: Plan = {
    id: uid('plan'),
    title: input.title || 'Untitled plan',
    author: input.author || 'Coordinator',
    model: input.model,
    createdAt: new Date().toISOString(),
    sections,
    comments: [],
  };
  plans.unshift(plan);
  save();
  return plan;
}

/** Register the plan-review HTTP surface on the app. One call from index.ts. */
export function registerPlanRoutes(app: Express): void {
  load();

  app.get('/api/plans', (_req, res) => {
    res.json({ success: true, plans: plans.map(p => ({
      id: p.id, title: p.title, author: p.author, model: p.model, createdAt: p.createdAt,
      sections: p.sections.length, openComments: p.comments.filter(c => !c.resolved).length,
      status: planStatus(p.sections),
    })) });
  });

  app.get('/api/plans/:id', (req, res) => {
    const p = plans.find(x => x.id === req.params.id);
    if (!p) { res.status(404).json({ success: false, error: 'plan not found' }); return; }
    res.json({ success: true, plan: p, status: planStatus(p.sections) });
  });

  app.post('/api/plans', (req, res) => {
    const b = req.body || {};
    if (!b.title || (!b.markdown && !Array.isArray(b.sections))) {
      res.status(400).json({ success: false, error: 'title and (markdown or sections) required' }); return;
    }
    res.json({ success: true, plan: createPlan(b) });
  });

  app.post('/api/plans/:id/comments', (req, res) => {
    const p = plans.find(x => x.id === req.params.id);
    if (!p) { res.status(404).json({ success: false, error: 'plan not found' }); return; }
    const { sectionId, author, text } = req.body || {};
    if (!sectionId || !text) { res.status(400).json({ success: false, error: 'sectionId and text required' }); return; }
    if (!p.sections.some(s => s.id === sectionId)) { res.status(400).json({ success: false, error: 'unknown sectionId' }); return; }
    const c: PlanComment = { id: uid('c'), sectionId, author: author || 'Operator', text, createdAt: new Date().toISOString(), resolved: false };
    p.comments.push(c); save();
    res.json({ success: true, comment: c });
  });

  app.post('/api/plans/:id/comments/:cid/resolve', (req, res) => {
    const p = plans.find(x => x.id === req.params.id);
    if (!p) { res.status(404).json({ success: false, error: 'plan not found' }); return; }
    const c = p.comments.find(x => x.id === req.params.cid);
    if (!c) { res.status(404).json({ success: false, error: 'comment not found' }); return; }
    c.resolved = true; save();
    res.json({ success: true, comment: c });
  });

  app.post('/api/plans/:id/sections/:sid/status', (req, res) => {
    const p = plans.find(x => x.id === req.params.id);
    if (!p) { res.status(404).json({ success: false, error: 'plan not found' }); return; }
    const s = p.sections.find(x => x.id === req.params.sid);
    if (!s) { res.status(404).json({ success: false, error: 'section not found' }); return; }
    const status = (req.body || {}).status as SectionStatus;
    if (!['open', 'accepted', 'needs-changes'].includes(status)) { res.status(400).json({ success: false, error: 'status must be open|accepted|needs-changes' }); return; }
    s.status = status; save();
    res.json({ success: true, section: s, planStatus: planStatus(p.sections) });
  });

  app.get('/api/plans/:id/feedback', (req, res) => {
    const p = plans.find(x => x.id === req.params.id);
    if (!p) { res.status(404).json({ success: false, error: 'plan not found' }); return; }
    res.json({ success: true, ...aggregateFeedback(p) });
  });

  // Relay the section-anchored feedback to the agents via the cross-team forum.
  app.post('/api/plans/:id/relay', async (req, res) => {
    const p = plans.find(x => x.id === req.params.id);
    if (!p) { res.status(404).json({ success: false, error: 'plan not found' }); return; }
    const fb = aggregateFeedback(p);
    let relayed = false;
    try {
      const r = await fetch('http://localhost:' + (process.env.PORT || '3100') + '/api/forum/cross/thread', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Plan feedback: ${p.title} — ${fb.status}`, body: fb.digest, author: 'Coordinator' }),
      });
      relayed = r.ok;
    } catch { /* forum may be unavailable */ }
    res.json({ success: true, relayed, ...fb });
  });
}

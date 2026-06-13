/**
 * Requirements register — USDP use-case-driven requirements with traceability to
 * the implementation. See ./traceability for the pure rules.
 *
 *  GET  /api/requirements                 list
 *  POST /api/requirements                 create
 *  GET  /api/requirements/:id             one
 *  PUT  /api/requirements/:id             update (re-derives status)
 *  POST /api/requirements/:id/trace       add a feature/commit/test trace
 *  GET  /api/requirements/traceability    coverage + verification report
 */
import type { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import {
  Requirement, validateRequirement, traceabilityReport, deriveStatus, Trace,
} from './traceability';

const STORE = path.join(__dirname, '..', '..', 'data', 'requirements.json');
let reqs: Requirement[] = [];
let loaded = false;
function load() { try { reqs = JSON.parse(fs.readFileSync(STORE, 'utf8')).requirements || []; } catch { reqs = []; } loaded = true; }
function save() { try { fs.mkdirSync(path.dirname(STORE), { recursive: true }); fs.writeFileSync(STORE, JSON.stringify({ requirements: reqs }, null, 2)); } catch { /* best-effort */ } }
let seq = 0;
const uid = () => `req-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function registerRequirementRoutes(app: Express): void {
  if (!loaded) load();

  app.get('/api/requirements', (_req, res) => {
    res.json({ success: true, requirements: reqs.map(r => ({ id: r.id, title: r.title, type: r.type, priority: r.priority, status: r.status, traces: r.traces.length, backlogRef: r.backlogRef })) });
  });

  app.get('/api/requirements/traceability', (_req, res) => {
    res.json({ success: true, ...traceabilityReport(reqs) });
  });

  app.get('/api/requirements/:id', (req, res) => {
    const r = reqs.find(x => x.id === req.params.id);
    if (!r) { res.status(404).json({ success: false, error: 'requirement not found' }); return; }
    res.json({ success: true, requirement: r });
  });

  app.post('/api/requirements', (req, res) => {
    const b = req.body || {};
    const v = validateRequirement(b);
    if (!v.ok) { res.status(400).json({ success: false, errors: v.errors }); return; }
    const now = new Date().toISOString();
    const r: Requirement = {
      id: uid(), backlogRef: b.backlogRef, title: b.title, type: b.type, useCase: b.useCase,
      acceptance: Array.isArray(b.acceptance) ? b.acceptance : [], priority: b.priority || 'medium',
      status: b.status || 'proposed', owner: b.owner, traces: [], createdAt: now, updatedAt: now,
    };
    reqs.unshift(r); save();
    res.json({ success: true, requirement: r });
  });

  app.put('/api/requirements/:id', (req, res) => {
    const i = reqs.findIndex(x => x.id === req.params.id);
    if (i < 0) { res.status(404).json({ success: false, error: 'requirement not found' }); return; }
    const b = req.body || {};
    const merged = { ...reqs[i], ...b, id: reqs[i].id, traces: reqs[i].traces, updatedAt: new Date().toISOString() };
    const v = validateRequirement(merged);
    if (!v.ok) { res.status(400).json({ success: false, errors: v.errors }); return; }
    merged.status = b.status === 'rejected' ? 'rejected' : deriveStatus(merged);
    reqs[i] = merged; save();
    res.json({ success: true, requirement: merged });
  });

  app.post('/api/requirements/:id/trace', (req, res) => {
    const r = reqs.find(x => x.id === req.params.id);
    if (!r) { res.status(404).json({ success: false, error: 'requirement not found' }); return; }
    const { kind, ref } = req.body || {};
    if (!['feature', 'commit', 'test'].includes(kind) || !ref) { res.status(400).json({ success: false, error: 'kind (feature|commit|test) + ref required' }); return; }
    if (!r.traces.some(t => t.kind === kind && t.ref === ref)) r.traces.push({ kind, ref } as Trace);
    r.status = deriveStatus(r);
    r.updatedAt = new Date().toISOString();
    save();
    res.json({ success: true, requirement: r });
  });
}

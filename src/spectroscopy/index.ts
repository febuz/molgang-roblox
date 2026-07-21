/**
 * Spectroscopy ingest — accept REAL spectra (IR / UV-Vis / NMR / MS), detect
 * peaks, and persist a reproducible analysis run with provenance. Engel-grade
 * processing payload from docs/CAPABILITY-CHARTER.md §3.
 *
 *  POST /api/spectroscopy/analyze  {y[], x?[], technique?, sample?, units?}
 *       → peak summary (does not persist)
 *  POST /api/spectroscopy/ingest   same body, persists a run + returns its id
 *  GET  /api/spectroscopy/runs     list stored runs (summaries)
 *  GET  /api/spectroscopy/runs/:id one run
 */
import type { Express } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { summarizeSpectrum, PeakOptions, SpectrumSummary } from './peak-detection';

export interface SpectrumRun {
  id: string;
  technique?: string;   // 'IR' | 'UV-Vis' | 'NMR' | 'MS' | ...
  sample?: string;
  units?: string;       // axis units, e.g. 'cm^-1', 'nm', 'ppm', 'm/z'
  createdAt: string;
  summary: SpectrumSummary;
}

const STORE = path.join(__dirname, '..', '..', 'data', 'spectra.json');
let runs: SpectrumRun[] = [];
let loaded = false;
function load() { try { runs = JSON.parse(fs.readFileSync(STORE, 'utf8')).runs || []; } catch { runs = []; } loaded = true; }
function save() { try { fs.mkdirSync(path.dirname(STORE), { recursive: true }); fs.writeFileSync(STORE, JSON.stringify({ runs }, null, 2)); } catch { /* best-effort */ } }
let seq = 0;
const uid = () => `spec-${Date.now().toString(36)}-${(seq++).toString(36)}`;

function parseBody(b: any): { y: number[]; x?: number[]; opts: PeakOptions } | null {
  const y = b && Array.isArray(b.y) ? b.y.map(Number).filter((n: number) => !isNaN(n)) : null;
  if (!y || y.length < 3) return null;
  const x = Array.isArray(b.x) ? b.x.map(Number) : undefined;
  const opts: PeakOptions = {};
  if (typeof b.k === 'number') opts.k = b.k;
  if (typeof b.threshold === 'number') opts.threshold = b.threshold;
  if (typeof b.minProminence === 'number') opts.minProminence = b.minProminence;
  if (typeof b.minDistance === 'number') opts.minDistance = b.minDistance;
  return { y, x, opts };
}

export function registerSpectroscopyRoutes(app: Express): void {
  if (!loaded) load();

  app.post('/api/spectroscopy/analyze', (req, res) => {
    const p = parseBody(req.body || {});
    if (!p) { res.status(400).json({ success: false, error: 'y[] with >=3 numeric points required' }); return; }
    res.json({ success: true, summary: summarizeSpectrum(p.y, p.opts, p.x) });
  });

  app.post('/api/spectroscopy/ingest', (req, res) => {
    const b = req.body || {};
    const p = parseBody(b);
    if (!p) { res.status(400).json({ success: false, error: 'y[] with >=3 numeric points required' }); return; }
    const run: SpectrumRun = {
      id: uid(), technique: b.technique, sample: b.sample, units: b.units,
      createdAt: new Date().toISOString(), summary: summarizeSpectrum(p.y, p.opts, p.x),
    };
    runs.unshift(run); save();
    res.json({ success: true, run });
  });

  app.get('/api/spectroscopy/runs', (_req, res) => {
    res.json({ success: true, runs: runs.map(r => ({ id: r.id, technique: r.technique, sample: r.sample, units: r.units, createdAt: r.createdAt, peaks: r.summary.peaks.length })) });
  });

  app.get('/api/spectroscopy/runs/:id', (req, res) => {
    const r = runs.find(x => x.id === req.params.id);
    if (!r) { res.status(404).json({ success: false, error: 'run not found' }); return; }
    res.json({ success: true, run: r });
  });
}

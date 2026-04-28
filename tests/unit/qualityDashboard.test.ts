import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('QualityDashboard', () => {
  let tmpDir: string;
  let prevEnv: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-'));
    prevEnv = process.env.QA_REPORT_DIR;
    process.env.QA_REPORT_DIR = tmpDir;
    // Re-import the module so it picks up the new env var.
    jest.resetModules();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (prevEnv !== undefined) {
      process.env.QA_REPORT_DIR = prevEnv;
    } else {
      delete process.env.QA_REPORT_DIR;
    }
  });

  function writeReport(name: string, payload: unknown) {
    fs.writeFileSync(path.join(tmpDir, name), JSON.stringify(payload));
  }

  function load() {
    // require fresh inside the test so the env-var-derived constant is
    // evaluated against tmpDir and not the default path.
    const { QualityDashboard } = require('../../src/quality/qualityDashboard');
    return new QualityDashboard();
  }

  it('reports all-missing as a low-severity threat and a perfect score', async () => {
    const dash = load();
    const snap = await dash.snapshot();
    expect(snap.score).toBe(100);
    expect(snap.grade).toBe('A');
    const threat = snap.threats.find((t: any) => t.category === 'qa_reports_missing');
    expect(threat).toBeDefined();
    expect(threat!.details!.missing.length).toBe(4);
  });

  it('drops the score and lifts a high-severity threat on cheat-surface hits', async () => {
    writeReport('cheat_surface.json', { hits: [{}, {}, {}, {}], count: 4 });
    const dash = load();
    const snap = await dash.snapshot();
    expect(snap.score).toBeLessThan(100);
    const t = snap.threats.find((x: any) => x.category === 'cheat_surface');
    expect(t).toBeDefined();
    expect(t!.level).toBe('high');
    expect(t!.details!.count).toBe(4);
  });

  it('reads perceptual + asset + audio fail counts and aggregates threats', async () => {
    writeReport('cheat_surface.json', { hits: [], count: 0 });
    writeReport('perceptual_diff.json', { pass: 5, warn: 2, fail: 3, n: 10 });
    writeReport('asset_validator.json', { pass: 40, warn: 3, fail: 5, skip: 0, error: 0, n: 48 });
    writeReport('audio_validator.json', { pass: 8, warn: 1, fail: 1, error: 0, n: 10 });
    const dash = load();
    const snap = await dash.snapshot();
    expect(snap.signals.cheat_surface_hits).toBe(0);
    expect(snap.signals.perceptual_fail).toBe(3);
    expect(snap.signals.asset_fail).toBe(5);
    expect(snap.signals.audio_fail).toBe(1);
    const cats = snap.threats.map((t: any) => t.category);
    expect(cats).toEqual(expect.arrayContaining(['perceptual_regression', 'asset_budget', 'audio_loudness']));
    expect(cats).not.toContain('cheat_surface');
  });

  it('exposes the report mtimes when present', async () => {
    writeReport('cheat_surface.json', { hits: [], count: 0 });
    const dash = load();
    const snap = await dash.snapshot();
    expect(snap.reports.cheat_surface.present).toBe(true);
    expect(snap.reports.cheat_surface.mtime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(snap.reports.perceptual.present).toBe(false);
  });

  it('grade tracks score: cheat-surface hits + perceptual fails → low grade', async () => {
    writeReport('cheat_surface.json', { hits: [{}, {}, {}, {}, {}, {}], count: 6 });
    writeReport('perceptual_diff.json', { pass: 0, warn: 0, fail: 8, n: 8 });
    writeReport('asset_validator.json', { pass: 0, warn: 0, fail: 6, skip: 0, error: 0, n: 6 });
    writeReport('audio_validator.json', { pass: 0, warn: 0, fail: 6, error: 0, n: 6 });
    const dash = load();
    const snap = await dash.snapshot();
    expect(snap.score).toBeLessThan(40);
    expect(['D', 'F']).toContain(snap.grade);
  });
});

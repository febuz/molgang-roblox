/**
 * Quality Dashboard
 *
 * Surfaces the latest results of the four QA gate tools defined in
 * molgang-roblox/docs/QUALITY_STANDARDS.md so the CEO panel can see
 * code/asset/audio/screenshot health in one shape.
 *
 * Each tool writes its JSON report to a known location (configurable via
 * env vars; defaults below). This service reads whichever files exist
 * at request time and stitches them into a single snapshot.
 *
 * Sister to SecurityDashboard — same shape conventions (score 0-100,
 * letter grade, signals object, threats array).
 */

import { promises as fs } from 'fs';
import path from 'path';
import logger from '../utils/logger';

export interface QualityThreat {
  level: 'low' | 'medium' | 'high';
  category: string;
  message: string;
  details?: Record<string, any>;
}

export interface QualityDashboardSnapshot {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  computed_at: string;
  signals: {
    cheat_surface_hits: number | null;
    perceptual_fail: number | null;
    perceptual_warn: number | null;
    asset_fail: number | null;
    asset_warn: number | null;
    audio_fail: number | null;
    audio_warn: number | null;
  };
  threats: QualityThreat[];
  reports: {
    cheat_surface: { path: string; present: boolean; mtime?: string };
    perceptual: { path: string; present: boolean; mtime?: string };
    assets: { path: string; present: boolean; mtime?: string };
    audio: { path: string; present: boolean; mtime?: string };
  };
}

const REPORT_BASE = process.env.QA_REPORT_DIR || '/home/knight2/molgang-roblox/build/qa';
const REPORT_PATHS = {
  cheat_surface: path.join(REPORT_BASE, 'cheat_surface.json'),
  perceptual:    path.join(REPORT_BASE, 'perceptual_diff.json'),
  assets:        path.join(REPORT_BASE, 'asset_validator.json'),
  audio:         path.join(REPORT_BASE, 'audio_validator.json'),
};

async function readJsonIfExists(p: string): Promise<{ ok: boolean; data?: any; mtime?: string }> {
  try {
    const stat = await fs.stat(p);
    const text = await fs.readFile(p, 'utf-8');
    return { ok: true, data: JSON.parse(text), mtime: stat.mtime.toISOString() };
  } catch {
    return { ok: false };
  }
}

function gradeFromScore(score: number): QualityDashboardSnapshot['grade'] {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export class QualityDashboard {
  async snapshot(): Promise<QualityDashboardSnapshot> {
    const [cheat, perceptual, assets, audio] = await Promise.all([
      readJsonIfExists(REPORT_PATHS.cheat_surface),
      readJsonIfExists(REPORT_PATHS.perceptual),
      readJsonIfExists(REPORT_PATHS.assets),
      readJsonIfExists(REPORT_PATHS.audio),
    ]);

    // The cheat-surface tool emits {hits: [...], count: N}.
    const cheatHits = cheat.ok && Array.isArray(cheat.data?.hits) ? cheat.data.hits.length : null;

    // perceptual_diff.py emits {pass, warn, fail, n, shots: [...]}.
    const perFail = perceptual.ok ? (perceptual.data?.fail ?? null) : null;
    const perWarn = perceptual.ok ? (perceptual.data?.warn ?? null) : null;

    // asset_validator.py emits {pass, warn, fail, skip, error, n, rows: [...]}.
    const assetFail = assets.ok ? (assets.data?.fail ?? null) : null;
    const assetWarn = assets.ok ? (assets.data?.warn ?? null) : null;

    // audio_validator.py emits the same {pass, warn, fail, error, n, rows}.
    const audioFail = audio.ok ? (audio.data?.fail ?? null) : null;
    const audioWarn = audio.ok ? (audio.data?.warn ?? null) : null;

    // Score: start at 100, deduct per signal. Any present-and-failing
    // gate hits hard; warns hit half. Missing reports don't deduct
    // (we can't fail a player for a tool that hasn't run yet) but they
    // do show up in `threats`.
    let score = 100;
    if (cheatHits !== null && cheatHits > 0) score -= Math.min(40, cheatHits * 10);
    if (perFail !== null && perFail > 0)     score -= Math.min(30, perFail * 5);
    if (perWarn !== null && perWarn > 0)     score -= Math.min(10, perWarn * 1);
    if (assetFail !== null && assetFail > 0) score -= Math.min(20, assetFail * 4);
    if (audioFail !== null && audioFail > 0) score -= Math.min(20, audioFail * 4);
    score = Math.max(0, Math.min(100, score));

    const threats: QualityThreat[] = [];
    if (cheatHits !== null && cheatHits > 0) {
      threats.push({
        level: cheatHits >= 3 ? 'high' : 'medium',
        category: 'cheat_surface',
        message: `${cheatHits} unsuppressed client-side currency/inventory write(s)`,
        details: { count: cheatHits },
      });
    }
    if (perFail !== null && perFail > 0) {
      threats.push({
        level: perFail >= 3 ? 'high' : 'medium',
        category: 'perceptual_regression',
        message: `${perFail} screenshot(s) failed SSIM/PSNR floor`,
        details: { fail: perFail, warn: perWarn ?? 0 },
      });
    }
    if (assetFail !== null && assetFail > 0) {
      threats.push({
        level: assetFail >= 3 ? 'high' : 'medium',
        category: 'asset_budget',
        message: `${assetFail} 3D asset(s) over poly/material budget`,
        details: { fail: assetFail, warn: assetWarn ?? 0 },
      });
    }
    if (audioFail !== null && audioFail > 0) {
      threats.push({
        level: audioFail >= 3 ? 'high' : 'medium',
        category: 'audio_loudness',
        message: `${audioFail} audio file(s) outside LUFS / true-peak budget`,
        details: { fail: audioFail, warn: audioWarn ?? 0 },
      });
    }

    // Missing reports — informational, not score-deducting.
    const missing: string[] = [];
    if (!cheat.ok)      missing.push('cheat_surface');
    if (!perceptual.ok) missing.push('perceptual');
    if (!assets.ok)     missing.push('assets');
    if (!audio.ok)      missing.push('audio');
    if (missing.length > 0) {
      threats.push({
        level: missing.length >= 3 ? 'medium' : 'low',
        category: 'qa_reports_missing',
        message: `Quality reports never generated for: ${missing.join(', ')}`,
        details: { missing, expected_dir: REPORT_BASE },
      });
    }

    return {
      score: Math.round(score * 10) / 10,
      grade: gradeFromScore(score),
      computed_at: new Date().toISOString(),
      signals: {
        cheat_surface_hits: cheatHits,
        perceptual_fail: perFail,
        perceptual_warn: perWarn,
        asset_fail: assetFail,
        asset_warn: assetWarn,
        audio_fail: audioFail,
        audio_warn: audioWarn,
      },
      threats,
      reports: {
        cheat_surface: { path: REPORT_PATHS.cheat_surface, present: cheat.ok, mtime: cheat.mtime },
        perceptual:    { path: REPORT_PATHS.perceptual,    present: perceptual.ok, mtime: perceptual.mtime },
        assets:        { path: REPORT_PATHS.assets,        present: assets.ok, mtime: assets.mtime },
        audio:         { path: REPORT_PATHS.audio,         present: audio.ok, mtime: audio.mtime },
      },
    };
  }
}

export default QualityDashboard;

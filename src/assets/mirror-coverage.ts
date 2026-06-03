/**
 * Asset mirror-coverage analyzer — the remediation planner for the cross-platform
 * (Roblox ↔ Web ↔ VR/AR) asset pipeline.
 *
 * The coordination run found 48 Roblox 3D-models + 48 textures with 0 web
 * mirrors, and 96 "orphans". Rather than fabricate web entries (that would be
 * mock data), this computes — from the REAL registry — which Roblox assets have
 * no web counterpart and emits a remediation manifest the designers act on:
 * exactly what to convert, and to which target format.
 *
 * Pure (no I/O); the route feeds it the live asset list.
 */

export interface Asset {
  id: string;
  origin: string;     // 'roblox' | 'web' | 'vr' | ...
  path: string;
  category: string;   // '3d-model' | 'texture' | ...
  ext?: string;
  size_bytes?: number;
}

/** Web target format per source category (what a mirror should be converted to). */
const WEB_TARGET: Record<string, string> = {
  '3d-model': '.glb',
  texture: '.webp',
  audio: '.ogg',
};

/** basename without extension, lower-cased — the cross-origin match key. */
export function stem(p: string): string {
  const base = (p || '').split('/').pop() || '';
  return base.replace(/\.[^.]+$/, '').toLowerCase();
}

export interface CategoryCoverage {
  category: string;
  roblox: number;
  web: number;
  mirrored: number;       // stems present on BOTH roblox and web
  unmirrored: number;     // roblox stems with no web counterpart
  coveragePct: number;    // mirrored / roblox
}

export interface RemediationItem {
  id: string;
  stem: string;
  category: string;
  sourcePath: string;
  targetExt: string;      // what to convert it to for web
}

export interface MirrorCoverageReport {
  totalAssets: number;
  byCategory: CategoryCoverage[];
  /** Roblox assets needing a web mirror — the designers' work list. */
  remediation: RemediationItem[];
  /** Overall web mirror coverage across mirrorable (roblox) assets. */
  overallCoveragePct: number;
}

export function analyzeMirrorCoverage(assets: Asset[]): MirrorCoverageReport {
  const list = Array.isArray(assets) ? assets : [];
  // Index web stems per category for O(1) counterpart lookup.
  const webStems = new Map<string, Set<string>>(); // category -> set(stem)
  for (const a of list) {
    if (a.origin === 'web') {
      const s = webStems.get(a.category) ?? new Set<string>();
      s.add(stem(a.path)); webStems.set(a.category, s);
    }
  }

  const catAgg = new Map<string, { roblox: number; web: number; mirrored: number; unmirrored: number }>();
  const remediation: RemediationItem[] = [];

  for (const a of list) {
    const agg = catAgg.get(a.category) ?? { roblox: 0, web: 0, mirrored: 0, unmirrored: 0 };
    if (a.origin === 'web') { agg.web++; }
    else if (a.origin === 'roblox') {
      agg.roblox++;
      const hasWeb = webStems.get(a.category)?.has(stem(a.path));
      if (hasWeb) agg.mirrored++;
      else {
        agg.unmirrored++;
        remediation.push({ id: a.id, stem: stem(a.path), category: a.category, sourcePath: a.path, targetExt: WEB_TARGET[a.category] || '.bin' });
      }
    }
    catAgg.set(a.category, agg);
  }

  const byCategory: CategoryCoverage[] = Array.from(catAgg.entries()).map(([category, v]) => ({
    category, roblox: v.roblox, web: v.web, mirrored: v.mirrored, unmirrored: v.unmirrored,
    coveragePct: v.roblox ? Math.round((v.mirrored / v.roblox) * 100) : 100,
  })).sort((a, b) => a.coveragePct - b.coveragePct);

  const totalRoblox = byCategory.reduce((a, c) => a + c.roblox, 0);
  const totalMirrored = byCategory.reduce((a, c) => a + c.mirrored, 0);

  return {
    totalAssets: list.length,
    byCategory,
    remediation,
    overallCoveragePct: totalRoblox ? Math.round((totalMirrored / totalRoblox) * 100) : 100,
  };
}

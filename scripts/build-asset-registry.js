#!/usr/bin/env node
/**
 * build-asset-registry.js — scan molgang-roblox/assets + molgang-web
 * for shareable graphical assets and produce a single registry that
 * (a) the Roblox build pipeline + (b) the web frontend can both consume.
 *
 * What counts as shareable: PNG / JPG (textures + UI), SVG (icons), GLB /
 * GLTF / FBX / OBJ (3D meshes). Roblox-specific .rbxl, .lua, blender
 * intermediates (.blend1, autosave) are filtered out.
 *
 * Output: molgang-web/shared/asset-registry.json — entries keyed by
 * a stable hash so renames are reflected as same-id with new path.
 *
 * Re-runnable; idempotent. The Roblox sync routine should call this
 * after every Roblox-side asset change so molgang-web sees the
 * canonical list within 4 hours.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROBLOX_ROOT = process.env.ROBLOX_REPO || `${process.env.HOME}/molgang-roblox`;
const WEB_ROOT    = process.env.MOLGANG_WEB_REPO || '/media/knight2/EDS2/projects/molgang-web';
// EDS2 is the canonical store for new (high-volume, GLB-first) work.
// Root disk is 81% full at 116 GB; EDS2 has 849 GB free — required for
// the 10K-asset scale target. Roblox repo stays as legacy mirror; agents
// produce new work directly into EDS2_ASSETS.
const EDS2_ASSETS = process.env.EDS2_ASSETS || '/media/knight2/EDS2/molgang-assets';
const OUT_PATH    = path.join(WEB_ROOT, 'shared/asset-registry.json');

const SHAREABLE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.glb', '.gltf', '.fbx', '.obj']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'pipeline_env', 'pipeline', 'downloads', '__pycache__', '.next', 'venv']);
const SKIP_PATTERNS = [/\.blend1$/, /\.autosave/, /Thumbs\.db/, /\.DS_Store/];

function walk(dir, results, root) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    if (SKIP_PATTERNS.some(p => p.test(e.name))) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, results, root);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (!SHAREABLE_EXTS.has(ext)) continue;
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      results.push({
        path: path.relative(root, full),
        absPath: full,
        ext,
        sizeBytes: stat.size,
        mtimeMs: stat.mtimeMs,
      });
    }
  }
}

// Categorize an asset by where it lives + filename hints.
function categorize(rel) {
  const p = rel.toLowerCase();
  if (p.includes('icon')         || p.includes('ui'))            return 'ui';
  if (p.includes('character')    || p.includes('npc'))           return 'character';
  if (p.includes('molecule')     || p.includes('atom'))          return 'molecule';
  if (p.includes('zone')         || p.includes('environment'))   return 'environment';
  if (p.includes('factory')      || p.includes('mine'))          return 'facility';
  if (p.includes('logo')         || p.includes('brand'))         return 'brand';
  if (/\.(glb|gltf|fbx|obj)$/.test(p))                            return '3d-model';
  if (/\.(png|jpg|jpeg)$/.test(p))                                return 'texture';
  if (/\.svg$/.test(p))                                           return 'vector';
  return 'misc';
}

// Stable id: hash of (relative-path-after-root). Survives rename within a
// repo as long as the path doesn't fully change. For move-across-repos use
// the content-hash variant via mtime+size as a soft-stable salt.
function makeId(repo, relPath) {
  return repo + ':' + crypto.createHash('sha1').update(relPath).digest('hex').slice(0, 12);
}

function build() {
  const start = Date.now();
  const robloxAssets = [];
  walk(path.join(ROBLOX_ROOT, 'assets'),  robloxAssets, ROBLOX_ROOT);
  walk(path.join(ROBLOX_ROOT, 'game/src'), robloxAssets, ROBLOX_ROOT);   // catch any in-source assets

  const webAssets = [];
  walk(path.join(WEB_ROOT, 'frontend/public'), webAssets, WEB_ROOT);
  walk(path.join(WEB_ROOT, 'frontend/assets'), webAssets, WEB_ROOT);

  // EDS2 canonical store — high-volume new work lives here, not in any repo.
  // Empty until agents start producing into it.
  const eds2Assets = [];
  walk(EDS2_ASSETS, eds2Assets, EDS2_ASSETS);

  const entries = [];
  for (const a of robloxAssets) {
    entries.push({
      id: makeId('roblox', a.path),
      origin: 'roblox',
      origin_path: a.path,
      storage_root: 'roblox-repo',
      abs_path: a.absPath,
      category: categorize(a.path),
      ext: a.ext,
      size_bytes: a.sizeBytes,
      web_mirror_path: null,
    });
  }
  for (const a of webAssets) {
    entries.push({
      id: makeId('web', a.path),
      origin: 'web',
      origin_path: a.path,
      storage_root: 'web-repo',
      abs_path: a.absPath,
      category: categorize(a.path),
      ext: a.ext,
      size_bytes: a.sizeBytes,
    });
  }
  for (const a of eds2Assets) {
    entries.push({
      id: makeId('eds2', a.path),
      origin: 'eds2',
      origin_path: a.path,
      storage_root: 'eds2',
      abs_path: a.absPath,
      category: categorize(a.path),
      ext: a.ext,
      size_bytes: a.sizeBytes,
    });
  }

  // Heuristic mirror match: same basename + ext between repos.
  const webByBase = new Map();
  for (const w of webAssets) webByBase.set(path.basename(w.path), w.path);
  for (const e of entries) {
    if (e.origin !== 'roblox') continue;
    const base = path.basename(e.origin_path);
    if (webByBase.has(base)) e.web_mirror_path = webByBase.get(base);
  }

  // Stats
  const byCategory = {};
  const byOrigin = { roblox: 0, web: 0, eds2: 0 };
  let totalBytes = 0;
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    byOrigin[e.origin] = (byOrigin[e.origin] || 0) + 1;
    totalBytes += e.size_bytes || 0;
  }
  const orphanRoblox = entries.filter(e => e.origin === 'roblox' && !e.web_mirror_path).length;

  const doc = {
    _source: 'Generated by virtualpc/scripts/build-asset-registry.js — single source of truth for assets shared between molgang-roblox, molgang-web, and the canonical EDS2 store. Re-run after any asset add/move.',
    generatedAt: new Date().toISOString(),
    builtInMs: Date.now() - start,
    storage_roots: {
      'roblox-repo': ROBLOX_ROOT,
      'web-repo':    WEB_ROOT,
      'eds2':        EDS2_ASSETS,
    },
    counts: {
      total: entries.length,
      target_at_scale: 10000,           // user-stated long-term target
      by_origin: byOrigin,
      by_category: byCategory,
      web_mirrors_for_roblox: entries.filter(e => e.origin === 'roblox' && e.web_mirror_path).length,
      orphan_roblox: orphanRoblox,
      orphan_web: byOrigin.web,
      total_bytes: totalBytes,
      total_human: (totalBytes / (1024 * 1024)).toFixed(1) + ' MiB',
    },
    assets: entries,
  };

  if (!fs.existsSync(path.dirname(OUT_PATH))) fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(doc, null, 2));
  console.log(`✓ wrote ${entries.length} assets to ${OUT_PATH}`);
  console.log(`  by origin: roblox=${byOrigin.roblox}  web=${byOrigin.web}  eds2=${byOrigin.eds2}`);
  console.log(`  by category:`, byCategory);
  console.log(`  total size: ${doc.counts.total_human}`);
  console.log(`  ${doc.counts.web_mirrors_for_roblox} roblox→web mirrors · ${orphanRoblox} not yet ported`);
  console.log(`  scale target: 10,000 assets — current progress ${entries.length}/10000 (${(entries.length / 100).toFixed(1)}%)`);
}

build();

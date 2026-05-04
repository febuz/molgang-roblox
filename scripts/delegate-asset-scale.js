#!/usr/bin/env node
/**
 * delegate-asset-scale.js — push ~50 concrete asset-pipeline tasks
 * into virtualpc's task engine, distributed across the 14-agent roster.
 *
 * Source of truth: molgang-web/backlog/MOLGANG-009-Scale-Plan.md.
 *
 * Each task targets a specific (category × subject × variant) so agents
 * have parallelizable, granular work. Re-runnable; the engine has no
 * dedupe so a re-push creates parallel tasks (rerun only when intentional).
 */

const http = require('http');

const VIRTUALPC = process.env.VIRTUALPC_URL || 'http://127.0.0.1:3100';

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, VIRTUALPC);
    const data = JSON.stringify(body);
    const req = http.request(
      { host: u.hostname, port: u.port, path: u.pathname, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => { let buf = ''; res.on('data', c => buf += c); res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch (e) { reject(new Error('bad json: ' + buf.slice(0, 200))); }
      });});
    req.on('error', reject);
    req.write(data); req.end();
  });
}

const SPRINT = 'asset-scale-10k';

// Per-agent task templates — concrete (category × subject × variant).
const TASKS = [
  // ─── MIRA — character + brand + UI (10 tasks) ─────────────────────────
  { agent: 'Mira', priority: 'high',     title: 'Character GLB: Dr. Femke (chemistry NPC)',
    description: 'Create Mixamo-rigged character GLB for Dr. Femke. Idle + walk + talk states baked in. Output to /media/knight2/EDS2/molgang-assets/staging/, then move to models/ after self-QA. Update registry.',
    estimated_hours: 8 },
  { agent: 'Mira', priority: 'high',     title: 'Character GLB: Farmer Chen',
    description: 'Same pipeline as Dr. Femke. Outfit variant (rural).',
    estimated_hours: 8 },
  { agent: 'Mira', priority: 'high',     title: 'Character GLB: Vanadis',
    description: 'Mythic NPC. Cape physics-rigged for three.js consumer.',
    estimated_hours: 8 },
  { agent: 'Mira', priority: 'high',     title: 'Character GLB: Kwantje',
    description: 'Tech-savvy NPC. Lab coat with logo decal.',
    estimated_hours: 8 },
  { agent: 'Mira', priority: 'high',     title: 'Player avatar GLB (3 body presets)',
    description: 'Default player rig with 3 body presets + 5 outfit slots. Drop-in compatible with three.js.',
    estimated_hours: 12 },
  { agent: 'Mira', priority: 'medium',   title: 'Brand kit: logo SVGs (4 variants)',
    description: 'Primary, secondary, monochrome, social-icon variants. Output to brand/ subdir.',
    estimated_hours: 4 },
  { agent: 'Mira', priority: 'medium',   title: 'UI icon set: 24 chemistry-action icons',
    description: 'Add atom, react, distill, mine, build, trade, settings, profile, etc. SVG + PNG @1×/2×/3×.',
    estimated_hours: 6 },
  { agent: 'Mira', priority: 'medium',   title: 'Periodic-table card art (118 elements)',
    description: 'Each element gets a stylised card 256×384px. Procedural-source .blend with parameter for atomic number, drives rarity color.',
    estimated_hours: 16 },
  { agent: 'Mira', priority: 'low',      title: 'Brand mood-board upload to reference/',
    description: 'Curate ~50 reference images covering chemistry-game aesthetic. Tag and drop into reference/.',
    estimated_hours: 3 },
  { agent: 'Mira', priority: 'low',      title: 'NPC portrait shots (rendered from char GLBs)',
    description: 'Once 5 char GLBs ship, render 256×256 portrait from each via Blender Cycles. Store in renders/.',
    estimated_hours: 4 },

  // ─── LUNA — textures + LOD + mobile (10 tasks) ────────────────────────
  { agent: 'Luna', priority: 'high',     title: 'Texture batch: 20 PBR materials for facilities',
    description: 'Albedo + normal + roughness + metallic per material. Concrete, brick, steel, copper, plastic, glass — staples for factory/lab. WebP + 1k/2k variants.',
    estimated_hours: 12 },
  { agent: 'Luna', priority: 'high',     title: 'LOD pipeline: 3-level decimation script',
    description: 'Headless Blender script that takes a high-res GLB, outputs lod0/lod1/lod2 (full / 50% / 10% face count). Updates registry with lod_levels field.',
    estimated_hours: 8 },
  { agent: 'Luna', priority: 'high',     title: 'Mobile texture variants (256/512px) for first 100 models',
    description: 'Web on Z Fold + iPhone needs smaller textures. Auto-resize batch.',
    estimated_hours: 6 },
  { agent: 'Luna', priority: 'medium',   title: 'Atom 3D models: H/C/N/O/Na/Cl/Fe (7 GLBs)',
    description: 'Ball-stick atom primitives, color matched to elements.json palette. Used by molecule renderer when bench shows a synthesised molecule.',
    estimated_hours: 4 },
  { agent: 'Luna', priority: 'medium',   title: 'Molecule 3D batch: H2O, CO2, NH3, CH4, NaCl, H2SO4 (6 GLBs)',
    description: 'Pre-baked molecule GLBs from the recipes manifest, so the bench can drop one in instead of computing geometry every render.',
    estimated_hours: 5 },
  { agent: 'Luna', priority: 'medium',   title: 'Procedural .blend source: industrial pipe',
    description: 'Geometry-nodes pipe with parameters (length, diameter, joints). Spits 100+ variants.',
    estimated_hours: 6 },
  { agent: 'Luna', priority: 'medium',   title: 'Procedural .blend source: lab beaker',
    description: 'Variants for size, fill level, label decal. ~50 instances.',
    estimated_hours: 6 },
  { agent: 'Luna', priority: 'low',      title: 'Render farm orchestrator script',
    description: 'CLI that takes a .blend + parameter set + output dir, runs Blender Cycles on dual 3090, deposits GLB+PNG into staging/.',
    estimated_hours: 10 },
  { agent: 'Luna', priority: 'low',      title: 'GPU-symbiosis hook for render farm',
    description: 'Talk to Kai\'s gpu-symbiosis daemon so render-farm yields when LM Studio is hot.',
    estimated_hours: 4 },
  { agent: 'Luna', priority: 'low',      title: 'Texture compression smoke test (KTX2 vs WebP)',
    description: 'Pick first 20 textures, encode in both formats, measure load + render time + visual diff. Recommend default.',
    estimated_hours: 4 },

  // ─── ATLAS — 3D rendering + procedural + realism (10 tasks) ───────────
  { agent: 'Atlas', priority: 'critical', title: 'three.js viewer for /molecule/[name]',
    description: 'Phase-6 entry. Replace SVG ball-and-stick with rotating GLB-loaded scene. Orbit camera, env light, shadow plane. Use the 6-molecule batch from Luna once it lands; fallback to procedural geometry from recipes manifest.',
    estimated_hours: 12 },
  { agent: 'Atlas', priority: 'critical', title: 'three.js scene: factory zone (first walkable area)',
    description: 'Streaming chunk-based scene with 10× factory facility GLBs placed on a grid. Player camera + WASD. Tests the LOD pipeline at small scale before 10K.',
    estimated_hours: 16 },
  { agent: 'Atlas', priority: 'high',    title: 'Procedural .blend source: rocks (10× scale variants)',
    description: 'Geometry-nodes rock generator. Outputs 100 rocks with seed variation. Bake to GLB.',
    estimated_hours: 6 },
  { agent: 'Atlas', priority: 'high',    title: 'Procedural .blend source: trees (oak / pine / cactus)',
    description: '3 species × 30 instances each = 90 GLBs. Foliage cards for performance.',
    estimated_hours: 8 },
  { agent: 'Atlas', priority: 'high',    title: 'Procedural .blend source: chemistry glassware',
    description: 'Beakers, flasks, distillation columns, test tubes. ~80 variants. Used both inside lab + as game props.',
    estimated_hours: 8 },
  { agent: 'Atlas', priority: 'medium',  title: 'VSEPR shape table + dipole arrows in molecule viewer',
    description: 'Tag each recipe with VSEPR geometry (bent / linear / tetrahedral / etc). Dipole arrow computed from atomic-electronegativity diff. Toggle in viewer UI.',
    estimated_hours: 8 },
  { agent: 'Atlas', priority: 'medium',  title: 'AI-mesh pilot: 50 prompts via Meshy.ai',
    description: 'Pick 50 background-prop categories (lab clutter, debris, signage). Send prompts to Meshy. Evaluate quality. Document cost + verdict.',
    estimated_hours: 6 },
  { agent: 'Atlas', priority: 'medium',  title: 'Realism rubric: 5 criteria for "ships to web"',
    description: 'Define vertex budget, texture budget, format, license, naming compliance. Documented as ASSET-RUBRIC.md.',
    estimated_hours: 3 },
  { agent: 'Atlas', priority: 'low',     title: 'Sun + sky env-light setup for outdoor zones',
    description: 'HDRI env map + sun-direction control for time-of-day. One env per zone.',
    estimated_hours: 6 },
  { agent: 'Atlas', priority: 'low',     title: 'Phase-6 design doc (3D engine + map + characters)',
    description: 'Write up MOLGANG-008 from the May-3 user pivot. Honest effort estimates, three.js vs Babylon, character pipeline, physics layer.',
    estimated_hours: 6 },

  // ─── ZIP — code (5 tasks) ──────────────────────────────────────────────
  { agent: 'Zip',  priority: 'high',     title: 'Asset loader on web: GLB streaming via /api/assets/file/:id',
    description: 'Backend serves GLBs from EDS2 by registry id. Frontend loader caches per-session. Wire into the bench molecule viewer.',
    estimated_hours: 8 },
  { agent: 'Zip',  priority: 'medium',   title: 'Filter UI for /assets.html dashboard',
    description: 'Click-drilldown by category. Lists orphans with copy-path button. Reuses the All-Agents grid CSS.',
    estimated_hours: 6 },
  { agent: 'Zip',  priority: 'medium',   title: 'GLB manifest schema (lod_levels, vertex_count, license)',
    description: 'Extend asset-registry entries with these fields once Luna\'s LOD pipeline lands. Update build-asset-registry.js to read them from glTF metadata.',
    estimated_hours: 4 },
  { agent: 'Zip',  priority: 'low',      title: 'Frontend asset preview component',
    description: 'Tiny three.js viewer reused inside /assets.html and /molecule/[name]. Single GLB renderer with orbit + zoom.',
    estimated_hours: 6 },
  { agent: 'Zip',  priority: 'low',      title: 'Asset-loaded telemetry to Kafka',
    description: 'Frontend posts an event per GLB load → Kafka asset.events topic. Helps the cost dashboard show CDN egress.',
    estimated_hours: 4 },

  // ─── KAI — infra (5 tasks) ─────────────────────────────────────────────
  { agent: 'Kai',  priority: 'high',     title: 'EDS2 backup policy for molgang-assets',
    description: '850 GB of unique creative work has no backup today. Define rsync target, schedule (weekly), verification, restore drill. Documented as EDS2-BACKUP.md.',
    estimated_hours: 6 },
  { agent: 'Kai',  priority: 'high',     title: 'Wire build-asset-registry.js into 4-hour CCR sync routine',
    description: 'Routine already pulls Roblox + runs achievement+element sync. Add registry rebuild as a 5th step. Re-deploy the routine via /schedule.',
    estimated_hours: 3 },
  { agent: 'Kai',  priority: 'medium',   title: 'Kafka topic: asset.events (uploaded / loaded / errored)',
    description: 'New topic with 5 partitions for asset lifecycle events. Wire shared producer to publish on registry changes + GLB loads (once Zip\'s frontend telemetry lands).',
    estimated_hours: 4 },
  { agent: 'Kai',  priority: 'medium',   title: 'CDN strategy doc + cost model',
    description: 'At 10K × 2 MB GLB = 20 GB. Compare self-host vs Cloudflare R2 vs Bunny.net for serving. Pick a default.',
    estimated_hours: 4 },
  { agent: 'Kai',  priority: 'low',      title: 'Render-farm scheduler integration with gpu-symbiosis',
    description: 'gpu-symbiosis already yields LM Studio when Blender is foreground. Extend to also yield to Luna\'s render-farm orchestrator.',
    estimated_hours: 6 },

  // ─── BATCH cross-agent (10 tasks) ──────────────────────────────────────
  { agent: 'Mira', priority: 'medium',   title: 'Procedural variant batch run: rocks (100 instances)',
    description: 'Once Atlas\'s rock .blend lands, run the farm. Output to models/. Updates registry by ~100.',
    estimated_hours: 2 },
  { agent: 'Mira', priority: 'medium',   title: 'Procedural variant batch run: trees (90 instances)',
    description: 'Ditto for trees.',
    estimated_hours: 2 },
  { agent: 'Luna', priority: 'medium',   title: 'Procedural variant batch run: pipes (100 instances)',
    description: 'Ditto for pipes.',
    estimated_hours: 2 },
  { agent: 'Luna', priority: 'medium',   title: 'Procedural variant batch run: beakers (50 instances)',
    description: 'Ditto for beakers.',
    estimated_hours: 2 },
  { agent: 'Luna', priority: 'medium',   title: 'Procedural variant batch run: glassware (80 instances)',
    description: 'Ditto for chemistry glassware.',
    estimated_hours: 2 },
  { agent: 'Atlas', priority: 'high',    title: 'AI-mesh batch: 200 prompts via Meshy after pilot',
    description: 'Once the 50-prompt pilot lands and quality bar is set, run a 200-prompt batch. Budget ~$60. Filter to GLBs that pass the rubric.',
    estimated_hours: 4 },
  { agent: 'Atlas', priority: 'medium',  title: 'AI-mesh batch: 500 prompts',
    description: 'Larger batch. Budget ~$150.',
    estimated_hours: 6 },
  { agent: 'Vice', priority: 'medium',   title: 'Player-research: 5 chemistry-game references for asset style',
    description: 'Look at Chemistry Lab Idle, Chem Lab Escape, Lab Experiment, Science Simulator, plus any 2026 entries. Document asset style + LOD strategy + format choices.',
    estimated_hours: 6 },
  { agent: 'Kimi', priority: 'medium',   title: 'Long-context audit: every asset-related file across both repos',
    description: 'Single-pass synthesis: "what asset infrastructure exists, what\'s missing, what would 10K assets break". Output as ASSET-AUDIT.md.',
    estimated_hours: 4 },
  { agent: 'VideoProducer', priority: 'low', title: 'Render highlight reel from first 100 ported GLBs',
    description: 'Once 100 assets land in models/, run a Cycles cinematic across them. 60s reel for the credits screen.',
    estimated_hours: 4 },
];

(async () => {
  console.log(`▶ pushing ${TASKS.length} asset-scale tasks into ${VIRTUALPC}/api/backlog/items`);
  const counts = {};
  let ok = 0, failed = 0;
  for (const t of TASKS) {
    const body = { ...t, sprint: SPRINT, assigned_to: t.agent };
    delete body.agent;
    const labelTitle = t.title.length > 64 ? t.title.slice(0, 61) + '…' : t.title;
    process.stdout.write(`  ${t.priority.padEnd(8)} ${t.agent.padEnd(15)} ${labelTitle.padEnd(64)} `);
    try {
      const r = await postJson('/api/backlog/items', body);
      if (r.success) { console.log(`✓`); ok++; counts[t.agent] = (counts[t.agent] || 0) + 1; }
      else { console.log(`✗ ${r.error}`); failed++; }
    } catch (e) { console.log(`✗ ${e.message}`); failed++; }
  }
  console.log(`\nDone: ${ok} created, ${failed} failed`);
  console.log('Per-agent task delta:', counts);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

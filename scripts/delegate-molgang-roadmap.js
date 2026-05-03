#!/usr/bin/env node
/**
 * delegate-molgang-roadmap.js — push the MOLGANG-007 backlog (and the
 * GTA6-realism Phase-6 scope from the May-3 user pivot) into virtualpc's
 * task engine, each item assigned to the right agent in the canonical roster.
 *
 * Source of truth: /media/knight2/EDS2/projects/molgang-web/backlog/MOLGANG-007-*.md
 *
 * After this runs, /api/backlog/per-person on each agent surfaces the
 * roadmap items, and the dashboard's per-agent panels show them in the
 * Tasks card alongside the existing seed pool. From there the agents'
 * tick loop picks them up via the normal task-engine flow.
 *
 * Re-runnable; duplicates land as separate task IDs (engine has no dedupe).
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

// Roadmap items split by sprint and assigned by domain expertise.
const ROADMAP = [
  // ── Sprint A: close the gameplay loop ─────────────────────────────────
  { sprint: 'A-gameplay-loop', priority: 'critical', assigned_to: 'Zip',
    title: 'Port QuestTrackerGui — quest data + endpoints + page',
    description: 'Story-driven progression spine. Port molgang-roblox/.../Quests.lua → shared/quests.json (10 starter/intermediate/advanced quests, prerequisites graph, MolCoin rewards). Add /api/quests/{list, player/:id, complete} routes. Build /quests/[playerId] Next.js page with active/completed sections + auto-claim on objective completion. Hook into the existing achievement tracker so moleculesBuilt/atomsCollected progressions auto-mark quests done.',
    estimated_hours: 6,
    subtasks: ['Port Quests.lua → shared/quests.json', 'shared schema + types', '/api/quests endpoints', '/quests/[playerId] page', 'Achievement tracker integration', 'Smoke test all quests'] },

  { sprint: 'A-gameplay-loop', priority: 'high', assigned_to: 'Zip',
    title: 'Wallet page + MolCoin endpoints',
    description: 'Achievements already track molCoinsEarned but there is no wallet surface. Add /api/wallet/{:playerId, :playerId/credit, :playerId/debit} routes backed by an in-memory store, wire to the existing achievement tracker so quest rewards land, and build /wallet/[playerId] page with transaction log.',
    estimated_hours: 4,
    subtasks: ['shared/wallet schema', '/api/wallet endpoints', '/wallet/[playerId] page', 'Hook into quest rewards', 'Hook into chemistry-react crafting'] },

  { sprint: 'A-gameplay-loop', priority: 'high', assigned_to: 'Mira',
    title: 'NPC dialogue panel UI',
    description: 'Qwen-backed NPC chat already exists at /api/npc/:name/talk. Build a /npc/[name]/[playerId] page with the dialogue panel UX: portrait, name, branching choices, "give quest" affordance. Roblox NPC roster: Farmer Chen, Dr. Femke, Vanadis, Kwantje. Mirror their roles + voice + quest-giver linkage.',
    estimated_hours: 6,
    subtasks: ['NPC roster (4 NPCs) → shared/npcs.json', 'Portrait component', 'Dialogue branching UI', 'Quest-give affordance', 'Test with Qwen path'] },

  { sprint: 'A-gameplay-loop', priority: 'high', assigned_to: 'Atlas',
    title: '3D molecule viewer with three.js (Phase 6 entry)',
    description: 'User pivoted to "GTA6-realistic" framing. The honest first step toward 3D is replacing the SVG ball-and-stick at /bench with a three.js viewer that rotates, supports orbit camera, renders covalent bonds + lone pairs, and overlays VSEPR shape labels. Drop into a new /molecule/[name] route. Use the existing shared/reactions.json bond geometry as input.',
    estimated_hours: 8,
    subtasks: ['Add three.js dep', 'Convert atoms x/y → 3D coords (VSEPR-style)', 'Orbit-camera controls', 'Bond order rendering (single/double/triple)', 'Element-coloured atoms', 'Drop into /molecule/[name] page', 'Wire from bench result card'] },

  // ── Sprint B: economy + research ──────────────────────────────────────
  { sprint: 'B-economy-research', priority: 'high', assigned_to: 'Zip',
    title: 'Multi-building facility system',
    description: 'Port shared/facilities.json (already created May 3) to live endpoints. Each player builds N instances per kind (mine, factory, lab, office, reactor, logistics_hub). Cost grows geometrically. Production stacks linearly. Hook into the inventory + research-points loop. Page: /facilities/[playerId] — list + build button per kind, capacity/cost preview.',
    estimated_hours: 10,
    subtasks: ['Read shared/facilities.json', '/api/facilities/{kinds, player/:id, player/:id/build} endpoints', 'Cost growth formula', 'Production tick (atoms/molecules/research per cycle)', '/facilities/[playerId] page', 'Hook to inventory + research'] },

  { sprint: 'B-economy-research', priority: 'high', assigned_to: 'Zip',
    title: 'ResearchTree port',
    description: 'Port molgang-roblox/.../ResearchTree.lua → shared/research-tree.json. Tech nodes gate advanced recipes the same way age-bands do. Each node costs MolCoins + research points (produced by Research Lab facility). /api/research/{tree, player/:id, unlock} routes + /research/[playerId] page.',
    estimated_hours: 8,
    subtasks: ['Port ResearchTree.lua → JSON', 'shared/research-tree schema', '/api/research endpoints', '/research/[playerId] tree-view page', 'Recipe-gating integration'] },

  { sprint: 'B-economy-research', priority: 'medium', assigned_to: 'Kai',
    title: 'AtomTrade — P2P trading via Colyseus',
    description: 'Port AtomTradeGui. Colyseus already runs on :2567. Create AtomTradeRoom for matchmaking buy/sell offers between online players. UI: /trade/[playerId] page with order book and "make offer" form. Server validates atom counts before completing trade.',
    estimated_hours: 10,
    subtasks: ['AtomTradeRoom Colyseus schema', 'Offer matching engine', 'Atom-count validation', '/trade/[playerId] page', 'Order book UI', 'Test with two simulated players'] },

  { sprint: 'B-economy-research', priority: 'medium', assigned_to: 'Zip',
    title: 'FertilizerTrack port',
    description: 'Port FertilizerTrack.lua. NPK production track, uses shared/reactions-conditions.json for heat/pressure. /api/fertilizer/{produce, player/:id} + /fertilizer/[playerId] page. Pairs with the chemistry-conditions gate already shipped.',
    estimated_hours: 6,
    subtasks: ['NPK ratio model', 'Crop type list', '/api/fertilizer endpoints', '/fertilizer/[playerId] page', 'Hook to conditions gate'] },

  { sprint: 'B-economy-research', priority: 'medium', assigned_to: 'Zip',
    title: 'MiningGui port',
    description: 'Mineral extraction stage that feeds atoms into the inventory. Port MiningSystem.lua. Each Mine facility produces a deterministic atom mix per cycle. /api/mining/{tick, player/:id} + /mining/[playerId] page.',
    estimated_hours: 6,
    subtasks: ['Per-mineral atom yield table', '/api/mining endpoints', 'Cycle tick handler', '/mining/[playerId] page'] },

  // ── Phase 6: GTA6-realism scope (per May-3 user pivot) ────────────────
  { sprint: 'P6-realism', priority: 'critical', assigned_to: 'Atlas',
    title: 'Phase-6 scope doc — 3D engine + map + characters',
    description: 'User asked for "GTA6-realistic without the vice" with quantum-chemistry USP. Write MOLGANG-008 design doc that scopes (with honest effort estimates): 3D engine choice (three.js vs Babylon.js), map streaming strategy, character animation pipeline, physics layer (cannon-es?), how the existing 2D Phaser arena coexists or gets replaced. Distinguish "real quantum chemistry" (impossible at game scale) from "credibly real chemistry" (VSEPR + bond energetics + reaction kinetics empirical) so the USP stays defensible.',
    estimated_hours: 6,
    subtasks: ['Survey three.js vs Babylon.js', 'Map streaming options (R3F + Drei vs custom)', 'Character pipeline (Mixamo + GLB)', 'Physics layer evaluation', 'Honest USP scoping', 'Publish backlog/MOLGANG-008-Phase6.md'] },

  { sprint: 'P6-realism', priority: 'high', assigned_to: 'Luna',
    title: 'Big-map streaming prototype',
    description: 'Tile/chunk-based map streaming with three.js so the world can be much bigger than a single Phaser ArenaScene. Load chunks based on camera distance. First milestone: 8×8 chunks, each 64×64 tiles, with simple terrain.',
    estimated_hours: 16,
    subtasks: ['Chunk schema', 'three.js camera + raycaster', 'LOD strategy', 'Worker-thread chunk loading', 'Persistent world snapshot', 'Performance benchmarks'] },

  { sprint: 'P6-realism', priority: 'high', assigned_to: 'Mira',
    title: 'Character roster + 3D models',
    description: 'Design + provide 3D character models for the player avatar + the 4 NPCs (Farmer Chen, Dr. Femke, Vanadis, Kwantje). Use Mixamo rigs + custom textures. Export GLB. Hook into the three.js viewport.',
    estimated_hours: 14,
    subtasks: ['5 character concepts', '5 GLB exports', 'Animation states (idle/walk/talk)', 'Outfit variants', 'Drop-in three.js loader'] },

  { sprint: 'P6-realism', priority: 'medium', assigned_to: 'Atlas',
    title: 'Quantum-chemistry overlays (VSEPR + electron clouds)',
    description: 'Add credibly-real chemistry overlays on the 3D molecule viewer: VSEPR shape labels (linear/bent/trigonal/tetrahedral/etc), electron-density isosurfaces approximated from atomic radii, dipole-moment arrow when polar. NOT first-principles QM — empirical lookup + visual approximation, but honest about the level.',
    estimated_hours: 12,
    subtasks: ['VSEPR shape table per recipe', 'Electron-density isosurface (marching cubes on atomic-radius blob)', 'Dipole arrow from atomic-electronegativity diff', 'Toggle controls in /molecule/[name]', 'Documentation: what is and is not real QM'] },

  // ── Polish & infra ────────────────────────────────────────────────────
  { sprint: 'A-gameplay-loop', priority: 'low', assigned_to: 'Mira',
    title: 'Sandrom track selection + 8 mp3 drops',
    description: 'User has Sandrom permission. Pick which Sandrom track maps to each of the 8 slots in shared/audio-tracks.json (lobby/arena/lab/factory/victory/menu/ui_click/atom_pickup), populate youtube_url, run scripts/fetch-sandrom-tracks.sh.',
    estimated_hours: 2,
    subtasks: ['Pick 8 tracks', 'Populate youtube_url fields', 'Run fetcher', 'Verify file sizes'] },
];

(async () => {
  console.log(`▶ Pushing ${ROADMAP.length} roadmap items into ${VIRTUALPC}/api/backlog/items`);
  let ok = 0, failed = 0;
  for (const item of ROADMAP) {
    process.stdout.write(`  ${(item.priority + ':').padEnd(10)} ${item.assigned_to.padEnd(8)} ${item.title.slice(0, 60).padEnd(60)} `);
    try {
      const r = await postJson('/api/backlog/items', item);
      if (r.success) { console.log(`✓ ${r.task.id}`); ok++; }
      else { console.log(`✗ ${r.error}`); failed++; }
    } catch (e) { console.log(`✗ ${e.message}`); failed++; }
  }
  console.log(`\nDone: ${ok} created, ${failed} failed`);
  console.log(`Inspect via:  curl ${VIRTUALPC}/api/backlog/per-person | jq '.Zip.tasks | length'`);
})().catch(e => { console.error('FATAL', e); process.exit(1); });

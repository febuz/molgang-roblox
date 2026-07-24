// world.js — thin, fast renderer for the Python-authored map (world.json).
//
// The layout is precomputed in world_gen.py, so the client does no placement
// work: it paints a background instantly, then STREAMS the map — only objects
// near the camera are instantiated (GTA/Quake-style), so a 1200-object city
// stays cheap. Real 3D models for identified assets; camera-facing sprites for
// the diffusion gap-fill. Renders on a 49% duty cycle to spare the GPU.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);

// ---------- renderer + instant background ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
$('#stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
// Sky gradient as an instant background (a canvas texture — no assets to wait on).
(function sky() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#9ec8ea'); grd.addColorStop(0.55, '#b9d6ee'); grd.addColorStop(1, '#dfe9ee');
  g.fillStyle = grd; g.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
})();
scene.fog = new THREE.Fog(0xc4dae8, 55, 200);

const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0xdfeeff, 0x384049, 1.5));
const sun = new THREE.DirectionalLight(0xfff2e0, 2.1);
sun.position.set(60, 130, 40); scene.add(sun);

// Ground shows immediately too.
let WORLD = 240, roadAts = [-74, 0, 74], ROAD = 14;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD),
  new THREE.MeshStandardMaterial({ color: 0x3b4a3b, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; scene.add(ground);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- player controller: W forward, S back, A/D strafe, mouse look ----------
const player = { pos: new THREE.Vector3(0, 1.8, 84), yaw: Math.PI, pitch: -0.04, speed: 34 };
const CAMS = {
  street: { pos: [0, 1.8, 46], yaw: Math.PI, pitch: -0.02 },
  overview: { pos: [95, 78, 128], yaw: -2.5, pitch: -0.52 },
  plaza: { pos: [6, 1.8, 10], yaw: -0.6, pitch: 0.0 },
};
const preset = CAMS[params.get('cam')];
if (preset) { player.pos.set(...preset.pos); player.yaw = preset.yaw; player.pitch = preset.pitch; }
const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });
const canvas = renderer.domElement;
canvas.addEventListener('click', () => canvas.requestPointerLock && canvas.requestPointerLock());
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    player.yaw -= e.movementX * 0.0022;
    player.pitch = Math.max(-1.3, Math.min(1.0, player.pitch - e.movementY * 0.0022));
  }
});
function step(dt) {
  const fwd = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw)); // look dir (horizontal)
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const mv = new THREE.Vector3();
  const sp = player.speed * (keys['ShiftLeft'] ? 2.2 : 1);
  if (keys['KeyW'] || keys['ArrowUp']) mv.add(fwd);      // W = forward
  if (keys['KeyS'] || keys['ArrowDown']) mv.sub(fwd);    // S = backward
  if (keys['KeyD'] || keys['ArrowRight']) mv.add(right);
  if (keys['KeyA'] || keys['ArrowLeft']) mv.sub(right);
  if (mv.lengthSq() > 0) player.pos.add(mv.normalize().multiplyScalar(sp * dt));
  const half = WORLD / 2 - 2;
  player.pos.x = Math.max(-half, Math.min(half, player.pos.x));
  player.pos.z = Math.max(-half, Math.min(half, player.pos.z));
  camera.position.copy(player.pos);
  const d = new THREE.Vector3(Math.sin(player.yaw) * Math.cos(player.pitch),
    Math.sin(player.pitch), Math.cos(player.yaw) * Math.cos(player.pitch));
  camera.lookAt(player.pos.clone().add(d));
}

// ---------- P2P/IPFS asset layer ----------
// If ipfs.json (a { models: CID, impostors: CID } map, same pattern as
// molgang-web/lab3d) is present, assets load from the IPFS gateway (P2P) with
// a local HTTP fallback; otherwise straight from the repo. Keeps the client
// bandwidth-thin and lets the world be served peer-to-peer.
let ASSET_BASE = { model: '../models/', imp: './impostors/' };
async function initAssetLayer() {
  try {
    const cfg = await (await fetch('./ipfs.json', { cache: 'no-cache' })).json();
    const gw = cfg.gateway || 'http://127.0.0.1:8080/ipfs/';
    if (cfg.models) ASSET_BASE.model = `${gw}${cfg.models}/`;
    if (cfg.impostors) ASSET_BASE.imp = `${gw}${cfg.impostors}/`;
    console.log('[world] P2P/IPFS asset layer active', ASSET_BASE);
  } catch (e) { /* no ipfs.json -> local */ }
}

// ---------- streaming: instantiate only what's near the camera ----------
const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();

// Impostors are drawn as INSTANCED billboards: one InstancedMesh per type holds
// every instance of that type, so ~1000 impostors cost ~26 draw calls instead
// of ~1000 sprites. A tiny onBeforeCompile makes each instance face the camera
// (billboard) while keeping per-instance position + scale from world_gen.
function buildInstancedImpostors(impObjs) {
  const byType = {};
  for (const o of impObjs) (byType[o.ref] = byType[o.ref] || []).push(o);
  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0, 0.5, 0); // pivot at the base so it stands on the ground
  const shadowGeo = new THREE.PlaneGeometry(1, 1); shadowGeo.rotateX(-Math.PI / 2);
  const shadowMesh = new THREE.InstancedMesh(shadowGeo, shadowMaterial(), impObjs.length);
  let si = 0;
  const dummy = new THREE.Object3D();
  for (const [type, arr] of Object.entries(byType)) {
    const mat = new THREE.MeshBasicMaterial({ map: impostorTex(type), transparent: true, alphaTest: 0.4 });
    billboardify(mat);
    const inst = new THREE.InstancedMesh(geo, mat, arr.length);
    inst.frustumCulled = false;
    for (let i = 0; i < arr.length; i++) {
      const o = arr[i];
      dummy.position.set(o.x, 0, o.z); dummy.scale.set(o.s, o.s, o.s); dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
      dummy.position.set(o.x, 0.04, o.z); dummy.scale.set(o.s * 0.8, o.s * 0.8, 1); dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix(); shadowMesh.setMatrixAt(si++, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }
  shadowMesh.count = si; shadowMesh.instanceMatrix.needsUpdate = true;
  shadowMesh.frustumCulled = false; scene.add(shadowMesh);
}
// Make an InstancedMesh material billboard toward the camera (keep instance
// translation + uniform scale, but orient the quad in view space).
function billboardify(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 iPos = vec3(instanceMatrix[3]);
       float iScale = length(vec3(instanceMatrix[0]));
       vec3 transformed = iPos
         + (position.x * iScale) * vec3(modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0])
         + (position.y * iScale) * vec3(modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix[2][1]);`);
  };
}
const _texCache = new Map();
function impostorTex(type) {
  if (!_texCache.has(type)) {
    const t = texLoader.load(`${ASSET_BASE.imp}${type}.png`);
    t.colorSpace = THREE.SRGBColorSpace; _texCache.set(type, t);
  }
  return _texCache.get(type);
}
const glbProto = new Map();      // file -> loaded scene (prototype) or 'loading'
let objects = [];                // all placements from world.json
let assetIdx = [];               // indices of GLB-asset placements (streamed)
let impPlacements = [];          // impostor placements (instanced; kept for AR)
let impCount = 0;
const live = new Map();          // asset placement index -> Object3D (streamed)
const STREAM_IN = 95, STREAM_OUT = 120, MAX_LIVE = 260;

// Soft round ground shadow so impostors read as grounded, not floating cutouts.
let shadowMat = null;
function shadowMaterial() {
  if (!shadowMat) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const rad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
    rad.addColorStop(0, 'rgba(0,0,0,0.42)'); rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rad; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    shadowMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  }
  return shadowMat;
}
async function spawnAsset(o) {
  let proto = glbProto.get(o.ref);
  if (proto === 'loading') return null;
  if (!proto) {
    glbProto.set(o.ref, 'loading');
    proto = (await gltfLoader.loadAsync(`${ASSET_BASE.model}${o.ref}`)).scene;
    glbProto.set(o.ref, proto);
  }
  const obj = proto.clone(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const s = o.s / Math.max(size.x, size.z, 0.01);
  obj.scale.setScalar(s);
  const b2 = new THREE.Box3().setFromObject(obj);
  obj.position.set(o.x, -b2.min.y, o.z);
  obj.rotation.y = o.r;
  return obj;
}

// ---------- AR "glasses" overlay: label objects in view ----------
// Real objects are named from the identified asset; diffusion objects from the
// YOLOv9 class that re-recognised them (ar_labels.json). Photo-trained YOLO
// can't read the stylised live canvas, so labels come from known identities +
// YOLO's per-impostor recognition — real-time and correct for both kinds.
const arCanvas = document.getElementById('ar');
const arCtx = arCanvas.getContext('2d');
let arOn = params.get('ar') === '1';
let arLabels = {};
const humanize = (ref) => ref.replace(/\.glb$/, '').replace(/_/g, ' ');
function labelFor(o) {
  if (o.t === 'asset') return { text: humanize(o.ref), kind: 'id' };
  const y = arLabels[o.ref];
  if (y && y.yolo && y.conf >= 0.5) return { text: `${y.yolo} · YOLO ${(y.conf * 100) | 0}%`, kind: 'yolo' };
  return { text: `${o.ref.replace(/_/g, ' ')} · diffusion`, kind: 'gen' };
}
const arToggle = document.getElementById('ar-toggle');
function setAR(on) {
  arOn = on; arCanvas.style.display = on ? 'block' : 'none';
  arToggle.classList.toggle('on', on);
}
arToggle.addEventListener('click', () => setAR(!arOn));
addEventListener('keydown', (e) => { if (e.code === 'KeyR') setAR(!arOn); });

const _v = new THREE.Vector3();
function drawAR() {
  const w = innerWidth, h = innerHeight;
  if (arCanvas.width !== w) { arCanvas.width = w; arCanvas.height = h; }
  arCtx.clearRect(0, 0, w, h);
  // reticle + frame (the "glasses" feel)
  arCtx.strokeStyle = 'rgba(111,252,218,0.5)'; arCtx.lineWidth = 1;
  arCtx.strokeRect(10, 10, w - 20, h - 20);
  arCtx.beginPath(); arCtx.arc(w / 2, h / 2, 5, 0, 7); arCtx.stroke();

  const items = [];
  const consider = (o) => {
    const dx = o.x - player.pos.x, dz = o.z - player.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 70) return;
    _v.set(o.x, o.s * 0.6, o.z).project(camera);
    if (_v.z > 1) return;                          // behind camera
    const sx = (_v.x * 0.5 + 0.5) * w, sy = (-_v.y * 0.5 + 0.5) * h;
    if (sx < 0 || sx > w || sy < 0 || sy > h) return;
    items.push({ o, sx, sy, dist });
  };
  for (const [i, obj] of live) if (obj !== 'pending') consider(objects[i]);   // streamed models
  for (const o of impPlacements) consider(o);                                 // instanced impostors
  items.sort((a, b) => a.dist - b.dist);
  const COL = { id: '#6fe0ff', yolo: '#7fffb0', gen: '#ffcf7f' };
  for (const it of items.slice(0, 46)) {
    const { o, sx, sy, dist } = it;
    const lab = labelFor(o);
    const col = COL[lab.kind];
    const bs = Math.max(14, 900 / (dist + 6));    // box scales with distance
    arCtx.strokeStyle = col; arCtx.lineWidth = 1.5;
    const bx = sx - bs / 2, by = sy - bs, L = bs * 0.32;
    // corner brackets
    arCtx.beginPath();
    arCtx.moveTo(bx, by + L); arCtx.lineTo(bx, by); arCtx.lineTo(bx + L, by);
    arCtx.moveTo(bx + bs - L, by); arCtx.lineTo(bx + bs, by); arCtx.lineTo(bx + bs, by + L);
    arCtx.moveTo(bx, by + bs - L); arCtx.lineTo(bx, by + bs); arCtx.lineTo(bx + L, by + bs);
    arCtx.moveTo(bx + bs - L, by + bs); arCtx.lineTo(bx + bs, by + bs); arCtx.lineTo(bx + bs, by + bs - L);
    arCtx.stroke();
    if (dist < 55) {
      arCtx.font = '12px system-ui'; const tw = arCtx.measureText(lab.text).width;
      arCtx.fillStyle = 'rgba(6,12,16,0.8)'; arCtx.fillRect(bx, by - 16, tw + 12, 15);
      arCtx.fillStyle = col; arCtx.fillText(lab.text, bx + 6, by - 4);
      arCtx.fillStyle = col; arCtx.fillRect(bx, by - 16, 3, 15);
    }
  }
  arCtx.fillStyle = 'rgba(111,252,218,0.85)'; arCtx.font = 'bold 13px system-ui';
  arCtx.fillText(`AR VISION · ${items.length} objects tagged · cyan=identified model · green=YOLO · amber=diffusion`, 22, h - 22);
}

// ---------- dynamic layer: moving agents from the Python sim (EVE-style) ----------
// The Python sim owns traffic + pedestrian positions; we poll a tiny JSON state
// a few times a second and interpolate between updates. Degrades silently to a
// static world if the sim server isn't running.
const SIM_URL = (params.get('sim') || 'http://127.0.0.1:8077') + '/state';
const agentMeshes = new Map();   // id -> { sprite, from, to, t }
let simOk = false, simPollMs = 150;
const agentSize = { car: 3.4, delivery_truck: 4.6, van: 4.2, city_bus: 6.2, motorcycle: 2.8,
                    pedestrian: 3.4, woman_pedestrian: 3.4, worker: 3.4 };
function agentSpriteMat(kind) {
  const key = 'agent:' + kind;
  if (!_texCache.has(key)) {
    _texCache.set(key, new THREE.SpriteMaterial({ map: impostorTex(kind), transparent: true, alphaTest: 0.4 }));
  }
  return _texCache.get(key);
}
async function pollSim() {
  try {
    const st = await (await fetch(SIM_URL, { cache: 'no-cache' })).json();
    simOk = true;
    const seen = new Set();
    for (const a of st.agents) {
      seen.add(a.id);
      let m = agentMeshes.get(a.id);
      if (!m) {
        const sp = new THREE.Sprite(agentSpriteMat(a.k));
        sp.center.set(0.5, 0);
        const s = agentSize[a.k] || 3.2; sp.scale.set(s, s, 1);
        scene.add(sp);
        m = { sprite: sp, from: { x: a.x, z: a.z }, to: { x: a.x, z: a.z }, t: 0 };
        agentMeshes.set(a.id, m);
      } else {
        m.from = { x: m.sprite.position.x, z: m.sprite.position.z };
        m.to = { x: a.x, z: a.z }; m.t = 0;
      }
    }
    for (const [id, m] of agentMeshes) if (!seen.has(id)) { scene.remove(m.sprite); agentMeshes.delete(id); }
    const el = document.getElementById('sim'); if (el) el.textContent = `🐍 Python sim: ${st.n} live agents driving/walking`;
  } catch (e) {
    simOk = false;
    const el = document.getElementById('sim'); if (el) el.textContent = '🐍 Python sim offline (static world) — run sim_server.py';
  }
  setTimeout(pollSim, simPollMs);
}
function updateAgents(dt) {
  if (!simOk) return;
  for (const m of agentMeshes.values()) {
    m.t = Math.min(1, m.t + dt / (simPollMs / 1000));
    m.sprite.position.set(m.from.x + (m.to.x - m.from.x) * m.t, 0, m.from.z + (m.to.z - m.from.z) * m.t);
  }
}

let streamTick = 0;
function stream() {
  const px = player.pos.x, pz = player.pos.z;
  // Cull out-of-range live objects.
  for (const [i, obj] of live) {
    const o = objects[i];
    const dx = o.x - px, dz = o.z - pz;
    if (dx * dx + dz * dz > STREAM_OUT * STREAM_OUT) {
      scene.remove(obj); live.delete(i);
    }
  }
  // Stream in near GLB assets only (impostors are instanced upfront — cheap).
  if (live.size < MAX_LIVE) {
    for (const i of assetIdx) {
      if (live.has(i)) continue;
      const o = objects[i];
      const dx = o.x - px, dz = o.z - pz;
      if (dx * dx + dz * dz > STREAM_IN * STREAM_IN) continue;
      live.set(i, 'pending');
      spawnAsset(o).then((obj) => {
        if (obj && live.get(i) === 'pending') { scene.add(obj); live.set(i, obj); }
        else if (!obj) live.delete(i);
      });
      if (live.size >= MAX_LIVE) break;
    }
  }
  $('#live').textContent = `streaming ${[...live.values()].filter((v) => v !== 'pending').length} models + ${impCount} instanced impostors`;
}

// ---------- 49% render-budget loop ----------
const BUDGET = 0.49;
let refresh = 1000 / 60, lastTick = performance.now(), lastRender = 0, lastStream = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - lastTick) / 1000); lastTick = now;
  const d = (now - lastRender);
  step(dt);
  updateAgents(dt);
  if (now - lastStream > 180) { lastStream = now; stream(); }
  if (d >= refresh / BUDGET) { lastRender = now; renderer.render(scene, camera); if (arOn) drawAR(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- load the map, then let streaming populate it ----------
(async function init() {
  await initAssetLayer();
  try { arLabels = (await (await fetch('./ar_labels.json', { cache: 'no-cache' })).json()).labels || {}; } catch (e) { /* optional */ }
  setAR(arOn);
  const w = await (await fetch('./world.json', { cache: 'no-cache' })).json();
  WORLD = w.meta.world; roadAts = w.meta.roadAts; ROAD = w.meta.road;
  objects = w.objects;
  assetIdx = objects.map((o, i) => (o.t === 'asset' ? i : -1)).filter((i) => i >= 0);
  impPlacements = objects.filter((o) => o.t === 'imp');
  impCount = impPlacements.length;
  buildInstancedImpostors(impPlacements);  // all impostors: ~26 instanced draw calls
  pollSim();                               // start the EVE-style dynamic layer
  // roads (cheap, drawn once)
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.9 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xd9c56a, emissive: 0x2e2a16 });
  for (const at of roadAts) {
    for (const horiz of [true, false]) {
      const road = new THREE.Mesh(horiz ? new THREE.PlaneGeometry(WORLD, ROAD) : new THREE.PlaneGeometry(ROAD, WORLD), roadMat);
      road.rotation.x = -Math.PI / 2; road.position.set(horiz ? 0 : at, 0.02, horiz ? at : 0); scene.add(road);
      const line = new THREE.Mesh(horiz ? new THREE.PlaneGeometry(WORLD, 0.5) : new THREE.PlaneGeometry(0.5, WORLD), lineMat);
      line.rotation.x = -Math.PI / 2; line.position.set(horiz ? 0 : at, 0.03, horiz ? at : 0); scene.add(line);
    }
  }
  $('#status').textContent = `Identified → models: ${w.meta.assets} · Unidentified → diffusion: ${w.meta.impostors}`;
  $('#resolve').innerHTML = Object.entries(w.resolve)
    .map(([r, k]) => `<div><span class="${k === 'asset' ? 'a' : 'i'}">${k === 'asset' ? '▣ model' : '◈ diffusion'}</span> ${r}</div>`).join('');
  window.__molgangWorld = { total: objects.length, assets: w.meta.assets, impostors: w.meta.impostors };
  stream(); // first populate
})();

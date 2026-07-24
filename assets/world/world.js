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
// The web experience CONTINUES the Roblox teaser: the same world (Moleculia — a
// floating archipelago in space, MOLGANG's Chemical Engineering Simulator).
// ?world=./world.json falls back to the old city for comparison.
const WORLDFILE = params.get('world') || './moleculia.json';
let MOLECULIA = true;   // set from meta.space after the map loads

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
let WORLD = 240, roadAts = null, ROAD = 14;
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3b4a3b, roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), groundMat);
ground.rotation.x = -Math.PI / 2; scene.add(ground);

// ---------- Moleculia: floating archipelago in space ----------
// Switch the instant sky/ground/lighting to a deep-space setting and paint a
// starfield behind the zones. Called from init() when meta.space is set.
function setSpace() {
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 1024);
  grd.addColorStop(0, '#05060d'); grd.addColorStop(0.6, '#0a0b1c'); grd.addColorStop(1, '#12102a');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 1400; i++) {                 // stars
    const x = Math.random() * 1024, y = Math.random() * 1024, r = Math.random() * 1.4;
    g.globalAlpha = 0.35 + Math.random() * 0.65;
    g.fillStyle = Math.random() < 0.1 ? '#bcd8ff' : '#ffffff';
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalAlpha = 0.10;                              // a soft nebula wash
  for (const col of ['#3a6ea5', '#6a3aa5', '#2aa58a']) {
    const rg = g.createRadialGradient(Math.random() * 1024, Math.random() * 1024, 20,
      Math.random() * 1024, Math.random() * 1024, 400);
    rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 1024, 1024);
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
  scene.fog = new THREE.Fog(0x0a0b1c, 90, 340);
  groundMat.color.set(0x07070f); groundMat.roughness = 1;   // the void below the platforms
  // Cooler, dimmer space lighting.
  scene.traverse((n) => { if (n.isHemisphereLight || n.isDirectionalLight) n.intensity *= 0.75; });
  scene.add(new THREE.PointLight(0x88aaff, 0.6, 600));
}

// Each zone is a floating disc platform (a low cylinder) with a glowing rim so
// the archipelago reads as separate islands in space.
function buildPlatform(o) {
  const rad = o.s;
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(rad, rad * 0.92, 2.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x1b2436, roughness: 0.85, metalness: 0.1 }));
  disc.position.set(o.x, -1.2, o.z); scene.add(disc);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(rad, 0.35, 8, 64),
    new THREE.MeshStandardMaterial({ color: 0x2a3550, emissive: 0x2f6bd0, emissiveIntensity: 0.8 }));
  rim.rotation.x = Math.PI / 2; rim.position.set(o.x, 0.05, o.z); scene.add(rim);
}

// A floating name label above each zone (canvas sprite), so the player can see
// the six zones of Moleculia at a glance.
function buildZoneLabel(z) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(8,12,22,0.72)'; roundRect(g, 8, 30, 496, 68, 16); g.fill();
  g.strokeStyle = '#6fe0ff'; g.lineWidth = 2; roundRect(g, 8, 30, 496, 68, 16); g.stroke();
  g.fillStyle = '#dff0ff'; g.font = 'bold 40px system-ui'; g.textAlign = 'center';
  g.fillText(z.name, 256, 78);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  sp.position.set(z.x, 22, z.z); sp.scale.set(28, 7, 1); scene.add(sp);
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- player controller: W forward, S back, A/D strafe, mouse look ----------
const player = { pos: new THREE.Vector3(0, 1.8, 30), yaw: Math.PI, pitch: -0.02, speed: 30 };
const CAMS = {
  street: { pos: [0, 1.8, 46], yaw: Math.PI, pitch: -0.02 },
  overview: { pos: [60, 150, 90], yaw: -2.485, pitch: -0.74 },       // aerial of the whole archipelago
  factory: { pos: [-90, 62, 44], yaw: -2.09, pitch: -0.64 },          // the Slakkenspoor processing line
  plaza: { pos: [6, 1.8, 10], yaw: -0.6, pitch: 0.0 },
  plaza2: { pos: [6, 1.8, 30], yaw: Math.PI, pitch: -0.03 },  // looks toward plaza (for MP demo)
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
  if (o.t === 'player') return { text: `${o.ref} · player`, kind: 'player' };
  if (o.t === 'asset') return { text: humanize(o.ref), kind: 'id' };
  const y = arLabels[o.ref];
  if (y && y.yolo && y.conf >= 0.5) {
    const tag = o.t === 'agent' ? 'YOLO·live' : 'YOLO';
    return { text: `${y.yolo} · ${tag} ${(y.conf * 100) | 0}%`, kind: 'yolo' };
  }
  return { text: `${o.ref.replace(/_/g, ' ')} · diffusion`, kind: 'gen' };
}
const arToggle = document.getElementById('ar-toggle');
function setAR(on) {
  arOn = on; arCanvas.style.display = on ? 'block' : 'none';
  arToggle.classList.toggle('on', on);
}
arToggle.addEventListener('click', () => setAR(!arOn));
addEventListener('keydown', (e) => { if (e.code === 'KeyR') setAR(!arOn); });

// ---------- LeCun JEPA world model, running in the browser ----------
// The tiny MLP trained by world_model.py (enc -> latent predictor -> decoder)
// predicts each vehicle's next heading; we roll it forward with physics to
// draw a 2 s predicted trajectory in the AR view — the world model's future,
// visualised. Curves at intersections (it learned "turn right there") where a
// straight-line guess would be wrong.
let WM = null;
fetch('./world_model.json', { cache: 'no-cache' }).then(r => r.json()).then(m => { WM = m; }).catch(() => {});
const gelu = (x) => 0.5 * x * (1 + Math.tanh(0.7978845608 * (x + 0.044715 * x * x * x)));
function layer(Wm, b, x) {
  const out = new Array(Wm.length);
  for (let o = 0; o < Wm.length; o++) { let s = b[o]; const row = Wm[o]; for (let i = 0; i < x.length; i++) s += row[i] * x[i]; out[o] = s; }
  return out;
}
const mlp = (m, x) => layer(m.w1, m.b1, layer(m.w0, m.b0, x).map(gelu));
const wmForward = (x) => mlp(WM.dec, mlp(WM.pred, mlp(WM.enc, x)));   // -> [cos, sin] next heading
function wmFeat(st) {
  const W2 = WM.meta.W, ra = WM.meta.roadAts;
  const dmin = Math.min(Math.min(...ra.map(r => Math.abs(st.x - r))), Math.min(...ra.map(r => Math.abs(st.z - r))));
  return [st.x / W2, st.z / W2, Math.cos(st.h), Math.sin(st.h), st.spd / 16, Math.tanh(dmin / 6)];
}
// Roll the world model H steps from an agent's K-window; returns predicted (x,z) path.
function wmPredictPath(win, H) {
  const dt = WM.meta.dt, path = [];
  let w = win.slice(), cur = w[w.length - 1];
  for (let s = 0; s < H; s++) {
    const feat = [];
    for (const st of w) feat.push(...wmFeat(st));
    const [c, si] = wmForward(feat);
    const nh = Math.atan2(si, c);
    const nx = cur.x + Math.cos(nh) * cur.spd * dt, nz = cur.z + Math.sin(nh) * cur.spd * dt;
    cur = { x: nx, z: nz, h: nh, spd: cur.spd };
    w = w.slice(1); w.push(cur); path.push([nx, nz]);
  }
  return path;
}

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
  for (const m of agentMeshes.values())                                       // live moving traffic/peds
    consider({ x: m.sprite.position.x, z: m.sprite.position.z, s: agentSize[m.kind] || 3.2, t: 'agent', ref: m.kind });
  for (const [id, m] of playerMeshes)                                          // other players
    consider({ x: m.sprite.position.x, z: m.sprite.position.z, s: 3.4, t: 'player', ref: id });
  items.sort((a, b) => a.dist - b.dist);
  const COL = { id: '#6fe0ff', yolo: '#7fffb0', gen: '#ffcf7f', player: '#ff7fe0' };
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
  // JEPA world-model predicted trajectories for nearby vehicles.
  let predicted = 0;
  if (WM) {
    const VEH = new Set(['car', 'delivery_truck', 'van', 'city_bus', 'motorcycle']);
    for (const m of agentMeshes.values()) {
      if (!VEH.has(m.kind) || m.hist.length < 2) continue;
      const dx = m.sprite.position.x - player.pos.x, dz = m.sprite.position.z - player.pos.z;
      if (Math.hypot(dx, dz) > 60) continue;
      const win = m.hist.slice(); while (win.length < WM.meta.K) win.unshift(win[0]);
      const path = wmPredictPath(win.slice(-WM.meta.K), 10);   // ~2 s ahead
      arCtx.beginPath();
      let started = false;
      _v.set(m.sprite.position.x, 0.5, m.sprite.position.z).project(camera);
      if (_v.z <= 1) { arCtx.moveTo((_v.x * 0.5 + 0.5) * w, (-_v.y * 0.5 + 0.5) * h); started = true; }
      for (const [px, pz] of path) {
        _v.set(px, 0.5, pz).project(camera);
        if (_v.z > 1) { started = false; continue; }
        const sx = (_v.x * 0.5 + 0.5) * w, sy = (-_v.y * 0.5 + 0.5) * h;
        if (started) arCtx.lineTo(sx, sy); else { arCtx.moveTo(sx, sy); started = true; }
      }
      arCtx.strokeStyle = 'rgba(120,230,255,0.75)'; arCtx.lineWidth = 2; arCtx.stroke();
      const end = path[path.length - 1];
      _v.set(end[0], 0.5, end[1]).project(camera);
      if (_v.z <= 1) { arCtx.fillStyle = 'rgba(120,230,255,0.9)'; arCtx.beginPath(); arCtx.arc((_v.x * 0.5 + 0.5) * w, (-_v.y * 0.5 + 0.5) * h, 3, 0, 7); arCtx.fill(); }
      predicted++;
    }
  }
  arCtx.fillStyle = 'rgba(111,252,218,0.85)'; arCtx.font = 'bold 13px system-ui';
  arCtx.fillText(`AR VISION · ${items.length} tagged · ${predicted} JEPA-predicted paths · cyan=model green=YOLO amber=diffusion`, 22, h - 22);
}

// ---------- dynamic layer: moving agents from the Python sim (EVE-style) ----------
// The Python sim owns traffic + pedestrian positions; we poll a tiny JSON state
// a few times a second and interpolate between updates. Degrades silently to a
// static world if the sim server isn't running.
const SIM_BASE = params.get('sim') || 'http://127.0.0.1:8077';
const SIM_URL = SIM_BASE + '/state';
const agentMeshes = new Map();   // id -> { sprite, from, to, t }
let simOk = false, simPollMs = 150;

// Multiplayer presence: a per-tab id; we POST our position and render others.
const MY_ID = 'p' + Math.random().toString(36).slice(2, 8);
const playerMeshes = new Map();  // id -> { sprite, from, to, t }
function playerMarker(id) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#6ffcda'; g.beginPath();
  g.moveTo(64, 8); g.lineTo(96, 60); g.lineTo(72, 60); g.lineTo(72, 150); g.lineTo(56, 150);
  g.lineTo(56, 60); g.lineTo(32, 60); g.closePath(); g.fill();
  g.fillStyle = '#0b1a16'; g.font = 'bold 20px system-ui'; g.textAlign = 'center';
  g.fillText(id, 64, 130);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
  sp.center.set(0.5, 0); sp.scale.set(3, 3.7, 1);
  return sp;
}
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
    // Publish our position (shared-world presence), then read the world state.
    fetch(SIM_BASE + '/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: MY_ID, x: player.pos.x, z: player.pos.z, yaw: player.yaw }),
    }).catch(() => {});
    const st = await (await fetch(SIM_URL + '?id=' + MY_ID, { cache: 'no-cache' })).json();
    simOk = true;
    // Other players' avatars.
    const pseen = new Set();
    for (const p of (st.players || [])) {
      pseen.add(p.id);
      let pm = playerMeshes.get(p.id);
      if (!pm) { const sp = playerMarker(p.id); scene.add(sp); pm = { sprite: sp, from: { x: p.x, z: p.z }, to: { x: p.x, z: p.z }, t: 0 }; playerMeshes.set(p.id, pm); }
      else { pm.from = { x: pm.sprite.position.x, z: pm.sprite.position.z }; pm.to = { x: p.x, z: p.z }; pm.t = 0; }
    }
    for (const [id, pm] of playerMeshes) if (!pseen.has(id)) { scene.remove(pm.sprite); playerMeshes.delete(id); }
    const pel = document.getElementById('mp');
    if (pel) pel.textContent = `🌐 shared world · you + ${(st.players || []).length} other player(s) online`;
    const seen = new Set();
    for (const a of (MOLECULIA ? [] : st.agents)) {   // city traffic doesn't belong in the space factory
      seen.add(a.id);
      let m = agentMeshes.get(a.id);
      if (!m) {
        const sp = new THREE.Sprite(agentSpriteMat(a.k));
        sp.center.set(0.5, 0);
        const s = agentSize[a.k] || 3.2; sp.scale.set(s, s, 1);
        scene.add(sp);
        m = { sprite: sp, kind: a.k, from: { x: a.x, z: a.z }, to: { x: a.x, z: a.z }, t: 0, hist: [] };
        agentMeshes.set(a.id, m);
      } else {
        const fx = m.sprite.position.x, fz = m.sprite.position.z;
        const dx = a.x - fx, dz = a.z - fz, d = Math.hypot(dx, dz);
        if (d > 0.05 && d < 30) {   // ignore wrap jumps
          const h = Math.atan2(dz, dx), spd = d / (simPollMs / 1000);
          m.hist.push({ x: a.x, z: a.z, h, spd });
          if (m.hist.length > 4) m.hist.shift();
        }
        m.from = { x: fx, z: fz };
        m.to = { x: a.x, z: a.z }; m.t = 0;
      }
    }
    for (const [id, m] of agentMeshes) if (!seen.has(id)) { scene.remove(m.sprite); agentMeshes.delete(id); }
    const el = document.getElementById('sim');
    if (el) el.textContent = MOLECULIA
      ? `🐍 Python process sim live (Arrhenius/Henry/pH kinetics)`
      : `🐍 Python sim: ${st.n} live agents driving/walking`;
    const rx = st.reactor, rel = document.getElementById('reactor');
    if (rx && rel) rel.innerHTML = `⚗️ leach reactor · ${(rx.conversion * 100) | 0}% converted `
      + `<span style="opacity:.7">· ${rx.temperature}°C · ${rx.pressure}kPa · pH ${rx.pH} · rate ${rx.rate}× (Arrhenius)</span>`;
  } catch (e) {
    simOk = false;
    const el = document.getElementById('sim'); if (el) el.textContent = '🐍 Python sim offline (static world) — run sim_server.py';
  }
  setTimeout(pollSim, simPollMs);
}
function updateAgents(dt) {
  if (!simOk) return;
  const lerp = (map) => {
    for (const m of map.values()) {
      m.t = Math.min(1, m.t + dt / (simPollMs / 1000));
      m.sprite.position.set(m.from.x + (m.to.x - m.from.x) * m.t, 0, m.from.z + (m.to.z - m.from.z) * m.t);
    }
  };
  lerp(agentMeshes); lerp(playerMeshes);
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

// ---------- WebXR: Quest 3 headset detection + AR passthrough toggle ----------
// Quickly detect a VR/AR headset (WebXR), let the player enter immersive mode
// (immersive-ar = Quest passthrough), and toggle AR on/off with a controller
// button — AR on shows the real room through the world, AR off is full VR.
renderer.xr.enabled = true;
let xrMode = null;                     // 'immersive-ar' | 'immersive-vr' | null
let xrAR = true;                       // passthrough visible when in AR
const skyBg = scene.background;
const xrBtn = document.getElementById('xr-btn');
const xrStat = document.getElementById('xr');

async function detectXR() {
  if (!('xr' in navigator)) { if (xrStat) xrStat.textContent = '🕶️ no WebXR in this browser'; return; }
  const ar = await navigator.xr.isSessionSupported('immersive-ar').catch(() => false);
  const vr = await navigator.xr.isSessionSupported('immersive-vr').catch(() => false);
  xrMode = ar ? 'immersive-ar' : vr ? 'immersive-vr' : null;
  if (!xrMode) { if (xrStat) xrStat.textContent = '🕶️ no VR/AR headset detected'; return; }
  if (xrStat) xrStat.textContent = `🕶️ ${ar ? 'AR/VR' : 'VR'} headset detected — Quest-ready`;
  if (xrBtn) { xrBtn.style.display = 'block'; xrBtn.textContent = ar ? '🥽 Enter AR' : '🥽 Enter VR'; }
}
async function enterXR() {
  if (!xrMode) return;
  const opts = xrMode === 'immersive-ar'
    ? { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] }
    : { optionalFeatures: ['local-floor'] };
  const session = await navigator.xr.requestSession(xrMode, opts);
  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(session);
  xrAR = (xrMode === 'immersive-ar');
  scene.background = xrAR ? null : skyBg;      // AR on = passthrough shows through
  // Controller buttons toggle AR on/off (A/X or trigger).
  const toggleAR = () => { xrAR = !xrAR; scene.background = xrAR ? null : skyBg; };
  for (const src of session.inputSources) if (src.gamepad) src._prev = [];
  session.addEventListener('selectstart', toggleAR);           // trigger toggles too
  session.__pollButtons = () => {
    for (const src of session.inputSources) {
      const gp = src.gamepad; if (!gp) continue;
      src._prev = src._prev || [];
      gp.buttons.forEach((b, i) => {
        if (i >= 4 && b.pressed && !src._prev[i]) toggleAR();     // face buttons (A/B/X/Y)
        src._prev[i] = b.pressed;
      });
    }
  };
  session.addEventListener('end', () => { scene.background = skyBg; if (xrBtn) xrBtn.disabled = false; });
}
if (xrBtn) xrBtn.addEventListener('click', () => { xrBtn.disabled = true; enterXR().catch((e) => { xrBtn.disabled = false; if (xrStat) xrStat.textContent = '🕶️ XR start failed: ' + e.message; }); });
detectXR();

// ---------- render loop (49% budget outside XR; every frame in XR) ----------
const BUDGET = 0.49;
let refresh = 1000 / 60, lastTick = performance.now(), lastRender = 0, lastStream = 0;
function loop(now) {
  now = now || performance.now();
  const dt = Math.min(0.05, (now - lastTick) / 1000); lastTick = now;
  step(dt);
  updateAgents(dt);
  if (now - lastStream > 180) { lastStream = now; stream(); }
  const xr = renderer.xr.isPresenting;
  if (xr) {
    const s = renderer.xr.getSession(); if (s && s.__pollButtons) s.__pollButtons();
    renderer.render(scene, camera);                    // headset drives cadence
  } else if (now - lastRender >= refresh / BUDGET) {
    lastRender = now; renderer.render(scene, camera); if (arOn) drawAR();
  }
}
renderer.setAnimationLoop(loop);      // works for both desktop RAF and WebXR

// ---------- load the map, then let streaming populate it ----------
(async function init() {
  await initAssetLayer();
  try { arLabels = (await (await fetch('./ar_labels.json', { cache: 'no-cache' })).json()).labels || {}; } catch (e) { /* optional */ }
  setAR(arOn);
  const w = await (await fetch(WORLDFILE, { cache: 'no-cache' })).json();
  WORLD = w.meta.world; roadAts = w.meta.roadAts || null; ROAD = w.meta.road || 14;
  MOLECULIA = !!w.meta.space;
  objects = w.objects;
  assetIdx = objects.map((o, i) => (o.t === 'asset' ? i : -1)).filter((i) => i >= 0);
  impPlacements = objects.filter((o) => o.t === 'imp');
  impCount = impPlacements.length;
  if (impCount) buildInstancedImpostors(impPlacements);   // diffusion gap-fill (old city only)
  pollSim();                                              // reactor + multiplayer (EVE-style)

  if (MOLECULIA) {
    setSpace();
    for (const o of objects) if (o.t === 'platform') buildPlatform(o);
    for (const z of (w.meta.zones || [])) buildZoneLabel(z);
    const line = (w.meta.processLine || []);
    $('#status').innerHTML = `<b>Moleculia</b> · ${(w.meta.zones || []).length} floating zones · `
      + `the web continuation of the Roblox teaser`;
    $('#resolve').innerHTML = `<div style="color:#7fe0a0;margin-bottom:3px">⚗️ Slakkenspoor — BOF slag processing line</div>`
      + line.map((s, i) => `<div><span class="a">${String(i + 1).padStart(2, '0')}</span> ${s}</div>`).join('');
    window.__molgangWorld = { world: 'moleculia', zones: (w.meta.zones || []).length,
      stations: line.length, assets: assetIdx.length };
  } else {
    // legacy city (roads + diffusion) — kept behind ?world=./world.json
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.9 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xd9c56a, emissive: 0x2e2a16 });
    for (const at of (roadAts || [])) {
      for (const horiz of [true, false]) {
        const road = new THREE.Mesh(horiz ? new THREE.PlaneGeometry(WORLD, ROAD) : new THREE.PlaneGeometry(ROAD, WORLD), roadMat);
        road.rotation.x = -Math.PI / 2; road.position.set(horiz ? 0 : at, 0.02, horiz ? at : 0); scene.add(road);
        const ln = new THREE.Mesh(horiz ? new THREE.PlaneGeometry(WORLD, 0.5) : new THREE.PlaneGeometry(0.5, WORLD), lineMat);
        ln.rotation.x = -Math.PI / 2; ln.position.set(horiz ? 0 : at, 0.03, horiz ? at : 0); scene.add(ln);
      }
    }
    $('#status').textContent = `Identified → models: ${w.meta.assets} · Unidentified → diffusion: ${w.meta.impostors}`;
    if (w.resolve) $('#resolve').innerHTML = Object.entries(w.resolve)
      .map(([r, k]) => `<div><span class="${k === 'asset' ? 'a' : 'i'}">${k === 'asset' ? '▣ model' : '◈ diffusion'}</span> ${r}</div>`).join('');
    window.__molgangWorld = { total: objects.length, assets: w.meta.assets, impostors: w.meta.impostors };
  }
  stream(); // first populate
})();

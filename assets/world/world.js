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

// ---------- streaming: instantiate only what's near the camera ----------
const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
const glbProto = new Map();      // file -> loaded scene (prototype) or 'loading'
const spriteMat = new Map();     // impostor type -> SpriteMaterial
let objects = [];                // all placements from world.json
const live = new Map();          // placement index -> Object3D (currently in scene)
const STREAM_IN = 95, STREAM_OUT = 120, MAX_LIVE = 260;

function impostorMaterial(type) {
  if (!spriteMat.has(type)) {
    const t = texLoader.load(`./impostors/${type}.png`);
    t.colorSpace = THREE.SRGBColorSpace;
    spriteMat.set(type, new THREE.SpriteMaterial({ map: t, transparent: true, alphaTest: 0.5 }));
  }
  return spriteMat.get(type);
}
function spawnImpostor(o) {
  const sp = new THREE.Sprite(impostorMaterial(o.ref));
  sp.center.set(0.5, 0);                 // anchor at the bottom -> stands on ground
  sp.scale.set(o.s, o.s, 1);
  sp.position.set(o.x, 0, o.z);
  return sp;
}
async function spawnAsset(o) {
  let proto = glbProto.get(o.ref);
  if (proto === 'loading') return null;
  if (!proto) {
    glbProto.set(o.ref, 'loading');
    proto = (await gltfLoader.loadAsync(`../models/${o.ref}`)).scene;
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
  for (const [i, obj] of live) {
    if (obj === 'pending') continue;
    const o = objects[i];
    _v.set(o.x, o.s * 0.6, o.z).project(camera);
    if (_v.z > 1) continue;                       // behind camera
    const sx = (_v.x * 0.5 + 0.5) * w, sy = (-_v.y * 0.5 + 0.5) * h;
    if (sx < 0 || sx > w || sy < 0 || sy > h) continue;
    const dx = o.x - player.pos.x, dz = o.z - player.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 70) continue;
    items.push({ o, sx, sy, dist });
  }
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
  // Stream in near objects (impostors first — they're cheap and set the scene).
  if (live.size < MAX_LIVE) {
    for (let i = 0; i < objects.length; i++) {
      if (live.has(i)) continue;
      const o = objects[i];
      const dx = o.x - px, dz = o.z - pz;
      if (dx * dx + dz * dz > STREAM_IN * STREAM_IN) continue;
      if (o.t === 'imp') {
        const sp = spawnImpostor(o); scene.add(sp); live.set(i, sp);
      } else {
        live.set(i, 'pending');
        spawnAsset(o).then((obj) => {
          if (obj && live.get(i) === 'pending') { scene.add(obj); live.set(i, obj); }
          else if (!obj) live.delete(i);
        });
      }
      if (live.size >= MAX_LIVE) break;
    }
  }
  $('#live').textContent = `streaming ${[...live.values()].filter((v) => v !== 'pending').length} nearby objects`;
}

// ---------- 49% render-budget loop ----------
const BUDGET = 0.49;
let refresh = 1000 / 60, lastTick = performance.now(), lastRender = 0, lastStream = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - lastTick) / 1000); lastTick = now;
  const d = (now - lastRender);
  step(dt);
  if (now - lastStream > 180) { lastStream = now; stream(); }
  if (d >= refresh / BUDGET) { lastRender = now; renderer.render(scene, camera); if (arOn) drawAR(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---------- load the map, then let streaming populate it ----------
(async function init() {
  try { arLabels = (await (await fetch('./ar_labels.json', { cache: 'no-cache' })).json()).labels || {}; } catch (e) { /* optional */ }
  setAR(arOn);
  const w = await (await fetch('./world.json', { cache: 'no-cache' })).json();
  WORLD = w.meta.world; roadAts = w.meta.roadAts; ROAD = w.meta.road;
  objects = w.objects;
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

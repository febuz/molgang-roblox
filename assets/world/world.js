// world.js — a free-roam industrial-district world composed from the
// identified asset library, with diffusion impostors filling the gaps.
//
// Resolver: each thing the district needs is matched (by word) against the
// GLB manifest. A hit places the real model ("identified"); a miss falls back
// to a Stable-Diffusion impostor billboard ("unidentified -> generated").

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);

// ---- deterministic PRNG so the town is stable across loads ----
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1337);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const jitter = (m) => (rand() - 0.5) * 2 * m;

// ---- data ----
const manifest = await (await fetch('../viewer/manifest.json', { cache: 'no-cache' })).json();
const impostorData = await (await fetch('./impostors/impostors.json', { cache: 'no-cache' })).json();
const assetStems = manifest.models.map((m) => ({ stem: m.stem, file: m.file, set: m.set }));
const impostorTypes = Object.keys(impostorData.impostors);

// Word-boundary match against stems (so "car" does NOT match "ore_cart").
function words(s) { return s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean); }
function resolve(keywords, impostorType) {
  for (const a of assetStems) {
    const w = words(a.stem);
    if (keywords.some((k) => w.includes(k))) return { kind: 'asset', file: a.file, stem: a.stem };
  }
  if (impostorType && impostorData.impostors[impostorType]) {
    return { kind: 'impostor', type: impostorType };
  }
  return null;
}
const stats = { asset: 0, impostor: 0, needs: {} };

// ---- scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fb4d6);
scene.fog = new THREE.Fog(0x8fb4d6, 60, 260);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 600);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
$('#stage').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdfeeff, 0x33383f, 1.4));
const sun = new THREE.DirectionalLight(0xfff3e0, 2.2);
sun.position.set(60, 120, 40);
scene.add(sun);

// ---- ground + roads ----
const WORLD = 220;
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD, WORLD),
  new THREE.MeshStandardMaterial({ color: 0x3c4a3a, roughness: 1 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const BLOCK = 60, ROAD = 14, GRID = [-1, 0, 1];   // 3x3 blocks
const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.9 });
const lineMat = new THREE.MeshStandardMaterial({ color: 0xd9c56a, emissive: 0x3a3520 });
function roadStrip(horizontal, at) {
  const len = WORLD;
  const geo = horizontal ? new THREE.PlaneGeometry(len, ROAD) : new THREE.PlaneGeometry(ROAD, len);
  const road = new THREE.Mesh(geo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(horizontal ? 0 : at, 0.02, horizontal ? at : 0);
  scene.add(road);
  const dash = horizontal ? new THREE.PlaneGeometry(len, 0.5) : new THREE.PlaneGeometry(0.5, len);
  const line = new THREE.Mesh(dash, lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(horizontal ? 0 : at, 0.03, horizontal ? at : 0);
  scene.add(line);
}
const roadAts = GRID.map((g) => g * (BLOCK + ROAD));
for (const at of roadAts) { roadStrip(true, at); roadStrip(false, at); }

// ---- loaders ----
const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();
const glbCache = new Map();
async function loadGLB(file) {
  if (!glbCache.has(file)) glbCache.set(file, (await gltfLoader.loadAsync(`../models/${file}`)).scene);
  return glbCache.get(file).clone(true);
}
const texCache = new Map();
function loadTex(type) {
  if (!texCache.has(type)) {
    const t = texLoader.load(`./impostors/${impostorData.impostors[type].file}`);
    t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(type, t);
  }
  return texCache.get(type);
}

// Place a GLB, normalised so its largest footprint dimension ~= targetSize,
// standing on the ground at (x,z).
async function placeAsset(file, x, z, targetSize, rotY = 0) {
  const obj = await loadGLB(file);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const s = targetSize / Math.max(size.x, size.z, 0.01);
  obj.scale.setScalar(s);
  const box2 = new THREE.Box3().setFromObject(obj);
  obj.position.set(x, -box2.min.y, z);
  obj.rotation.y = rotY;
  scene.add(obj);
  return obj;
}

// Place an impostor billboard: an upright alpha-tested plane, base on the
// ground, facing +/- along `faceZ` (a real standee, not a camera sprite).
const impostors = [];
function placeImpostor(type, x, z, height, faceRot = 0) {
  const tex = loadTex(type);
  const asp = 1; // square generations
  const w = height * asp;
  const geo = new THREE.PlaneGeometry(w, height);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, height / 2, z);
  m.rotation.y = faceRot;
  m.userData.billboard = true;
  scene.add(m);
  impostors.push(m);
  return m;
}

// ---- district composition ----
const setBlocks = {
  '-1,-1': 'Chemistry Lab', '0,-1': 'Industrial & Game', '1,-1': 'Mining Site',
  '-1,0': 'Industrial & Game', '0,0': 'Nexus Hub', '1,0': 'Industrial & Game',
  '-1,1': 'Bubble Tea Café', '0,1': 'Industrial & Game', '1,1': 'Mining Site',
};
function blockCenter(gx, gz) { return [gx * (BLOCK + ROAD), gz * (BLOCK + ROAD)]; }

async function build() {
  // 1. Per-block landmark clusters from the IDENTIFIED library (grouped by set).
  for (const gx of GRID) for (const gz of GRID) {
    const [cx, cz] = blockCenter(gx, gz);
    const set = setBlocks[`${gx},${gz}`];
    const inSet = manifest.models.filter((m) => m.set === set);
    const n = Math.min(inSet.length, 9);
    for (let i = 0; i < n; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const x = cx + (col - 1) * 15 + jitter(2);
      const z = cz + (row - 1) * 15 + jitter(2);
      const big = /silo|column|tower|tank|converter|kiln|excavator|truck|frame|arch|fountain|fridge/.test(inSet[i].stem);
      await placeAsset(inSet[i].file, x, z, big ? 12 : 6, rand() * Math.PI * 2);
      stats.asset++;
    }
  }

  // 2. Building facades line the block edges facing the roads (GAP -> impostor).
  for (const at of roadAts) {
    for (let t = -WORLD / 2 + 20; t < WORLD / 2 - 20; t += 22) {
      if (Math.abs(t) < ROAD) continue;
      placeImpostor('factory_facade', t, at - ROAD / 2 - 3, 16, 0);
      placeImpostor('factory_facade', t, at + ROAD / 2 + 3, 16, Math.PI);
      placeImpostor('factory_facade', at - ROAD / 2 - 3, t, 16, Math.PI / 2);
      placeImpostor('factory_facade', at + ROAD / 2 + 3, t, 16, -Math.PI / 2);
    }
  }
  stats.impostor += 4 * roadAts.length * 8;

  // 3. Street furniture + fill along the roads.
  const NEEDS = [
    { role: 'street light', kw: ['lamp', 'light'], imp: null, size: 5, every: 26 },
    { role: 'bench', kw: ['bench'], imp: null, size: 4, every: 40 },
    { role: 'signpost', kw: ['signpost'], imp: null, size: 5, every: 55 },
    { role: 'tree', kw: ['tree'], imp: 'tree', size: 7, every: 18 },
    { role: 'car', kw: ['car', 'sedan', 'vehicle'], imp: 'car', size: 3.4, every: 21 },
    { role: 'pedestrian', kw: ['pedestrian', 'person'], imp: 'pedestrian', size: 3.4, every: 24 },
    { role: 'fire hydrant', kw: ['hydrant'], imp: 'fire_hydrant', size: 1.6, every: 33 },
    { role: 'dumpster', kw: ['dumpster'], imp: 'dumpster', size: 2.6, every: 47 },
    { role: 'traffic cone', kw: ['cone'], imp: 'traffic_cone', size: 1.3, every: 29 },
    { role: 'shrub', kw: ['shrub', 'bush'], imp: 'shrub', size: 2.2, every: 15 },
  ];
  for (const need of NEEDS) {
    const r = resolve(need.kw, need.imp);
    stats.needs[need.role] = r ? r.kind : 'none';
    if (!r) continue;
    for (const at of roadAts) {
      for (let t = -WORLD / 2 + 16; t < WORLD / 2 - 16; t += need.every) {
        if (Math.abs(t) < ROAD) continue;
        const offs = [[t, at - ROAD / 2 - 1.5], [t, at + ROAD / 2 + 1.5],
                      [at - ROAD / 2 - 1.5, t], [at + ROAD / 2 + 1.5, t]];
        for (const [x, z] of offs) {
          if (rand() > 0.5) continue;
          const rot = rand() * Math.PI * 2;
          if (r.kind === 'asset') { await placeAsset(r.file, x, z, need.size, rot); stats.asset++; }
          else { placeImpostor(r.imp || need.imp, x, z, need.size, rot); stats.impostor++; }
        }
      }
    }
  }

  // 4. Power pylons at the far corners (GAP -> impostor).
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    placeImpostor('power_pylon', sx * (WORLD / 2 - 12), sz * (WORLD / 2 - 12), 20, rand() * Math.PI);
    stats.impostor++;
  }

  finishHUD();
}

function finishHUD() {
  $('#status').textContent = `Identified → assets: ${stats.asset} · Unidentified → diffusion: ${stats.impostor}`;
  const rows = Object.entries(stats.needs)
    .map(([r, k]) => `<div><span class="${k === 'asset' ? 'a' : 'i'}">${k === 'asset' ? '▣ model' : '◈ diffusion'}</span> ${r}</div>`)
    .join('');
  $('#resolve').innerHTML = rows;
  window.__molgangWorld = { assets: stats.asset, impostors: stats.impostor, needs: stats.needs };
}

// ---- free-roam camera (pointer-lock + WASD), inline (no extra deps) ----
const player = { pos: new THREE.Vector3(0, 1.8, roadAts[0] + 40), yaw: Math.PI, pitch: -0.05, speed: 22 };
// Optional verification/deep-link camera presets.
const CAMS = {
  overview: { pos: [90, 70, 120], yaw: -2.5, pitch: -0.5 },
  street: { pos: [0, 1.8, 42], yaw: Math.PI, pitch: -0.03 },
  plaza: { pos: [4, 1.8, 6], yaw: -0.6, pitch: 0.0 },
};
const camPreset = CAMS[params.get('cam')];
if (camPreset) { player.pos.set(...camPreset.pos); player.yaw = camPreset.yaw; player.pitch = camPreset.pitch; }

const keys = {};
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });
const canvas = renderer.domElement;
canvas.addEventListener('click', () => canvas.requestPointerLock && canvas.requestPointerLock());
addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    player.yaw -= e.movementX * 0.0022;
    player.pitch = Math.max(-1.4, Math.min(1.0, player.pitch - e.movementY * 0.0022));
  }
});

function applyCamera(dt) {
  const forward = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);
  const mv = new THREE.Vector3();
  if (keys['KeyW']) mv.sub(forward);
  if (keys['KeyS']) mv.add(forward);
  if (keys['KeyA']) mv.sub(right);
  if (keys['KeyD']) mv.add(right);
  if (mv.lengthSq() > 0) { mv.normalize().multiplyScalar(player.speed * dt); player.pos.add(mv); }
  const half = WORLD / 2 - 2;
  player.pos.x = Math.max(-half, Math.min(half, player.pos.x));
  player.pos.z = Math.max(-half, Math.min(half, player.pos.z));
  camera.position.copy(player.pos);
  const dir = new THREE.Vector3(
    Math.sin(player.yaw) * Math.cos(player.pitch),
    Math.sin(player.pitch),
    Math.cos(player.yaw) * Math.cos(player.pitch));
  camera.lookAt(player.pos.clone().add(dir));
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  applyCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

build();

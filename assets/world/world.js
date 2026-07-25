// world.js — thin, fast renderer for the Python-authored map (world.json).
//
// The layout is precomputed in world_gen.py, so the client does no placement
// work: it paints a background instantly, then STREAMS the map — only objects
// near the camera are instantiated (GTA/Quake-style), so a 1200-object city
// stays cheap. Real 3D models for identified assets; camera-facing sprites for
// the diffusion gap-fill. Renders on a 49% duty cycle to spare the GPU.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
// The web experience CONTINUES the Roblox teaser: the same world (Moleculia — a
// floating archipelago in space, MOLGANG's Chemical Engineering Simulator).
// ?world=./world.json falls back to the old city for comparison.
const WORLDFILE = params.get('world') || './moleculia.json';
let MOLECULIA = true;   // set from meta.space after the map loads

// ---------- renderer + instant background ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;   // filmic response -> realistic highlights
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;     // soft grounded shadows
$('#stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
// Image-based lighting: a neutral studio environment gives every PBR material
// real reflections + soft ambient, the single biggest step up in realism.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
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
scene.add(new THREE.HemisphereLight(0xdfeeff, 0x384049, 0.45));   // env map carries most ambient now
const sun = new THREE.DirectionalLight(0xfff2e0, 2.6);
sun.position.set(60, 130, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 300;
sun.shadow.camera.left = -48; sun.shadow.camera.right = 48;
sun.shadow.camera.top = 48; sun.shadow.camera.bottom = -48;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun); scene.add(sun.target);

// Post-processing: subtle bloom so emissive rims, quantum glow, element tiles and
// stars actually glow — a big perceptual polish in a dark space scene.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.5, 0.5, 0.85);   // half-res: ~4x cheaper, visually identical
composer.addPass(bloom);
composer.addPass(new OutputPass());

// Ground shows immediately too.
let WORLD = 240, roadAts = null, ROAD = 14;
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3b4a3b, roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD, WORLD), groundMat);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

// ---------- Moleculia: floating archipelago in space ----------
// Switch the instant sky/ground/lighting to a deep-space setting and paint a
// starfield behind the zones. Called from init() when meta.space is set.
function setSpace() {
  // Real HDRI lighting (CC0 Poly Haven "industrial workshop foundry"): warm,
  // directional industrial reflections on every PBR surface — replaces the
  // neutral RoomEnvironment once loaded (which stays as the instant fallback).
  new RGBELoader().load('./env/industrial_workshop_foundry_1k.hdr', (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = pmrem.fromEquirectangular(t).texture;
    t.dispose();
  }, undefined, () => { /* keep RoomEnvironment */ });
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
// A procedural industrial deck texture (radial, so it suits the circular
// platforms): dark metal with concentric panel seams, radial segments, a
// hazard-stripe border and grunge. Shared across platforms.
let _deckTex = null;
function deckTexture() {
  if (_deckTex) return _deckTex;
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); const cx = S / 2, cy = S / 2, R = S / 2;
  g.fillStyle = '#232b37'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 26000; i++) {                 // grunge
    const a = Math.random() * 7, r = Math.random() * R, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '10,14,20' : '60,70,86'},${Math.random() * 0.14})`;
    g.fillRect(x, y, 2, 2);
  }
  g.strokeStyle = 'rgba(10,14,20,0.7)'; g.lineWidth = 3;    // concentric panel seams
  for (let k = 1; k <= 8; k++) { g.beginPath(); g.arc(cx, cy, R * k / 9, 0, 7); g.stroke(); }
  g.lineWidth = 2;                                          // radial segments
  for (let a = 0; a < 16; a++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a * Math.PI / 8) * R, cy + Math.sin(a * Math.PI / 8) * R); g.stroke(); }
  for (let a = 0; a < 360; a += 12) {                       // hazard-stripe border
    g.save(); g.translate(cx, cy); g.rotate(a * Math.PI / 180);
    g.fillStyle = (a / 12) % 2 ? '#c9a227' : '#1a1d24';
    g.fillRect(R * 0.9, -R * 0.11, R * 0.1 * 1.1, R * 0.11 * 2); g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  _deckTex = t; return t;
}
// Scanned PBR plate maps (CC0 ambientCG MetalPlates006) tiled under the
// procedural deck markings — per-texture UV transforms (r152+) let the colour
// stay full-circle while normal/roughness/metalness tile 6x for real relief.
let _pbrDeck = null;
function pbrDeckMaps() {
  if (_pbrDeck) return _pbrDeck;
  const mk = (file, srgb) => {
    const t = texLoader.load(`./env/${file}`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  _pbrDeck = { normalMap: mk('deck_normal.jpg'), roughnessMap: mk('deck_rough.jpg'),
               metalnessMap: mk('deck_metal.jpg'), normalScale: new THREE.Vector2(0.9, 0.9) };
  return _pbrDeck;
}

function buildPlatform(o) {
  const rad = o.s;
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(rad, rad * 0.92, 2.4, 64),
    new THREE.MeshStandardMaterial({ color: 0x28313f, roughness: 0.55, metalness: 0.65 }));
  disc.position.set(o.x, -1.2, o.z); disc.receiveShadow = true; disc.castShadow = true; scene.add(disc);
  const deck = new THREE.Mesh(
    new THREE.CircleGeometry(rad * 0.985, 64),
    Object.assign(new THREE.MeshStandardMaterial({ map: deckTexture(), roughness: 0.9, metalness: 0.6 }),
      pbrDeckMaps()));   // real scanned plate relief under the procedural markings
  deck.rotation.x = -Math.PI / 2; deck.position.set(o.x, 0.06, o.z); deck.receiveShadow = true; scene.add(deck);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(rad, 0.35, 12, 96),
    new THREE.MeshStandardMaterial({ color: 0x2a3550, emissive: 0x3f8bff, emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.4 }));
  rim.rotation.x = Math.PI / 2; rim.position.set(o.x, 0.05, o.z); scene.add(rim);
}

// Factory atmosphere: warm work lighting + rising vapour so the Slakkenspoor
// reads as a live, lit plant rather than models on a dark disc.
const steam = [];
let _steamTex = null;
function steamTexture() {
  if (_steamTex) return _steamTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const rg = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  rg.addColorStop(0, 'rgba(230,238,250,0.9)'); rg.addColorStop(0.5, 'rgba(210,222,240,0.4)'); rg.addColorStop(1, 'rgba(210,222,240,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; _steamTex = t; return t;
}
function buildFactoryAtmosphere(cx, cz) {
  for (const [dx, dz] of [[-24, 0], [0, 6], [22, -6]]) {           // warm work lamps (cheap, no shadows)
    const pl = new THREE.PointLight(0xffcf96, 60, 70, 2); pl.position.set(cx + dx, 12, cz + dz); scene.add(pl);
  }
  const tex = steamTexture();
  for (let i = 0; i < 30; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
    sp.userData = { bx: cx - 42 + Math.random() * 84, bz: cz - 9 + Math.random() * 18, t: Math.random() };
    scene.add(sp); steam.push(sp);
  }
}
function updateSteam(dt) {
  for (const sp of steam) {
    const u = sp.userData; u.t += dt * 0.12; if (u.t > 1) u.t -= 1;
    const s = 5 + u.t * 9;
    sp.position.set(u.bx, 2 + u.t * 13, u.bz); sp.scale.set(s, s, 1);
    sp.material.opacity = Math.sin(u.t * Math.PI) * 0.2;
  }
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
  composer.setSize(w, h); bloom.setSize(w / 2, h / 2);   // keep bloom half-res
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

// ---------- player controller: W forward, S back, A/D strafe, mouse look ----------
const player = { pos: new THREE.Vector3(0, 1.8, 30), yaw: Math.PI, pitch: -0.02, speed: 30 };
const CAMS = {
  street: { pos: [0, 1.8, 46], yaw: Math.PI, pitch: -0.02 },
  overview: { pos: [60, 150, 90], yaw: -2.485, pitch: -0.74 },       // aerial of the whole archipelago
  factory: { pos: [-90, 62, 44], yaw: -2.09, pitch: -0.64 },          // the Slakkenspoor processing line
  biome: { pos: [0, 26, -95], yaw: Math.PI, pitch: -0.8 },            // the periodic table (element collection)
  pt: { pos: [16.6, 1.8, -128], yaw: Math.PI, pitch: 0.02 },          // standing in the table (by Oxygen)
  tank: { pos: [-110, 4.0, 17], yaw: -2.42, pitch: 0.04 },            // close-up: the HD leaching reactor
  plaza: { pos: [6, 1.8, 10], yaw: -0.6, pitch: 0.0 },
  plaza2: { pos: [6, 1.8, 30], yaw: Math.PI, pitch: -0.03 },  // looks toward plaza (for MP demo)
};
const preset = CAMS[params.get('cam')];
if (preset) { player.pos.set(...preset.pos); player.yaw = preset.yaw; player.pitch = preset.pitch; }
const keys = {};
// Analog input from Quest Touch controllers / gamepads (fed by pollGamepads):
// mx/mz = left-stick move, lx/ly = right-stick look, sprint = stick click.
const pad = { mx: 0, mz: 0, lx: 0, ly: 0, sprint: false };
addEventListener('keydown', (e) => { keys[e.code] = true; });
addEventListener('keyup', (e) => { keys[e.code] = false; });
const canvas = renderer.domElement;
canvas.addEventListener('click', () => canvas.requestPointerLock && canvas.requestPointerLock());
// Intro overlay: "the Roblox teaser continues on the web" — dismiss to enter.
const introBtn = document.getElementById('intro-btn');
if (introBtn) introBtn.addEventListener('click', () => {
  const el = document.getElementById('intro'); if (el) el.style.display = 'none';
  if (canvas.requestPointerLock) canvas.requestPointerLock();
});
// Deep-links (a cam preset) or ?nointro skip the entry screen.
if (params.get('cam') || params.get('nointro')) {
  const el = document.getElementById('intro'); if (el) el.style.display = 'none';
}
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
  const sp = player.speed * ((keys['ShiftLeft'] || pad.sprint) ? 2.2 : 1);
  if (keys['KeyW'] || keys['ArrowUp']) mv.add(fwd);      // W = forward
  if (keys['KeyS'] || keys['ArrowDown']) mv.sub(fwd);    // S = backward
  if (keys['KeyD'] || keys['ArrowRight']) mv.add(right);
  if (keys['KeyA'] || keys['ArrowLeft']) mv.sub(right);
  if (pad.mx || pad.mz) {                                 // gamepad left stick (analog)
    mv.add(fwd.clone().multiplyScalar(-pad.mz)).add(right.clone().multiplyScalar(pad.mx));
  }
  if (pad.lx || pad.ly) {                                 // gamepad right stick = look
    player.yaw -= pad.lx * dt * 2.6;
    player.pitch = Math.max(-1.3, Math.min(1.0, player.pitch - pad.ly * dt * 2.0));
  }
  if (mv.lengthSq() > 0) {
    mv.normalize();
    player.pos.add(mv.clone().multiplyScalar(sp * dt));
    player.vel = mv.multiplyScalar(sp);          // units/s — feeds predictive prefetch
  } else if (player.vel) player.vel.multiplyScalar(0.9);
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
  obj.traverse((n) => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; if (n.material) n.material.envMapIntensity = 1.1; } });
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

// ---------- client-side reactor: the same chemistry, no server needed ----------
// Ports process_sim.py so the process loop (operate -> V2O5 -> sell) works on a
// static host where the Python sim isn't running (the normal case for a published
// site). Activates whenever the sim is unreachable.
const CR = {
  temperature: 70, pressure: 180, flowRate: 4, pH: 2.5, reactorVolume: 50,
  particleSize: 'ground', deironized: false, roasted: false,
  conversion: 0, v2o5_kg: 0, batches: 0, manual: false, _tempTarget: 70, _t: 0,
};
let crClientActive = false;                       // true once we know there's no server
const LEACH_MULT = { chunk: 7, crushed: 3, ground: 1, powder: 0.3 };
const PRECIP = { Fe: [3.0, 4.5], Al: [4.0, 5.5], V: [1.8, 3.0] };
const clampf = (x, a, b) => Math.max(a, Math.min(b, x));
const arrheniusM = (tc, ea = 50) => Math.exp(-(ea * 1000) / 8.314 * (1 / (tc + 273.15) - 1 / 298.15));
const pressureM = (kPa) => clampf(kPa / 101.325, 0.3, 4);
const residenceM = (flow, vol) => (flow <= 0 ? 1 : clampf((1 - Math.exp(-((vol / flow) / 30))) / 0.632, 0.1, 1.5));
function precipF(metal, pH) { const w = PRECIP[metal]; if (!w) return 0; if (pH <= w[0]) return 0; if (pH >= w[1]) return 1; return (pH - w[0]) / (w[1] - w[0]); }
const crRate = () => arrheniusM(CR.temperature) * pressureM(CR.pressure) * residenceM(CR.flowRate, CR.reactorVolume);
const crRecovery = () => CR.conversion * precipF('V', CR.pH) * (CR.deironized ? 1 : (1 - precipF('Fe', CR.pH))) * (1 - precipF('Al', CR.pH));
function crTick(dt) {
  CR._t += dt;
  if (CR.manual) CR.temperature += (CR._tempTarget - CR.temperature) * Math.min(1, dt * 0.6);
  else CR.temperature = 70 + 18 * Math.sin(CR._t * 0.15);
  let k = 0.05 / (LEACH_MULT[CR.particleSize] || 1); if (CR.roasted) k *= 1.25;
  CR.conversion = clampf(CR.conversion + k * crRate() * (1 - CR.conversion) * dt, 0, 1);
  if (CR.conversion >= 0.995) { CR.v2o5_kg += 100 * 0.015 * crRecovery(); CR.batches++; CR.conversion = 0; }
}
const crStateObj = () => ({
  temperature: Math.round(CR.temperature * 10) / 10, pressure: Math.round(CR.pressure * 10) / 10,
  flowRate: CR.flowRate, pH: CR.pH, conversion: Math.round(CR.conversion * 1000) / 1000,
  rate: Math.round(crRate() * 100) / 100, yield: Math.round(crRecovery() * 1000) / 1000,
  particleSize: CR.particleSize, leachSpeed: Math.round(100 / (LEACH_MULT[CR.particleSize] || 1)) / 100,
  deironized: CR.deironized, roasted: CR.roasted, v2o5: Math.round(CR.v2o5_kg * 100) / 100,
  batches: CR.batches, manual: CR.manual,
});
function crSet(d) {
  CR.manual = true;
  const R = { temperature: [25, 95], pressure: [100, 300], flowRate: [1, 10], pH: [1, 6] };
  for (const k in R) if (k in d) { const v = clampf(+d[k], R[k][0], R[k][1]); if (k === 'temperature') CR._tempTarget = v; else CR[k] = v; }
  if (d.particleSize in LEACH_MULT) CR.particleSize = d.particleSize;
  for (const f of ['deironized', 'roasted']) if (f in d) CR[f] = !!d[f];
}
const crSell = () => { const kg = CR.v2o5_kg; CR.v2o5_kg = 0; return { kg: Math.round(kg * 100) / 100, coins: Math.round(kg * 500) }; };
// Push control changes to the client reactor (works offline) AND the server (if any).
function pushControls(d) {
  crSet(d);
  fetch(SIM_BASE + '/reactor/set', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).catch(() => {});
}
// Render one reactor state object (server- or client-sourced) into the HUD/panel.
function applyReactorState(rx) {
  const rel = document.getElementById('reactor');
  if (rx && rel) rel.innerHTML = `⚗️ leach reactor · ${(rx.conversion * 100) | 0}% converted `
    + `<span style="opacity:.7">· ${rx.temperature}°C · ${rx.pressure}kPa · pH ${rx.pH} · rate ${rx.rate}× (Arrhenius)`
    + `${rx.manual ? '' : ' · idling'}</span>`;
  if (!rx || rx.yield == null) return;
  const yv = document.getElementById('y-val'); if (yv) yv.textContent = `${(rx.yield * 100) | 0}%`;
  const yp = document.getElementById('y-parts'); if (yp) yp.textContent = `= ${(rx.conversion * 100) | 0}% leached × selective pH-precip`;
  if (rx.particleSize) reflectParticleSize(rx.particleSize, rx.leachSpeed);
  reflectPrep(rx);
  if (rx.v2o5 != null) {
    const pv = document.getElementById('p-val'); if (pv) pv.textContent = `${rx.v2o5.toFixed(2)} kg`;
    const pb = document.getElementById('p-batches'); if (pb) pb.textContent = rx.batches ? `· ${rx.batches} batch${rx.batches === 1 ? '' : 'es'}` : '';
    if (lastBatches >= 0 && rx.batches > lastBatches && pv) { pv.classList.add('flash'); setTimeout(() => pv.classList.remove('flash'), 500); }
    lastBatches = rx.batches;
  }
  if (!controlsSynced && MOLECULIA) {
    controlsSynced = true;
    const fmt = { temperature: (v) => `${v | 0}°C`, pressure: (v) => `${v | 0} kPa`, flowRate: (v) => (+v).toFixed(1), pH: (v) => (+v).toFixed(1) };
    for (const key of ['temperature', 'pressure', 'flowRate', 'pH']) {
      const el = document.getElementById('c-' + key), lab = document.getElementById('v-' + key);
      if (el && rx[key] != null) { el.value = rx[key]; if (lab) lab.textContent = fmt[key](rx[key]); }
    }
  }
}
let controlsSynced = false;   // sync the slider panel to the reactor once, on first poll
let lastBatches = -1;          // detect batch completion to flash the product tally

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
    applyReactorState(st.reactor);
  } catch (e) {
    simOk = false;                          // no server -> the client reactor drives the process
    const el = document.getElementById('sim');
    if (el) el.textContent = MOLECULIA ? '⚗️ process chemistry running in-browser (no server needed)'
                                       : '🐍 Python sim offline (static world) — run sim_server.py';
  }
  setTimeout(pollSim, simOk ? simPollMs : 3000);   // back off when there's no server
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
  // C&C-style predictive map pre-fill: project the player 4 s along their
  // velocity and warm the GLB prototypes there, so the next sector's models are
  // already parsed when you arrive (no pop-in hitch).
  if (player.vel && player.vel.lengthSq() > 4) {
    const fx = px + player.vel.x * 4, fz = pz + player.vel.z * 4;
    for (const i of assetIdx) {
      const o = objects[i];
      if (glbProto.has(o.ref)) continue;
      const dx = o.x - fx, dz = o.z - fz;
      if (dx * dx + dz * dz > STREAM_IN * STREAM_IN) continue;
      glbProto.set(o.ref, 'loading');
      gltfLoader.loadAsync(`${ASSET_BASE.model}${o.ref}`)
        .then((g) => glbProto.set(o.ref, g.scene)).catch(() => glbProto.delete(o.ref));
    }
  }
  // Doom-style sector culling for the cheap sprite layers: element tiles and
  // steam only draw when their sector is near the player.
  if (elementSprites.size) {
    for (const rec of elementSprites.values()) {
      const dx = rec.o.x - px, dz = rec.o.z - pz;
      rec.sprite.visible = dx * dx + dz * dz < 150 * 150;
    }
  }
  for (const sp of steam) {
    const u = sp.userData, dx = u.bx - px, dz = u.bz - pz;
    sp.visible = dx * dx + dz * dz < 170 * 170;
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
  // Smooth locomotion: thumbstick walks along the headset gaze (XZ plane),
  // implemented as a growing reference-space offset so the physical play space
  // stays intact. Without this the world was explore-by-walking-only on Quest.
  const loco = { x: 0, z: 0, base: null };
  const xrFwd = new THREE.Vector3();
  session.__pollButtons = (dt) => {
    for (const src of session.inputSources) {
      const gp = src.gamepad; if (!gp) continue;
      src._prev = src._prev || [];
      gp.buttons.forEach((b, i) => {
        if (i >= 4 && b.pressed && !src._prev[i]) toggleAR();     // face buttons (A/B/X/Y)
        src._prev[i] = b.pressed;
      });
      const ax = Math.abs(gp.axes[2] || 0) > 0.16 ? gp.axes[2] : 0;   // xr-standard thumbstick
      const ay = Math.abs(gp.axes[3] || 0) > 0.16 ? gp.axes[3] : 0;
      if ((ax || ay) && dt) {
        camera.getWorldDirection(xrFwd); xrFwd.y = 0; xrFwd.normalize();
        const right = { x: -xrFwd.z, z: xrFwd.x };
        const sp = 6 * dt;                                    // m/s, comfortable pace
        loco.x += (xrFwd.x * -ay + right.x * ax) * sp;
        loco.z += (xrFwd.z * -ay + right.z * ax) * sp;
        loco.base = loco.base || renderer.xr.getReferenceSpace();
        if (loco.base && window.XRRigidTransform) renderer.xr.setReferenceSpace(
          loco.base.getOffsetReferenceSpace(new XRRigidTransform({ x: -loco.x, y: 0, z: -loco.z })));
      }
    }
  };
  session.addEventListener('end', () => { scene.background = skyBg; if (xrBtn) xrBtn.disabled = false; });
}
if (xrBtn) xrBtn.addEventListener('click', () => { xrBtn.disabled = true; enterXR().catch((e) => { xrBtn.disabled = false; if (xrStat) xrStat.textContent = '🕶️ XR start failed: ' + e.message; }); });
detectXR();

// ---------- Quest Touch / gamepad in the flat browser + 🎬 cinema mode ----------
// The Meta Quest Browser exposes the Touch controllers through the Gamepad API
// but maps nothing to the page, so the game was unplayable on a Quest 3S without
// a paired mouse. Two modes, switched automatically:
//  · world mode — left stick walks (analog), right stick looks, stick-click
//    sprints; plays exactly like WASD + pointer lock.
//  · cursor mode — whenever a DOM panel is open (intro/fertlab/farm/factory/
//    chemsim): the sticks drive a virtual cursor and the trigger clicks, i.e.
//    the controller behaves as a mouse. B/squeeze closes the panel (Escape).
// Cinema: fullscreen is what makes the Quest Browser expand the page onto its
// big curved theater screen; on desktop it is a plain fullscreen toggle.
const OVERLAY_IDS = ['intro', 'fertlab', 'farm', 'factory', 'chemsim'];
const overlayOpen = () => OVERLAY_IDS.some((id) => {
  const el = document.getElementById(id);
  return el && getComputedStyle(el).display !== 'none';
});
let gpCursor = null, gpX = innerWidth / 2, gpY = innerHeight / 2, gpSeen = 0;
const gpPrev = {};                       // per-pad button state for edge detection
function gpEnsureCursor() {
  if (gpCursor) return gpCursor;
  gpCursor = document.createElement('div');
  gpCursor.style.cssText = 'position:fixed;left:0;top:0;width:20px;height:20px;'
    + 'margin:-10px 0 0 -10px;border:2px solid #6ffcda;border-radius:50%;'
    + 'background:rgba(111,252,218,.22);box-shadow:0 0 10px rgba(111,252,218,.6);'
    + 'pointer-events:none;z-index:99;transition:opacity .3s;opacity:0';
  document.body.appendChild(gpCursor);
  return gpCursor;
}
function gpClick() {
  const el = document.elementFromPoint(gpX, gpY);
  if (!el) return;
  const init = { bubbles: true, cancelable: true, clientX: gpX, clientY: gpY, view: window, button: 0 };
  el.dispatchEvent(new PointerEvent('pointerdown', init));
  el.dispatchEvent(new MouseEvent('mousedown', init));
  el.dispatchEvent(new PointerEvent('pointerup', init));
  el.dispatchEvent(new MouseEvent('mouseup', init));
  el.dispatchEvent(new MouseEvent('click', init));
}
const gpDead = (v) => (Math.abs(v) > 0.16 ? v : 0);
function pollGamepads(dt, now) {
  pad.mx = pad.mz = pad.lx = pad.ly = 0;
  if (renderer.xr.isPresenting || !navigator.getGamepads) return;
  const inPanel = overlayOpen();
  let active = false;
  for (const gp of navigator.getGamepads()) {
    if (!gp || !gp.connected) continue;
    const ax0 = gpDead(gp.axes[0] || 0), ay0 = gpDead(gp.axes[1] || 0);
    const ax1 = gpDead(gp.axes[2] || 0), ay1 = gpDead(gp.axes[3] || 0);
    if (ax0 || ay0 || ax1 || ay1) active = true;
    if (inPanel) {                       // cursor mode: either stick moves the cursor
      gpX = Math.max(0, Math.min(innerWidth, gpX + (ax0 + ax1) * 1000 * dt));
      gpY = Math.max(0, Math.min(innerHeight, gpY + (ay0 + ay1) * 1000 * dt));
    } else {                             // world mode: move + look
      pad.mx += ax0; pad.mz += ay0; pad.lx += ax1; pad.ly += ay1;
    }
    const prev = gpPrev[gp.index] || (gpPrev[gp.index] = {});
    gp.buttons.forEach((b, i) => {
      const was = prev[i] || false; prev[i] = b.pressed;
      if (b.pressed === was) return;
      active = true;
      if (i === 0 && b.pressed && inPanel) gpClick();               // trigger/A = click
      if (i === 0 && b.pressed && !inPanel) gpX = innerWidth / 2, gpY = innerHeight / 2;
      if (i === 1 && b.pressed) {                                   // squeeze/B = close panel
        for (const id of OVERLAY_IDS) {
          const el = document.getElementById(id);
          if (el && id !== 'intro' && getComputedStyle(el).display !== 'none') el.style.display = 'none';
        }
      }
      if ((i === 10 || i === 11) && !inPanel) pad.sprint = b.pressed; // stick click = sprint
    });
  }
  if (active && inPanel) {
    gpSeen = now;
    gpEnsureCursor().style.opacity = '1';
    gpCursor.style.left = gpX + 'px'; gpCursor.style.top = gpY + 'px';
    const el = document.elementFromPoint(gpX, gpY);
    if (el) el.dispatchEvent(new PointerEvent('pointermove',
      { bubbles: true, clientX: gpX, clientY: gpY, pointerType: 'mouse' }));
  } else if (gpCursor && (!inPanel || now - gpSeen > 4000)) {
    gpCursor.style.opacity = '0';
  }
}

// 🎬 cinema-mode button (bottom of the right-hand button stack)
const cinemaBtn = document.getElementById('cinema-btn');
if (cinemaBtn) {
  cinemaBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    cinemaBtn.textContent = document.fullscreenElement ? '🎬 Exit cinema' : '🎬 Cinema';
  });
}

// ---------- Slakkenspoor process controls (player = plant operator) ----------
// The player drives the real chemistry: the sliders POST setpoints to the Python
// sim, which owns the reactor (server authority). Yield = how much vanadium is
// recovered (leached x precipitated at the chosen pH) — a real, teachable optimum.
function initControls() {
  const panel = document.getElementById('controls');
  if (!panel) return;
  panel.style.display = 'block';
  const fmt = { temperature: (v) => `${v | 0}°C`, pressure: (v) => `${v | 0} kPa`,
                flowRate: (v) => (+v).toFixed(1), pH: (v) => (+v).toFixed(1) };
  let timer = null, pending = {};
  const flush = () => { timer = null; pushControls(pending); pending = {}; };
  for (const key of ['temperature', 'pressure', 'flowRate', 'pH']) {
    const el = document.getElementById('c-' + key), lab = document.getElementById('v-' + key);
    if (!el) continue;
    el.addEventListener('input', () => {
      lab.textContent = fmt[key](el.value);
      pending[key] = parseFloat(el.value);
      if (!timer) timer = setTimeout(flush, 120);
    });
  }
  // Feed particle size from the crushing chain — sets the leach speed.
  for (const b of document.querySelectorAll('#grind button')) {
    b.addEventListener('click', () => pushControls({ particleSize: b.dataset.size }));
  }
  // Pre-leach stations: magnetic separation + roasting (toggles).
  for (const b of document.querySelectorAll('#prep button')) {
    b.addEventListener('click', () => pushControls({ [b.dataset.flag]: !b.classList.contains('on') }));
  }
}
function reflectPrep(rx) {
  for (const b of document.querySelectorAll('#prep button')) b.classList.toggle('on', !!rx[b.dataset.flag]);
}
function reflectParticleSize(size, leachSpeed) {
  for (const b of document.querySelectorAll('#grind button')) b.classList.toggle('on', b.dataset.size === size);
  const ls = document.getElementById('v-leach');
  if (ls && leachSpeed != null) ls.textContent = `${leachSpeed}×`;
}

// ---------- Periodic Table Biome: collect all 118 elements ----------
// Elements are laid out as a real periodic table (from the game's Elements data).
// Walk up to a tile to collect it; progress persists in localStorage. This is the
// game's second core loop (mine/collect the 118 elements) continued on the web.
let elements = [];
const elementSprites = new Map();       // num -> { sprite, o }
const COLLECT_KEY = 'molgang.collected';
let collected = new Set();
try { collected = new Set(JSON.parse(localStorage.getItem(COLLECT_KEY) || '[]')); } catch (e) { /* fresh */ }

function elementTexture(o, isCollected) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const [r, gr, b] = o.rgb || [180, 190, 210];
  g.fillStyle = `rgb(${r},${gr},${b})`; roundRect(g, 6, 6, 116, 116, 14); g.fill();
  g.strokeStyle = isCollected ? '#7fffb0' : 'rgba(255,255,255,0.55)';
  g.lineWidth = isCollected ? 7 : 3; roundRect(g, 6, 6, 116, 116, 14); g.stroke();
  const lum = 0.299 * r + 0.587 * gr + 0.114 * b;    // dark text on light tiles
  g.fillStyle = lum > 150 ? '#101216' : '#f4f8ff'; g.textAlign = 'center';
  g.font = '20px system-ui'; g.fillText(String(o.num), 64, 34);
  g.font = 'bold 52px system-ui'; g.fillText(o.ref, 64, 88);
  if (isCollected) { g.fillStyle = '#7fffb0'; g.font = 'bold 32px system-ui'; g.fillText('✓', 102, 42); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function buildElements() {
  for (const o of elements) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: elementTexture(o, collected.has(o.num)), transparent: true }));
    sp.position.set(o.x, 1.8, o.z); sp.scale.set(2.1, 2.1, 1);
    scene.add(sp);
    elementSprites.set(o.num, { sprite: sp, o });
  }
  updateElementHUD();
}
function updateElementHUD() {
  const el = document.getElementById('elements');
  if (el) el.textContent = `🧪 elements collected: ${collected.size} / 118`;
}
let _popTimer = null;
function showElementPopup(o) {
  const pop = document.getElementById('elpop'); if (!pop) return;
  const [r, g, b] = o.rgb || [180, 190, 210];
  const sym = document.getElementById('ep-sym');
  sym.textContent = o.ref; sym.style.color = `rgb(${r},${g},${b})`;
  document.getElementById('ep-nm').textContent = `${o.num} · ${o.name}`;
  document.getElementById('ep-ft').textContent = o.fact || '';
  document.getElementById('ep-ct').textContent = `collected ${collected.size} / 118`;
  pop.style.display = 'block';
  clearTimeout(_popTimer); _popTimer = setTimeout(() => { pop.style.display = 'none'; }, 3200);
}
function checkCollect() {
  if (!elements.length) return;
  const px = player.pos.x, pz = player.pos.z;
  for (const [num, rec] of elementSprites) {
    if (collected.has(num)) continue;
    const dx = rec.o.x - px, dz = rec.o.z - pz;
    if (dx * dx + dz * dz < 6.25) {                  // within 2.5 m
      collected.add(num);
      try { localStorage.setItem(COLLECT_KEY, JSON.stringify([...collected])); } catch (e) { /* quota */ }
      rec.sprite.material.map.dispose();
      rec.sprite.material.map = elementTexture(rec.o, true);
      rec.sprite.material.needsUpdate = true;
      showElementPopup(rec.o);
      updateElementHUD();
    }
  }
}

// ---------- Fertilizer Lab: synthesize fertilizers from collected elements ----------
// The game's fertilizer track (real NPK + atom recipes) links the two loops:
// collect the elements, then synthesize a fertilizer once you have its atoms.
let fertilizers = [];
const symToNum = new Map();
const FERT_KEY = 'molgang.fertilizers';
let fertInv = {};
try { fertInv = JSON.parse(localStorage.getItem(FERT_KEY) || '{}'); } catch (e) { /* fresh */ }

const fertMade = () => Object.values(fertInv).reduce((a, b) => a + b, 0);
const haveElement = (sym) => { const n = symToNum.get(sym); return n != null && collected.has(n); };
const canSynthesize = (f) => Object.keys(f.atoms).every(haveElement);

function refreshFertRow(row, f) {
  for (const sp of row.querySelectorAll('.atoms span')) sp.classList.toggle('have', haveElement(sp.dataset.sym));
  const ok = canSynthesize(f), btn = row.querySelector('.mk');
  btn.disabled = !ok; btn.textContent = ok ? 'Synthesize' : 'Need elements';
  row.querySelector('.cnt').textContent = fertInv[f.id] ? `×${fertInv[f.id]}` : '';
}
function buildFertilizerLab() {
  for (const o of elements) symToNum.set(o.ref, o.num);
  const list = document.getElementById('fert-list');
  if (!list) return;
  list.innerHTML = '';
  for (const f of fertilizers) {
    const row = document.createElement('div'); row.className = 'fert';
    const [r, g, b] = f.rgb;
    row.innerHTML =
      `<div class="sw" style="background:rgb(${r},${g},${b})"></div>` +
      `<div class="info"><div class="nm">${f.name}</div><div class="fo">${f.formula}</div>` +
      `<div class="atoms">${Object.entries(f.atoms).map(([s, n]) => `<span data-sym="${s}">${s}${n > 1 ? '×' + n : ''}</span>`).join('')}</div></div>` +
      `<div class="npk">NPK<b>${f.npk.join('-')}</b></div>` +
      `<button class="mk" type="button">Synthesize</button><div class="cnt"></div>`;
    row.querySelector('.mk').addEventListener('click', () => {
      if (!canSynthesize(f)) return;
      fertInv[f.id] = (fertInv[f.id] || 0) + 1;
      try { localStorage.setItem(FERT_KEY, JSON.stringify(fertInv)); } catch (e) { /* quota */ }
      refreshFertRow(row, f); document.getElementById('fl-made').textContent = fertMade();
    });
    list.appendChild(row); refreshFertRow(row, f);
  }
  document.getElementById('fl-made').textContent = fertMade();
}
function openFertLab() {
  const rows = document.querySelectorAll('#fert-list .fert');   // collected set may have grown
  fertilizers.forEach((f, i) => { if (rows[i]) refreshFertRow(rows[i], f); });
  document.getElementById('fertlab').style.display = 'flex';
  if (document.exitPointerLock) document.exitPointerLock();
}
(function wireFertLab() {
  const btn = document.getElementById('fert-btn'), close = document.getElementById('fl-close');
  if (btn) btn.addEventListener('click', openFertLab);
  if (close) close.addEventListener('click', () => { document.getElementById('fertlab').style.display = 'none'; });
  addEventListener('keydown', (e) => { if (e.code === 'KeyF') openFertLab(); });
})();

// ---------- Farm: apply fertilizers to crops under Liebig's Law ----------
// Yield is capped by the scarcest nutrient relative to the crop's ideal N-P-K —
// so over-applying one nutrient can't make up for a missing one. Closes the loop:
// process -> fertilizer -> crop.
let crops = [];
const fertById = new Map();
let currentCrop = null;
let plot = { N: 0, P: 0, K: 0 };
const HARVEST_KEY = 'molgang.harvests';
let harvests = {};
try { harvests = JSON.parse(localStorage.getItem(HARVEST_KEY) || '{}'); } catch (e) { /* fresh */ }

function liebig() {
  if (!currentCrop) return { yield: 0, limit: -1 };
  const id = currentCrop.idealNPK;
  const ratios = [plot.N / id[0], plot.P / id[1], plot.K / id[2]];
  let limit = 0;
  for (let i = 1; i < 3; i++) if (ratios[i] < ratios[limit]) limit = i;
  return { yield: Math.max(0, Math.min(1, ratios[limit])), limit, ratios };
}
function renderPlot() {
  if (!currentCrop) return;
  const id = currentCrop.idealNPK, L = liebig();
  document.getElementById('pl-crop').textContent = currentCrop.name;
  document.getElementById('pl-ideal').textContent = id.join('-');
  const names = ['N', 'P', 'K'], applied = [plot.N, plot.P, plot.K];
  document.getElementById('npk-bars').innerHTML = names.map((n, i) => {
    const ratio = applied[i] / id[i], pct = Math.min(1, ratio) * 100;
    const col = ratio >= 1 ? '#7fe0a0' : '#e0b57f';
    return `<div class="bar ${i === L.limit ? 'limit' : ''}"><span class="lbl">${n} ${applied[i]}/${id[i]}</span>`
      + `<span class="track"><span class="fill" style="width:${pct}%;background:${col}"></span></span>`
      + `<span class="num">${(ratio * 100) | 0}%</span></div>`;
  }).join('');
  document.getElementById('pl-yield').textContent = `${(L.yield * 100) | 0}%`;
  document.getElementById('pl-limit').textContent = L.yield < 1 && L.limit >= 0 ? `· limited by ${names[L.limit]}` : (L.yield >= 1 ? '· fully fed!' : '');
  document.getElementById('pl-harvest').disabled = L.yield <= 0;
}
function renderApplyList() {
  const list = document.getElementById('apply-list'); if (!list) return;
  const avail = fertilizers.filter((f) => (fertInv[f.id] || 0) > 0);
  list.innerHTML = avail.length ? '' : '<div class="fl-sub">No fertilizers yet — synthesize some in the Fertilizer Lab (🌱).</div>';
  for (const f of avail) {
    const row = document.createElement('div'); row.className = 'appl';
    row.innerHTML = `<div class="info"><div class="nm">${f.name}</div><div class="np">NPK ${f.npk.join('-')}</div></div>`
      + `<div class="cnt">×${fertInv[f.id]}</div><button type="button">Apply</button>`;
    row.querySelector('button').addEventListener('click', () => {
      if ((fertInv[f.id] || 0) <= 0 || !currentCrop) return;
      fertInv[f.id]--; try { localStorage.setItem(FERT_KEY, JSON.stringify(fertInv)); } catch (e) { /* quota */ }
      plot.N += f.npk[0]; plot.P += f.npk[1]; plot.K += f.npk[2];
      renderPlot(); renderApplyList();
    });
    list.appendChild(row);
  }
}
function selectCrop(c) {
  currentCrop = c; plot = { N: 0, P: 0, K: 0 };
  for (const b of document.querySelectorAll('#crop-row button')) b.classList.toggle('on', b.dataset.id === c.id);
  renderPlot();
}
function buildFarm() {
  for (const f of fertilizers) fertById.set(f.id, f);
  const row = document.getElementById('crop-row'); if (!row) return;
  row.innerHTML = '';
  for (const c of crops) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.id = c.id;
    b.innerHTML = `<b>${c.name}</b>NPK ${c.idealNPK.join('-')} · ${c.growthDays}d`;
    b.addEventListener('click', () => selectCrop(c));
    row.appendChild(b);
  }
  document.getElementById('pl-harvest').addEventListener('click', () => {
    const L = liebig(); if (L.yield <= 0 || !currentCrop) return;
    harvests[currentCrop.id] = (harvests[currentCrop.id] || 0) + 1;
    try { localStorage.setItem(HARVEST_KEY, JSON.stringify(harvests)); } catch (e) { /* quota */ }
    const y = (L.yield * 100) | 0;
    const revenue = Math.round(currentCrop.growthDays * 100 * L.yield);   // longer crops pay more
    earn(revenue);
    plot = { N: 0, P: 0, K: 0 }; renderPlot(); renderApplyList();
    const pl = document.getElementById('pl-limit'); if (pl) pl.textContent = `· harvested ${currentCrop.name} at ${y}% → +${revenue} 💰`;
  });
  if (crops.length) selectCrop(crops[0]);
}
function openFarm() {
  renderApplyList(); renderPlot();
  document.getElementById('farm').style.display = 'flex';
  if (document.exitPointerLock) document.exitPointerLock();
}
(function wireFarm() {
  const btn = document.getElementById('farm-btn'), close = document.getElementById('fm-close');
  if (btn) btn.addEventListener('click', openFarm);
  if (close) close.addEventListener('click', () => { document.getElementById('farm').style.display = 'none'; });
})();

// ---------- MolCoin economy: the loop that ties the five systems together ----------
// V2O5 sales (process) + harvests (farm) earn MolCoins; factory equipment costs
// them. One shared balance turns five systems into one game.
const MC_KEY = 'molgang.molcoins';
let molcoins = 20000;                            // starter capital (enough for a first machine)
try { const v = JSON.parse(localStorage.getItem(MC_KEY)); if (Number.isFinite(v)) molcoins = v; } catch (e) { /* fresh */ }
function saveMc() { try { localStorage.setItem(MC_KEY, JSON.stringify(molcoins)); } catch (e) { /* quota */ } }
function updateMcHUD(flash) {
  const el = document.getElementById('mc-val'); if (el) el.textContent = molcoins.toLocaleString();
  if (flash) { const m = document.getElementById('molcoins'); if (m) { m.classList.add('flash'); setTimeout(() => m.classList.remove('flash'), 500); } }
}
function earn(n) { molcoins += n; saveMc(); updateMcHUD(true); }
function spend(n) { if (molcoins < n) return false; molcoins -= n; saveMc(); updateMcHUD(false); return true; }
function flashCantAfford() {
  const m = document.getElementById('molcoins'); if (!m) return;
  m.style.borderColor = '#ff7a6f'; setTimeout(() => { m.style.borderColor = '#b58a2c'; }, 450);
}
let hasSold = false;
try { hasSold = JSON.parse(localStorage.getItem('molgang.sold') || 'false'); } catch (e) { /* fresh */ }
(function wireSell() {
  const b = document.getElementById('sell-btn');
  const bank = (d) => { if (d && d.coins > 0) { earn(d.coins); hasSold = true; try { localStorage.setItem('molgang.sold', 'true'); } catch (e) { /* quota */ } } };
  if (b) b.addEventListener('click', () => {
    if (simOk) fetch(SIM_BASE + '/reactor/sell', { method: 'POST' }).then((r) => r.json()).then(bank).catch(() => bank(crSell()));
    else bank(crSell());                          // no server -> sell from the client reactor
  });
})();

// Onboarding: surface the connected loop and tick each step off live, read from
// the systems' own state — no new bookkeeping, just legibility for new players.
function updateGoals() {
  const el = document.getElementById('goals'); if (!el || el.style.display === 'none') return;
  const done = {
    collect: collected.size >= 1,
    fertilize: Object.values(fertInv).reduce((a, b) => a + b, 0) >= 1,
    harvest: Object.values(harvests).reduce((a, b) => a + b, 0) >= 1,
    sell: hasSold,
    build: factoryGrid.some(Boolean),
  };
  let n = 0;
  for (const item of el.querySelectorAll('.g-item')) {
    const ok = done[item.dataset.goal]; if (ok) n++;
    item.classList.toggle('done', ok);
    item.querySelector('.tick').textContent = ok ? '✓' : '○';
  }
  el.querySelector('#g-count').textContent = `${n}/5`;
  el.classList.toggle('all-done', n === 5);
  if (n === 5) el.querySelector('.g-head').firstChild.textContent = '🎉 Full loop complete ';
}

// ---------- Factory Builder: place equipment, chase adjacency bonuses ----------
// The game's factory pillar: rent a floor, place equipment, and lay the
// processing chain so partners sit next to each other for adjacency bonuses.
let equipment = [];
const eqById = new Map();
let floorConfig = { maxEquipment: 30, basePowerKW: 100, baseRent: 2000 };
const FGW = 16, FGH = 10;                       // playable UI grid (scaled from 40x25)
let factoryGrid = new Array(FGW * FGH).fill(null);
let selEquip = null;
const FACTORY_KEY = 'molgang.factory';
try { const s = JSON.parse(localStorage.getItem(FACTORY_KEY) || '[]'); for (const c of s) factoryGrid[c.i] = c.id; } catch (e) { /* fresh */ }

function saveFactory() {
  const s = []; factoryGrid.forEach((id, i) => { if (id) s.push({ i, id }); });
  try { localStorage.setItem(FACTORY_KEY, JSON.stringify(s)); } catch (e) { /* quota */ }
}
function cellBonus(i) {                          // active adjacency multiplier for cell i
  const id = factoryGrid[i]; if (!id) return 1;
  const e = eqById.get(id); if (!e || !e.adjacency) return 1;
  const col = i % FGW, nbs = [];
  if (col > 0) nbs.push(i - 1); if (col < FGW - 1) nbs.push(i + 1);
  if (i - FGW >= 0) nbs.push(i - FGW); if (i + FGW < FGW * FGH) nbs.push(i + FGW);
  let mult = 1;
  for (const n of nbs) { const nid = factoryGrid[n]; if (nid && e.adjacency[nid]) mult *= e.adjacency[nid]; }
  return mult;
}
function renderFactory() {
  const placed = [];
  factoryGrid.forEach((id, i) => { if (id) placed.push(i); });
  let cost = 0, power = 0, effSum = 0, bonuses = 0;
  for (const i of placed) {
    const e = eqById.get(factoryGrid[i]); cost += e.cost; power += e.powerKW;
    const m = cellBonus(i); effSum += m; if (m > 1) bonuses++;
  }
  const eff = placed.length ? (effSum / placed.length) : 1;
  const over = power > floorConfig.basePowerKW;
  document.getElementById('fc-stats').innerHTML =
    `<div>Equipment <b>${placed.length}/${floorConfig.maxEquipment}</b></div>`
    + `<div>Build cost <b>${cost.toLocaleString()}</b> MolCoins</div>`
    + `<div class="${over ? 'over' : ''}">Power <b>${power} kW</b> (${floorConfig.basePowerKW} incl.)</div>`
    + `<div>Adjacency links <b>${bonuses}</b></div>`
    + `<div class="eff">Factory efficiency <b>${(eff * 100) | 0}%</b></div>`;
  const grid = document.getElementById('eq-grid');
  [...grid.children].forEach((cell, i) => {
    const id = factoryGrid[i];
    cell.className = 'cell' + (id ? ' on' : '') + (id && cellBonus(i) > 1 ? ' bonus' : '');
    cell.style.background = id ? `rgb(${eqById.get(id).rgb.join(',')})` : '#161c28';
    cell.title = id ? eqById.get(id).name : '';
  });
}
function buildFactory() {
  for (const e of equipment) eqById.set(e.id, e);
  const pal = document.getElementById('eq-palette');
  const cats = [...new Set(equipment.map((e) => e.category))];
  pal.innerHTML = '';
  for (const cat of cats) {
    const h = document.createElement('div'); h.className = 'cat'; h.textContent = cat; pal.appendChild(h);
    for (const e of equipment.filter((x) => x.category === cat)) {
      const row = document.createElement('div'); row.className = 'eq'; row.dataset.id = e.id;
      row.innerHTML = `<span class="sw" style="background:rgb(${e.rgb.join(',')})"></span>`
        + `<span class="nm">${e.name}</span><span class="co">${(e.cost / 1000) | 0}k</span>`;
      row.addEventListener('click', () => {
        selEquip = e.id;
        for (const r of pal.querySelectorAll('.eq')) r.classList.toggle('sel', r.dataset.id === e.id);
      });
      pal.appendChild(row);
    }
  }
  const grid = document.getElementById('eq-grid');
  grid.style.gridTemplateColumns = `repeat(${FGW}, 1fr)`;
  grid.innerHTML = '';
  for (let i = 0; i < FGW * FGH; i++) {
    const cell = document.createElement('div'); cell.className = 'cell';
    cell.addEventListener('click', () => {
      if (factoryGrid[i]) {                                   // remove -> refund
        earn(eqById.get(factoryGrid[i]).cost); factoryGrid[i] = null;
      } else if (selEquip) {                                  // place -> buy
        const placed = factoryGrid.filter(Boolean).length;
        if (placed >= floorConfig.maxEquipment) return;
        if (!spend(eqById.get(selEquip).cost)) { flashCantAfford(); return; }
        factoryGrid[i] = selEquip;
      }
      saveFactory(); renderFactory();
    });
    grid.appendChild(cell);
  }
  renderFactory();
}
function openFactory() {
  document.getElementById('factory').style.display = 'flex';
  if (document.exitPointerLock) document.exitPointerLock();
}
(function wireFactory() {
  const b = document.getElementById('build-btn'), c = document.getElementById('fc-close');
  if (b) b.addEventListener('click', openFactory);
  if (c) c.addEventListener('click', () => { document.getElementById('factory').style.display = 'none'; });
})();

// ---------- ChemSim: the paid in-game chemical simulator ----------
// The chemistry-set console in the Quantum Lab. For MolCoins the player runs
// the process model FORWARD: predicted rate, batch time and V2O5/hour for any
// hypothetical settings (250), or a full pH sweep that plots the selectivity
// optimum (400) — pay for foresight instead of wasting slow real batches.
let chemsimPos = null;
const CS_RUN = 250, CS_SWEEP = 400;
function csParams() {
  return { temperature: +document.getElementById('cs-temperature').value,
    pressure: +document.getElementById('cs-pressure').value,
    flowRate: +document.getElementById('cs-flowRate').value,
    pH: +document.getElementById('cs-pH').value,
    size: document.getElementById('cs-size').value,
    deiron: document.getElementById('cs-deiron').checked,
    roast: document.getElementById('cs-roast').checked };
}
function csPredict(p) {
  const rate = arrheniusM(p.temperature) * pressureM(p.pressure) * residenceM(p.flowRate, 50);
  let k = 0.05 / (LEACH_MULT[p.size] || 1); if (p.roast) k *= 1.25;
  const batchMin = 5.3 / (k * rate);                     // ln(200): time to 99.5% conversion
  const rec = precipF('V', p.pH) * (p.deiron ? 1 : 1 - precipF('Fe', p.pH)) * (1 - precipF('Al', p.pH));
  const kgBatch = 1.5 * rec, kgHr = batchMin > 0 ? kgBatch * 60 / batchMin : 0;
  return { rate, batchMin, rec, kgBatch, kgHr, coinsHr: kgHr * 500 };
}
function csNearConsole() {
  if (params.get('chemsim')) return true;                // sandbox bypass
  if (!chemsimPos) return false;
  const dx = chemsimPos.x - player.pos.x, dz = chemsimPos.z - player.pos.z;
  return dx * dx + dz * dz < 22 * 22;
}
function openChemSim() {
  const near = csNearConsole();
  document.getElementById('cs-far').style.display = near ? 'none' : 'block';
  document.getElementById('cs-body').style.display = near ? 'block' : 'none';
  document.getElementById('chemsim').style.display = 'flex';
  if (document.exitPointerLock) document.exitPointerLock();
}
(function wireChemSim() {
  const btn = document.getElementById('chemsim-btn'), close = document.getElementById('cs-close');
  if (btn) btn.addEventListener('click', openChemSim);
  if (close) close.addEventListener('click', () => { document.getElementById('chemsim').style.display = 'none'; });
  const fmt = { temperature: (v) => `${v | 0}°C`, pressure: (v) => `${v | 0} kPa`,
                flowRate: (v) => (+v).toFixed(1), pH: (v) => (+v).toFixed(1) };
  for (const key of Object.keys(fmt)) {
    const el = document.getElementById('cs-' + key), lab = document.getElementById('csv-' + key);
    if (el) el.addEventListener('input', () => { lab.textContent = fmt[key](el.value); });
  }
  const out = () => document.getElementById('cs-result');
  document.getElementById('cs-run').addEventListener('click', () => {
    if (!spend(CS_RUN)) { flashCantAfford(); out().textContent = 'Not enough MolCoins.'; return; }
    const p = csParams(), r = csPredict(p);
    document.getElementById('cs-curve').style.display = 'none';
    out().innerHTML = `Reaction rate <b>${r.rate.toFixed(2)}×</b> · batch to 99.5% in <b>${r.batchMin.toFixed(1)} min</b><br>`
      + `Selective V recovery <b>${(r.rec * 100) | 0}%</b> → <b>${r.kgBatch.toFixed(2)} kg</b> V₂O₅/batch · `
      + `<b>${r.kgHr.toFixed(1)} kg/h</b> ≈ <b>${r.coinsHr | 0} 💰/h</b>`;
  });
  document.getElementById('cs-sweep').addEventListener('click', () => {
    if (!spend(CS_SWEEP)) { flashCantAfford(); out().textContent = 'Not enough MolCoins.'; return; }
    const p = csParams();
    const cv = document.getElementById('cs-curve'), g = cv.getContext('2d');
    cv.style.display = 'block'; g.clearRect(0, 0, cv.width, cv.height);
    let best = { pH: 0, rec: -1 };
    g.beginPath();
    for (let pH = 1; pH <= 6.001; pH += 0.05) {
      const rec = precipF('V', pH) * (p.deiron ? 1 : 1 - precipF('Fe', pH)) * (1 - precipF('Al', pH));
      if (rec > best.rec) best = { pH, rec };
      const x = 20 + (pH - 1) / 5 * (cv.width - 35), y = cv.height - 18 - rec * (cv.height - 34);
      pH === 1 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.strokeStyle = '#d0a0ff'; g.lineWidth = 2; g.stroke();
    const bx = 20 + (best.pH - 1) / 5 * (cv.width - 35), by = cv.height - 18 - best.rec * (cv.height - 34);
    g.fillStyle = '#6ffcda'; g.beginPath(); g.arc(bx, by, 4, 0, 7); g.fill();
    g.fillStyle = '#9fb0c6'; g.font = '10px system-ui';
    g.fillText('pH 1', 16, cv.height - 5); g.fillText('pH 6', cv.width - 30, cv.height - 5);
    g.fillStyle = '#6ffcda'; g.fillText(`optimum pH ${best.pH.toFixed(1)} → ${(best.rec * 100) | 0}%`, bx - 50, by - 8);
    out().innerHTML = `pH sweep${p.deiron ? ' (de-ironed feed)' : ''}: selectivity optimum at <b>pH ${best.pH.toFixed(1)}</b> `
      + `(${(best.rec * 100) | 0}% V recovery)${p.deiron ? '' : ' — above pH 3 iron co-precipitates and ruins the product'}`;
  });
})();

// ---------- render loop (49% budget outside XR; every frame in XR) ----------
const BUDGET = 0.49;
let refresh = 1000 / 60, lastTick = performance.now(), lastRender = 0, lastStream = 0;

// Perf instrumentation (?bench=1): time every improvement. Reports CPU render
// ms (avg/p95/max), draw calls, triangles and the adaptive pixel ratio into a
// <pre id="bench"> that headless --dump-dom can read.
const BENCH = params.get('bench') === '1';
if (BENCH) renderer.info.autoReset = false;   // accumulate across composer passes
const benchSamples = [];
let benchDone = false, benchT0 = performance.now();
function benchReport() {
  const s = [...benchSamples].sort((a, b) => a - b);
  const avg = s.reduce((a, b) => a + b, 0) / s.length;
  const out = { renderMsAvg: +avg.toFixed(2), p95: +s[(s.length * 0.95) | 0].toFixed(2),
    max: +s[s.length - 1].toFixed(2), calls: renderer.info.render.calls,
    tris: renderer.info.render.triangles, pixelRatio: renderer.getPixelRatio(),
    live: live.size, protosWarm: [...glbProto.values()].filter((v) => v !== 'loading').length };
  const pre = document.createElement('pre'); pre.id = 'bench';
  pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
  console.log('[bench]', pre.textContent);
}
// Adaptive resolution (classic console technique): track an EMA of render cost
// and step the pixel ratio down/up so frame time stays inside the budget.
let perfEma = 14, perfN = 0;
function adaptiveRes(renderMs) {
  perfEma = perfEma * 0.95 + renderMs * 0.05;
  if (++perfN % 90 !== 0) return;
  const pr = renderer.getPixelRatio();
  if (perfEma > 24 && pr > 0.75) { renderer.setPixelRatio(pr - 0.25); resize(); }
  else if (perfEma < 10 && pr < Math.min(devicePixelRatio, 1.5)) { renderer.setPixelRatio(pr + 0.25); resize(); }
}
function loop(now) {
  now = now || performance.now();
  const dt = Math.min(0.05, (now - lastTick) / 1000); lastTick = now;
  pollGamepads(dt, now);
  step(dt);
  updateAgents(dt);
  if (steam.length) updateSteam(dt);
  if (!simOk && MOLECULIA) crClientActive = true;   // no server reached -> run chemistry in-browser
  if (crClientActive && !simOk) crTick(dt);
  if (now - lastStream > 180) {
    lastStream = now; stream(); checkCollect(); updateGoals();
    if (crClientActive && !simOk) applyReactorState(crStateObj());
  }
  // Keep the sun (and its shadow frustum) centred on the player for crisp shadows.
  sun.position.set(player.pos.x + 50, 120, player.pos.z + 35);
  sun.target.position.set(player.pos.x, 0, player.pos.z);
  const xr = renderer.xr.isPresenting;
  if (xr) {
    const s = renderer.xr.getSession(); if (s && s.__pollButtons) s.__pollButtons(dt);
    renderer.render(scene, camera);                    // headset drives cadence (no post-fx in XR)
  } else if (now - lastRender >= refresh / BUDGET) {
    lastRender = now;
    if (BENCH) renderer.info.reset();
    const t0 = performance.now();
    composer.render();                                          // bloom + tone-mapped
    const rMs = performance.now() - t0;
    adaptiveRes(rMs);
    if (BENCH && !benchDone && now - benchT0 > 1500) {
      benchSamples.push(rMs);
      if (benchSamples.length >= 90 || now - benchT0 > 9000) { benchDone = true; benchReport(); }
    }
    if (arOn) drawAR();
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
    for (const z of (w.meta.zones || [])) {
      buildZoneLabel(z);
      if (/Slakkenspoor/.test(z.name)) buildFactoryAtmosphere(z.x, z.z);
    }
    const line = (w.meta.processLine || []);
    elements = objects.filter((o) => o.t === 'element');
    buildElements();
    fertilizers = w.meta.fertilizers || [];
    buildFertilizerLab();
    crops = w.meta.crops || [];
    buildFarm();
    equipment = w.meta.equipment || [];
    floorConfig = w.meta.floorConfig || floorConfig;
    buildFactory();
    { const fb = document.getElementById('fert-btn'); if (fb) fb.style.display = 'block'; }
    { const mb = document.getElementById('farm-btn'); if (mb) mb.style.display = 'block'; }
    { const bb = document.getElementById('build-btn'); if (bb) bb.style.display = 'block'; }
    { const mc = document.getElementById('molcoins'); if (mc) mc.style.display = 'block'; updateMcHUD(false); }
    chemsimPos = objects.find((o) => o.console === 'chemsim') || null;
    { const cb = document.getElementById('chemsim-btn'); if (cb) cb.style.display = 'block'; }
    if (params.get('chemsim')) setTimeout(openChemSim, 400);
    { const g = document.getElementById('goals'); if (g) g.style.display = 'block'; updateGoals(); }
    if (params.get('collectall')) {          // sandbox: skip the grind (demo/verify)
      for (const o of elements) collected.add(o.num);
      for (const [, rec] of elementSprites) { rec.sprite.material.map.dispose(); rec.sprite.material.map = elementTexture(rec.o, true); rec.sprite.material.needsUpdate = true; }
      updateElementHUD();
    }
    if (params.get('lab')) setTimeout(openFertLab, 400);
    if (params.get('stockfert') || params.get('farmdemo')) {
      for (const f of fertilizers) fertInv[f.id] = 6;
    }
    if (params.get('farmdemo')) {              // Liebig demo: N+P fed, K forgotten -> 0% yield
      selectCrop(crops.find((c) => c.id === 'wheat') || crops[0]);
      for (const id of ['urea', 'urea', 'dap']) { const f = fertById.get(id); if (f) { plot.N += f.npk[0]; plot.P += f.npk[1]; plot.K += f.npk[2]; fertInv[id]--; } }
      renderPlot();
    }
    if (params.get('farm')) setTimeout(openFarm, 400);
    if (params.get('factorydemo')) {           // lay the chain adjacent -> bonuses light up
      const chain = ['jaw_crusher', 'vibrating_screen', 'cone_crusher', 'ball_mill', 'magnetic_separator', 'leaching_tank', 'filtration_press'];
      chain.forEach((id, k) => { if (eqById.has(id)) factoryGrid[4 * FGW + 4 + k] = id; });
      saveFactory(); renderFactory();
    }
    if (params.get('build')) setTimeout(openFactory, 400);
    initControls();
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

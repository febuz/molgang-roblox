// MOLGANG chem-lab 3D — interactive high-fidelity web lab.
// Assets are plain web files under ./assets/ (GLB), optionally served from
// IPFS: if ipfs.json carries a cid, the loader tries the local gateway
// first and falls back to the bundled web files.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { BofSim, REACTIONS, reactionEquation } from './chemistry.js';

const EQUIPMENT = [
  { file: 'bof_converter.glb', name: 'BOF Converter', pos: [0, 0, 0], scale: 2.2,
    info: 'Basic Oxygen Furnace — the O₂ lance oxidizes Fe to FeO; FeO then oxidizes C, Si, Mn and V.',
    reaction: 'iron_oxidation' },
  { file: 'distillation_column.glb', name: 'Distillation Column', pos: [-7, 0, -4], scale: 1.6,
    info: 'Separates volatile fractions from process off-gas.', reaction: 'wustite_reduction' },
  { file: 'cooling_pit.glb', name: 'Cooling Pit', pos: [5.5, 0, -5], scale: 1.6,
    info: 'Slag cooling and solidification — vanadium reports to the slag as V₂O₅.',
    reaction: 'vanadium_oxidation' },
  { file: 'ball_mill.glb', name: 'Ball Mill', pos: [-5.5, 0, 4.5], scale: 1.5,
    info: 'Grinds cooled slag ahead of vanadium leaching.', reaction: 'silicon_oxidation' },
  { file: 'cyclone_separator.glb', name: 'Cyclone Separator', pos: [7.5, 0, 2.5], scale: 1.5,
    info: 'Separates fines from the mill product stream.', reaction: 'manganese_oxidation' },
  { file: 'centrifuge.glb', name: 'Centrifuge', pos: [3.5, 0, 6], scale: 1.3,
    info: 'Dewaters the leach slurry.', reaction: 'decarburization' },
  { file: 'conveyor_belt.glb', name: 'Conveyor', pos: [-2.5, 0, 6.5], scale: 1.5,
    info: 'Moves crushed slag between process steps.', reaction: null },
  { file: 'beaker_1L.glb', name: 'Sample Beaker', pos: [-8.2, 0, 2.4], scale: 0.7,
    info: 'Bench-scale assay of V₂O₅ grade.', reaction: null },
  { file: 'lab_bench.glb', name: 'Lab Bench', pos: [-9.6, 0, -1.6], scale: 1.1,
    info: 'Analytical bench — titrations and XRF checks.', reaction: null },
  { file: 'drill_rig.glb', name: 'Drill Rig', pos: [9, 0, -2], scale: 1.5,
    info: 'Raw material sampling upstream of the furnace.', reaction: null },
  { file: 'excavator.glb', name: 'Excavator', pos: [11, 0, 6], scale: 1.8,
    info: 'Open-pit extraction vehicle: sends ore to the drill and haul chain.', reaction: null },
  { file: 'haul_truck.glb', name: 'Haul Truck', pos: [-11, 0, 7], scale: 1.7,
    info: 'Peer-synchronised logistics unit carrying ore between plots.', reaction: null },
  { file: 'storage_silo.glb', name: 'Storage Silo', pos: [11, 0, -7], scale: 1.7,
    info: 'Finite resource storage: a production sink for the player economy.', reaction: null },
  { file: 'filtration_press.glb', name: 'Filtration Press', pos: [-10, 0, -7], scale: 1.4,
    info: 'Separates the leach stream before synthesis and Pulse settlement.', reaction: null },
  { file: 'speed_boost_pad.glb', name: 'Speed Boost Pad', pos: [0, 0, 9], scale: 1.1,
    info: 'Traversal node: reduces travel friction between resource plots.', reaction: null },
];

// Si-28 refinement + quantum-computer line, in its own zone (x>=16) so it
// doesn't crowd the BOF equipment. Reuses BOF-zone GLB models with new
// names/info rather than new assets -- same shapes read fine as generic
// industrial reactors/columns/vessels, and apiEquipment ties each prop to
// the matching id in shared/silicon-refinement.json for the live-state fetch.
const QUANTUM_EQUIPMENT = [
  { file: 'cyclone_separator.glb', name: 'Submerged Arc Furnace', pos: [20, 0, 0], scale: 1.8,
    info: 'Carbothermic reduction: SiO2 + 2C -> Si + 2CO at ~2000C. First station of the Si-28 line.',
    reaction: null, apiEquipment: 'submerged_arc_furnace' },
  { file: 'distillation_column.glb', name: 'Siemens CVD Reactor', pos: [17, 0, -4], scale: 1.7,
    info: 'Chemical vapor deposition of trichlorosilane into nine-nines pure polysilicon.',
    reaction: null, apiEquipment: 'siemens_reactor' },
  { file: 'ball_mill.glb', name: 'Czochralski Puller', pos: [23, 0, -4], scale: 1.5,
    info: 'Pulls a rotating seed crystal from a silicon melt to grow a single-crystal ingot.',
    reaction: null, apiEquipment: 'czochralski_puller' },
  { file: 'centrifuge.glb', name: 'Gas Centrifuge Cascade', pos: [20, 0, 5.5], scale: 1.4,
    info: 'Enriches Si-28 isotope purity, cascade-style -- same principle as uranium enrichment.',
    reaction: null, apiEquipment: 'gas_centrifuge_cascade' },
  { file: 'lab_bench.glb', name: 'Mass Spectrometer Assay', pos: [16, 0, 5], scale: 1.2,
    info: 'SIMS readout of the actual isotope ratio -- the quantum-grade pass/fail gate.',
    reaction: null, apiEquipment: 'mass_spectrometer' },
  { file: 'beaker_1L.glb', name: 'Epitaxial Wafer Grower', pos: [24, 0, 2], scale: 0.9,
    info: 'Grows the final isotopically-pure epilayer -- the quantum chip substrate.',
    reaction: null, apiEquipment: 'epitaxial_grower' },
  { file: 'cooling_pit.glb', name: 'Dilution Refrigerator', pos: [20, 0, -8], scale: 1.6,
    info: 'Cools the wafer + control electronics to millikelvin range -- where the quantum computer runs.',
    reaction: null, apiEquipment: 'dilution_refrigerator' },
];

const canvas = document.getElementById('scene');
const a4000QueryPath = new URLSearchParams(window.location.search).get('gpu') === 'a4000';
// MSAA is wasted behind the EffectComposer render targets; skip it and keep
// the GPU budget for the bloom chain instead.
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, powerPreference: 'high-performance' });
if (a4000QueryPath) renderer.debug.checkShaderErrors = false;
// Chromium may expose navigator.gpu while the adapter is blocklisted or only
// software-backed. Request a device before reporting WebGPU capability. This
// pinned Three.js build still renders the scene through WebGL; the capability
// probe is reported separately so Pulse events never claim a WebGPU renderer.
const webgpuProbe = { device: false, mode: 'webgl-fallback', adapter: 'unavailable' };
try {
  const adapter = navigator.gpu && await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (adapter) {
    const device = await adapter.requestDevice();
    webgpuProbe.device = Boolean(device);
    webgpuProbe.mode = 'webgpu-device-available / webgl-scene';
    const info = adapter.info || {};
    const label = [info.vendor, info.architecture, info.device, info.description].filter(Boolean).join(' ');
    webgpuProbe.adapter = label || 'browser-hidden-adapter';
    device?.destroy?.();
  }
} catch { /* WebGL fallback remains authoritative */ }
const webgpuReady = webgpuProbe.device;
const renderPath = document.getElementById('render-path');
if (renderPath) renderPath.textContent = webgpuReady ? `WebGPU device · WebGL scene` : 'WebGL fallback';
let pixelRatio = Math.min(window.devicePixelRatio, webgpuReady ? 1.0 : 0.85);
renderer.setPixelRatio(pixelRatio);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false; // static scene: render shadows once per change
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e13);
scene.fog = new THREE.Fog(0x0b0e13, 26, 60);

const camera = new THREE.PerspectiveCamera(50, 2, 0.1, 200);
camera.position.set(10, 7, 12);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.6, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 4;
controls.maxDistance = 34;

// Keep the industrial scene on explicit lights. Three.js PMREM environment
// generation is intentionally omitted: Chromium's NVIDIA/Vulkan driver can
// return a null shader log during PMREM uniform discovery, which would abort
// the whole asset gallery before the first frame. This path remains fully
// GPU-rendered through WebGL and leaves the A4000 available to testers.
const a4000BrowserPath = a4000QueryPath;
window.__molgangA4000Path = a4000BrowserPath;

// ---- lights ----
const hemi = new THREE.HemisphereLight(0x8899bb, 0x0c0d10, 0.35);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xcfe0ff, 1.4);
key.position.set(12, 16, 8);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -18; key.shadow.camera.right = 18;
key.shadow.camera.top = 18; key.shadow.camera.bottom = -18;
scene.add(key);
const meltLight = new THREE.PointLight(0xff5a00, 0, 26, 1.8); // driven by bath temp
meltLight.position.set(0, 2.6, 0);
scene.add(meltLight);

// ---- floor ----
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(30, 64),
  new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.85, metalness: 0.25 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const grid = new THREE.GridHelper(60, 60, 0x2a3a55, 0x151a24);
grid.position.y = 0.01;
scene.add(grid);

// ---- melt pool inside the converter (emissive, temperature-driven) ----
const melt = new THREE.Mesh(
  new THREE.CylinderGeometry(0.95, 0.8, 0.5, 40),
  new THREE.MeshStandardMaterial({
    color: 0x220800, emissive: 0xff3c00, emissiveIntensity: 0.0, roughness: 0.4 }));
melt.position.set(0, 2.45, 0);
scene.add(melt);

// ---- sparks during the blow ----
const SPARKS = 300;
const sparkGeo = new THREE.BufferGeometry();
sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3));
const sparkVel = new Float32Array(SPARKS * 3);
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({
  color: 0xffa03c, size: 0.06, transparent: true, opacity: 0.95,
  blending: THREE.AdditiveBlending, depthWrite: false }));
sparks.visible = false;
scene.add(sparks);
function respawnSpark(i) {
  const p = sparkGeo.attributes.position.array;
  p[i * 3] = (Math.random() - 0.5) * 0.7;
  p[i * 3 + 1] = 2.6;
  p[i * 3 + 2] = (Math.random() - 0.5) * 0.7;
  sparkVel[i * 3] = (Math.random() - 0.5) * 2.4;
  sparkVel[i * 3 + 1] = 2.5 + Math.random() * 3.5;
  sparkVel[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
}
for (let i = 0; i < SPARKS; i++) respawnSpark(i);

// ---- post-processing (bloom sells the glow) ----
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.35, 0.6, 0.9);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---- asset loading: IPFS gateway first (if pinned), local web files as fallback ----
// The probe result is cached for an hour so revisits skip the HEAD round-trip
// (and the 1.5 s timeout when the gateway is down).
async function assetBase() {
  const CACHE_KEY = 'lab3d_asset_base';
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.at < 3600_000) return cached.base;
  } catch { /* ignore corrupt cache */ }
  let base = './assets/';
  try {
    const meta = await (await fetch('./ipfs.json')).json();
    if (meta.cid) {
      const gateway = `${meta.gateway || 'http://127.0.0.1:8080'}/ipfs/${meta.cid}/`;
      const probe = await fetch(gateway + 'bof_converter.glb', {
        method: 'HEAD', signal: AbortSignal.timeout(1500) });
      if (probe.ok) { console.log('[lab3d] assets from IPFS', meta.cid); base = gateway; }
    }
  } catch { /* fall through to local web files */ }
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ base, at: Date.now() })); } catch {}
  return base;
}

// Per-model PBR tuning: the source GLBs are silhouette-white; give them
// industrial materials (kept if the mesh already carries real color).
const MATERIAL_TUNE = {
  bof_converter: { color: 0x565b63, metalness: 0.72, roughness: 0.5 },   // refractory-clad steel
  distillation_column: { color: 0xb7bec7, metalness: 0.88, roughness: 0.3 },
  cooling_pit: { color: 0x3f4247, metalness: 0.35, roughness: 0.8 },
  ball_mill: { color: 0x7c848d, metalness: 0.8, roughness: 0.42 },
  cyclone_separator: { color: 0xc7a44a, metalness: 0.85, roughness: 0.35 }, // brass-toned
  centrifuge: { color: 0x9aa2ab, metalness: 0.82, roughness: 0.34 },
  conveyor_belt: { color: 0x2f3338, metalness: 0.55, roughness: 0.65 },
  beaker_1L: { color: 0xcfe4ef, metalness: 0.05, roughness: 0.12 },
  lab_bench: { color: 0x6c7686, metalness: 0.45, roughness: 0.55 },
  drill_rig: { color: 0xb8642e, metalness: 0.65, roughness: 0.5 },        // safety-orange
  excavator: { color: 0xd18b24, metalness: 0.65, roughness: 0.52 },
  haul_truck: { color: 0xc36d2e, metalness: 0.7, roughness: 0.5 },
  storage_silo: { color: 0x78818d, metalness: 0.72, roughness: 0.42 },
  filtration_press: { color: 0x4f8296, metalness: 0.68, roughness: 0.45 },
  speed_boost_pad: { color: 0x2dcfe8, metalness: 0.35, roughness: 0.3 },
};

function isNearWhite(color) {
  return color && color.r > 0.5 && color.g > 0.5 && color.b > 0.5;
}

// Flash-era feedback layer: cheap DOM sprites remain visible when the 3D
// quality ladder lowers bloom or shadows.
const fx = document.getElementById('fx');
const pulseStoreKey = 'molgang.pulse.journal.v1';
let pulseWallet = localStorage.getItem('molgang.pulse.wallet') || `demo-${crypto.randomUUID().slice(0, 8)}`;
localStorage.setItem('molgang.pulse.wallet', pulseWallet);
const pulseHash = async (value) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, '0')).join('');
};
const pulseJournal = () => { try { return JSON.parse(localStorage.getItem(pulseStoreKey) || '[]'); } catch { return []; } };
async function verifyPulseJournal() {
  const journal = pulseJournal();
  let previousHash = 'GENESIS';
  for (const event of journal) {
    if (!event || event.previousHash !== previousHash || typeof event.hash !== 'string') {
      return { valid: false, checked: journal.length };
    }
    const { hash, status, signature, ...unsigned } = event;
    const expectedHash = await pulseHash(JSON.stringify(unsigned));
    if (hash !== expectedHash) return { valid: false, checked: journal.length };
    previousHash = hash;
  }
  return { valid: true, checked: journal.length, root: previousHash };
}
async function refreshPulseIntegrity() {
  const label = document.getElementById('pulse-integrity');
  if (!label) return;
  const result = await verifyPulseJournal();
  label.textContent = result.valid ? `valid (${result.checked})` : `INVALID (${result.checked})`;
  label.style.color = result.valid ? '#86efac' : '#ff7b7b';
}
function updateDappHud() {
  const journal = pulseJournal();
  document.getElementById('pulse-wallet').textContent = pulseWallet.slice(0, 16);
  document.getElementById('pulse-count').textContent = journal.length;
  document.getElementById('pulse-hash').textContent = journal.at(-1)?.hash || 'GENESIS';
  refreshPulseIntegrity();
}
async function recordPulse(type, payload = {}) {
  const journal = pulseJournal();
  const previousHash = journal.at(-1)?.hash || 'GENESIS';
  const event = { id: crypto.randomUUID(), playerId: pulseWallet, type, payload, previousHash, createdAt: new Date().toISOString() };
  event.hash = await pulseHash(JSON.stringify(event));
  event.status = 'local';
  localStorage.setItem(pulseStoreKey, JSON.stringify([...journal, event].slice(-500)));
  updateDappHud();
  return event;
}
async function checkP2PNode() {
  try {
    const meta = await (await fetch('./ipfs.json')).json();
    const response = await fetch(`${meta.gateway}/ipfs/${meta.cid}/bof_converter.glb`, { method: 'HEAD' });
    document.getElementById('p2p-node').textContent = response.ok ? 'online / IPFS' : 'fallback';
  } catch { document.getElementById('p2p-node').textContent = 'local fallback'; }
}
async function verifyAssetManifest() {
  const label = document.getElementById('asset-integrity');
  try {
    const manifest = await (await fetch('../p2p-assets.json')).json();
    const base = await assetBase();
    const models = manifest.assets.filter((asset) => asset.kind === 'model');
    let verified = 0;
    for (const asset of models) {
      const response = await fetch(base + asset.path, { cache: 'no-cache' });
      if (!response.ok) continue;
      const body = await response.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', body);
      const hash = Array.from(new Uint8Array(digest)).map((x) => x.toString(16).padStart(2, '0')).join('');
      if (body.byteLength === asset.bytes && hash === asset.sha256) verified += 1;
    }
    label.textContent = `${verified}/${models.length} verified`;
    label.style.color = verified === models.length ? '#86efac' : '#ffce7a';
  } catch {
    label.textContent = 'unverified / fallback';
    label.style.color = '#ffce7a';
  }
}
document.getElementById('connect-wallet').onclick = async () => {
  const ethereum = window.ethereum;
  if (ethereum) {
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      pulseWallet = accounts[0] || pulseWallet;
      localStorage.setItem('molgang.pulse.wallet', pulseWallet);
      document.getElementById('dapp-status').textContent = 'Wallet connected; Pulse signing is available.';
    } catch { document.getElementById('dapp-status').textContent = 'Wallet connection cancelled; demo wallet retained.'; }
  } else document.getElementById('dapp-status').textContent = 'No browser wallet; using local demo identity.';
  updateDappHud();
};
document.getElementById('record-event').onclick = async (event) => {
  const item = await recordPulse('manual_demo_event', {
    source: 'lab3d', webgpuDevice: webgpuReady, renderPath: 'webgl', adapter: webgpuProbe.adapter
  });
  burst(event.clientX, event.clientY, `PULSE ${item.hash.slice(0, 6)}`);
};
document.getElementById('sign-pulse').onclick = async () => {
  const last = pulseJournal().at(-1);
  if (!last) { document.getElementById('dapp-status').textContent = 'Record an event first.'; return; }
  if (!window.ethereum) { document.getElementById('dapp-status').textContent = 'No wallet; root remains locally hash-chained.'; return; }
  try {
    const signature = await window.ethereum.request({ method: 'personal_sign', params: [last.hash, pulseWallet] });
    last.status = 'signed'; last.signature = signature;
    localStorage.setItem(pulseStoreKey, JSON.stringify(pulseJournal().slice(-500)));
    document.getElementById('dapp-status').textContent = 'Pulse root signed by wallet; submit adapter not configured.';
  } catch { document.getElementById('dapp-status').textContent = 'Pulse signature cancelled.'; }
};
document.getElementById('export-journal').onclick = async () => {
  const events = pulseJournal();
  const verification = await verifyPulseJournal();
  const envelope = {
    schema: 'molgang.pulse-journal.v1',
    exportedAt: new Date().toISOString(),
    playerId: pulseWallet,
    eventCount: events.length,
    root: verification.root || 'GENESIS',
    verified: verification.valid,
    events,
  };
  const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'molgang-pulse-journal.json'; link.click(); URL.revokeObjectURL(link.href);
};
updateDappHud(); checkP2PNode(); verifyAssetManifest();
function burst(screenX, screenY, label = '') {
  if (!fx) return;
  const ring = document.createElement('i');
  ring.className = 'fx-ring'; ring.style.left = `${screenX}px`; ring.style.top = `${screenY}px`; fx.append(ring);
  for (let i = 0; i < 8; i++) {
    const spark = document.createElement('i');
    spark.className = 'fx-spark'; spark.style.left = `${screenX}px`; spark.style.top = `${screenY}px`;
    const angle = (Math.PI * 2 * i) / 8;
    spark.style.setProperty('--dx', `${Math.cos(angle) * 48}px`);
    spark.style.setProperty('--dy', `${Math.sin(angle) * 48}px`);
    fx.append(spark);
  }
  if (label) {
    const text = document.createElement('b');
    text.className = 'fx-float'; text.textContent = label; text.style.left = `${screenX + 14}px`; text.style.top = `${screenY - 10}px`; fx.append(text);
  }
  setTimeout(() => fx.querySelectorAll('i, b').forEach((node) => { if (node.getAnimations().every((a) => a.playState === 'finished')) node.remove(); }), 1100);
}
function screenFlash() {
  if (!fx) return;
  const flash = document.createElement('i'); flash.className = 'fx-flash'; fx.append(flash);
  setTimeout(() => flash.remove(), 350);
}

const pickables = [];
const loader = new GLTFLoader();
const ALL_EQUIPMENT = [...EQUIPMENT, ...QUANTUM_EQUIPMENT];
let assetBaseCache = './assets/';

function placeEquipmentInstance(eq, matrix) {
  loader.load(assetBaseCache + eq.file, (gltf) => {
    const root = gltf.scene;
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const fit = (eq.scale * 1.5) / Math.max(size.y, 1e-6);
    root.scale.setScalar(fit);
    root.matrixAutoUpdate = false;
    root.matrix.copy(matrix);
    const tune = MATERIAL_TUNE[eq.file.replace('.glb', '')];
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        if (tune && o.material && isNearWhite(o.material.color) && !o.material.map) {
          o.material.color.setHex(tune.color);
          o.material.metalness = tune.metalness;
          o.material.roughness = tune.roughness;
        }
      }
    });
    root.userData.equipment = eq;
    root.userData.placed = true;
    scene.add(root);
    pickables.push(root);
  });
}

(async () => {
  const base = await assetBase();
  assetBaseCache = base;
  let loaded = 0;
  for (const eq of ALL_EQUIPMENT) {
    loader.load(base + eq.file, (gltf) => {
      const root = gltf.scene;
      // Normalize wildly different source scales: fit each model to a
      // target height and sit it on the floor.
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const fit = (eq.scale * 1.5) / Math.max(size.y, 1e-6);
      root.scale.setScalar(fit);
      root.position.set(
        eq.pos[0] - center.x * fit,
        -box.min.y * fit,
        eq.pos[2] - center.z * fit);
      const tune = MATERIAL_TUNE[eq.file.replace('.glb', '')];
      root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true; o.receiveShadow = true;
          if (o.material) {
            o.material.envMapIntensity = 0.8;
            if (o.material.emissiveIntensity > 0.3) o.material.emissiveIntensity = 0.3;
            if (tune && isNearWhite(o.material.color) && !o.material.map) {
              o.material.color.setHex(tune.color);
              o.material.metalness = tune.metalness;
              o.material.roughness = tune.roughness;
            }
          }
        }
      });
      root.userData.equipment = eq;
      // Static equipment: freeze matrices and re-render the shadow map once.
      root.updateMatrixWorld(true);
      root.traverse((o) => { o.matrixAutoUpdate = false; });
      scene.add(root);
      pickables.push(root);
      renderer.shadowMap.needsUpdate = true;
      if (++loaded === EQUIPMENT.length) document.getElementById('loading').style.display = 'none';
    }, undefined, () => {
      if (++loaded === EQUIPMENT.length) document.getElementById('loading').style.display = 'none';
    });
  }
})();

// ---- WebXR AR: local-floor anchoring + optional hit-test object placement ----
// Standard WebXR "tap a real surface, place a virtual object there" pattern
// (hit-test + anchor via a matrix, no true object recognition -- there's no
// WebXR API for identifying *which* real object something is, only *where*
// a real surface is). This is the achievable, well-supported version of
// "recognize objects from the space and link a 3D object to them".
let hitTestSource = null;
let hitTestSourceRequested = false;
const reticle = new THREE.Mesh(
  new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x6ee7ff }));
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

const PLACED_KEY = 'molgang.lab3d.placedObjects.v1';
function loadPlacedObjects() {
  try { return JSON.parse(localStorage.getItem(PLACED_KEY) || '[]'); } catch { return []; }
}
function savePlacedObjects(list) {
  try { localStorage.setItem(PLACED_KEY, JSON.stringify(list.slice(-40))); } catch {}
}

let placementArmed = false;
const armPlacementBtn = document.createElement('button');
armPlacementBtn.id = 'arm-placement';
armPlacementBtn.textContent = '🎯 Plaats object';
armPlacementBtn.style.cssText =
  'position:absolute;bottom:70px;left:calc(50% - 80px);width:160px;z-index:999;' +
  'display:none;border:1px solid #fff;border-radius:6px;background:rgba(0,0,0,.5);' +
  'color:#fff;font:13px sans-serif;padding:10px 6px;cursor:pointer;';
armPlacementBtn.onclick = () => {
  placementArmed = !placementArmed;
  armPlacementBtn.style.background = placementArmed ? 'rgba(42,108,255,.85)' : 'rgba(0,0,0,.5)';
  armPlacementBtn.textContent = placementArmed ? '🎯 Tik op de vloer…' : '🎯 Plaats object';
};
document.body.appendChild(armPlacementBtn);

const arController = renderer.xr.getController(0);
arController.addEventListener('select', () => {
  if (!placementArmed || !reticle.visible) return;
  const eq = (highlighted && highlighted.userData.equipment) || QUANTUM_EQUIPMENT[0];
  const matrix = reticle.matrix.clone();
  placeEquipmentInstance(eq, matrix);
  const list = loadPlacedObjects();
  list.push({ file: eq.file, name: eq.name, matrix: matrix.toArray(), placedAt: new Date().toISOString() });
  savePlacedObjects(list);
  placementArmed = false;
  armPlacementBtn.textContent = '🎯 Plaats object';
  armPlacementBtn.style.background = 'rgba(0,0,0,.5)';
});
scene.add(arController);

renderer.xr.addEventListener('sessionstart', () => {
  controls.enabled = false; // headset pose drives the camera in AR, not the mouse
  armPlacementBtn.style.display = 'block';
  for (const p of loadPlacedObjects()) {
    const eq = ALL_EQUIPMENT.find((e) => e.file === p.file) || { file: p.file, name: p.name, scale: 1.4 };
    placeEquipmentInstance(eq, new THREE.Matrix4().fromArray(p.matrix));
  }
});
renderer.xr.addEventListener('sessionend', () => {
  controls.enabled = true;
  reticle.visible = false;
  placementArmed = false;
  armPlacementBtn.style.display = 'none';
  hitTestSourceRequested = false;
  hitTestSource = null;
});

document.body.appendChild(ARButton.createButton(renderer, {
  optionalFeatures: ['local-floor', 'hit-test', 'dom-overlay'],
  domOverlay: { root: document.body },
}));

// ---- live quantum-lab state (optional -- degrades silently without a
// reachable /api/quantum backend, e.g. when this bundle is deployed as a
// standalone static copy) ----
const playerId = new URLSearchParams(window.location.search).get('player');
async function fetchQuantumState() {
  if (!playerId) return null;
  try {
    const r = await fetch(`/api/quantum/state/${encodeURIComponent(playerId)}`);
    const j = await r.json();
    return j.success ? j.data : null;
  } catch { return null; }
}

// ---- simulation + HUD ----
const sim = new BofSim();
const $ = (id) => document.getElementById(id);
$('equations').textContent = Object.keys(REACTIONS).map(reactionEquation).join('\n');

$('btn-start').onclick = async (event) => {
  sim.running = true;
  await recordPulse('start_blow', {
    oxygenNm3h: sim.o2Nm3h, webgpuDevice: webgpuReady, renderPath: 'webgl', adapter: webgpuProbe.adapter
  });
  screenFlash(); burst(event.clientX, event.clientY, 'BLOW START');
};
$('btn-pause').onclick = () => { sim.running = false; };
$('btn-reset').onclick = (event) => { const o2 = sim.o2Nm3h; sim.reset(); sim.o2Nm3h = o2; burst(event.clientX, event.clientY, 'RESET'); };
$('o2').oninput = (e) => { sim.o2Nm3h = Number(e.target.value); $('o2-val').textContent = `${sim.o2Nm3h} Nm³/h`; };

function updateHud(s) {
  $('temp').textContent = `${s.tempK.toFixed(0)} K`;
  $('time').textContent = `${s.timeS.toFixed(1)} s`;
  $('metal').textContent = `${s.metalKg.toFixed(1)} kg`;
  $('slag').textContent = `${s.slagKg.toFixed(1)} kg`;
  $('recovery').textContent = `${s.recoveryPct.toFixed(1)} %`;
  $('electrons').textContent = `${s.electronsMol.toFixed(1)} mol`;
  $('mols').textContent =
    `V ${s.molV.toFixed(1)} | FeO ${s.molFeO.toFixed(1)} | V₂O₅ ${s.molV2O5.toFixed(2)} | CO ${s.molCO.toFixed(1)} mol`;
  const t = Math.min(1, Math.max(0, (s.tempK - 1450) / 750));
  $('temp-bar').style.width = `${(t * 100).toFixed(1)}%`;
  $('temp-bar').style.background = t > 0.75 ? '#ff5040' : t > 0.3 ? '#ffb03c' : '#4c8dff';
}

// ---- picking ----
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let highlighted = null;
canvas.addEventListener('pointerdown', (ev) => {
  const r = canvas.getBoundingClientRect();
  pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(pickables, true);
  if (!hits.length) return;
  let node = hits[0].object;
  while (node && !node.userData.equipment) node = node.parent;
  if (!node) return;
  const eq = node.userData.equipment;
  recordPulse('inspect_asset', { asset: eq.file, name: eq.name });
  burst(ev.clientX, ev.clientY, eq.name);
  if (highlighted) highlighted.traverse((o) => { if (o.isMesh && o.material.emissive) o.material.emissiveIntensity = 0; });
  highlighted = node;
  node.traverse((o) => {
    if (o.isMesh && o.material && o.material.emissive) {
      o.material.emissive = new THREE.Color(0x2a6cff);
      o.material.emissiveIntensity = 0.35;
    }
  });
  $('sel-name').textContent = eq.name;
  $('sel-info').textContent = eq.info;
  $('sel-reaction').textContent = eq.reaction ? reactionEquation(eq.reaction) : '—';
  $('inspector').style.display = 'block';

  if (eq.apiEquipment) {
    $('sel-reaction').textContent = 'loading live state…';
    fetchQuantumState().then((state) => {
      if (!state) { $('sel-reaction').textContent = '(no live state -- open via ?player=<id>)'; return; }
      const stages = ['submerged_arc_furnace', 'siemens_reactor', 'czochralski_puller', 'gas_centrifuge_cascade',
        'mass_spectrometer', 'epitaxial_grower', 'dilution_refrigerator'];
      const eqIdx = stages.indexOf(eq.apiEquipment);
      const stageIdx = state.stage_index ?? 0;
      let status = 'locked';
      if (eq.apiEquipment === 'dilution_refrigerator') status = state.quantumComputerBuilt ? 'built ⚛' : 'not built yet';
      else if (eqIdx >= 0) status = eqIdx < stageIdx ? 'done ✓' : eqIdx === stageIdx ? 'active now ▶' : 'pending';
      $('sel-reaction').textContent = `Si-28 line: ${status} · quantum dots ${state.quantum_dots ?? 0}`;
    });
  }
});

// ---- main loop with adaptive quality ----
// Quality ladder: drop a step when the rolling frame time stays above
// 28 ms, climb back above 15 ms headroom. Steps: DPR 1.5 -> 1.25 -> 1.0,
// then bloom off. The current state shows in the HUD fps readout.
const clock = new THREE.Clock();
let acc = 0;
let frameAvg = 16.7;
let quality = 0; // 0 = full
const QUALITY_STEPS = [
  { dpr: Math.min(window.devicePixelRatio, 1.5), bloom: true, shadows: true },
  { dpr: Math.min(window.devicePixelRatio, 1.25), bloom: true, shadows: true },
  { dpr: 1.0, bloom: true, shadows: true },
  { dpr: 1.0, bloom: false, shadows: true },
  // Software-GL rescue mode (no GPU driver): every remaining big cost off.
  { dpr: 0.75, bloom: false, shadows: false },
];
let cooldown = 0;
function applyQuality() {
  const q = QUALITY_STEPS[quality];
  pixelRatio = q.dpr;
  renderer.setPixelRatio(pixelRatio);
  bloom.enabled = q.bloom;
  if (renderer.shadowMap.enabled !== q.shadows) {
    renderer.shadowMap.enabled = q.shadows;
    key.castShadow = q.shadows;
    scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
    if (q.shadows) renderer.shadowMap.needsUpdate = true;
  }
  lastW = 0; // force resize path
}
let lastW = 0, lastH = 0;
function resize() {
  if (renderer.xr.isPresenting) return; // the XR session owns the framebuffer size
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w !== lastW || h !== lastH) {
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w / 2, h / 2); // bloom at half res: visually identical, 4x cheaper
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
function animate(_timestamp, frame) {
  resize();

  // Hit-test source is requested lazily on the first XR frame (needs a
  // 'viewer' reference space from the live session, not available before
  // the session actually starts) and torn down on session end.
  if (frame) {
    const session = renderer.xr.getSession();
    if (!hitTestSourceRequested) {
      hitTestSourceRequested = true;
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source) => { hitTestSource = source; });
      }).catch(() => {}); // hit-test not supported on this device -- placement stays unavailable
    }
    if (hitTestSource) {
      const results = frame.getHitTestResults(hitTestSource);
      if (results.length) {
        const pose = results[0].getPose(renderer.xr.getReferenceSpace());
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  const dt = Math.min(clock.getDelta(), 0.1);
  frameAvg = frameAvg * 0.95 + dt * 1000 * 0.05;
  cooldown -= dt;
  if (cooldown <= 0) {
    if (frameAvg > 28 && quality < QUALITY_STEPS.length - 1) {
      quality += 1; applyQuality(); cooldown = 2;
      console.log(`[lab3d] frame ${frameAvg.toFixed(0)}ms -> quality step ${quality}`);
    } else if (frameAvg < 15 && quality > 0) {
      quality -= 1; applyQuality(); cooldown = 4;
    }
  }
  const fpsEl = document.getElementById('fps');
  if (fpsEl) fpsEl.textContent = `${(1000 / frameAvg).toFixed(0)} fps${quality ? ` · q-${quality}` : ''}`;
  acc += dt;
  while (acc >= 0.1) { sim.step(0.1); acc -= 0.1; } // fixed 10 Hz chemistry
  const s = sim.snapshot();
  updateHud(s);

  const glow = Math.min(1.6, Math.max(0, (s.tempK - 1500) / 500));
  melt.material.emissiveIntensity = glow * 2.2;
  meltLight.intensity = glow * 60;
  sparks.visible = sim.running && sim.o2Nm3h > 1;
  if (sparks.visible) {
    const p = sparkGeo.attributes.position.array;
    for (let i = 0; i < SPARKS; i++) {
      sparkVel[i * 3 + 1] -= 6.5 * dt;
      p[i * 3] += sparkVel[i * 3] * dt;
      p[i * 3 + 1] += sparkVel[i * 3 + 1] * dt;
      p[i * 3 + 2] += sparkVel[i * 3 + 2] * dt;
      if (p[i * 3 + 1] < 0.05) respawnSpark(i);
    }
    sparkGeo.attributes.position.needsUpdate = true;
  }
  controls.update();
  // EffectComposer renders to a single 2D target -- it doesn't know about
  // WebXR's per-eye stereo views, so post-processing is skipped in AR and
  // the renderer draws the scene (both eyes) directly instead.
  if (renderer.xr.isPresenting) renderer.render(scene, camera);
  else composer.render();
}
renderer.setAnimationLoop(animate);

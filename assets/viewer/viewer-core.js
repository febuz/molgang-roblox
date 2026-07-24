// viewer-core.js — shared gallery logic for the MOLGANG asset viewer.
//
// index.html loads three.module.js (WebGL) and gpu.html loads three.webgpu.js
// (WebGPU); each builds its own renderer and hands it here. This module owns
// the scene, GLB loading, grid layout, orbit controls, render budget and the
// opt-in GPU setting UI — mirroring the WebGL/WebGPU split already used in
// molgang-web/lab3d.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const GPU_OPT_IN_KEY = 'molgang.viewer.gpuOptIn';

export function gpuOptIn() {
  return localStorage.getItem(GPU_OPT_IN_KEY) === '1';
}

// Wire the opt-in checkbox. Flipping it persists the choice and reloads so the
// page can route to the matching renderer (WebGL low-power ↔ WebGPU / WebGL
// high-performance) — a WebGL/WebGPU context's power preference can't change
// live. Opt-in is OFF by default: the viewer stays light on the shared box
// until the user explicitly asks for the GPU (the same courtesy gate Alexander
// applies before escalating GPU work).
export function wireGpuToggle() {
  const box = document.querySelector('#gpuOptIn');
  if (!box) return;
  box.checked = gpuOptIn();
  box.addEventListener('change', () => {
    localStorage.setItem(GPU_OPT_IN_KEY, box.checked ? '1' : '0');
    location.reload();
  });
}

// Detect the underlying GPU via the WebGL debug extension (best-effort).
function detectGpu() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
            || document.createElement('canvas').getContext('webgl');
    if (!gl) return 'unknown';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'hidden by browser';
  } catch (e) {
    return 'unknown';
  }
}

// Inject a per-set filter legend into the HUD. Each checkbox adds/removes
// the set from hiddenSets and calls refresh (which honours the names toggle).
function buildLegend(groupOf, setColor, hiddenSets, refresh) {
  const hud = document.querySelector('#hud');
  if (!hud || document.querySelector('#legend')) return;
  const wrap = document.createElement('div');
  wrap.id = 'legend';
  wrap.style.cssText = 'margin-top:10px;border-top:1px solid #26344a;padding-top:8px;display:grid;gap:4px;';
  for (const set of Object.keys(groupOf)) {
    const count = groupOf[set].filter((o) => o.isSprite !== true).length;
    const row = document.createElement('label');
    row.style.cssText = 'display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = true;
    cb.addEventListener('change', () => {
      if (cb.checked) hiddenSets.delete(set); else hiddenSets.add(set);
      refresh();
    });
    const dot = document.createElement('span');
    dot.style.cssText = `width:10px;height:10px;border-radius:2px;background:${setColor[set] || '#9aa7ba'};`;
    const txt = document.createElement('span');
    txt.textContent = `${set} (${count})`;
    row.append(cb, dot, txt);
    wrap.appendChild(row);
  }
  hud.appendChild(wrap);
}

// Inject the "show model names" toggle into the HUD.
function buildNamesToggle(onChange, initial) {
  const hud = document.querySelector('#hud');
  if (!hud || document.querySelector('#namesToggle')) return;
  const row = document.createElement('label');
  row.id = 'namesToggle';
  row.style.cssText = 'display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;'
    + 'margin-top:8px;border-top:1px solid #26344a;padding-top:8px;';
  const cb = document.createElement('input');
  cb.type = 'checkbox'; cb.checked = !!initial;
  cb.addEventListener('change', () => onChange(cb.checked));
  const txt = document.createElement('span');
  txt.textContent = '🏷 Show model names';
  row.append(cb, txt);
  hud.appendChild(row);
}

/**
 * Build the gallery.
 * @param {object} opts
 * @param {THREE.Renderer} opts.renderer  a ready WebGL/WebGPU renderer
 * @param {string} opts.rendererLabel     e.g. "WebGPU · high-performance"
 * @param {number} opts.budget            render duty cycle 0..1 (GPU courtesy)
 */
export async function initGallery({ renderer, rendererLabel, budget }) {
  const smokeMode = new URLSearchParams(location.search).get('smoke') === '1';
  const canvas = renderer.domElement;
  document.querySelector('#stage').appendChild(canvas);
  const status = document.querySelector('#status');
  const gpuInfo = document.querySelector('#gpuInfo');
  if (gpuInfo) gpuInfo.textContent = `GPU: ${detectGpu()}`;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1017);
  scene.fog = new THREE.Fog(0x0d1017, 34, 120);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
  camera.position.set(20, 15, 26);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 2, 0);
  controls.enableDamping = true;

  scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x141a24, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(14, 24, 12);
  scene.add(key);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(60, 64),
    new THREE.MeshStandardMaterial({ color: 0x161f2c, roughness: 0.85 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  scene.add(new THREE.GridHelper(100, 50, 0x2c4a70, 0x1a2740));

  const manifest = await (await fetch('./manifest.json', { cache: 'no-cache' })).json();
  const rawModels = manifest.models || [];
  const loader = new GLTFLoader();

  // Group by set and lay each group out as its own contiguous block with a
  // floating label, so 80 models are navigable instead of an undifferentiated
  // grid. Sets render in a fixed order; anything unlisted falls to the end.
  const SET_ORDER = ['Bubble Tea Café', 'Chemistry Lab', 'Nexus Hub', 'Mining Site', 'Industrial & Game'];
  const setRank = (s) => { const i = SET_ORDER.indexOf(s); return i === -1 ? SET_ORDER.length : i; };
  const models = rawModels.slice().sort((a, b) =>
    setRank(a.set) - setRank(b.set) || rawModels.indexOf(a) - rawModels.indexOf(b));

  const COLS = 6;
  const SPACING = 6.5;
  const groupOf = {};              // set -> [Object3D] for filtering
  const setColor = {
    'Bubble Tea Café': '#7fe0d6', 'Chemistry Lab': '#8fd0ff', 'Nexus Hub': '#c9b6ff',
    'Mining Site': '#e0c07f', 'Industrial & Game': '#9aa7ba',
  };

  // A floating text label as a CanvasTexture sprite (no font files needed).
  function makeLabel(text, colorHex) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(14,18,26,0.85)';
    g.strokeStyle = colorHex || '#8fd0ff';
    g.lineWidth = 4;
    g.beginPath(); g.roundRect(6, 6, c.width - 12, c.height - 12, 16); g.fill(); g.stroke();
    g.fillStyle = colorHex || '#dfe7f3';
    g.font = 'bold 46px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 2);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sprite.scale.set(9, 1.7, 1);
    return sprite;
  }

  // Per-model name labels — core for an asset browser (80 look-alike
  // low-poly shapes are hard to tell apart). Off by default to keep the
  // overview clean; toggle in the HUD or deep-link with ?names=1.
  const nameLabels = [];
  const showNames = new URLSearchParams(location.search).get('names') === '1';
  function makeNameLabel(text) {
    const c = document.createElement('canvas');
    c.width = 384; c.height = 56;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(14,18,26,0.8)';
    g.beginPath(); g.roundRect(2, 2, c.width - 4, c.height - 4, 10); g.fill();
    g.fillStyle = '#dfe7f3';
    g.font = '30px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, c.width / 2, c.height / 2 + 1);
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    s.scale.set(4.2, 0.62, 1);
    return s;
  }

  let loaded = 0;
  let row = 0;           // running grid row across all sets
  let prevSet = null;
  let colInRow = 0;
  for (let i = 0; i < models.length; i++) {
    const entry = models[i];
    // Start each new set on a fresh row and drop a label above it.
    if (entry.set !== prevSet) {
      if (prevSet !== null && colInRow !== 0) row++;   // finish the partial row
      const label = makeLabel(`${entry.set}`, setColor[entry.set]);
      const zRow = (row - (models.length / COLS) / 2) * SPACING;
      label.position.set(-((COLS - 1) / 2) * SPACING - 1, 5.5, zRow - SPACING * 0.6);
      scene.add(label);
      (groupOf[entry.set] = groupOf[entry.set] || []).push(label);
      prevSet = entry.set;
      colInRow = 0;
    }
    try {
      const gltf = await loader.loadAsync(`../models/${entry.file}`);
      const object = gltf.scene;
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 4 / Math.max(size.x, size.y, size.z, 0.01);
      object.scale.setScalar(scale);
      const zRow = (row - (models.length / COLS) / 2) * SPACING;
      object.position.set(
        (colInRow - (COLS - 1) / 2) * SPACING - center.x * scale,
        -box.min.y * scale,
        zRow - center.z * scale);
      object.userData.set = entry.set;
      scene.add(object);
      (groupOf[entry.set] = groupOf[entry.set] || []).push(object);
      // Name label floating just above the model (controlled by the names
      // toggle + its set's filter, via refreshVisibility below).
      const nameSprite = makeNameLabel(entry.label || entry.stem);
      const topY = box.max.y * scale - box.min.y * scale;   // scaled height
      nameSprite.position.set(object.position.x, Math.max(topY, 0.5) + 0.7,
                              zRow - center.z * scale);
      nameSprite.userData.set = entry.set;
      nameSprite.visible = showNames;
      scene.add(nameSprite);
      nameLabels.push(nameSprite);
      loaded++;
      if (status) status.textContent = `${rendererLabel} · ${loaded}/${models.length} models`;
    } catch (err) {
      console.error('Failed to load', entry.file, err);
    }
    colInRow++;
    if (colInRow >= COLS) { colInRow = 0; row++; }
  }
  if (status) status.textContent = `${rendererLabel} · ${loaded}/${models.length} models loaded`;
  window.__molgangViewer = { renderer: rendererLabel, loaded, total: models.length, sets: Object.keys(groupOf) };

  // Shared visibility state: a set is hidden by its legend checkbox; name
  // labels additionally depend on the global names toggle.
  const hiddenSets = new Set();
  let namesOn = showNames;
  function refreshVisibility() {
    for (const set of Object.keys(groupOf)) {
      const vis = !hiddenSets.has(set);
      for (const obj of groupOf[set]) obj.visible = vis;
    }
    for (const s of nameLabels) s.visible = namesOn && !hiddenSets.has(s.userData.set);
  }

  buildLegend(groupOf, setColor, hiddenSets, refreshVisibility);
  buildNamesToggle((on) => { namesOn = on; refreshVisibility(); }, showNames);
  window.__molgangViewer.namesOn = () => namesOn;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  window.addEventListener('resize', resize);
  resize();

  // Render budget = duty cycle (a courtesy cap, not an OS/GPU guarantee).
  // OrbitControls damping still ticks every frame so input stays smooth.
  let refresh = 1000 / 60;
  let lastTick = performance.now();
  let lastRender = 0;
  const loop = (time) => {
    const delta = time - lastTick;
    lastTick = time;
    if (delta > 0 && delta < 40) refresh = refresh * 0.9 + delta * 0.1;
    controls.update();
    if (time - lastRender >= refresh / budget) {
      lastRender = time;
      resize();
      renderer.render(scene, camera);
    }
    requestAnimationFrame(loop);
  };
  if (!smokeMode) requestAnimationFrame(loop);
}

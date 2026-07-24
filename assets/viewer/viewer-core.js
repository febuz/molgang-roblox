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

/**
 * Build the gallery.
 * @param {object} opts
 * @param {THREE.Renderer} opts.renderer  a ready WebGL/WebGPU renderer
 * @param {string} opts.rendererLabel     e.g. "WebGPU · high-performance"
 * @param {number} opts.budget            render duty cycle 0..1 (GPU courtesy)
 */
export async function initGallery({ renderer, rendererLabel, budget }) {
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
  const models = manifest.models || [];
  const loader = new GLTFLoader();

  // Grid layout: 4 columns, centred, each cell normalised to ~4 units.
  const COLS = 4;
  const SPACING = 7;
  let loaded = 0;
  for (let i = 0; i < models.length; i++) {
    const entry = models[i];
    try {
      const gltf = await loader.loadAsync(`../models/${entry.file}`);
      const object = gltf.scene;
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 4 / Math.max(size.x, size.y, size.z, 0.01);
      object.scale.setScalar(scale);
      // Re-centre on its footprint so it sits on the floor.
      object.position.set(
        (i % COLS - (COLS - 1) / 2) * SPACING - center.x * scale,
        -box.min.y * scale,
        (Math.floor(i / COLS) - (models.length / COLS - 1) / 2) * SPACING - center.z * scale);
      scene.add(object);
      loaded++;
      if (status) status.textContent = `${rendererLabel} · ${loaded}/${models.length} models`;
    } catch (err) {
      console.error('Failed to load', entry.file, err);
    }
  }
  if (status) status.textContent = `${rendererLabel} · ${loaded}/${models.length} models loaded`;
  window.__molgangViewer = { renderer: rendererLabel, loaded, total: models.length };

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
  requestAnimationFrame(loop);
}

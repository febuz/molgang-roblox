import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const status = document.querySelector('#status');
const catalog = await (await fetch('../p2p-assets.json', { cache: 'no-cache' })).json();
const files = catalog.assets
  .filter((asset) => asset.kind === 'model' && asset.path.endsWith('.glb'))
  .map((asset) => asset.path);
if (files.length !== 48) throw new Error(`Expected 48 catalog models, received ${files.length}`);

if (!navigator.gpu) {
  status.textContent = 'WebGPU unavailable · use /lab3d/ compatibility route';
  window.__molgangWebGpuGallery = { renderer: 'unavailable', assets: 0 };
  throw new Error('WebGPU unavailable');
}

const renderer = new THREE.WebGPURenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
await renderer.init();
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b10);
scene.fog = new THREE.Fog(0x080b10, 30, 90);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
camera.position.set(18, 13, 22);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x101522, 1.8));
const key = new THREE.DirectionalLight(0xffffff, 3.2);
key.position.set(12, 22, 10);
scene.add(key);
const floor = new THREE.Mesh(new THREE.CircleGeometry(34, 64), new THREE.MeshStandardMaterial({ color: 0x182333, roughness: 0.82 }));
floor.rotation.x = -Math.PI / 2;
scene.add(floor);
scene.add(new THREE.GridHelper(60, 60, 0x315078, 0x1c2d45));

const loader = new GLTFLoader();
const loaded = [];
for (let i = 0; i < files.length; i++) {
  const gltf = await loader.loadAsync(`../assets/mirrored/models/${files[i]}`);
  const object = gltf.scene;
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const scale = 2.8 / Math.max(size.x, size.y, size.z, 0.01);
  object.scale.setScalar(scale);
  const col = i % 5;
  const row = Math.floor(i / 5);
  object.position.set((col - 2) * 6.5, 0, (row - 1) * 6.5);
  scene.add(object);
  loaded.push(files[i]);
  status.textContent = `WebGPU renderer · ${loaded.length}/${files.length} assets loaded`;
}
window.__molgangWebGpuGallery = { renderer: 'webgpu', assets: loaded.length, files: loaded };
status.textContent = `WebGPU renderer · ${loaded.length}/${files.length} assets loaded`;

function resize() {
  const width = canvas.clientWidth || innerWidth;
  const height = canvas.clientHeight || innerHeight;
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}
addEventListener('resize', resize);
resize();

// Render at most 49% of the display refresh (render-budget proxy, same policy
// as the main scene: a duty cycle, not an OS/GPU guarantee). OrbitControls
// damping still advances every animation tick so input stays responsive.
const RENDER_BUDGET = 0.49;
let refreshInterval = 1000 / 60;
let lastTick = performance.now();
let lastRender = 0;
renderer.setAnimationLoop((time) => {
  const delta = time - lastTick;
  lastTick = time;
  if (delta > 0 && delta < 40) refreshInterval = refreshInterval * 0.9 + delta * 0.1;
  controls.update();
  if (time - lastRender >= refreshInterval / RENDER_BUDGET) {
    lastRender = time;
    resize();
    renderer.render(scene, camera);
  }
});

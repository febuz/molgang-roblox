/**
 * web-game/src/renderer/environment.ts
 * HDR environment map loading per zone + IBL setup
 * Uses Three.js RGBELoader for RGBE (.hdr) files
 */

import * as THREE from "three";
import type { ZoneId } from "@/types/game";
import { ZONES } from "@/types/game";

// Cached environments per zone (avoid reloading)
const envCache = new Map<ZoneId, THREE.Texture>();

// Fallback procedural sky when HDR assets are missing
function createProceduralSky(accentColor: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  // Simple gradient sky
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#050810");
  gradient.addColorStop(0.5, accentColor + "22");
  gradient.addColorStop(1, "#080f18");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  // Add some "stars"
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 128;
    const r = Math.random() * 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

/**
 * Load the HDR environment map for a zone.
 * Falls back to a procedural sky if the HDR file is not available.
 */
export async function loadZoneEnvironment(
  scene: THREE.Scene,
  zoneId: ZoneId,
  pmremGenerator: THREE.PMREMGenerator
): Promise<THREE.Texture> {
  // Return cached
  const cached = envCache.get(zoneId);
  if (cached) {
    applyEnvironment(scene, cached);
    return cached;
  }

  const zone = ZONES[zoneId];

  try {
    const { RGBELoader } = await import("three/addons/loaders/RGBELoader.js");
    const loader = new RGBELoader();

    const hdrTexture = await new Promise<THREE.DataTexture>((resolve, reject) => {
      loader.load(zone.hdrPath, resolve, undefined, reject);
    });

    const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
    hdrTexture.dispose();
    pmremGenerator.dispose();

    envCache.set(zoneId, envMap);
    applyEnvironment(scene, envMap);
    console.log(`[environment] HDR loaded: ${zoneId}`);
    return envMap;
  } catch {
    // HDR not available yet — use procedural sky
    console.warn(`[environment] HDR not found for ${zoneId}, using procedural sky`);
    const fallback = createProceduralSky(zone.accentColor);
    const envMap = pmremGenerator.fromEquirectangular(fallback).texture;
    fallback.dispose();

    envCache.set(zoneId, envMap);
    applyEnvironment(scene, envMap);
    return envMap;
  }
}

function applyEnvironment(scene: THREE.Scene, envMap: THREE.Texture) {
  scene.environment = envMap;
  scene.background  = envMap;
  scene.backgroundIntensity = 0.15;   // dim background, keep IBL strong
  scene.environmentIntensity = 1.0;
}

/**
 * Set up ambient + directional lighting for a zone.
 * Used alongside IBL for fill light and hard shadows.
 */
export function setupZoneLighting(scene: THREE.Scene, zoneId: ZoneId): void {
  // Remove old zone lights
  const oldLights = scene.children.filter(
    c => c.userData.zoneLight === true
  );
  oldLights.forEach(l => scene.remove(l));

  const zone = ZONES[zoneId];
  const accent = new THREE.Color(zone.accentColor);

  // Hemisphere sky/ground light
  const hemi = new THREE.HemisphereLight(
    new THREE.Color(zone.primaryColor),
    new THREE.Color(0x0a0f08),
    0.4
  );
  hemi.userData.zoneLight = true;
  scene.add(hemi);

  // Main directional light (sun) with soft shadows
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(80, 120, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 500;
  sun.shadow.camera.left  = -100;
  sun.shadow.camera.right =  100;
  sun.shadow.camera.top   =  100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.bias = -0.001;
  sun.userData.zoneLight = true;
  scene.add(sun);

  // Accent rim light (zone color)
  const rim = new THREE.PointLight(accent, 2.0, 200);
  rim.position.set(-60, 40, -80);
  rim.userData.zoneLight = true;
  scene.add(rim);
}

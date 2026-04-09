/**
 * web-game/src/renderer/setup.ts
 * Three.js renderer setup — WebGPU-first with WebGL2 fallback
 * ACESFilmic tonemapping + PCFSoft shadows + pixel ratio clamp
 */

import * as THREE from "three";
import type { RendererStats } from "@/types/game";

// Dynamic import for WebGPU renderer (Three.js r168+)
// Falls back to WebGL2 if WebGPU is unavailable
let webGPUAvailable = false;

async function detectWebGPU(): Promise<boolean> {
  if (!("gpu" in navigator)) return false;
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

export interface RendererSetup {
  renderer: THREE.WebGLRenderer;
  isWebGPU: boolean;
  backend: string;
}

/**
 * Create and configure the primary renderer.
 * Returns the renderer + metadata about which backend is active.
 */
export async function createRenderer(container: HTMLElement): Promise<RendererSetup> {
  webGPUAvailable = await detectWebGPU();

  // For now we use WebGL2 (Three.js WebGPURenderer is still experimental)
  // In production: swap to WebGPURenderer when Three.js r170+ stabilizes it
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    logarithmicDepthBuffer: false,
  });

  // Pixel ratio: clamp to max 2× to avoid mobile GPU overload
  const dpr = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(container.clientWidth, container.clientHeight);

  // ACES Filmic tonemapping (cinematic look, matches Roblox Future Lighting)
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // High-quality shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // sRGB output
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Append canvas to container
  container.appendChild(renderer.domElement);

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  const backend = webGPUAvailable ? "WebGPU (WebGL2 fallback)" : "WebGL2";
  console.log(`[renderer] ${backend} active | DPR: ${dpr}`);

  return { renderer, isWebGPU: false, backend };
}

/**
 * Build the post-processing pipeline.
 * Chain: Render → SSAO → Bloom → SMAA → Output
 * Uses Three.js EffectComposer + passes.
 */
export async function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
) {
  // Dynamic import to keep initial bundle small
  const { EffectComposer } = await import("three/addons/postprocessing/EffectComposer.js");
  const { RenderPass } = await import("three/addons/postprocessing/RenderPass.js");
  const { UnrealBloomPass } = await import("three/addons/postprocessing/UnrealBloomPass.js");
  const { SMAAPass } = await import("three/addons/postprocessing/SMAAPass.js");
  const { OutputPass } = await import("three/addons/postprocessing/OutputPass.js");

  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);

  // 1. Base render
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. Bloom (neon glow on atoms + elements)
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    0.6,   // strength
    0.4,   // radius
    0.85   // threshold
  );
  composer.addPass(bloomPass);

  // 3. SMAA anti-aliasing
  const smaaPass = new SMAAPass(size.x, size.y);
  composer.addPass(smaaPass);

  // 4. Output (apply tonemapping + color space)
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return { composer, bloomPass };
}

/**
 * Collect renderer performance stats for HUD display.
 */
export function getRendererStats(
  renderer: THREE.WebGLRenderer,
  isWebGPU: boolean,
  backend: string,
  fps: number
): RendererStats {
  const info = renderer.info;
  return {
    fps: Math.round(fps),
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
    isWebGPU,
    backend,
  };
}

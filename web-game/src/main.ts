/**
 * web-game/src/main.ts
 * MOLGANG Web Game — main entry point
 * Boots renderer, loads session from sessionStorage (set by join.ts),
 * starts NexusScene, runs render loop.
 */

import * as THREE from "three";
import { createRenderer, createPostProcessing, getRendererStats } from "@/renderer/setup";
import { loadZoneEnvironment } from "@/renderer/environment";
import { NexusScene } from "@/scenes/NexusScene";
import { HUD } from "@/ui/HUD";
import { CharacterSelect } from "@/ui/CharacterSelect";
import { InventoryTransferOverlay } from "@/ui/InventoryTransferOverlay";
import { InteractionMenu, buildElementContext, buildMolChainContext } from "@/ui/InteractionMenu";
import type { PlayerSession, LoadingProgress } from "@/types/game";
import type { CharacterChoice } from "@/ui/CharacterSelect";

// ── Loading UI ─────────────────────────────────────────────────────────────────

function setLoadingProgress(p: LoadingProgress) {
  const bar   = document.getElementById("loading-bar");
  const text  = document.getElementById("loading-text");
  if (bar)  bar.style.width  = `${p.percent}%`;
  if (text) text.textContent = p.phase;
}

function hideLoadingScreen() {
  const screen = document.getElementById("loading-screen");
  if (screen) {
    screen.style.transition = "opacity 0.8s ease";
    screen.style.opacity = "0";
    setTimeout(() => screen.remove(), 900);
  }
}

// ── Session ────────────────────────────────────────────────────────────────────

function loadSession(): PlayerSession {
  const raw = sessionStorage.getItem("molgang_session");
  if (raw) {
    try {
      return JSON.parse(raw) as PlayerSession;
    } catch {/* fall through */}
  }

  // Demo session when accessed directly (no QR scan)
  return {
    id: "demo",
    name: "Explorer",
    molBalance: 250,
    level: 1,
    inventory: [
      { z: 1, n: 12 }, { z: 8, n: 6 }, { z: 6, n: 4 },
      { z: 26, n: 2 }, { z: 79, n: 1 }, { z: 20, n: 3 },
    ],
    molecules: ["H2O"],
    expiresAt: Date.now() / 1000 + 86400,
  };
}

// ── Bootstrap ──────────────────────────────────────────────────────────────────

async function boot() {
  const container = document.getElementById("canvas-container")!;
  const session = loadSession();

  // 1. Init renderer
  setLoadingProgress({ phase: "Initializing renderer...", percent: 10 });
  const { renderer, isWebGPU, backend } = await createRenderer(container);

  // 2. Create scene + camera
  setLoadingProgress({ phase: "Building world...", percent: 25 });
  const nexusScene = new NexusScene(session);
  const scene = nexusScene.scene;

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    2000
  );
  camera.position.set(0, 12, 60);
  camera.lookAt(0, 5, 0);

  // 3. Post-processing
  setLoadingProgress({ phase: "Setting up post-processing...", percent: 50 });
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const { composer } = await createPostProcessing(renderer, scene, camera);

  // 4. Environment
  setLoadingProgress({ phase: "Loading environment...", percent: 70 });
  await loadZoneEnvironment(scene, "nexus", pmremGenerator);

  // 5. HUD
  setLoadingProgress({ phase: "Preparing HUD...", percent: 90 });
  const hud = new HUD(container, session);
  hud.updateZone("nexus");

  // 6. Interaction menu
  const interactionMenu = new InteractionMenu(container, (type) => {
    switch (type) {
      case "inspect":
        hud.notify("Inspecting element...", "#60a5fa");
        break;
      case "collect":
        hud.notify("Element collected! +1 to inventory", "#22c55e");
        break;
      case "quiz":
        hud.notify("Quiz started! Answer for MolCoins", "#ffd700");
        break;
      case "build":
        hud.notify("Opening molecule builder...", "#22c55e");
        break;
      case "chain_register":
        hud.notify("Registering on MolChain...", "#22d3ee");
        break;
      default:
        hud.notify(`Action: ${type}`, "#d4c8b8");
    }
  });

  // 7. Camera orbit controls
  setLoadingProgress({ phase: "Ready!", percent: 100 });
  setupOrbitControls(camera, container, interactionMenu);

  hideLoadingScreen();

  // 8. Show inventory transfer overlay if coming from Roblox QR
  const fromRoblox = sessionStorage.getItem("molgang_session") !== null;
  if (fromRoblox) {
    new InventoryTransferOverlay(container, session, () => {
      showCharacterSelect(container, session, hud);
    });
  } else {
    showCharacterSelect(container, session, hud);
  }

  // ── Render loop ────────────────────────────────────────────────────────────

  let lastTime = performance.now();
  let fpsAccum = 0;
  let fpsCount = 0;

  function animate() {
    requestAnimationFrame(animate);

    const now  = performance.now();
    const dt   = (now - lastTime) / 1000;
    lastTime   = now;

    // FPS counter (rolling average)
    fpsAccum += 1 / dt;
    fpsCount++;
    const fps = fpsAccum / fpsCount;
    if (fpsCount >= 60) { fpsAccum = 0; fpsCount = 0; }

    // Update scene animations
    nexusScene.update();

    // Render via composer (post-processing)
    composer.render();

    // Update HUD stats every 30 frames
    if (fpsCount % 30 === 0) {
      hud.updateStats(getRendererStats(renderer, isWebGPU, backend, fps));
    }
  }

  animate();

  // Handle visibility change (pause when tab hidden)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      console.log("[main] Tab hidden — pausing render");
    }
  });

  // Window resize: update camera aspect
  window.addEventListener("resize", () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer.setSize(w, h);
  });
}

// ── Character select + path unlock ────────────────────────────────────────────

function showCharacterSelect(
  container: HTMLElement,
  session: PlayerSession,
  hud: HUD
) {
  // Only show on first visit (check localStorage)
  const savedChar = localStorage.getItem(`molgang_char_${session.id}`);
  if (savedChar) {
    const choice = JSON.parse(savedChar) as CharacterChoice;
    hud.notify(`Welcome back, ${choice.name}!`, "#22c55e");
    return;
  }

  new CharacterSelect(container, session, (choice) => {
    localStorage.setItem(`molgang_char_${session.id}`, JSON.stringify(choice));
    hud.notify(`Path chosen: ${choice.name}`, "#22c55e");
    setTimeout(() => hud.notify("Explore the world — press E to interact", "#60a5fa"), 2000);
  });
}

// ── Simple Orbit Controls ──────────────────────────────────────────────────────
// Replaces OrbitControls import for a zero-dependency orbit

function setupOrbitControls(
  camera: THREE.PerspectiveCamera,
  el: HTMLElement,
  interactionMenu?: InteractionMenu
) {
  let isDragging = false;
  let prevX = 0, prevY = 0;
  let theta = 0, phi = Math.PI / 4;
  let radius = 80;
  const target = new THREE.Vector3(0, 8, 0);

  function updateCamera() {
    camera.position.set(
      target.x + radius * Math.sin(phi) * Math.sin(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(target);
  }

  el.addEventListener("mousedown", (e) => {
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    theta -= dx * 0.005;
    phi = Math.max(0.1, Math.min(Math.PI * 0.48, phi + dy * 0.005));
    prevX = e.clientX;
    prevY = e.clientY;
    updateCamera();
  });

  window.addEventListener("mouseup", () => { isDragging = false; });

  el.addEventListener("wheel", (e) => {
    radius = Math.max(20, Math.min(300, radius + e.deltaY * 0.1));
    updateCamera();
  }, { passive: true });

  // Touch support
  let lastTouchDist = 0;
  el.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  });

  el.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      const dx = e.touches[0].clientX - prevX;
      const dy = e.touches[0].clientY - prevY;
      theta -= dx * 0.005;
      phi = Math.max(0.1, Math.min(Math.PI * 0.48, phi + dy * 0.005));
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
      updateCamera();
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      radius = Math.max(20, Math.min(300, radius - (dist - lastTouchDist) * 0.3));
      lastTouchDist = dist;
      updateCamera();
    }
  }, { passive: false });

  el.addEventListener("touchend", () => { isDragging = false; });

  // Demo interaction: click on world objects
  if (interactionMenu) {
    el.addEventListener("click", (_e) => {
      // Cycle through demo interactions on click (in real game this would raycast)
      const demos = [
        () => interactionMenu.show(buildElementContext("Au", 79, "nexus", false)),
        () => interactionMenu.show(buildElementContext("H", 1, "nexus", true)),
        () => interactionMenu.show(buildMolChainContext("nexus")),
      ];
      const idx = Math.floor(Math.random() * demos.length);
      demos[idx]();
    });
  }

  updateCamera();
}

// ── Launch ─────────────────────────────────────────────────────────────────────

boot().catch(err => {
  console.error("[main] Boot failed:", err);
  const screen = document.getElementById("loading-screen");
  const text   = document.getElementById("loading-text");
  if (text) {
    text.textContent = `Error: ${err.message}`;
    text.style.color = "#ef4444";
  }
  if (screen) screen.style.display = "flex";
});

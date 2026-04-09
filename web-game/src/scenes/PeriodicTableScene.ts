/**
 * web-game/src/scenes/PeriodicTableScene.ts
 * Periodic Table Biome — Noord zone
 * 118 element islands arranged in periodic table layout
 * Each element is a glowing sphere with real element colors
 */

import * as THREE from "three";
import type { PlayerSession } from "@/types/game";
import { setupZoneLighting } from "@/renderer/environment";
// ELEMENTS_DATA used for future element info panel

// Element group → color (matches Roblox Periodic Table Biome)
const GROUP_COLORS: Record<string, number> = {
  "alkali":        0xc83c3c,
  "alkaline":      0x3c8c3c,
  "transition":    0x507890,
  "post-tran":     0x6080b0,
  "metalloid":     0x408070,
  "nonmetal":      0xb0a040,
  "halogen":       0xdc8c28,
  "noble":         0x8c50c8,
  "lanthanide":    0x3cb4a0,
  "actinide":      0xb05030,
  "unknown":       0x505060,
};

// Periodic table layout: [period, group] for each Z (1–118)
// Simplified: group derived from Z range
function getGroupColor(z: number): number {
  if (z === 1 || (z >= 3 && z <= 3))  return GROUP_COLORS.alkali;
  if (z === 2 || (z >= 10 && z <= 10)) return GROUP_COLORS.noble;
  if (z >= 57 && z <= 71)  return GROUP_COLORS.lanthanide;
  if (z >= 89 && z <= 103) return GROUP_COLORS.actinide;
  if ([9, 17, 35, 53, 85, 117].includes(z)) return GROUP_COLORS.halogen;
  if ([2, 10, 18, 36, 54, 86, 118].includes(z)) return GROUP_COLORS.noble;
  if (z >= 21 && z <= 30)  return GROUP_COLORS.transition;
  if (z >= 39 && z <= 48)  return GROUP_COLORS.transition;
  if (z >= 72 && z <= 80)  return GROUP_COLORS.transition;
  if (z >= 104 && z <= 112) return GROUP_COLORS.transition;
  if ([5, 14, 32, 33, 51, 52, 84].includes(z)) return GROUP_COLORS.metalloid;
  if ([6, 7, 8, 15, 16, 34].includes(z)) return GROUP_COLORS.nonmetal;
  if ([4, 12, 20, 38, 56, 88].includes(z)) return GROUP_COLORS.alkaline;
  if ([3, 11, 19, 37, 55, 87].includes(z)) return GROUP_COLORS.alkali;
  return GROUP_COLORS["post-tran"];
}

// Periodic table 2D position: returns [row, col] (1-indexed)
function getTablePosition(z: number): [number, number] {
  // Standard 18-column periodic table layout
  const layout: [number, number][] = [];
  // Period 1
  layout[1] = [1, 1]; layout[2] = [1, 18];
  // Period 2
  for (let i = 3; i <= 10; i++) layout[i] = [2, i <= 4 ? i - 1 : i + 8];
  // Period 3
  for (let i = 11; i <= 18; i++) layout[i] = [3, i <= 12 ? i - 9 : i + 0];
  // Period 4
  for (let i = 19; i <= 36; i++) layout[i] = [4, i <= 20 ? i - 17 : i - 18];
  // Period 5
  for (let i = 37; i <= 54; i++) layout[i] = [5, i <= 38 ? i - 35 : i - 36];
  // Period 6
  for (let i = 55; i <= 86; i++) {
    if (i >= 57 && i <= 71) layout[i] = [9, i - 57 + 3]; // lanthanides
    else layout[i] = [6, i <= 56 ? i - 53 : i <= 71 ? 3 : i - 68];
  }
  // Period 7
  for (let i = 87; i <= 118; i++) {
    if (i >= 89 && i <= 103) layout[i] = [10, i - 89 + 3]; // actinides
    else layout[i] = [7, i <= 88 ? i - 85 : i <= 103 ? 3 : i - 100];
  }

  return layout[z] ?? [8, 1];
}

export class PeriodicTableScene {
  scene: THREE.Scene;
  private clock = new THREE.Clock();
  private elementMeshes: THREE.Mesh[] = [];
  private playerInventory: Set<number>;
  private raycaster = new THREE.Raycaster();

  constructor(player: PlayerSession) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080f1a, 0.003);
    this.playerInventory = new Set(player.inventory.map(e => e.z));

    setupZoneLighting(this.scene, "periodic");
    this.buildElementIslands();
    this.buildStarfield();
    this.buildFloor();
  }

  private buildFloor() {
    // Large bright platform for periodic biome
    const geo = new THREE.PlaneGeometry(600, 600, 8, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd8e8f0,
      roughness: 0.8,
      metalness: 0.0,
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -5;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  private buildElementIslands() {
    const SPACING_X = 18;
    const SPACING_Z = 22;
    const CENTER_X  = -SPACING_X * 9;
    const CENTER_Z  = -SPACING_Z * 4;

    for (let z = 1; z <= 118; z++) {
      const [row, col] = getTablePosition(z);
      const color = getGroupColor(z);
      const owned = this.playerInventory.has(z);

      const worldX = CENTER_X + (col - 1) * SPACING_X;
      const worldZ = CENTER_Z + (row - 1) * SPACING_Z;
      const worldY = 0;

      // Island base (flat cylinder)
      const islandGeo = new THREE.CylinderGeometry(5, 6, 1.5, 6);
      const islandMat = new THREE.MeshStandardMaterial({
        color: owned ? color : 0x1a2a3a,
        metalness: 0.3,
        roughness: 0.7,
        emissive: owned ? new THREE.Color(color) : new THREE.Color(0x050810),
        emissiveIntensity: owned ? 0.1 : 0,
      });
      const island = new THREE.Mesh(islandGeo, islandMat);
      island.position.set(worldX, worldY, worldZ);
      island.receiveShadow = true;
      island.userData = { elementZ: z, type: "island" };
      this.scene.add(island);

      // Element sphere (glowing)
      const radius = 2.5 + (owned ? 0.5 : 0);
      const sphereGeo = new THREE.SphereGeometry(radius, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color,
        emissive: new THREE.Color(color),
        emissiveIntensity: owned ? 1.2 : 0.1,
        metalness: owned ? 0.6 : 0.1,
        roughness: owned ? 0.2 : 0.9,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(worldX, worldY + 3.5, worldZ);
      sphere.castShadow = true;
      sphere.userData = { elementZ: z, type: "element" };
      this.scene.add(sphere);

      this.elementMeshes.push(sphere);

      // Animate owned elements
      if (owned) {
        const baseY = worldY + 3.5;
        const offset = z * 0.15;
        sphere.userData.baseY = baseY;
        sphere.userData.offset = offset;
      }
    }
  }

  private buildStarfield() {
    const count = 3000;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 2000;
      pos[i * 3 + 1] = 100 + Math.random() * 400;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0.7 });
    this.scene.add(new THREE.Points(geo, mat));
  }

  // ── Raycast hover for element inspection ─────────────────────────────────────

  checkHover(camera: THREE.Camera, mouseNDC: THREE.Vector2): number | null {
    this.raycaster.setFromCamera(mouseNDC, camera);
    const hits = this.raycaster.intersectObjects(this.elementMeshes);
    if (hits.length > 0) {
      return hits[0].object.userData.elementZ as number;
    }
    return null;
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  update() {
    const t = this.clock.getElapsedTime();
    for (const mesh of this.elementMeshes) {
      if (this.playerInventory.has(mesh.userData.elementZ)) {
        mesh.position.y = mesh.userData.baseY + Math.sin(t + mesh.userData.offset) * 0.6;
        mesh.rotation.y = t * 0.3 + mesh.userData.offset;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.8 + Math.sin(t * 2 + mesh.userData.offset) * 0.4;
      }
    }
  }

  dispose() {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}

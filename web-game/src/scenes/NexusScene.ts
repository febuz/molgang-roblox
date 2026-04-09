/**
 * web-game/src/scenes/NexusScene.ts
 * MOLGANG Nexus Hub — spawn zone scene
 * Procedural 3D world: floating platform, MolChain tower, ANK building
 * No assets required — all geometry is THREE.js primitives
 */

import * as THREE from "three";
import type { PlayerSession } from "@/types/game";
import { setupZoneLighting } from "@/renderer/environment";

// Zone palette (matches Roblox WorldBuilder)
const C = {
  NEON_GREEN:  new THREE.Color(0x00ff78),
  NEON_BLUE:   new THREE.Color(0x50b4ff),
  GOLD:        new THREE.Color(0xdaa520),
  DARK:        new THREE.Color(0x080f18),
  PLATFORM:    new THREE.Color(0x1a2235),
  GLASS:       new THREE.Color(0xb4dcff),
  XRPL_GREEN:  new THREE.Color(0x23c864),
  ANK_GREEN:   new THREE.Color(0x228b22),
};

export class NexusScene {
  scene: THREE.Scene;
  private clock = new THREE.Clock();
  private animatables: Array<{ mesh: THREE.Mesh; update: (t: number) => void }> = [];

  constructor(_player: PlayerSession) {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050810, 0.006);

    setupZoneLighting(this.scene, "nexus");
    this.buildWorld();
  }

  private buildWorld() {
    this.buildMainPlatform();
    this.buildMolChainTower();
    this.buildANKBuilding();
    this.buildMarketPlaza();
    this.buildFloatingIslands();
    this.buildStarfield();
  }

  // ── Main Platform ────────────────────────────────────────────────────────────

  private buildMainPlatform() {
    // Hexagonal platform (approximated with cylinder)
    const geo = new THREE.CylinderGeometry(80, 90, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: C.PLATFORM,
      metalness: 0.4,
      roughness: 0.6,
      envMapIntensity: 0.8,
    });
    const platform = new THREE.Mesh(geo, mat);
    platform.position.set(0, -3, 0);
    platform.castShadow = false;
    platform.receiveShadow = true;
    this.scene.add(platform);

    // Glowing rim ring
    const rimGeo = new THREE.TorusGeometry(84, 0.8, 8, 48);
    const rimMat = new THREE.MeshStandardMaterial({
      color: C.NEON_GREEN,
      emissive: C.NEON_GREEN,
      emissiveIntensity: 2.0,
      roughness: 0,
      metalness: 0,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.5;
    this.scene.add(rim);

    // Spawn pad
    const padGeo = new THREE.CylinderGeometry(8, 8, 0.3, 16);
    const padMat = new THREE.MeshStandardMaterial({
      color: C.NEON_GREEN,
      emissive: C.NEON_GREEN,
      emissiveIntensity: 0.3,
      roughness: 0.2,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(0, 3.2, 0);
    this.scene.add(pad);

    // Spawn pad glow animation
    this.animatables.push({
      mesh: pad,
      update: (t) => {
        (pad.material as THREE.MeshStandardMaterial).emissiveIntensity =
          0.2 + Math.sin(t * 2) * 0.1;
      },
    });
  }

  // ── MolChain Tower (DNA Helix) ───────────────────────────────────────────────

  private buildMolChainTower() {
    const GROUP_X = 120;

    // Central tower core
    const coreGeo = new THREE.CylinderGeometry(2, 2, 200, 8);
    const coreMat = new THREE.MeshStandardMaterial({
      color: C.DARK,
      metalness: 0.9,
      roughness: 0.1,
      emissive: C.XRPL_GREEN,
      emissiveIntensity: 0.05,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(GROUP_X, 100, 0);
    core.castShadow = true;
    this.scene.add(core);

    // DNA helix rungs (60 rungs spiraling upward)
    const rungMat = new THREE.MeshStandardMaterial({
      color: C.XRPL_GREEN,
      emissive: C.XRPL_GREEN,
      emissiveIntensity: 1.0,
      roughness: 0,
      metalness: 0.8,
    });

    for (let i = 0; i < 60; i++) {
      const t = i / 60;
      const angle = t * Math.PI * 8;  // 4 full rotations
      const y = t * 190 + 5;
      const radius = 12 + Math.sin(t * Math.PI) * 4;

      const rungGeo = new THREE.SphereGeometry(1.2, 8, 8);
      const rung = new THREE.Mesh(rungGeo, rungMat.clone());
      rung.position.set(
        GROUP_X + Math.cos(angle) * radius,
        y,
        Math.sin(angle) * radius
      );
      this.scene.add(rung);

      // Animate pulsing emissive
      const offset = i * 0.1;
      this.animatables.push({
        mesh: rung,
        update: (t_) => {
          (rung.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.6 + Math.sin(t_ * 2 + offset) * 0.4;
        },
      });
    }

    // Base platform of tower
    const baseGeo = new THREE.CylinderGeometry(20, 24, 4, 8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: C.PLATFORM,
      metalness: 0.7,
      roughness: 0.3,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(GROUP_X, 2, 0);
    base.castShadow = true;
    this.scene.add(base);
  }

  // ── ANK Kredietunie ──────────────────────────────────────────────────────────

  private buildANKBuilding() {
    const GROUP_X = -80;

    // Main glass building body
    const bodyGeo = new THREE.BoxGeometry(40, 50, 40);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: C.GLASS,
      metalness: 0.0,
      roughness: 0.05,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
      ior: 1.5,
      envMapIntensity: 2.0,
    });
    const body = new THREE.Mesh(bodyGeo, glassMat);
    body.position.set(GROUP_X, 28, 0);
    body.castShadow = true;
    this.scene.add(body);

    // ANK logo neon sign
    const signGeo = new THREE.TorusGeometry(8, 0.6, 8, 32);
    const signMat = new THREE.MeshStandardMaterial({
      color: C.ANK_GREEN,
      emissive: C.ANK_GREEN,
      emissiveIntensity: 2.0,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(GROUP_X, 58, 0);
    this.scene.add(sign);

    // Roof dome
    const domeGeo = new THREE.SphereGeometry(22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: C.GLASS,
      metalness: 0.1,
      roughness: 0.0,
      transmission: 0.9,
      transparent: true,
      opacity: 0.6,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(GROUP_X, 54, 0);
    this.scene.add(dome);

    // Base steps
    for (let i = 0; i < 3; i++) {
      const stepGeo = new THREE.BoxGeometry(48 - i * 4, 2, 48 - i * 4);
      const stepMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xe8f4e8),
        roughness: 0.4,
      });
      const step = new THREE.Mesh(stepGeo, stepMat);
      step.position.set(GROUP_X, 1 + i * 2, 0);
      step.receiveShadow = true;
      this.scene.add(step);
    }
  }

  // ── Market Plaza ─────────────────────────────────────────────────────────────

  private buildMarketPlaza() {
    // Central quiz pillar
    const pillarGeo = new THREE.CylinderGeometry(2, 2.5, 20, 6);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: C.GOLD,
      metalness: 0.8,
      roughness: 0.2,
      emissive: C.GOLD,
      emissiveIntensity: 0.1,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(0, 10, -50);
    pillar.castShadow = true;
    this.scene.add(pillar);

    // Holographic display ring on pillar top
    const holo = new THREE.TorusGeometry(5, 0.3, 8, 32);
    const holoMat = new THREE.MeshStandardMaterial({
      color: C.NEON_BLUE,
      emissive: C.NEON_BLUE,
      emissiveIntensity: 1.5,
    });
    const holoRing = new THREE.Mesh(holo, holoMat);
    holoRing.position.set(0, 21, -50);
    holoRing.rotation.x = Math.PI / 2;
    this.scene.add(holoRing);

    // Slowly rotate
    this.animatables.push({
      mesh: holoRing,
      update: (t) => {
        holoRing.rotation.z = t * 0.5;
      },
    });
  }

  // ── Floating Islands ──────────────────────────────────────────────────────────

  private buildFloatingIslands() {
    const islands = [
      { pos: new THREE.Vector3(200, -30, 180), scale: 0.6, color: 0x1a2a3a },
      { pos: new THREE.Vector3(-180, -20, 200), scale: 0.4, color: 0x1a3a1a },
      { pos: new THREE.Vector3(240, -40, -150), scale: 0.5, color: 0x2a1a3a },
      { pos: new THREE.Vector3(-200, -35, -180), scale: 0.45, color: 0x2a2a1a },
    ];

    islands.forEach(({ pos, scale, color }) => {
      const geo = new THREE.DodecahedronGeometry(40 * scale, 1);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0.1,
      });
      const island = new THREE.Mesh(geo, mat);
      island.position.copy(pos);
      island.castShadow = true;
      island.receiveShadow = true;
      this.scene.add(island);

      // Gentle floating bob
      const baseY = pos.y;
      this.animatables.push({
        mesh: island,
        update: (t) => {
          island.position.y = baseY + Math.sin(t * 0.3 + pos.x * 0.01) * 3;
        },
      });
    });
  }

  // ── Starfield ─────────────────────────────────────────────────────────────────

  private buildStarfield() {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 800 + Math.random() * 400;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
    });
    this.scene.add(new THREE.Points(geo, mat));
  }

  // ── Update ────────────────────────────────────────────────────────────────────

  update() {
    const t = this.clock.getElapsedTime();
    for (const a of this.animatables) {
      a.update(t);
    }
  }

  dispose() {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}

/**
 * web-game/src/types/game.ts
 * Core game types for MOLGANG Web Game
 */

// ── Player session (received from bridge after QR scan) ───────────────────────
export interface PlayerSession {
  id: string;
  name: string;
  molBalance: number;
  level: number;
  inventory: InventoryEntry[];
  molecules: string[];
  expiresAt: number;
}

export interface InventoryEntry {
  z: number;      // atomic number
  n: number;      // count
}

// ── Game zones (matching Roblox world) ────────────────────────────────────────
export type ZoneId =
  | "nexus"
  | "periodic"
  | "quantum"
  | "slakkenspoor"
  | "molchain"
  | "ank";

export interface Zone {
  id: ZoneId;
  name: string;
  description: string;
  hdrPath: string;           // RGBE HDR environment map path
  primaryColor: string;      // hex
  accentColor: string;
  unlockLevel: number;
}

export const ZONES: Record<ZoneId, Zone> = {
  nexus: {
    id: "nexus",
    name: "Molgang Nexus Hub",
    description: "Spawn zone — MolChain Tower, ANK bank, tutorials",
    hdrPath: "/assets/hdr/nexus.hdr",
    primaryColor: "#22c55e",
    accentColor: "#4ade80",
    unlockLevel: 0,
  },
  periodic: {
    id: "periodic",
    name: "Periodic Table Biome",
    description: "118 element islands with quiz pillars",
    hdrPath: "/assets/hdr/periodic.hdr",
    primaryColor: "#60a5fa",
    accentColor: "#93c5fd",
    unlockLevel: 1,
  },
  quantum: {
    id: "quantum",
    name: "Quantum Lab",
    description: "Cryogenic zone — superheavy elements, quantum dots",
    hdrPath: "/assets/hdr/quantum.hdr",
    primaryColor: "#a78bfa",
    accentColor: "#c4b5fd",
    unlockLevel: 3,
  },
  slakkenspoor: {
    id: "slakkenspoor",
    name: "Slakkenspoor Fabriek",
    description: "Industrial BOF slag processing — HGMS separator",
    hdrPath: "/assets/hdr/slakkenspoor.hdr",
    primaryColor: "#f59e0b",
    accentColor: "#fcd34d",
    unlockLevel: 5,
  },
  molchain: {
    id: "molchain",
    name: "MolChain Registry Tower",
    description: "200-stud DNA helix, blockchain explorer",
    hdrPath: "/assets/hdr/molchain.hdr",
    primaryColor: "#22d3ee",
    accentColor: "#67e8f9",
    unlockLevel: 7,
  },
  ank: {
    id: "ank",
    name: "ANK Kredietunie",
    description: "Glass cooperative bank — lend and borrow MolCoins",
    hdrPath: "/assets/hdr/ank.hdr",
    primaryColor: "#34d399",
    accentColor: "#6ee7b7",
    unlockLevel: 10,
  },
};

// ── NFT Equipment item ─────────────────────────────────────────────────────────
export interface NFTItem {
  tokenId: string;
  serialNumber: number;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary" | "quantum";
  modelUrl: string;       // HD GLTF model
  attachBone: string;     // character bone to attach to
  glowColor: string;      // emissive color hex
  molValue: number;
}

// ── Renderer state ─────────────────────────────────────────────────────────────
export interface RendererStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  isWebGPU: boolean;
  backend: string;
}

// ── Loading progress ───────────────────────────────────────────────────────────
export interface LoadingProgress {
  phase: string;
  percent: number;
}

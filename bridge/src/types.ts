/**
 * bridge/src/types.ts
 * Shared type definitions for MOLGANG bridge worker
 */

// ── Cloudflare Worker environment bindings ────────────────────────────────────
export interface BridgeEnv {
  // KV namespace (session store)
  SESSIONS: KVNamespace;
  // R2 bucket (QR image store)
  QR_BUCKET: R2Bucket;
  // Secrets (set via wrangler secret put)
  JWT_SECRET: string;
  ROBLOX_API_SECRET: string;
  HEDERA_OPERATOR_ID: string;
  HEDERA_OPERATOR_KEY: string;
  // Vars (set in wrangler.toml)
  BRIDGE_ENV: "production" | "staging" | "development";
  SESSION_TTL_SECONDS: string;
  QR_BASE_URL: string;
}

// ── Player snapshot sent from Roblox server ───────────────────────────────────
export interface PlayerSnapshot {
  playerId: number;
  playerName: string;
  molBalance: number;
  level: number;
  inventory: InventoryEntry[];
  molecules: string[];
}

export interface InventoryEntry {
  z: number;    // atomic number
  n: number;    // count
}

// ── JWT session payload ───────────────────────────────────────────────────────
export interface SessionPayload {
  sub: string;         // playerId as string
  name: string;        // playerName
  mol: number;         // MolCoin balance
  lvl: number;         // player level
  inv: InventoryEntry[];
  mols: string[];      // registered molecule names
  iat: number;         // issued at (unix)
  exp: number;         // expires at (unix)
}

// ── API response types ────────────────────────────────────────────────────────
export interface GenerateQRResponse {
  qr_url: string;
  session_token: string;
  expires_at: number;
  web_url: string;
}

export interface VerifySessionResponse {
  valid: boolean;
  player: {
    id: string;
    name: string;
    molBalance: number;
    level: number;
    inventory: InventoryEntry[];
    molecules: string[];
  };
  expiresAt: number;
}

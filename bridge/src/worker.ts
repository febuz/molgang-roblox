/**
 * bridge/src/worker.ts
 * MOLGANG Bridge Worker — Cloudflare Workers (Edge Runtime)
 *
 * Routes:
 *   POST /v1/generate-qr     Roblox server → generate QR + JWT session
 *   POST /v1/verify-session  Web client → verify JWT, return player data
 *   GET  /qr/:token.png      Public: serve QR image from R2
 *   GET  /health             Uptime check
 *
 * Auth:
 *   Roblox → Worker: X-Roblox-Secret header (shared secret)
 *   Worker → Web:    signed JWT (HS256, 5 min TTL)
 */

import { generateQRCode } from "./qr";
import { signJWT, verifyJWT } from "./jwt";
import type { PlayerSnapshot, SessionPayload, BridgeEnv } from "./types";

export default {
  async fetch(request: Request, env: BridgeEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers for web client requests
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Roblox-Secret",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders, status: 204 });
    }

    try {
      // ── Route: Health check ──────────────────────────────────────────
      if (url.pathname === "/health") {
        return json({ status: "ok", ts: Date.now() }, corsHeaders);
      }

      // ── Route: Generate QR session (called by Roblox server) ────────
      if (url.pathname === "/v1/generate-qr" && method === "POST") {
        return handleGenerateQR(request, env, corsHeaders);
      }

      // ── Route: Verify session (called by web game on QR scan) ────────
      if (url.pathname === "/v1/verify-session" && method === "POST") {
        return handleVerifySession(request, env, corsHeaders);
      }

      // ── Route: Serve QR image from R2 ───────────────────────────────
      if (url.pathname.startsWith("/qr/") && method === "GET") {
        return handleQRImage(url, env, corsHeaders);
      }

      return json({ error: "Not found" }, corsHeaders, 404);
    } catch (err) {
      console.error("[bridge] Unhandled error:", err);
      return json({ error: "Internal server error" }, corsHeaders, 500);
    }
  },
};

// ══════════════════════════════════════════════
// HANDLER: Generate QR session
// ══════════════════════════════════════════════

async function handleGenerateQR(
  request: Request,
  env: BridgeEnv,
  cors: Record<string, string>
): Promise<Response> {
  // Authenticate Roblox server
  const robloxSecret = request.headers.get("X-Roblox-Secret");
  if (!robloxSecret || robloxSecret !== env.ROBLOX_API_SECRET) {
    return json({ error: "Unauthorized" }, cors, 401);
  }

  // Parse player snapshot
  let snapshot: PlayerSnapshot;
  try {
    snapshot = await request.json() as PlayerSnapshot;
  } catch {
    return json({ error: "Invalid JSON body" }, cors, 400);
  }

  // Validate required fields
  if (!snapshot.playerId || !snapshot.playerName) {
    return json({ error: "Missing playerId or playerName" }, cors, 400);
  }

  // Build session payload
  const now = Math.floor(Date.now() / 1000);
  const ttl = parseInt(env.SESSION_TTL_SECONDS || "300");
  const sessionPayload: SessionPayload = {
    sub: String(snapshot.playerId),
    name: snapshot.playerName,
    mol: snapshot.molBalance || 0,
    lvl: snapshot.level || 1,
    inv: snapshot.inventory || [],
    mols: snapshot.molecules || [],
    iat: now,
    exp: now + ttl,
  };

  // Sign JWT
  const token = await signJWT(sessionPayload, env.JWT_SECRET);

  // Generate QR code PNG containing the web game URL with the token
  const webGameUrl = `https://play.molgang.app/join?token=${token}`;
  const qrPng = await generateQRCode(webGameUrl);

  // Store QR image in R2
  const qrKey = `${snapshot.playerId}_${now}.png`;
  await env.QR_BUCKET.put(qrKey, qrPng, {
    httpMetadata: { contentType: "image/png" },
    customMetadata: { playerId: String(snapshot.playerId), expires: String(now + ttl) },
  });

  const qrUrl = `${env.QR_BASE_URL}/${qrKey}`;

  // Store session in KV for fast lookup
  await env.SESSIONS.put(
    `session:${token.slice(-16)}`,
    JSON.stringify(sessionPayload),
    { expirationTtl: ttl }
  );

  return json({
    qr_url: qrUrl,
    session_token: token,
    expires_at: now + ttl,
    web_url: webGameUrl,
  }, cors);
}

// ══════════════════════════════════════════════
// HANDLER: Verify session
// ══════════════════════════════════════════════

async function handleVerifySession(
  request: Request,
  env: BridgeEnv,
  cors: Record<string, string>
): Promise<Response> {
  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, cors, 400);
  }

  if (!body.token) {
    return json({ error: "Missing token" }, cors, 400);
  }

  // Verify JWT signature + expiry
  let payload: SessionPayload;
  try {
    payload = await verifyJWT(body.token, env.JWT_SECRET);
  } catch (err: any) {
    return json({ error: err.message || "Invalid token" }, cors, 401);
  }

  // Also check KV for revocation (future: add revocation endpoint)
  const kvKey = `session:${body.token.slice(-16)}`;
  const stored = await env.SESSIONS.get(kvKey);
  if (!stored) {
    return json({ error: "Session expired or revoked" }, cors, 401);
  }

  return json({
    valid: true,
    player: {
      id: payload.sub,
      name: payload.name,
      molBalance: payload.mol,
      level: payload.lvl,
      inventory: payload.inv,
      molecules: payload.mols,
    },
    expiresAt: payload.exp,
  }, cors);
}

// ══════════════════════════════════════════════
// HANDLER: Serve QR image
// ══════════════════════════════════════════════

async function handleQRImage(
  url: URL,
  env: BridgeEnv,
  cors: Record<string, string>
): Promise<Response> {
  const key = url.pathname.replace("/qr/", "");
  if (!key || key.includes("..")) {
    return json({ error: "Invalid key" }, cors, 400);
  }

  const obj = await env.QR_BUCKET.get(key);
  if (!obj) {
    return json({ error: "QR not found" }, cors, 404);
  }

  // Check expiry via custom metadata
  const expires = obj.customMetadata?.expires;
  if (expires && parseInt(expires) < Math.floor(Date.now() / 1000)) {
    // Clean up expired QR
    env.QR_BUCKET.delete(key).catch(() => {});
    return json({ error: "QR expired" }, cors, 410);
  }

  return new Response(obj.body, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
      ...cors,
    },
  });
}

// ── Utility ──────────────────────────────────────────────────────────────────

function json(
  data: unknown,
  extraHeaders: Record<string, string> = {},
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

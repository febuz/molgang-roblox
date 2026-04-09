/**
 * bridge/src/tests/worker.test.ts
 * Integration tests for MOLGANG bridge worker
 * Run with: npm test (vitest)
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { signJWT, verifyJWT } from "../jwt";
import type { SessionPayload } from "../types";

// ── JWT Tests ─────────────────────────────────────────────────────────────────

describe("JWT", () => {
  const TEST_SECRET = "test-secret-molgang-bridge-2025";

  const testPayload: SessionPayload = {
    sub: "123456789",
    name: "TestPlayer",
    mol: 500,
    lvl: 3,
    inv: [{ z: 1, n: 5 }, { z: 8, n: 3 }],
    mols: ["H2O", "CO2"],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300,
  };

  it("signs and verifies a valid token", async () => {
    const token = await signJWT(testPayload, TEST_SECRET);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

    const verified = await verifyJWT(token, TEST_SECRET);
    expect(verified.sub).toBe(testPayload.sub);
    expect(verified.name).toBe(testPayload.name);
    expect(verified.mol).toBe(testPayload.mol);
    expect(verified.inv).toEqual(testPayload.inv);
  });

  it("rejects a token with wrong secret", async () => {
    const token = await signJWT(testPayload, TEST_SECRET);
    await expect(verifyJWT(token, "wrong-secret")).rejects.toThrow("Invalid signature");
  });

  it("rejects an expired token", async () => {
    const expiredPayload: SessionPayload = {
      ...testPayload,
      iat: Math.floor(Date.now() / 1000) - 600,
      exp: Math.floor(Date.now() / 1000) - 300,
    };
    const token = await signJWT(expiredPayload, TEST_SECRET);
    await expect(verifyJWT(token, TEST_SECRET)).rejects.toThrow("Token expired");
  });

  it("rejects a malformed token", async () => {
    await expect(verifyJWT("not.a.valid.token.here", TEST_SECRET))
      .rejects.toThrow("Malformed token");
  });

  it("rejects a tampered payload", async () => {
    const token = await signJWT(testPayload, TEST_SECRET);
    const [h, p, s] = token.split(".");
    // Tamper with payload
    const tampered = btoa(JSON.stringify({ ...testPayload, mol: 999999 }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await expect(verifyJWT(`${h}.${tampered}.${s}`, TEST_SECRET))
      .rejects.toThrow("Invalid signature");
  });
});

// ── Worker Route Tests ────────────────────────────────────────────────────────

describe("Worker routes", () => {
  // Mock environment
  const mockEnv = {
    SESSIONS: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(JSON.stringify({ sub: "123", exp: 9999999999 })),
    },
    QR_BUCKET: {
      put: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
    },
    JWT_SECRET: "test-secret-molgang-bridge-2025",
    ROBLOX_API_SECRET: "test-roblox-secret",
    SESSION_TTL_SECONDS: "300",
    QR_BASE_URL: "https://bridge.molgang.app/qr",
    BRIDGE_ENV: "development",
    HEDERA_OPERATOR_ID: "0.0.12345",
    HEDERA_OPERATOR_KEY: "test-key",
  };

  it("health check returns ok", async () => {
    const { default: worker } = await import("../worker");
    const req = new Request("https://bridge.molgang.app/health");
    const res = await worker.fetch(req, mockEnv as any, {} as any);
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe("ok");
  });

  it("generate-qr rejects missing auth", async () => {
    const { default: worker } = await import("../worker");
    const req = new Request("https://bridge.molgang.app/v1/generate-qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: 123, playerName: "Test" }),
    });
    const res = await worker.fetch(req, mockEnv as any, {} as any);
    expect(res.status).toBe(401);
  });

  it("generate-qr rejects wrong secret", async () => {
    const { default: worker } = await import("../worker");
    const req = new Request("https://bridge.molgang.app/v1/generate-qr", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Roblox-Secret": "wrong-secret",
      },
      body: JSON.stringify({ playerId: 123, playerName: "Test" }),
    });
    const res = await worker.fetch(req, mockEnv as any, {} as any);
    expect(res.status).toBe(401);
  });

  it("unknown route returns 404", async () => {
    const { default: worker } = await import("../worker");
    const req = new Request("https://bridge.molgang.app/unknown/route");
    const res = await worker.fetch(req, mockEnv as any, {} as any);
    expect(res.status).toBe(404);
  });

  it("OPTIONS returns CORS headers", async () => {
    const { default: worker } = await import("../worker");
    const req = new Request("https://bridge.molgang.app/v1/generate-qr", {
      method: "OPTIONS",
    });
    const res = await worker.fetch(req, mockEnv as any, {} as any);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

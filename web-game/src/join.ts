/**
 * web-game/src/join.ts
 * Entry point for /join?token=<jwt>
 * Verifies Roblox session token with bridge, then redirects to main game.
 */

import type { PlayerSession } from "@/types/game";

const BRIDGE_URL = (import.meta as any).env?.VITE_BRIDGE_URL ?? "https://bridge.molgang.app";

async function verifyAndJoin() {
  const statusEl  = document.getElementById("status-text")!;
  const errorEl   = document.getElementById("error-text")!;
  const spinnerEl = document.getElementById("spinner")!;

  function setStatus(text: string) { statusEl.textContent = text; }
  function setError(text: string) {
    errorEl.textContent = text;
    errorEl.style.display = "block";
    spinnerEl.style.display = "none";
  }

  // Extract token from URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    setError("No session token found. Please scan the QR code in-game.");
    return;
  }

  setStatus("Verifying Roblox session...");

  let session: PlayerSession;
  try {
    const res = await fetch(`${BRIDGE_URL}/v1/verify-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error || `Server error ${res.status}`);
    }

    const data = await res.json() as {
      valid: boolean;
      player: {
        id: string; name: string; molBalance: number;
        level: number; inventory: { z: number; n: number }[];
        molecules: string[];
      };
      expiresAt: number;
    };

    if (!data.valid) throw new Error("Session is not valid");

    session = {
      id: data.player.id,
      name: data.player.name,
      molBalance: data.player.molBalance,
      level: data.player.level,
      inventory: data.player.inventory,
      molecules: data.player.molecules,
      expiresAt: data.expiresAt,
    };
  } catch (err: any) {
    setError(`Failed to verify session: ${err.message}`);
    return;
  }

  setStatus(`Welcome back, ${session.name}!`);

  // Store session in sessionStorage (available on main game page)
  sessionStorage.setItem("molgang_session", JSON.stringify(session));

  // Brief welcome display then redirect
  await new Promise(r => setTimeout(r, 1200));
  setStatus("Loading world...");
  await new Promise(r => setTimeout(r, 400));

  window.location.href = "/";
}

verifyAndJoin().catch(err => {
  console.error("[join] Unexpected error:", err);
  const errorEl = document.getElementById("error-text");
  if (errorEl) {
    errorEl.textContent = "An unexpected error occurred. Please try again.";
    errorEl.style.display = "block";
  }
});

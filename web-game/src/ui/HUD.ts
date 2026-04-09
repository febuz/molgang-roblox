/**
 * web-game/src/ui/HUD.ts
 * MOLGANG Web Game HUD
 * Overlay: MolCoin balance, level, zone name, FPS stats, inventory shortcut
 */

import type { PlayerSession, RendererStats, ZoneId } from "@/types/game";
import { ZONES } from "@/types/game";

export class HUD {
  private el: HTMLElement;
  private statsEl!: HTMLElement;
  private balanceEl!: HTMLElement;
  private zoneEl!: HTMLElement;
  private levelEl!: HTMLElement;
  private inventoryEl!: HTMLElement;
  private session: PlayerSession;

  constructor(container: HTMLElement, session: PlayerSession) {
    this.session = session;

    // Create HUD root
    this.el = document.createElement("div");
    this.el.id = "molgang-hud";
    this.el.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 50;
      font-family: 'Space Grotesk', system-ui, sans-serif;
    `;
    container.appendChild(this.el);

    this.buildHUD();
  }

  private buildHUD() {
    // Top-left: Player info
    const topLeft = this.div("position:absolute;top:16px;left:16px;display:flex;flex-direction:column;gap:8px");

    // Zone name
    this.zoneEl = this.div(`
      padding:6px 12px;border-radius:6px;
      background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);
      border:1px solid #22c55e44;
      color:#22c55e;font-size:11px;letter-spacing:2px;text-transform:uppercase;
    `);
    this.zoneEl.textContent = "MOLGANG NEXUS HUB";
    topLeft.appendChild(this.zoneEl);

    // Player level + name
    this.levelEl = this.div(`
      padding:6px 12px;border-radius:6px;
      background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);
      border:1px solid #ffffff22;
      color:#d4c8b8;font-size:12px;
    `);
    this.levelEl.textContent = `${this.session.name}  ·  Lv.${this.session.level}`;
    topLeft.appendChild(this.levelEl);

    this.el.appendChild(topLeft);

    // Top-right: MolCoin balance
    const topRight = this.div(`position:absolute;top:16px;right:16px;text-align:right`);
    this.balanceEl = this.div(`
      padding:8px 16px;border-radius:8px;
      background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);
      border:1px solid #ffd70044;
      color:#ffd700;font-size:18px;font-weight:700;letter-spacing:1px;
    `);
    this.balanceEl.textContent = `⬡ ${this.session.molBalance.toLocaleString()} MOL`;
    topRight.appendChild(this.balanceEl);
    this.el.appendChild(topRight);

    // Bottom-right: Renderer stats (FPS etc)
    const bottomRight = this.div(`
      position:absolute;bottom:16px;right:16px;
      padding:6px 10px;border-radius:6px;
      background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);
      border:1px solid #ffffff11;
      color:#4a6a5a;font-size:10px;font-family:monospace;
      line-height:1.6;
    `);
    this.statsEl = bottomRight;
    this.statsEl.textContent = "FPS: --";
    this.el.appendChild(bottomRight);

    // Bottom-left: Quick inventory (top 6 elements)
    const bottomLeft = this.div(`
      position:absolute;bottom:16px;left:16px;
      display:flex;gap:6px;
    `);
    this.inventoryEl = bottomLeft;
    this.renderInventory();
    this.el.appendChild(bottomLeft);

    // Center-top: Mini notification area
    const centerTop = this.div(`
      position:absolute;top:16px;left:50%;transform:translateX(-50%);
      pointer-events:none;
    `);
    centerTop.id = "hud-notifications";
    this.el.appendChild(centerTop);
  }

  // ── Updates ───────────────────────────────────────────────────────────────────

  updateStats(stats: RendererStats) {
    this.statsEl.innerHTML =
      `FPS: <span style="color:#22c55e">${stats.fps}</span>  ` +
      `Draws: ${stats.drawCalls}  ` +
      `Tris: ${(stats.triangles / 1000).toFixed(0)}K<br>` +
      `<span style="color:#4080c0">${stats.backend}</span>`;
  }

  updateZone(zoneId: ZoneId) {
    const zone = ZONES[zoneId];
    this.zoneEl.textContent = zone.name.toUpperCase();
    this.zoneEl.style.color = zone.primaryColor;
    this.zoneEl.style.borderColor = zone.primaryColor + "44";
  }

  updateBalance(amount: number) {
    this.session.molBalance = amount;
    this.balanceEl.textContent = `⬡ ${amount.toLocaleString()} MOL`;
  }

  // ── Notification popup ────────────────────────────────────────────────────────

  notify(text: string, color = "#22c55e") {
    const notifArea = document.getElementById("hud-notifications");
    if (!notifArea) return;

    const n = document.createElement("div");
    n.style.cssText = `
      padding:6px 14px;border-radius:6px;margin-bottom:4px;
      background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);
      border:1px solid ${color}44;
      color:${color};font-size:12px;letter-spacing:1px;
      text-align:center;
      transition:opacity 0.5s;
    `;
    n.textContent = text;
    notifArea.appendChild(n);

    setTimeout(() => { n.style.opacity = "0"; }, 2000);
    setTimeout(() => { n.remove(); }, 2600);
  }

  // ── Inventory slots ───────────────────────────────────────────────────────────

  private renderInventory() {
    this.inventoryEl.innerHTML = "";
    const sorted = [...this.session.inventory]
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);

    for (const entry of sorted) {
      const slot = this.div(`
        width:44px;height:44px;border-radius:6px;
        background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
        border:1px solid #22c55e22;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        color:#c8e0d0;font-size:9px;
      `);
      slot.innerHTML = `<div style="font-size:14px;font-weight:700;color:#22c55e">${entry.z}</div><div>${entry.n}×</div>`;
      this.inventoryEl.appendChild(slot);
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────────────

  private div(style: string): HTMLElement {
    const d = document.createElement("div");
    d.style.cssText = style.replace(/\n\s+/g, " ").trim();
    return d;
  }

  dispose() {
    this.el.remove();
  }
}

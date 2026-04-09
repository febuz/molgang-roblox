/**
 * web-game/src/ui/InventoryTransferOverlay.ts
 * Phase 4: NFT Inventory Transfer overlay
 * Shows when player first joins via QR — displays transfer summary,
 * animate item loading, then fades to game.
 *
 * Shows: NFT count, mol balance, level, molecule list
 */

import type { PlayerSession } from "@/types/game";
import { getElement } from "@/utils/elements";

export class InventoryTransferOverlay {
  private el: HTMLElement;
  private onComplete: () => void;

  constructor(container: HTMLElement, session: PlayerSession, onComplete: () => void) {
    this.onComplete = onComplete;
    this.el = document.createElement("div");
    this.el.style.cssText = `
      position:fixed;inset:0;z-index:200;
      background:rgba(2,8,6,0.95);backdrop-filter:blur(16px);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Space Grotesk',system-ui,sans-serif;
      color:#d4e8d4;
    `;
    this.build(session);
    container.appendChild(this.el);
  }

  private build(session: PlayerSession) {
    // Header
    const header = document.createElement("div");
    header.style.cssText = `text-align:center;margin-bottom:32px`;
    header.innerHTML = `
      <div style="font-size:11px;letter-spacing:4px;color:#4a7a5a;text-transform:uppercase;margin-bottom:8px">Roblox → Web Game</div>
      <div style="font-size:32px;font-weight:700;color:#22c55e">Inventory Transferred</div>
      <div style="font-size:14px;color:#6a9a7a;margin-top:6px">Welcome, <strong style="color:#d4e8d4">${session.name}</strong> &nbsp;·&nbsp; Level ${session.level}</div>
    `;
    this.el.appendChild(header);

    // Stats row
    const stats = document.createElement("div");
    stats.style.cssText = `
      display:flex;gap:16px;margin-bottom:28px;
    `;
    const statItems = [
      { label: "MOL Balance",  value: `⬡ ${session.molBalance.toLocaleString()}`, color: "#ffd700" },
      { label: "Elements",     value: String(session.inventory.length),            color: "#22c55e" },
      { label: "Molecules",    value: String(session.molecules.length),            color: "#60a5fa" },
    ];
    for (const s of statItems) {
      const card = document.createElement("div");
      card.style.cssText = `
        padding:14px 20px;border-radius:10px;text-align:center;
        background:rgba(0,0,0,0.4);border:1px solid ${s.color}33;min-width:110px;
      `;
      card.innerHTML = `
        <div style="font-size:24px;font-weight:700;color:${s.color}">${s.value}</div>
        <div style="font-size:10px;letter-spacing:2px;color:#4a6a5a;text-transform:uppercase;margin-top:4px">${s.label}</div>
      `;
      stats.appendChild(card);
    }
    this.el.appendChild(stats);

    // Inventory grid (elements)
    const invTitle = document.createElement("div");
    invTitle.style.cssText = `font-size:10px;letter-spacing:2px;color:#4a7a5a;text-transform:uppercase;margin-bottom:10px`;
    invTitle.textContent = "Element Inventory";
    this.el.appendChild(invTitle);

    const grid = document.createElement("div");
    grid.style.cssText = `
      display:flex;flex-wrap:wrap;gap:6px;max-width:500px;
      justify-content:center;margin-bottom:28px;
    `;
    const sorted = [...session.inventory].sort((a, b) => a.z - b.z).slice(0, 30);
    for (const entry of sorted) {
      const info = getElement(entry.z);
      const slot = document.createElement("div");
      slot.style.cssText = `
        width:46px;height:50px;border-radius:6px;
        background:rgba(0,0,0,0.5);border:1px solid #22c55e33;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        opacity:0;transition:opacity 0.3s;
      `;
      slot.innerHTML = `
        <div style="font-size:15px;font-weight:700;color:#22c55e">${info?.symbol ?? `Z${entry.z}`}</div>
        <div style="font-size:8px;color:#4a6a5a">${entry.z}</div>
        <div style="font-size:9px;color:#6a8a7a">${entry.n}×</div>
      `;
      grid.appendChild(slot);

      // Stagger animation
      const delay = sorted.indexOf(entry) * 40;
      setTimeout(() => { slot.style.opacity = "1"; }, delay + 200);
    }
    if (session.inventory.length > 30) {
      const more = document.createElement("div");
      more.style.cssText = `
        width:46px;height:50px;border-radius:6px;
        background:rgba(34,197,94,0.1);border:1px solid #22c55e44;
        display:flex;align-items:center;justify-content:center;
        font-size:11px;color:#22c55e;
      `;
      more.textContent = `+${session.inventory.length - 30}`;
      grid.appendChild(more);
    }
    this.el.appendChild(grid);

    // Molecules
    if (session.molecules.length > 0) {
      const molTitle = document.createElement("div");
      molTitle.style.cssText = `font-size:10px;letter-spacing:2px;color:#4a7a5a;text-transform:uppercase;margin-bottom:8px`;
      molTitle.textContent = "Registered Molecules";
      this.el.appendChild(molTitle);

      const molRow = document.createElement("div");
      molRow.style.cssText = `display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:28px`;
      for (const mol of session.molecules.slice(0, 10)) {
        const chip = document.createElement("div");
        chip.style.cssText = `
          padding:4px 10px;border-radius:4px;font-size:12px;
          background:rgba(96,165,250,0.1);border:1px solid #60a5fa44;color:#60a5fa;
        `;
        chip.textContent = mol;
        molRow.appendChild(chip);
      }
      this.el.appendChild(molRow);
    }

    // Continue button
    const btn = document.createElement("button");
    btn.style.cssText = `
      padding:12px 36px;border-radius:8px;
      background:linear-gradient(135deg,#22c55e,#4ade80);
      border:none;cursor:pointer;
      font-size:14px;font-weight:700;letter-spacing:2px;
      color:#050810;text-transform:uppercase;
      transition:transform 0.15s,opacity 0.15s;
    `;
    btn.textContent = "Enter World";
    btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.04)"; });
    btn.addEventListener("mouseleave", () => { btn.style.transform = "scale(1)"; });
    btn.addEventListener("click", () => this.close());
    this.el.appendChild(btn);

    // Auto-continue after 8 seconds
    let countdown = 8;
    const timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        this.close();
      } else {
        btn.textContent = `Enter World (${countdown}s)`;
      }
    }, 1000);
  }

  private close() {
    this.el.style.transition = "opacity 0.6s";
    this.el.style.opacity = "0";
    setTimeout(() => {
      this.el.remove();
      this.onComplete();
    }, 650);
  }
}

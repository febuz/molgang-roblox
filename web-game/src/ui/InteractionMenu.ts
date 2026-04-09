/**
 * web-game/src/ui/InteractionMenu.ts
 * Context-sensitive interaction menu for web game
 * Appears when player is near an interactable object (element island, NPC, machine)
 * Supports: inspect, collect, quiz, build molecule, chain register
 */

import type { ZoneId } from "@/types/game";

export type InteractionType =
  | "inspect"
  | "collect"
  | "quiz"
  | "build"
  | "chain_register"
  | "loan"
  | "minigame"
  | "npc_talk";

export interface InteractionOption {
  type: InteractionType;
  label: string;
  key: string;
  color: string;
  icon: string;
  enabled: boolean;
  tooltip?: string;
}

export interface InteractionContext {
  targetName: string;
  targetType: "element" | "npc" | "machine" | "building" | "portal";
  zone: ZoneId;
  options: InteractionOption[];
}

export class InteractionMenu {
  private el: HTMLElement;
  private visible = false;
  private onAction: (type: InteractionType) => void;
  private keyListeners: Array<(e: KeyboardEvent) => void> = [];

  constructor(container: HTMLElement, onAction: (type: InteractionType) => void) {
    this.onAction = onAction;

    this.el = document.createElement("div");
    this.el.id = "interaction-menu";
    this.el.style.cssText = `
      position:fixed;left:50%;bottom:80px;transform:translateX(-50%);
      z-index:60;pointer-events:none;
      display:flex;flex-direction:column;align-items:center;gap:8px;
      transition:opacity 0.2s,transform 0.2s;
      opacity:0;
    `;
    container.appendChild(this.el);
  }

  show(ctx: InteractionContext) {
    this.hide(false);  // clear without animation
    this.visible = true;

    // Target label
    const label = document.createElement("div");
    label.style.cssText = `
      padding:4px 12px;border-radius:4px;
      background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);
      border:1px solid #ffffff22;
      font-family:'Space Grotesk',system-ui,sans-serif;
      font-size:11px;letter-spacing:2px;text-transform:uppercase;
      color:#d4c8b8;pointer-events:none;
    `;
    label.textContent = ctx.targetName;
    this.el.appendChild(label);

    // Options row
    const row = document.createElement("div");
    row.style.cssText = `display:flex;gap:8px;pointer-events:auto`;

    ctx.options.forEach(opt => {
      const btn = document.createElement("div");
      btn.style.cssText = `
        padding:8px 14px;border-radius:8px;cursor:${opt.enabled ? "pointer" : "default"};
        background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);
        border:1px solid ${opt.enabled ? opt.color + "66" : "#ffffff11"};
        display:flex;flex-direction:column;align-items:center;gap:4px;
        transition:all 0.15s;
        opacity:${opt.enabled ? "1" : "0.4"};
        min-width:72px;
      `;

      btn.innerHTML = `
        <div style="font-size:18px">${opt.icon}</div>
        <div style="font-size:10px;font-weight:700;color:${opt.enabled ? opt.color : "#666"};letter-spacing:1px">${opt.label}</div>
        <div style="font-size:9px;color:#4a5a4a;background:rgba(0,0,0,0.5);padding:1px 5px;border-radius:3px">[${opt.key}]</div>
      `;

      if (opt.enabled) {
        btn.addEventListener("mouseenter", () => {
          btn.style.background = `${opt.color}15`;
          btn.style.borderColor = opt.color;
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.background = "rgba(0,0,0,0.7)";
          btn.style.borderColor = `${opt.color}66`;
        });
        btn.addEventListener("click", () => this.trigger(opt.type));

        // Keyboard shortcut
        const handler = (e: KeyboardEvent) => {
          if (!this.visible) return;
          if (e.key.toUpperCase() === opt.key && !e.ctrlKey && !e.altKey) {
            this.trigger(opt.type);
          }
        };
        window.addEventListener("keydown", handler);
        this.keyListeners.push(handler);
      }

      row.appendChild(btn);
    });
    this.el.appendChild(row);

    // Animate in
    requestAnimationFrame(() => {
      this.el.style.opacity = "1";
      this.el.style.transform = "translateX(-50%) translateY(0)";
    });
  }

  hide(animate = true) {
    if (animate) {
      this.el.style.opacity = "0";
      this.el.style.transform = "translateX(-50%) translateY(8px)";
      setTimeout(() => this.clearContent(), 220);
    } else {
      this.clearContent();
    }
    this.visible = false;

    // Remove key listeners
    this.keyListeners.forEach(h => window.removeEventListener("keydown", h));
    this.keyListeners = [];
  }

  private clearContent() {
    this.el.innerHTML = "";
  }

  private trigger(type: InteractionType) {
    this.hide();
    this.onAction(type);
  }

  dispose() {
    this.hide(false);
    this.keyListeners.forEach(h => window.removeEventListener("keydown", h));
    this.el.remove();
  }
}

// ── Context builder helpers ───────────────────────────────────────────────────

export function buildElementContext(
  symbol: string,
  z: number,
  zone: ZoneId,
  owned: boolean
): InteractionContext {
  return {
    targetName: `${symbol} (Z=${z})`,
    targetType: "element",
    zone,
    options: [
      {
        type: "inspect",
        label: "Inspect",
        key: "E",
        icon: "🔬",
        color: "#60a5fa",
        enabled: true,
        tooltip: "View element data and facts",
      },
      {
        type: "collect",
        label: "Collect",
        key: "F",
        icon: "⬡",
        color: "#22c55e",
        enabled: !owned,
        tooltip: owned ? "Already in inventory" : "Add to inventory",
      },
      {
        type: "quiz",
        label: "Quiz",
        key: "Q",
        icon: "❓",
        color: "#ffd700",
        enabled: true,
        tooltip: "Answer a chemistry question for MolCoins",
      },
    ],
  };
}

export function buildMolChainContext(zone: ZoneId): InteractionContext {
  return {
    targetName: "MolChain Registry",
    targetType: "machine",
    zone,
    options: [
      {
        type: "build",
        label: "Build Mol",
        key: "B",
        icon: "⚗️",
        color: "#22c55e",
        enabled: true,
      },
      {
        type: "chain_register",
        label: "Register",
        key: "R",
        icon: "🔗",
        color: "#22d3ee",
        enabled: true,
        tooltip: "Register molecule on MolChain",
      },
    ],
  };
}

export function buildNPCContext(npcName: string, zone: ZoneId, trustHigh: boolean): InteractionContext {
  return {
    targetName: npcName,
    targetType: "npc",
    zone,
    options: [
      {
        type: "npc_talk",
        label: "Talk",
        key: "E",
        icon: "💬",
        color: "#22c55e",
        enabled: true,
      },
      {
        type: "quiz",
        label: "Ask Quiz",
        key: "Q",
        icon: "❓",
        color: "#ffd700",
        enabled: trustHigh,
        tooltip: trustHigh ? "High trust: bonus quiz available" : "Build trust first",
      },
    ],
  };
}

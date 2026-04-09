/**
 * web-game/src/ui/CharacterSelect.ts
 * Character selection screen — 3 avatar archetypes
 * Each has a path affinity: Chemistry, Quantum, or Balanced
 */

import type { PlayerSession } from "@/types/game";

export type CharacterClass = "chemist" | "quantum" | "engineer";
export type GamePath = "chemistry" | "quantum" | "balanced";

export interface CharacterChoice {
  class: CharacterClass;
  path: GamePath;
  name: string;
}

const CHARACTERS = [
  {
    id: "chemist" as CharacterClass,
    name: "Mol Chemist",
    path: "chemistry" as GamePath,
    icon: "⚗️",
    color: "#22c55e",
    description: "Master the periodic table.\nBuild molecules & register on MolChain.\nBonus XP for quiz answers.",
    stats: { chemistry: 5, quantum: 2, engineering: 3 },
    unlockLevel: 0,
  },
  {
    id: "quantum" as CharacterClass,
    name: "Quantum Rider",
    path: "quantum" as GamePath,
    icon: "⚛️",
    color: "#a78bfa",
    description: "Hunt superheavy elements.\nExplore Quantum Lab & quantum dots.\n10x rare element spawn bonus.",
    stats: { chemistry: 2, quantum: 5, engineering: 3 },
    unlockLevel: 0,
  },
  {
    id: "engineer" as CharacterClass,
    name: "Slag Engineer",
    path: "balanced" as GamePath,
    icon: "🏭",
    color: "#f59e0b",
    description: "Run the Slakkenspoor Fabriek.\nHGMS sorting + pH puzzle master.\n2x ANK loan capacity.",
    stats: { chemistry: 3, quantum: 2, engineering: 5 },
    unlockLevel: 0,
  },
];

export class CharacterSelect {
  private el: HTMLElement;
  private selected: CharacterClass = "chemist";
  private onSelect: (choice: CharacterChoice) => void;
  private session: PlayerSession;

  constructor(
    container: HTMLElement,
    session: PlayerSession,
    onSelect: (choice: CharacterChoice) => void
  ) {
    this.session = session;
    this.onSelect = onSelect;

    this.el = document.createElement("div");
    this.el.style.cssText = `
      position:fixed;inset:0;z-index:300;
      background:rgba(2,6,12,0.97);backdrop-filter:blur(20px);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Space Grotesk',system-ui,sans-serif;
      color:#d4e8d4;
    `;
    this.build();
    container.appendChild(this.el);
  }

  private build() {
    // Title
    const title = document.createElement("div");
    title.style.cssText = `text-align:center;margin-bottom:32px`;
    title.innerHTML = `
      <div style="font-size:10px;letter-spacing:4px;color:#4a7a5a;text-transform:uppercase;margin-bottom:8px">CHOOSE YOUR ROLE</div>
      <div style="font-size:28px;font-weight:700;background:linear-gradient(135deg,#22c55e,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Character Class</div>
      <div style="font-size:13px;color:#6a8a7a;margin-top:6px">Determines your starting bonuses and game path</div>
    `;
    this.el.appendChild(title);

    // Character cards
    const cards = document.createElement("div");
    cards.style.cssText = `display:flex;gap:20px;margin-bottom:32px;flex-wrap:wrap;justify-content:center`;
    cards.id = "char-cards";

    CHARACTERS.forEach(char => {
      const card = this.buildCard(char);
      cards.appendChild(card);
    });
    this.el.appendChild(cards);

    // Path explanation
    const pathInfo = document.createElement("div");
    pathInfo.id = "path-info";
    pathInfo.style.cssText = `
      max-width:420px;text-align:center;margin-bottom:28px;
      padding:14px 20px;border-radius:10px;
      background:rgba(34,197,94,0.06);border:1px solid #22c55e22;
      font-size:13px;color:#6a9a7a;line-height:1.7;
      min-height:60px;
    `;
    pathInfo.innerHTML = this.getPathInfo("chemist");
    this.el.appendChild(pathInfo);

    // Confirm button
    const btn = document.createElement("button");
    btn.id = "char-confirm-btn";
    btn.style.cssText = `
      padding:13px 40px;border-radius:8px;
      background:linear-gradient(135deg,#22c55e,#4ade80);
      border:none;cursor:pointer;
      font-size:14px;font-weight:700;letter-spacing:2px;
      color:#050810;text-transform:uppercase;
      transition:transform 0.15s;
    `;
    btn.textContent = "Confirm — Enter as Mol Chemist";
    btn.addEventListener("mouseenter", () => { btn.style.transform = "scale(1.03)"; });
    btn.addEventListener("mouseleave", () => { btn.style.transform = "scale(1)"; });
    btn.addEventListener("click", () => this.confirm());
    this.el.appendChild(btn);
  }

  private buildCard(char: (typeof CHARACTERS)[0]): HTMLElement {
    const card = document.createElement("div");
    const isSelected = char.id === this.selected;
    card.id = `char-card-${char.id}`;
    card.style.cssText = `
      width:160px;padding:20px;border-radius:12px;cursor:pointer;
      background:${isSelected ? `${char.color}12` : "rgba(0,0,0,0.4)"};
      border:2px solid ${isSelected ? char.color : "#ffffff11"};
      text-align:center;transition:all 0.2s;
    `;

    // Check unlock
    const locked = char.unlockLevel > this.session.level;
    if (locked) card.style.opacity = "0.5";

    card.innerHTML = `
      <div style="font-size:36px;margin-bottom:10px">${char.icon}</div>
      <div style="font-size:14px;font-weight:700;color:${char.color};margin-bottom:6px">${char.name}</div>
      <div style="font-size:10px;color:#4a6a5a;line-height:1.5;margin-bottom:12px">${char.description.replace(/\n/g, "<br>")}</div>
      <div style="display:flex;flex-direction:column;gap:4px">
        ${this.statBar("Chem", char.stats.chemistry, "#22c55e")}
        ${this.statBar("Quant", char.stats.quantum, "#a78bfa")}
        ${this.statBar("Eng", char.stats.engineering, "#f59e0b")}
      </div>
      ${locked ? `<div style="margin-top:8px;font-size:9px;color:#ef4444;letter-spacing:1px">LEVEL ${char.unlockLevel} REQUIRED</div>` : ""}
    `;

    if (!locked) {
      card.addEventListener("click", () => this.selectChar(char.id, char.color));
      card.addEventListener("mouseenter", () => {
        if (this.selected !== char.id) {
          card.style.background = `${char.color}08`;
          card.style.borderColor = `${char.color}66`;
        }
      });
      card.addEventListener("mouseleave", () => {
        if (this.selected !== char.id) {
          card.style.background = "rgba(0,0,0,0.4)";
          card.style.borderColor = "#ffffff11";
        }
      });
    }

    return card;
  }

  private statBar(label: string, value: number, color: string): string {
    const pct = (value / 5) * 100;
    return `
      <div style="display:flex;align-items:center;gap:6px;font-size:9px;color:#4a6a5a">
        <span style="width:28px;text-align:right">${label}</span>
        <div style="flex:1;height:3px;background:#1a2a1a;border-radius:2px">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:2px"></div>
        </div>
        <span style="width:8px">${value}</span>
      </div>
    `;
  }

  private selectChar(id: CharacterClass, _color: string) {
    this.selected = id;

    // Update all cards
    CHARACTERS.forEach(c => {
      const card = document.getElementById(`char-card-${c.id}`);
      if (!card) return;
      if (c.id === id) {
        card.style.background = `${c.color}12`;
        card.style.borderColor = c.color;
      } else {
        card.style.background = "rgba(0,0,0,0.4)";
        card.style.borderColor = "#ffffff11";
      }
    });

    // Update path info
    const pathInfo = document.getElementById("path-info");
    if (pathInfo) pathInfo.innerHTML = this.getPathInfo(id);

    // Update confirm button
    const btn = document.getElementById("char-confirm-btn") as HTMLButtonElement;
    if (btn) {
      const char = CHARACTERS.find(c => c.id === id)!;
      btn.textContent = `Confirm — Enter as ${char.name}`;
      btn.style.background = `linear-gradient(135deg,${char.color},${char.color}cc)`;
    }
  }

  private getPathInfo(id: CharacterClass): string {
    const paths: Record<CharacterClass, string> = {
      chemist: "<strong style='color:#22c55e'>Chemistry Path:</strong> Build molecules → register on MolChain → earn MolCoin dividends. Bonus: 1.5× quiz rewards, periodic table interaction unlocked from start.",
      quantum: "<strong style='color:#a78bfa'>Quantum Path:</strong> Hunt superheavy Z=104–118 elements in Quantum Lab. Rare element catch window: 15s instead of 10s. Unlock quantum circuits mini-game at Level 3.",
      engineer: "<strong style='color:#f59e0b'>Engineering Path:</strong> Master Slakkenspoor BOF slag recovery. HGMS separator score multiplier 2×. ANK lending: 150% loan capacity. Unlock pH circuit lab at Level 2.",
    };
    return paths[id];
  }

  private confirm() {
    const char = CHARACTERS.find(c => c.id === this.selected)!;
    this.el.style.transition = "opacity 0.5s";
    this.el.style.opacity = "0";
    setTimeout(() => {
      this.el.remove();
      this.onSelect({ class: char.id, path: char.path, name: char.name });
    }, 550);
  }
}

import { useState } from "react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #060e08; }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.1)} }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes shimmer { 0%{opacity:.4} 50%{opacity:1} 100%{opacity:.4} }
  .spin { animation: spin 8s linear infinite; }
  .pulse { animation: pulse 2s ease-in-out infinite; }
  .float { animation: float 3s ease-in-out infinite; }
`;

// ── ELEMENT DEFINITIONS ─────────────────────────────────────────────
const ELEMENTS = [
  {z:1, sym:"H", name:"Hydrogen", mass:"1.008", group:"Non-metal", col:"#94a3b8", bg:"#1e293b", rarity:"common"},
  {z:2, sym:"He", name:"Helium", mass:"4.003", group:"Noble Gas", col:"#a855f7", bg:"#1e0a3c", rarity:"uncommon"},
  {z:6, sym:"C", name:"Carbon", mass:"12.011", group:"Non-metal", col:"#64748b", bg:"#0f172a", rarity:"common"},
  {z:7, sym:"N", name:"Nitrogen", mass:"14.007", group:"Non-metal", col:"#a855f7", bg:"#1a0a2e", rarity:"common"},
  {z:8, sym:"O", name:"Oxygen", mass:"15.999", group:"Non-metal", col:"#38bdf8", bg:"#0c1a2e", rarity:"common"},
  {z:11, sym:"Na", name:"Sodium", mass:"22.990", group:"Alkali Metal", col:"#ef4444", bg:"#2a0a0a", rarity:"common"},
  {z:12, sym:"Mg", name:"Magnesium", mass:"24.305", group:"Alkaline Earth", col:"#f97316", bg:"#2a1200", rarity:"common"},
  {z:14, sym:"Si", name:"Silicon", mass:"28.086", group:"Metalloid", col:"#60a5fa", bg:"#0d1a2e", rarity:"uncommon"},
  {z:19, sym:"K", name:"Potassium", mass:"39.098", group:"Alkali Metal", col:"#ef4444", bg:"#2a0a0a", rarity:"uncommon"},
  {z:20, sym:"Ca", name:"Calcium", mass:"40.078", group:"Alkaline Earth", col:"#f97316", bg:"#2a1200", rarity:"common"},
  {z:22, sym:"Ti", name:"Titanium", mass:"47.867", group:"Trans. Metal", col:"#818cf8", bg:"#1a1040", rarity:"rare"},
  {z:23, sym:"V", name:"Vanadium", mass:"50.942", group:"Trans. Metal", col:"#2a9acc", bg:"#0a1a2e", rarity:"rare"},
  {z:24, sym:"Cr", name:"Chromium", mass:"51.996", group:"Trans. Metal", col:"#f472b6", bg:"#2e0a20", rarity:"rare"},
  {z:26, sym:"Fe", name:"Iron", mass:"55.845", group:"Trans. Metal", col:"#b45309", bg:"#2e1a00", rarity:"uncommon"},
  {z:29, sym:"Cu", name:"Copper", mass:"63.546", group:"Trans. Metal", col:"#f59e0b", bg:"#2e1e00", rarity:"uncommon"},
  {z:79, sym:"Au", name:"Gold", mass:"196.97", group:"Trans. Metal", col:"#fbbf24", bg:"#2e2000", rarity:"epic"},
  {z:92, sym:"U", name:"Uranium", mass:"238.03", group:"Actinide", col:"#4ade80", bg:"#0a2e0a", rarity:"legendary"},
  {z:113, sym:"Nh", name:"Nihonium", mass:"~286", group:"Quantum Dot", col:"#e879f9", bg:"#2e0a40", rarity:"quantum"},
  {z:118, sym:"Og", name:"Oganesson", mass:"~294", group:"Quantum Dot", col:"#f0abfc", bg:"#3a0a4a", rarity:"quantum"},
];

const RARITY_CONFIG = {
  common:    { label:"Common",    col:"#94a3b8", stars:1 },
  uncommon:  { label:"Uncommon",  col:"#22c55e", stars:2 },
  rare:      { label:"Rare",      col:"#3b82f6", stars:3 },
  epic:      { label:"Epic",      col:"#a855f7", stars:4 },
  legendary: { label:"Legendary", col:"#f59e0b", stars:5 },
  quantum:   { label:"Quantum",   col:"#ec4899", stars:6 },
};

const MOLECULES = [
  {formula:"H₂O",  name:"Water",                atoms:"2H+O",   col:"#38bdf8", pts:100,  icon:"💧"},
  {formula:"CO₂",  name:"Kooldioxide",           atoms:"C+2O",   col:"#f97316", pts:150,  icon:"☁"},
  {formula:"NH₃",  name:"Ammoniak",              atoms:"N+3H",   col:"#a855f7", pts:120,  icon:"💜"},
  {formula:"O₂",   name:"Zuurstof",              atoms:"2O",     col:"#38bdf8", pts:80,   icon:"🔵"},
  {formula:"N₂",   name:"Stikstof",              atoms:"2N",     col:"#818cf8", pts:80,   icon:"🟣"},
  {formula:"CaCO₃",name:"Calciet",               atoms:"Ca+C+3O",col:"#e2e8f0", pts:300,  icon:"🏔"},
  {formula:"SiO₂", name:"Kwarts",                atoms:"Si+2O",  col:"#bae6fd", pts:200,  icon:"💎"},
  {formula:"V₂O₅", name:"Vanadium Pentoxide",    atoms:"2V+5O",  col:"#fbbf24", pts:1000, icon:"⚡"},
  {formula:"Fe₂O₃",name:"Ijzeroxide (Roest)",    atoms:"2Fe+3O", col:"#b45309", pts:180,  icon:"🟤"},
  {formula:"TiO₂", name:"Titaan Oxide",          atoms:"Ti+2O",  col:"#818cf8", pts:250,  icon:"⬜"},
  {formula:"NaCl", name:"Keukenzout",            atoms:"Na+Cl",  col:"#f8fafc", pts:90,   icon:"🧂"},
  {formula:"CaO",  name:"Calciumoxide (Slak)",   atoms:"Ca+O",   col:"#fde68a", pts:150,  icon:"🧱"},
  {formula:"CH₄",  name:"Methaan",               atoms:"C+4H",   col:"#fde68a", pts:110,  icon:"🔥"},
  {formula:"C₆H₁₂O₆", name:"Glucose",           atoms:"6C+12H+6O",col:"#fbbf24",pts:500, icon:"🍯"},
];

const UI_ICONS = [
  {id:"molcoin",    icon:"⚗",  name:"MolCoin",        col:"#22c55e", desc:"Game valuta"},
  {id:"chaintoken", icon:"⛓",  name:"ChainToken",     col:"#2a9acc", desc:"Chain bonus"},
  {id:"qdot",       icon:"⚛",  name:"Quantum Dot",    col:"#a855f7", desc:"Ultra-zeldzaam"},
  {id:"wallet",     icon:"👛",  name:"MolWallet",      col:"#f59e0b", desc:"Valuta beheer"},
  {id:"chain",      icon:"🔗",  name:"ChainExplorer",  col:"#22c55e", desc:"Block viewer"},
  {id:"ank",        icon:"⚓",  name:"ANK Lening",     col:"#2a9acc", desc:"Kredietunie"},
  {id:"table",      icon:"🔬",  name:"Periodiek Sys.", col:"#7ecf5a", desc:"118 elementen"},
  {id:"quiz",       icon:"📚",  name:"Quiz Zuil",      col:"#f59e0b", desc:"+10 MolCoins"},
  {id:"heart",      icon:"❤",  name:"Gezondheid",     col:"#ef4444", desc:"HP systeem"},
  {id:"xp",         icon:"⭐",  name:"XP / Level",     col:"#fbbf24", desc:"Voortgang"},
  {id:"badge",      icon:"🎖",  name:"Badge",          col:"#c8941a", desc:"Prestatie"},
  {id:"sprint",     icon:"💨",  name:"Sprint",         col:"#84cc16", desc:"Sneller lopen"},
  {id:"map",        icon:"🗺",  name:"Minimap",        col:"#2a9acc", desc:"Navigatie"},
  {id:"settings",   icon:"⚙",  name:"Instellingen",   col:"#6b7280", desc:"Game opties"},
  {id:"share",      icon:"📤",  name:"Deel",           col:"#7ecf5a", desc:"Social export"},
  {id:"daily",      icon:"📅",  name:"Dagelijkse Taak",col:"#f97316", desc:"Dagelijkse uitdaging"},
];

const BADGES = [
  {id:"beginner",  icon:"🎖",  name:"Atom Beginner",   req:"10 elementen",     col:"#94a3b8"},
  {id:"explorer",  icon:"🔭",  name:"Element Explorer",req:"36 elementen",     col:"#22c55e"},
  {id:"champion",  icon:"🥇",  name:"Periodic Champ",  req:"72 elementen",     col:"#2a9acc"},
  {id:"master",    icon:"💎",  name:"Periodic Master", req:"118 elementen",    col:"#a855f7"},
  {id:"chemist",   icon:"⚗",  name:"Molecule Master", req:"25 unieke mol.",   col:"#22c55e"},
  {id:"pioneer",   icon:"⛓",  name:"Chain Pioneer",   req:"100 chain entries",col:"#2a9acc"},
  {id:"banker",    icon:"⚓",  name:"ANK Founding Mbr",req:"Eerste lening",    col:"#f59e0b"},
  {id:"quantum",   icon:"⚛",  name:"Quantum Hunter",  req:"Alle 6 QDots",     col:"#a855f7"},
  {id:"metallurg", icon:"⚙",  name:"Metallurgist",    req:"Perfecte HGMS run",col:"#c8941a"},
  {id:"teacher",   icon:"📚",  name:"Quiz Wizard",     req:"100 quiz correct", col:"#f59e0b"},
  {id:"molart",    icon:"🎨",  name:"Molecule Artist", req:"10 unieke recepten",col:"#f472b6"},
  {id:"slag",      icon:"🏭",  name:"Slakkenspoor Pro",req:"Perfect pH-run",  col:"#c8941a"},
];

const BUILDINGS = [
  {id:"nexus",   icon:"🏛",  name:"Molgang Nexus",  col:"#22c55e", detail:"Centraal Hub — Spawnpunt"},
  {id:"ank",     icon:"⚓",  name:"ANK Gebouw",     col:"#2a9acc", detail:"Kredietunie — Leningen"},
  {id:"tower",   icon:"🗼",  name:"MolChain Tower", col:"#22c55e", detail:"200 studs — Chain Display"},
  {id:"market",  icon:"🏪",  name:"Marketplace",   col:"#f59e0b", detail:"Atoom ruil — Handel"},
  {id:"factory", icon:"🏭",  name:"Slakkenspoor",  col:"#c8941a", detail:"BOF Slag — Mini-games"},
  {id:"qlab",    icon:"🔬",  name:"Quantum Lab",   col:"#a855f7", detail:"Quantum Dots — Sanctum"},
  {id:"quiz",    icon:"📚",  name:"Quiz Zuil",     col:"#f59e0b", detail:"Vragen — MolCoins earn"},
  {id:"vault",   icon:"🏦",  name:"ANK Vault",     col:"#2a9acc", detail:"Collateral — Goud animatie"},
];

// ── ATOM ICON SVG ────────────────────────────────────────────────────
function AtomIcon({ elem, size = 72, animate = false }) {
  const { sym, col, bg, rarity, z } = elem;
  const rc = RARITY_CONFIG[rarity];
  return (
    <div className={animate ? "float" : ""}
      style={{ width: size, height: size, position: "relative", cursor: "pointer" }}>
      <svg width={size} height={size} viewBox="0 0 72 72">
        {/* Glow */}
        <circle cx={36} cy={36} r={34} fill={col} opacity={0.08}/>
        {/* Outer ring */}
        <circle cx={36} cy={36} r={30} fill={bg} stroke={col} strokeWidth={1.5}/>
        {/* Electron orbits */}
        <ellipse cx={36} cy={36} rx={28} ry={10} fill="none" stroke={col}
          strokeWidth={0.6} opacity={0.35} transform="rotate(-30 36 36)"/>
        <ellipse cx={36} cy={36} rx={28} ry={10} fill="none" stroke={col}
          strokeWidth={0.6} opacity={0.35} transform="rotate(90 36 36)"/>
        {/* Nucleus */}
        <circle cx={36} cy={36} r={16} fill={col} opacity={0.15}/>
        <circle cx={36} cy={36} r={12} fill={col} opacity={0.25}/>
        {/* Symbol */}
        <text x={36} y={38} textAnchor="middle" fontSize={sym.length>2?9:12}
          fill={col} fontWeight="700" fontFamily="monospace">{sym}</text>
        {/* Z number */}
        <text x={10} y={16} fontSize={7} fill={col} opacity={0.7} fontFamily="monospace">{z}</text>
        {/* Electron dot */}
        <circle cx={64} cy={20} r={3} fill={col} opacity={0.8}/>
        {/* Rarity stars */}
        {[...Array(Math.min(rc.stars, 5))].map((_,i) => (
          <text key={i} x={8+i*9} y={66} fontSize={7} fill={rc.col} opacity={0.9}>★</text>
        ))}
      </svg>
    </div>
  );
}

// ── MOLECULE ICON SVG ────────────────────────────────────────────────
function MoleculeIcon({ mol, size = 64 }) {
  return (
    <div style={{ width: size, height: size, cursor: "pointer" }}>
      <svg width={size} height={size} viewBox="0 0 64 64">
        <circle cx={32} cy={32} r={30} fill={`${mol.col}15`} stroke={mol.col}
          strokeWidth={1.2} strokeDasharray={mol.pts>500?"4,2":"none"}/>
        <circle cx={32} cy={32} r={20} fill={`${mol.col}20`}/>
        <text x={32} y={30} textAnchor="middle" fontSize={16}>{mol.icon}</text>
        <text x={32} y={44} textAnchor="middle" fontSize={8} fill={mol.col}
          fontWeight="700" fontFamily="monospace">{mol.formula}</text>
        <text x={32} y={56} textAnchor="middle" fontSize={6} fill="#6b7280"
          fontFamily="monospace">+{mol.pts}</text>
      </svg>
    </div>
  );
}

// ── UI ICON SVG ──────────────────────────────────────────────────────
function UIIcon({ item, size = 52 }) {
  return (
    <div style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 52 52">
        <rect width={52} height={52} rx={10} fill={`${item.col}18`}/>
        <rect x={1} y={1} width={50} height={50} rx={9} fill="none"
          stroke={item.col} strokeWidth={1}/>
        <text x={26} y={28} textAnchor="middle" fontSize={18}>{item.icon}</text>
        <text x={26} y={46} textAnchor="middle" fontSize={6} fill={item.col}
          fontFamily="monospace" letterSpacing={0.5}>
          {item.name.slice(0,10)}
        </text>
      </svg>
    </div>
  );
}

// ── BADGE SVG ────────────────────────────────────────────────────────
function BadgeIcon({ badge, size = 64, earned = false }) {
  return (
    <div style={{ width: size, height: size, opacity: earned ? 1 : 0.45 }}>
      <svg width={size} height={size} viewBox="0 0 64 64">
        {/* Shield */}
        <path d="M32,4 L56,14 L56,32 Q56,52 32,62 Q8,52 8,32 L8,14 Z"
          fill={earned ? `${badge.col}22` : "#1a2d20"}
          stroke={badge.col} strokeWidth={earned ? 1.5 : 0.8}/>
        {/* Inner shield */}
        <path d="M32,10 L50,18 L50,32 Q50,48 32,56 Q14,48 14,32 L14,18 Z"
          fill={`${badge.col}15`}/>
        {/* Icon */}
        <text x={32} y={36} textAnchor="middle" fontSize={20}>{badge.icon}</text>
        {/* Earned glow */}
        {earned && <circle cx={32} cy={30} r={16} fill="none"
          stroke={badge.col} strokeWidth={0.5} opacity={0.5}/>}
      </svg>
    </div>
  );
}

// ── BUILDING SPRITE SVG ──────────────────────────────────────────────
function BuildingSprite({ building, size = 80 }) {
  const { icon, col, name, id } = building;
  return (
    <div style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        {/* Base platform */}
        <ellipse cx={40} cy={72} rx={28} ry={6} fill={col} opacity={0.2}/>
        {/* Building */}
        {id === "tower" ? (
          <g>
            <rect x={36} y={20} width={8} height={45} fill={`${col}33`} stroke={col} strokeWidth={1} rx={2}/>
            {[0,1,2,3].map(i => (
              <ellipse key={i} cx={40} cy={28+i*10} rx={8} ry={2.5} fill="none"
                stroke={col} strokeWidth={0.8} opacity={0.6}/>
            ))}
            <circle cx={40} cy={18} r={5} fill={col} opacity={0.9}/>
          </g>
        ) : (
          <g>
            <rect x={16} y={35} width={48} height={32} fill={`${col}22`}
              stroke={col} strokeWidth={1} rx={3}/>
            <polygon points="12,35 40,14 68,35" fill={`${col}33`} stroke={col} strokeWidth={1}/>
            <rect x={34} y={48} width={12} height={19} fill={`${col}44`} rx={2}/>
          </g>
        )}
        {/* Icon */}
        <text x={40} y={id==="tower"?46:58} textAnchor="middle" fontSize={14}>{icon}</text>
        {/* Name */}
        <text x={40} y={78} textAnchor="middle" fontSize={6} fill={col}
          fontFamily="monospace" fontWeight="700">{name.toUpperCase().slice(0,12)}</text>
      </svg>
    </div>
  );
}

// ── HUD PREVIEW ──────────────────────────────────────────────────────
function HUDPreview() {
  return (
    <div style={{ background: "#060e08", borderRadius: 8, border: "1px solid #1e3a2a",
      padding: 16, position: "relative", height: 220 }}>
      <div style={{ position: "absolute", fontFamily: "'Share Tech Mono', monospace",
        fontSize: 8, color: "#1a9966", top: 8, left: 12, letterSpacing: 3 }}>
        // HUD LAYOUT PREVIEW
      </div>
      {/* Inventory top-left */}
      <div style={{ position: "absolute", top: 24, left: 12 }}>
        <div style={{ background: "#0d1f1a88", border: "1px solid #1e3a2a",
          borderRadius: 6, padding: "6px 8px", display: "flex", gap: 4, flexWrap: "wrap",
          width: 120 }}>
          {[["H","#94a3b8",12],["C","#64748b",8],["O","#38bdf8",5],["V","#2a9acc",2],["N","#a855f7",9]].map(([s,col,n]) => (
            <div key={s} style={{ width: 22, height: 22, borderRadius: 3,
              background: `${col}22`, border: `1px solid ${col}66`,
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center" }}>
              <div style={{ fontSize: 7, color: col, fontFamily: "monospace", lineHeight: 1 }}>{s}</div>
              <div style={{ fontSize: 6, color: "#6b7280" }}>{n}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 8, color: "#4a5568", marginTop: 3, fontFamily: "monospace" }}>
          ATOM INVENTORY
        </div>
      </div>
      {/* Wallet top-right */}
      <div style={{ position: "absolute", top: 24, right: 12 }}>
        <div style={{ background: "#0d1f1a88", border: "1px solid #22c55e33",
          borderRadius: 6, padding: "6px 12px", display: "flex", gap: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 7, color: "#4a5568", fontFamily: "monospace" }}>MOLCOINS</div>
            <div style={{ fontSize: 14, color: "#22c55e", fontFamily: "monospace", fontWeight: 700 }}>⚗ 1,240</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 7, color: "#4a5568", fontFamily: "monospace" }}>CHAIN</div>
            <div style={{ fontSize: 14, color: "#2a9acc", fontFamily: "monospace", fontWeight: 700 }}>⛓ 47</div>
          </div>
        </div>
      </div>
      {/* Molecule builder center-left */}
      <div style={{ position: "absolute", top: 90, left: 12 }}>
        <div style={{ background: "#0d1f1a88", border: "1px solid #22c55e55",
          borderRadius: 6, padding: 6, width: 80 }}>
          <div style={{ fontSize: 7, color: "#22c55e", fontFamily: "monospace", marginBottom: 4 }}>BUILDER</div>
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {["H","H","O","?"].map((s,i) => (
              <div key={i} style={{ width: 18, height: 18, borderRadius: 3,
                background: s!=="?"?"#38bdf822":"#1e3a2a",
                border: `1px solid ${s!=="?"?"#38bdf8":"#1e3a2a"}`,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 7, color: s!=="?"?"#38bdf8":"#374151",
                  fontFamily: "monospace" }}>{s}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 4, background: "#22c55e", borderRadius: 3,
            textAlign: "center", padding: "2px 0" }}>
            <span style={{ fontSize: 7, color: "#060e08", fontFamily: "monospace",
              fontWeight: 700 }}>H₂O ✓</span>
          </div>
        </div>
      </div>
      {/* Minimap bottom-right */}
      <div style={{ position: "absolute", bottom: 12, right: 12 }}>
        <div style={{ width: 70, height: 70, background: "#0d1f1a88",
          border: "1px solid #1e3a2a", borderRadius: 4, position: "relative",
          overflow: "hidden" }}>
          {Object.values(ZONES).map(z => (
            <div key={z.id} style={{ position: "absolute",
              left: `${(z.cx/800)*100}%`, top: `${(z.cy/780)*100}%`,
              width: 8, height: 8, borderRadius: "50%",
              background: z.color, transform: "translate(-50%,-50%)" }}/>
          ))}
          <div style={{ position: "absolute", bottom: 2, right: 2,
            fontSize: 6, color: "#1a9966", fontFamily: "monospace" }}>MAP</div>
        </div>
      </div>
      {/* Element info bar bottom */}
      <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)" }}>
        <div style={{ background: "#1a0a2e88", border: "1px solid #a855f7",
          borderRadius: 6, padding: "6px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 20, color: "#a855f7" }}>⚛</div>
          <div>
            <div style={{ fontSize: 9, color: "#a855f7", fontFamily: "monospace", fontWeight: 700 }}>
              VANADIUM — V
            </div>
            <div style={{ fontSize: 8, color: "#6b7280" }}>Z=23 | 50.942 g/mol | Rare</div>
          </div>
          <div style={{ background: "#a855f722", border: "1px solid #a855f7",
            borderRadius: 4, padding: "2px 8px" }}>
            <span style={{ fontSize: 8, color: "#a855f7", fontFamily: "monospace" }}>TOUCH ▶</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TABS ─────────────────────────────────────────────────────────────
const TABS = ["Elementen","Moleculen","UI Icons","Badges","Gebouwen","HUD Preview"];

export default function AssetSheet() {
  const [tab, setTab] = useState("Elementen");
  const [selected, setSelected] = useState(null);
  const [animating, setAnimating] = useState(null);

  return (
    <div style={{ background: "#060e08", minHeight: "100vh",
      fontFamily: "'Rajdhani', sans-serif", color: "#e8f0eb" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ background: "#0d1f1a", borderBottom: "1px solid #1e3a2a",
        padding: "12px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9,
            color: "#1a9966", letterSpacing: 4 }}>// ASSET SHEET</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f4f9f6" }}>
            MOLGANG — Visuele Assets v1.0
          </div>
          <div style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 10,
            color: "#4a5568" }}>
            {ELEMENTS.length} elementen · {MOLECULES.length} moleculen · {UI_ICONS.length} icons
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginTop: 12, borderBottom: "1px solid #1e3a2a" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setSelected(null); }}
              style={{ padding: "8px 16px", background: "transparent",
                border: "none", borderBottom: `2px solid ${tab===t?"#22c55e":"transparent"}`,
                color: tab===t?"#22c55e":"#4a5568", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, letterSpacing: 1,
                textTransform: "uppercase" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 100px)" }}>
        {/* MAIN CONTENT */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

          {tab === "Elementen" && (
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1a9966",
                letterSpacing: 3, marginBottom: 16 }}>// ELEMENT ICONS — KLEURGECODEERD PER GROEP</div>
              {/* Rarity filter */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {Object.entries(RARITY_CONFIG).map(([r,rc]) => (
                  <div key={r} style={{ padding: "3px 10px", borderRadius: 12,
                    border: `1px solid ${rc.col}`, color: rc.col,
                    fontFamily: "monospace", fontSize: 9 }}>
                    {"★".repeat(rc.stars)} {rc.label}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {ELEMENTS.map(elem => (
                  <div key={elem.z} onClick={() => setSelected(elem)}
                    onMouseEnter={() => setAnimating(elem.z)}
                    onMouseLeave={() => setAnimating(null)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 4, cursor: "pointer", padding: 8, borderRadius: 8,
                      background: selected?.z===elem.z ? `${elem.col}15` : "transparent",
                      border: `1px solid ${selected?.z===elem.z ? elem.col : "transparent"}`,
                      transition: "all 0.2s" }}>
                    <AtomIcon elem={elem} size={72} animate={animating===elem.z}/>
                    <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace",
                      textAlign: "center" }}>{elem.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "Moleculen" && (
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1a9966",
                letterSpacing: 3, marginBottom: 20 }}>// MOLECULE ICONS — 14 RECEPTEN</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 16 }}>
                {MOLECULES.map(mol => (
                  <div key={mol.formula} onClick={() => setSelected(mol)}
                    style={{ padding: 12, borderRadius: 8,
                      background: selected?.formula===mol.formula ? `${mol.col}15` : "#0d1f1a",
                      border: `1px solid ${selected?.formula===mol.formula ? mol.col : "#1e3a2a"}`,
                      cursor: "pointer", textAlign: "center" }}>
                    <MoleculeIcon mol={mol} size={64}/>
                    <div style={{ fontSize: 11, color: "#e8f0eb", fontWeight: 600, marginTop: 6 }}>
                      {mol.name}
                    </div>
                    <div style={{ fontSize: 9, color: "#4a5568", fontFamily: "monospace" }}>
                      {mol.atoms}
                    </div>
                    <div style={{ fontSize: 10, color: mol.col, fontFamily: "monospace",
                      fontWeight: 700, marginTop: 4 }}>+{mol.pts} ⚗</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "UI Icons" && (
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1a9966",
                letterSpacing: 3, marginBottom: 20 }}>// UI ICONS — HUD & INTERFACE ELEMENTEN</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {UI_ICONS.map(item => (
                  <div key={item.id} onClick={() => setSelected(item)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 6, padding: 10, borderRadius: 8,
                      background: selected?.id===item.id ? `${item.col}15` : "#0d1f1a",
                      border: `1px solid ${selected?.id===item.id ? item.col : "#1e3a2a"}`,
                      cursor: "pointer", width: 80 }}>
                    <UIIcon item={item} size={52}/>
                    <div style={{ fontSize: 9, color: "#6b7280", fontFamily: "monospace",
                      textAlign: "center", lineHeight: 1.4 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "Badges" && (
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1a9966",
                letterSpacing: 3, marginBottom: 20 }}>// BADGE COLLECTIE — 12 ACHIEVEMENTS</div>
              <div style={{ display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 16 }}>
                {BADGES.map((badge, i) => (
                  <div key={badge.id} onClick={() => setSelected(badge)}
                    style={{ padding: 16, borderRadius: 8, textAlign: "center",
                      background: selected?.id===badge.id ? `${badge.col}15` : "#0d1f1a",
                      border: `1px solid ${selected?.id===badge.id ? badge.col : "#1e3a2a"}`,
                      cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <BadgeIcon badge={badge} size={64} earned={i < 4}/>
                    </div>
                    <div style={{ fontSize: 11, color: "#e8f0eb", fontWeight: 700, marginTop: 8 }}>
                      {badge.name}
                    </div>
                    <div style={{ fontSize: 9, color: "#4a5568", marginTop: 4 }}>
                      {badge.req}
                    </div>
                    {i < 4 && (
                      <div style={{ marginTop: 6, padding: "2px 8px", borderRadius: 10,
                        background: `${badge.col}22`, color: badge.col,
                        fontSize: 8, fontFamily: "monospace", display: "inline-block" }}>
                        VERDIEND ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "Gebouwen" && (
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1a9966",
                letterSpacing: 3, marginBottom: 20 }}>// GEBOUW SPRITES — 3D ISOMETRISCH STYLE</div>
              <div style={{ display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 16 }}>
                {BUILDINGS.map(b => (
                  <div key={b.id} onClick={() => setSelected(b)}
                    style={{ padding: 16, borderRadius: 8, textAlign: "center",
                      background: selected?.id===b.id ? `${b.col}15` : "#0d1f1a",
                      border: `1px solid ${selected?.id===b.id ? b.col : "#1e3a2a"}`,
                      cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                      <BuildingSprite building={b} size={80}/>
                    </div>
                    <div style={{ fontSize: 12, color: b.col, fontWeight: 700 }}>{b.name}</div>
                    <div style={{ fontSize: 10, color: "#4a5568", marginTop: 4 }}>{b.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "HUD Preview" && (
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1a9966",
                letterSpacing: 3, marginBottom: 20 }}>// HUD LAYOUT PREVIEW — IN-GAME UI</div>
              <HUDPreview/>
              <div style={{ marginTop: 20, display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  ["Links Boven","Atom Inventory Grid","5×4 slots, kleur per element"],
                  ["Rechts Boven","MolCoin + ChainToken","Wallet balans display"],
                  ["Links Midden","Molecule Builder","Drag atomen, groen = geldig"],
                  ["Onder Midden","Element Info Bar","Verschijnt bij proximity"],
                  ["Rechts Onder","Minimap","Alle zones als kleur-puntjes"],
                  ["Bovenin","Server Ticker","World events broadcast"],
                ].map(([pos,name,desc]) => (
                  <div key={pos} style={{ padding: 12, borderRadius: 6,
                    background: "#0d1f1a", border: "1px solid #1e3a2a" }}>
                    <div style={{ fontSize: 9, color: "#1a9966", fontFamily: "monospace",
                      marginBottom: 4 }}>{pos}</div>
                    <div style={{ fontSize: 12, color: "#e8f0eb", fontWeight: 700 }}>{name}</div>
                    <div style={{ fontSize: 10, color: "#4a5568", marginTop: 4 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* DETAIL PANEL */}
        <div style={{ width: 240, background: "#0d1f1a", borderLeft: "1px solid #1e3a2a",
          overflowY: "auto", padding: 20 }}>
          {selected ? (
            <div>
              <div style={{ fontFamily: "monospace", fontSize: 9, color: "#1a9966",
                letterSpacing: 3, marginBottom: 12 }}>// DETAIL</div>

              {/* Atom detail */}
              {selected.z && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <AtomIcon elem={selected} size={96} animate={true}/>
                  </div>
                  <div style={{ fontSize: 20, color: selected.col, fontWeight: 700 }}>
                    {selected.sym}
                  </div>
                  <div style={{ fontSize: 13, color: "#e8f0eb", marginBottom: 12 }}>
                    {selected.name}
                  </div>
                  {[["Z (atoomnummer)", selected.z],
                    ["Atoommassa", selected.mass+" g/mol"],
                    ["Groep", selected.group],
                    ["Zeldzaamheid", RARITY_CONFIG[selected.rarity].label],
                    ["Achtergrond kleur", selected.bg],
                    ["Voorgrond kleur", selected.col],
                  ].map(([k,v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between",
                      padding: "5px 0", borderBottom: "1px solid #060e08",
                      fontSize: 11 }}>
                      <span style={{ color: "#4a5568" }}>{k}</span>
                      <span style={{ color: selected.col, fontFamily: "monospace",
                        fontSize: 10 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Molecule detail */}
              {selected.formula && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <MoleculeIcon mol={selected} size={80}/>
                  </div>
                  <div style={{ fontSize: 18, color: selected.col, fontFamily: "monospace",
                    fontWeight: 700 }}>{selected.formula}</div>
                  <div style={{ fontSize: 13, color: "#e8f0eb", marginBottom: 12 }}>{selected.name}</div>
                  {[["Atomen", selected.atoms],["Punten","+"+selected.pts+" MolCoins"]].map(([k,v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between",
                      padding: "5px 0", borderBottom: "1px solid #060e08", fontSize: 11 }}>
                      <span style={{ color: "#4a5568" }}>{k}</span>
                      <span style={{ color: selected.col, fontFamily: "monospace", fontSize: 10 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Badge detail */}
              {selected.req && !selected.formula && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <BadgeIcon badge={selected} size={80} earned={true}/>
                  </div>
                  <div style={{ fontSize: 15, color: selected.col, fontWeight: 700 }}>
                    {selected.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>{selected.req}</div>
                </div>
              )}

              <button onClick={() => setSelected(null)}
                style={{ width: "100%", marginTop: 16, padding: "6px",
                  background: "transparent", border: "1px solid #1e3a2a",
                  color: "#4a5568", borderRadius: 4, cursor: "pointer",
                  fontFamily: "inherit", fontSize: 10 }}>
                ← SLUIT
              </button>
            </div>
          ) : (
            <div style={{ color: "#4a5568", fontSize: 11, fontFamily: "monospace",
              lineHeight: 1.8 }}>
              <div style={{ color: "#1a9966", marginBottom: 8, letterSpacing: 2 }}>// INFO</div>
              Klik op een asset voor details.<br/><br/>
              Alle kleuren zijn CSS hex waarden die direct in Roblox Lua gebruikt worden als
              Color3.fromHex().<br/><br/>
              Element kleuren zijn gebaseerd op standaard chemie-conventie kleurcodering.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

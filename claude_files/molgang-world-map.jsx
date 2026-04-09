import { useState, useEffect, useRef } from "react";

const ZONES = {
  nexus: {
    id: "nexus", name: "Molgang Nexus Hub", color: "#22c55e", glow: "#22c55e44",
    cx: 400, cy: 400, rx: 110, ry: 90,
    desc: "Centraal spawnpunt. ANK gebouw, MolChain Tower, Tutorial NPC Mol, Marketplace.",
    landmarks: [
      { x: 390, y: 370, icon: "⚓", label: "ANK Gebouw", col: "#2a9acc" },
      { x: 440, y: 395, icon: "⛓", label: "MolChain Tower 200 studs", col: "#22c55e" },
      { x: 360, y: 415, icon: "🧪", label: "Tutorial Lab", col: "#7ecf5a" },
      { x: 415, y: 360, icon: "🏪", label: "Marketplace", col: "#c8941a" },
      { x: 380, y: 440, icon: "🎯", label: "Spawn Point", col: "#f59e0b" },
    ],
    terrain: "hub",
  },
  biome: {
    id: "biome", name: "Periodic Table Biome", color: "#1a9966", glow: "#1a996644",
    cx: 400, cy: 155, rx: 180, ry: 120,
    desc: "118 element-eilanden. Elk element in eigen zone. Kleurgecodeerd per groep. Quiz-zuilen.",
    landmarks: [
      { x: 290, y: 120, icon: "🔴", label: "Alkali Metalen (Li-Fr)", col: "#ef4444" },
      { x: 390, y: 100, icon: "🟡", label: "Overgangsmetalen (Ti-V-Fe)", col: "#f59e0b" },
      { x: 510, y: 120, icon: "🟣", label: "Edelgassen (He-Rn)", col: "#a855f7" },
      { x: 330, y: 165, icon: "🟢", label: "Halogenen (F-Cl-Br)", col: "#22c55e" },
      { x: 460, y: 165, icon: "⚪", label: "Non-Metalen (H-C-N-O)", col: "#94a3b8" },
      { x: 400, y: 200, icon: "📚", label: "Quiz Zuil", col: "#2a9acc" },
    ],
    terrain: "biome",
  },
  quantum: {
    id: "quantum", name: "Quantum Lab", color: "#a855f7", glow: "#a855f744",
    cx: 620, cy: 400, rx: 120, ry: 90,
    desc: "Quantum dots Nh-Og. Superposition effects. Inner sanctum (50 elementen vereist).",
    landmarks: [
      { x: 600, y: 370, icon: "⚛", label: "Quantum Dot Arena", col: "#a855f7" },
      { x: 650, y: 395, icon: "🌀", label: "Superposition Chamber", col: "#7c3aed" },
      { x: 620, y: 430, icon: "🔒", label: "Inner Sanctum (50+ elem)", col: "#c4b5fd" },
      { x: 590, y: 415, icon: "❄", label: "Cryogenic Zone", col: "#06b6d4" },
    ],
    terrain: "quantum",
  },
  factory: {
    id: "factory", name: "Slakkenspoor Fabriek", color: "#c8941a", glow: "#c8941a44",
    cx: 185, cy: 400, rx: 120, ry: 90,
    desc: "BOF slag verwerking. HGMS machine mini-game. pH-ladder puzzel. CO2 vangen.",
    landmarks: [
      { x: 155, y: 375, icon: "⚙", label: "HGMS Machine", col: "#ef4444" },
      { x: 210, y: 390, icon: "🧫", label: "Reactie Vaten pH-ladder", col: "#f59e0b" },
      { x: 175, y: 425, icon: "🏭", label: "Slak Invoer Punt", col: "#78716c" },
      { x: 205, y: 360, icon: "💨", label: "CO2 Schoorstenen", col: "#84cc16" },
      { x: 155, y: 415, icon: "📦", label: "Product Opslag V2O5/Fe", col: "#c8941a" },
    ],
    terrain: "factory",
  },
  nature: {
    id: "nature", name: "Natuur & Bodem Zone", color: "#84cc16", glow: "#84cc1644",
    cx: 400, cy: 630, rx: 150, ry: 100,
    desc: "Pioenen (Wognum), N-depositie visualisatie, Si-K biostimulant veld, agrarisch.",
    landmarks: [
      { x: 360, y: 610, icon: "🌸", label: "Pioen Veld (Wognum)", col: "#f472b6" },
      { x: 430, y: 625, icon: "🌿", label: "Si-K Biostimulant", col: "#84cc16" },
      { x: 390, y: 660, icon: "💜", label: "N Depositie Meter", col: "#a855f7" },
      { x: 450, y: 600, icon: "🌱", label: "Bodem Analysator", col: "#22c55e" },
      { x: 340, y: 650, icon: "🐄", label: "Emissiebron (NH3)", col: "#c8941a" },
    ],
    terrain: "nature",
  },
};

const PATHS = [
  { from: "nexus", to: "biome", waypoints: [[400, 300], [400, 240]] },
  { from: "nexus", to: "quantum", waypoints: [[490, 400], [555, 400]] },
  { from: "nexus", to: "factory", waypoints: [[310, 400], [280, 400]] },
  { from: "nexus", to: "nature", waypoints: [[400, 475], [400, 545]] },
  { from: "biome", to: "quantum", waypoints: [[540, 155], [620, 285]] },
  { from: "factory", to: "nature", waypoints: [[185, 470], [280, 590]] },
];

const ELEMENTS_GRID = [
  [1,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,2],
  [3,4,null,null,null,null,null,null,null,null,null,null,5,6,7,8,9,10],
  [11,12,null,null,null,null,null,null,null,null,null,null,13,14,15,16,17,18],
  [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36],
];

const EL_NAMES = { 1:"H",2:"He",3:"Li",4:"Be",5:"B",6:"C",7:"N",8:"O",9:"F",10:"Ne",
  11:"Na",12:"Mg",13:"Al",14:"Si",15:"P",16:"S",17:"Cl",18:"Ar",
  19:"K",20:"Ca",21:"Sc",22:"Ti",23:"V",24:"Cr",25:"Mn",26:"Fe",
  27:"Co",28:"Ni",29:"Cu",30:"Zn",31:"Ga",32:"Ge",33:"As",34:"Se",35:"Br",36:"Kr" };

const EL_COL = (z) => {
  if ([1].includes(z)) return "#94a3b8";
  if ([2,10,18,36].includes(z)) return "#a855f7";
  if ([3,11,19].includes(z)) return "#ef4444";
  if ([4,12,20].includes(z)) return "#f97316";
  if ([9,17,35].includes(z)) return "#22c55e";
  if ([5,13,31,32].includes(z)) return "#94a3b8";
  if ([6,7,8,15,16].includes(z)) return "#64748b";
  if (z>=21&&z<=30) return "#2a9acc";
  return "#6b7280";
};

function ZonePath({ from, to, waypoints, active, hovered }) {
  const fz = ZONES[from], tz = ZONES[to];
  const pts = [[fz.cx, fz.cy], ...waypoints, [tz.cx, tz.cy]];
  const d = pts.map((p,i) => `${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ");
  const col = (active===from||active===to||hovered===from||hovered===to) ? "#22c55e" : "#1e3a2a";
  return (
    <g>
      <path d={d} fill="none" stroke={col} strokeWidth={active===from||active===to?3:1.5}
        strokeDasharray="6,4" opacity={0.6}/>
      {pts.slice(1,-1).map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={3} fill={col} opacity={0.5}/>
      ))}
    </g>
  );
}

function TerrainBg({ zone }) {
  const { cx, cy, rx, ry, terrain, color } = zone;
  if (terrain === "biome") {
    return (
      <g>
        {[...Array(12)].map((_,i) => {
          const a = i*Math.PI/6, r = 70+Math.random()*30;
          return <circle key={i} cx={cx+r*Math.cos(a)} cy={cy+r*Math.sin(a)*0.6}
            r={18+Math.random()*12} fill={`${color}18`} opacity={0.7}/>;
        })}
        {[...Array(8)].map((_,i) => {
          const x = cx-80+i*22, y = cy-30+(i%3)*18;
          return <text key={i} x={x} y={y} fontSize={8} fill={color} opacity={0.3}>⬡</text>;
        })}
      </g>
    );
  }
  if (terrain === "quantum") {
    return (
      <g>
        {[...Array(8)].map((_,i) => {
          const a=i*Math.PI/4,r=60;
          return <circle key={i} cx={cx+r*Math.cos(a)} cy={cy+r*Math.sin(a)*0.8}
            r={4} fill="#a855f7" opacity={0.4}/>;
        })}
        <ellipse cx={cx} cy={cy} rx={rx*0.7} ry={ry*0.5}
          fill="none" stroke="#a855f7" strokeWidth={1} strokeDasharray="3,3" opacity={0.3}/>
        <ellipse cx={cx} cy={cy} rx={rx*0.5} ry={ry*0.35}
          fill="none" stroke="#7c3aed" strokeWidth={1} opacity={0.25}/>
      </g>
    );
  }
  if (terrain === "factory") {
    return (
      <g>
        {[150,185,210].map((x,i) => (
          <rect key={i} x={x-8} y={cy-40-i*5} width={16} height={30+i*5}
            fill={`${color}33`} rx={2}/>
        ))}
      </g>
    );
  }
  if (terrain === "nature") {
    return (
      <g>
        {[...Array(15)].map((_,i) => {
          const x = cx-120+i*18, y = cy-30+(i%4)*15;
          return <text key={i} x={x} y={y} fontSize={10} opacity={0.3}>🌿</text>;
        })}
      </g>
    );
  }
  return null;
}

function Zone({ zone, isActive, isHovered, onClick, onHover }) {
  const { cx, cy, rx, ry, color, glow, name, landmarks } = zone;
  const active = isActive || isHovered;
  return (
    <g onClick={onClick} onMouseEnter={onHover} onMouseLeave={() => onHover(null)}
      style={{ cursor: "pointer" }}>
      {/* Glow */}
      {active && <ellipse cx={cx} cy={cy} rx={rx+20} ry={ry+15} fill={glow} opacity={0.6}/>}
      {/* Shadow/depth */}
      <ellipse cx={cx+4} cy={cy+6} rx={rx} ry={ry} fill="rgba(0,0,0,0.3)"/>
      {/* Main island */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill={`${color}18`} stroke={color}
        strokeWidth={active ? 2.5 : 1.5} opacity={active ? 1 : 0.8}/>
      {/* Terrain details */}
      <TerrainBg zone={zone}/>
      {/* Inner highlight */}
      <ellipse cx={cx-rx*0.2} cy={cy-ry*0.2} rx={rx*0.4} ry={ry*0.3}
        fill={color} opacity={0.06}/>
      {/* Zone name */}
      <text x={cx} y={cy - ry - 12} textAnchor="middle"
        fill={color} fontSize={active ? 11 : 9} fontWeight="bold"
        fontFamily="monospace" letterSpacing={1}>
        {name.toUpperCase().split(" ")[0]}
      </text>
      {/* Landmarks */}
      {landmarks.map((lm, i) => (
        <g key={i}>
          <circle cx={lm.x} cy={lm.y} r={10} fill="rgba(0,0,0,0.5)" stroke={lm.col} strokeWidth={1}/>
          <text x={lm.x} y={lm.y+4} textAnchor="middle" fontSize={9}>{lm.icon}</text>
          {active && (
            <text x={lm.x} y={lm.y+20} textAnchor="middle" fontSize={6}
              fill={lm.col} fontFamily="monospace">{lm.label}</text>
          )}
        </g>
      ))}
    </g>
  );
}

function ElementIsland({ z, x, y, discovered }) {
  const sym = EL_NAMES[z];
  const col = EL_COL(z);
  if (!sym) return null;
  return (
    <g>
      <circle cx={x} cy={y} r={8} fill={discovered ? col : "#1a2d20"}
        stroke={col} strokeWidth={0.8} opacity={discovered ? 0.9 : 0.5}/>
      <text x={x} y={y+3} textAnchor="middle" fontSize={5.5}
        fill={discovered ? "#000" : col} fontWeight="bold" fontFamily="monospace">
        {sym}
      </text>
    </g>
  );
}

function MolChainTower() {
  return (
    <g>
      {/* Tower base */}
      <rect x={432} y={340} width={16} height={55} fill="#1a9966" opacity={0.8} rx={2}/>
      {/* Tower body - helix */}
      {[0,1,2,3,4].map(i => (
        <ellipse key={i} cx={440} cy={345+i*10} rx={6} ry={2}
          fill="none" stroke="#22c55e" strokeWidth={0.8} opacity={0.6+i*0.05}/>
      ))}
      {/* Beacon */}
      <circle cx={440} cy={340} r={4} fill="#22c55e" opacity={0.9}/>
      <circle cx={440} cy={340} r={8} fill="none" stroke="#22c55e" strokeWidth={1} opacity={0.4}/>
    </g>
  );
}

function ANKBuilding() {
  return (
    <g>
      <rect x={374} y={362} width={24} height={20} fill="#0d1f2a" stroke="#2a9acc" strokeWidth={1} rx={2}/>
      <rect x={376} y={355} width={20} height={8} fill="#2a9acc" opacity={0.8} rx={1}/>
      <text x={386} y={345} textAnchor="middle" fontSize={8} fill="#2a9acc">⚓</text>
    </g>
  );
}

function Compass({ x, y }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={22} fill="#0d1f1a" stroke="#1a9966" strokeWidth={1}/>
      <polygon points="0,-18 -3,-4 3,-4" fill="#22c55e"/>
      <polygon points="0,18 -3,4 3,4" fill="#374151"/>
      <polygon points="-18,0 -4,-3 -4,3" fill="#374151"/>
      <polygon points="18,0 4,-3 4,3" fill="#374151"/>
      <text y={-21} textAnchor="middle" fontSize={6} fill="#22c55e" fontFamily="monospace">N</text>
      <text y={27} textAnchor="middle" fontSize={6} fill="#6b7280" fontFamily="monospace">Z</text>
      <circle r={3} fill="#22c55e"/>
    </g>
  );
}

function ScaleBar({ x, y }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x+80} y2={y} stroke="#22c55e" strokeWidth={1.5}/>
      <line x1={x} y1={y-4} x2={x} y2={y+4} stroke="#22c55e" strokeWidth={1.5}/>
      <line x1={x+80} y1={y-4} x2={x+80} y2={y+4} stroke="#22c55e" strokeWidth={1.5}/>
      <text x={x+40} y={y+14} textAnchor="middle" fontSize={7} fill="#6b7280" fontFamily="monospace">
        500 studs
      </text>
    </g>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Chakra+Petch:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #060e08; color: #e8f0eb; font-family: 'Chakra Petch', sans-serif; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes rotate { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes glow { 0%,100%{filter:drop-shadow(0 0 4px currentColor)} 50%{filter:drop-shadow(0 0 12px currentColor)} }
  .pulse { animation: pulse 2s infinite; }
  .float { animation: float 3s ease-in-out infinite; }
  .glow { animation: glow 2s ease-in-out infinite; }
`;

const DISCOVERED = new Set([1,6,7,8,20,26,23,14]); // Demo discovered elements

export default function WorldMap() {
  const [active, setActive] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t+1), 800);
    return () => clearInterval(iv);
  }, []);

  const activeZone = active ? ZONES[active] : null;

  return (
    <div style={{ background: "#060e08", minHeight: "100vh", fontFamily: "'Chakra Petch', sans-serif" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ background: "#0d1f1a", borderBottom: "1px solid #1e3a2a",
        padding: "12px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11,
          letterSpacing: 4, color: "#1a9966" }}>// MOLGANG</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#f4f9f6", letterSpacing: -0.5 }}>
          MOLECULIA — Wereld Kaart
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["nexus","biome","quantum","factory","nature"].map(id => (
            <button key={id} onClick={() => setActive(active===id?null:id)}
              style={{ padding: "4px 12px", borderRadius: 4, border: `1px solid ${ZONES[id].color}`,
                background: active===id ? `${ZONES[id].color}33` : "transparent",
                color: ZONES[id].color, cursor: "pointer", fontFamily: "inherit",
                fontSize: 9, letterSpacing: 1, textTransform: "uppercase" }}>
              {ZONES[id].name.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
        {/* MAP */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Grid overlay */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <defs>
              <pattern id="grid" width={40} height={40} patternUnits="userSpaceOnUse">
                <path d="M40,0 L0,0 L0,40" fill="none" stroke="#0d1f1a" strokeWidth={0.5}/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>

          <svg viewBox="0 0 800 780" style={{ width: "100%", height: "100%" }}
            preserveAspectRatio="xMidYMid meet">

            {/* Deep space background */}
            <defs>
              <radialGradient id="spaceBg" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#0d2a18"/>
                <stop offset="100%" stopColor="#060e08"/>
              </radialGradient>
              <filter id="blur"><feGaussianBlur stdDeviation="2"/></filter>
            </defs>
            <rect width={800} height={780} fill="url(#spaceBg)"/>

            {/* Stars */}
            {[...Array(60)].map((_,i) => {
              const x = (i*137)%800, y = (i*97)%780, r = i%5===0?1.5:0.8;
              return <circle key={i} cx={x} cy={y} r={r} fill="white"
                opacity={0.2+Math.sin(tick*0.3+i)*0.15}/>;
            })}

            {/* Zone connecting paths */}
            {PATHS.map((p,i) => (
              <ZonePath key={i} {...p} active={active} hovered={hovered}/>
            ))}

            {/* Zones */}
            {Object.values(ZONES).map(zone => (
              <Zone key={zone.id} zone={zone}
                isActive={active === zone.id}
                isHovered={hovered === zone.id}
                onClick={() => setActive(active===zone.id?null:zone.id)}
                onHover={(e) => setHovered(e ? zone.id : null)}/>
            ))}

            {/* ANK + Tower special renders */}
            <ANKBuilding/>
            <MolChainTower/>

            {/* Mini periodic table in Biome zone */}
            {ELEMENTS_GRID.map((row, ri) =>
              row.map((z, ci) => {
                if (!z) return null;
                const bx = 240 + ci * 17, by = 90 + ri * 16;
                return <ElementIsland key={z} z={z} x={bx} y={by} discovered={DISCOVERED.has(z)}/>;
              })
            )}

            {/* Coordinates */}
            {[[400,10],[750,400],[400,770],[50,400]].map(([x,y],i) => (
              <text key={i} x={x} y={y} textAnchor="middle" fontSize={7}
                fill="#1a3a25" fontFamily="monospace">
                {i===0?"(0,+2000)":i===1?"(+2000,0)":i===2?"(0,-2000)":"(-2000,0)"}
              </text>
            ))}

            {/* Active zone pulse ring */}
            {activeZone && (
              <ellipse cx={activeZone.cx} cy={activeZone.cy}
                rx={activeZone.rx+30} ry={activeZone.ry+20}
                fill="none" stroke={activeZone.color} strokeWidth={1}
                strokeDasharray="4,4" opacity={0.5 + Math.sin(tick*1.5)*0.3}/>
            )}

            {/* Compass & Scale */}
            <Compass x={735} y={70}/>
            <ScaleBar x={20} y={750}/>

            {/* Legend box */}
            <rect x={10} y={570} width={115} height={165} fill="#0d1f1a" stroke="#1e3a2a" rx={4}/>
            <text x={15} y={585} fontSize={7} fill="#1a9966" fontFamily="monospace">// LEGENDA</text>
            {[["●","Spawn Punt","#f59e0b"],["⚓","ANK Gebouw","#2a9acc"],
              ["⛓","MolChain Tower","#22c55e"],["⚗","Atoom Spawn","#7ecf5a"],
              ["⚛","Quantum Dot","#a855f7"],["🔴","Zeldzaam Elem.","#ef4444"],
              ["📚","Quiz Zuil","#2a9acc"],["🏭","Mini-Game","#c8941a"],
              ["---","Pad","#1a9966"],["◈","Landmark","#6b7280"]
            ].map(([icon,label,col],i) => (
              <g key={i}>
                <text x={16} y={600+i*13} fontSize={8} fill={col}>{icon}</text>
                <text x={28} y={600+i*13} fontSize={7} fill="#6b7280" fontFamily="monospace">{label}</text>
              </g>
            ))}

            {/* Coordinate grid labels */}
            <text x={400} y={395} textAnchor="middle" fontSize={7} fill="#1a9966"
              fontFamily="monospace" opacity={0.5}>0,0</text>
          </svg>

          {/* Floating tooltip */}
          {hovered && (
            <div style={{ position: "absolute", top: 20, left: "50%",
              transform: "translateX(-50%)",
              background: "#0d1f1a", border: `1px solid ${ZONES[hovered].color}`,
              borderRadius: 6, padding: "8px 16px", pointerEvents: "none",
              fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#e8f0eb",
              whiteSpace: "nowrap" }}>
              <span style={{ color: ZONES[hovered].color }}>▶ </span>
              {ZONES[hovered].name}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{ width: 280, background: "#0d1f1a", borderLeft: "1px solid #1e3a2a",
          overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {activeZone ? (
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9,
                color: activeZone.color, letterSpacing: 3, marginBottom: 8 }}>
                // ZONE DETAIL
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f9f6",
                marginBottom: 8, letterSpacing: -0.5 }}>
                {activeZone.name}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7, marginBottom: 16 }}>
                {activeZone.desc}
              </div>

              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9,
                color: activeZone.color, letterSpacing: 2, marginBottom: 10 }}>
                // LANDMARKS
              </div>
              {activeZone.landmarks.map((lm, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 6,
                  background: "#060e08", border: `1px solid ${lm.col}22`,
                  marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{lm.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: "#e8f0eb", fontWeight: 600 }}>{lm.label}</div>
                    <div style={{ fontSize: 9, color: "#4a5568", fontFamily: "monospace" }}>
                      ({lm.x},{lm.y})
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={() => setActive(null)}
                style={{ width: "100%", marginTop: 12, padding: "8px",
                  background: "transparent", border: `1px solid ${activeZone.color}`,
                  color: activeZone.color, borderRadius: 4, cursor: "pointer",
                  fontFamily: "inherit", fontSize: 10, letterSpacing: 2 }}>
                ← SLUIT ZONE
              </button>
            </div>
          ) : (
            <div style={{ padding: 20 }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9,
                color: "#1a9966", letterSpacing: 3, marginBottom: 16 }}>
                // MOLECULIA OVERZICHT
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.8, marginBottom: 20 }}>
                Klik op een zone voor details. 4000×4000 studs wereld.
                StreamingEnabled voor performance.
              </div>

              {Object.values(ZONES).map(zone => (
                <div key={zone.id} onClick={() => setActive(zone.id)}
                  style={{ padding: "10px 12px", borderRadius: 6, marginBottom: 8,
                    background: "#060e08", border: `1px solid ${zone.color}44`,
                    cursor: "pointer", transition: "border-color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor=zone.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor=`${zone.color}44`}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, color: zone.color, fontWeight: 700 }}>
                      {zone.name}
                    </div>
                    <div style={{ fontSize: 9, color: "#4a5568", fontFamily: "monospace" }}>
                      ({zone.cx},{zone.cy})
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#4a5568", marginTop: 4, lineHeight: 1.5 }}>
                    {zone.desc.slice(0, 55)}...
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 16, padding: 12, background: "#060e08",
                borderRadius: 6, border: "1px solid #1e3a2a" }}>
                <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9,
                  color: "#1a9966", letterSpacing: 2, marginBottom: 8 }}>
                  // WERELD STATISTIEKEN
                </div>
                {[["Wereld grootte","4000×4000 studs"],["Max spelers","100 per server"],
                  ["Element eilanden","118"],["Spawnable atomen","500+ tegelijk"],
                  ["Chain Tower hoogte","200 studs"],["Zones","5"]
                ].map(([k,v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between",
                    padding: "4px 0", borderBottom: "1px solid #0d1f1a", fontSize: 11 }}>
                    <span style={{ color: "#4a5568" }}>{k}</span>
                    <span style={{ color: "#22c55e", fontFamily: "monospace", fontSize: 10 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

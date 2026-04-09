import { useState, useEffect } from "react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Exo+2:wght@400;600;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080c10; }

  @keyframes walk {
    0%   { transform: translateX(0) rotate(0deg); }
    25%  { transform: translateX(4px) rotate(2deg); }
    50%  { transform: translateX(0) rotate(0deg); }
    75%  { transform: translateX(-4px) rotate(-2deg); }
    100% { transform: translateX(0) rotate(0deg); }
  }
  @keyframes collect {
    0%   { transform: scale(1) rotate(0deg); }
    30%  { transform: scale(1.15) rotate(10deg); }
    60%  { transform: scale(0.95) rotate(-5deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  @keyframes jump {
    0%   { transform: translateY(0); }
    40%  { transform: translateY(-18px); }
    60%  { transform: translateY(-18px); }
    100% { transform: translateY(0); }
  }
  @keyframes build {
    0%   { transform: scale(1); filter: drop-shadow(0 0 0px #22c55e); }
    50%  { transform: scale(1.1); filter: drop-shadow(0 0 12px #22c55e); }
    100% { transform: scale(1); filter: drop-shadow(0 0 0px #22c55e); }
  }
  @keyframes quantum-catch {
    0%   { transform: translateY(0) rotate(0deg); }
    20%  { transform: translateY(-12px) rotate(-15deg); }
    40%  { transform: translateY(-20px) rotate(20deg); }
    70%  { transform: translateY(-8px) rotate(-8deg); }
    100% { transform: translateY(0) rotate(0deg); }
  }
  @keyframes chain-register {
    0%   { transform: scale(1); }
    20%  { transform: scale(0.95) translateY(5px); }
    50%  { transform: scale(1.05) translateY(-3px); }
    80%  { transform: scale(1.02); }
    100% { transform: scale(1); }
  }
  @keyframes ank-handshake {
    0%   { transform: translateX(0); }
    30%  { transform: translateX(8px); }
    60%  { transform: translateX(5px); }
    100% { transform: translateX(0); }
  }
  @keyframes celebrate {
    0%   { transform: rotate(0deg) scale(1); }
    20%  { transform: rotate(-10deg) scale(1.1); }
    40%  { transform: rotate(10deg) scale(1.15); }
    60%  { transform: rotate(-5deg) scale(1.08); }
    80%  { transform: rotate(5deg) scale(1.05); }
    100% { transform: rotate(0deg) scale(1); }
  }
  @keyframes think {
    0%,100% { transform: tilted(0deg); }
    50%     { transform: rotate(-8deg); }
  }
  @keyframes sprint {
    0%   { transform: translateX(0) skewX(0deg); }
    50%  { transform: translateX(6px) skewX(-8deg); }
    100% { transform: translateX(0) skewX(0deg); }
  }
  @keyframes ph-puzzle {
    0%   { transform: translateY(0) rotate(0deg); }
    25%  { transform: translateY(-8px) rotate(-12deg); }
    75%  { transform: translateY(-4px) rotate(8deg); }
    100% { transform: translateY(0) rotate(0deg); }
  }
  @keyframes idle {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-3px); }
  }
  @keyframes emote-wave {
    0%,100% { transform: rotate(0deg); transform-origin: bottom center; }
    30%     { transform: rotate(20deg); transform-origin: bottom center; }
    60%     { transform: rotate(-10deg); transform-origin: bottom center; }
  }
  @keyframes beam-up {
    0%   { transform: scaleY(1) translateY(0); opacity: 1; }
    50%  { transform: scaleY(1.2) translateY(-5px); opacity: 0.8; }
    100% { transform: scaleY(1) translateY(0); opacity: 1; }
  }

  .walk    { animation: walk 0.7s ease-in-out infinite; }
  .collect { animation: collect 0.8s ease-in-out infinite; }
  .jump    { animation: jump 1s ease-in-out infinite; }
  .build   { animation: build 1.2s ease-in-out infinite; }
  .quantum { animation: quantum-catch 1s ease-in-out infinite; }
  .chain   { animation: chain-register 1.4s ease-in-out infinite; }
  .ank     { animation: ank-handshake 1s ease-in-out infinite; }
  .celebrate { animation: celebrate 0.9s ease-in-out infinite; }
  .sprint  { animation: sprint 0.5s ease-in-out infinite; }
  .ph      { animation: ph-puzzle 1.1s ease-in-out infinite; }
  .idle    { animation: idle 2.5s ease-in-out infinite; }
`;

// Stick figure SVG components
function StickFigure({ col = "#22c55e", anim = "", size = 90,
  leftArmAngle = 30, rightArmAngle = -30,
  leftLegAngle = 20, rightLegAngle = -20,
  lean = 0, extra = null, holdItem = null }) {

  const cx = size / 2;
  const headY = 14, neckY = 24, waistY = 56, kneeY = 78;
  const transform = `rotate(${lean} ${cx} ${waistY})`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={anim}>
      <defs>
        <filter id={`glow_${col.replace("#","")}`}>
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Hold item */}
      {holdItem && (
        <g transform={`translate(${cx+20} ${neckY+8})`}>
          <text fontSize={14}>{holdItem}</text>
        </g>
      )}

      <g transform={transform} filter={`url(#glow_${col.replace("#","")})`}>
        {/* Head */}
        <circle cx={cx} cy={headY} r={8} fill="none" stroke={col} strokeWidth={2}/>

        {/* Neck */}
        <line x1={cx} y1={headY+8} x2={cx} y2={neckY} stroke={col} strokeWidth={2}/>

        {/* Torso */}
        <line x1={cx} y1={neckY} x2={cx} y2={waistY} stroke={col} strokeWidth={2.5}/>

        {/* Left arm */}
        <line x1={cx} y1={neckY+6}
          x2={cx + Math.cos((leftArmAngle+90)*Math.PI/180)*20}
          y2={neckY+6 + Math.sin((leftArmAngle+90)*Math.PI/180)*20}
          stroke={col} strokeWidth={2}/>

        {/* Right arm */}
        <line x1={cx} y1={neckY+6}
          x2={cx + Math.cos((rightArmAngle+90)*Math.PI/180)*20}
          y2={neckY+6 + Math.sin((rightArmAngle+90)*Math.PI/180)*20}
          stroke={col} strokeWidth={2}/>

        {/* Left leg */}
        <line x1={cx} y1={waistY}
          x2={cx + Math.cos((leftLegAngle+90)*Math.PI/180)*24}
          y2={waistY + Math.sin((leftLegAngle+90)*Math.PI/180)*24}
          stroke={col} strokeWidth={2}/>

        {/* Right leg */}
        <line x1={cx} y1={waistY}
          x2={cx + Math.cos((rightLegAngle+90)*Math.PI/180)*24}
          y2={waistY + Math.sin((rightLegAngle+90)*Math.PI/180)*24}
          stroke={col} strokeWidth={2}/>

        {/* Extra elements */}
        {extra}
      </g>
    </svg>
  );
}

const MOVES = [
  {
    id: "idle",
    name: "Idle / Stilstaan",
    key: "—",
    category: "Basis",
    col: "#22c55e",
    desc: "Speler staat stil. Lichte ademhaling animatie — boven/neer beweging van torso.",
    context: "Default state. Geen input van speler.",
    lua: "humanoid:ChangeState(Enum.HumanoidStateType.None)",
    figure: <StickFigure col="#22c55e" anim="idle" leftArmAngle={20} rightArmAngle={-20}
      leftLegAngle={5} rightLegAngle={-5}/>,
  },
  {
    id: "walk",
    name: "Lopen",
    key: "W / A / S / D",
    category: "Basis",
    col: "#7ecf5a",
    desc: "Normale loopsnelheid: 16 studs/sec. Armen swingen, benen wisselen.",
    context: "Standaard beweging door Moleculia.",
    lua: "humanoid.WalkSpeed = 16",
    figure: <StickFigure col="#7ecf5a" anim="walk" leftArmAngle={40} rightArmAngle={-60}
      leftLegAngle={35} rightLegAngle={-35}/>,
  },
  {
    id: "sprint",
    name: "Sprinten",
    key: "Shift (hold)",
    category: "Basis",
    col: "#84cc16",
    desc: "Sprint snelheid: 28 studs/sec. Voorover geleund, arms achter. Verbruikt geen stamina.",
    context: "Essentieel voor Quantum Dots vangen (5 sec venster).",
    lua: "humanoid.WalkSpeed = 28",
    figure: <StickFigure col="#84cc16" anim="sprint" leftArmAngle={-30} rightArmAngle={50}
      leftLegAngle={50} rightLegAngle={-50} lean={-12}/>,
  },
  {
    id: "jump",
    name: "Springen",
    key: "Space",
    category: "Basis",
    col: "#38bdf8",
    desc: "Sprong hoogte: 7.2 studs. Gebruikt voor klimmen op eilanden en platforms.",
    context: "Bereik hogere element-eilanden in de Biome zone.",
    lua: "humanoid.JumpPower = 50",
    figure: <StickFigure col="#38bdf8" anim="jump" leftArmAngle={80} rightArmAngle={80}
      leftLegAngle={-20} rightLegAngle={20}/>,
  },
  {
    id: "collect",
    name: "Atoom Vangen",
    key: "Touch / Proximity",
    category: "Interactie",
    col: "#fbbf24",
    desc: "Speler loopt door atoom heen — ProximityPrompt of Touch detect. Reach-and-grab animatie.",
    context: "Elke zone. Atoom verdwijnt en verschijnt in inventory.",
    lua: "atom.Touched:Connect(onAtomTouch)",
    figure: <StickFigure col="#fbbf24" anim="collect" leftArmAngle={-10} rightArmAngle={120}
      leftLegAngle={10} rightLegAngle={-10} holdItem="⚛"/>,
  },
  {
    id: "build",
    name: "Molecuul Bouwen",
    key: "⚗ Builder UI",
    category: "Interactie",
    col: "#22c55e",
    desc: "Speler houdt beide handen omhoog, groen glow burst. Molecuul materialiseert boven het hoofd.",
    context: "Overal. Inventory > Builder. Groen = geldig recept.",
    lua: "RemoteEvent:FireServer('BuildMolecule', selectedAtoms)",
    figure: <StickFigure col="#22c55e" anim="build" leftArmAngle={140} rightArmAngle={140}
      leftLegAngle={5} rightLegAngle={-5}/>,
    effect: <div style={{ position: "absolute", top: -10, left: "50%",
      transform: "translateX(-50%)",
      fontSize: 22, animation: "build 1.2s ease-in-out infinite" }}>💧</div>,
  },
  {
    id: "quantum",
    name: "Quantum Dot Vangen",
    key: "Touch (snel!)",
    category: "Interactie",
    col: "#a855f7",
    desc: "Hoog-energie sprong-en-grijp. Speler springt met gestrekte arm richting flickerend dot.",
    context: "Quantum Lab. Dot verdwijnt in 5-30 seconden!",
    lua: "quantumDot.Touched:Connect(onQuantumCatch)",
    figure: <StickFigure col="#a855f7" anim="quantum" leftArmAngle={130} rightArmAngle={30}
      leftLegAngle={-30} rightLegAngle={10} lean={-15} holdItem="⚡"/>,
  },
  {
    id: "chain",
    name: "Chain Registratie",
    key: "Auto (na molecuul)",
    category: "Interactie",
    col: "#2a9acc",
    desc: "Speler staat bij Registry Tower. Armen uitgestrekt, beam van handen naar tower.",
    context: "Automatisch na molecuul bouwen. Tower flash animatie.",
    lua: "ChainRegistry:RegisterMolecule(player, molName, atoms)",
    figure: <StickFigure col="#2a9acc" anim="chain" leftArmAngle={10} rightArmAngle={170}
      leftLegAngle={5} rightLegAngle={-5}/>,
  },
  {
    id: "ank",
    name: "ANK Lening Start",
    key: "ANK UI Interact",
    category: "Interactie",
    col: "#f59e0b",
    desc: "Handschudding animatie richting ANK loket. Coins vliegen van lender naar borrower.",
    context: "ANK Gebouw. Bevestiging van lening acceptatie.",
    lua: "ANKLending:RequestLoan(borrower, lender, amount)",
    figure: <StickFigure col="#f59e0b" anim="ank" leftArmAngle={5} rightArmAngle={80}
      leftLegAngle={8} rightLegAngle={-8}/>,
  },
  {
    id: "ph",
    name: "pH-Ladder Puzzel",
    key: "Slider UI (Fabriek)",
    category: "Mini-game",
    col: "#c8941a",
    desc: "Speler staat bij vat en bedient slider-interface. Schuifbeweging linker arm.",
    context: "Slakkenspoor Fabriek. Correct: +50 MolCoins bonus.",
    lua: "-- Mini-game serverside validation pH step",
    figure: <StickFigure col="#c8941a" anim="ph" leftArmAngle={80} rightArmAngle={-10}
      leftLegAngle={15} rightLegAngle={-15}/>,
  },
  {
    id: "celebrate",
    name: "Celebrate Emote",
    key: "/celebrate (chat)",
    category: "Emote",
    col: "#f472b6",
    desc: "Armen in de lucht, springende jumps. Confetti particle burst om de speler.",
    context: "Na grote milestone: V2O5, Chain Milestone, 118 elementen!",
    lua: "AnimationTrack:Play() -- Celebrate",
    figure: <StickFigure col="#f472b6" anim="celebrate" leftArmAngle={140} rightArmAngle={140}
      leftLegAngle={-25} rightLegAngle={25}/>,
  },
  {
    id: "wave",
    name: "Wave Emote",
    key: "/wave (chat)",
    category: "Emote",
    col: "#84cc16",
    desc: "Rechterarm beweegt heen en weer. Hoofd licht nikkend.",
    context: "Community interactie. Roblox social feature.",
    lua: "AnimationTrack:Play() -- Wave",
    figure: <StickFigure col="#84cc16" anim="idle" leftArmAngle={-10} rightArmAngle={120}
      leftLegAngle={3} rightLegAngle={-3}/>,
  },
];

const CATEGORIES = ["Alle", "Basis", "Interactie", "Mini-game", "Emote"];

const CATEGORY_COLS = {
  Basis: "#7ecf5a",
  Interactie: "#2a9acc",
  "Mini-game": "#c8941a",
  Emote: "#f472b6",
};

// ── FRAME SEQUENCES ──────────────────────────────────────────────────
const WALK_FRAMES = [
  { la: 60, ra: -60, ll: 40, rl: -40 },
  { la: 20, ra: -20, ll: 20, rl: -20 },
  { la: -40, ra: 40, ll: -30, rl: 30 },
  { la: 20, ra: -20, ll: 20, rl: -20 },
];

function FrameStrip({ move, frameCount = 4 }) {
  const frames = WALK_FRAMES;
  return (
    <div style={{ display: "flex", gap: 4, padding: "8px 0", alignItems: "center" }}>
      {frames.map((f, i) => (
        <div key={i} style={{ position: "relative" }}>
          <StickFigure col={move.col} size={50}
            leftArmAngle={f.la} rightArmAngle={f.ra}
            leftLegAngle={f.ll} rightLegAngle={f.rl}/>
          <div style={{ textAlign: "center", fontSize: 7, color: "#4a5568",
            fontFamily: "monospace" }}>F{i+1}</div>
          {i < frames.length-1 && (
            <div style={{ position: "absolute", right: -8, top: "50%",
              transform: "translateY(-50%)", color: "#1e3a2a", fontSize: 10 }}>›</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PlayerMoves() {
  const [filter, setFilter] = useState("Alle");
  const [selected, setSelected] = useState(MOVES[0]);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setFrame(f => (f+1) % 4), 300);
    return () => clearInterval(iv);
  }, []);

  const filtered = filter === "Alle" ? MOVES : MOVES.filter(m => m.category === filter);

  return (
    <div style={{ background: "#080c10", minHeight: "100vh",
      fontFamily: "'Exo 2', sans-serif", color: "#e8f0eb" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ background: "#0a1a14", borderBottom: "1px solid #1a2d20",
        padding: "12px 24px", display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9,
          color: "#1a9966", letterSpacing: 4 }}>// MOLGANG</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#f4f9f6", letterSpacing: -1 }}>
          Speler Moves & Animaties
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              style={{ padding: "4px 12px", borderRadius: 4,
                border: `1px solid ${filter===cat ? (CATEGORY_COLS[cat]||"#22c55e") : "#1a2d20"}`,
                background: filter===cat ? `${CATEGORY_COLS[cat]||"#22c55e"}22` : "transparent",
                color: filter===cat ? (CATEGORY_COLS[cat]||"#22c55e") : "#4a5568",
                cursor: "pointer", fontFamily: "inherit", fontSize: 10, letterSpacing: 1 }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>

        {/* MOVE GRID */}
        <div style={{ width: 320, background: "#0a1a14",
          borderRight: "1px solid #1a2d20", overflowY: "auto", padding: 16 }}>
          <div style={{ fontFamily: "monospace", fontSize: 8, color: "#1a9966",
            letterSpacing: 3, marginBottom: 12 }}>// {filtered.length} MOVES</div>
          {filtered.map(move => (
            <div key={move.id} onClick={() => setSelected(move)}
              style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6,
                background: selected?.id===move.id ? `${move.col}15` : "#060e08",
                border: `1px solid ${selected?.id===move.id ? move.col : "#1a2d20"}`,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                transition: "all 0.2s" }}>
              {/* Mini figure */}
              <div style={{ flexShrink: 0 }}>
                <StickFigure col={move.col} size={44} anim={move.id}
                  leftArmAngle={30} rightArmAngle={-30}
                  leftLegAngle={20} rightLegAngle={-20}/>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#e8f0eb", fontWeight: 700 }}>{move.name}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                  <span style={{ padding: "1px 6px", borderRadius: 10, fontSize: 8,
                    background: `${CATEGORY_COLS[move.category]||"#22c55e"}22`,
                    color: CATEGORY_COLS[move.category]||"#22c55e",
                    fontFamily: "monospace" }}>{move.category}</span>
                  <span style={{ padding: "1px 6px", borderRadius: 10, fontSize: 8,
                    background: "#1a2d20", color: "#4a5568",
                    fontFamily: "monospace" }}>{move.key}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* DETAIL VIEW */}
        {selected && (
          <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
            <div style={{ display: "flex", gap: 40, marginBottom: 40 }}>
              {/* Large animated figure */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 16 }}>
                <div style={{ width: 180, height: 180, background: "#0a1a14",
                  borderRadius: 12, border: `1px solid ${selected.col}33`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative" }}>
                  {/* Background glow */}
                  <div style={{ position: "absolute", width: 100, height: 100,
                    borderRadius: "50%", background: selected.col, opacity: 0.06 }}/>
                  {/* Grid lines */}
                  {[1,2,3].map(i => (
                    <div key={i} style={{ position: "absolute", left: 0, right: 0,
                      top: `${i*25}%`, borderTop: "1px solid #1a2d20" }}/>
                  ))}
                  {[1,2,3].map(i => (
                    <div key={i} style={{ position: "absolute", top: 0, bottom: 0,
                      left: `${i*25}%`, borderLeft: "1px solid #1a2d20" }}/>
                  ))}
                  <div style={{ position: "relative" }}>
                    <StickFigure col={selected.col} anim={selected.id} size={130}
                      leftArmAngle={40} rightArmAngle={-40}
                      leftLegAngle={25} rightLegAngle={-25}/>
                    {selected.effect}
                  </div>
                </div>
                {/* Category badge */}
                <div style={{ padding: "4px 16px", borderRadius: 20,
                  background: `${CATEGORY_COLS[selected.category]||"#22c55e"}22`,
                  border: `1px solid ${CATEGORY_COLS[selected.category]||"#22c55e"}`,
                  color: CATEGORY_COLS[selected.category]||"#22c55e",
                  fontFamily: "monospace", fontSize: 10, letterSpacing: 2 }}>
                  {selected.category.toUpperCase()}
                </div>
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: selected.col,
                  letterSpacing: 4, marginBottom: 6 }}>// MOVE DETAIL</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#f4f9f6",
                  letterSpacing: -1, marginBottom: 4 }}>{selected.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <div style={{ padding: "4px 12px", borderRadius: 6,
                    background: "#0a1a14", border: "1px solid #1a2d20",
                    fontFamily: "monospace", fontSize: 11, color: "#e8f0eb" }}>
                    ⌨ {selected.key}
                  </div>
                </div>

                <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.8, marginBottom: 24 }}>
                  {selected.desc}
                </div>

                <div style={{ background: "#0a1a14", borderRadius: 8,
                  border: "1px solid #1a2d20", padding: 16, marginBottom: 16 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: selected.col,
                    letterSpacing: 3, marginBottom: 8 }}>// GAME CONTEXT</div>
                  <div style={{ fontSize: 13, color: "#e8f0eb" }}>{selected.context}</div>
                </div>

                <div style={{ background: "#060a08", borderRadius: 8,
                  border: "1px solid #1a2d20", padding: 16, marginBottom: 16 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: "#1a9966",
                    letterSpacing: 3, marginBottom: 8 }}>// LUA IMPLEMENTATION</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: "#7ecf5a",
                    lineHeight: 1.6 }}>{selected.lua}</div>
                </div>
              </div>
            </div>

            {/* Frame strip */}
            <div style={{ background: "#0a1a14", borderRadius: 10,
              border: `1px solid ${selected.col}22`, padding: 24, marginBottom: 24 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: selected.col,
                letterSpacing: 3, marginBottom: 16 }}>// ANIMATIE FRAMES (4-FRAME CYCLE)</div>
              <div style={{ display: "flex", gap: 0, alignItems: "center",
                overflowX: "auto" }}>
                {WALK_FRAMES.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column",
                      alignItems: "center", padding: "0 12px" }}>
                      <div style={{ width: 80, height: 80,
                        background: frame===i ? `${selected.col}15` : "#060a08",
                        borderRadius: 8, border: `1px solid ${frame===i ? selected.col : "#1a2d20"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s" }}>
                        <StickFigure col={selected.col} size={70}
                          leftArmAngle={f.la} rightArmAngle={f.ra}
                          leftLegAngle={f.ll} rightLegAngle={f.rl}/>
                      </div>
                      <div style={{ marginTop: 6, fontFamily: "monospace", fontSize: 9,
                        color: frame===i ? selected.col : "#374151" }}>
                        Frame {i+1}
                      </div>
                      <div style={{ fontSize: 8, color: "#374151", fontFamily: "monospace" }}>
                        {["Neutral","Push","Swing","Pull"][i]}
                      </div>
                    </div>
                    {i < WALK_FRAMES.length-1 && (
                      <div style={{ color: "#1a2d20", fontSize: 20 }}>›</div>
                    )}
                  </div>
                ))}
                <div style={{ color: "#1a2d20", fontSize: 20, marginLeft: 4 }}>↻</div>
              </div>
            </div>

            {/* Animation data */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                ["FPS","30 fps","Roblox standard"],
                ["Duur","0.5s - 1.4s","Afhankelijk van move"],
                ["Type","Looped","Alle moves cyclic"],
                ["Blend","Linear","Smooth transitie"],
                ["Priority","Action","Override walk"],
                ["Network","Replicated","Alle clients zien het"],
              ].map(([k,v,note]) => (
                <div key={k} style={{ padding: 12, borderRadius: 6,
                  background: "#0a1a14", border: "1px solid #1a2d20" }}>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: "#1a9966",
                    letterSpacing: 2, marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 14, color: "#e8f0eb", fontWeight: 700 }}>{v}</div>
                  <div style={{ fontSize: 9, color: "#4a5568", marginTop: 3 }}>{note}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ALL MOVES QUICK VIEW strip */}
        <div style={{ width: 120, background: "#0a1a14",
          borderLeft: "1px solid #1a2d20", padding: 12, overflowY: "auto" }}>
          <div style={{ fontFamily: "monospace", fontSize: 7, color: "#1a9966",
            letterSpacing: 2, marginBottom: 12, textAlign: "center" }}>ALL</div>
          {MOVES.map(move => (
            <div key={move.id} onClick={() => setSelected(move)}
              style={{ marginBottom: 8, cursor: "pointer", padding: 4, borderRadius: 6,
                background: selected?.id===move.id ? `${move.col}15` : "transparent",
                border: `1px solid ${selected?.id===move.id ? move.col : "transparent"}`,
                display: "flex", flexDirection: "column", alignItems: "center" }}>
              <StickFigure col={move.col} size={50} anim={selected?.id===move.id ? move.id : "idle"}
                leftArmAngle={20} rightArmAngle={-20}
                leftLegAngle={10} rightLegAngle={-10}/>
              <div style={{ fontSize: 7, color: selected?.id===move.id ? move.col : "#374151",
                fontFamily: "monospace", textAlign: "center", lineHeight: 1.3,
                marginTop: 2 }}>{move.name.slice(0,12)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

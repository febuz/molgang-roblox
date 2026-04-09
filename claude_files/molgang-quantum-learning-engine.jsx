import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   MOLGANG — QUANTUM LEARNING ENGINE
   Level 1 → 999,999 · Gate Curriculum · CV Collection · Talent Marketplace
   "Every Element Has a Secret"  — Henricus Eduardus
═══════════════════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Inconsolata:wght@300;400;500;600&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}

:root{
  --void:#02030a;
  --deep:#060916;
  --surface:#0a1025;
  --raised:#0f1a35;
  --border:#1a2d55;
  --border2:#243d70;
  --cyan:#00e5ff;
  --cyan2:#00b8d4;
  --amber:#ffab00;
  --amber2:#ff8f00;
  --green:#00e676;
  --red:#ff5252;
  --violet:#b388ff;
  --text:#c8d8f0;
  --muted:#4a6090;
  --glow-cyan:0 0 20px rgba(0,229,255,.3);
  --glow-amber:0 0 20px rgba(255,171,0,.3);
}

body{
  background:var(--void);
  color:var(--text);
  font-family:'Inconsolata',monospace;
  font-size:13px;
  line-height:1.6;
  overflow-x:hidden;
}

/* Spacetime grid background */
body::before{
  content:'';
  position:fixed;inset:0;
  pointer-events:none;z-index:0;
  opacity:.06;
  background-image:
    linear-gradient(var(--cyan) 1px,transparent 1px),
    linear-gradient(90deg,var(--cyan) 1px,transparent 1px);
  background-size:60px 60px;
  transform:perspective(600px) rotateX(30deg) scale(2);
  transform-origin:50% 0;
}

/* Quantum particle ambient */
body::after{
  content:'';
  position:fixed;inset:0;
  pointer-events:none;z-index:0;
  background:
    radial-gradient(ellipse at 20% 50%,rgba(0,229,255,.04) 0%,transparent 50%),
    radial-gradient(ellipse at 80% 20%,rgba(255,171,0,.04) 0%,transparent 50%),
    radial-gradient(ellipse at 60% 80%,rgba(179,136,255,.04) 0%,transparent 50%);
}

::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes glow{0%,100%{text-shadow:0 0 8px var(--cyan)}50%{text-shadow:0 0 24px var(--cyan),0 0 48px rgba(0,229,255,.4)}}
@keyframes orbit{from{transform:rotate(0deg) translateX(28px) rotate(0deg)}to{transform:rotate(360deg) translateX(28px) rotate(-360deg)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,229,255,.4)}50%{box-shadow:0 0 0 8px transparent}}
@keyframes shimmer{0%{opacity:.4}50%{opacity:1}100%{opacity:.4}}

.fade-up{animation:fadeUp .4s ease both}
.glow{animation:glow 3s ease infinite}
.spin{animation:spin 8s linear infinite}
.shimmer{animation:shimmer 2s ease infinite}

/* ── TABS ── */
.tab{
  padding:9px 16px;background:transparent;border:none;
  border-bottom:2px solid transparent;cursor:pointer;
  font-family:'Orbitron',sans-serif;font-size:8px;letter-spacing:2px;
  text-transform:uppercase;color:var(--muted);
  transition:all .18s;white-space:nowrap;position:relative;z-index:1;
}
.tab:hover{color:var(--cyan2)}
.tab.on{color:var(--cyan);border-bottom-color:var(--cyan);text-shadow:0 0 8px var(--cyan)}

/* ── CARDS ── */
.card{
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:8px;overflow:hidden;position:relative;z-index:1;
}
.card::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--cyan)30,transparent);
}
.ch{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px}
.cb{padding:18px}

/* ── GATE CARD ── */
.gate-card{
  background:var(--deep);border:1px solid var(--border);border-radius:8px;
  padding:14px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;z-index:1;
}
.gate-card:hover{border-color:var(--cyan2);transform:translateY(-2px);box-shadow:var(--glow-cyan)}
.gate-card.active{border-color:var(--cyan);box-shadow:var(--glow-cyan)}
.gate-card::before{
  content:'';position:absolute;inset:0;
  background:linear-gradient(135deg,var(--cyan)0%,transparent 60%);
  opacity:0;transition:opacity .2s;
}
.gate-card:hover::before{opacity:.04}

.gate-symbol{
  font-family:'Orbitron',sans-serif;font-size:24px;font-weight:900;
  line-height:1;margin-bottom:6px;
}

/* ── EPOCH CARD ── */
.epoch{
  border-left:3px solid;border-radius:0 8px 8px 0;
  background:var(--surface);margin-bottom:10px;overflow:hidden;position:relative;z-index:1;
}
.epoch::after{
  content:attr(data-n);
  position:absolute;right:12px;top:50%;transform:translateY(-50%);
  font-family:'Orbitron',sans-serif;font-size:48px;font-weight:900;
  opacity:.05;color:currentColor;pointer-events:none;
}

/* ── MATRIX DISPLAY ── */
.matrix{
  font-family:'Inconsolata',monospace;font-size:11px;
  background:#020510;border:1px solid var(--border);border-radius:6px;
  padding:10px 14px;color:var(--cyan);line-height:1.8;
  white-space:pre;display:inline-block;
}

/* ── PROGRESS BAR ── */
.pbar{height:3px;background:var(--border);border-radius:2px;overflow:hidden}
.pfill{height:100%;border-radius:2px;transition:width .6s ease}

/* ── TABLE ── */
table.t{width:100%;border-collapse:collapse}
table.t th{
  font-family:'Orbitron',sans-serif;font-size:7px;letter-spacing:2px;
  color:var(--muted);padding:8px 12px;text-align:left;
  border-bottom:1px solid var(--border);background:var(--void);text-transform:uppercase;
}
table.t td{
  padding:8px 12px;font-size:11px;border-bottom:1px solid var(--border);color:var(--muted);
}
table.t tr:last-child td{border-bottom:none}
table.t tr:hover td{background:rgba(0,229,255,.03)}
table.t td:first-child{color:var(--text)}

/* ── CIRCUIT VIZ ── */
.circuit-line{
  display:flex;align-items:center;gap:0;margin-bottom:16px;
}
.wire{height:2px;background:var(--border2);flex:1;min-width:20px}
.gate-box{
  width:36px;height:36px;border-radius:4px;border:1.5px solid;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  font-family:'Orbitron',sans-serif;font-size:10px;font-weight:700;
  cursor:default;transition:all .2s;
}
.gate-box:hover{transform:scale(1.1)}
.ctrl-dot{
  width:10px;height:10px;border-radius:50%;flex-shrink:0;margin:0 4px;
}
.ctrl-line{width:2px;background:var(--border2);position:absolute}

/* ── BLOCH SPHERE SVG ── */
.bloch-svg{filter:drop-shadow(0 0 6px rgba(0,229,255,.3))}

/* ── CV FORM ── */
.field{margin-bottom:14px}
.field label{
  font-family:'Orbitron',sans-serif;font-size:8px;letter-spacing:2px;
  text-transform:uppercase;color:var(--muted);display:block;margin-bottom:5px;
}
.field input,.field select,.field textarea{
  background:var(--deep);border:1px solid var(--border2);border-radius:6px;
  color:var(--text);font-family:'Inconsolata',monospace;font-size:12px;
  padding:9px 12px;width:100%;outline:none;transition:border-color .2s;
}
.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--cyan)}
.field input::placeholder{color:var(--muted)}

/* ── BTN ── */
.btn{
  display:inline-flex;align-items:center;gap:8px;padding:10px 20px;
  border-radius:6px;font-family:'Orbitron',sans-serif;font-size:9px;
  letter-spacing:2px;text-transform:uppercase;cursor:pointer;border:none;
  transition:all .2s;
}
.btn-cyan{background:var(--cyan2);color:#000;font-weight:700}
.btn-cyan:hover{background:var(--cyan);box-shadow:var(--glow-cyan);transform:translateY(-1px)}
.btn-outline{background:transparent;color:var(--cyan);border:1px solid var(--border2)}
.btn-outline:hover{border-color:var(--cyan)}

/* ── SKILL BADGE ── */
.skill-badge{
  padding:3px 10px;border-radius:12px;font-family:'Orbitron',sans-serif;
  font-size:8px;letter-spacing:1px;display:inline-block;margin:2px;border:1px solid;
}

/* ── RESPONSIVE ── */
@media(max-width:680px){
  .ch,.cb{padding:12px}
  body::before{opacity:.03}
}
`;

/* ═══════════════════════════════════════════════════
   QUANTUM CURRICULUM DATA
═══════════════════════════════════════════════════ */

const EPOCHS = [
  {
    n:"I", range:"1–999", title:"Quantum Foundations", col:"#00e5ff",
    subtitle:"Wat is een qubit? Superpositie, meting, kansrekening",
    gates:["H","X","Y","Z"],
    topics:["Qubit als spin ↑↓","Bloch sphere oriëntatie","Superpositie als spelkans","Meting & collapse","Born rule kansen","Pauligate rotaties","Hadamard-weg","Quantum vs klassiek"],
    cv_unlock:"Quantum Foundations Certificate (Level 999)",
    real_world:"D-Wave qubit-topologie, IBM Qiskit intro",
    puzzle:"Draai de Bloch-bol naar de juiste pool om de deur te openen",
  },
  {
    n:"II", range:"1.000–9.999", title:"Quantum Gates & Circuits", col:"#ffab00",
    subtitle:"Single- en multi-qubit gates, circuittekenen",
    gates:["S","T","CNOT","CZ","SWAP","Toffoli"],
    topics:["Phase gates S en T","Entanglement via CNOT","Bell states","Superposition via H+CNOT","Circuit diagrammen lezen","Quantum teleportatie basis","No-cloning theorem","Gate matrices 2×2 en 4×4"],
    cv_unlock:"Quantum Circuit Designer (Level 9.999)",
    real_world:"IBM Quantum Circuit Composer, Quirk editor",
    puzzle:"Bouw een Bell-pair circuit om twee qubits te verstrengelen",
  },
  {
    n:"III", range:"10.000–49.999", title:"Quantum Algorithms", col:"#00e676",
    subtitle:"Grover, Deutsch-Jozsa, Bernstein-Vazirani",
    gates:["Oracle","Diffuser","QFT","Phase Estimation"],
    topics:["Grover zoekalgoritme √N","Deutsch-Jozsa orakel","BV algoritme","Fourier transform kwantum","Amplitude amplificatie","Quantum parallelisme","Black-box orakels","Orkestratie van gates"],
    cv_unlock:"Quantum Algorithm Engineer (Level 49.999)",
    real_world:"Grover search op D-Wave Leap, IBM Qiskit algorithms",
    puzzle:"Vind het geheime getal in O(√N) stappen via Grover",
  },
  {
    n:"IV", range:"50.000–199.999", title:"Quantum Error Correction", col:"#b388ff",
    subtitle:"Surface codes, stabilisatoren, fout-detectie als puzzel",
    gates:["Stabilizer","Ancilla","Syndrome","Logical X/Z"],
    topics:["Bit-flip en phase-flip codes","Shor 9-qubit code","Surface code raster","Stabiliser formalism","Syndrome meting","Threshold theorem","Fault-tolerante gates","Magic state distillatie"],
    cv_unlock:"Quantum Error Correction Specialist (Level 199.999)",
    real_world:"Google Willow surface code, QuTech TU Delft research",
    puzzle:"Herstel 3 simultane fouten op een 5×5 surface code grid",
  },
  {
    n:"V", range:"200.000–499.999", title:"Topological Quantum Computing", col:"#ff5252",
    subtitle:"Anyons, braiding, niet-abeliaanse statistieken",
    gates:["Braid","Fusion","Anyon","Non-Abelian"],
    topics:["Fibonacci anyons","Majorana fermionen","Braiding als gate","Topologische bescherming","FQHE fundamenten","Abeliaanse vs niet-abeliaanse","Microsoft topologische QC","Jones polynoom verbinding"],
    cv_unlock:"Topological QC Researcher (Level 499.999)",
    real_world:"Microsoft Topological Qubit, MDPI Quantum Matter",
    puzzle:"Vlecht anyons in de juiste volgorde voor een universele gate",
  },
  {
    n:"VI", range:"500.000–799.999", title:"Quantum Simulation & Chemistry", col:"#ffab00",
    subtitle:"VQE, moleculaire Hamiltonians, materiaalontwerp",
    gates:["VQE","QAOA","Variational","Ansatz"],
    topics:["Variational Quantum Eigensolver","QAOA optimalisatie","Molecular Hamiltonian","Jordan-Wigner mapping","Qubit Hamiltonians","Energieminimalisatie","Quantum advantage domain","Drug discovery QC"],
    cv_unlock:"Quantum Chemistry Simulator (Level 799.999)",
    real_world:"SmartSlag³ vanadium-qubit materiaalontwerp, D-Wave chemistry",
    puzzle:"Vind de grondtoestand energie van H₂ met VQE",
  },
  {
    n:"VII", range:"800.000–999.999", title:"Quantum Computing Expertise", col:"#00e5ff",
    subtitle:"NISQ, fault-tolerant, kwantum cryptografie, megaquop",
    gates:["Shor","Megaquop","LDPC","Full Stack"],
    topics:["Shor algoritme factorizatie","Quantum key distribution","Post-quantum cryptografie","NISQ-era beperkingen","Megaquop (1M ops/sec) doel","Quantum advantage bewijzen","Full-stack QC architect","Quantum-klassiek hybride"],
    cv_unlock:"Quantum Computing Architect — Master Certification (Level 999.999)",
    real_world:"John Preskill megaquop challenge, MiCA quantum crypto",
    puzzle:"Implementeer Shor's algoritme voor RSA-breking simulatie",
  },
];

const GATES = [
  {sym:"H",name:"Hadamard",col:"#00e5ff",matrix:"1/√2 [1  1]\n       [1 -1]",effect:"|0⟩→|+⟩, |1⟩→|−⟩",desc:"Superpositie: draait de qubit naar de equator van de Bloch-bol",epoch:"I",rarity:"common",
   bloch:"Rotatie 180° om X+Z as",game:"Deuren openen door superpositie te creeën"},
  {sym:"X",name:"Pauli-X",col:"#00e5ff",matrix:"[0 1]\n[1 0]",effect:"|0⟩→|1⟩, |1⟩→|0⟩",desc:"Kwantum NOT gate: flipt de qubit van 0 naar 1",epoch:"I",rarity:"common",
   bloch:"Rotatie 180° om X-as",game:"Slot-flipper, schakelaar aan/uit"},
  {sym:"Y",name:"Pauli-Y",col:"#00e5ff",matrix:"[ 0 -i]\n[ i  0]",effect:"|0⟩→i|1⟩, |1⟩→-i|0⟩",desc:"Flipt EN voegt een fase toe via imaginair getal",epoch:"I",rarity:"common",
   bloch:"Rotatie 180° om Y-as",game:"Portaal met faserotatie"},
  {sym:"Z",name:"Pauli-Z",col:"#00e5ff",matrix:"[1  0]\n[0 -1]",effect:"|0⟩→|0⟩, |1⟩→-|1⟩",desc:"Phase-flip: verandert het teken van |1⟩ onzichtbaar",epoch:"I",rarity:"common",
   bloch:"Rotatie 180° om Z-as",game:"Onzichtbare spiegel — fase-marker"},
  {sym:"S",name:"Phase-S",col:"#ffab00",matrix:"[1 0]\n[0 i]",effect:"|0⟩→|0⟩, |1⟩→i|1⟩",desc:"Kwart-rotatie van fase (S² = Z)",epoch:"II",rarity:"uncommon",
   bloch:"Rotatie 90° om Z-as",game:"Dial-puzzel: kwart-draai voor timing"},
  {sym:"T",name:"T-gate",col:"#ffab00",matrix:"[1    0  ]\n[0  e^iπ/4]",effect:"|1⟩→e^(iπ/4)|1⟩",desc:"Achtste-rotatie — fundamenteel voor universele kwantum-computing",epoch:"II",rarity:"uncommon",
   bloch:"Rotatie 45° om Z-as",game:"Sleutelsteen voor universeel circuit — zeldzaam"},
  {sym:"CNOT",name:"Controlled-NOT",col:"#00e676",matrix:"[1 0 0 0]\n[0 1 0 0]\n[0 0 0 1]\n[0 0 1 0]",effect:"Control=|1⟩: flipt target",desc:"Twee-qubit entanglement gate: maakt Bell-paren",epoch:"II",rarity:"uncommon",
   bloch:"Verstrengelt twee qubits",game:"Simon Says — target reageert op control"},
  {sym:"CZ",name:"Controlled-Z",col:"#00e676",matrix:"[1 0 0  0]\n[0 1 0  0]\n[0 0 1  0]\n[0 0 0 -1]",effect:"Flipt fase van |11⟩",desc:"Phase-entanglement: beide qubits in |1⟩ krijgen -1 fase",epoch:"II",rarity:"rare",
   bloch:"Verstrengeling via fase",game:"Dubbele sleutel — beide moeten actief zijn"},
  {sym:"SWAP",name:"SWAP",col:"#00e676",matrix:"[1 0 0 0]\n[0 0 1 0]\n[0 1 0 0]\n[0 0 0 1]",effect:"Verwisselt twee qubits",desc:"Wisselt de quantum states van twee qubits",epoch:"II",rarity:"rare",
   bloch:"Positiewisseling twee qubits",game:"Teleporter — wisselt spelerinventaris"},
  {sym:"TOF",name:"Toffoli (CCNOT)",col:"#b388ff",matrix:"8×8 unitary\nCC-NOT matrix",effect:"2 controls=|11⟩: flipt target",desc:"Universeel klassiek+kwantum: reversibele AND gate",epoch:"III",rarity:"epic",
   bloch:"Drie-qubit universele gate",game:"Dubbele slotmechanisme — twee sleutels + actie"},
  {sym:"QFT",name:"Quantum Fourier Transform",col:"#b388ff",matrix:"DFT unitary\n2^n × 2^n",effect:"Fase-codering van frequentie",desc:"Kwantum fase-schatting kern — gebruikt in Shor en QPE",epoch:"III",rarity:"epic",
   bloch:"Fase-ruimte transformatie",game:"Frequentiedetector voor quantumgolven"},
  {sym:"BRAID",name:"Anyon Braid",col:"#ff5252",matrix:"Topologische\nmatrix (non-abelian)",effect:"Niet-abeliaanse statistieken",desc:"Anyons omcirkelen elkaar = quantumcomputation via topologie",epoch:"V",rarity:"legendary",
   bloch:"Topologisch beschermd",game:"Vlecht deeltjes in ruimtetijd — eindbaas gate"},
];

const CV_FIELDS = [
  {id:"real_name",label:"Naam (optioneel — voor certificaat)",type:"text",placeholder:"Jan de Vries"},
  {id:"email",label:"E-mail (voor badge-uitreiking)",type:"email",placeholder:"jan@example.com"},
  {id:"age_range",label:"Leeftijdscategorie",type:"select",options:["13-17","18-24","25-34","35-44","45+"]},
  {id:"education",label:"Hoogst genoten opleiding",type:"select",options:["Middelbaar","MBO","HBO","WO Bachelor","WO Master","PhD","Zelfstudie"]},
  {id:"country",label:"Land van verblijf",type:"text",placeholder:"Nederland"},
  {id:"physics_bg",label:"Achtergrond in scheikunde / natuur",type:"select",options:["Geen","Schoolniveau","HBO","WO","Research niveau"]},
  {id:"programming",label:"Programmeerervaring",type:"select",options:["Geen","Beginner (Python/Scratch)","Gemiddeld (JS/Python)","Gevorderd (C++/Rust)","Expert"]},
  {id:"qc_tools",label:"Kwantum-tools ervaring (vink aan)",type:"text",placeholder:"Qiskit, D-Wave Ocean, Cirq, PennyLane, QuTiP..."},
  {id:"motivation",label:"Waarom wil je kwantum leren?",type:"textarea",placeholder:"Ik wil werken aan..."},
  {id:"available_hours",label:"Beschikbare uren per week",type:"select",options:["1-5","5-10","10-20","20-40","40+"]},
  {id:"linkedin",label:"LinkedIn URL (voor endorsements)",type:"text",placeholder:"linkedin.com/in/..."},
  {id:"consent_recruitment",label:"Akkoord — EHMAC B.V. mag profiel delen voor kwantumfuncties",type:"checkbox"},
];

const JOBS = [
  {title:"Quantum Software Engineer",skills:["Qiskit","Python","NISQ"],salary:"€90-130K",urgent:true,via:"Slag B.V. (DUBV)",col:"#00e5ff"},
  {title:"QEC Specialist",skills:["Surface Codes","Error Correction","Fault Tolerance"],salary:"€100-150K",urgent:true,via:"Slag B.V. (DUBV)",col:"#00e676"},
  {title:"Quantum Materials Researcher",skills:["V-qubit","4H-SiC","Spectroscopy"],salary:"€70-100K",urgent:false,via:"Slakkenspoor VOF",col:"#ffab00"},
  {title:"Photonic Network Engineer",skills:["Nu Quantum QNU","CERN White Rabbit","Entanglement"],salary:"€95-140K",urgent:true,via:"Slag B.V. (DUBV)",col:"#b388ff"},
  {title:"Topological QC Researcher",skills:["Anyons","Braiding","Majorana"],salary:"€80-120K",urgent:false,via:"EHMAC B.V.",col:"#ff5252"},
  {title:"Quantum Algorithm Developer",skills:["Grover","Shor","VQE","QAOA"],salary:"€85-125K",urgent:true,via:"Slag B.V. (DUBV)",col:"#00e5ff"},
  {title:"D-Wave Optimization Engineer",skills:["Ocean SDK","QUBO","Hybrid Solver"],salary:"€80-115K",urgent:false,via:"EHMAC B.V.",col:"#ffab00"},
  {title:"Quantum Cryptography Specialist",skills:["QKD","Post-Quantum","BB84"],salary:"€95-135K",urgent:true,via:"Slag B.V. (DUBV)",col:"#b388ff"},
];

/* ═══════════════════════════════════
   SUBCOMPONENTS
═══════════════════════════════════ */

function BlochSphere({theta=45, phi=0}) {
  const t = theta * Math.PI / 180;
  const p = phi * Math.PI / 180;
  const bx = Math.sin(t)*Math.cos(p)*40;
  const by = -Math.cos(t)*40;
  const bz = Math.sin(t)*Math.sin(p)*40;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="bloch-svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%">
          <stop offset="0%" stopColor="#0a1a3a"/>
          <stop offset="100%" stopColor="#020510"/>
        </radialGradient>
      </defs>
      {/* Sphere */}
      <circle cx="60" cy="60" r="45" fill="url(#bg)" stroke="#1a3060" strokeWidth="1"/>
      {/* Equator ellipse */}
      <ellipse cx="60" cy="60" rx="45" ry="14" fill="none" stroke="#1a3060" strokeWidth="1" strokeDasharray="3,3"/>
      {/* Axes */}
      <line x1="60" y1="15" x2="60" y2="105" stroke="#243d70" strokeWidth="1"/>
      <line x1="15" y1="60" x2="105" y2="60" stroke="#243d70" strokeWidth="1"/>
      {/* Axis labels */}
      <text x="62" y="12" fill="#4a6090" fontSize="9" fontFamily="Orbitron">|0⟩</text>
      <text x="62" y="112" fill="#4a6090" fontSize="9" fontFamily="Orbitron">|1⟩</text>
      <text x="107" y="63" fill="#4a6090" fontSize="8" fontFamily="Orbitron">X</text>
      <text x="62" y="63" fill="#4a6090" fontSize="8" fontFamily="Orbitron">Y</text>
      {/* State vector */}
      <line x1="60" y1="60" x2={60+bx} y2={60+by} stroke="#00e5ff" strokeWidth="2.5"
        strokeLinecap="round" style={{filter:"drop-shadow(0 0 4px #00e5ff)"}}/>
      {/* Arrow tip */}
      <circle cx={60+bx} cy={60+by} r="4" fill="#00e5ff"
        style={{filter:"drop-shadow(0 0 6px #00e5ff)"}}/>
      {/* |ψ⟩ label */}
      <text x={60+bx+5} y={60+by+4} fill="#00e5ff" fontSize="10" fontFamily="Orbitron">|ψ⟩</text>
    </svg>
  );
}

function QuantumCircuit({gateNames=["H","CNOT","X"]}) {
  const colors = {H:"#00e5ff",X:"#00e5ff",Y:"#00e5ff",Z:"#00e5ff",S:"#ffab00",T:"#ffab00",CNOT:"#00e676",CZ:"#00e676",TOF:"#b388ff",QFT:"#b388ff",BRAID:"#ff5252"};
  const qubitCount = gateNames.includes("CNOT")||gateNames.includes("CZ") ? 2 : 1;
  return (
    <div style={{padding:"12px 0"}}>
      {Array.from({length:qubitCount},(_,qi)=>(
        <div key={qi} style={{display:"flex",alignItems:"center",marginBottom:8}}>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"var(--muted)",width:36}}>q[{qi}]</div>
          <div style={{height:2,background:"var(--border2)",width:20}}/>
          {gateNames.map((g,gi) => {
            const col = colors[g] || "#4a6090";
            if (g==="CNOT" && qi===0) return (
              <div key={gi} style={{display:"flex",alignItems:"center"}}>
                <div style={{width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:col,boxShadow:`0 0 8px ${col}`}}/>
                </div>
                <div style={{height:2,background:"var(--border2)",width:10}}/>
              </div>
            );
            if (g==="CNOT" && qi===1) return (
              <div key={gi} style={{display:"flex",alignItems:"center"}}>
                <div className="gate-box" style={{borderColor:col,color:col}}>⊕</div>
                <div style={{height:2,background:"var(--border2)",width:10}}/>
              </div>
            );
            if (qi>0 && !["CNOT","CZ"].includes(g)) return (
              <div key={gi} style={{display:"flex",alignItems:"center"}}>
                <div style={{width:36,height:2,background:"var(--border2)"}}/>
                <div style={{height:2,background:"var(--border2)",width:10}}/>
              </div>
            );
            return (
              <div key={gi} style={{display:"flex",alignItems:"center"}}>
                <div className="gate-box" style={{borderColor:col,color:col}}>{g}</div>
                <div style={{height:2,background:"var(--border2)",width:10}}/>
              </div>
            );
          })}
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"var(--muted)"}}>▶</div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════
   MAIN APP
═══════════════════════════════════ */

export default function App() {
  const [tab, setTab] = useState(0);
  const [selGate, setSelGate] = useState(null);
  const [selEpoch, setSelEpoch] = useState(null);
  const [bloch, setBloch] = useState({theta:45,phi:0});
  const [cv, setCv] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [filterEpoch, setFilterEpoch] = useState("all");

  const TABS = ["🗺 CURRICULUM","⚛ GATES","🔬 PUZZELS","👤 CV PROFIEL","🏢 TALENT MARKT","📊 STATISTIEKEN"];

  const Chip = ({c,children}) => (
    <span className="skill-badge" style={{color:c,borderColor:c+"55",background:c+"10"}}>{children}</span>
  );

  const rarityColor = r => ({common:"#4a6090",uncommon:"#00e676",rare:"#ffab00",epic:"#b388ff",legendary:"#ff5252"}[r]||"#4a6090");

  return (
    <div style={{background:"var(--void)",minHeight:"100vh",position:"relative"}}>
      <style>{CSS}</style>

      {/* TICKER */}
      <div style={{background:"var(--deep)",borderBottom:"1px solid var(--border)",padding:"3px 0",overflow:"hidden",position:"relative",zIndex:2}}>
        <div style={{display:"flex",animation:"ticker 40s linear infinite",whiteSpace:"nowrap"}}>
          {["LEVEL 1 → 999.999","QUANTUM LEERSCHOOL","TALENT CLASSIFICATIE","GATE CURRICULUM",
            "CV COLLECTIE","SLAG B.V. DETACHERING","EHMAC B.V.","MOLGANG UNIVERSE",
            "LEVEL 1 → 999.999","QUANTUM LEERSCHOOL","TALENT CLASSIFICATIE","GATE CURRICULUM",
          ].map((t,i)=>(
            <span key={i} style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,color:"var(--muted)",
              padding:"0 24px",letterSpacing:3}}>◈ {t}</span>
          ))}
        </div>
      </div>

      {/* HEADER */}
      <div style={{background:"var(--deep)",borderBottom:"1px solid var(--border)",padding:"0 24px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:16,paddingTop:12,paddingBottom:6}}>
          <div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,fontSize:18,
              color:"var(--cyan)",letterSpacing:2,lineHeight:1,filter:"drop-shadow(0 0 12px rgba(0,229,255,.4))"}}>
              MOLGANG
            </div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,letterSpacing:3,
              color:"var(--muted)",textTransform:"uppercase",marginTop:2}}>
              // Quantum Learning Engine · Level 1 → 999.999 · Talent Pipeline
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,flexWrap:"wrap"}}>
            {[["999.999 Levels","#00e5ff"],["12 Gates","#ffab00"],["7 Epochen","#00e676"],
              ["CV → Slag B.V.","#b388ff"]].map(([l,c])=>(
              <Chip key={l} c={c}>{l}</Chip>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:0,borderBottom:"1px solid var(--border)",overflowX:"auto"}}>
          {TABS.map((t,i)=>(
            <button key={t} className={`tab${tab===i?" on":""}`} onClick={()=>setTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{height:"calc(100vh - 114px)",overflowY:"auto",position:"relative",zIndex:1}}>
      <div style={{padding:"24px 24px 64px",maxWidth:960,margin:"0 auto"}}>

      {/* ══════ TAB 0: CURRICULUM ══════ */}
      {tab===0 && (
        <div className="fade-up">
          <div style={{display:"flex",alignItems:"flex-end",gap:20,marginBottom:24}}>
            <div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,
                fontSize:"clamp(22px,4vw,48px)",color:"var(--cyan)",lineHeight:.85,
                filter:"drop-shadow(0 0 16px rgba(0,229,255,.3))"}}>
                LEVEL 1<br/>
                <span style={{color:"var(--amber)"}}>→</span>
                <span style={{color:"var(--text)"}}> 999.999</span>
              </div>
              <div style={{fontFamily:"'Libre Baskerville',serif",fontStyle:"italic",
                fontSize:14,color:"var(--muted)",marginTop:8}}>
                Van qubit tot kwantum architect — een volledige leerschool.
              </div>
            </div>
            <div style={{marginLeft:"auto",textAlign:"right"}}>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"var(--muted)"}}>Totale levels</div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,fontSize:28,color:"var(--amber)"}}>999.999</div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)"}}>7 Epochen · 12+ Gates</div>
            </div>
          </div>

          {/* EPOCH CARDS */}
          {EPOCHS.map((ep,i)=>(
            <div key={ep.n} className="epoch" data-n={ep.n}
              style={{borderLeftColor:ep.col,cursor:"pointer",
                background:selEpoch===i?"var(--raised)":"var(--surface)"}}
              onClick={()=>setSelEpoch(selEpoch===i?null:i)}>
              <div style={{padding:"14px 18px",display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{flexShrink:0}}>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,fontSize:28,
                    color:ep.col,lineHeight:1,filter:`drop-shadow(0 0 8px ${ep.col}66)`}}>
                    {ep.n}
                  </div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)",marginTop:2}}>
                    {ep.range}
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,fontSize:14,color:ep.col}}>
                      {ep.title}
                    </div>
                    <div style={{fontFamily:"'Libre Baskerville',serif",fontStyle:"italic",
                      fontSize:12,color:"var(--muted)"}}>{ep.subtitle}</div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                    {ep.gates.map(g=>(
                      <span key={g} style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,
                        color:ep.col,padding:"2px 8px",borderRadius:4,
                        border:`1px solid ${ep.col}44`,background:`${ep.col}10`}}>{g}</span>
                    ))}
                  </div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,
                    color:"var(--amber)",letterSpacing:1}}>
                    🏆 {ep.cv_unlock}
                  </div>
                </div>
                <div style={{flexShrink:0,fontFamily:"'Orbitron',sans-serif",
                  fontSize:12,color:ep.col,opacity:.5}}>
                  {selEpoch===i?"▲":"▼"}
                </div>
              </div>

              {/* EXPANDED */}
              {selEpoch===i && (
                <div style={{padding:"0 18px 18px",borderTop:`1px solid ${ep.col}22`}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:14}}>
                    <div className="card-inner" style={{background:"var(--deep)",borderRadius:8,padding:14,
                      border:`1px solid ${ep.col}22`}}>
                      <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:ep.col,
                        letterSpacing:2,marginBottom:10}}>// LEERINHOUD</div>
                      {ep.topics.map((t,ti)=>(
                        <div key={ti} style={{display:"flex",gap:8,marginBottom:5}}>
                          <span style={{color:ep.col,flexShrink:0}}>›</span>
                          <div style={{fontSize:11,color:"var(--muted)"}}>{t}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{background:"var(--deep)",borderRadius:8,padding:14,
                        border:`1px solid ${ep.col}22`}}>
                        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:ep.col,
                          letterSpacing:2,marginBottom:8}}>// PUZZEL TYPE</div>
                        <div style={{fontSize:12,color:"var(--text)",lineHeight:1.6}}>{ep.puzzle}</div>
                      </div>
                      <div style={{background:"var(--deep)",borderRadius:8,padding:14,
                        border:`1px solid ${ep.col}22`}}>
                        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--amber)",
                          letterSpacing:2,marginBottom:8}}>// REAL-WORLD LINK</div>
                        <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>{ep.real_world}</div>
                      </div>
                    </div>
                  </div>
                  <QuantumCircuit gateNames={ep.gates.slice(0,4)}/>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════ TAB 1: GATES ══════ */}
      {tab===1 && (
        <div className="fade-up">
          <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,
            fontSize:"clamp(20px,4vw,44px)",color:"var(--amber)",lineHeight:.88,
            marginBottom:6}}>QUANTUM GATES.</div>
          <div style={{fontFamily:"'Libre Baskerville',serif",fontStyle:"italic",
            fontSize:14,color:"var(--muted)",marginBottom:20}}>
            Van Hadamard tot Anyon Braid — elke gate is een spelelement.
          </div>

          {/* Filter */}
          <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
            {["all","I","II","III","V"].map(f=>(
              <button key={f}
                onClick={()=>setFilterEpoch(f)}
                style={{padding:"4px 12px",background:filterEpoch===f?"var(--amber)10":"transparent",
                  border:`1px solid ${filterEpoch===f?"var(--amber)":"var(--border)"}`,
                  color:filterEpoch===f?"var(--amber)":"var(--muted)",borderRadius:4,cursor:"pointer",
                  fontFamily:"'Orbitron',sans-serif",fontSize:8,letterSpacing:1}}>
                {f==="all"?"ALLE EPOCHEN":`EPOCHE ${f}`}
              </button>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:20}}>
            {GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch).map((gate,i)=>(
              <div key={gate.sym} className={`gate-card${selGate===i?" active":""}`}
                onClick={()=>setSelGate(selGate===i?null:i)}>
                <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                  <div className="gate-symbol" style={{color:gate.col,
                    filter:`drop-shadow(0 0 6px ${gate.col}66)`}}>
                    {gate.sym}
                  </div>
                  <div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,color:gate.col}}>{gate.name}</div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,
                      color:rarityColor(gate.rarity),marginTop:2,letterSpacing:1}}>
                      ◆ {gate.rarity.toUpperCase()}
                    </div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,
                      color:"var(--muted)",marginTop:2}}>Epoche {gate.epoch}</div>
                  </div>
                </div>
                <div style={{fontSize:11,color:"var(--muted)",marginTop:8,lineHeight:1.5}}>
                  {gate.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Selected gate detail */}
          {selGate !== null && GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate] && (
            <div className="card" style={{border:`1px solid ${GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].col}55`}}>
              <div className="ch">
                <div className="gate-symbol" style={{
                  color:GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].col,
                  fontSize:32,filter:`drop-shadow(0 0 12px ${GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].col}88)`}}>
                  {GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].sym}
                </div>
                <div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,fontSize:16,
                    color:GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].col}}>
                    {GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].name}
                  </div>
                  <div style={{fontSize:12,color:"var(--muted)"}}>
                    {GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].effect}
                  </div>
                </div>
              </div>
              <div className="cb">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
                  <div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)",
                      letterSpacing:2,marginBottom:8}}>// MATRIX</div>
                    <div className="matrix">{GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].matrix}</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)",
                      letterSpacing:2,marginBottom:8}}>// BLOCH SPHERE</div>
                    <BlochSphere theta={["H","S","T"].includes(GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].sym)?90:45}
                      phi={["Z","S","T"].includes(GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].sym)?90:0}/>
                    <div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>
                      {GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].bloch}
                    </div>
                  </div>
                  <div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)",
                      letterSpacing:2,marginBottom:8}}>// SPELELEMENT</div>
                    <div style={{background:"var(--deep)",borderRadius:6,padding:12,
                      border:`1px solid ${GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].col}33`}}>
                      <div style={{fontSize:12,color:"var(--text)",lineHeight:1.6}}>
                        {GATES.filter(g=>filterEpoch==="all"||g.epoch===filterEpoch)[selGate].game}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ TAB 2: PUZZELS ══════ */}
      {tab===2 && (
        <div className="fade-up">
          <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,
            fontSize:"clamp(20px,4vw,44px)",color:"var(--green)",lineHeight:.88,marginBottom:16}}>
            QUANTUM PUZZELS.<br/>
            <span style={{color:"var(--text)",fontSize:"0.55em"}}>PER LEVEL INGEBOUWD.</span>
          </div>

          {/* Puzzle types */}
          {[
            {n:"01–999",col:"#00e5ff",type:"Bloch Sphere Navigator",
             desc:"Speler roteert een 3D-bol om de juiste kwantumtoestand te bereiken. Gate-knoppen draaien de bol. Elke level geeft een doeltoestand die bereikt moet worden.",
             mechanic:"Visueel: 3D Bloch sphere met pijl. Input: gate-knoppen H/X/Y/Z. Doel: pijl op doelpositie.",
             roblox:"Part met CFrame rotatie animatie. Geluid bij correcte toestand.",
             example:"Level 47: start in |0⟩, bereik |+⟩ in max 2 gates → antwoord: H"},
            {n:"1.000–9.999",col:"#ffab00",type:"Circuit Builder",
             desc:"Speler sleept quantum gates op een circuit van 2-4 qubits. Doel is een specifieke outputtoestand (bijv. Bell state). Resultaat wordt als kansen weergegeven.",
             mechanic:"Drag-and-drop gates op wirelanes. Live amplitude-weergave. Evaluate-knop vergelijkt met doeltoestand.",
             roblox:"GUI ScreenGui met draggable frames. Transparante overlays tonen kansen.",
             example:"Level 2.847: start |00⟩, maak Bell-state |Φ+⟩ → antwoord: H op q[0], CNOT(0→1)"},
            {n:"10.000–49.999",col:"#00e676",type:"Algorithm Puzzle",
             desc:"Speler implementeert een bekend algoritme stap voor stap. Grover zoekt een gemarkeerd element. Deutsch-Jozsa bepaalt of een functie constant of gebalanceerd is.",
             mechanic:"Meerdere rondes. Elke ronde voegt een stap toe aan het algoritme. Scores op juistheid EN efficiëntie (min gates).",
             roblox:"Multi-round puzzel met scoreboard. Animated state evolution tussen rondes.",
             example:"Level 15.420: zoek element in database van 16 → Grover in ⌈π/4·√16⌉=3 iteraties"},
            {n:"50.000–199.999",col:"#b388ff",type:"Surface Code Defender",
             desc:"Speler bewaakt een 2D rooster van qubits. Fouten verschijnen als glitches. Speler moet syndrome-patronen herkennen en corrigeren vóór de fout zich verspreidt.",
             mechanic:"Tower-defense stijl. Grid met qubits. Fouten spawnen per seconde. Speler plaatst correctiegates. Verspreiding als chain reaction.",
             roblox:"2D Part grid in workspace. Kleurverandering per fout-type. Haptic bij grote fout.",
             example:"Level 87.500: distance-5 surface code, 3 gelijktijdige fouten, 10 seconden responstijd"},
            {n:"200.000–499.999",col:"#ff5252",type:"Anyon Braiding",
             desc:"Speler beweegt anyons over een spacetime-rooster. De volgorde van omcirkelen bepaalt de quantum operatie. Doel is een specifieke niet-abeliaanse gate.",
             mechanic:"Tijdlijn visualisatie. Anyons als gekleurde bollen. Speler trekt paden. Braid-woord wordt automatisch berekend.",
             roblox:"3D Path-drawing systeem. Anyons bewegen langzaam (realtime braid berekening). Topologisch correcte animatie.",
             example:"Level 350.000: σ₁σ₂σ₁ = σ₂σ₁σ₂ braid-identiteit bewijzen via interactie"},
            {n:"500.000–799.999",col:"#ffab00",type:"Molecular Energy Minimizer",
             desc:"Speler configureert een variationeel kwantumcircuit (VQE) om de grondtoestand van een molecuul te vinden. Parameters aanpassen → energieland minimaliseren.",
             mechanic:"Energielandschap 3D visualisatie. Sliders voor rotatieparameters. Live energie-update via Hamiltonian berekening.",
             roblox:"3D terrain mesh als energielandschap. Ball rolt naar minimum bij correcte parameters. Moleculaire structuur als decoratie.",
             example:"Level 620.000: H₂ grondtoestand −1.136 Hartree vinden via 2-qubit VQE"},
            {n:"800.000–999.999",col:"#00e5ff",type:"Quantum Architecture Design",
             desc:"Speler ontwerpt volledige kwantumcomputer-architectuur: qubit-type kiezen, fout-correctie selecteren, algoritme implementeren, resources optimaliseren.",
             mechanic:"Resource management game. Qubit-budget, gate-fidelity trade-offs, koeling-kosten, error-rate targets. Score = kwantum volume.",
             roblox:"Strategic overview UI. Meerdere lagen: hardware → software → applicatie.",
             example:"Level 950.000: ontwerp een 1000 logische qubit computer voor Shor's algoritme op RSA-2048"},
          ].map(p=>(
            <div key={p.n} className="card" style={{marginBottom:12,border:`1px solid ${p.col}22`}}>
              <div style={{padding:"12px 18px",background:`${p.col}06`,borderBottom:`1px solid ${p.col}18`,
                display:"flex",gap:10,alignItems:"center"}}>
                <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:11,color:p.col,
                  minWidth:120,letterSpacing:1}}>Level {p.n}</div>
                <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,fontSize:14,color:p.col}}>
                  {p.type}
                </div>
              </div>
              <div style={{padding:"14px 18px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div>
                  <div style={{fontSize:12,color:"var(--text)",lineHeight:1.7,marginBottom:10}}>{p.desc}</div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)",
                    letterSpacing:2,marginBottom:6}}>// VOORBEELD</div>
                  <div style={{background:"var(--deep)",borderRadius:6,padding:10,
                    fontFamily:"'Inconsolata',monospace",fontSize:11,color:p.col,lineHeight:1.6}}>
                    {p.example}
                  </div>
                </div>
                <div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)",
                    letterSpacing:2,marginBottom:6}}>// MECHANIEK</div>
                  <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.6,marginBottom:10}}>{p.mechanic}</div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--amber)",
                    letterSpacing:2,marginBottom:6}}>// ROBLOX IMPLEMENTATIE</div>
                  <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>{p.roblox}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════ TAB 3: CV PROFIEL ══════ */}
      {tab===3 && (
        <div className="fade-up">
          <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,
            fontSize:"clamp(20px,4vw,44px)",color:"var(--violet)",lineHeight:.88,marginBottom:16}}>
            CV COLLECTIE.<br/>
            <span style={{color:"var(--text)",fontSize:"0.55em"}}>TALENT PIPELINE VOOR KWANTUM.</span>
          </div>

          {/* Uitleg */}
          <div style={{background:"var(--deep)",borderRadius:8,padding:16,
            border:"1px solid var(--border2)",marginBottom:20,
            display:"flex",gap:14}}>
            <span style={{fontSize:24,flexShrink:0}}>🔐</span>
            <div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,color:"var(--violet)",marginBottom:6}}>
                HOE CV-GEGEVENS WERKEN IN MOLGANG
              </div>
              <div style={{fontSize:12,color:"var(--muted)",lineHeight:1.7}}>
                Bij bereiken van een <span style={{color:"var(--amber)"}}>Epoch-certificaat</span> (niveau 999, 9.999, etc.) 
                verschijnt een <strong style={{color:"var(--text)"}}>optioneel CV-formulier</strong> in-game.
                Data gaat via de <span style={{color:"var(--cyan)"}}>Roblox DataStore</span> → 
                Bridge API → Supabase (EHMAC B.V. server).
                <strong style={{color:"var(--violet)"}}> Speler kiest zelf</strong> wat hij deelt — 
                compleet opt-in, AVG-compliant. 
                Open Badges 3.0 certificaat wordt uitgereikt bij voldoende niveau.
                Via <span style={{color:"var(--amber)"}}>Slag B.V. (DUBV)</span> worden geschikte profielen 
                doorgeplaatst als kwantumdetachering.
              </div>
            </div>
          </div>

          {/* CV-formulier preview */}
          {!submitted ? (
            <div className="card" style={{border:"1px solid var(--violet)33"}}>
              <div className="ch">
                <span style={{fontSize:18}}>👤</span>
                <div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,fontSize:14,color:"var(--violet)"}}>
                    KWANTUM TALENT PROFIEL
                  </div>
                  <div style={{fontSize:11,color:"var(--muted)"}}>
                    Ontgrendeld na Epoch I certificaat (Level 999)
                  </div>
                </div>
                <div style={{marginLeft:"auto"}}>
                  <span className="skill-badge" style={{color:"var(--amber)",borderColor:"var(--amber)55",background:"var(--amber)10"}}>
                    Open Badges 3.0
                  </span>
                </div>
              </div>
              <div className="cb">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  {CV_FIELDS.filter(f=>f.type!=="checkbox").map(field=>(
                    <div key={field.id} className="field" style={{gridColumn:field.type==="textarea"?"1/-1":"auto"}}>
                      <label>{field.label}</label>
                      {field.type==="select" ? (
                        <select value={cv[field.id]||""} onChange={e=>setCv(p=>({...p,[field.id]:e.target.value}))}>
                          <option value="">Selecteer...</option>
                          {field.options.map(o=><option key={o}>{o}</option>)}
                        </select>
                      ) : field.type==="textarea" ? (
                        <textarea rows={3} placeholder={field.placeholder}
                          value={cv[field.id]||""} onChange={e=>setCv(p=>({...p,[field.id]:e.target.value}))}/>
                      ) : (
                        <input type={field.type} placeholder={field.placeholder}
                          value={cv[field.id]||""} onChange={e=>setCv(p=>({...p,[field.id]:e.target.value}))}/>
                      )}
                    </div>
                  ))}
                </div>
                {/* Consent */}
                <div style={{display:"flex",gap:10,alignItems:"flex-start",
                  padding:"12px",background:"var(--deep)",borderRadius:6,marginTop:8,
                  border:"1px solid var(--border2)"}}>
                  <input type="checkbox" id="consent" checked={!!cv.consent}
                    onChange={e=>setCv(p=>({...p,consent:e.target.checked}))}
                    style={{width:16,height:16,accentColor:"var(--violet)",marginTop:2,flexShrink:0}}/>
                  <label htmlFor="consent" style={{fontSize:11,color:"var(--muted)",lineHeight:1.5,cursor:"pointer"}}>
                    Ik ga akkoord dat <strong style={{color:"var(--text)"}}>EHMAC B.V.</strong> mijn profiel 
                    gebruikt voor kwantum-gerelateerde vacatures via <strong style={{color:"var(--amber)"}}>Slag B.V. (DUBV)</strong>.
                    Mijn data wordt verwerkt conform <strong style={{color:"var(--cyan)"}}>AVG/GDPR Art. 6(1)(a)</strong>.
                    Ik kan op elk moment mijn toestemming intrekken.
                  </label>
                </div>
                <button className="btn btn-cyan" style={{marginTop:16,width:"100%"}}
                  onClick={()=>setSubmitted(true)}>
                  ⚛ PROFIEL INSTUREN → SLAG B.V. PIPELINE
                </button>
              </div>
            </div>
          ) : (
            <div style={{textAlign:"center",padding:"40px 20px",
              background:"var(--surface)",borderRadius:12,border:"1px solid var(--violet)"}}>
              <div style={{fontSize:48,marginBottom:16}}>🏆</div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,fontSize:22,
                color:"var(--violet)",marginBottom:8}}>Profiel Opgeslagen</div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,
                color:"var(--muted)",marginBottom:20}}>
                Ref: QT-{Date.now().toString(36).toUpperCase()}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,maxWidth:480,margin:"0 auto 20px"}}>
                {[["Open Badge 3.0","Aangemaakt","var(--violet)"],
                  ["Slag B.V.","Profiel doorgestuurd","var(--amber)"],
                  ["Supabase","Data opgeslagen","var(--cyan)"]].map(([l,v,c])=>(
                  <div key={l} style={{background:"var(--deep)",borderRadius:8,padding:"10px 12px",
                    border:"1px solid var(--border)"}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)"}}>{l}</div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,color:c,marginTop:2}}>{v}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-outline" onClick={()=>{setSubmitted(false);setCv({})}}>
                Nieuw Profiel
              </button>
            </div>
          )}

          {/* Data flow diagram */}
          <div style={{marginTop:20,background:"var(--deep)",borderRadius:8,padding:16,
            border:"1px solid var(--border2)"}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)",
              letterSpacing:2,marginBottom:14}}>// CV DATA FLOW PIPELINE</div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              {[
                {t:"Roblox\nDataStore",col:"#00e5ff"},
                {t:"→"},
                {t:"Bridge API\nCloudflare",col:"#ffab00"},
                {t:"→"},
                {t:"Supabase\nEHMAC B.V.",col:"#00e676"},
                {t:"→"},
                {t:"Open Badge\nIssuance",col:"#b388ff"},
                {t:"→"},
                {t:"Slag B.V.\nDetachering",col:"#ff5252"},
              ].map((n,i)=>n.t==="→"?(
                <div key={i} style={{color:"var(--muted)",fontSize:20}}>→</div>
              ):(
                <div key={i} style={{background:`${n.col}10`,border:`1px solid ${n.col}33`,
                  borderRadius:6,padding:"8px 12px",textAlign:"center",flex:1,minWidth:90,
                  fontFamily:"'Orbitron',sans-serif",fontSize:9,color:n.col,
                  whiteSpace:"pre",lineHeight:1.4}}>{n.t}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════ TAB 4: TALENT MARKT ══════ */}
      {tab===4 && (
        <div className="fade-up">
          <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,
            fontSize:"clamp(20px,4vw,44px)",color:"var(--amber)",lineHeight:.88,marginBottom:6}}>
            SLAG B.V.<br/>
            <span style={{color:"var(--text)",fontSize:"0.55em"}}>KWANTUM TALENT MARKETPLACE.</span>
          </div>
          <div style={{fontFamily:"'Libre Baskerville',serif",fontStyle:"italic",
            fontSize:13,color:"var(--muted)",marginBottom:20}}>
            MOLGANG als leerschool → classificatie → detachering via Uniforce/Magnit constructie.
          </div>

          {/* Business model */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:20}}>
            {[
              {t:"Kwantum Workforce Tekort",col:"#ff5252",icon:"⚠️",
               body:"250.000 kwantum-professionals nodig wereldwijd tegen 2030. Slechts 1.800 QEC-specialisten beschikbaar. Gap: 14× te weinig. Urgentie = premium tarieven."},
              {t:"MOLGANG als Screening Tool",col:"#00e5ff",icon:"🎮",
               body:"Level-prestaties zijn objectieve vaardigheidsbewijzen. Level 999 = aantoonbare kwantumfundamenten. Level 199.999 = gecertificeerd QEC-specialist. Open Badges 3.0 = werkgevers kunnen verifiëren."},
              {t:"Slag B.V. als Tussenpersoon",col:"#ffab00",icon:"🏢",
               body:"NEN 4400-1 gecertificeerd via Uniforce/Bureau Cicero. G-rekening beschikbaar. Spelers worden geplaatst via DUBV constructie. VirtualV Holding ontvangt management fees."},
              {t:"VirtualV als IP Eigenaar",col:"#b388ff",icon:"💎",
               body:"Game IP + kwantum-curriculum IP in VirtualV Holding B.V. Innovatiebox 9% op royalty-inkomen. EHMAC factureert werkgevers. Slag B.V. betaalt personeel. Royalty-stroom terug naar VirtualV."},
            ].map(c=>(
              <div key={c.t} style={{background:"var(--surface)",borderRadius:8,padding:14,
                border:`1px solid ${c.col}22`}}>
                <div style={{display:"flex",gap:10,marginBottom:8}}>
                  <span style={{fontSize:22}}>{c.icon}</span>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:10,color:c.col}}>{c.t}</div>
                </div>
                <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.7}}>{c.body}</div>
              </div>
            ))}
          </div>

          {/* Job listings */}
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)",
            letterSpacing:2,marginBottom:10}}>// ACTIEVE VACATURES — KWANTUM TALENT PIPELINE</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8}}>
            {JOBS.map((job,i)=>(
              <div key={i} style={{background:"var(--surface)",borderRadius:8,padding:"12px 16px",
                border:`1px solid ${job.col}22`,display:"flex",gap:14,alignItems:"center",
                transition:"all .2s",cursor:"pointer"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=job.col+"55";e.currentTarget.style.background="var(--raised)"}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=job.col+"22";e.currentTarget.style.background="var(--surface)"}}>
                <div style={{width:4,background:job.col,borderRadius:2,alignSelf:"stretch",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:4}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:11,color:job.col}}>{job.title}</div>
                    {job.urgent && (
                      <span style={{fontFamily:"'Orbitron',sans-serif",fontSize:7,color:"var(--red)",
                        padding:"1px 6px",borderRadius:3,border:"1px solid var(--red)44",background:"var(--red)10"}}>
                        URGENT
                      </span>
                    )}
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {job.skills.map(s=>(
                      <Chip key={s} c={job.col}>{s}</Chip>
                    ))}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:11,color:"var(--amber)",marginBottom:2}}>
                    {job.salary}
                  </div>
                  <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)"}}>via {job.via}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue model */}
          <div style={{marginTop:20,background:"var(--deep)",borderRadius:8,padding:16,
            border:"1px solid var(--border2)"}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"var(--muted)",
              letterSpacing:2,marginBottom:14}}>// OMZETMODEL — KWANTUM DETACHERING</div>
            <table className="t">
              <thead><tr>{["Stroom","Van","Via","Naar","Tarief"].map(h=><th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {[
                  ["Game-omzet","Speler (€9.99/mnd)","Stripe EU → EHMAC B.V.","VirtualV Holding (royalty 10%)","~€1.0/speler/mnd"],
                  ["DevEx","Roblox platform","Tipalti → EHMAC B.V.","Slag B.V. dev fees","$0.0038/Robux"],
                  ["Detachering fee","Werkgever","Slag B.V. (NEN 4400-1)","Kwantum-talent","€15-25/uur marge"],
                  ["Introductie fee","Werkgever","EHMAC B.V.","VirtualV royalty","15-20% jaarsal."],
                  ["Badge-issuance","Werkgever verificatie","EHMAC B.V.","Open Badge Factory","€2/verificatie"],
                  ["WBSO voordeel","Belastingdienst","RVO → EHMAC B.V.","Loonheffing reductie","32% × €65.800"],
                ].map((r,i)=>(
                  <tr key={i}>
                    <td style={{color:"var(--cyan)"}}>{r[0]}</td>
                    <td>{r[1]}</td><td>{r[2]}</td>
                    <td style={{color:"var(--amber)"}}>{r[3]}</td>
                    <td style={{color:"var(--green)"}}>{r[4]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════ TAB 5: STATISTIEKEN ══════ */}
      {tab===5 && (
        <div className="fade-up">
          <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,
            fontSize:"clamp(20px,4vw,44px)",color:"var(--cyan)",lineHeight:.88,marginBottom:20}}>
            GAME STATISTIEKEN.<br/>
            <span style={{color:"var(--text)",fontSize:"0.55em"}}>LEVEL MAP & DISTRIBUTIE.</span>
          </div>

          {/* Level distribution */}
          <div className="card" style={{marginBottom:16}}>
            <div className="ch">
              <span>📊</span>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,fontSize:14,color:"var(--cyan)"}}>
                Verwachte Spelerspopulatie per Epoch
              </div>
            </div>
            <div className="cb">
              {[
                {ep:"I",range:"1–999",label:"Quantum Foundations",pct:100,n:"~100.000",col:"#00e5ff"},
                {ep:"II",range:"1K–9.999",label:"Gates & Circuits",pct:40,n:"~40.000",col:"#ffab00"},
                {ep:"III",range:"10K–49.999",label:"Quantum Algorithms",pct:15,n:"~15.000",col:"#00e676"},
                {ep:"IV",range:"50K–199.999",label:"Error Correction",pct:5,n:"~5.000",col:"#b388ff"},
                {ep:"V",range:"200K–499.999",label:"Topological QC",pct:1.5,n:"~1.500",col:"#ff5252"},
                {ep:"VI",range:"500K–799.999",label:"Quantum Chemistry",pct:0.5,n:"~500",col:"#ffab00"},
                {ep:"VII",range:"800K–999.999",label:"Full Architecture",pct:0.1,n:"~100",col:"#00e5ff"},
              ].map(r=>(
                <div key={r.ep} style={{marginBottom:14}}>
                  <div style={{display:"flex",gap:10,marginBottom:5}}>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,color:r.col,width:20}}>{r.ep}</div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"var(--muted)",flex:1}}>{r.label}</div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,color:r.col}}>{r.n}</div>
                    <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"var(--muted)"}}>{r.pct}%</div>
                  </div>
                  <div className="pbar">
                    <div className="pfill" style={{width:`${r.pct}%`,background:r.col,
                      boxShadow:`0 0 6px ${r.col}66`}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div className="card" style={{marginBottom:16}}>
            <div className="ch">
              <span>🏆</span>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,fontSize:14,color:"var(--amber)"}}>
                Certificering Mijlpalen
              </div>
            </div>
            <div className="cb">
              <table className="t">
                <thead><tr>{["Level","Certificaat","Badge","Job Tier","Verwacht salaris"].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {[
                    [999,"Quantum Foundations","OB3.0 Bronze","Junior","€35–50K"],
                    [9999,"Circuit Designer","OB3.0 Silver","Medior","€55–80K"],
                    [49999,"Algorithm Engineer","OB3.0 Gold","Senior","€85–120K"],
                    [199999,"QEC Specialist","OB3.0 Platinum","Principal","€100–150K"],
                    [499999,"Topological Researcher","OB3.0 Diamond","Staff","€110–160K"],
                    [799999,"Quantum Chemist","OB3.0 Elite","Distinguished","€120–170K"],
                    [999999,"Quantum Architect","OB3.0 Master","Fellow","€150–200K+"],
                  ].map((r,i)=>(
                    <tr key={i}>
                      <td style={{color:["#00e5ff","#ffab00","#00e676","#b388ff","#ff5252","#ffab00","#00e5ff"][i],
                        fontFamily:"'Orbitron',sans-serif",fontSize:11}}>{r[0].toLocaleString()}</td>
                      <td>{r[1]}</td>
                      <td style={{color:"var(--amber)"}}>{r[2]}</td>
                      <td style={{color:"var(--cyan)"}}>{r[3]}</td>
                      <td style={{color:"var(--green)"}}>{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Final vision */}
          <div style={{background:"linear-gradient(135deg,var(--deep),var(--surface))",
            borderRadius:10,padding:20,border:"1px solid var(--cyan)33",textAlign:"center"}}>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,fontSize:22,
              color:"var(--cyan)",marginBottom:8,filter:"drop-shadow(0 0 12px rgba(0,229,255,.3))"}}>
              Every Element Has a Secret
            </div>
            <div style={{fontFamily:"'Libre Baskerville',serif",fontStyle:"italic",
              fontSize:14,color:"var(--muted)",marginBottom:16,maxWidth:560,margin:"0 auto 16px"}}>
              MOLGANG is geen spelletje. Het is de wereld's eerste kwantum-classificatiesysteem 
              verpakt als entertainment. Level 999.999 is de heilige graal van kwantum-kennis.
            </div>
            <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              {[["999.999 levels","#00e5ff"],["12 quantum gates","#ffab00"],
                ["7 leerepochs","#00e676"],["Open Badges 3.0","#b388ff"],
                ["Slag B.V. pipeline","#ff5252"],["WBSO + Innovatiebox","#ffab00"]].map(([l,c])=>(
                <Chip key={l} c={c}>{l}</Chip>
              ))}
            </div>
          </div>
        </div>
      )}

      </div>
      </div>
    </div>
  );
}

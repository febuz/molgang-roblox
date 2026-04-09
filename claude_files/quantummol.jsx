import { useState, useEffect, useRef } from "react";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:       "#08090d",
  panel:    "#0e1018",
  border:   "#1a1e2e",
  deep:     "#060810",
  qpu:      "#a855f7",   // quantum purple
  qpuLight: "#f3e8ff",
  gpu:      "#f97316",   // GPU orange
  gpuLight: "#fff7ed",
  tpu:      "#06b6d4",   // TPU cyan
  tpuLight: "#ecfeff",
  cpu:      "#84cc16",   // CPU lime
  cpuLight: "#f7fee7",
  mol:      "#22c55e",   // MolChain green
  molLight: "#dcfce7",
  gold:     "#eab308",
  muted:    "#4a5568",
  dim:      "#2d3748",
  cream:    "#e2e8f0",
  white:    "#f8fafc",
};

// ─── CSS ────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Outfit:wght@300;400;600;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:${C.bg};color:${C.cream};font-family:'Outfit',sans-serif;}
.mono{font-family:'Share Tech Mono',monospace;}

/* scanline overlay */
body::before{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:999;
  background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.08) 2px,rgba(0,0,0,.08) 4px);
}

/* HERO */
.hero{
  min-height:90vh;position:relative;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:80px 24px;
  background:radial-gradient(ellipse 80% 60% at 50% 50%,${C.qpu}12 0%,transparent 70%),${C.bg};
}
.hero-circuit{
  position:absolute;inset:0;pointer-events:none;
  background-image:
    linear-gradient(${C.qpu}10 1px,transparent 1px),
    linear-gradient(90deg,${C.qpu}10 1px,transparent 1px);
  background-size:40px 40px;
  mask-image:radial-gradient(ellipse 70% 70% at 50% 50%,black 40%,transparent 100%);
}
/* animated qubit pulses */
@keyframes qubit{
  0%{transform:scale(1);opacity:.6;}
  50%{transform:scale(1.8);opacity:1;}
  100%{transform:scale(1);opacity:.6;}
}
.qbit-dot{
  position:absolute;border-radius:50%;
  animation:qubit 2s ease-in-out infinite;
}
.hero-eyebrow{
  font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:4px;
  text-transform:uppercase;color:${C.qpu};margin-bottom:20px;position:relative;z-index:1;
}
.hero h1{
  font-size:clamp(56px,11vw,128px);font-weight:900;line-height:.86;
  letter-spacing:-3px;color:${C.white};margin-bottom:16px;position:relative;z-index:1;
}
.hero h1 .q{color:${C.qpu};}
.hero h1 .m{color:${C.mol};}
.hero-sub{
  font-size:clamp(14px,2vw,18px);color:${C.muted};max-width:540px;
  line-height:1.6;margin:0 auto 40px;position:relative;z-index:1;
}
.hero-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;
  position:relative;z-index:1;margin-bottom:48px;}
.chip{padding:5px 14px;border-radius:20px;font-family:'Share Tech Mono',monospace;
  font-size:10px;letter-spacing:1px;border:1px solid;}
.hero-kpis{display:flex;gap:40px;justify-content:center;flex-wrap:wrap;position:relative;z-index:1;}
.kpi-val{font-family:'Share Tech Mono',monospace;font-size:36px;line-height:1;}
.kpi-label{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;
  text-transform:uppercase;color:${C.muted};margin-top:4px;}

/* NAV */
.nav{background:${C.panel};border-bottom:1px solid ${C.border};
  position:sticky;top:0;z-index:100;}
.nav-inner{max-width:1200px;margin:0 auto;padding:0 20px;
  display:flex;gap:0;overflow-x:auto;scrollbar-width:none;}
.nav-inner::-webkit-scrollbar{display:none;}
.nbtn{padding:14px 16px;background:transparent;border:none;border-bottom:2px solid transparent;
  font-family:'Share Tech Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;
  color:${C.muted};cursor:pointer;white-space:nowrap;transition:all .2s;}
.nbtn:hover{color:${C.cream};}
.nbtn.active{color:${C.qpu};border-bottom-color:${C.qpu};}

.wrap{max-width:1200px;margin:0 auto;padding:0 20px;}
.sec{padding:72px 0;}
.slabel{font-family:'Share Tech Mono',monospace;font-size:9px;
  letter-spacing:4px;text-transform:uppercase;color:${C.qpu};margin-bottom:10px;}
.stitle{font-size:clamp(32px,5vw,60px);font-weight:900;line-height:.9;
  letter-spacing:-1px;margin-bottom:28px;}
.stitle em{font-style:normal;color:${C.qpu};}
.stitle .mol{color:${C.mol};}
.stitle .gpu{color:${C.gpu};}

/* ENERGY BAR RACE */
.ebar-wrap{background:${C.panel};border:1px solid ${C.border};
  border-radius:14px;padding:28px;margin-bottom:32px;}
.ebar-title{font-family:'Share Tech Mono',monospace;font-size:10px;
  letter-spacing:3px;text-transform:uppercase;color:${C.muted};margin-bottom:20px;}
.ebar-row{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
.ebar-name{font-family:'Share Tech Mono',monospace;font-size:11px;
  text-transform:uppercase;letter-spacing:1px;flex-shrink:0;width:50px;}
.ebar-track{flex:1;height:32px;background:${C.deep};border-radius:4px;overflow:hidden;}
.ebar-fill{height:100%;border-radius:4px;display:flex;align-items:center;
  padding:0 10px;font-family:'Share Tech Mono',monospace;font-size:11px;
  color:#fff;transition:width 1.2s cubic-bezier(.4,0,.2,1);}
.ebar-unit{font-family:'Share Tech Mono',monospace;font-size:11px;width:120px;flex-shrink:0;}

/* CIRCUIT VISUALIZER */
.circuit-wrap{background:${C.panel};border:1px solid ${C.border};
  border-radius:14px;overflow:hidden;margin-bottom:32px;}
.circuit-header{padding:16px 24px;border-bottom:1px solid ${C.border};
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.circuit-title{font-family:'Share Tech Mono',monospace;font-size:11px;
  letter-spacing:3px;text-transform:uppercase;color:${C.muted};flex:1;}
.circuit-body{padding:24px;overflow-x:auto;}
.qubit-line{display:flex;align-items:center;gap:0;margin-bottom:12px;}
.qubit-label{font-family:'Share Tech Mono',monospace;font-size:13px;
  color:${C.qpu};width:40px;flex-shrink:0;}
.wire{height:2px;background:${C.dim};flex:1;}
.gate{
  width:36px;height:36px;border-radius:6px;border:2px solid;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  font-family:'Share Tech Mono',monospace;font-size:12px;font-weight:500;
  cursor:pointer;transition:all .15s;position:relative;
}
.gate:hover{transform:scale(1.1);}
.gate-energy{
  position:absolute;top:-18px;left:50%;transform:translateX(-50%);
  font-family:'Share Tech Mono',monospace;font-size:8px;white-space:nowrap;
  color:${C.gold};opacity:0;transition:opacity .2s;pointer-events:none;
}
.gate:hover .gate-energy{opacity:1;}

/* BACKEND SELECTOR */
.backend-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;}
.backend-card{
  background:${C.panel};border:2px solid ${C.border};border-radius:10px;
  padding:18px;cursor:pointer;transition:all .2s;text-align:center;
}
.backend-card:hover{transform:translateY(-2px);}
.backend-card.sel{border-width:2px;}
.backend-icon{font-size:28px;margin-bottom:8px;}
.backend-name{font-weight:700;font-size:14px;margin-bottom:4px;}
.backend-spec{font-family:'Share Tech Mono',monospace;font-size:10px;color:${C.muted};}

/* RESULT PANEL */
.result-panel{
  background:${C.deep};border:1px solid ${C.border};border-radius:12px;
  padding:24px;margin-bottom:24px;font-family:'Share Tech Mono',monospace;
}
.result-row{display:flex;justify-content:space-between;align-items:center;
  padding:8px 0;border-bottom:1px solid ${C.border};font-size:13px;}
.result-row:last-child{border-bottom:none;}
.result-key{color:${C.muted};}
.result-val{font-size:14px;}

/* COMPARISON TABLE */
.cmp-outer{overflow-x:auto;margin-bottom:40px;}
.cmp{width:100%;border-collapse:collapse;font-size:12px;min-width:800px;}
.cmp th{padding:12px 16px;font-family:'Share Tech Mono',monospace;font-size:9px;
  letter-spacing:2px;text-transform:uppercase;text-align:left;}
.cmp th.qpu-h{background:${C.qpu}33;color:${C.qpu};}
.cmp th.gpu-h{background:${C.gpu}22;color:${C.gpu};}
.cmp th.tpu-h{background:${C.tpu}22;color:${C.tpu};}
.cmp th.cpu-h{background:${C.cpu}22;color:${C.cpu};}
.cmp th.row-h{background:${C.panel};color:${C.muted};}
.cmp td{padding:11px 16px;border-bottom:1px solid ${C.border};color:${C.muted};vertical-align:middle;}
.cmp tr:hover td{background:rgba(255,255,255,.02);}
.cmp td:first-child{color:${C.cream};font-weight:600;font-size:11px;}

/* MOLCHAIN BRIDGE */
.bridge-flow{
  display:flex;align-items:center;gap:0;
  background:${C.panel};border:1px solid ${C.border};
  border-radius:14px;overflow:hidden;margin-bottom:32px;
}
.bridge-node{flex:1;padding:20px 16px;text-align:center;position:relative;}
.bridge-node::after{content:'→';position:absolute;right:-10px;top:50%;
  transform:translateY(-50%);font-size:16px;color:${C.muted};z-index:2;}
.bridge-node:last-child::after{display:none;}
.bridge-icon{font-size:24px;margin-bottom:6px;}
.bridge-name{font-size:12px;font-weight:700;margin-bottom:2px;}
.bridge-detail{font-family:'Share Tech Mono',monospace;font-size:9px;color:${C.muted};line-height:1.4;}
.bridge-node.active{background:${C.qpu}15;border-right:1px solid ${C.qpu}33;}

/* QUANTUM USE CASES */
.quc-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.quc-card{background:${C.panel};border:1px solid ${C.border};border-radius:12px;padding:22px;}
.quc-algo{font-family:'Share Tech Mono',monospace;font-size:10px;
  letter-spacing:2px;text-transform:uppercase;color:${C.qpu};margin-bottom:6px;}
.quc-title{font-size:16px;font-weight:700;margin-bottom:8px;}
.quc-body{font-size:13px;color:${C.muted};line-height:1.7;}
.quc-speedup{
  margin-top:12px;display:inline-block;
  background:${C.qpu}22;color:${C.qpu};
  padding:3px 10px;border-radius:10px;
  font-family:'Share Tech Mono',monospace;font-size:11px;
}

/* ENERGY PROOF NFT */
.nft-card{
  background:linear-gradient(135deg,${C.qpu}22,${C.mol}15);
  border:1px solid ${C.qpu}44;border-radius:16px;padding:28px;margin-bottom:32px;
}

/* RAPL MONITOR */
.monitor-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;}
.monitor-card{background:${C.panel};border:1px solid ${C.border};border-radius:10px;padding:16px;}
.monitor-val{font-family:'Share Tech Mono',monospace;font-size:22px;font-weight:500;line-height:1;margin-bottom:4px;}
.monitor-label{font-family:'Share Tech Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}
.live{animation:blink 1.5s infinite;color:${C.mol};}

/* CODE BLOCK */
.code{
  background:${C.deep};border:1px solid ${C.border};border-radius:10px;
  padding:20px;font-family:'Share Tech Mono',monospace;font-size:12px;
  line-height:1.8;overflow-x:auto;margin-bottom:20px;
}
.kw{color:${C.qpu};}
.fn{color:${C.gpu};}
.str{color:${C.mol};}
.cm{color:${C.muted};}
.num{color:${C.tpu};}

@media(max-width:768px){
  .backend-grid{grid-template-columns:1fr 1fr;}
  .quc-grid{grid-template-columns:1fr;}
  .monitor-grid{grid-template-columns:1fr 1fr;}
}
`;

// ─── Gate definitions ───────────────────────────────────────────────────────
const GATES = [
  {name:"H",   nJ_qpu:.24,  color:C.qpu,  desc:"Hadamard — superpositie"},
  {name:"X",   nJ_qpu:.18,  color:C.gpu,  desc:"Pauli-X — qubit flip"},
  {name:"CNOT",nJ_qpu:.62,  color:C.tpu,  desc:"Controlled-NOT — entanglement"},
  {name:"T",   nJ_qpu:.31,  color:C.gold, desc:"T-gate — fase rotatie π/4"},
  {name:"Rz",  nJ_qpu:.22,  color:C.mol,  desc:"Z-rotatie — variabele fase"},
  {name:"M",   nJ_qpu:.95,  color:C.cpu,  desc:"Meting — wavefunction collapse"},
];

const SAMPLE_CIRCUIT = [
  {q:0, gates:["H","CNOT","T","M"]},
  {q:1, gates:["X","CNOT","Rz","M"]},
  {q:2, gates:["H","T","CNOT","M"]},
];

const BACKENDS = [
  {id:"qpu", icon:"⚛",  name:"QPU", spec:"IBM Eagle 127q / D-Wave Advantage",
   color:C.qpu,  tdpW:25,    gateNs:50,  gateNJ:.35,  errorRate:.001, access:"Cloud API"},
  {id:"gpu", icon:"🎮",  name:"GPU", spec:"NVIDIA H100 80GB SXM",
   color:C.gpu,  tdpW:700,   gateNs:1e6, gateNJ:5000, errorRate:0,    access:"CUDA/ROCm"},
  {id:"tpu", icon:"🔷",  name:"TPU", spec:"Google TPU v4 (Cloud)",
   color:C.tpu,  tdpW:175,   gateNs:2e5, gateNJ:800,  errorRate:0,    access:"GCP"},
  {id:"cpu", icon:"💾",  name:"CPU", spec:"AMD EPYC 9654 96-core",
   color:C.cpu,  tdpW:360,   gateNs:1e7, gateNJ:8000, errorRate:0,    access:"x86"},
];

const TABS=["Concept","Circuit Lab","Energie Vergelijking","MolChain Bridge","Quantum MRV","Code SDK"];

// ─── Live counter ────────────────────────────────────────────────────────────
function useTick(ms=500){ const [t,setT]=useState(0); useEffect(()=>{const iv=setInterval(()=>setT(x=>x+1),ms);return()=>clearInterval(iv);},[ms]); return t; }

// ─── Components ─────────────────────────────────────────────────────────────
function EnergyBar({name,color,joules,maxJ,unit,spec}){
  const pct = Math.min((joules/maxJ)*100,100);
  return(
    <div className="ebar-row">
      <div className="ebar-name" style={{color}}>{name}</div>
      <div className="ebar-track">
        <div className="ebar-fill" style={{width:`${pct}%`,background:`linear-gradient(90deg,${color}99,${color})`}}>
          {joules.toExponential(2)} J
        </div>
      </div>
      <div className="ebar-unit" style={{color}}>{unit}</div>
    </div>
  );
}

function CircuitLab(){
  const [sel, setSel] = useState("qpu");
  const [shots, setShots] = useState(1024);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const tick = useTick(100);
  const backend = BACKENDS.find(b=>b.id===sel);

  const totalGates = SAMPLE_CIRCUIT.reduce((a,r)=>a+r.gates.length,0);
  const totalNJ = totalGates * backend.gateNJ;
  const totalJ  = totalNJ * 1e-9 * shots;
  const co2g    = totalJ * (0.385 / 3.6e6); // NL grid: 385gCO₂/kWh
  const molCO2  = co2g / 0.044;             // 1 mmol CO₂ = 0.044g

  function runCircuit(){
    setRunning(true);
    setTimeout(()=>{
      setResult({
        totalGates, totalNJ: totalNJ.toFixed(2),
        totalJ: totalJ.toExponential(3),
        timeUs: (totalGates * backend.gateNs / 1000).toFixed(1),
        co2g: co2g.toExponential(3),
        molCO2: molCO2.toExponential(3),
        molTokens: Math.ceil(molCO2 * 100) / 100,
        energyProofID: "0x"+Math.random().toString(16).slice(2,18).toUpperCase(),
      });
      setRunning(false);
    }, 1500);
  }

  return(
    <div>
      {/* backend selector */}
      <div className="slabel" style={{marginBottom:16}}>// Selecteer Backend</div>
      <div className="backend-grid">
        {BACKENDS.map(b=>(
          <div key={b.id} className={`backend-card ${sel===b.id?"sel":""}`}
            style={sel===b.id?{borderColor:b.color,background:`${b.color}12`}:{}}
            onClick={()=>{setSel(b.id);setResult(null);}}>
            <div className="backend-icon">{b.icon}</div>
            <div className="backend-name" style={sel===b.id?{color:b.color}:{}}>{b.name}</div>
            <div className="backend-spec">{b.spec}</div>
            <div style={{marginTop:8,fontFamily:"'Share Tech Mono',monospace",fontSize:9,
              color:b.color,letterSpacing:1}}>{b.tdpW}W TDP · {b.gateNJ.toExponential(1)}J/gate</div>
          </div>
        ))}
      </div>

      {/* circuit viz */}
      <div className="circuit-wrap">
        <div className="circuit-header">
          <div className="circuit-title">QUANTUM CIRCUIT — 3 QUBITS · {totalGates} GATES · {shots} SHOTS</div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted}}>Shots:</span>
            {[128,512,1024,4096].map(s=>(
              <button key={s} onClick={()=>setShots(s)} style={{
                padding:"4px 10px",borderRadius:6,cursor:"pointer",
                fontFamily:"'Share Tech Mono',monospace",fontSize:10,
                background:shots===s?backend.color:C.border,
                color:shots===s?C.bg:C.muted,border:"none",
              }}>{s}</button>
            ))}
          </div>
        </div>
        <div className="circuit-body">
          {SAMPLE_CIRCUIT.map((row,i)=>(
            <div key={i} className="qubit-line">
              <div className="qubit-label">|q{row.q}⟩</div>
              <div className="wire" style={{width:20}}/>
              {row.gates.map((gname,j)=>{
                const g=GATES.find(x=>x.name===gname)||{color:C.muted,nJ_qpu:.3,desc:""};
                return(
                  <div key={j} style={{display:"flex",alignItems:"center"}}>
                    <div className="wire" style={{width:12}}/>
                    <div className="gate" style={{borderColor:backend.color,background:`${backend.color}18`,color:backend.color}}>
                      {gname}
                      <div className="gate-energy">{(g.nJ_qpu*(backend.gateNJ/0.35)).toFixed(2)}nJ</div>
                    </div>
                    <div className="wire" style={{width:12}}/>
                  </div>
                );
              })}
              <div className="wire" style={{flex:1}}/>
            </div>
          ))}
        </div>
      </div>

      {/* run button */}
      <button onClick={runCircuit} disabled={running} style={{
        width:"100%",padding:"16px",borderRadius:10,border:"none",cursor:"pointer",
        background:running?C.border:`linear-gradient(90deg,${backend.color},${backend.color}cc)`,
        color:running?C.muted:C.bg,fontFamily:"'Share Tech Mono',monospace",
        fontSize:13,letterSpacing:2,textTransform:"uppercase",
        transition:"all .2s",marginBottom:20,
      }}>
        {running?"⚡ UITVOEREN...":"▶ RUN CIRCUIT + MEET ENERGIE"}
      </button>

      {/* results */}
      {result && (
        <div>
          <div className="result-panel">
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:3,
              textTransform:"uppercase",color:backend.color,marginBottom:12}}>
              // RESULTATEN — {backend.name} — {backend.spec}
            </div>
            {[
              ["Gates uitegevoerd",`${result.totalGates} gates × ${shots} shots`],
              ["Energie per gate",`${backend.gateNJ.toExponential(2)} J/gate`],
              ["Totale energie (circuit)",`${result.totalJ} J`],
              ["Uitvoeringstijd",`${result.timeUs} µs`],
              ["CO₂ uitstoot (NL grid 385g/kWh)",`${result.co2g} g CO₂`],
              ["MOLCO₂ tokens (1 = 1 mmol = 0.044g)",`${result.molCO2} tokens`],
              ["EnergyProof NFT ID",result.energyProofID],
            ].map(([k,v],i)=>(
              <div key={i} className="result-row">
                <span className="result-key">{k}</span>
                <span className="result-val" style={{color: i===4?C.mol: i===5?C.mol: i===6?C.gold:backend.color,
                  fontFamily:"'Share Tech Mono',monospace"}}>{v}</span>
              </div>
            ))}
          </div>
          <div className="nft-card">
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:3,
              textTransform:"uppercase",color:C.qpu,marginBottom:12}}>
              // ENERGYPROOF NFT — AUTOMATISCH GEMINT OP XRPL
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
              {[
                {k:"NFT Type",v:"EnergyProof v1",c:C.qpu},
                {k:"Backend",v:backend.name + " (" + backend.id.toUpperCase() + ")",c:backend.color},
                {k:"Energie",v:result.totalJ + " J",c:C.gpu},
                {k:"CO₂",v:result.co2g + " g",c:C.mol},
                {k:"MOLCO₂ minted",v:result.molCO2,c:C.mol},
                {k:"XRPL TxHash",v:result.energyProofID.slice(0,12)+"...",c:C.gold},
              ].map(({k,v,c},i)=>(
                <div key={i}>
                  <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:C.muted,letterSpacing:1,marginBottom:3}}>{k}</div>
                  <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:c}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState("Concept");
  const tick=useTick(800);

  // live monitor values
  const cpu_w  = (18  + Math.sin(tick*.3)  * 3).toFixed(1);
  const gpu_w  = (420 + Math.sin(tick*.7)  * 40).toFixed(0);
  const qpu_mw = (4.2 + Math.sin(tick*.5)  * .8).toFixed(2);
  const tpu_w  = (95  + Math.sin(tick*.4)  * 12).toFixed(0);

  return(
    <div>
      <style>{css}</style>

      {/* HERO */}
      <div className="hero">
        <div className="hero-circuit"/>
        {[[10,20],[30,70],[70,15],[80,80],[50,40],[20,60],[60,90]].map(([l,t],i)=>(
          <div key={i} className="qbit-dot" style={{
            width:8,height:8,left:`${l}%`,top:`${t}%`,
            background:i%3===0?C.qpu:i%3===1?C.mol:C.gpu,
            animationDelay:`${i*.3}s`,
          }}/>
        ))}
        <div className="hero-eyebrow">// QuantumMol · VirtualV Holding B.V. · v1.0</div>
        <h1><span className="q">Quantum</span><br/><span className="m">Mol</span></h1>
        <p className="hero-sub">
          Meet de energie van elk quantum circuit, GPU, TPU en CPU berekening op joule-niveau. 
          Zet het automatisch om naar MOLCO₂ tokens op de XRP Ledger.
        </p>
        <div className="hero-chips">
          {[
            {t:"QPU Intel RAPL",c:C.qpu},{t:"GPU NVML",c:C.gpu},
            {t:"TPU Cloud Monitor",c:C.tpu},{t:"CPU RAPL",c:C.cpu},
            {t:"XRPL EnergyProof NFT",c:C.mol},{t:"MolChain Bridge",c:C.gold},
          ].map((c,i)=>(
            <div key={i} className="chip" style={{color:c.c,background:`${c.c}18`,borderColor:`${c.c}44`}}>{c.t}</div>
          ))}
        </div>
        <div className="hero-kpis">
          {[
            {val:<><span style={{color:C.qpu}}>0.35</span></>,label:"nJ per QPU gate"},
            {val:<><span style={{color:C.gpu}}>5000</span></>,label:"nJ per GPU gate (sim)"},
            {val:<><span style={{color:C.mol}}>385</span></>,label:"gCO₂/kWh (NL grid)"},
            {val:<><span style={{color:C.gold}}>14.000×</span></>,label:"Quantum voordeel QAOA"},
          ].map((k,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div className="kpi-val">{k.val}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* NAV */}
      <div className="nav">
        <div className="nav-inner">
          {TABS.map(t=>(
            <button key={t} className={`nbtn ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="wrap">

        {/* ── CONCEPT ── */}
        {tab==="Concept" && (
          <div className="sec">
            <div className="slabel">// Architectuur</div>
            <div className="stitle"><em>Elke berekening</em><br/>heeft een <span className="mol">CO₂ voetafdruk</span></div>

            {/* live monitor */}
            <div style={{marginBottom:28}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div className="slabel" style={{margin:0}}>// Live Power Monitor</div>
                <span className="live" style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,letterSpacing:2}}>● LIVE</span>
              </div>
              <div className="monitor-grid">
                {[
                  {label:"CPU Pakket",val:cpu_w+" W",sub:"Intel RAPL MSR",color:C.cpu},
                  {label:"GPU Board",val:gpu_w+" W",sub:"NVIDIA NVML API",color:C.gpu},
                  {label:"QPU Cryo",val:qpu_mw+" mW",sub:"IBM Quantum telemetrie",color:C.qpu},
                  {label:"TPU Core",val:tpu_w+" W",sub:"GCP Cloud Monitoring",color:C.tpu},
                ].map((m,i)=>(
                  <div key={i} className="monitor-card" style={{borderColor:`${m.color}44`}}>
                    <div className="monitor-val" style={{color:m.color}}>{m.val}</div>
                    <div className="monitor-label">{m.label}</div>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,
                      color:C.muted,marginTop:4}}>{m.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* MolChain bridge flow */}
            <div className="slabel" style={{marginBottom:12}}>// Van Joule naar MOLCO₂ Token</div>
            <div className="bridge-flow" style={{marginBottom:32}}>
              {[
                {icon:"⚡",name:"Energie Meting",detail:"RAPL / NVML / Cloud API\nJoule per job"},
                {icon:"🔄",name:"CO₂ Conversie",detail:"Grid carbon intensity\n(gCO₂/kWh)"},
                {icon:"✅",name:"AI Verificatie",detail:"ISO 14064-1\nOracle validatie"},
                {icon:"⛓",name:"XRPL Mint",detail:"MOLCO₂ token\n+ EnergyProof NFT"},
                {icon:"📊",name:"MolChain DEX",detail:"Verhandelbaar\nRetirement opt."},
              ].map((n,i)=>(
                <div key={i} className={`bridge-node ${i===3?"active":""}`}>
                  <div className="bridge-icon">{n.icon}</div>
                  <div className="bridge-name" style={i===3?{color:C.mol}:{}}>{n.name}</div>
                  <div className="bridge-detail" style={{whiteSpace:"pre"}}>{n.detail}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[
                {title:"🔬 Waarom quantum circuits anders zijn",body:"Een QPU verbruikt in cryogene staat ~4mW totaal — maar een gate-operatie duurt slechts 50ns. De energie per gate (~0.35nJ) is 14.000× lager dan een GPU-simulatie van hetzelfde circuit. Dit maakt QPU's aantrekkelijk voor speciale berekeningen — en het maakt energie-accounting per gate wetenschappelijk zinvol."},
                {title:"🌍 Waarom dit voor MolChain cruciaal is",body:"Data centers verbruiken 1-2% van wereldwijd elektriciteitsgebruik (IEA 2024). AI-training van GPT-4 equivalent: ~500 ton CO₂. MolChain's IoT-verificatie-algoritmen draaien op GPU/CPU. QuantumMol maakt de CO₂-footprint van MolChain zelf meetbaar en transparant — de enige carbon registry die zijn eigen energie registreert."},
                {title:"⚙️ Technische meetmethoden",body:"CPU: Intel RAPL (Running Average Power Limit) via /sys/class/powercap op Linux — direct MSR-register uitlezen, nauwkeurigheid ±2%. GPU: NVIDIA Management Library (NVML) of nvidiasmi --query. TPU: Google Cloud Monitoring API, metrics/tpu/container/consumed_tpu_seconds. QPU: IBM Quantum telemetry API, D-Wave SAPI energy endpoint."},
                {title:"🔗 XRPL EnergyProof NFT",body:"Elke compute-job genereert een EnergyProof NFT op XRPL met metadata: backend-type, circuit-hash, joule-gemeten, CO₂-gram, MOLCO₂-tokens gemint, grid-carbon-intensity, ISO14064-methodologie. Dit NFT is het audittrail voor corporate carbon accounting — ISO 14064-3 compliant."},
              ].map((c,i)=>(
                <div key={i} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:22}}>
                  <div style={{fontSize:15,fontWeight:700,marginBottom:10}}>{c.title}</div>
                  <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CIRCUIT LAB ── */}
        {tab==="Circuit Lab" && (
          <div className="sec">
            <div className="slabel">// Interactief Circuit Lab</div>
            <div className="stitle">Run een <em>quantum</em><br/>circuit. Meet <span className="mol">CO₂</span>.</div>
            <CircuitLab/>
          </div>
        )}

        {/* ── ENERGIE VERGELIJKING ── */}
        {tab==="Energie Vergelijking" && (
          <div className="sec">
            <div className="slabel">// Energie per Backend</div>
            <div className="stitle">QPU vs <span className="gpu">GPU</span><br/>vs CPU vs <span style={{color:C.tpu}}>TPU</span></div>

            <div className="ebar-wrap">
              <div className="ebar-title">// Energie per Gate-Equivalente Berekening (log scale, 1024 shots, 12 gates)</div>
              {[
                {name:"QPU",color:C.qpu,joules:0.35e-9*12*1024,    maxJ:1e-2, unit:"nJ range",  spec:"IBM Eagle, 50ns/gate"},
                {name:"TPU",color:C.tpu,joules:800e-9*12*1024,     maxJ:1e-2, unit:"µJ range",  spec:"Google TPU v4, 200µs/op"},
                {name:"GPU",color:C.gpu,joules:5000e-9*12*1024,    maxJ:1e-2, unit:"µJ range",  spec:"H100, 1ms/gate sim"},
                {name:"CPU",color:C.cpu,joules:8000e-9*12*1024,    maxJ:1e-2, unit:"µJ range",  spec:"EPYC, 10ms/gate sim"},
              ].map((b,i)=>(
                <EnergyBar key={i} {...b}/>
              ))}
            </div>

            <div className="cmp-outer">
              <table className="cmp">
                <thead>
                  <tr>
                    <th className="row-h" style={{minWidth:200}}>Parameter</th>
                    <th className="qpu-h">⚛ QPU</th>
                    <th className="gpu-h">🎮 GPU (H100)</th>
                    <th className="tpu-h">🔷 TPU v4</th>
                    <th className="cpu-h">💾 CPU EPYC</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Gate uitvoer snelheid","50 ns","1 ms (sim)","200 µs","10 ms (sim)"],
                    ["Energie per gate","0.35 nJ","5.000 nJ","800 nJ","8.000 nJ"],
                    ["TDP (hardware totaal)","25 mW (cryo)","700 W","175 W","360 W"],
                    ["CO₂ per 10⁶ gates (NL)","0.00015 µg","2.7 µg","0.43 µg","4.3 µg"],
                    ["Simulatie fout","~0.1% (coherentie)","0% (exact)","0% (exact)","0% (exact)"],
                    ["Max qubits/dimensie","127 (Eagle)","2^30 (30q sim)","2^24 (24q sim)","2^20 (20q sim)"],
                    ["MOLCO₂ per 10⁹ gates","0.0034 tokens","61 tokens","9.8 tokens","98 tokens"],
                    ["Quantum voordeel*","N/A — native","14.000× meer","2.200× meer","22.000× meer"],
                    ["Beschikbaarheid","IBM Quantum Cloud","On-premise/cloud","GCP cloud","Universeel"],
                    ["Kosten per uur","$1.60 (IBM)","$30-100 (cloud)","$8-32 (GCP)","$0.01-2"],
                  ].map((r,i)=>(
                    <tr key={i}>
                      <td>{r[0]}</td>
                      <td style={{color:C.qpu,fontFamily:"'Share Tech Mono',monospace"}}>{r[1]}</td>
                      <td style={{color:C.gpu,fontFamily:"'Share Tech Mono',monospace"}}>{r[2]}</td>
                      <td style={{color:C.tpu,fontFamily:"'Share Tech Mono',monospace"}}>{r[3]}</td>
                      <td style={{color:C.cpu,fontFamily:"'Share Tech Mono',monospace"}}>{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,marginBottom:32}}>
              * Quantum voordeel = verhouding energie QPU vs klassiek voor equivalent resultaat. Van toepassing op specifieke problemen (optimalisatie, sampling). Niet universeel.
            </div>

            {/* quantum advantage zone */}
            <div style={{background:C.panel,border:`1px solid ${C.qpu}44`,borderRadius:14,padding:24}}>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:C.qpu,
                letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>
                // Quantum voordeel — wanneer QPU echt zuiniger is
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
                {[
                  {prob:"QAOA — Combinatorische optimalisatie",adv:"Kwadratisch (O(√N) vs O(N))",use:"MolChain: optimale CO₂ routing tussen provincies"},
                  {prob:"VQE — Moleculaire simulatie",adv:"Exponentieel voor bepaalde moleculen",use:"SmartSlag³: modelleer carbonatie-reacties"},
                  {prob:"Grover — Ongestructureerd zoeken",adv:"Kwadratisch (O(√N) vs O(N))",use:"MolChain: dubbeltelling detectie in grote registers"},
                  {prob:"QML — Quantum machine learning",adv:"Potentieel exponentieel (disputed)",use:"EHMAC: anomalie-detectie in transactiedata"},
                  {prob:"Shor — Factorisatie",adv:"Exponentieel (O(log N)²)",use:"Crypto-hard: XRPL post-quantum security"},
                  {prob:"HHL — Lineaire stelsels",adv:"Exponentieel (sparse matrices)",use:"MolChain: snel oplossen van emissiematrixvergelijkingen"},
                ].map((p,i)=>(
                  <div key={i} style={{background:C.deep,borderRadius:10,padding:14}}>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,
                      color:C.qpu,marginBottom:6}}>{p.prob}</div>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,
                      color:C.mol,marginBottom:6}}>↑ {p.adv}</div>
                    <div style={{fontSize:12,color:C.muted}}>{p.use}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MOLCHAIN BRIDGE ── */}
        {tab==="MolChain Bridge" && (
          <div className="sec">
            <div className="slabel">// QuantumMol × MolChain Integratie</div>
            <div className="stitle">Compute CO₂<br/>→ <span className="mol">MOLCO₂ Token</span></div>

            <div className="nft-card" style={{marginBottom:32}}>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:C.qpu,
                letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>
                // EnergyProof NFT Structuur — XRPL NFToken
              </div>
              <div className="code" style={{background:"rgba(0,0,0,.4)",border:"none"}}>
                <div><span className="kw">NFToken</span> {"{"}</div>
                <div>  <span className="kw">NFTokenID</span>:    <span className="str">"0x4A7F...E2B9"</span>, <span className="cm">// Uniek XRPL token ID</span></div>
                <div>  <span className="kw">URI</span>: {"{"}</div>
                <div>    <span className="kw">backend</span>:       <span className="str">"QPU_IBM_EAGLE_127Q"</span>,</div>
                <div>    <span className="kw">circuit_hash</span>:  <span className="str">"SHA3-256:a3f7..."</span>,</div>
                <div>    <span className="kw">qubits</span>:        <span className="num">127</span>,</div>
                <div>    <span className="kw">gates</span>:         <span className="num">2847</span>,</div>
                <div>    <span className="kw">shots</span>:         <span className="num">4096</span>,</div>
                <div>    <span className="kw">energy_J</span>:      <span className="num">4.072e-3</span>, <span className="cm">// gemeten via IBM telemetry</span></div>
                <div>    <span className="kw">co2_g</span>:         <span className="num">4.35e-10</span>, <span className="cm">// CO₂ gram</span></div>
                <div>    <span className="kw">grid_gco2_kwh</span>: <span className="num">385</span>,      <span className="cm">// NL grid 2026</span></div>
                <div>    <span className="kw">molco2_minted</span>: <span className="num">9.88e-9</span>, <span className="cm">// MOLCO₂ tokens</span></div>
                <div>    <span className="kw">methodology</span>:   <span className="str">"ISO14064-1:2018 §5.4.3"</span>,</div>
                <div>    <span className="kw">verifier</span>:      <span className="str">"MolChain_Oracle_v2.1"</span>,</div>
                <div>    <span className="kw">timestamp</span>:     <span className="num">1748962841</span>,</div>
                <div>    <span className="kw">xrpl_ledger</span>:   <span className="num">87234156</span></div>
                <div>  {"}"}</div>
                <div>{"}"}</div>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:32}}>
              {[
                {title:"🏢 Corporate Carbon Accounting",body:"Bedrijven die AI-modellen trainen (APG, Aegon, Nike — EHMAC klanten) moeten hun Scope 2 en Scope 3 CO₂-emissies rapporteren. QuantumMol biedt een geautomatiseerde, blockchain-verifieerbare carbon accounting tool voor elke compute-job. CSRD-compliant rapportage out-of-the-box."},
                {title:"🔬 Wetenschappelijke publicaties",body:"Jouw TU Delft QuTech achtergrond: publiceer de eerste peer-reviewed studie over 'Quantum Circuit Energy Tokenization'. Samenwerking met QuTech energielab voor empirische gate-energiemetingen op echte QPU hardware. Dit is een wetenschappelijke primeur."},
                {title:"🌐 Data Center Market",body:"Wereldwijd 10.000+ data centers. Microsoft, Google, Meta beloven allemaal carbon neutral te worden maar hebben geen granulaire tracking op job-niveau. QuantumMol als SaaS voor data center operators: €0.001 per compute-job gemeten. Bij 1 miljard jobs/dag = €1M/dag TAM."},
                {title:"⚡ Quantum Hardware OEM Kansen",body:"IBM, IQM, Quantinuum zoeken allemaal naar manieren om hun hardware als 'green compute' te positioneren. QuantumMol levert de objectieve energiemeting die bewijst dat QPU voor bepaalde problemen 14.000× energiezuiniger is. Licentie de SDK aan de hardware OEMs."},
              ].map((c,i)=>(
                <div key={i} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:22}}>
                  <div style={{fontSize:15,fontWeight:700,marginBottom:10}}>{c.title}</div>
                  <div style={{fontSize:13,color:C.muted,lineHeight:1.7}}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── QUANTUM MRV ── */}
        {tab==="Quantum MRV" && (
          <div className="sec">
            <div className="slabel">// Quantum voor MolChain MRV</div>
            <div className="stitle">Quantum <em>versnelt</em><br/>de <span className="mol">verificatie</span></div>

            <div className="quc-grid">
              {[
                {algo:"QAOA",title:"Emissierouting Optimalisatie",
                  body:"Provincie A heeft een CO₂-overschot, Provincie B heeft een tekort. Optimale matching van credits over 12 provincies is een combinatorisch probleem (NP-hard voor klassieke computers). QAOA op een 50-qubit QPU lost dit op in O(√N) tijd vs O(N²) klassiek.",
                  speedup:"14.000× sneller dan GPU bij N>200 provincies"},
                {algo:"VQE",title:"Slag Carbonatie Moleculaire Simulatie",
                  body:"SmartSlag³ carbonatiereactie: CaO + CO₂ → CaCO₃. De exacte reactie-enthalpie en kinetiek kunnen worden gesimuleerd met VQE op 20-30 qubits — nauwkeuriger dan DFT-berekeningen op GPU, en relevant voor de exacte MOLCO₂-hoeveelheid per batch.",
                  speedup:"Exponentieel voor CaO-CO₂ Hamiltoniaan"},
                {algo:"Grover",title:"Dubbeltelling Detectie",
                  body:"MolChain's grootste risico: één ton CO₂ verkopen als 1.000 tokens op 5 verschillende registries. Grover's algoritme doorzoekt een database van N credits in O(√N) stappen — bij 10 miljoen credits is dit 3.162× sneller dan klassiek lineair zoeken.",
                  speedup:"3.162× sneller bij 10M credits"},
                {algo:"QML",title:"Anomalie-detectie in Emissiedata",
                  body:"Trainen van een Quantum Support Vector Machine (QSVM) op historische emissiepatronen. Detecteert fraude (bedrijven die emissies onderrapporteren) sneller dan klassieke ML — voor dezelfde accuraatheid ~4× minder trainingsdata nodig via quantum kernel methods.",
                  speedup:"4× minder trainingsdata nodig"},
                {algo:"HHL",title:"Provinciale Balans Matrix",
                  body:"Het oplossen van het lineaire stelsel Ax=b voor provinciaal stikstof-evenwicht (12 provincies, 200+ bronnen) is een sparse matrix probleem. HHL lost dit exponentieel sneller op dan klassieke methoden bij grote systemen — relevant voor dagelijkse AERIUS-updates.",
                  speedup:"Exponentieel voor sparse N>1000"},
                {algo:"QRNG",title:"Willekeurigheid voor MRV Audits",
                  body:"MolChain selecteert willekeurig welke emissie-claims worden gecontroleerd door derde-partij verificateurs. Quantum Random Number Generation (QRNG) via IBM Quantum levert bewezen ware willekeurigheid — niet algoritmisch voorspelbaar. Fraude-resistent audit protocol.",
                  speedup:"Cryptografisch sterker dan PRNG"},
              ].map((q,i)=>(
                <div key={i} className="quc-card">
                  <div className="quc-algo">{q.algo}</div>
                  <div className="quc-title">{q.title}</div>
                  <div className="quc-body">{q.body}</div>
                  <div className="quc-speedup">{q.speedup}</div>
                </div>
              ))}
            </div>

            <div style={{background:`${C.qpu}12`,border:`1px solid ${C.qpu}33`,
              borderRadius:14,padding:28,marginTop:32}}>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:C.qpu,
                letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>
                // TU Delft QuTech × MolChain — Onderzoeksagenda
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
                {[
                  {year:"2026",title:"Gate Energy Measurement",body:"Empirische metingen van gate-energieverbruik op QuTech SpinQ en IBM hardware. Eerste peer-reviewed publicatie: 'Joule-level accounting for quantum circuits'. NWO TTW subsidie aanvraag."},
                  {year:"2027",title:"QAOA voor Provinciale Routing",body:"Samenwerking TU Delft + MolChain: implementeer QAOA voor NL stikstof-evenwicht op 50-qubit hardware. Resultaten gepresenteerd op QIP 2027."},
                  {year:"2028",title:"Quantum Carbon Standard",body:"ISO werkgroep voorstel: 'Standard for Quantum Circuit Carbon Footprint Accounting'. MolChain als referentie-implementatie. Patent op EnergyProof NFT + XRPL bridge."},
                ].map((r,i)=>(
                  <div key={i}>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,
                      color:C.qpu,marginBottom:4}}>{r.year}</div>
                    <div style={{fontWeight:700,fontSize:14,marginBottom:6}}>{r.title}</div>
                    <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>{r.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CODE SDK ── */}
        {tab==="Code SDK" && (
          <div className="sec">
            <div className="slabel">// Open Source SDK</div>
            <div className="stitle"><em>quantummol</em><br/>Python <span className="mol">SDK</span></div>

            <div className="code">
              <div><span className="cm"># pip install quantummol</span></div>
              <div><span className="kw">from</span> quantummol <span className="kw">import</span> EnergyMeter, MolChainBridge, CircuitRunner</div>
              <div><span className="kw">from</span> qiskit <span className="kw">import</span> QuantumCircuit</div>
              <div></div>
              <div><span className="cm"># 1. Definieer een quantum circuit (Qiskit / OpenQASM)</span></div>
              <div>qc = QuantumCircuit(<span className="num">3</span>)</div>
              <div>qc.h(<span className="num">0</span>)  <span className="cm"># Hadamard gate</span></div>
              <div>qc.cx(<span className="num">0</span>, <span className="num">1</span>)  <span className="cm"># CNOT entanglement</span></div>
              <div>qc.t(<span className="num">2</span>)  <span className="cm"># T-gate</span></div>
              <div>qc.measure_all()</div>
              <div></div>
              <div><span className="cm"># 2. Selecteer backend met automatische energiemeting</span></div>
              <div>meter = EnergyMeter(</div>
              <div>  backend=<span className="str">"ibm_eagle"</span>,  <span className="cm"># of "gpu_h100" | "tpu_v4" | "cpu_epyc"</span></div>
              <div>  grid_co2_g_kwh=<span className="num">385</span>,  <span className="cm"># NL grid carbon intensity 2026</span></div>
              <div>  shots=<span className="num">1024</span></div>
              <div>)</div>
              <div></div>
              <div><span className="cm"># 3. Voer uit en meet energie automatisch</span></div>
              <div>result = CircuitRunner.run(qc, meter)</div>
              <div></div>
              <div>print(result.energy_J)        <span className="cm"># 4.07e-3 J</span></div>
              <div>print(result.co2_grams)       <span className="cm"># 4.35e-10 g CO₂</span></div>
              <div>print(result.molco2_tokens)   <span className="cm"># 9.88e-9 MOLCO₂</span></div>
              <div></div>
              <div><span className="cm"># 4. Bridge naar MolChain op XRPL</span></div>
              <div>bridge = MolChainBridge(</div>
              <div>  xrpl_wallet=<span className="str">"rHb9CJAWyB4rj9..."</span>,</div>
              <div>  molchain_contract=<span className="str">"rMolChain3xrpL..."</span></div>
              <div>)</div>
              <div></div>
              <div><span className="cm"># 5. Mint MOLCO₂ tokens + EnergyProof NFT</span></div>
              <div>nft = bridge.mint_energy_proof(result)</div>
              <div>print(nft.token_id)           <span className="cm"># 0x4A7FE2B9...</span></div>
              <div>print(nft.xrpl_tx_hash)       <span className="cm"># 3A8E21F0...</span></div>
              <div></div>
              <div><span className="cm"># 6. GPU equivalent meting (voor vergelijking)</span></div>
              <div>gpu_meter = EnergyMeter(backend=<span className="str">"gpu_h100"</span>, grid_co2_g_kwh=<span className="num">385</span>)</div>
              <div>gpu_result = CircuitRunner.simulate(qc, gpu_meter)</div>
              <div>print(gpu_result.energy_J)    <span className="cm"># 6.14e+1 J → 14.000× meer!</span></div>
            </div>

            <div className="code">
              <div><span className="cm"># Batch meting voor data center operators</span></div>
              <div><span className="kw">from</span> quantummol.datacenter <span className="kw">import</span> JobTracker</div>
              <div></div>
              <div>tracker = JobTracker(</div>
              <div>  <span className="cm"># CPU: Intel RAPL via /sys/class/powercap</span></div>
              <div>  cpu_rapl_path=<span className="str">"/sys/class/powercap/intel-rapl/intel-rapl:0"</span>,</div>
              <div>  <span className="cm"># GPU: NVIDIA NVML</span></div>
              <div>  gpu_nvml_uuid=<span className="str">"GPU-a3f7b2e1-..."</span>,</div>
              <div>  <span className="cm"># Automatische MolChain minting</span></div>
              <div>  auto_mint=<span className="kw">True</span>,</div>
              <div>  mint_threshold_molco2=<span className="num">0.001</span>  <span className="cm"># mint per 0.001 MOLCO₂ accumulatie</span></div>
              <div>)</div>
              <div></div>
              <div><span className="cm"># Track een GPU training job</span></div>
              <div><span className="kw">with</span> tracker.measure() <span className="kw">as</span> job:</div>
              <div>  train_my_model()  <span className="cm"># elke ML training job</span></div>
              <div></div>
              <div>print(job.kwh)           <span className="cm"># 2.34 kWh</span></div>
              <div>print(job.co2_kg)        <span className="cm"># 0.901 kg CO₂</span></div>
              <div>print(job.molco2_minted) <span className="cm"># 20.476 MOLCO₂ tokens op XRPL</span></div>
              <div>print(job.nft_id)        <span className="cm"># EnergyProof NFT ID</span></div>
            </div>

            <div style={{background:C.panel,border:`1px solid ${C.mol}44`,borderRadius:12,padding:24}}>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:C.mol,
                letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>
                // Ondersteunde Backends en Meetmethoden
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16}}>
                {[
                  {name:"IBM Quantum (QPU)",method:"IBM Runtime telemetry API v2",metric:"energy_consumed (J)",note:"Beschikbaar via ibm_runtime.RuntimeJob.metrics()"},
                  {name:"D-Wave QPU",method:"SAPI energy_objective endpoint",metric:"QPU access time × power",note:"Indirecte meting via QPU access time"},
                  {name:"IQM / QuTech",method:"Native hardware telemetry",metric:"Gate-level energy counters",note:"R&D samenwerking voor directe meting"},
                  {name:"NVIDIA GPU",method:"NVIDIA NVML (nvidiasmi)",metric:"Watt × seconds = Joule",note:"nvmlDeviceGetPowerUsage() op 1ms interval"},
                  {name:"Google TPU",method:"GCP Cloud Monitoring API",metric:"consumed_tpu_seconds × TDP",note:"metrics.googleapis.com/tpu/"},
                  {name:"Intel/AMD CPU",method:"Intel RAPL MSR registers",metric:"energy_uj counter (µJ)",note:"/sys/class/powercap/intel-rapl/"},
                ].map((b,i)=>(
                  <div key={i} style={{background:C.deep,borderRadius:8,padding:14}}>
                    <div style={{fontWeight:700,fontSize:13,color:C.cream,marginBottom:4}}>{b.name}</div>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.mol,marginBottom:2}}>{b.method}</div>
                    <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.gold,marginBottom:4}}>{b.metric}</div>
                    <div style={{fontSize:11,color:C.muted}}>{b.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      <div style={{background:C.panel,borderTop:`1px solid ${C.border}`,padding:"40px 24px",textAlign:"center"}}>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:20,letterSpacing:2}}>
          <span style={{color:C.qpu}}>Quantum</span><span style={{color:C.muted}}>Mol</span>
          <span style={{color:C.muted}}> × </span>
          <span style={{color:C.mol}}>MolChain</span>
          <span style={{color:C.muted}}> × </span>
          <span style={{color:"#2a9acc"}}>ANK</span>
          <span style={{color:C.muted}}> × </span>
          <span style={{color:C.gpu}}>SmartSlag³</span>
        </div>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:C.muted,marginTop:8,letterSpacing:2}}>
          VIRTUALV HOLDING B.V. — PRODUCT CONCEPT v1.0 — APRIL 2026
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";

const C = {
  bg: "#0b0f0e",
  panel: "#111815",
  border: "#1e2d28",
  green: "#0d6e4a",
  greenMid: "#1a9966",
  greenLight: "#c8f0e0",
  lime: "#7ecf5a",
  limeLight: "#edfde5",
  blue: "#1a6a9a",
  blueMid: "#2a9acc",
  blueLight: "#d0ecf8",
  gold: "#c8941a",
  goldLight: "#fdf3dc",
  nitrogen: "#8b5cf6",
  nitrogenLight: "#ede9fe",
  carbon: "#22c55e",
  carbonLight: "#dcfce7",
  cream: "#e8f0eb",
  muted: "#5a7a6a",
  white: "#f4f9f6",
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:${C.bg};color:${C.cream};font-family:'Syne',sans-serif;}
.mono{font-family:'IBM Plex Mono',monospace;}

.hero{
  min-height:88vh;
  background: radial-gradient(ellipse at 30% 50%, ${C.green}22 0%, transparent 60%),
              radial-gradient(ellipse at 80% 30%, ${C.blue}18 0%, transparent 50%),
              ${C.bg};
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:80px 24px;position:relative;overflow:hidden;
}
.hero-mol{
  position:absolute;font-size:320px;opacity:.04;
  top:50%;left:50%;transform:translate(-50%,-55%);
  font-family:'IBM Plex Mono',monospace;pointer-events:none;
  color:${C.greenMid};
}
.hero-eyebrow{
  font-family:'IBM Plex Mono',monospace;font-size:11px;
  letter-spacing:4px;text-transform:uppercase;
  color:${C.greenMid};margin-bottom:20px;position:relative;z-index:1;
}
.hero h1{
  font-size:clamp(64px,12vw,140px);font-weight:800;
  line-height:.88;letter-spacing:-3px;
  color:${C.white};margin-bottom:12px;position:relative;z-index:1;
}
.hero h1 em{color:${C.lime};font-style:normal;}
.hero h1 .co2{color:${C.carbon};}
.hero h1 .n{color:${C.nitrogen};}
.hero-sub{
  font-size:clamp(15px,2.2vw,20px);color:${C.muted};
  max-width:560px;line-height:1.6;margin:16px auto 48px;
  position:relative;z-index:1;
}
.hero-chips{
  display:flex;gap:10px;justify-content:center;flex-wrap:wrap;
  position:relative;z-index:1;margin-bottom:48px;
}
.chip{
  padding:6px 16px;border-radius:20px;
  font-family:'IBM Plex Mono',monospace;font-size:11px;
  letter-spacing:1px;border:1px solid;
}
.hero-numbers{display:flex;gap:48px;justify-content:center;flex-wrap:wrap;position:relative;z-index:1;}
.hero-num-val{font-size:42px;font-weight:800;line-height:1;}
.hero-num-label{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};}

.navbar{background:${C.panel};border-bottom:1px solid ${C.border};position:sticky;top:0;z-index:100;}
.nav-inner{max-width:1200px;margin:0 auto;padding:0 24px;display:flex;gap:0;overflow-x:auto;scrollbar-width:none;}
.nav-inner::-webkit-scrollbar{display:none;}
.nav-btn{padding:14px 18px;background:transparent;border:none;border-bottom:2px solid transparent;
  font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;
  color:${C.muted};cursor:pointer;white-space:nowrap;transition:all .2s;}
.nav-btn:hover{color:${C.cream};}
.nav-btn.active{color:${C.lime};border-bottom-color:${C.lime};}

.wrap{max-width:1200px;margin:0 auto;padding:0 24px;}
.sec{padding:80px 0;}
.sec-label{font-family:'IBM Plex Mono',monospace;font-size:10px;
  letter-spacing:4px;text-transform:uppercase;color:${C.greenMid};margin-bottom:12px;}
.sec-title{font-size:clamp(36px,5.5vw,64px);font-weight:800;line-height:.95;
  letter-spacing:-1px;margin-bottom:32px;}
.sec-title em{font-style:normal;color:${C.lime};}
.sec-title .n{color:${C.nitrogen};}

/* TOKEN CARDS */
.token-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:40px;}
.token-card{
  background:${C.panel};border:1px solid ${C.border};
  border-radius:16px;overflow:hidden;
}
.token-header{padding:28px;position:relative;}
.token-symbol{
  font-family:'IBM Plex Mono',monospace;font-size:48px;font-weight:500;
  line-height:1;margin-bottom:8px;
}
.token-name{font-size:20px;font-weight:700;margin-bottom:4px;}
.token-unit{font-family:'IBM Plex Mono',monospace;font-size:12px;color:${C.muted};}
.token-body{padding:0 28px 28px;}
.token-row{display:flex;justify-content:space-between;align-items:center;
  padding:10px 0;border-bottom:1px solid ${C.border};font-size:13px;}
.token-row:last-child{border-bottom:none;}
.token-key{color:${C.muted};}
.token-val{font-family:'IBM Plex Mono',monospace;font-size:12px;}

/* PROVINCE MAP */
.province-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:40px;}
.prov-card{
  background:${C.panel};border:1px solid ${C.border};border-radius:12px;
  padding:16px;cursor:pointer;transition:all .2s;
}
.prov-card:hover{border-color:${C.greenMid};transform:translateY(-2px);}
.prov-card.active{border-color:${C.lime};background:${C.green}22;}
.prov-name{font-weight:700;font-size:14px;margin-bottom:6px;}
.prov-n{font-family:'IBM Plex Mono',monospace;font-size:11px;color:${C.nitrogen};margin-bottom:2px;}
.prov-co2{font-family:'IBM Plex Mono',monospace;font-size:11px;color:${C.carbon};}
.prov-status{
  margin-top:8px;font-family:'IBM Plex Mono',monospace;font-size:9px;
  letter-spacing:2px;text-transform:uppercase;padding:3px 8px;
  border-radius:10px;display:inline-block;
}

/* MOL METER */
.mol-display{
  background:${C.panel};border:1px solid ${C.border};border-radius:16px;
  padding:40px;margin-bottom:40px;position:relative;overflow:hidden;
}
.mol-display::before{
  content:'mol';position:absolute;right:32px;top:24px;
  font-family:'IBM Plex Mono',monospace;font-size:120px;
  color:rgba(255,255,255,.03);font-weight:500;pointer-events:none;
}
.mol-big{
  font-family:'IBM Plex Mono',monospace;font-size:clamp(36px,7vw,72px);
  font-weight:500;line-height:1;margin-bottom:4px;
}
.mol-label{font-family:'IBM Plex Mono',monospace;font-size:11px;
  letter-spacing:3px;text-transform:uppercase;color:${C.muted};}
.mol-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:32px;}
.mol-item{background:rgba(255,255,255,.04);border-radius:8px;padding:16px;}
.mol-item-val{font-family:'IBM Plex Mono',monospace;font-size:20px;font-weight:500;margin-bottom:4px;}
.mol-item-label{font-family:'IBM Plex Mono',monospace;font-size:9px;
  letter-spacing:2px;text-transform:uppercase;color:${C.muted};}

/* COMPARISON TABLE */
.cmp-outer{overflow-x:auto;margin-bottom:48px;}
.cmp{width:100%;border-collapse:collapse;font-size:13px;min-width:900px;}
.cmp th{padding:14px 18px;font-family:'IBM Plex Mono',monospace;font-size:9px;
  letter-spacing:2px;text-transform:uppercase;text-align:left;font-weight:500;}
.cmp th.mol{background:${C.green};color:${C.lime};}
.cmp th:not(.mol){background:${C.panel};color:${C.muted};}
.cmp td{padding:12px 18px;border-bottom:1px solid ${C.border};color:${C.muted};vertical-align:middle;}
.cmp tr:hover td{background:rgba(255,255,255,.02);}
.cmp td:first-child{color:${C.cream};font-weight:600;font-size:12px;}
.cmp td.mol-col{background:${C.green}18;}
.badge-best{background:${C.lime};color:${C.bg};padding:2px 8px;border-radius:10px;
  font-family:'IBM Plex Mono',monospace;font-size:10px;white-space:nowrap;}
.badge-bad{background:${C.panel};color:${C.muted};padding:2px 8px;border-radius:10px;
  font-family:'IBM Plex Mono',monospace;font-size:10px;white-space:nowrap;border:1px solid ${C.border};}
.badge-ok{background:${C.gold}22;color:${C.gold};padding:2px 8px;border-radius:10px;
  font-family:'IBM Plex Mono',monospace;font-size:10px;white-space:nowrap;}

/* FLOW */
.flow-steps{display:flex;flex-direction:column;gap:2px;}
.flow-step{
  display:grid;grid-template-columns:60px 1fr auto;gap:24px;align-items:start;
  background:${C.panel};border:1px solid ${C.border};border-radius:12px;padding:24px;
  transition:border-color .2s;
}
.flow-step:hover{border-color:${C.greenMid};}
.flow-num{
  font-family:'IBM Plex Mono',monospace;font-size:32px;font-weight:500;
  color:${C.greenMid};line-height:1;
}
.flow-content-title{font-size:17px;font-weight:700;margin-bottom:6px;}
.flow-content-body{font-size:14px;color:${C.muted};line-height:1.7;}
.flow-badge{flex-shrink:0;text-align:right;}
.flow-layer{font-family:'IBM Plex Mono',monospace;font-size:10px;
  letter-spacing:2px;text-transform:uppercase;padding:4px 12px;border-radius:20px;}

/* MARKET */
.market-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.market-card{background:${C.panel};border:1px solid ${C.border};border-radius:12px;padding:24px;}
.market-card h4{font-size:16px;font-weight:700;margin-bottom:12px;}
.market-card p,.market-card li{font-size:14px;color:${C.muted};line-height:1.7;}
.market-card ul{padding-left:16px;}

/* TOKENOMICS */
.tok-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.tok-card{background:${C.panel};border:1px solid ${C.border};border-radius:12px;padding:24px;}
.tok-val{font-family:'IBM Plex Mono',monospace;font-size:24px;font-weight:500;margin-bottom:4px;}
.tok-label{font-size:12px;color:${C.muted};margin-bottom:12px;}
.tok-bar{height:6px;border-radius:3px;background:${C.border};margin-bottom:8px;overflow:hidden;}
.tok-bar-fill{height:100%;border-radius:3px;transition:width 1s ease;}
.tok-detail{font-family:'IBM Plex Mono',monospace;font-size:10px;color:${C.muted};}

/* SLAG SYNERGY */
.synergy-box{
  background:linear-gradient(135deg,${C.green}33,${C.blue}22);
  border:1px solid ${C.greenMid}55;border-radius:16px;padding:32px;margin-bottom:40px;
}

/* ROADMAP */
.roadmap-line{position:relative;padding-left:40px;}
.roadmap-line::before{content:'';position:absolute;left:12px;top:20px;bottom:0;
  width:2px;background:linear-gradient(${C.greenMid},${C.lime},${C.border});}
.rm-item{margin-bottom:36px;position:relative;}
.rm-dot{position:absolute;left:-34px;top:6px;width:18px;height:18px;
  border-radius:50%;border:3px solid ${C.bg};box-shadow:0 0 0 2px currentColor;}
.rm-phase{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:3px;
  text-transform:uppercase;margin-bottom:3px;}
.rm-title{font-size:20px;font-weight:700;margin-bottom:8px;}
.rm-body{font-size:14px;color:${C.muted};line-height:1.7;max-width:800px;}

@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
.pulse{animation:pulse 2s infinite;}

@media(max-width:768px){
  .token-grid,.market-grid,.tok-grid{grid-template-columns:1fr;}
  .province-grid{grid-template-columns:1fr 1fr;}
  .mol-grid{grid-template-columns:1fr 1fr;}
  .flow-step{grid-template-columns:40px 1fr;}
  .flow-badge{display:none;}
}
`;

const TABS = ["Concept","MolChain Token","Provincies","Markt","Vergelijking","SmartSlag Synergie","Roadmap"];

const PROVINCES = [
  {name:"Noord-Holland",n:"287 mol/ha/jr",co2:"1.2 Mt/jr",status:"Kritisch",color:"#e74c3c",phase:"Fase 1"},
  {name:"Zuid-Holland",n:"312 mol/ha/jr",co2:"2.8 Mt/jr",status:"Kritisch",color:"#e74c3c",phase:"Fase 1"},
  {name:"Utrecht",n:"241 mol/ha/jr",co2:"0.8 Mt/jr",status:"Kritisch",color:"#e74c3c",phase:"Fase 1"},
  {name:"Noord-Brabant",n:"198 mol/ha/jr",co2:"1.9 Mt/jr",status:"Hoog",color:C.gold,phase:"Fase 2"},
  {name:"Gelderland",n:"175 mol/ha/jr",co2:"1.1 Mt/jr",status:"Hoog",color:C.gold,phase:"Fase 2"},
  {name:"Overijssel",n:"163 mol/ha/jr",co2:"0.9 Mt/jr",status:"Matig",color:C.greenMid,phase:"Fase 3"},
  {name:"Friesland",n:"142 mol/ha/jr",co2:"0.7 Mt/jr",status:"Matig",color:C.greenMid,phase:"Fase 3"},
  {name:"Groningen",n:"138 mol/ha/jr",co2:"3.1 Mt/jr",status:"Hoog",color:C.gold,phase:"Fase 2"},
  {name:"Drenthe",n:"129 mol/ha/jr",co2:"0.4 Mt/jr",status:"Laag",color:C.blue,phase:"Fase 4"},
  {name:"Flevoland",n:"88 mol/ha/jr",co2:"0.3 Mt/jr",status:"Laag",color:C.blue,phase:"Fase 4"},
  {name:"Zeeland",n:"94 mol/ha/jr",co2:"0.6 Mt/jr",status:"Matig",color:C.greenMid,phase:"Fase 3"},
  {name:"Limburg",n:"156 mol/ha/jr",co2:"0.8 Mt/jr",status:"Hoog",color:C.gold,phase:"Fase 2"},
];

const CMP_DATA = [
  {cat:"Minimum eenheid",mol:"1 gram CO₂ / 1 mmol N",ets:"1 ton CO₂",vcs:"1 ton CO₂",gs:"1 ton CO₂",aerius:"1 mol N/ha/jr",prov:"Negotiated"},
  {cat:"On-chain registratie",mol:"best:XRPL volledig",ets:"bad:Centraal register",vcs:"bad:Verra centraal",gs:"bad:Gold Standard",aerius:"bad:AERIUS (overheid)",prov:"bad:Spreadsheet/email"},
  {cat:"Fractioneel verhandelbaar",mol:"best:Ja (tot 0.001g)",ets:"bad:Nee (min 1 EUA)",vcs:"bad:Nee (min 1 VCU)",gs:"bad:Nee (min 1 VER)",aerius:"bad:Nee",prov:"bad:Nee"},
  {cat:"Real-time prijs",mol:"best:DEX on XRPL",ets:"ok:ICE/EEX beurs",vcs:"bad:OTC broker",gs:"bad:OTC broker",aerius:"bad:Geen markt",prov:"bad:Geen markt"},
  {cat:"Verificatie methode",mol:"best:IoT + AI + MRV",ets:"ok:Installatie-audit",vcs:"ok:3rd party audit",gs:"ok:3rd party audit",aerius:"ok:AERIUS calc",prov:"bad:Politiek besluit"},
  {cat:"Transparantie",mol:"best:100% on-chain",ets:"ok:Publiek register",vcs:"bad:Beperkt",gs:"bad:Beperkt",aerius:"ok:Publiek",prov:"bad:Ondoorzichtig"},
  {cat:"Toegankelijkheid",mol:"best:€1 minimum",ets:"bad:Institutioneel",vcs:"bad:Institutioneel",gs:"bad:Institutioneel",aerius:"bad:Overheid",prov:"bad:Lobby vereist"},
  {cat:"Settlementssnelheid",mol:"best:3-5 sec (XRPL)",ets:"bad:T+2 clearing",vcs:"bad:Weken",gs:"bad:Weken",aerius:"bad:Maanden",prov:"bad:Jaren"},
  {cat:"Retail deelname",mol:"best:Ja",ets:"bad:Nee",vcs:"bad:Nee",gs:"bad:Nee",aerius:"bad:Nee",prov:"bad:Nee"},
  {cat:"SmartSlag integratie",mol:"best:Directe CO₂/N data",ets:"bad:Nee",vcs:"ok:Mogelijk",gs:"ok:Mogelijk",aerius:"bad:Nee",prov:"bad:Nee"},
  {cat:"Cross-border EU",mol:"best:Ja (XRPL global)",ets:"ok:EU-27 only",vcs:"ok:Globaal",gs:"ok:Globaal",aerius:"bad:NL only",prov:"bad:Provincie only"},
  {cat:"Dubbeltelling preventie",mol:"best:On-chain atomisch",ets:"ok:EU register",vcs:"ok:Verra DB",gs:"ok:GS DB",aerius:"bad:Handmatig",prov:"bad:Geen systeem"},
];

function renderBadge(val){
  if(!val) return <span style={{color:C.muted}}>—</span>;
  if(val.startsWith("best:")) return <span className="badge-best">{val.slice(5)}</span>;
  if(val.startsWith("bad:")) return <span className="badge-bad">{val.slice(4)}</span>;
  if(val.startsWith("ok:")) return <span className="badge-ok">{val.slice(3)}</span>;
  return <span style={{color:C.cream,fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>{val}</span>;
}

function MolCounter(){
  const [val, setVal] = useState(0);
  const [running, setRunning] = useState(true);
  const ref = useRef(null);
  useEffect(()=>{
    if(!running) return;
    const iv = setInterval(()=>{
      setVal(v => v + Math.random() * 0.000847);
    }, 200);
    return ()=>clearInterval(iv);
  },[running]);

  return (
    <div className="mol-display">
      <div style={{display:"flex",alignItems:"flex-end",gap:16,marginBottom:24}}>
        <div>
          <div className="mol-big" style={{color:C.carbon}}>
            {val.toFixed(6)}
            <span style={{fontSize:"40%",marginLeft:8,color:C.muted}}>mol CO₂</span>
          </div>
          <div className="mol-label">Live tokens gegenereerd deze sessie</div>
        </div>
        <button
          onClick={()=>setRunning(r=>!r)}
          style={{background:running?C.green:C.border,border:"none",color:C.cream,
            padding:"8px 16px",borderRadius:8,fontFamily:"'IBM Plex Mono',monospace",
            fontSize:11,cursor:"pointer",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}
        >
          {running?"⏸ Pauzeer":"▶ Start"}
        </button>
      </div>
      <div className="mol-grid">
        {[
          {label:"mol → gram CO₂",val:`${(val*44.01).toFixed(4)} g`},
          {label:"Token waarde (@€12/t)",val:`€${(val*44.01/1000000*12).toFixed(6)}`},
          {label:"Equivalent N (mol)",val:`${(val*0.156).toFixed(6)} mol N`},
          {label:"XRPL transacties",val:`${Math.floor(val*1000)}`},
        ].map((m,i)=>(
          <div key={i} className="mol-item">
            <div className="mol-item-val" style={{color:i===1?C.lime:i===2?C.nitrogen:C.cream}}>{m.val}</div>
            <div className="mol-item-label">{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:20,fontFamily:"'IBM Plex Mono',monospace",fontSize:11,
        color:C.muted,lineHeight:1.8,borderTop:`1px solid ${C.border}`,paddingTop:16}}>
        <span style={{color:C.greenMid}}>MOLCHAIN ENGINE:</span> 1 MOLCO2 = 1 mmol CO₂ (0.044 gram) · 
        1 MOLN = 1 mmol N (0.014 gram) · Beide tokens op XRPL · 
        Atomische dubbeltelling-preventie via on-chain registry · 
        Brug naar EU ETS via Art. 6 Paris Agreement offsets
      </div>
    </div>
  );
}

export default function App(){
  const [tab, setTab] = useState("Concept");
  const [selectedProv, setSelectedProv] = useState(null);

  return(
    <div>
      <style>{css}</style>

      {/* HERO */}
      <div className="hero">
        <div className="hero-mol">mol</div>
        <div className="hero-eyebrow">// MolChain — VirtualV Holding B.V. — Europese Emissieregistratie op Blockchain</div>
        <h1>
          <span className="co2">CO₂</span><br/>
          <span className="n">N</span><br/>
          <em>on chain.</em>
        </h1>
        <p className="hero-sub">
          Het eerste Europese platform dat CO₂ en stikstof registreert op gram- en molniveau, 
          verhandelbaar maakt als crypto-tokens, en provinciale markten transparant transformeert.
        </p>
        <div className="hero-chips">
          {[
            {t:"MOLCO2 Token",c:C.carbon,bc:`${C.carbon}33`},
            {t:"MOLN Token",c:C.nitrogen,bc:`${C.nitrogen}33`},
            {t:"XRPL Settlement",c:C.greenMid,bc:`${C.greenMid}33`},
            {t:"12 Provincies NL",c:C.gold,bc:`${C.gold}33`},
            {t:"EU ETS Compatible",c:C.blueMid,bc:`${C.blueMid}33`},
            {t:"SmartSlag³ Feed",c:C.lime,bc:`${C.lime}33`},
          ].map((c,i)=>(
            <div key={i} className="chip" style={{color:c.c,background:c.bc,borderColor:c.c+'44'}}>
              {c.t}
            </div>
          ))}
        </div>
        <div className="hero-numbers">
          {[
            {val:<><span style={{color:C.carbon}}>158</span></>,label:"Mt CO₂/jaar NL"},
            {val:<><span style={{color:C.nitrogen}}>€4.2B</span></>,label:"Stikstofmarkt NL"},
            {val:<><span style={{color:C.lime}}>€820B</span></>,label:"EU ETS marktcap"},
            {val:<><span style={{color:C.gold}}>0.001g</span></>,label:"Minimale registratie"},
          ].map((n,i)=>(
            <div key={i} style={{textAlign:"center"}}>
              <div className="hero-num-val">{n.val}</div>
              <div className="hero-num-label">{n.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* NAV */}
      <div className="navbar">
        <div className="nav-inner">
          {TABS.map(t=>(
            <button key={t} className={`nav-btn ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div className="wrap">

        {/* CONCEPT */}
        {tab==="Concept" && (
          <div className="sec">
            <div className="sec-label">// Het Grote Idee</div>
            <div className="sec-title">De <em>onzichtbare</em><br/>markt <em>zichtbaar</em> maken</div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:40}}>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:16,padding:32}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.muted,
                  letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>Het Probleem</div>
                <div style={{fontSize:18,fontWeight:700,marginBottom:16,lineHeight:1.3}}>
                  CO₂ en stikstofhandel is nu een besloten,<br/>ondoorzichtig, politiek spel
                </div>
                {[
                  "🏛️ Provincies verdelen stikstofruimte via lobby — geen transparante markt",
                  "📊 EU ETS minimum = 1 ton CO₂ — te groot voor MKB en particulieren",
                  "🕰️ Transacties duren weken, soms maanden via bureaucratie",
                  "🔍 Dubbeltelling van credits is systemisch probleem in vrijwillige markt",
                  "💶 Geen toegang voor retail investeerders of kleine ondernemers",
                  "📍 Geen gram-precisie: miljoenen tonnen CO₂ worden 'afgerond' weg",
                ].map((i,j)=>(
                  <div key={j} style={{fontSize:14,color:C.muted,padding:"8px 0",
                    borderBottom:`1px solid ${C.border}`,lineHeight:1.5}}>{i}</div>
                ))}
              </div>
              <div style={{background:`linear-gradient(135deg,${C.green}22,${C.blue}11)`,
                border:`1px solid ${C.greenMid}44`,borderRadius:16,padding:32}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.greenMid,
                  letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>MolChain Oplossing</div>
                <div style={{fontSize:18,fontWeight:700,marginBottom:16,lineHeight:1.3}}>
                  Gram- en molprecisie, volledig<br/>transparant, real-time verhandelbaar
                </div>
                {[
                  "⚗️ 1 MOLCO2 = 1 mmol CO₂ (0.044g) — kleinste verhandelbare eenheid ter wereld",
                  "🔗 XRPL on-chain registratie: iedere gram CO₂ of mmol N heeft eigen blockchain-ID",
                  "⚡ Settlement in 3-5 seconden — niet 3-5 weken",
                  "🛡️ Atomische dubbeltelling-preventie: tokens verbrand bij gebruik",
                  "👥 Retail vanaf €0.01 via MolChain app — geen institutionele toegang vereist",
                  "🌍 EU Art. 6 Paris Agreement bridge: provinciale credits → internationaal verhandelbaar",
                ].map((i,j)=>(
                  <div key={j} style={{fontSize:14,color:C.cream,padding:"8px 0",
                    borderBottom:`1px solid ${C.border}44`,lineHeight:1.5}}>{i}</div>
                ))}
              </div>
            </div>

            {/* FLOW */}
            <div className="sec-label" style={{marginBottom:16}}>// Van Uitstoot tot Token — de Keten</div>
            <div className="flow-steps">
              {[
                {num:"01",title:"IoT + AI Meting",body:"Sensoren (CO₂-meters, NH₃-sensoren bij stallen/industrie) sturen gram-precisie data naar MolChain Oracle. AI valideert de meting via satellietbeelden (Sentinel-2), weerdata en sector-benchmarks.",layer:"Data Layer",layerColor:C.blue},
                {num:"02",title:"MRV Verificatie",body:"Monitoring, Reporting, Verification protocol op basis van ISO 14064-1 en IPCC-methodologie. Derde partij (TNO, VITO, of gedecentraliseerde validators) bevestigt de meting. Resultaat: gecertificeerde mol-hoeveelheid.",layer:"Verification",layerColor:C.gold},
                {num:"03",title:"On-Chain Mint op XRPL",body:"Na verificatie worden MOLCO2 of MOLN tokens gemint op de XRPL (XRP Ledger). Elke token bevat metadata: locatie, tijdstamp, verificateur, methodologie-ID, bron (industrie/landbouw/natuur). Onveranderlijk.",layer:"Token Layer",layerColor:C.greenMid},
                {num:"04",title:"Provinciale Registratie",body:"Token wordt gekoppeld aan het provinciale AERIUS-equivalent via een MolChain Bridge Smart Contract. Provincies kunnen MolChain adopteren als hun officiële digitale register — of MolChain parallelliseert als schaduwregister dat druk uitoefent.",layer:"Registry",layerColor:C.nitrogen},
                {num:"05",title:"DEX Handel op XRPL",body:"Tokens verhandelbaar op XRPL native DEX (AMM). Prijs gevormd door vraag/aanbod. Cross-pair: MOLCO2/RLUSD, MOLN/EUR, MOLCO2/MOLN (CO₂-N ratio trading). Liquidity pools via ANK Industrial Bond leden.",layer:"Market",layerColor:C.lime},
                {num:"06",title:"Gebruik / Retirement",body:"Bij compensatie (bedrijf gebruikt credit): token wordt verbrand (Retired). On-chain bewijs van compensatie beschikbaar als NFT-certificaat. EU ETS bridge: batch conversie 1.000 mmol MOLCO2 → 0.044 kg → bruikbaar in EU compliance.",layer:"Settlement",layerColor:C.carbon},
              ].map((s,i)=>(
                <div key={i} className="flow-step">
                  <div className="flow-num">{s.num}</div>
                  <div>
                    <div className="flow-content-title">{s.title}</div>
                    <div className="flow-content-body">{s.body}</div>
                  </div>
                  <div className="flow-badge">
                    <span className="flow-layer" style={{background:s.layerColor+'22',color:s.layerColor,border:`1px solid ${s.layerColor}44`}}>
                      {s.layer}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TOKEN */}
        {tab==="MolChain Token" && (
          <div className="sec">
            <div className="sec-label">// Token Architectuur</div>
            <div className="sec-title">MOLCO2 &amp; MOLN<br/><em>gram-precisie</em> tokens</div>

            <MolCounter/>

            <div className="token-grid">
              {[
                {
                  symbol:"MOLCO₂",name:"Carbon Offset Token",unit:"1 token = 1 mmol CO₂ = 0.044 gram",
                  color:C.carbon,bg:`${C.carbon}18`,
                  rows:[
                    ["Bron","Industriële uitstoot, Landbouw, Transport"],
                    ["Verificatie","ISO 14064-1 + AI Oracle"],
                    ["XRPL Contract","Fungible Token (FT) + NFT Metadata"],
                    ["Prijsbenchmark","€0.00053 / token (@€12/ton CO₂)"],
                    ["Minimum trade","0.001 MOLCO₂ = 0.000044g CO₂"],
                    ["Burn mechanisme","Retirement = on-chain burn + NFT cert"],
                    ["EU ETS bridge","22.727 MOLCO₂ = 1 EUA (1 ton CO₂)"],
                    ["Paris Art. 6","Corresponding Adjustment automatisch"],
                  ]
                },
                {
                  symbol:"MOLN",name:"Nitrogen Credit Token",unit:"1 token = 1 mmol N = 0.014 gram",
                  color:C.nitrogen,bg:`${C.nitrogen}18`,
                  rows:[
                    ["Bron","Landbouw (NH₃), Industrie, Verkeer"],
                    ["Verificatie","AERIUS-compatible + IoT sensor"],
                    ["XRPL Contract","Fungible Token (FT) + GPS-metadata"],
                    ["Prijsbenchmark","€0.25–€4.00 / token (marktbeprijzing)"],
                    ["Minimum trade","0.001 MOLN = 0.000014g N"],
                    ["Provinciale koppeling","Per token: provincie + Natura2000 gebied"],
                    ["Bouwpermit bridge","X MOLN = Y m² bouwvergunningsruimte"],
                    ["Wet Vban ready","Toekomstbestendig voor Wet Vban 2025+"],
                  ]
                },
              ].map((t,i)=>(
                <div key={i} className="token-card">
                  <div className="token-header" style={{background:t.bg}}>
                    <div className="token-symbol" style={{color:t.color,fontFamily:"'IBM Plex Mono',monospace"}}>{t.symbol}</div>
                    <div className="token-name">{t.name}</div>
                    <div className="token-unit mono" style={{color:t.color}}>{t.unit}</div>
                  </div>
                  <div className="token-body">
                    {t.rows.map(([k,v],j)=>(
                      <div key={j} className="token-row">
                        <span className="token-key">{k}</span>
                        <span className="token-val" style={{textAlign:"right",maxWidth:240}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{marginTop:32}}>
              <div className="sec-label" style={{marginBottom:16}}>// Tokenomics & Supply Model</div>
              <div className="tok-grid">
                {[
                  {val:"∞",label:"Max supply (real-world backed)",detail:"Supply = actieve emissies. Geen speculatieve pre-mine.",color:C.greenMid,pct:100},
                  {val:"100%",label:"Asset-backed",detail:"Elke token = geverifieerde fysieke CO₂ of N mol. Geen fractional reserve.",color:C.lime,pct:100},
                  {val:"0%",label:"Pre-mine / founder allocation",detail:"Nul tokens worden vooraf aangemaakt. MolChain verdient via minting fees.",color:C.carbon,pct:0},
                  {val:"0.1%",label:"Minting fee (voor registry)",detail:"Per minting-event. Betaald door de emittent (bedrijf/boer/overheid).",color:C.gold,pct:10},
                  {val:"0.05%",label:"Trading fee (DEX AMM)",detail:"Per XRPL DEX trade. Naar MolChain treasury + liquidity providers.",color:C.blueMid,pct:5},
                  {val:"1 cent",label:"Minimum investering retail",detail:"Democratische toegang: €0.01 = ~19 MOLCO₂ tokens.",color:C.nitrogen,pct:1},
                ].map((t,i)=>(
                  <div key={i} className="tok-card">
                    <div className="tok-val" style={{color:t.color}}>{t.val}</div>
                    <div className="tok-label">{t.label}</div>
                    <div className="tok-bar">
                      <div className="tok-bar-fill" style={{width:`${t.pct}%`,background:t.color}}/>
                    </div>
                    <div className="tok-detail">{t.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PROVINCIES */}
        {tab==="Provincies" && (
          <div className="sec">
            <div className="sec-label">// Provinciale Markt Strategie</div>
            <div className="sec-title">12 Provincies.<br/>Eén <em>transparante</em> markt.</div>

            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:16,
              padding:24,marginBottom:32,fontFamily:"'IBM Plex Mono',monospace",fontSize:13,lineHeight:1.8}}>
              <div style={{color:C.greenMid,fontSize:10,letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>
                // De Stikstofcrisis als Marktopportuniteit
              </div>
              <div style={{color:C.muted}}>
                De PAS-uitspraak (Raad van State, 2019) maakte de bestaande stikstofregeling ongeldig. 
                Sindsdien verdelen provincies <span style={{color:C.cream}}>stikstofruimte (mol N/ha/jaar)</span> voor bouwprojecten
                via een combinatie van politiek overleg, lobby en informele handel. 
                Er is <span style={{color:C.cream}}>geen transparante markt</span>. 
                MolChain introduceert die markt — bottom-up, ongeacht of de overheid meedoet.
              </div>
            </div>

            <div className="province-grid">
              {PROVINCES.map((p,i)=>(
                <div key={i}
                  className={`prov-card ${selectedProv===i?"active":""}`}
                  onClick={()=>setSelectedProv(selectedProv===i?null:i)}
                >
                  <div className="prov-name">{p.name}</div>
                  <div className="prov-n">N: {p.n}</div>
                  <div className="prov-co2">CO₂: {p.co2}</div>
                  <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                    <span className="prov-status" style={{background:p.color+'22',color:p.color}}>
                      {p.status}
                    </span>
                    <span className="prov-status" style={{background:C.border,color:C.muted}}>
                      {p.phase}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {selectedProv !== null && (
              <div style={{background:C.panel,border:`1px solid ${C.greenMid}`,borderRadius:12,padding:24,marginBottom:24}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:C.greenMid,
                  letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>
                  // {PROVINCES[selectedProv].name} — Detail
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
                  {[
                    {label:"Stikstof depositie",val:PROVINCES[selectedProv].n,color:C.nitrogen},
                    {label:"CO₂ uitstoot",val:PROVINCES[selectedProv].co2,color:C.carbon},
                    {label:"MolChain fase",val:PROVINCES[selectedProv].phase,color:C.lime},
                  ].map((d,j)=>(
                    <div key={j}>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                        color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{d.label}</div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,
                        fontWeight:500,color:d.color}}>{d.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="market-grid">
              {[
                {title:"🚀 Go-to-Market: Schaduwregister eerst",body:[
                  "MolChain start als vrijwillig register naast AERIUS — geen toestemming nodig van provincies",
                  "Fase 1: Noord-Holland + Utrecht + Zuid-Holland (hoogste N-druk, meeste bouwdruk)",
                  "Target: 50 bouwbedrijven als eerste klanten (€500/maand abonnement voor N-credits)",
                  "Bewijs: MolChain-data is nauwkeuriger dan AERIUS — politiek argument voor adoptie",
                  "Fase 2: Provincie als officieel register adopteert MolChain API (B2G sales)",
                ]},
                {title:"⚖️ Regulatoire Positie",body:[
                  "Vrijwillige carbon/N-markt: geen licentie vereist voor handelsplatform",
                  "MiCA: MOLCO2/MOLN zijn utility tokens (geen financieel instrument) — CASP nodig",
                  "Bij provinciaal gebruik: aanbesteding via EU-richtlijn 2014/24/EU",
                  "Art. 6 Paris Agreement: Corresponding Adjustment vereist staatsbetrokkenheid",
                  "Wet Vban (2025): voorziet expliciet in digitale stikstofhandel — MolChain is ready",
                ]},
                {title:"💰 Businessmodel Provinciale Markt",body:[
                  "SaaS aan provincies: €25K–200K/jaar per provincie voor API-toegang",
                  "Transactiefee op MOLN-handel: 0.1% per trade",
                  "Bouwbedrijven: abonnement €199–999/maand voor N-portfolio beheer",
                  "Data verkoop (geanonimiseerd, B2B): emissiepatronen aan beleidsmakers",
                  "IPO/token sale: zodra 3+ provincies geadopteerd hebben",
                ]},
                {title:"🏛️ De Lobby-Strategie omzeilen",body:[
                  "MolChain heeft geen lobby nodig: transparantie is het product",
                  "Publiceer ALLE provinciale N-transacties on-chain → journalisten en NGO's zijn jouw PR",
                  "Milieudefensie, Natuur & Milieu als natural allies: MolChain = hun controletool",
                  "Politieke ingang: CDA/VVD-provinciebestuurders willen efficiëntie, D66/GL willen transparantie",
                  "Europees: DG CLIMA is actief op zoek naar granulaire registratiesystemen",
                ]},
              ].map((c,i)=>(
                <div key={i} className="market-card">
                  <h4>{c.title}</h4>
                  <ul>{c.body.map((b,j)=><li key={j}>{b}</li>)}</ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MARKT */}
        {tab==="Markt" && (
          <div className="sec">
            <div className="sec-label">// Marktanalyse</div>
            <div className="sec-title">€820B EU ETS<br/><em>+</em> €4.2B stikstof<br/><em>+</em> €850B VCM</div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20,marginBottom:40}}>
              {[
                {name:"EU ETS",size:"€820B",cagr:"+8.2%",min:"1 ton = ~€64",players:"~500 bedrijven",molchain:"0.044g minimum",color:C.blueMid},
                {name:"Vrijwillige Carbon Markt",size:"€2B → €50B",cagr:"+23% CAGR",min:"1 ton VCU = €8–15",players:"Onbeperkt",molchain:"0.001g minimum",color:C.carbon},
                {name:"NL Stikstofmarkt",size:"€4.2B/jr",cagr:"Crisis-gedreven",min:"Geen formele markt",players:"12 provincies",molchain:"1 mmol N",color:C.nitrogen},
              ].map((m,i)=>(
                <div key={i} style={{background:C.panel,border:`1px solid ${m.color}44`,borderRadius:12,padding:24}}>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:m.color,
                    letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>{m.name}</div>
                  <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:28,fontWeight:500,
                    color:m.color,marginBottom:4}}>{m.size}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
                    {[["CAGR",m.cagr],["Min. eenheid",m.min],["Deelnemers",m.players],["MolChain min.",m.molchain]].map(([k,v],j)=>(
                      <div key={j} style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                        <span style={{color:C.muted}}>{k}</span>
                        <span style={{fontFamily:"'IBM Plex Mono',monospace",color:C.cream}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="sec-label" style={{marginBottom:16}}>// Financiële Projectie MolChain</div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:40}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead>
                  <tr>
                    {["Inkomstenstroom","2026","2027","2028","2029","2030"].map((h,i)=>(
                      <th key={i} style={{padding:"12px 16px",background:i===0?C.panel:C.green,
                        color:i===0?C.muted:C.lime,fontFamily:"'IBM Plex Mono',monospace",
                        fontSize:10,letterSpacing:2,textTransform:"uppercase",textAlign:"left"}}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Minting fees (0.1%)","€12K","€85K","€380K","€1.2M","€4.8M"],
                    ["Trading fees (0.05% DEX)","€4K","€45K","€220K","€900K","€3.6M"],
                    ["Provinciale SaaS","€0","€50K","€250K","€600K","€1.5M"],
                    ["Bouwbedrijf abonnement","€15K","€120K","€480K","€1.1M","€2.4M"],
                    ["Data API (B2B)","€0","€20K","€80K","€240K","€720K"],
                    ["TOTAAL","€31K","€320K","€1.41M","€4.04M","€13.02M"],
                  ].map((r,i)=>(
                    <tr key={i} style={i===5?{borderTop:`2px solid ${C.greenMid}`}:{}}>
                      <td style={{padding:"11px 16px",color:i===5?C.cream:C.muted,
                        fontWeight:i===5?700:400,borderBottom:`1px solid ${C.border}`}}>
                        {r[0]}
                      </td>
                      {r.slice(1).map((v,j)=>(
                        <td key={j} style={{padding:"11px 16px",fontFamily:"'IBM Plex Mono',monospace",
                          color:i===5?(j===4?C.lime:C.greenMid):C.muted,
                          fontWeight:i===5?700:400,
                          borderBottom:`1px solid ${C.border}`}}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VERGELIJKING */}
        {tab==="Vergelijking" && (
          <div className="sec">
            <div className="sec-label">// Competitief Landschap</div>
            <div className="sec-title">MolChain vs.<br/><em>de incumbents</em></div>
            <div className="cmp-outer">
              <table className="cmp">
                <thead>
                  <tr>
                    <th style={{background:C.panel,color:C.muted,minWidth:200}}>Criterium</th>
                    <th className="mol">⚗ MolChain</th>
                    <th>🇪🇺 EU ETS</th>
                    <th>🌿 Verra VCS</th>
                    <th>⭐ Gold Standard</th>
                    <th>🇳🇱 AERIUS</th>
                    <th>🏛️ Provinciaal</th>
                  </tr>
                </thead>
                <tbody>
                  {CMP_DATA.map((row,i)=>(
                    <tr key={i}>
                      <td style={{color:C.cream,fontWeight:600,fontSize:12,
                        borderRight:`1px solid ${C.border}`}}>{row.cat}</td>
                      <td className="mol-col">{renderBadge(row.mol)}</td>
                      <td>{renderBadge(row.ets)}</td>
                      <td>{renderBadge(row.vcs)}</td>
                      <td>{renderBadge(row.gs)}</td>
                      <td>{renderBadge(row.aerius)}</td>
                      <td>{renderBadge(row.prov)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SMARTSLAG SYNERGIE */}
        {tab==="SmartSlag Synergie" && (
          <div className="sec">
            <div className="sec-label">// Directe Verbinding</div>
            <div className="sec-title">SmartSlag³<br/><em>is</em> MolChain's<br/>eerste klant</div>

            <div className="synergy-box">
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.greenMid,
                letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>
                // Directe Synergie: SmartSlag³ genereert verifieerbare CO₂ en N-credits
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:24}}>
                {[
                  {icon:"⚗",title:"BOF Slag Carbonatie",val:"~8.2 kg CO₂/ton slag",desc:"Calciumoxiden in BOF slag reageren met atmosferische CO₂. Per ton verwerkende slag: ~186 mol CO₂ permanent gebonden. Dit zijn directe MOLCO₂ tokens.",color:C.carbon},
                  {icon:"🌱",title:"Si-K Biostimulant",val:"~2.4 kg N/ton product",desc:"Silicium-kalium biostimulant verhoogt gewasopname van bodemstikstof, reduceert benodigde kunstmest. Per hectare pioenen: ~171 mol N besparing = MOLN tokens.",color:C.nitrogen},
                  {icon:"♻",title:"IJzerconcentraat",val:"~1.1 kg CO₂eq/ton",desc:"Gerecycleerd ijzer vervangt primaire productie. Scope 3 vermijding per ton Fe-concentraat: ~25 mol CO₂eq. Elk ton ijzerconcentraat = 25 MOLCO₂.",color:C.lime},
                ].map((s,i)=>(
                  <div key={i} style={{background:"rgba(0,0,0,.3)",borderRadius:12,padding:20}}>
                    <div style={{fontSize:28,marginBottom:8}}>{s.icon}</div>
                    <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{s.title}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:16,
                      color:s.color,marginBottom:8}}>{s.val}</div>
                    <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:40}}>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:24}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.greenMid,
                  letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>
                  // Jaar 5 SmartSlag³ Credit Productie
                </div>
                {[
                  ["BOF slag input","50 ton/dag × 350 dagen = 17.500 ton/jaar"],
                  ["CO₂ carbonatie","17.500 × 186 mol = 3.255.000 mol CO₂"],
                  ["MOLCO₂ tokens","3.255.000 tokens @ €0.00053 = €1.725/jaar"],
                  ["Si-K N-besparing","50.000 L × 171 mol/ha = variabel"],
                  ["MOLN tokens","Afhankelijk van agrarische klanten"],
                  ["IJzer CO₂ vermijding","3.500 ton × 25 mol = 87.500 MOLCO₂"],
                  ["Totale credit waarde","~€50K–250K/jaar (bij €12–60/ton)"],
                ].map(([k,v],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",
                    padding:"8px 0",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                    <span style={{color:C.muted}}>{k}</span>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",color:C.cream,
                      textAlign:"right",maxWidth:220}}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:24}}>
                <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.nitrogen,
                  letterSpacing:3,textTransform:"uppercase",marginBottom:16}}>
                  // WBSO Synergy: MolChain R&D
                </div>
                <div style={{fontSize:14,color:C.muted,lineHeight:1.8}}>
                  MolChain's IoT-sensor integratie en AI-verificatiealgoritmen kwalificeren 
                  als <span style={{color:C.cream}}>WBSO S&O-werkzaamheden</span> onder EHMAC B.V. 
                  of een nieuw op te richten <span style={{color:C.cream}}>MolChain B.V.</span> 
                  (100% dochter VirtualV Holding).<br/><br/>
                  Gecombineerde WBSO-grondslag EHMAC + SmartSlag + MolChain: potentieel 
                  <span style={{color:C.lime}}> €150K–200K/jaar S&O-kosten</span> = 
                  <span style={{color:C.lime}}> €54K–72K WBSO-voordeel</span> bij 36%.<br/><br/>
                  <span style={{color:C.green}}>Innovatiebox</span>: winsten uit MolChain-patenten 
                  (verificatie-algoritme, XRPL bridge smart contract) belast tegen 9% VpB.
                </div>
              </div>
            </div>

            {/* VirtualV Group map */}
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:16,padding:32}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.greenMid,
                letterSpacing:3,textTransform:"uppercase",marginBottom:20}}>
                // VirtualV Holding — Volledig Ecosysteem 2030
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,flexWrap:"wrap"}}>
                {[
                  {name:"VirtualV Holding B.V.",role:"100% moeder",color:C.gold,icon:"🏛"},
                  {name:"EHMAC B.V.",role:"Data consultancy",color:C.greenMid,icon:"💼"},
                  {name:"Slag B.V.",role:"SmartSlag³ fabriek",color:C.carbon,icon:"⚗"},
                  {name:"ANK Coöp. U.A.",role:"Fintech + Remit",color:"#2a9acc",icon:"⚓"},
                  {name:"MolChain B.V.",role:"CO₂/N Registry",color:C.lime,icon:"🌿"},
                  {name:"Slakkenspoor VOF",role:"Agri + Tata MOU",color:C.nitrogen,icon:"🌾"},
                ].map((e,i)=>(
                  <div key={i} style={{background:`${e.color}15`,border:`1px solid ${e.color}44`,
                    borderRadius:10,padding:"12px 16px",textAlign:"center",minWidth:140}}>
                    <div style={{fontSize:24,marginBottom:4}}>{e.icon}</div>
                    <div style={{fontSize:12,fontWeight:700,color:e.color,marginBottom:2}}>{e.name}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.muted}}>{e.role}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ROADMAP */}
        {tab==="Roadmap" && (
          <div className="sec">
            <div className="sec-label">// Uitvoeringsplan</div>
            <div className="sec-title">Van schaduw-<br/>register naar<br/><em>Europese standaard</em></div>

            <div className="roadmap-line">
              {[
                {phase:"Q2–Q3 2026",dot:C.greenMid,title:"Fundament: MolChain B.V. + XRPL Registry",
                  body:"MolChain B.V. opgericht onder VirtualV Holding B.V. XRPL fungible token contracts MOLCO₂ en MOLN gedeployed op mainnet. Eerste minting: SmartSlag³ carbonatie-data (handmatig, WBSO-gedocumenteerd). Schaduwregister live met IoT sensor koppeling Zuiddijk 103 lab. Target: 1 miljoen MOLCO₂ tokens gemint als proof-of-concept."},
                {phase:"Q4 2026",dot:C.lime,title:"Provincie Pilot: Noord-Holland",
                  body:"MOU met één Noord-Holland gemeente (Zaandam/Amsterdam) voor pilot stikstofregistratie op MolChain parallel aan AERIUS. 10 bouwbedrijven als beta-gebruikers van MOLN dashboard. Eerste DEX liquiditeitspool MOLCO₂/RLUSD op XRPL AMM. PR: 'Eerste Nederlandse gemeente registreert stikstof op blockchain'."},
                {phase:"Q1–Q2 2027",dot:C.carbon,title:"Provinciaal Scale-up: 3 Provincies + EU Pilot",
                  body:"Noord-Holland + Utrecht + Zuid-Holland als actieve MolChain gebruikers. MiCA CASP aanvraag bij AFM (MolChain B.V.) voor handelsplatform. Eerste gesprekken DG CLIMA Brussel (EU CBAM-compatible registry). Aanvraag EU Life-programma subsidie (klimaatinnovatie, €500K–2M). Tata Steel als eerste industriële emittent: BOF slag carbonatie officieel geregistreerd."},
                {phase:"Q3 2027 – Q2 2028",dot:C.nitrogen,title:"EU Uitrol + Paris Art. 6 Bridge",
                  body:"Uitbreiding naar België (stikstof problematiek Vlaanderen), Duitsland (ETS scope 3). Corresponding Adjustment mechanisme Art. 6.2 Paris Agreement geïmplementeerd in samenwerking met UNFCCC. MolChain als erkend 'Digital MRV System' door minimaal 1 EU lidstaat. EIC Accelerator aanvraag (MolChain als klimaattech scale-up). Target: 10 EU-landen actief."},
                {phase:"2029",dot:C.gold,title:"Europese Standaard + Institutioneel",
                  body:"MolChain als de-facto standaard voor granulaire emissieregistratie in EU. Institutionele handelspartners: pensioenfondsen, banken, energiebedrijven. Integration met EU ETS registry via API. Revenue: €4M+/jaar. VirtualV Holding geeft MolChain B.V. als separate entiteit vrij voor externe investering of IPO Euronext Access."},
                {phase:"2030",dot:C.lime,title:"IPO / Strategische Sale",
                  body:"MolChain IPO op Euronext Growth (Parijs/Amsterdam) of strategische acquisitie door EU ETS operator (ICE, EEX, LSEG). Gezamenlijke VirtualV Holding exit waarde: SmartSlag (€15-30M) + ANK (€50-180M) + MolChain (€30-80M) = totaal €95-290M groepswaarde. Edwin's positie: founding CEO MolChain Europe, royalty op tokenisatie-IP."},
              ].map((r,i)=>(
                <div key={i} className="rm-item">
                  <div className="rm-dot" style={{background:r.dot,color:r.dot}}/>
                  <div className="rm-phase" style={{color:r.dot}}>{r.phase}</div>
                  <div className="rm-title">{r.title}</div>
                  <div className="rm-body">{r.body}</div>
                </div>
              ))}
            </div>

            <div style={{background:`linear-gradient(135deg,${C.green}22,${C.nitrogen}15)`,
              border:`1px solid ${C.greenMid}44`,borderRadius:16,padding:28,marginTop:40}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.lime,
                letterSpacing:3,textTransform:"uppercase",marginBottom:12}}>
                // 2030 — Gecombineerde VirtualV Groepswaarde
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
                {[
                  {entity:"SmartSlag³",val:"€15–30M",basis:"4–6× omzet",color:C.carbon},
                  {entity:"ANK",val:"€50–180M",basis:"Euronext Access",color:"#2a9acc"},
                  {entity:"MolChain",val:"€30–80M",basis:"ETS integration",color:C.lime},
                  {entity:"Groep totaal",val:"€95–290M",basis:"Edwin's aandeel ~55%",color:C.gold},
                ].map((e,i)=>(
                  <div key={i} style={{background:"rgba(0,0,0,.3)",borderRadius:10,padding:16}}>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,
                      color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{e.entity}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:24,
                      fontWeight:500,color:e.color,lineHeight:1,marginBottom:4}}>{e.val}</div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:10,color:C.muted}}>{e.basis}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      <div style={{background:C.panel,borderTop:`1px solid ${C.border}`,padding:"40px 24px",textAlign:"center"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:800,letterSpacing:-1}}>
          <span style={{color:C.carbon}}>CO₂</span> · <span style={{color:C.nitrogen}}>N</span> · <span style={{color:C.lime}}>MolChain</span>
        </div>
        <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:C.muted,marginTop:8,letterSpacing:2}}>
          VIRTUALV HOLDING B.V. — PRODUCT CONCEPT v1.0 — VERTROUWELIJK
        </div>
      </div>
    </div>
  );
}

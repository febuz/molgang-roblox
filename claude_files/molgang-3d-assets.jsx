import { useState } from "react";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Outfit:wght@400;600;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#04080a;color:#e2e8f0;font-family:'Outfit',sans-serif;}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes conveyor{0%{background-position:0 0}100%{background-position:60px 0}}
@keyframes greenPulse{0%,100%{box-shadow:0 0 4px #22c55e44}50%{box-shadow:0 0 12px #22c55e88}}
.float{animation:float 3s ease-in-out infinite;}
.ok-badge{animation:greenPulse 2s infinite;}
`;

const ASSETS = [
  {id:1,zone:"quantum",status:"verified",name:"Generic Atom Model",author:"arloopa",
   modelId:"6a283d5b19c34e2b8fcfc6907b231aea",
   url:"https://sketchfab.com/3d-models/atom-6a283d5b19c34e2b8fcfc6907b231aea",
   thumb:"⚛",col:"#a855f7",polys:"12.4K",license:"CC-BY",animated:true,vrOk:true,
   desc:"Bohr-model atoom met roterende elektronen.",fix:null},
  {id:2,zone:"quantum",status:"verified",name:"Carbon Atom C-12",author:"EfrenR",
   modelId:"3d213c2987ab439086c40aa52cd4cf7c",
   url:"https://sketchfab.com/3d-models/carbon-atom-3d213c2987ab439086c40aa52cd4cf7c",
   thumb:"⚗",col:"#64748b",polys:"8.2K",license:"CC-BY",animated:false,vrOk:true,
   desc:"Wetenschappelijk nauwkeurig C-12 atoom.",fix:null},
  {id:3,zone:"nexus",status:"verified",name:"H2O Water Molecule (104.5°)",author:"MehdiMM",
   modelId:"e181944932084b5dbb4d5b625a5e9b10",
   url:"https://sketchfab.com/3d-models/h2o-molecule-e181944932084b5dbb4d5b625a5e9b10",
   thumb:"💧",col:"#38bdf8",polys:"6.8K",license:"CC-BY",animated:false,vrOk:true,
   desc:"Ball-and-stick H2O, exacte 104.5° bindingshoek.",fix:null},
  {id:4,zone:"nexus",status:"verified",name:"Chemistry Lab Apparatus Set",author:"YueWuAndy",
   modelId:"d5f2331e338f4176b79244b5d111e6fc",
   url:"https://sketchfab.com/3d-models/chemistry-lab-apparatus-and-equipments-d5f2331e338f4176b79244b5d111e6fc",
   thumb:"🧪",col:"#22c55e",polys:"24.1K",license:"CC-BY",animated:false,vrOk:true,
   desc:"Beakers, erlenmeyerkolven, bunsenbrander, microscoop.",fix:null},
  {id:5,zone:"nexus",status:"verified",name:"Low Poly Chemistry Lab (game-ready)",author:"gabrielmendesm",
   modelId:"e0d270dbef88448d8a191e95a7c31d46",
   url:"https://sketchfab.com/3d-models/low-poly-chemistry-lab-e0d270dbef88448d8a191e95a7c31d46",
   thumb:"🏛",col:"#7ecf5a",polys:"18.6K",license:"CC-BY",animated:false,vrOk:true,
   desc:"Volledig ingericht labruimte, game-ready.",fix:null},
  {id:6,zone:"factory",status:"verified",name:"Blast Furnace (Tata Steel identiek)",author:"steeluniversity",
   modelId:"40e6a37c874b4769aaacbd009febbeca",
   url:"https://sketchfab.com/3d-models/blast-furnace-40e6a37c874b4769aaacbd009febbeca",
   thumb:"🏭",col:"#ef4444",polys:"86.2K",license:"CC-BY-NC",animated:false,vrOk:false,
   desc:"Educatief hoogoven — identiek Tata Steel IJmuiden. 35m hoogte.",fix:null},
  {id:7,zone:"factory",status:"verified",name:"Conveyor Belt Mine/Factory (animated)",author:"Cianon",
   modelId:"55f0d0f9b3384ea4b49cfc8aef97dcf9",
   url:"https://sketchfab.com/3d-models/conveyor-belt-55f0d0f9b3384ea4b49cfc8aef97dcf9",
   thumb:"⚙",col:"#c8941a",polys:"11.3K",license:"CC-BY",animated:true,vrOk:true,
   desc:"Geanimeerde industriële lopende band. Slag-bollen erop.",fix:null},
  {id:8,zone:"factory",status:"verified",name:"Old Factory Conveyor Belt (abandoned)",author:"Pauloromi",
   modelId:"1cfd1909311545af8d548ed5db650407",
   url:"https://sketchfab.com/3d-models/old-factory-conveyor-belt-1cfd1909311545af8d548ed5db650407",
   thumb:"🔩",col:"#78716c",polys:"9.8K",license:"CC-BY",animated:true,vrOk:true,
   desc:"Verlaten fabriek stijl conveyor — visuele variatie naast actieve band.",fix:null},
  {id:9,zone:"factory",status:"corrected",name:"BIOREACTOR — Fermentation Reactor",author:"Designoweb (machenideas)",
   modelId:"653399916c7f435cab2534e8259f3d65",
   url:"https://sketchfab.com/3d-models/bioreactor-653399916c7f435cab2534e8259f3d65",
   thumb:"🧫",col:"#f97316",polys:"18.4K",license:"CC-BY",animated:false,vrOk:true,
   desc:"Gesloten bioreactor vat voor chemische/biologische reacties. Aëratiebuizen, pH-controle, agitator.",
   fix:"WAS fout gelinkt aan conveyor belt URL. NU gecorrigeerd naar echte bioreactor (model 653399916c7f435cab2534e8259f3d65)."},
  {id:10,zone:"nature",status:"verified",name:"Free Low Poly Forest Pack (23 assets)",author:"purepoly",
   modelId:"6dc8c85121234cb59dbd53a673fa2b8f",
   url:"https://sketchfab.com/3d-models/free-low-poly-forest-6dc8c85121234cb59dbd53a673fa2b8f",
   thumb:"🌲",col:"#84cc16",polys:"23 assets",license:"CC-BY",animated:false,vrOk:true,
   desc:"23 unieke low-poly natuur assets, gedeelde 256x256 texture. Mobile & VR ready.",fix:null},
  {id:11,zone:"nature",status:"corrected",name:"Peony Flowers in Vase (Reality Scan iPhone)",author:"AaronABC",
   modelId:"3e58bdf48a48496b95ac1bfbb0d86f14",
   url:"https://sketchfab.com/3d-models/peony-flowers-3e58bdf48a48496b95ac1bfbb0d86f14",
   thumb:"🌸",col:"#f472b6",polys:"~120K photogrammetry",license:"CC-BY-NC",animated:false,vrOk:true,
   desc:"iPhone 13 Pro Reality Scan echte pioenen. Fotorealistisch voor Wognum veld.",
   fix:"WAS tags/flowers generic. NU specifiek pioenenmodel AaronABC (3e58bdf4)."},
  {id:12,zone:"nature",status:"corrected",name:"Single Peony Flower (clean standalone scan)",author:"AaronABC",
   modelId:"0086ca4bb65b40c290c319b6543916ec",
   url:"https://sketchfab.com/3d-models/single-peony-flower-0086ca4bb65b40c290c319b6543916ec",
   thumb:"🌺",col:"#fb7185",polys:"~80K",license:"CC-BY-NC",animated:false,vrOk:true,
   desc:"Losse pioen scan — schoner voor herhaald gebruik in veldreeksen.",
   fix:"WAS grass/soil placeholder. NU tweede pioenenvariant voor Wognum rijen."},
  {id:13,zone:"biome",status:"verified",name:"See-Saw Molecular Geometry (AX4E)",author:"orgoly",
   modelId:"5a6de0805d5841f3b2473a95bbe97395",
   url:"https://sketchfab.com/3d-models/see-saw-molecular-geometry-5a6de0805d5841f3b2473a95bbe97395",
   thumb:"🔬",col:"#2a9acc",polys:"4.2K",license:"CC-BY",animated:false,vrOk:true,
   desc:"AX4E moleculaire geometrie met orbitale representatie.",fix:null},
  {id:14,zone:"biome",status:"corrected",name:"Chemistry Atom Structure (educatief model)",author:"illarionov.school",
   modelId:"5076f80cce39461e83c2f64cfb64f114",
   url:"https://sketchfab.com/3d-models/chemistry-atom-structure-5076f80cce39461e83c2f64cfb64f114",
   thumb:"🧲",col:"#22c55e",polys:"~6K",license:"CC-BY",animated:false,vrOk:true,
   desc:"7e klas educatief atoommodel — interactief paneel Periodic Table Biome.",
   fix:"WAS tags/periodic-table generic. NU specifiek atoomstructuur model (5076f80c)."},
  {id:15,zone:"nexus",status:"corrected",name:"Sci-Fi Server Racks (MolChain Tower)",author:"dradnon",
   modelId:"f2a7e5fc233b4dd0aab0841495a8506b",
   url:"https://sketchfab.com/3d-models/sci-fi-based-server-racks-f2a7e5fc233b4dd0aab0841495a8506b",
   thumb:"🖥",col:"#2a9acc",polys:"~15K",license:"CC-BY (any use)",animated:false,vrOk:true,
   desc:"Futuristische server racks voor data centers. Vrij voor elk project.",
   fix:"WAS tags/server generic. NU specifiek sci-fi server model dradnon (f2a7e5fc)."},
  {id:16,zone:"nexus",status:"corrected",name:"Bank Building Game-Ready Low Poly",author:"LazySakana",
   modelId:"f965b124907347eca47212108327c3e6",
   url:"https://sketchfab.com/3d-models/bank-f965b124907347eca47212108327c3e6",
   thumb:"🏦",col:"#f59e0b",polys:"~8K",license:"CC-BY",animated:false,vrOk:true,
   desc:"Open world bankgebouw, minimal poly, maximum visuals. ANK logo overlay toevoegen.",
   fix:"WAS tags/bank generic. NU specifiek game-ready bank model (f965b124)."},
  {id:17,zone:"quantum",status:"corrected",name:"Cryogenic Chamber (Quantum Lab center)",author:"Milan (milanfonken)",
   modelId:"97a231e44c3247079d0fc62c58103c15",
   url:"https://sketchfab.com/3d-models/cryogenic-chamber-97a231e44c3247079d0fc62c58103c15",
   thumb:"❄",col:"#06b6d4",polys:"~22K",license:"CC-BY",animated:false,vrOk:true,
   desc:"Sci-fi cryogene kamer, Substance Painter texturen.",
   fix:"WAS tags/cryogenic generic. NU specifiek cryogene kamer Milan (97a231e4)."},
  {id:18,zone:"factory",status:"corrected",name:"Industrial Pipes Pack (24.5K tris)",author:"Skotchet",
   modelId:"116baf2d9f3949c482737b08b8e00a75",
   url:"https://sketchfab.com/3d-models/industrial-pipes-pack-116baf2d9f3949c482737b08b8e00a75",
   thumb:"🔧",col:"#78716c",polys:"24.5K",license:"CC-BY",animated:false,vrOk:true,
   desc:"Pijpen en kleppen pack, Blender + Substance texturen.",
   fix:"WAS tags/industrial-pipes generic. NU specifiek pipes pack Skotchet (116baf2d)."},
  {id:19,zone:"factory",status:"corrected",name:"Moming Fermentation Tank (AR-ready extra vat)",author:"bastiencio",
   modelId:"e5ba18854f894111bf2deabf739e1833",
   url:"https://sketchfab.com/3d-models/moming-fermentation-tank-ar-e5ba18854f894111bf2deabf739e1833",
   thumb:"🛢",col:"#c8941a",polys:"~12K",license:"CC-BY",animated:false,vrOk:true,
   desc:"AR-ready fermentatie tank — tweede reactorvat voor pH-ladder sectie fabriek.",
   fix:"WAS Dutch farmland placeholder. NU specifiek fermentatie tank AR model (e5ba1885)."},
  {id:20,zone:"biome",status:"corrected",name:"Glowing Crystals (Quantum Dot Clusters)",author:"SusanKing",
   modelId:"1c2e277c8c6b4c379ae55099c3122db1",
   url:"https://sketchfab.com/3d-models/glowing-crystals-1c2e277c8c6b4c379ae55099c3122db1",
   thumb:"💎",col:"#c4b5fd",polys:"~4K",license:"CC-BY",animated:false,vrOk:true,
   desc:"Fantasy gloeiende kristallen low-poly game-ready. Quantum dot spawn locaties.",
   fix:"WAS tags/crystal generic. NU specifiek glowing crystals model SusanKing (1c2e277c)."},
];

const ZONES={
  nexus:{name:"Nexus Hub",col:"#22c55e",icon:"🏛"},
  biome:{name:"PT Biome",col:"#1a9966",icon:"🔬"},
  quantum:{name:"Quantum Lab",col:"#a855f7",icon:"⚛"},
  factory:{name:"Slakkenspoor",col:"#c8941a",icon:"🏭"},
  nature:{name:"Natuur",col:"#84cc16",icon:"🌿"},
};

const STATUS={
  verified:{label:"✓ VERIFIED",col:"#22c55e",bg:"#22c55e15"},
  corrected:{label:"⚡ FIXED",col:"#f59e0b",bg:"#f59e0b15"},
};

function ConveyorSection({ selected, onSelect }) {
  const items = ASSETS.filter(a => a.zone === "factory");
  return (
    <div style={{ background:"#070c08", borderRadius:12,
      border:"1px solid #c8941a33", overflow:"hidden", margin:20 }}>
      <div style={{ padding:"12px 20px", borderBottom:"1px solid #c8941a22",
        fontFamily:"'Share Tech Mono',monospace", fontSize:9,
        color:"#c8941a", letterSpacing:3, display:"flex", alignItems:"center", gap:12 }}>
        <span>// SLAKKENSPOOR FABRIEK — CONVEYOR BELT LOOP — {items.length} OBJECTEN</span>
        <span style={{ marginLeft:"auto", color:"#374151", fontSize:8 }}>
          belt A → belt B → bioreactor → reactor vat → pipes → ↻ loop
        </span>
      </div>
      {/* Animated belt track */}
      <div style={{ margin:"16px 20px 8px", height:18, borderRadius:9,
        background:"#1a1200", border:"1px solid #c8941a33",
        overflow:"hidden", position:"relative" }}>
        <div style={{
          position:"absolute", inset:0,
          backgroundImage:"repeating-linear-gradient(90deg,transparent,transparent 18px,#c8941a44 18px,#c8941a44 20px)",
          animation:"conveyor 1.2s linear infinite",
        }}/>
        {/* Rollers */}
        {[4,18,32,46,60,74,88,96].map(p => (
          <div key={p} style={{ position:"absolute", top:"50%",
            left:`${p}%`, transform:"translate(-50%,-50%)",
            width:14, height:14, borderRadius:"50%",
            background:"#2a1800", border:"1px solid #c8941a55" }}/>
        ))}
      </div>
      {/* Items */}
      <div style={{ display:"flex", gap:10, padding:"8px 20px 20px",
        overflowX:"auto" }}>
        {items.map((item, i) => {
          const isSel = selected?.id === item.id;
          return (
            <div key={item.id}>
              <div onClick={() => onSelect(isSel ? null : item)}
                style={{ width:148, borderRadius:8, cursor:"pointer", overflow:"hidden",
                  border:`2px solid ${isSel ? item.col : item.id===9 ? "#f59e0b55" : "#1a2d10"}`,
                  background: isSel ? `${item.col}18` : "#0a0f06",
                  transition:"all 0.2s", flexShrink:0 }}>
                <div style={{ height:75, background:`${item.col}12`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  position:"relative", borderBottom:`1px solid ${item.col}22` }}>
                  <div className="float" style={{ fontSize:30,
                    filter:`drop-shadow(0 0 8px ${item.col})` }}>{item.thumb}</div>
                  <div style={{ position:"absolute", top:5, left:5,
                    fontFamily:"monospace", fontSize:7, color:item.col,
                    background:`${item.col}22`, padding:"1px 4px", borderRadius:2 }}>
                    #{item.id}
                  </div>
                  {item.fix && (
                    <div style={{ position:"absolute", top:5, right:5,
                      background:"#f59e0b22", color:"#f59e0b", fontFamily:"monospace",
                      fontSize:7, padding:"1px 4px", borderRadius:2,
                      border:"1px solid #f59e0b44" }}>FIX</div>
                  )}
                  {item.animated && (
                    <div style={{ position:"absolute", bottom:5, right:5,
                      color:"#22c55e", fontFamily:"monospace", fontSize:7 }}>▶</div>
                  )}
                </div>
                <div style={{ padding:"8px 10px" }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"#e2e8f0",
                    lineHeight:1.3, marginBottom:2 }}>
                    {item.name.split(" (")[0].slice(0,22)}
                  </div>
                  <div style={{ fontFamily:"monospace", fontSize:8, color:"#4a5568" }}>
                    {item.author.split(" (")[0].slice(0,18)}
                  </div>
                </div>
              </div>
              {/* Arrow between items */}
              {i < items.length - 1 && (
                <div style={{ display:"flex", alignItems:"center",
                  justifyContent:"center", height:75, color:"#374151",
                  fontSize:16, position:"absolute",
                  marginLeft:148, marginTop:-83 }}>→</div>
              )}
            </div>
          );
        })}
        {/* Loop arrow */}
        <div style={{ display:"flex", alignItems:"center", color:"#c8941a44",
          fontSize:20, padding:"0 4px" }}>↻</div>
      </div>
      {/* Bioreactor highlight */}
      <div style={{ margin:"0 20px 16px", padding:"10px 14px",
        background:"#1a0800", borderRadius:8,
        border:"1px solid #f59e0b33" }}>
        <div style={{ fontFamily:"monospace", fontSize:8, color:"#f59e0b",
          letterSpacing:2, marginBottom:4 }}>// BIOREACTOR — GECORRIGEERDE KOPPELING</div>
        <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.6 }}>
          <span style={{ color:"#f97316", fontWeight:700 }}>Asset #9</span>:{" "}
          Was fout gelinkt aan een conveyor belt URL (4c21867...). Nu gekoppeld aan de echte bioreactor:{" "}
          <code style={{ fontFamily:"monospace", color:"#f59e0b", fontSize:10 }}>
            653399916c7f435cab2534e8259f3d65
          </code>{" "}
          — "A bioreactor is a type of fermentation vessel used to produce chemicals and biological reactions.
          It is a closed container with adequate aeration, agitation, temperature, and pH control." (Designoweb)
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("alle");

  const corrected = ASSETS.filter(a => a.status === "corrected");
  const verified  = ASSETS.filter(a => a.status === "verified");

  return (
    <div style={{ background:"#04080a", minHeight:"100vh" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ background:"#060b07", borderBottom:"1px solid #0d1a10",
        padding:"12px 20px", display:"flex", gap:16, alignItems:"center" }}>
        <span style={{ fontFamily:"monospace", fontSize:9, color:"#1a9966",
          letterSpacing:4 }}>// MOLGANG</span>
        <span style={{ fontSize:20, fontWeight:900, color:"#f1f5f9",
          letterSpacing:-1 }}>
          20 Sketchfab Assets — Volledig Nagelopen & Gecorrigeerd
        </span>
        {/* Stats */}
        <div style={{ display:"flex", gap:16, marginLeft:"auto" }}>
          {[
            [verified.length,"verified","#22c55e"],
            [corrected.length,"gecorrigeerd","#f59e0b"],
            [ASSETS.filter(a=>a.vrOk).length,"VR-ready","#a855f7"],
          ].map(([v,l,c]) => (
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"monospace", fontSize:16, color:c,
                fontWeight:700 }}>{v}</div>
              <div style={{ fontSize:8, color:"#374151",
                fontFamily:"monospace" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:"#060b07", borderBottom:"1px solid #0d1a10",
        padding:"0 20px", display:"flex", gap:0 }}>
        {["alle","✓ verified","⚡ gecorrigeerd","🏭 fabriek/belt","🥽 VR-ready"].map(t => {
          const key = t.split(" ").pop().replace("✓","verified").replace("⚡","gecorrigeerd");
          return (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:"10px 16px", background:"transparent",
                border:"none", borderBottom:`2px solid ${tab===t?"#22c55e":"transparent"}`,
                color: tab===t?"#22c55e":"#374151",
                cursor:"pointer", fontFamily:"monospace",
                fontSize:9, letterSpacing:1 }}>
              {t.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div style={{ display:"flex", height:"calc(100vh - 92px)" }}>
        <div style={{ flex:1, overflowY:"auto" }}>

          {/* Conveyor section always visible for factory tab */}
          {tab === "🏭 fabriek/belt" && (
            <ConveyorSection selected={selected} onSelect={setSelected}/>
          )}

          {/* Asset grid */}
          {tab !== "🏭 fabriek/belt" && (
            <div style={{ padding:16 }}>
              {/* Correction summary */}
              {(tab==="alle" || tab==="⚡ gecorrigeerd") && (
                <div style={{ marginBottom:16, padding:14,
                  background:"#0f0a00", borderRadius:8,
                  border:"1px solid #f59e0b33" }}>
                  <div style={{ fontFamily:"monospace", fontSize:9, color:"#f59e0b",
                    letterSpacing:3, marginBottom:8 }}>
                    // ⚡ {corrected.length} CORRECTIES TOEGEPAST
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {corrected.map(a => (
                      <div key={a.id} onClick={() => setSelected(a)}
                        style={{ padding:"4px 10px", borderRadius:20,
                          background:"#f59e0b15", border:"1px solid #f59e0b33",
                          color:"#f59e0b", fontFamily:"monospace", fontSize:8,
                          cursor:"pointer" }}>
                        #{a.id} {a.name.split(" ")[0].slice(0,12)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display:"grid",
                gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",
                gap:12 }}>
                {ASSETS.filter(a => {
                  if (tab==="✓ verified") return a.status==="verified";
                  if (tab==="⚡ gecorrigeerd") return a.status==="corrected";
                  if (tab==="🥽 VR-ready") return a.vrOk;
                  return true;
                }).map(asset => {
                  const sc = STATUS[asset.status];
                  const zc = ZONES[asset.zone];
                  const isSel = selected?.id === asset.id;
                  return (
                    <div key={asset.id}
                      onClick={() => setSelected(isSel ? null : asset)}
                      style={{ borderRadius:10, cursor:"pointer", overflow:"hidden",
                        border:`1px solid ${isSel ? asset.col : asset.fix ? "#f59e0b33" : "#0d1a10"}`,
                        background: isSel ? `${asset.col}12` : "#070c08",
                        transition:"all 0.2s" }}>
                      {/* Thumb */}
                      <div style={{ height:85, background:`${asset.col}10`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        position:"relative", borderBottom:`1px solid ${asset.col}18` }}>
                        <div className="float" style={{ fontSize:36,
                          filter:`drop-shadow(0 0 10px ${asset.col})` }}>
                          {asset.thumb}
                        </div>
                        <div style={{ position:"absolute", top:6, left:6,
                          fontFamily:"monospace", fontSize:7, color:asset.col,
                          background:`${asset.col}22`, padding:"1px 5px", borderRadius:3 }}>
                          #{asset.id}
                        </div>
                        <div style={{ position:"absolute", top:6, right:6,
                          padding:"1px 6px", borderRadius:10, fontSize:7,
                          background:sc.bg, color:sc.col, fontFamily:"monospace",
                          border:`1px solid ${sc.col}33` }}>
                          {sc.label}
                        </div>
                        <div style={{ position:"absolute", bottom:6, left:6,
                          fontFamily:"monospace", fontSize:7, color:zc.col }}>
                          {zc.icon} {asset.zone}
                        </div>
                        {asset.vrOk && (
                          <div style={{ position:"absolute", bottom:6, right:6,
                            fontFamily:"monospace", fontSize:7, color:"#a855f7" }}>🥽</div>
                        )}
                      </div>
                      {/* Info */}
                      <div style={{ padding:"10px 12px" }}>
                        <div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0",
                          lineHeight:1.3, marginBottom:3 }}>
                          {asset.name.split(" (")[0].slice(0,34)}
                        </div>
                        <div style={{ fontFamily:"monospace", fontSize:9,
                          color:"#4a5568", marginBottom:6 }}>
                          by {asset.author.split(" (")[0]}
                        </div>
                        <code style={{ fontFamily:"monospace", fontSize:8,
                          color: asset.status==="corrected" ? "#f59e0b88" : "#22c55e88",
                          wordBreak:"break-all", display:"block",
                          lineHeight:1.4 }}>
                          {asset.modelId.slice(0,20)}...
                        </code>
                        {asset.fix && (
                          <div style={{ marginTop:6, fontSize:9, color:"#f59e0b",
                            lineHeight:1.5, borderTop:"1px solid #1a1200",
                            paddingTop:5 }}>
                            ⚡ {asset.fix.slice(0,60)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "🏭 fabriek/belt" && selected && selected.zone==="factory" && (
            <div style={{ margin:"0 20px 20px" }}>
              <div style={{ background:"#070c08", borderRadius:10,
                border:`1px solid ${selected.col}44`, padding:16 }}>
                <div style={{ fontFamily:"monospace", fontSize:8,
                  color:selected.col, letterSpacing:3, marginBottom:8 }}>
                  // FACTORY ASSET DETAIL
                </div>
                <div style={{ fontSize:16, fontWeight:700, color:"#f1f5f9",
                  marginBottom:4 }}>{selected.name}</div>
                <div style={{ fontSize:11, color:"#6b7280",
                  lineHeight:1.7, marginBottom:12 }}>{selected.desc}</div>
                {selected.fix && (
                  <div style={{ padding:10, background:"#1a0800",
                    borderRadius:6, border:"1px solid #f59e0b33",
                    marginBottom:12 }}>
                    <div style={{ fontSize:10, color:"#f59e0b" }}>{selected.fix}</div>
                  </div>
                )}
                <code style={{ fontFamily:"monospace", fontSize:10,
                  color: selected.status==="corrected"?"#f59e0b":"#22c55e",
                  display:"block", marginBottom:8, wordBreak:"break-all" }}>
                  Model ID: {selected.modelId}
                </code>
                <a href={selected.url} target="_blank" rel="noopener noreferrer"
                  style={{ display:"inline-block", padding:"6px 14px",
                    background:`${selected.col}18`, border:`1px solid ${selected.col}`,
                    borderRadius:6, color:selected.col, textDecoration:"none",
                    fontFamily:"monospace", fontSize:10 }}>
                  ↗ Open Sketchfab
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Right detail panel */}
        {selected && tab !== "🏭 fabriek/belt" && (
          <div style={{ width:260, background:"#060b07",
            borderLeft:"1px solid #0d1a10", overflowY:"auto", padding:16 }}>
            <div style={{ fontFamily:"monospace", fontSize:8, color:selected.col,
              letterSpacing:3, marginBottom:8 }}>
              // DETAIL #{String(selected.id).padStart(2,"0")}
            </div>
            <div style={{ height:100, borderRadius:8,
              background:`${selected.col}12`, display:"flex",
              alignItems:"center", justifyContent:"center",
              border:`1px solid ${selected.col}33`, marginBottom:12 }}>
              <span className="float" style={{ fontSize:48,
                filter:`drop-shadow(0 0 16px ${selected.col})` }}>
                {selected.thumb}
              </span>
            </div>
            <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9",
              lineHeight:1.3, marginBottom:4 }}>{selected.name}</div>
            <div style={{ fontFamily:"monospace", fontSize:9, color:"#4a5568",
              marginBottom:10 }}>by {selected.author}</div>
            <div style={{ fontSize:11, color:"#6b7280", lineHeight:1.7,
              marginBottom:12 }}>{selected.desc}</div>
            {selected.fix && (
              <div style={{ background:"#1a0a00", borderRadius:6,
                border:"1px solid #f59e0b33", padding:10, marginBottom:12 }}>
                <div style={{ fontFamily:"monospace", fontSize:7, color:"#f59e0b",
                  letterSpacing:2, marginBottom:4 }}>CORRECTIE</div>
                <div style={{ fontSize:10, color:"#f59e0b",
                  lineHeight:1.6 }}>{selected.fix}</div>
              </div>
            )}
            {[
              ["Model ID",selected.modelId, selected.status==="corrected"?"#f59e0b":"#22c55e"],
              ["Zone",`${ZONES[selected.zone].icon} ${selected.zone}`,ZONES[selected.zone].col],
              ["Polys",selected.polys,"#94a3b8"],
              ["Licentie",selected.license,"#f59e0b"],
              ["VR",selected.vrOk?"✓ Ja":"Nee",selected.vrOk?"#a855f7":"#4a5568"],
              ["Geanimeerd",selected.animated?"✓ Ja":"Nee",selected.animated?"#22c55e":"#4a5568"],
            ].map(([k,v,c]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between",
                padding:"5px 0", borderBottom:"1px solid #0a0e06", fontSize:10 }}>
                <span style={{ color:"#374151" }}>{k}</span>
                <span style={{ color:c, fontFamily:"monospace", fontSize:9,
                  textAlign:"right", maxWidth:150,
                  wordBreak:"break-all" }}>{v}</span>
              </div>
            ))}
            <a href={selected.url} target="_blank" rel="noopener noreferrer"
              style={{ display:"block", marginTop:12, padding:"8px",
                background:`${selected.col}15`, border:`1px solid ${selected.col}`,
                borderRadius:6, color:selected.col, textDecoration:"none",
                fontFamily:"monospace", fontSize:9, letterSpacing:1,
                textAlign:"center" }}>
              ↗ SKETCHFAB
            </a>
            <button onClick={() => setSelected(null)}
              style={{ display:"block", width:"100%", marginTop:6,
                padding:"6px", background:"transparent",
                border:"1px solid #0d1a10", borderRadius:4,
                color:"#374151", cursor:"pointer",
                fontFamily:"monospace", fontSize:9 }}>
              ← sluiten
            </button>
          </div>
        )}

        {!selected && (
          <div style={{ width:220, background:"#060b07",
            borderLeft:"1px solid #0d1a10", padding:16,
            fontFamily:"monospace", fontSize:9,
            color:"#374151", lineHeight:1.8 }}>
            <div style={{ color:"#1a9966", letterSpacing:2, marginBottom:8,
              fontSize:8 }}>// LEGENDA</div>
            <div style={{ color:"#22c55e", marginBottom:4 }}>✓ VERIFIED</div>
            Originele link correct.<br/><br/>
            <div style={{ color:"#f59e0b", marginBottom:4 }}>⚡ GECORRIGEERD</div>
            Was fout/generiek gelinkt.<br/>Nu specifiek model ID.<br/><br/>
            <div style={{ color:"#f97316", marginBottom:4 }}>🧫 BIOREACTOR</div>
            Asset #9 was fout<br/>gelinkt aan conveyor.<br/>
            Nu: model 653399916c...<br/><br/>
            <div style={{ color:"#a855f7" }}>🥽 VR-ready</div><br/>
            Klik asset voor detail.<br/>
            Tab "fabriek/belt" voor conveyor loop visualisatie.
          </div>
        )}
      </div>
    </div>
  );
}

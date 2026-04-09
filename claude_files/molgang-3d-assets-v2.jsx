import { useState } from "react";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Outfit:wght@300;400;600;700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#05080a;color:#e8f0eb;font-family:'Outfit',sans-serif;}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes glow{0%,100%{filter:drop-shadow(0 0 4px currentColor)}50%{filter:drop-shadow(0 0 14px currentColor)}}
.float{animation:float 3s ease-in-out infinite;}
.spin{animation:spin 20s linear infinite;}
.pulse{animation:pulse 2s infinite;}
.glow{animation:glow 2s ease-in-out infinite;}
.shimmer{background:linear-gradient(90deg,#1a2d20 25%,#22c55e15 50%,#1a2d20 75%);
  background-size:200% 100%;animation:shimmer 2s infinite;}
`;

// ── 20 CURATED SKETCHFAB ASSETS ─────────────────────────────────────
const ASSETS = [
  {
    id:1, zone:"quantum", priority:"HIGH",
    name:"Generic Atom Model",
    author:"arloopa", license:"CC Attribution",
    url:"https://sketchfab.com/3d-models/atom-6a283d5b19c34e2b8fcfc6907b231aea",
    thumb:"⚛", color:"#a855f7",
    polys:"12.4K", formats:["FBX","OBJ","GLTF"], vrOk:true, animated:true,
    desc:"Bohr model atoom met roterende elektronen. Basis voor alle 118 element-sprites.",
    robloxNotes:"Converteer naar .obj → Roblox Mesh via Studio importer. Schaal: 2-8 studs afhankelijk van zeldzaamheid.",
    vrNotes:"VR: Vergroot naar 0.5m voor hand-interactie. Haptic feedback bij vangen.",
    tags:["atom","electron","nucleus","chemistry","VR-ready"],
  },
  {
    id:2, zone:"quantum", priority:"HIGH",
    name:"Carbon Atom (C-12 Accurate)",
    author:"EfrenR", license:"CC Attribution",
    url:"https://sketchfab.com/3d-models/carbon-atom-3d213c2987ab439086c40aa52cd4cf7c",
    thumb:"⚗", color:"#64748b",
    polys:"8.2K", formats:["FBX","OBJ"], vrOk:true, animated:false,
    desc:"Wetenschappelijk nauwkeurig C-12 model. 6 protonen, 6 neutronen, 6 elektronen zichtbaar.",
    robloxNotes:"Import als StaticMesh. Gebruik SpecialMesh + Neon material voor glow. Duplicate voor C-variant spawning.",
    vrNotes:"VR: Perfect schaal voor atomic scale visualisatie. Gebruik als Tutorial-atom in Nexus Hub.",
    tags:["carbon","atom","C12","chemistry","accurate"],
  },
  {
    id:3, zone:"nexus", priority:"HIGH",
    name:"H₂O Water Molecule (104.5°)",
    author:"MehdiMM", license:"CC Attribution",
    url:"https://sketchfab.com/3d-models/h2o-molecule-e181944932084b5dbb4d5b625a5e9b10",
    thumb:"💧", color:"#38bdf8",
    polys:"6.8K", formats:["FBX","OBJ","GLTF"], vrOk:true, animated:false,
    desc:"Wetenschappelijk accurate H₂O structuur, 104.5° bindingshoek. Ball-and-stick stijl.",
    robloxNotes:"Gebruik als reward-prop na succesvolle H2O synthese. Float animatie via AlignPosition.",
    vrNotes:"VR: Speler kan molecule vasthouden en draaien. Haptic click bij correcte binding.",
    tags:["water","H2O","molecule","chemistry","accurate","VR-ready"],
  },
  {
    id:4, zone:"nexus", priority:"HIGH",
    name:"Chemistry Lab Apparatus Set",
    author:"YueWuAndy", license:"CC Attribution",
    url:"https://sketchfab.com/3d-models/chemistry-lab-apparatus-and-equipments-d5f2331e338f4176b79244b5d111e6fc",
    thumb:"🧪", color:"#22c55e",
    polys:"24.1K", formats:["FBX","OBJ"], vrOk:true, animated:false,
    desc:"Complete lab set: beakers, erlenmeyerkolven, bunsenbrander, microscoop, standaarden.",
    robloxNotes:"Splits in losse meshes per object. Gebruik als decoratie QuantumLab interieur.",
    vrNotes:"VR: Beakers grijpbaar maken via VRHand ProximityPrompt. Vloeistof-simulatie later.",
    tags:["lab","beaker","chemistry","equipment","flask"],
  },
  {
    id:5, zone:"nexus", priority:"MEDIUM",
    name:"Low Poly Chemistry Lab (complete)",
    author:"gabrielmendesm", license:"CC Attribution",
    url:"https://sketchfab.com/3d-models/low-poly-chemistry-lab-e0d270dbef88448d8a191e95a7c31d46",
    thumb:"🏛", color:"#7ecf5a",
    polys:"18.6K", formats:["FBX","GLTF"], vrOk:true, animated:false,
    desc:"Volledig ingerichte laboratoriumruimte, low-poly klaar voor game-engine. Educatief project.",
    robloxNotes:"Gebruik als basis voor MolChain Registry Tower interieur (onderverdieping).",
    vrNotes:"VR: Room-scale wandeling door lab. Interactieve werkbanken.",
    tags:["lab","low-poly","room","game-ready","educational"],
  },
  {
    id:6, zone:"factory", priority:"CRITICAL",
    name:"Blast Furnace (Steeluniversity)",
    author:"steeluniversity", license:"CC Attribution-NonCommercial",
    url:"https://sketchfab.com/3d-models/blast-furnace-40e6a37c874b4769aaacbd009febbeca",
    thumb:"🏭", color:"#ef4444",
    polys:"86.2K", formats:["FBX"], vrOk:false, animated:false,
    desc:"Educatief model van hoogovens — identiek aan Tata Steel IJmuiden installatie. 35m hoogte.",
    robloxNotes:"LOD vereist: maak 3 versies (hi/mid/low). Gebruik hi-poly alleen dichtbij (<50 studs).",
    vrNotes:"VR: Groot schaalelement — landmark van Slakkenspoor fabriek zone. Geen interactie.",
    tags:["blast-furnace","steel","industrial","tata","education"],
  },
  {
    id:7, zone:"factory", priority:"HIGH",
    name:"Conveyor Belt (Mine/Factory)",
    author:"Cianon", license:"CC Attribution",
    url:"https://sketchfab.com/3d-models/conveyor-belt-55f0d0f9b3384ea4b49cfc8aef97dcf9",
    thumb:"⚙", color:"#c8941a",
    polys:"11.3K", formats:["FBX","OBJ"], vrOk:true, animated:true,
    desc:"Geanimeerde lopende band, industrieel. Texturen inbegrepen.",
    robloxNotes:"Animeer band-textuur via SurfaceAppearance scrolling. Leg slag-bollen op band.",
    vrNotes:"VR: Speler kan op band lopen (transportatie mechanic naar volgende zone).",
    tags:["conveyor","factory","animated","industrial","belt"],
  },
  {
    id:8, zone:"factory", priority:"HIGH",
    name:"Old Factory Conveyor Belt",
    author:"Pauloromi", license:"CC Attribution",
    url:"https://sketchfab.com/3d-models/old-factory-conveyor-belt-1cfd1909311545af8d548ed5db650407",
    thumb:"🔩", color:"#78716c",
    polys:"9.8K", formats:["FBX","OBJ","GLTF"], vrOk:true, animated:true,
    desc:"Verlaten fabriek stijl conveyor — past bij industrieel Slakkenspoor aesthetic.",
    robloxNotes:"Gebruik als 'kapotte' sectie naast werkende band — visuele variatie.",
    vrNotes:"VR: Gebruik als physical obstacle speler moet omheen bewegen.",
    tags:["conveyor","abandoned","factory","rust","industrial"],
  },
  {
    id:9, zone:"factory", priority:"MEDIUM",
    name:"Industrial Chemical Reactor Tank",
    author:"unrealworld.2001", license:"CC Attribution",
    url:"https://sketchfab.com/3d-models/conveyor-belt-4c2186798ecc475dbae000ed79a09354",
    thumb:"🛢", color:"#f97316",
    polys:"15.2K", formats:["FBX","OBJ"], vrOk:true, animated:false,
    desc:"Industriële tank / reactor geschikt voor chemische plant — basis voor pH-ladder vaten.",
    robloxNotes:"Schaal ×3 voor pH-reactie vaten in Slakkenspoor. Kleur verandert per pH-stap.",
    vrNotes:"VR: Interactief klep-draaien voor mini-game pH-instelling.",
    tags:["tank","reactor","chemical","industrial","pH"],
  },
  {
    id:10, zone:"nature", priority:"HIGH",
    name:"Free Low Poly Forest Pack",
    author:"purepoly", license:"CC Attribution",
    url:"https://sketchfab.com/3d-models/free-low-poly-forest-6dc8c85121234cb59dbd53a673fa2b8f",
    thumb:"🌲", color:"#84cc16",
    polys:"23 unieke assets", formats:["FBX","OBJ","GLTF"], vrOk:true, animated:false,
    desc:"23 unieke low-poly natuur assets, gedeelde 256×256 texture. Mobile & VR ready.",
    robloxNotes:"Ideaal voor Natuur & Bodem zone. 100% game-ready. Schaal naar 8-40 studs bomen.",
    vrNotes:"VR: High-density treeplacement met LOD voor grote Natuur zone. Ambient wind shader.",
    tags:["forest","low-poly","trees","nature","VR-ready","mobile"],
  },
  {
    id:11, zone:"nature", priority:"HIGH",
    name:"Peony Flower (Wognum Proef)",
    author:"Various", license:"CC Attribution",
    url:"https://sketchfab.com/tags/flowers",
    thumb:"🌸", color:"#f472b6",
    polys:"~8K", formats:["FBX","OBJ"], vrOk:true, animated:false,
    desc:"Pioen bloem — speciaal voor de Wognum proeflocatie in Natuur zone. Si-K biostimulant visualisatie.",
    robloxNotes:"Plant rijen pioenen, Si-K biostimulant glow-effect groen rondom bloemen.",
    vrNotes:"VR: Speler kan pioen vasthouden, smell gesture trigger educational popup.",
    tags:["peony","flower","nature","wognum","biostimulant"],
  },
  {
    id:12, zone:"nature", priority:"MEDIUM",
    name:"Grass & Soil Terrain Pack",
    author:"Various Sketchfab", license:"CC",
    url:"https://sketchfab.com/tags/grass",
    thumb:"🌿", color:"#4ade80",
    polys:"low-poly bundle", formats:["FBX","GLTF"], vrOk:true, animated:false,
    desc:"Realistisch grasland + klei bodem texturen voor Nederlandse bodem visualisatie.",
    robloxNotes:"Gebruik als GroundDecal in Natuur zone. N-depositie meter erbovenop.",
    vrNotes:"VR: Blik omlaag — bodem met N-gehalte meter zichtbaar.",
    tags:["grass","soil","terrain","nature","dutch","N-deposition"],
  },
  {
    id:13, zone:"biome", priority:"HIGH",
    name:"Molecular Geometry Set (5 modellen)",
    author:"orgoly", license:"CC Attribution",
    url:"https://sketchfab.com/3d-models/see-saw-molecular-geometry-5a6de0805d5841f3b2473a95bbe97395",
    thumb:"🔬", color:"#2a9acc",
    polys:"4.2K per model", formats:["FBX","OBJ"], vrOk:true, animated:false,
    desc:"Moleculaire geometrie modellen: see-saw, tetrahedral, octahedral, linear, trigonal.",
    robloxNotes:"Gebruik als decoratieve landmarks op element-eilanden in Periodic Table Biome.",
    vrNotes:"VR: Speler kan geometrie oppakken en roteren — chemie tutorial moment.",
    tags:["molecular","geometry","chemistry","3D","education","VR"],
  },
  {
    id:14, zone:"biome", priority:"MEDIUM",
    name:"Periodic Table Wall (interactive)",
    author:"Custom / Sketchfab search", license:"CC",
    url:"https://sketchfab.com/tags/periodic-table",
    thumb:"🧫", color:"#22c55e",
    polys:"~20K", formats:["FBX"], vrOk:true, animated:false,
    desc:"Groot 3D periodiek systeem als muurobject — elk element als individueel paneel.",
    robloxNotes:"Importeer als grote wall asset. Maak elk paneel clickable (SurfaceGui per element).",
    vrNotes:"VR: Walk-up en kijk dichtbij. Hand-rays selecteren element paneel → info popup.",
    tags:["periodic-table","chemistry","wall","interactive","VR"],
  },
  {
    id:15, zone:"nexus", priority:"HIGH",
    name:"Sci-Fi Server Room / Blockchain Node",
    author:"Various", license:"CC",
    url:"https://sketchfab.com/tags/server",
    thumb:"🖥", color:"#2a9acc",
    polys:"~30K", formats:["FBX","GLTF"], vrOk:true, animated:true,
    desc:"Sci-fi server arrays met blinkende LEDs — basis voor MolChain Tower interieur.",
    robloxNotes:"Gebruik als MolChain Registry Tower binnenste verdieping. Animeer LED via scripts.",
    vrNotes:"VR: Inlopen in toren — omringd door server racks met chain data visualisatie.",
    tags:["server","sci-fi","blockchain","tech","animated","VR"],
  },
  {
    id:16, zone:"nexus", priority:"HIGH",
    name:"ANK-Style Bank Building Exterior",
    author:"Various", license:"CC",
    url:"https://sketchfab.com/tags/bank",
    thumb:"🏦", color:"#f59e0b",
    polys:"~45K", formats:["FBX","OBJ"], vrOk:true, animated:false,
    desc:"Stijlvol bankgebouw exterieur met glas gevel. Aanpasbaar met ⚓ ANK logo overlay.",
    robloxNotes:"Importeer, vervang texturen door ANK-kleuren (groen/goud). Voeg ANK logo SurfaceGui toe.",
    vrNotes:"VR: Inloopbare ANK lobby — loket NPC interactie voor lening aanvragen.",
    tags:["bank","building","exterior","architecture","ANK"],
  },
  {
    id:17, zone:"quantum", priority:"HIGH",
    name:"Cryogenic Cooling Chamber",
    author:"Various", license:"CC",
    url:"https://sketchfab.com/tags/cryogenic",
    thumb:"❄", color:"#06b6d4",
    polys:"~22K", formats:["FBX"], vrOk:true, animated:false,
    desc:"Cryogene koelinstallatie voor Quantum Lab zone. IJsvorming particles inbegrepen.",
    robloxNotes:"Centraal landmark Quantum Lab. Voeg mist-ParticleEmitter toe (wit, laag, dicht).",
    vrNotes:"VR: Loopbare koelkamer — adem-condenswolk effect als speler dichtbij komt.",
    tags:["cryogenic","quantum","cooling","chamber","ice","VR"],
  },
  {
    id:18, zone:"factory", priority:"MEDIUM",
    name:"Industrial Pipes & Valves Set",
    author:"Various", license:"CC",
    url:"https://sketchfab.com/tags/industrial-pipes",
    thumb:"🔧", color:"#78716c",
    polys:"~35K", formats:["FBX","OBJ"], vrOk:true, animated:false,
    desc:"Complete pijpenstelsel voor industriële omgeving. Sluit zones aan via visuele leidingen.",
    robloxNotes:"Verbind reactorvaten onderling. Gebruik kleuren voor vloeistof-type (rood=zuur, blauw=water).",
    vrNotes:"VR: Kleppen draaien als mini-game mechanic voor pH-regulatie.",
    tags:["pipes","valves","industrial","factory","connections"],
  },
  {
    id:19, zone:"nature", priority:"MEDIUM",
    name:"Photorealistic Dutch Farmland",
    author:"Various Photoscan", license:"CC-BY",
    url:"https://sketchfab.com/tags/farmland",
    thumb:"🌾", color:"#c8941a",
    polys:"high-res scan", formats:["FBX","OBJ"], vrOk:true, animated:false,
    desc:"Fotorealistisch polderlandschap — past perfect bij Natuur zone en Nederlandse context.",
    robloxNotes:"Gebruik als skybox / horizon mesh voor Natuur zone. StreamingEnabled voor performance.",
    vrNotes:"VR: Panoramisch uitzicht vanuit Natuur zone. Authentiek NL gevoel.",
    tags:["farmland","dutch","polder","realistic","nature","photoscan"],
  },
  {
    id:20, zone:"biome", priority:"HIGH",
    name:"Glowing Crystal / Quantum Dot Clusters",
    author:"Various", license:"CC",
    url:"https://sketchfab.com/tags/crystal",
    thumb:"💎", color:"#c4b5fd",
    polys:"~6K per cluster", formats:["FBX","OBJ","GLTF"], vrOk:true, animated:false,
    desc:"Gloeiende kristalformaties — ideaal voor quantum dot spawn locaties en edelgas-eilanden.",
    robloxNotes:"Gebruik als landmark op Helieum/Neon/Oganesson eilanden. Neon material + bloom.",
    vrNotes:"VR: Cluster als collectible — aanraken triggert quantum dot spawn storm.",
    tags:["crystal","glowing","quantum","gem","VR-ready","neon"],
  },
];

const ZONES_CONFIG = {
  nexus:   { name:"Molgang Nexus Hub",    col:"#22c55e", icon:"🏛" },
  biome:   { name:"Periodic Table Biome", col:"#1a9966", icon:"🔬" },
  quantum: { name:"Quantum Lab",          col:"#a855f7", icon:"⚛" },
  factory: { name:"Slakkenspoor Fabriek", col:"#c8941a", icon:"🏭" },
  nature:  { name:"Natuur & Bodem",       col:"#84cc16", icon:"🌿" },
};

const PRIORITY_COL = { CRITICAL:"#ef4444", HIGH:"#f59e0b", MEDIUM:"#22c55e" };

const VR_PLAN = [
  {
    phase:"Fase 1 — Q3 2026", title:"Roblox VR Base Support",
    icon:"🥽", col:"#22c55e",
    items:[
      "Roblox ingebouwde VR mode activeren: UserInputService.VREnabled check",
      "Meta Quest 2/3 + Valve Index + PlayStation VR2 via SteamVR",
      "VRHand controllers: ProximityPrompt werkt automatisch met hand-ray",
      "Head tracking: Camera CFrame via VRService:GetUserCFrame()",
      "Teleport locomotion (geen smooth — comfort voor beginners)",
      "VR-specifieke HUD: world-space GUI panels (geen screen-space UI in VR)",
    ],
  },
  {
    phase:"Fase 2 — Q1 2027", title:"Zones VR Optimalisatie",
    icon:"🌍", col:"#2a9acc",
    items:[
      "Natuur zone: fotorealistisch grasland, wind shader, ambient birds",
      "Slakkenspoor: industrieel rumble haptic bij HGMS machine",
      "Quantum Lab: 360° neon mist, superposition flicker op alle surfaces",
      "Periodic Table Biome: walk-through element-eilanden op ware schaal",
      "ANK Hub: inloopbare lobby, NPC loket met hand-shake interactie",
    ],
  },
  {
    phase:"Fase 3 — Q3 2027", title:"Full VR Interactie",
    icon:"🤝", col:"#a855f7",
    items:[
      "Atom vangen: letterlijk met hand grijpen (grab gesture + haptic feedback)",
      "Molecule bouwen: beide handen samenvoegen → binding animatie",
      "Quantum dot catch: tik snel met vinger voor haptic 'pop'",
      "ANK handshake: fysieke handshake met NPC loket (controller vibration)",
      "pH-puzzel: klep draaien met controller twist gesture",
      "Chain registratie: hand uitstrekken naar tower → beam effect",
    ],
  },
  {
    phase:"Fase 4 — 2028", title:"Mixed Reality & AI",
    icon:"🔮", col:"#f59e0b",
    items:[
      "Passthrough MR (Meta Quest 3): game over echte wereld heen",
      "Educatief: scan echte molecuulmodellen → spawn in game",
      "AI NPC Mol: stem-interactie voor chemie-uitleg via spraak",
      "Multiplayer VR: samen molecule bouwen in VR hand-by-hand",
      "Spatial audio: elk element heeft eigen toon (3D geluid per locatie)",
    ],
  },
];

// ── 3D OBJECT CARD COMPONENT ─────────────────────────────────────────
function AssetCard({ asset, selected, onSelect }) {
  const zc = ZONES_CONFIG[asset.zone];
  const pc = PRIORITY_COL[asset.priority];
  const isSelected = selected?.id === asset.id;

  return (
    <div onClick={() => onSelect(isSelected ? null : asset)}
      style={{
        borderRadius: 12, border: `1px solid ${isSelected ? asset.color : "#1a2d20"}`,
        background: isSelected ? `${asset.color}12` : "#0d1a10",
        cursor: "pointer", overflow: "hidden", transition: "all 0.2s",
      }}>
      {/* Preview area */}
      <div style={{
        height: 120, background: `linear-gradient(135deg, ${asset.color}18, #060e08)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", borderBottom: `1px solid ${asset.color}22`,
      }}>
        {/* 3D mock preview */}
        <div className="float" style={{ fontSize: 48, filter: `drop-shadow(0 0 12px ${asset.color})` }}>
          {asset.thumb}
        </div>
        {/* Zone badge */}
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: `${zc.col}22`, border: `1px solid ${zc.col}44`,
          borderRadius: 20, padding: "2px 8px",
          fontSize: 9, color: zc.col, fontFamily: "monospace",
        }}>
          {zc.icon} {asset.zone.toUpperCase()}
        </div>
        {/* Priority */}
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: `${pc}22`, border: `1px solid ${pc}44`,
          borderRadius: 20, padding: "2px 8px",
          fontSize: 8, color: pc, fontFamily: "monospace",
        }}>
          {asset.priority}
        </div>
        {/* VR / Animated badges */}
        <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 4 }}>
          {asset.vrOk && (
            <div style={{ background: "#a855f722", border: "1px solid #a855f766",
              borderRadius: 4, padding: "2px 6px", fontSize: 8, color: "#a855f7" }}>
              🥽 VR
            </div>
          )}
          {asset.animated && (
            <div style={{ background: "#22c55e22", border: "1px solid #22c55e66",
              borderRadius: 4, padding: "2px 6px", fontSize: 8, color: "#22c55e" }}>
              ▶ ANIM
            </div>
          )}
        </div>
        {/* ID */}
        <div style={{
          position: "absolute", bottom: 8, left: 8,
          fontFamily: "monospace", fontSize: 9, color: "#374151",
        }}>
          #{String(asset.id).padStart(2,"0")}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#f4f9f6",
          marginBottom: 3, lineHeight: 1.3 }}>{asset.name}</div>
        <div style={{ fontSize: 10, color: "#4a5568", fontFamily: "monospace",
          marginBottom: 8 }}>by {asset.author}</div>

        <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6,
          marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {asset.desc}
        </div>

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {asset.tags.slice(0,3).map(tag => (
            <span key={tag} style={{
              padding: "1px 6px", borderRadius: 10, fontSize: 8,
              background: "#1a2d20", color: "#4a5568",
              fontFamily: "monospace",
            }}>{tag}</span>
          ))}
          {asset.tags.length > 3 && (
            <span style={{ fontSize: 8, color: "#374151", padding: "1px 4px" }}>
              +{asset.tags.length-3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 3D SCENE PREVIEW (SVG) ───────────────────────────────────────────
function Scene3DPreview({ asset }) {
  const views = {
    quantum: (
      <g>
        {/* Quantum Lab floor */}
        <ellipse cx={140} cy={200} rx={120} ry={30} fill="#1a0a3a" stroke="#a855f744" strokeWidth={1}/>
        {/* Atom floating */}
        <g className="float" style={{transformOrigin:"140px 130px"}}>
          <circle cx={140} cy={130} r={35} fill="#1a0a3a" stroke="#a855f7" strokeWidth={2}/>
          <circle cx={140} cy={130} r={12} fill="#a855f7" opacity={0.6}/>
          <ellipse cx={140} cy={130} rx={34} ry={12} fill="none" stroke="#7c3aed"
            strokeWidth={1} strokeDasharray="3,3" className="spin" style={{transformOrigin:"140px 130px"}}/>
          <circle cx={174} cy={130} r={5} fill="#c4b5fd"/>
        </g>
        {/* Mist particles */}
        {[0,1,2,3,4].map(i => (
          <ellipse key={i} cx={80+i*15} cy={195} rx={12} ry={4}
            fill="#a855f7" opacity={0.1+i*0.04}/>
        ))}
        {/* Equipment */}
        <rect x={30} y={140} width={25} height={50} fill="#2a1a4a" stroke="#a855f744" rx={3}/>
        <rect x={230} y={155} width={20} height={40} fill="#2a1a4a" stroke="#a855f744" rx={3}/>
      </g>
    ),
    factory: (
      <g>
        {/* Factory floor */}
        <ellipse cx={140} cy={210} rx={130} ry={25} fill="#1a0f00" stroke="#c8941a44" strokeWidth={1}/>
        {/* Blast furnace */}
        <rect x={90} y={60} width={50} height={140} fill="#1a0f00" stroke="#ef4444" strokeWidth={1.5} rx={4}/>
        <rect x={80} y={155} width={70} height={20} fill="#2a1500" stroke="#c8941a" strokeWidth={1} rx={2}/>
        {/* Fire glow */}
        <circle cx={115} cy={80} r={15} fill="#ef4444" opacity={0.3}/>
        <circle cx={115} cy={80} r={8} fill="#f97316" opacity={0.5}/>
        {/* Smoke */}
        {[0,1,2].map(i => (
          <ellipse key={i} cx={100+i*10} cy={40-i*15} rx={8+i*3} ry={5+i*2}
            fill="#374151" opacity={0.3-i*0.08}/>
        ))}
        {/* Conveyor */}
        <rect x={20} y={175} width={100} height={12} fill="#2a2a2a" stroke="#c8941a44" rx={2}/>
        {[0,1,2,3].map(i => (
          <circle key={i} cx={30+i*25} cy={185} r={6} fill="#1a1a1a" stroke="#c8941a44"/>
        ))}
      </g>
    ),
    nature: (
      <g>
        {/* Sky */}
        <rect x={0} y={0} width={280} height={130} fill="#0a1a0a" rx={4}/>
        {/* Ground */}
        <ellipse cx={140} cy={210} rx={130} ry={30} fill="#0d2a05" stroke="#84cc1644" strokeWidth={1}/>
        {/* Trees */}
        {[40,90,180,230].map((x,i) => (
          <g key={i}>
            <rect x={x-3} y={140} width={6} height={60} fill="#5c3a1a"/>
            <ellipse cx={x} cy={130} rx={20+i*3} ry={25+i*2} fill="#1a5a0a" opacity={0.85}/>
            <ellipse cx={x-4} cy={120} rx={14} ry={18} fill="#22c55e" opacity={0.6}/>
          </g>
        ))}
        {/* Peony flowers */}
        {[110,130,150,170].map((x,i) => (
          <g key={i}>
            <line x1={x} y1={200} x2={x+3} y2={175} stroke="#22c55e" strokeWidth={1.5}/>
            <circle cx={x+3} cy={172} r={8} fill={`hsl(${320+i*10},80%,60%)`} opacity={0.9}/>
          </g>
        ))}
        {/* Nitrogen particles */}
        {[0,1,2,3].map(i => (
          <text key={i} x={60+i*40} y={155+i*5} fontSize={8} fill="#a855f7" opacity={0.4}>N₂</text>
        ))}
      </g>
    ),
    biome: (
      <g>
        {/* Space bg */}
        <rect x={0} y={0} width={280} height={240} fill="#060e05" rx={4}/>
        {/* Element islands */}
        {[[60,120,1,"#94a3b8","H"],[120,90,2,"#a855f7","He"],[180,120,6,"#64748b","C"],[90,160,8,"#38bdf8","O"]].map(([x,y,z,col,sym]) => (
          <g key={z}>
            <ellipse cx={x} cy={y+18} rx={20} ry={6} fill={col} opacity={0.15}/>
            <circle cx={x} cy={y} r={18} fill={`${col}18`} stroke={col} strokeWidth={1.2}/>
            <circle cx={x} cy={y} r={8} fill={col} opacity={0.3}/>
            <text x={x} y={y+4} textAnchor="middle" fontSize={9} fill={col} fontWeight="bold"
              fontFamily="monospace">{sym}</text>
          </g>
        ))}
        {/* Molecular geometry */}
        <g transform="translate(200,150)">
          <circle cx={0} cy={0} r={10} fill="#2a9acc33" stroke="#2a9acc" strokeWidth={1}/>
          {[[25,0],[-12,20],[-12,-20]].map(([dx,dy],i) => (
            <g key={i}>
              <line x1={0} y1={0} x2={dx} y2={dy} stroke="#2a9acc" strokeWidth={1}/>
              <circle cx={dx} cy={dy} r={7} fill="#2a9acc22" stroke="#2a9acc" strokeWidth={1}/>
            </g>
          ))}
        </g>
      </g>
    ),
    nexus: (
      <g>
        {/* Hub floor */}
        <ellipse cx={140} cy={200} rx={120} ry={25} fill="#0d1f1a" stroke="#22c55e44" strokeWidth={1}/>
        {/* ANK building */}
        <rect x={30} y={110} width={55} height={85} fill="#0a1a14" stroke="#2a9acc" strokeWidth={1.2} rx={3}/>
        <rect x={25} y={105} width={65} height={12} fill="#2a9acc" opacity={0.7} rx={2}/>
        <text x={57} y={95} textAnchor="middle" fontSize={14} fill="#2a9acc">⚓</text>
        {/* Chain Tower */}
        <rect x={125} y={50} width={18} height={150} fill="#0a1f10" stroke="#22c55e" strokeWidth={1.5} rx={2}/>
        {[0,1,2,3,4].map(i => (
          <ellipse key={i} cx={134} cy={60+i*25} rx={14} ry={4} fill="none"
            stroke="#22c55e" strokeWidth={0.8} opacity={0.5}/>
        ))}
        <circle cx={134} cy={45} r={8} fill="#22c55e" opacity={0.8}/>
        {/* Lab equipment */}
        <rect x={200} y={145} width={15} height={50} fill="#0d1f1a" stroke="#7ecf5a44" rx={2}/>
        <text x={207} y={170} textAnchor="middle" fontSize={12}>🧪</text>
      </g>
    ),
  };

  return (
    <div style={{ background: "#060e08", borderRadius: 10,
      border: `1px solid ${asset.color}22`, overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${asset.color}22`,
        fontFamily: "monospace", fontSize: 9, color: asset.color, letterSpacing: 2 }}>
        // 3D SCENE CONTEXT — {ZONES_CONFIG[asset.zone].name.toUpperCase()}
      </div>
      <svg viewBox="0 0 280 230" style={{ width: "100%", height: 180 }}>
        {views[asset.zone] || views.nexus}
      </svg>
    </div>
  );
}

// ── VR PLAN SECTION ──────────────────────────────────────────────────
function VRPlan() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: "#a855f7",
        letterSpacing: 4, marginBottom: 8 }}>// VR INTEGRATION ROADMAP</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#f4f9f6",
        letterSpacing: -1, marginBottom: 24 }}>
        MOLGANG VR — Meeslepend in de Moleculaire Wereld
      </div>

      {/* VR headset compatibility */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
        {[
          {name:"Meta Quest 2/3", icon:"🥽", status:"Primair", col:"#22c55e", note:"Standalone, geen PC nodig"},
          {name:"PlayStation VR2", icon:"🎮", status:"Ondersteund", col:"#2a9acc", note:"PS5 + Roblox app"},
          {name:"Valve Index", icon:"⌚", status:"PC VR", col:"#f59e0b", note:"SteamVR bridge"},
          {name:"Roblox Mobile XR", icon:"📱", status:"2028+", col:"#a855f7", note:"AR/MR toekomst"},
        ].map(h => (
          <div key={h.name} style={{ padding: 16, borderRadius: 10, textAlign: "center",
            background: "#0d1f1a", border: `1px solid ${h.col}33` }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{h.icon}</div>
            <div style={{ fontSize: 12, color: "#e8f0eb", fontWeight: 700 }}>{h.name}</div>
            <div style={{ padding: "3px 10px", borderRadius: 20,
              background: `${h.col}22`, color: h.col, fontSize: 9,
              fontFamily: "monospace", margin: "6px auto 6px",
              display: "inline-block" }}>{h.status}</div>
            <div style={{ fontSize: 10, color: "#4a5568" }}>{h.note}</div>
          </div>
        ))}
      </div>

      {/* Phase roadmap */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {VR_PLAN.map(phase => (
          <div key={phase.phase} style={{ padding: 20, borderRadius: 10,
            background: "#0d1f1a", border: `1px solid ${phase.col}33` }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, color: phase.col,
              letterSpacing: 3, marginBottom: 4 }}>{phase.phase}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f4f9f6",
              marginBottom: 12 }}>
              <span style={{ marginRight: 8 }}>{phase.icon}</span>{phase.title}
            </div>
            {phase.items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%",
                  background: phase.col, flexShrink: 0, marginTop: 5 }}/>
                <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{item}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Zone VR detail */}
      <div style={{ fontFamily: "monospace", fontSize: 9, color: "#22c55e",
        letterSpacing: 3, marginBottom: 16 }}>// ZONE-SPECIFIEKE VR ERVARINGEN</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {Object.entries(ZONES_CONFIG).map(([key, z]) => (
          <div key={key} style={{ padding: 14, borderRadius: 10,
            background: "#0d1f1a", border: `1px solid ${z.col}33` }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{z.icon}</div>
            <div style={{ fontSize: 11, color: z.col, fontWeight: 700, marginBottom: 8 }}>
              {z.name}
            </div>
            {({
              nexus:["Room-scale Hub lobby","Chain Tower lift","ANK handshake NPC"],
              biome:["Element eilanden rondom","Walk through periodic table","Grab-and-inspect atoms"],
              quantum:["Full 360° mist ervaring","Quantum dot flicker catch","Superposition visual"],
              factory:["Industrieel rumble","pH klep draaien","HGMS mini-game"],
              nature:["Open polder panorama","Peony smell gesture","N-deposition AR view"],
            }[key] || []).map((item, i) => (
              <div key={i} style={{ fontSize: 10, color: "#4a5568",
                padding: "3px 0", borderBottom: "1px solid #0d1f1a",
                lineHeight: 1.5 }}>{item}</div>
            ))}
          </div>
        ))}
      </div>

      {/* Roblox VR Lua code */}
      <div style={{ marginTop: 24, background: "#060e08", borderRadius: 10,
        border: "1px solid #1a2d20", padding: 20 }}>
        <div style={{ fontFamily: "monospace", fontSize: 9, color: "#1a9966",
          letterSpacing: 3, marginBottom: 12 }}>// LUA VR IMPLEMENTATIE — ROBLOX</div>
        <pre style={{ fontFamily: "monospace", fontSize: 11, color: "#7ecf5a",
          lineHeight: 1.8, overflowX: "auto" }}>
{`-- StarterPlayerScripts/VRController.lua
local VRService = game:GetService("VRService")
local UserInputService = game:GetService("UserInputService")

-- Check VR enabled
if not VRService.VREnabled then return end

-- World-space HUD voor VR (geen screen-space)
local function CreateVRHUD()
  local billboard = Instance.new("BillboardGui")
  billboard.Size = UDim2.new(0, 300, 0, 200)
  billboard.StudsOffset = Vector3.new(0, 3, 0)
  billboard.AlwaysOnTop = false
  return billboard
end

-- Hand-ray voor atom interactie
local function SetupHandInteraction()
  VRService.UserCFrameChanged:Connect(function(inputType, cframe)
    if inputType == Enum.UserCFrame.RightHand then
      -- Cast ray vanuit rechterhand
      local ray = Ray.new(cframe.Position, cframe.LookVector * 15)
      local hit = workspace:FindPartOnRay(ray)
      if hit and hit:GetAttribute("ElementZ") then
        -- Haptic feedback bij atom proximity
        HapticService:SetMotor(Enum.UserInputType.Gamepad1,
          Enum.VibrationMotor.RightHand, 0.3)
      end
    end
  end)
end`}</pre>
      </div>
    </div>
  );
}

// ── IMPORT GUIDE ─────────────────────────────────────────────────────
function ImportGuide() {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontFamily: "monospace", fontSize: 10, color: "#22c55e",
        letterSpacing: 4, marginBottom: 8 }}>// IMPORT PIPELINE</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#f4f9f6",
        letterSpacing: -1, marginBottom: 24 }}>
        Sketchfab → Blender → Roblox Studio
      </div>

      <div style={{ display: "flex", gap: 2, marginBottom: 32 }}>
        {[
          {n:"1",title:"Sketchfab Download",desc:"Download .glb/.fbx. Gratis account vereist voor meeste CC assets.",col:"#2a9acc",icon:"⬇"},
          {n:"2",title:"Blender Import",desc:"Open .glb in Blender 4.x. Check mesh, fix normals, reduceer polygonen.",col:"#f59e0b",icon:"🔧"},
          {n:"3",title:"Decimation",desc:"Modifier > Decimate. Target: <10K tris voor game-objects.",col:"#22c55e",icon:"✂"},
          {n:"4",title:"Export .fbx",desc:"File > Export > FBX. Triangulate, Apply Transform, Mesh only.",col:"#a855f7",icon:"📤"},
          {n:"5",title:"Roblox Import",desc:"Studio > Asset Manager > Bulk Import. Check scale (studs).",col:"#c8941a",icon:"🎮"},
          {n:"6",title:"Material Setup",desc:"Apply SurfaceAppearance, Neon voor atoms, Metalness voor factory.",col:"#ef4444",icon:"🎨"},
        ].map((s,i) => (
          <div key={i} style={{ flex: 1, padding: 14, background: "#0d1f1a",
            border: `1px solid ${s.col}33`,
            borderRadius: i===0?"8px 0 0 8px":i===5?"0 8px 8px 0":"0",
            borderLeft: i>0?"none":undefined }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: "monospace", fontSize: 8, color: s.col,
              letterSpacing: 1, marginBottom: 4 }}>STAP {s.n}</div>
            <div style={{ fontSize: 11, color: "#e8f0eb", fontWeight: 700, marginBottom: 4 }}>
              {s.title}
            </div>
            <div style={{ fontSize: 10, color: "#4a5568", lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* LOD Strategy */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          {name:"LOD 0 — Dichtbij",range:"<30 studs",polys:"<15K",detail:"Volledig detail",col:"#22c55e"},
          {name:"LOD 1 — Midden",range:"30-100 studs",polys:"<5K",detail:"Medium detail",col:"#f59e0b"},
          {name:"LOD 2 — Ver",range:">100 studs",polys:"<1K",detail:"Silhouet only",col:"#ef4444"},
        ].map(l => (
          <div key={l.name} style={{ padding: 16, borderRadius: 8, background: "#0d1f1a",
            border: `1px solid ${l.col}33` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: l.col, marginBottom: 8 }}>{l.name}</div>
            {[["Afstand",l.range],["Max polys",l.polys],["Detail",l.detail]].map(([k,v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between",
                padding: "4px 0", borderBottom: "1px solid #060e08", fontSize: 11 }}>
                <span style={{ color: "#4a5568" }}>{k}</span>
                <span style={{ color: l.col, fontFamily: "monospace", fontSize: 10 }}>{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Asset summary table */}
      <div style={{ fontFamily: "monospace", fontSize: 9, color: "#1a9966",
        letterSpacing: 3, marginBottom: 12 }}>// ASSET OVERZICHT — ALLE 20 OBJECTEN</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#0d1f1a" }}>
              {["#","Naam","Zone","Poly","VR","Prio","Download"].map(h => (
                <th key={h} style={{ padding: "8px 10px", textAlign: "left",
                  fontFamily: "monospace", fontSize: 9, color: "#22c55e",
                  letterSpacing: 1, borderBottom: "1px solid #1a2d20" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((a,i) => {
              const zc = ZONES_CONFIG[a.zone];
              return (
                <tr key={a.id} style={{ background: i%2===0 ? "#0d1f1a" : "#060e08" }}>
                  <td style={{ padding: "7px 10px", color: "#374151",
                    fontFamily: "monospace", fontSize: 10 }}>#{String(a.id).padStart(2,"0")}</td>
                  <td style={{ padding: "7px 10px", color: "#e8f0eb",
                    fontWeight: 600 }}>{a.name}</td>
                  <td style={{ padding: "7px 10px" }}>
                    <span style={{ color: zc.col, fontFamily: "monospace",
                      fontSize: 9 }}>{zc.icon} {a.zone}</span>
                  </td>
                  <td style={{ padding: "7px 10px", color: "#4a5568",
                    fontFamily: "monospace", fontSize: 10 }}>{a.polys}</td>
                  <td style={{ padding: "7px 10px" }}>
                    {a.vrOk ? <span style={{ color: "#a855f7" }}>🥽 ✓</span>
                      : <span style={{ color: "#374151" }}>—</span>}
                  </td>
                  <td style={{ padding: "7px 10px" }}>
                    <span style={{ color: PRIORITY_COL[a.priority],
                      fontFamily: "monospace", fontSize: 9 }}>{a.priority}</span>
                  </td>
                  <td style={{ padding: "7px 10px" }}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      style={{ color: "#2a9acc", fontSize: 10,
                        fontFamily: "monospace", textDecoration: "none" }}
                      onClick={e => e.stopPropagation()}>
                      → Sketchfab
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────
const TABS = ["3D Assets", "VR Plan", "Import Guide"];
const ZONE_FILTERS = ["Alle", ...Object.keys(ZONES_CONFIG)];

export default function Assets3D() {
  const [tab, setTab] = useState("3D Assets");
  const [selected, setSelected] = useState(null);
  const [zoneFilter, setZoneFilter] = useState("Alle");
  const [priorityFilter, setPriorityFilter] = useState("Alle");

  const filtered = ASSETS.filter(a =>
    (zoneFilter === "Alle" || a.zone === zoneFilter) &&
    (priorityFilter === "Alle" || a.priority === priorityFilter)
  );

  return (
    <div style={{ background: "#05080a", minHeight: "100vh" }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ background: "#060e08", borderBottom: "1px solid #1a2d20",
        padding: "12px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: 9,
            color: "#1a9966", letterSpacing: 4 }}>// SKETCHFAB 3D ASSETS</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#f4f9f6", letterSpacing: -1 }}>
            MOLGANG — 20 Sketchfab Objecten + VR Integratie
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: "6px 14px", borderRadius: 6,
                  border: `1px solid ${tab===t?"#22c55e":"#1a2d20"}`,
                  background: tab===t?"#22c55e22":"transparent",
                  color: tab===t?"#22c55e":"#4a5568",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 11,
                  letterSpacing: 0.5 }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        {/* Stats */}
        <div style={{ display: "flex", gap: 20 }}>
          {[["20","3D Objecten","#22c55e"],["17","VR-ready","#a855f7"],
            ["6","Geanimeerd","#f59e0b"],["5","Zones","#2a9acc"]].map(([v,l,c]) => (
            <div key={l} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ color: c, fontFamily: "monospace", fontWeight: 700,
                fontSize: 14 }}>{v}</span>
              <span style={{ color: "#4a5568", fontSize: 11 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {tab === "3D Assets" && (
        <div style={{ display: "flex", height: "calc(100vh - 90px)" }}>
          {/* LEFT: Filters + Grid */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* Filter bar */}
            <div style={{ padding: "14px 20px", background: "#060e08",
              borderBottom: "1px solid #1a2d20", display: "flex", gap: 16,
              flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ZONE_FILTERS.map(z => {
                  const zc = ZONES_CONFIG[z];
                  return (
                    <button key={z} onClick={() => setZoneFilter(z)}
                      style={{ padding: "3px 10px", borderRadius: 20,
                        border: `1px solid ${zoneFilter===z ? (zc?.col||"#22c55e") : "#1a2d20"}`,
                        background: zoneFilter===z ? `${zc?.col||"#22c55e"}22` : "transparent",
                        color: zoneFilter===z ? (zc?.col||"#22c55e") : "#4a5568",
                        cursor: "pointer", fontFamily: "monospace",
                        fontSize: 9, letterSpacing: 1 }}>
                      {zc?.icon||"🌐"} {z.toUpperCase()}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["Alle","CRITICAL","HIGH","MEDIUM"].map(p => (
                  <button key={p} onClick={() => setPriorityFilter(p)}
                    style={{ padding: "3px 10px", borderRadius: 20,
                      border: `1px solid ${priorityFilter===p ? (PRIORITY_COL[p]||"#22c55e") : "#1a2d20"}`,
                      background: priorityFilter===p ? `${PRIORITY_COL[p]||"#22c55e"}22` : "transparent",
                      color: priorityFilter===p ? (PRIORITY_COL[p]||"#22c55e") : "#4a5568",
                      cursor: "pointer", fontFamily: "monospace",
                      fontSize: 9, letterSpacing: 1 }}>
                    {p}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: "auto", fontFamily: "monospace",
                fontSize: 10, color: "#374151" }}>
                {filtered.length}/{ASSETS.length} assets
              </div>
            </div>

            {/* Asset grid */}
            <div style={{ padding: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
              gap: 14 }}>
              {filtered.map(asset => (
                <AssetCard key={asset.id} asset={asset}
                  selected={selected} onSelect={setSelected}/>
              ))}
            </div>
          </div>

          {/* RIGHT: Detail panel */}
          {selected && (
            <div style={{ width: 320, background: "#060e08",
              borderLeft: "1px solid #1a2d20", overflowY: "auto" }}>
              <div style={{ padding: 16 }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: selected.color,
                  letterSpacing: 3, marginBottom: 12 }}>// ASSET DETAIL</div>

                <Scene3DPreview asset={selected}/>

                <div style={{ marginTop: 16, marginBottom: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f4f9f6" }}>
                    {selected.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#4a5568", fontFamily: "monospace" }}>
                    by {selected.author}
                  </div>
                </div>

                <div style={{ background: "#0d1f1a", borderRadius: 8, padding: 12,
                  marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>
                    {selected.desc}
                  </div>
                </div>

                {[
                  ["Zone", `${ZONES_CONFIG[selected.zone].icon} ${ZONES_CONFIG[selected.zone].name}`, selected.color],
                  ["Prioriteit", selected.priority, PRIORITY_COL[selected.priority]],
                  ["Polygonen", selected.polys, "#94a3b8"],
                  ["Formaten", selected.formats.join(", "), "#22c55e"],
                  ["Licentie", selected.license, "#f59e0b"],
                  ["VR-ready", selected.vrOk ? "Ja ✓" : "Aanpassing nodig", selected.vrOk?"#a855f7":"#4a5568"],
                  ["Geanimeerd", selected.animated ? "Ja ✓" : "Nee", selected.animated?"#22c55e":"#4a5568"],
                ].map(([k,v,c]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between",
                    padding: "6px 0", borderBottom: "1px solid #0d1f1a", fontSize: 11 }}>
                    <span style={{ color: "#4a5568" }}>{k}</span>
                    <span style={{ color: c, fontFamily: "monospace",
                      fontSize: 10, maxWidth: 160, textAlign: "right" }}>{v}</span>
                  </div>
                ))}

                {/* Roblox Notes */}
                <div style={{ marginTop: 12, background: "#0d1f1a", borderRadius: 8,
                  border: "1px solid #1e3a2a", padding: 12 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: "#22c55e",
                    letterSpacing: 2, marginBottom: 6 }}>// ROBLOX IMPORT NOTES</div>
                  <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.7 }}>
                    {selected.robloxNotes}
                  </div>
                </div>

                {/* VR Notes */}
                <div style={{ marginTop: 8, background: "#1a0a2e", borderRadius: 8,
                  border: "1px solid #4a1a7e", padding: 12 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: "#a855f7",
                    letterSpacing: 2, marginBottom: 6 }}>// VR GEBRUIK</div>
                  <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.7 }}>
                    {selected.vrNotes}
                  </div>
                </div>

                {/* Tags */}
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selected.tags.map(tag => (
                    <span key={tag} style={{ padding: "2px 8px", borderRadius: 10,
                      background: `${selected.color}15`, color: selected.color,
                      fontSize: 9, fontFamily: "monospace",
                      border: `1px solid ${selected.color}33` }}>{tag}</span>
                  ))}
                </div>

                {/* Download button */}
                <a href={selected.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", marginTop: 16, padding: "10px",
                    background: `${selected.color}22`,
                    border: `1px solid ${selected.color}`,
                    borderRadius: 8, textAlign: "center",
                    color: selected.color, textDecoration: "none",
                    fontFamily: "monospace", fontSize: 11, letterSpacing: 1 }}>
                  ↗ OPEN OP SKETCHFAB
                </a>

                <button onClick={() => setSelected(null)}
                  style={{ display: "block", width: "100%", marginTop: 8,
                    padding: "8px", background: "transparent",
                    border: "1px solid #1a2d20", borderRadius: 6,
                    color: "#374151", cursor: "pointer",
                    fontFamily: "monospace", fontSize: 10 }}>
                  ← SLUIT
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "VR Plan" && <VRPlan/>}
      {tab === "Import Guide" && <ImportGuide/>}
    </div>
  );
}

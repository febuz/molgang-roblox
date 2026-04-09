import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   CRYPTOS — AGENT MOL  |  HIGH-TECH GAME DEVELOPMENT STUDIO
   100-Page Interactive Technical Document
   Hedera Hashgraph · Quantum Dots · Multi-Agent Claude Code Pipeline
   by Henricus Eduardus (EHMAC / Agent Mache)
═══════════════════════════════════════════════════════════════════ */

// ─── DESIGN TOKENS ───────────────────────────────────────────────
const C = {
  bg:     "#02040a", surface: "#050b12", card: "#080f18",
  border: "#0d1f2d", border2: "#0a3a2a",
  green:  "#00ff88", green2: "#00c860", green3: "#004d30",
  amber:  "#ffbb00", amber2: "#cc8800", amber3: "#3d2a00",
  cyan:   "#00e5ff", cyan2:  "#0088cc", red: "#ff3355",
  violet: "#9944ff", violet2:"#5522aa",
  white:  "#e8f4f0", steel:  "#4a7a6a", dim:    "#1a3a2a",
};

// ─── GLOBAL CSS ───────────────────────────────────────────────────
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@300;400;500;700&family=Barlow+Condensed:wght@300;500;700;900&family=Source+Code+Pro:wght@300;400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --green: #00ff88; --amber: #ffbb00; --cyan: #00e5ff;
    --red: #ff3355; --violet: #9944ff;
  }
  html { scroll-behavior: smooth; }
  body { background: #02040a; color: #e8f4f0; font-family: 'Azeret Mono', monospace; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #02040a; }
  ::-webkit-scrollbar-thumb { background: #004d30; border-radius: 2px; }

  /* CRT Scanline */
  body::before { content:''; position:fixed; inset:0; pointer-events:none; z-index:9999;
    background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,255,136,.012) 3px,rgba(0,255,136,.012) 4px); }

  /* Grain */
  body::after { content:''; position:fixed; inset:0; pointer-events:none; z-index:9998;
    opacity:.18; background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E"); }

  @keyframes scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  @keyframes glow { 0%,100%{filter:drop-shadow(0 0 4px #00ff88)} 50%{filter:drop-shadow(0 0 16px #00ff88)} }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 #00ff8844} 50%{box-shadow:0 0 0 8px transparent} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  @keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes orbit { from{transform:rotate(0deg) translateX(28px) rotate(0deg)} to{transform:rotate(360deg) translateX(28px) rotate(-360deg)} }
  @keyframes quantumFlicker { 0%,100%{opacity:1} 88%{opacity:1} 90%{opacity:.3} 92%{opacity:1} 96%{opacity:.7} 98%{opacity:1} }
  @keyframes waveform { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(.3)} }
  @keyframes progressFill { from{width:0} to{width:var(--w)} }

  .scan { position:fixed; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,#00ff8866,transparent); pointer-events:none; z-index:10000; animation:scan 8s linear infinite; }
  .blink { animation:blink 1s step-end infinite; }
  .glow-green { animation:glow 3s ease-in-out infinite; }
  .pulse { animation:pulse 2s infinite; }
  .fadeUp { animation:fadeUp .4s ease-out forwards; }
  .spin { animation:spin 12s linear infinite; }
  .quantum { animation:quantumFlicker 4s infinite; }

  .tab { padding:9px 16px; background:transparent; border:none; border-bottom:2px solid transparent;
    cursor:pointer; font-family:'Azeret Mono',monospace; font-size:9px; letter-spacing:2px;
    text-transform:uppercase; color:#1a4a30; transition:all .2s; white-space:nowrap; }
  .tab:hover { color:#00a060; }
  .tab.on { color:#00ff88; border-bottom-color:#00ff88; }

  .code { font-family:'Source Code Pro',monospace; font-size:10.5px; line-height:1.8;
    background:#030810; border:1px solid #0d1f2d; border-radius:6px; padding:16px;
    overflow-x:auto; white-space:pre; max-height:400px; overflow-y:auto; }

  .card { background:#080f18; border:1px solid #0d1f2d; border-radius:8px; overflow:hidden; transition:all .2s; }
  .card:hover { border-color:#004d30; }
  .card-green { background:#040f09; border:1px solid #004d30; border-radius:8px; }
  .card-amber { background:#0f0a02; border:1px solid #3d2a00; border-radius:8px; }
  .card-cyan  { background:#020f14; border:1px solid #003040; border-radius:8px; }
  .card-violet{ background:#0a0414; border:1px solid #2a1040; border-radius:8px; }
  .card-red   { background:#100204; border:1px solid #400010; border-radius:8px; }

  .mono { font-family:'Azeret Mono',monospace; }
  .cond { font-family:'Barlow Condensed',sans-serif; }
  .src  { font-family:'Source Code Pro',monospace; }

  .chip { padding:2px 8px; border-radius:12px; font-family:'Azeret Mono',monospace;
    font-size:8px; letter-spacing:1px; display:inline-block; margin:2px; border:1px solid; }
  .dot { width:6px; height:6px; border-radius:50%; display:inline-block; margin-right:5px; }

  .waveform-bar { width:3px; border-radius:2px; display:inline-block; margin:0 1px;
    background:#00ff88; animation:waveform .8s ease-in-out infinite; }

  .progress-track { height:4px; background:#0d1f2d; border-radius:2px; overflow:hidden; }
  .progress-fill { height:100%; border-radius:2px; transition:width 1s ease; }

  .qd-circle { border-radius:50%; display:flex; align-items:center; justify-content:center;
    font-family:'Azeret Mono',monospace; font-weight:700; cursor:pointer;
    transition:all .3s; border:2px solid; }
  .qd-circle:hover { transform:scale(1.1); }

  .agent-node { padding:12px 16px; border-radius:8px; border:1px solid; cursor:pointer;
    transition:all .2s; position:relative; }
  .agent-node:hover { transform:translateY(-2px); }
  .agent-node::after { content:''; position:absolute; bottom:-1px; left:50%; width:1px;
    height:20px; background:inherit; }

  table.data { width:100%; border-collapse:collapse; }
  table.data th { background:#0a1a10; color:#00ff88; font-family:'Azeret Mono',monospace;
    font-size:8px; letter-spacing:2px; padding:8px 12px; text-align:left;
    border-bottom:1px solid #004d30; text-transform:uppercase; }
  table.data td { padding:7px 12px; font-size:11px; border-bottom:1px solid #0d1f2d;
    font-family:'Azeret Mono',monospace; color:#4a7a6a; }
  table.data tr:hover td { background:#040f09; color:#00c860; }
  table.data td:first-child { color:#e8f4f0; }
`;

// ─── ALL DATA ─────────────────────────────────────────────────────

const DAYS = [
  // Phase 1: Foundation (1-10)
  { d:1,  ph:1, t:"Studio Launch", ag:"Orchestrator", details:"Repo init · GDD v1 · Tech stack decisions · Sprint 0 planning", done:["Git monorepo (Roblox + Hedera + Web)", "MOLGANG.project.json (Rojo)", "GDD v1 reviewed by all agents", "Hedera testnet account created"], col:"#00ff88" },
  { d:2,  ph:1, t:"Agent Team Setup", ag:"Orchestrator", details:"Claude Code multi-agent pipeline configured. 7 specialized agents spun up.", done:["GraphicsAgent: Roblox Studio + Blender pipeline", "PhysicsAgent: Lua molecular sim", "BlockchainAgent: Hedera SDK + HTS", "AudioAgent: spatial 3D sound", "UIAgent: React Native + game HUD", "QAAgent: auto playtesting bots", "NetworkAgent: Knit + ProfileService"], col:"#00ff88" },
  { d:3,  ph:1, t:"Hedera Genesis", ag:"BlockchainAgent", details:"Testnet wallets · Trust lines · Token schemas", done:["4 wallets: Issuer, ANK, Distribution, Burn", "MOLCO2 fungible token created", "MOLN fungible token created", "MOLMAT-Ca, Fe, V, Ti trust lines", "Testnet faucet automated", "HashIO RPC endpoint configured"], col:"#ffbb00" },
  { d:4,  ph:1, t:"Roblox Project Init", ag:"GraphicsAgent", details:"Studio setup · Future Lighting · PBR pipeline", done:["Lighting.Technology = Future", "Atmosphere + HDR sky configured", "MaterialManager.lua (all zones)", "LOD system (3-tier) live", "Roblox Assistant AI connected to Claude"], col:"#00e5ff" },
  { d:5,  ph:1, t:"Quantum Dot Physics", ag:"PhysicsAgent", details:"Brus equation implemented · CdSe size→color table", done:["QuantumDot.lua: Brus equation solver", "CdSe table: 2-10nm → 450-720nm", "Emission spectrum Gaussian profile", "Particle emitter per QD size class", "Color mapping to Roblox BrickColor"], col:"#9944ff" },
  { d:6,  ph:1, t:"Sub-Atomic Layer", ag:"PhysicsAgent", details:"Quark → hadron → atom crafting system", done:["6 quark types (up/down/strange/charm/top/bottom)", "Proton: 2up+1down assembly logic", "Neutron: 1up+2down assembly logic", "Nuclear binding energy table (IUPAC 2021)", "Atom constructor: protons+neutrons+electrons"], col:"#9944ff" },
  { d:7,  ph:1, t:"Audio Architecture", ag:"AudioAgent", details:"Spatial 3D audio · Zone ambients · Reaction SFX", done:["AudioManager.lua: 5-layer system", "Zone ambients: Zaandam/Wognum/Quantum/Nexus", "NPC distance filter (>80 studs = radio)", "39 reaction SFX profiles created", "HGMS magnetic field audio (3 Tesla levels)"], col:"#ff3355" },
  { d:8,  ph:1, t:"VR/AR Foundation", ag:"GraphicsAgent", details:"VRService init · Hand tracking · AR mobile", done:["VRService.lua: Meta Quest + PSVR2 + SteamVR", "VRHandController.lua: grab + release", "ARMobileService.lua: gyro camera", "Comfort vignette (motion sickness prevention)", "Snap turn (45°/90°/smooth options)"], col:"#00e5ff" },
  { d:9,  ph:1, t:"Multi-Platform Input", ag:"NetworkAgent", details:"Xbox/PS5/Switch/PC/Mobile/VR unified", done:["InputManager.lua: unified action bindings", "PS5 DualSense adaptive triggers", "Nintendo Switch Joy-Con gyro aim", "Xbox impulse triggers: 8 haptic profiles", "Mobile touch: all UI accessible"], col:"#ffbb00" },
  { d:10, ph:1, t:"Sprint 0 Review", ag:"Orchestrator", details:"All agents report. QA gate Phase 1.", done:["Hedera testnet: all 7 token classes live", "Roblox: boots, Future Lighting confirmed", "Brus equation: 12 QD sizes verified", "VR: session starts <3 sec Meta Quest 3", "Platform matrix: 8 platforms tested"], col:"#00ff88" },
  // Phase 2: Prototype (11-30)
  { d:11, ph:2, t:"Player Controller", ag:"PhysicsAgent", details:"Sonic momentum physics · Terrain-aware speed", done:["MovementController.lua: velocity accumulator", "Speed tiers: 16→28→42→60→80 s/s", "Hill boost: downhill slope detection", "Wind system: Beaufort 3 default (Wognum)", "Ice physics: −8 grip in Quantum Lab"], col:"#9944ff" },
  { d:14, ph:2, t:"Atom Collection Loop", ag:"PhysicsAgent+GraphicsAgent", details:"Core gameplay: catch atoms, see mass accumulate", done:["118 element atom models (PBR)", "Atom magnet pull (2 stud radius)", "MolCounter HUD: live mol display", "Atom spawn rules per zone", "Quark mini-game for rare elements"], col:"#9944ff" },
  { d:17, ph:2, t:"Molecule Builder MVP", ag:"PhysicsAgent+UIAgent", details:"H₂O, V₂O₅, C₆H₁₂O₆ construction system", done:["MoleculeBuilder.lua: slot + bond validation", "IUPAC valence rules enforced", "39 reaction VFX profiles: particle systems", "CO₂ balance updates on each reaction", "Molecule mass displayed in amu + grams"], col:"#9944ff" },
  { d:20, ph:2, t:"Blockchain MVP", ag:"BlockchainAgent", details:"First real NFT minted on Hedera testnet", done:["WalletConnect: HashPack + Magic Link onboard", "NFT mint on reaction completion (testnet)", "MOLCO2 token transfer on CO₂ capture", "Async queue: no gameplay blocking", "Mirror Node: balance reads (free)"], col:"#ffbb00" },
  { d:23, ph:2, t:"Zone 1: Zaandam", ag:"GraphicsAgent+AudioAgent", details:"Slakkenspoor factory fully playable", done:["800×600 stud factory map complete", "HGMS magnets (0.3T/0.7T/1.5T): magnetic field VFX", "pH-ladder puzzle: 6 vats, correct sequence", "Conveyor grind rails: +10 s/s boost", "Direk Vanadis NPC: 31 dialogue variants"], col:"#00e5ff" },
  { d:26, ph:2, t:"Zone 2: Wognum", ag:"GraphicsAgent+NetworkAgent", details:"Polder nature zone · Si-K biostimulant · N-deposition", done:["1200×1200 stud polder map complete", "NL weather: 5 states, Beaufort wind physics", "Pioenenveld: 340g CO₂/ha Si-K effect", "Ana Stikstra NPC: 28 dialogue variants", "KNMI sensor data integration"], col:"#00ff88" },
  { d:29, ph:2, t:"Prototype Review", ag:"Orchestrator+QAAgent", details:"5-10 external playtesters · Core loop validated", done:["Playtester feedback: loop is fun (target: 80%+)", "Performance: 60 FPS Quest 3 confirmed", "Blockchain: testnet NFT minted successfully", "Mol economy: first MOLCO2 earned in-game", "Sprint 3 planned: Zones 3-5 + NPC AI"], col:"#00ff88" },
  // Phase 3: Vertical Slice (31-50)
  { d:31, ph:3, t:"Zone 3: Quantum Lab", ag:"GraphicsAgent+PhysicsAgent", details:"TU Delft cryogenic zone · Quantum dot capture", done:["600×600 stud cryo lab (−196°C visual)", "QPU server rack 3D models: PBR cryogenic metal", "Quantum dot capture: Brus equation live", "5-sec Oganesson window: slow-motion VFX", "Dr. Kwantje: stochastic 41-variant AI"], col:"#9944ff" },
  { d:34, ph:3, t:"Zone 4: Nexus Hub", ag:"GraphicsAgent+BlockchainAgent", details:"Amsterdam IJburg spawn · ANK Coöperatief building", done:["1000×800 stud IJburg waterfront map", "MolChain Tower: 200 studs, grind-to-top route", "ANK building: open/closed cycle (Sat closed)", "Mol DEX: live price feed from Hedera AMM", "Ank Koopman NPC: 19 dialogue variants"], col:"#00ff88" },
  { d:37, ph:3, t:"Zone 5: Periodic Table Biome", ag:"GraphicsAgent+PhysicsAgent", details:"4000×4000 stud archipelago · 118 element islands", done:["118 island terrain generated (Parallel Luau)", "Element ghost NPCs: 118 unique appearances", "Alkali cluster: reactive water splash VFX", "Noble gas nebula: AR glow overlay", "Quantum Frontier Z>82: time-dilation zone"], col:"#9944ff" },
  { d:40, ph:3, t:"NPC AI System", ag:"NetworkAgent", details:"GTA6-style NPC AI · 24h schedules · Trust memory", done:["NPCScheduleService.lua: 24h clock (1min=1hr)", "WeatherSystem.lua: NL climate model, 5 states", "Memory: trust ±0.05-0.1 per player action", "Context dialogue: trust × weather × hour × activity", "Storm override: Kees → barn, Ana → offline"], col:"#00e5ff" },
  { d:43, ph:3, t:"CO₂ World System", ag:"GraphicsAgent+NetworkAgent", details:"Player emissions → live atmosphere change", done:["EmissionAtmosphere.lua: 6 tiers", "Tier range: −600g (Crystal Hero) → +600g (Ghost Ally)", "TweenService: 3-sec smooth atmosphere transition", "CarbonGhost red glitch particles at +500g", "DataStore: balance persists across sessions"], col:"#00ff88" },
  { d:46, ph:3, t:"CarbonGhost AI", ag:"NetworkAgent+AudioAgent", details:"Rogue AI antagonist · Data interrupts · Finale sequence", done:["CarbonGhost state machine: 6 modes", "Text interrupt system: context-aware messages", "Glitch shader: chromatic aberration effect", "Finale: 10,000 mol threshold collapses ghost", "Ghost v2.0: transparent as core variable"], col:"#ff3355" },
  { d:50, ph:3, t:"Vertical Slice Complete", ag:"Orchestrator+QAAgent", details:"10-20 min polished cohesive experience", done:["All 5 zones connected + traversable", "Core loop complete: catch→build→register", "Blockchain: NFT minted, MOLCO2 earned (testnet)", "10 external testers: desire to continue playing", "Art direction approved by stakeholders"], col:"#00ff88" },
  // Phase 4: Feature Expansion (51-70)
  { d:51, ph:4, t:"Hedera HTS Full Deploy", ag:"BlockchainAgent", details:"All 7 token families + AMM pools live on testnet", done:["MOLMAT-X: all 118 element trust lines", "AMM: MOLCO2/HBAR, MOLN/HBAR, ANKC/HBAR pools", "NFT mint: 0.02$ per MOLNFT (testnet)", "Smart contract: royalty enforcement (5% resale)", "Mirror Node: portfolio dashboard query"], col:"#ffbb00" },
  { d:54, ph:4, t:"MolHashChain Integration", ag:"BlockchainAgent+NetworkAgent", details:"Hedera consensus for molecular mass verification", done:["HCS topic: mol_mass_registry (0.0008$ per msg)", "Every atom catch submits mass to HCS", "Cumulative mol balance: Hedera-verified", "Roblox ↔ Hedera bridge: CloudflareWorker", "Tamper-proof leaderboard via HCS"], col:"#ffbb00" },
  { d:57, ph:4, t:"NFT Splitting Protocol", ag:"BlockchainAgent", details:"MOLNFT → MOLSUB components with own mol tokens", done:["split_nft.js: mass_fraction validation", "Smartphone split: 6 MOLSUB (screen/board/battery/camera/case/misc)", "MOLMAT bundle: redistributed proportionally", "Parent NFT: SPLIT_LOCKED state", "Sub-NFT trading: Trade App protocol"], col:"#ffbb00" },
  { d:60, ph:4, t:"Burn Protocol", ag:"BlockchainAgent", details:"MOLASS tokens minted on MOLNFT destruction", done:["burn_hook.js: XRPL-style on Hedera HCS", "Ash calculation: Brus-level chemical accuracy", "MOLASS: metal oxide composition per element", "CO₂ debt: registered to ENV_AUTHORITY", "Burn receipt: permanent HCS log entry"], col:"#ffbb00" },
  { d:63, ph:4, t:"VR Full Polish", ag:"GraphicsAgent", details:"Meta Quest 3 certified 72FPS · PSVR2 integration", done:["Comfort vignette: zero reported nausea", "Hand tracking: atom grab satisfying (haptic test)", "VR molecule builder: slot snap in 3D space", "AR mode: atoms appear in real-world space", "VR HUD: wrist-mounted mol counter"], col:"#00e5ff" },
  { d:66, ph:4, t:"Economy Balance", ag:"Orchestrator+BlockchainAgent", details:"10h simulated play · Inflation prevention", done:["Earn rate: 3-8 MOLCO2/min (balanced)", "Sink rate: NFT minting cost = 50 MOLCO2", "Leakage prevention: no infinite loop exploits", "ANK lend/borrow: 3.5% base rate live", "Price stability: AMM slippage <0.5% tested"], col:"#00ff88" },
  { d:70, ph:4, t:"Alpha Feature Complete", ag:"Orchestrator+QAAgent", details:"All features implemented · Smart contract audit starts", done:["All features: functional (not necessarily polished)", "Economy: tested with simulated 1000 concurrent users", "Smart contract audit: Trail of Bits engaged", "Analytics: Mixpanel + custom Hedera HCS events", "Crash rate: <1/hour on all 8 platforms"], col:"#00ff88" },
  // Phase 5: Polish + Alpha (71-100)
  { d:71, ph:5, t:"Visual Polish Pass", ag:"GraphicsAgent", details:"Juice everything · Screen effects · Micro-animations", done:["Reaction flash VFX: 39 profiles polished", "Screen shake: calibrated per event intensity", "Particle LOD: performance-adjusted particle count", "Blur DoF: focus distance 40m, far intensity 0.8", "NPC animation: idle variety per character"], col:"#00e5ff" },
  { d:75, ph:5, t:"Performance Sprint", ag:"PhysicsAgent+NetworkAgent", details:"Target: 60fps all platforms · <5s load · <300MB", done:["MicroProfiler: all bottlenecks resolved", "Parallel Luau: NPC AI offloaded to Actors", "DataStore batching: 3→1 reads per session start", "Texture streaming: LOD2 on mobile auto-trigger", "Network: 45-55kb/s average (down from 120kb/s)"], col:"#9944ff" },
  { d:80, ph:5, t:"Smart Contract Audit", ag:"BlockchainAgent", details:"External audit findings addressed · Security hardened", done:["Audit findings: 0 critical, 2 medium, 5 low", "Medium #1: reentrancy in ANK escrow → fixed", "Medium #2: integer overflow burn calc → fixed", "Multi-sig: 3-of-5 for ISSUER wallet", "Gnosis Safe equiv. on Hedera: configured"], col:"#ff3355" },
  { d:85, ph:5, t:"Global Localization", ag:"UIAgent", details:"14 languages · RTL Arabic · All scripts", done:["14 languages: NL/EN/DE/FR/ES/ES_AR/PT/AR/粵語/HI/TA/SW/YO/AM", "Arabic RTL: Noto Naskh Arabic font", "Cantonese: Noto Sans SC + Jyutping romanization", "All NPC dialogue: localization keys extracted", "Player website: 14-language React app live"], col:"#ffbb00" },
  { d:90, ph:5, t:"Marketing Launch Prep", ag:"Orchestrator", details:"Cryptos Agent Mol · Henricus Eduardus branding", done:["YouTube Shorts: 10 clips ready (20-35 sec)", "Slogan: 'Every Element Has a Secret'", "EHMAC anagram: Agent Mache character design", "Roblox game page: thumbnail + description + icons", "Hashtags: #CryptosAgentMol #Roblox #MolGang"], col:"#00ff88" },
  { d:95, ph:5, t:"Playtesting Final Round", ag:"QAAgent", details:"Target demographic · Global coverage · Feedback integrated", done:["50 testers: 10 per region (NL/Nigeria/India/China/US)", "Session length avg: 28 min (target: >20)", "Retention D1: 68% (target: >60%)", "NPS score: 72 (target: >50)", "Critical bugs: 0 (target: 0)"], col:"#00ff88" },
  { d:100, ph:5, t:"🚀 ALPHA LAUNCH", ag:"ALL AGENTS", details:"CRYPTOS — AGENT MOL goes live on Roblox", done:["Roblox publish: public experience", "Hedera mainnet: genesis block signed by Edwin + Diederik", "10K concurrent players Day 1 target", "Monitoring: Grafana dashboard live 24/7", "MolHashChain: first real MOLCO2 token minted"], col:"#ffbb00" },
];

const AGENTS = [
  { id:"orch",    name:"Orchestrator",    col:C.green,  icon:"🧠", role:"Central task router. Manages sprints, agent handoffs, budget governance.",
    tools:["Claude Code CLI", "LangGraph state machine", "GitHub Projects API", "Slack webhooks"],
    triggers:["Sprint start/end", "Agent error > threshold", "Budget approaching limit", "Milestone gate check"],
    outputFormat:"Structured JSON task bundles with priority, agent assignment, DoD criteria" },
  { id:"gfx",    name:"GraphicsAgent",   col:C.cyan,   icon:"🖥", role:"Realistic 3D: PBR materials, Future Lighting, VFX, VR/AR rendering.",
    tools:["Roblox Studio API", "Blender 4.x CLI", "MaterialManager.lua", "LODManager.lua"],
    triggers:["New zone asset request", "Visual quality below threshold", "VFX profile missing", "LOD variant needed"],
    outputFormat:"Roblox asset IDs + Lua configuration files + Blender FBX exports" },
  { id:"phys",   name:"PhysicsAgent",    col:C.violet, icon:"⚛", role:"Molecular dynamics, Brus equation, Lennard-Jones potentials, Roblox Parallel Luau.",
    tools:["Parallel Luau Actor API", "IUPAC element dataset", "Verlet integrator", "Brus equation solver"],
    triggers:["New element in game", "QD size-color mismatch", "Physics performance drop", "New reaction defined"],
    outputFormat:"Luau modules with type annotations + SharedTable data schemas" },
  { id:"chain",  name:"BlockchainAgent", col:C.amber,  icon:"⛓", role:"Hedera HTS tokens, NFT lifecycle, smart contracts, ANK economy.",
    tools:["Hedera SDK v2 (JS)", "HashIO JSON-RPC", "Mirror Node API", "Cloudflare Workers"],
    triggers:["New token type needed", "NFT mint request", "Economy imbalance detected", "Security audit finding"],
    outputFormat:"TypeScript HTS transaction scripts + Solidity smart contracts + economy reports" },
  { id:"audio",  name:"AudioAgent",      col:C.red,    icon:"🔊", role:"Spatial 3D audio, NPC distance filter, reaction SFX, dynamic music.",
    tools:["AudioManager.lua", "Roblox SoundService API", "FMOD-style layering", "EqualizerSoundEffect"],
    triggers:["New zone added", "Reaction VFX created", "NPC distance exceeds 80 studs", "Music mood shift needed"],
    outputFormat:"Lua audio configuration + rbxassetid manifest + mixing parameters" },
  { id:"ui",     name:"UIAgent",          col:C.cyan,   icon:"🎨", role:"HUD, menus, 14-language localization, mobile/VR/console adaptive UI.",
    tools:["Roblox ScreenGui API", "React Native (ANK App)", "i18n localization system", "BillboardGui"],
    triggers:["New game state", "Platform switch detected", "Language bundle needed", "Accessibility request"],
    outputFormat:"Roblox GUI instances + React Native components + localization JSON bundles" },
  { id:"qa",     name:"QAAgent",          col:C.green,  icon:"✅", role:"AI playtesting bots, performance regression, smart contract security.",
    tools:["Modl.ai bot framework", "Roblox MicroProfiler", "Slither (Solidity)", "Performance dashboard"],
    triggers:["Every PR merged", "Daily scheduled run", "Crash reported", "Economy anomaly detected"],
    outputFormat:"Structured test reports with pass/fail/severity + automated regression diffs" },
  { id:"net",    name:"NetworkAgent",    col:C.green,  icon:"🌐", role:"Knit framework, ProfileService, anti-cheat, Hedera bridge, multiplayer sync.",
    tools:["Knit v2", "ProfileService", "Roblox DataStoreService", "Cloudflare Workers + D1"],
    triggers:["Player join/leave", "Transaction queue overflow", "Replication lag > 100ms", "Cross-server event"],
    outputFormat:"Lua server modules + Cloudflare Worker endpoints + D1 schema migrations" },
];

const HTS_TOKENS = [
  { symbol:"MOLCO2", name:"Carbon Mol", type:"Fungible", unit:"1 mmol CO₂ = 0.044g", cost:"$0.001/tx", useCase:"Climate market, carbon credits, emission registry" },
  { symbol:"MOLN",   name:"Stikstof Mol", type:"Fungible", unit:"1 mmol N = 0.014g", cost:"$0.001/tx", useCase:"NL stikstofmarkt, AERIUS alternative, bodem data" },
  { symbol:"MOLMAT-X",name:"Materiaal Mol", type:"Fungible ×118", unit:"1 mmol element", cost:"$0.001/tx", useCase:"Object collateral, NFT onderpand, recycling" },
  { symbol:"MOLNFT", name:"Object NFT", type:"Non-Fungible", unit:"1 uniek object", cost:"$0.02/mint", useCase:"Eigendomsbewijs, ANK collateral, handelbaar" },
  { symbol:"MOLSUB", name:"Sub-component", type:"Non-Fungible", unit:"1 onderdeel", cost:"$0.02/mint", useCase:"Onderdelen markt, split-protocol, reparatie" },
  { symbol:"MOLASS", name:"As Mol", type:"Fungible", unit:"1 mmol oxide-as", cost:"$0.001/tx", useCase:"Verbrandingslocatie, metaal-terugwinning" },
  { symbol:"ANKC",   name:"ANK Credit", type:"Governance", unit:"1 ANKC = €0.01", cost:"$0.001/tx", useCase:"Leningen, rente, governance stem" },
];

const QD_SIZES = [
  { nm:2.0, wav:455, mat:"CdSe", col:"#6060ff", hex:"#6060ff", atoms:160,  energy:2.72, use:"Deep Blue display pixels, UV sensors" },
  { nm:2.5, wav:505, mat:"CdSe", col:"#00aaff", hex:"#00aaff", atoms:300,  energy:2.45, use:"Cyan-Green QLED, biosensors" },
  { nm:3.0, wav:530, mat:"CdSe", col:"#00ff80", hex:"#00ff80", atoms:520,  energy:2.34, use:"Green display, chlorophyll imaging" },
  { nm:3.5, wav:552, mat:"CdSe", col:"#80ff00", hex:"#80ff00", atoms:900,  energy:2.25, use:"Yellow-Green, solar concentrator" },
  { nm:4.5, wav:585, mat:"CdSe", col:"#ffcc00", hex:"#ffcc00", atoms:1900, energy:2.12, use:"Warm white, orange LED" },
  { nm:5.0, wav:605, mat:"CdSe", col:"#ff8800", hex:"#ff8800", atoms:2600, energy:2.05, use:"Orange-Red, NIR imaging" },
  { nm:6.5, wav:635, mat:"CdSe", col:"#ff3300", hex:"#ff3300", atoms:5500, energy:1.95, use:"Red display pixel, tumor imaging" },
  { nm:7.5, wav:660, mat:"CdSe", col:"#cc0044", hex:"#cc0044", atoms:8800, energy:1.88, use:"Deep Red, photodynamic therapy" },
  { nm:8.5, wav:710, mat:"InP",  col:"#880088", hex:"#880088", atoms:14000,energy:1.75, use:"NIR, tissue imaging" },
  { nm:10,  wav:760, mat:"PbS",  col:"#440044", hex:"#440044", atoms:26500,energy:1.63, use:"Telecom wavelength, night vision" },
];

const ZONES = [
  { id:"zaandam", name:"Slakkenspoor Fabriek", loc:"Zaandam, NL", icon:"🏭", col:C.amber,
    size:"800×600 studs", atm:"Orange factory glow · steam clouds · conveyor hum",
    sonic:["Conveyor grind rail (+10 s/s)","HGMS magnetic bumpers (0.3T/0.7T/1.5T)","Silo launch → altitude combo","pH vat springs (height = acidity)"],
    elements:["V","Ca","Fe","Ti","Si","Cr"],
    reactions:["CaO+CO₂→CaCO₃ (−44g)","V₂O₅ precipitation (pH 5.0)","TiO₂ separation (pH 1.5)","Fe₂O₃ magnetic separation"],
    npc:"Direk Vanadis (trust system, 31 variants)" },
  { id:"wognum", name:"Wognum Natuur", loc:"Wognum, Noord-Holland", icon:"🌸", col:C.green,
    size:"1200×1200 studs", atm:"Morning mist · polder wind · peony fields",
    sonic:["Polderweg sprint run (wind +8 s/s)","Windturbine blade grind to top","Sloot jump timing-combo","Kees' hoeve: inloopbaar"],
    elements:["N","K","Si","P","C","S"],
    reactions:["6CO₂+6H₂O→C₆H₁₂O₆ (−264g)","Si-K biostimulant (−340g/ha)","N₂ fixation","NH₄NO₃ decomposition"],
    npc:"Ana Stikstra (KNMI data, 28 variants) + Kees van der Meer (16 variants)" },
  { id:"quantum", name:"Quantum Lab TU Delft", loc:"Fictief ruimtestation boven Delft", icon:"⚛", col:C.violet,
    size:"600×600 studs", atm:"−196°C cryogenic · neon mist · server glow",
    sonic:["Superposisie zone: +20% speed","Cryo damp: viscosity slow","QPU server grind arc","Og catch: 5-sec slow-motion"],
    elements:["Nh","Og","Ts","Mc","Lv","Fl"],
    reactions:["Quantum dot synthesis (Brus eq)","Superposisie collapse","Nuclear binding energy","QPU gate operation: 0.054μg CO₂/million gates"],
    npc:"Dr. Kwantje (stochastic, 41 variants)" },
  { id:"nexus", name:"Molgang Nexus Hub", loc:"Amsterdam IJburg 2034", icon:"🏛", col:C.cyan,
    size:"1000×800 studs", atm:"IJburg waterfront · MolChain Tower pulse",
    sonic:["Fietspad auto-boost (+6 s/s)","Tower spiral grind (200 studs)","Marktplein parkour columns","Houseboat bounce platforms"],
    elements:["All 118 tradeable","MOLCO2 earned here","ANK lening available"],
    reactions:["Chain registration (any reaction)","ANK collateral assessment","HBAR/MOLCO2 AMM swap"],
    npc:"Prof. Femke + Ank Koopman + Marktkoopman Yusuf" },
  { id:"biome", name:"Periodic Table Biome", loc:"Zwevend archipel boven NL", icon:"🔬", col:C.green,
    size:"4000×4000 studs · 118 eilanden", atm:"Eternal twilight · element-specific ambient color",
    sonic:["Island-hop: 2-sec momentum grace","Orbital ring grind (heavy elements)","Quantum Frontier Z>82: time-dilation","Stardust bridge unlocks at 36 elements"],
    elements:["All 118 — each island = 1 element"],
    reactions:["All 39 MOLGANG reactions available","Element ghost NPCs: 1 fact per visit","Quantum Frontier: Og catch opportunity"],
    npc:"118 Element Geesten + Quiz Zuil NPCs" },
];

const BRUS_EXAMPLES = [
  { r:1.0, E:4.32, wav:287, label:"Too small (UV)", col:"#ffffff" },
  { r:1.25,E:3.61, wav:344, label:"UV-A", col:"#ddddff" },
  { r:1.5, E:2.95, wav:421, label:"Violet", col:"#8844ff" },
  { r:2.0, E:2.42, wav:513, label:"Green", col:"#00ff88" },
  { r:2.5, E:2.12, wav:585, label:"Yellow", col:"#ffcc00" },
  { r:3.0, E:1.95, wav:636, label:"Red", col:"#ff3300" },
  { r:4.0, E:1.79, wav:693, label:"Deep Red", col:"#aa0044" },
  { r:5.0, E:1.74, wav:713, label:"Bulk bandgap", col:"#660033" },
];

const COMPARE_CHAINS = [
  { name:"Hedera",    nft:"$0.02",   tx:"$0.001",  fin:"3-5 sec",    tps:"10,000+", royalty:"Protocol", energy:"0.000003 kWh", col:C.green },
  { name:"Ethereum",  nft:"$15-80",  tx:"$5-50",   fin:"12-15 min",  tps:"15",      royalty:"Mkt-dep",  energy:"0.01 kWh", col:"#627eea" },
  { name:"Solana",    nft:"$0.005",  tx:"$0.001",  fin:"400ms*",     tps:"3000",    royalty:"Mkt-dep",  energy:"0.00051 kWh", col:"#9945ff" },
  { name:"Polygon",   nft:"$0.10",   tx:"$0.01",   fin:"2-3 min",    tps:"7000",    royalty:"Mkt-dep",  energy:"0.0003 kWh", col:"#8247e5" },
  { name:"ImmutableX",nft:"$0",      tx:"$0",      fin:"Instant*",   tps:"9000",    royalty:"Partial",  energy:"Low", col:"#00bfff" },
];

const LUA_EXAMPLES = {
  brus: `-- QuantumDot.lua  (ReplicatedStorage/Physics)
-- Brus equation: calculate QD emission wavelength from radius

local QD = {}

-- CdSe material constants
local E_GAP = 1.74    -- eV (bulk bandgap)
local EPS   = 10.6    -- dielectric constant
local ME    = 0.13    -- electron effective mass (m0)
local MH    = 0.45    -- hole effective mass (m0)
local HBAR  = 0.6582  -- eV·fs (ℏ)
local A0    = 0.0529  -- nm (Bohr radius)
local M0    = 0.511e6 -- eV/c² (electron rest mass)

function QD.BrusEnergy(r_nm)
  local r = r_nm       -- radius in nm
  -- Quantum confinement term: ℏ²π²/(2r²) × (1/me + 1/mh)
  local pi2h2 = (math.pi^2 * HBAR^2)
  local reduced_mass_inv = (1/ME + 1/MH)
  local confinement = pi2h2 * reduced_mass_inv / (2 * (r * r) * M0 * A0^2)
  -- Coulomb term (attractive, negative): −1.8e²/(4πε₀εr)
  local coulomb = -1.8 * 1.44 / (EPS * r)  -- 1.44 eV·nm = e²/(4πε₀)
  return E_GAP + confinement + coulomb
end

function QD.Wavelength(r_nm)
  local E = QD.BrusEnergy(r_nm)
  return 1240 / E  -- nm (hc/E)
end

function QD.EmissionColor(r_nm)
  local wav = QD.Wavelength(r_nm)
  -- Map wavelength to Color3
  if     wav < 380 then return Color3.fromRGB( 60,  0,120) -- UV
  elseif wav < 450 then return Color3.fromRGB(100,  0,255) -- Violet
  elseif wav < 495 then return Color3.fromRGB(  0, 80,255) -- Blue
  elseif wav < 570 then return Color3.fromRGB(  0,220, 80) -- Green
  elseif wav < 590 then return Color3.fromRGB(255,200,  0) -- Yellow
  elseif wav < 620 then return Color3.fromRGB(255,120,  0) -- Orange
  elseif wav < 750 then return Color3.fromRGB(220,  0, 30) -- Red
  else               return Color3.fromRGB(100,  0, 40)    -- Deep Red
  end
end

-- Usage: catch a 3.5nm CdSe quantum dot
-- local color = QD.EmissionColor(3.5)  → Color3: yellow-green (552nm)
-- local mass_g = QD.Wavelength(3.5) / 100  → proportional reward

return QD`,

  hedera: `// hedera-genesis.js  (Node.js 18+)
// Create MOLCO2 fungible token on Hedera Testnet

import { Client, TokenCreateTransaction, TokenType,
         TokenSupplyType, PrivateKey, AccountId } from "@hashgraph/sdk";

const ISSUER_ID   = AccountId.fromString(process.env.ISSUER_ID);
const ISSUER_KEY  = PrivateKey.fromStringECDSA(process.env.ISSUER_SEED);

const client = Client.forTestnet();
client.setOperator(ISSUER_ID, ISSUER_KEY);

// ── CREATE MOLCO2 FUNGIBLE TOKEN ──────────────────────────────────
async function createMOLCO2() {
  const tx = await new TokenCreateTransaction()
    .setTokenName("Carbon Mol Token")
    .setTokenSymbol("MOLCO2")
    .setDecimals(6)                    // 1 MOLCO2 = 1 mmol CO₂ = 0.044g
    .setInitialSupply(0)               // Mint on demand
    .setSupplyType(TokenSupplyType.Infinite)
    .setTokenType(TokenType.FungibleCommon)
    .setTreasuryAccountId(ISSUER_ID)
    .setAdminKey(ISSUER_KEY.publicKey)
    .setSupplyKey(ISSUER_KEY.publicKey)
    .setFreezeDefault(false)
    .execute(client);

  const receipt = await tx.getReceipt(client);
  const tokenId = receipt.tokenId.toString();
  console.log("MOLCO2 Token ID:", tokenId); // e.g. 0.0.5647832
  return tokenId;
}

// ── MINT MOLCO2 ON CO₂ CAPTURE ────────────────────────────────────
// Called from Cloudflare Worker when player completes CO₂ capture
async function mintMOLCO2(recipientId, mol_amount) {
  const micromols = Math.round(mol_amount * 1_000_000); // 6 decimal places
  const mintTx = await new TokenMintTransaction()
    .setTokenId(MOLCO2_TOKEN_ID)
    .setAmount(micromols)
    .execute(client);
  // Transfer to player
  const transferTx = await new TransferTransaction()
    .addTokenTransfer(MOLCO2_TOKEN_ID, ISSUER_ID, -micromols)
    .addTokenTransfer(MOLCO2_TOKEN_ID, recipientId, micromols)
    .execute(client);
  return (await transferTx.getReceipt(client)).status.toString();
}

// ── MINT MOLNFT ON OBJECT REGISTRATION ───────────────────────────
async function mintMOLNFT(ankWallet, metadataIpfsCid) {
  const tx = await new TokenMintTransaction()
    .setTokenId(MOLNFT_TOKEN_ID)
    .addMetadata(Buffer.from(\`ipfs://\${metadataIpfsCid}\`))
    .execute(client);
  const receipt = await tx.getReceipt(client);
  // NFT serial number = unique object ID
  return receipt.serials[0].toNumber(); // e.g. 4729
}`,

  parallel: `-- ParticleSim.lua  (Actor in Parallel Luau)
-- Molecular dynamics: Lennard-Jones potential
-- Runs on worker thread via Actor model

local actor = script:GetActor()
local RunService = game:GetService("RunService")

-- Lennard-Jones parameters for CO₂ interaction
local EPSILON = 0.0037  -- eV (well depth)
local SIGMA   = 3.30    -- Angstroms (zero-crossing)
local CUTOFF  = 2.5 * SIGMA  -- 8.25 Angstroms cutoff

local function lennardJones(r)
  if r < 0.1 then return 1000 end  -- Prevent infinity
  local sr6 = (SIGMA / r)^6
  local sr12 = sr6 * sr6
  return 4 * EPSILON * (sr12 - sr6)  -- eV
end

local function calcForces(atoms)
  local forces = {}
  for i = 1, #atoms do forces[i] = Vector3.new(0,0,0) end

  for i = 1, #atoms do
    for j = i+1, #atoms do
      local r_vec = atoms[j].pos - atoms[i].pos
      local r = r_vec.Magnitude * 1e10  -- Convert to Angstroms

      if r < CUTOFF then
        local V = lennardJones(r)
        local F_mag = -6 * EPSILON / r * (2*(SIGMA/r)^12 - (SIGMA/r)^6)
        local F_dir = r_vec.Unit * F_mag

        forces[i] = forces[i] + F_dir
        forces[j] = forces[j] - F_dir  -- Newton's 3rd law
      end
    end
  end
  return forces
end

-- Velocity Verlet integrator (O(dt³) accuracy)
local function verletStep(atoms, dt)
  local forces = calcForces(atoms)
  for i, atom in ipairs(atoms) do
    local a = forces[i] / (atom.mass * 1.66054e-27)  -- F=ma in SI
    atom.pos = atom.pos + atom.vel * dt + 0.5 * a * dt^2
    atom.vel = atom.vel + a * dt
  end
end

-- Bind to parallel message
actor:BindToMessageParallel("SimulateFrame", function(atomData)
  local dt = atomData.dt or 1e-15  -- 1 femtosecond
  verletStep(atomData.atoms, dt)
  task.synchronize()  -- Return to main thread to update Roblox positions
  -- Signal render update
  game.ReplicatedStorage.Events.AtomPositionUpdate:Fire(atomData.atoms)
end)`,
};

// ─── SUBCOMPONENTS ─────────────────────────────────────────────────

function ScanLine() {
  return <div className="scan" />;
}

function Label({ children, col = C.green, size = 8, spacing = 3 }) {
  return (
    <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:size, color:col,
      letterSpacing:spacing, textTransform:"uppercase", opacity:.8 }}>
      // {children}
    </div>
  );
}

function HeroTitle({ children, col = C.green, size = "clamp(28px,5vw,60px)" }) {
  return (
    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
      fontSize:size, letterSpacing:-1, lineHeight:.92,
      color:col, filter:`drop-shadow(0 0 20px ${col}66)` }}>
      {children}
    </div>
  );
}

function Chip({ children, col }) {
  return (
    <span className="chip" style={{ color:col, borderColor:`${col}44`, background:`${col}12` }}>
      {children}
    </span>
  );
}

function CodeBlock({ code, lang = "lua", maxH = 400 }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        style={{ padding:"5px 14px", background:"transparent", border:`1px solid ${C.green}44`,
          borderRadius:4, color:C.green, cursor:"pointer", fontFamily:"'Azeret Mono',monospace",
          fontSize:8, letterSpacing:2, marginBottom:8 }}>
        {open ? "▲ HIDE" : "▼ SHOW"} {lang.toUpperCase()} CODE
      </button>
      {open && (
        <div className="code fadeUp" style={{ maxHeight:maxH }}>
          {code}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ pct, col = C.green, h = 4 }) {
  return (
    <div className="progress-track" style={{ height:h }}>
      <div className="progress-fill" style={{ width:`${pct}%`, background:col,
        backgroundImage:`linear-gradient(90deg, ${col}88, ${col})` }} />
    </div>
  );
}

function QDOrbit({ qdData }) {
  const [sel, setSel] = useState(null);
  return (
    <div style={{ position:"relative", width:260, height:260, margin:"0 auto" }}>
      {/* Nucleus */}
      <div style={{ position:"absolute", top:"50%", left:"50%",
        transform:"translate(-50%,-50%)", width:40, height:40,
        borderRadius:"50%", background:"radial-gradient(#00ff88,#004d30)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
        fontSize:10, color:"#000", zIndex:10 }}>
        Cd Se
      </div>
      {/* Orbital rings */}
      {[60,90,120].map((r,i) => (
        <div key={r} style={{ position:"absolute", top:"50%", left:"50%",
          width:r*2, height:r*2, borderRadius:"50%",
          border:`1px solid #004d3055`,
          transform:"translate(-50%,-50%)", pointerEvents:"none" }} />
      ))}
      {/* QD size markers */}
      {qdData.slice(0,8).map((qd, i) => {
        const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const orbitR = 60 + (i % 3) * 30;
        const x = Math.cos(angle) * orbitR;
        const y = Math.sin(angle) * orbitR;
        const sz = 8 + i * 2;
        return (
          <div key={qd.nm} onClick={() => setSel(sel?.nm === qd.nm ? null : qd)}
            style={{ position:"absolute", top:"50%", left:"50%",
              transform:`translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              width:sz, height:sz, borderRadius:"50%",
              background:qd.col, cursor:"pointer", zIndex:5,
              boxShadow:`0 0 ${sz}px ${qd.col}88`,
              border:`1px solid ${qd.col}`,
              transition:"all .2s" }}
            title={`${qd.nm}nm → ${qd.wav}nm`} />
        );
      })}
      {/* Info card */}
      {sel && (
        <div style={{ position:"absolute", top:"50%", left:"50%",
          transform:"translate(-50%, calc(-50% + 140px))",
          background:C.card, border:`1px solid ${sel.col}`,
          borderRadius:8, padding:"8px 12px", zIndex:20,
          minWidth:160, textAlign:"center" }}>
          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:16,
            fontWeight:900, color:sel.col }}>{sel.nm} nm CdSe</div>
          <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
            color:C.steel }}>λ = {sel.wav}nm · {sel.atoms} atoms</div>
          <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
            color:C.dim, marginTop:2 }}>{sel.use}</div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────

const TABS = [
  "🏭 STUDIO",
  "📅 100 DAYS",
  "🤖 AGENTS",
  "⛓ MOL HASHCHAIN",
  "⚛ QUANTUM PHYSICS",
  "🎮 GAME ENGINE",
  "🌍 GAME WORLD",
  "💻 CODE LIBRARY",
];

export default function App() {
  const [tab, setTab] = useState(0);
  const [dayFilter, setDayFilter] = useState(null);
  const [openDay, setOpenDay] = useState(null);
  const [openAgent, setOpenAgent] = useState(null);
  const [brusR, setBrusR] = useState(3.5);
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTicker(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const brusE = QD_SIZES[0] ? (
    1.74 + (Math.PI**2 * 0.6582**2 * (1/0.13 + 1/0.45)) / (2 * brusR**2 * 0.511e6 * 0.0529**2) - 1.8 * 1.44 / (10.6 * brusR)
  ) : 0;
  const brusWav = Math.round(1240 / Math.max(brusE, 0.1));
  const brusColor = QD_SIZES.reduce((c, q) => Math.abs(q.nm - brusR * 2) < 1 ? q.col : c, "#ffffff");

  const phases = [
    { n:1, label:"Foundation",      days:"1–10",  col:C.green },
    { n:2, label:"Prototype",       days:"11–30", col:C.cyan },
    { n:3, label:"Vertical Slice",  days:"31–50", col:C.violet },
    { n:4, label:"Feature Exp",     days:"51–70", col:C.amber },
    { n:5, label:"Polish + Alpha",  days:"71–100",col:C.red },
  ];

  return (
    <div style={{ background:C.bg, minHeight:"100vh" }}>
      <style>{G}</style>
      <ScanLine />

      {/* TICKER */}
      <div style={{ background:"#040c0a", borderBottom:`1px solid ${C.border2}`,
        padding:"4px 0", overflow:"hidden" }}>
        <div style={{ display:"flex", animation:"ticker 25s linear infinite", whiteSpace:"nowrap" }}>
          {["CRYPTOS — AGENT MOL","HENRICUS EDUARDUS","MOL HASHCHAIN",
            "HEDERA HTS","QUANTUM DOTS","BRUS EQUATION","CLAUDE CODE AGENTS",
            "ROBLOX FUTURE LIGHTING","118 ELEMENTS","10,000 TPS","$0.02 NFT MINT",
            "3-5 SEC FINALITY","AGENT MACHE","VR/AR MULTI-PLATFORM",
            "CRYPTOS — AGENT MOL","HENRICUS EDUARDUS","MOL HASHCHAIN",
            "HEDERA HTS","QUANTUM DOTS","BRUS EQUATION","CLAUDE CODE AGENTS",
          ].map((t,i) => (
            <span key={i} style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
              color:C.dim, padding:"0 18px", letterSpacing:2 }}>⬡ {t}</span>
          ))}
        </div>
      </div>

      {/* HEADER */}
      <div style={{ background:C.surface, borderBottom:`1px solid ${C.border2}`,
        padding:"12px 24px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:10 }}>
          {/* Logo */}
          <div>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
              fontSize:22, letterSpacing:1, color:C.green,
              filter:`drop-shadow(0 0 10px ${C.green}55)`, lineHeight:1 }}>
              CRYPTOS — AGENT MOL
            </div>
            <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
              color:C.steel, letterSpacing:2, marginTop:1 }}>
              HIGH-TECH GAME DEVELOPMENT STUDIO · 100-PAGE TECHNICAL DOCUMENT
            </div>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", gap:6, flexWrap:"wrap" }}>
            {[["Hedera HTS",C.amber],["Quantum Dots",C.violet],["Claude Code",C.cyan],
              ["Roblox",C.red],["VR/AR",C.green]].map(([l,c]) => (
              <Chip key={l} col={c}>{l}</Chip>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}`,
          overflowX:"auto" }}>
          {TABS.map((t,i) => (
            <button key={t} className={`tab ${tab===i?"on":""}`}
              onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ height:"calc(100vh - 110px)", overflowY:"auto" }}>

        {/* ══ TAB 0 — STUDIO HQ ══ */}
        {tab === 0 && (
          <div style={{ padding:28 }}>
            <Label>Studio Overview</Label>
            <div style={{ display:"flex", gap:32, alignItems:"flex-start",
              marginTop:8, marginBottom:32, flexWrap:"wrap" }}>
              <div style={{ flex:2, minWidth:300 }}>
                <HeroTitle>CRYPTOS<br/>AGENT MOL</HeroTitle>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:500,
                  fontSize:16, color:C.amber, marginTop:6, letterSpacing:1 }}>
                  by Henricus Eduardus · EHMAC · Agent Mache
                </div>
                <div style={{ fontSize:12, color:C.steel, marginTop:12, lineHeight:1.8,
                  maxWidth:500 }}>
                  A high-tech game development studio building the world's first
                  molecularly accurate Roblox game with real Hedera Hashgraph
                  blockchain integration, quantum dot physics, and a multi-agent
                  Claude Code development pipeline.
                </div>
              </div>
              {/* Waveform decoration */}
              <div style={{ display:"flex", alignItems:"center", gap:2 }}>
                {Array.from({length:24}, (_,i) => (
                  <div key={i} className="waveform-bar"
                    style={{ height:`${16 + Math.sin(i*0.7+ticker)*12}px`,
                      animationDelay:`${i*0.05}s` }} />
                ))}
              </div>
            </div>

            {/* Studio Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",
              gap:10, marginBottom:28 }}>
              {[
                ["100","Day Roadmap",C.green],["8","AI Agents",C.cyan],
                ["118","Elements",C.violet],["7","Token Types",C.amber],
                ["39","Reactions",C.green],["5","Game Zones",C.red],
                ["14","Languages",C.cyan],["8","Platforms",C.amber],
                ["$0.02","NFT Mint Cost",C.green],["10,000","TPS Hedera",C.amber],
                ["3-5s","Finality",C.cyan],["72 FPS","VR Target",C.violet],
              ].map(([v,l,c]) => (
                <div key={l} className="card-green" style={{ padding:"14px 16px" }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                    fontSize:32, color:c, lineHeight:1,
                    filter:`drop-shadow(0 0 8px ${c}55)` }}>{v}</div>
                  <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                    color:C.steel, letterSpacing:1, marginTop:4 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Vision */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14,
              marginBottom:20 }}>
              {[
                { t:"MOL GANG MANIFESTO", col:C.green, icon:"⬡",
                  body:"The Mol Gang operates outside the gangbare regels. We meten. We registreren. We verhandelen. Elk object van grondstoffen tot as is onze data. Die data is ons eigendom. Dat eigendom is onze vrijheid." },
                { t:"AGENT MACHE CODE NAME", col:C.amber, icon:"🕶",
                  body:"EHMAC anagram → MACHE (Greek: μάχη = battle/fight). Henricus Eduardus = Latin first+middle names of Edwin Hauwert. The agent who fights CarbonGhost with molecular precision." },
                { t:"MOL HASHCHAIN", col:C.cyan, icon:"⛓",
                  body:"Hedera Hashgraph DAG — not a blockchain. aBFT consensus. 10,000 TPS. $0.001 per tx. HTS native tokens mint at $0.02 each. MolHashChain verifies molecular mass on-chain via HCS at $0.0008/message." },
                { t:"QUANTUM ACCURACY", col:C.violet, icon:"⚛",
                  body:"Brus equation drives quantum dot emission colors. CdSe 2nm → blue (455nm). CdSe 6.5nm → red (635nm). Sub-atomic layer: quarks → hadrons → atoms → nanocrystals → tokenized NFTs." },
              ].map(s => (
                <div key={s.t} className={`card-${s.col===C.green?"green":s.col===C.amber?"amber":s.col===C.cyan?"cyan":"violet"}`}
                  style={{ padding:16 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:20 }}>{s.icon}</span>
                    <Label col={s.col}>{s.t}</Label>
                  </div>
                  <div style={{ fontSize:12, color:C.steel, lineHeight:1.7 }}>{s.body}</div>
                </div>
              ))}
            </div>

            {/* Slogan */}
            <div style={{ background:C.card, borderRadius:12, padding:28,
              border:`1px solid ${C.green}22`, textAlign:"center",
              position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", inset:0,
                background:"radial-gradient(ellipse at 50% 0%, #00ff8808, transparent 70%)",
                pointerEvents:"none" }} />
              <Label col={C.amber} size={9} spacing={4}>Primary Slogan</Label>
              <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                fontSize:"clamp(28px,5vw,52px)", letterSpacing:-1, marginTop:8,
                color:C.amber, filter:`drop-shadow(0 0 20px ${C.amber}66)` }}>
                "Every Element Has a Secret."
              </div>
              <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:10,
                color:C.steel, marginTop:8 }}>
                YouTube Shorts · Roblox In-Game · 2026 Campaign · by Henricus Eduardus
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB 1 — 100 DAYS ══ */}
        {tab === 1 && (
          <div style={{ padding:28 }}>
            <Label>100-Day Development Roadmap</Label>
            <HeroTitle col={C.cyan} size="clamp(24px,4vw,42px)">
              SPRINT BY SPRINT.<br/>AGENT BY AGENT.
            </HeroTitle>

            {/* Phase overview */}
            <div style={{ display:"flex", gap:6, marginTop:16, marginBottom:20,
              flexWrap:"wrap" }}>
              <button onClick={() => setDayFilter(null)}
                style={{ padding:"5px 12px", borderRadius:4, cursor:"pointer",
                  border:`1px solid ${!dayFilter ? C.green : C.border}`,
                  background:!dayFilter ? `${C.green}15` : "transparent",
                  color:!dayFilter ? C.green : C.steel,
                  fontFamily:"'Azeret Mono',monospace", fontSize:8, letterSpacing:1 }}>
                ALL PHASES
              </button>
              {phases.map(ph => (
                <button key={ph.n} onClick={() => setDayFilter(dayFilter===ph.n ? null : ph.n)}
                  style={{ padding:"5px 12px", borderRadius:4, cursor:"pointer",
                    border:`1px solid ${dayFilter===ph.n ? ph.col : C.border}`,
                    background:dayFilter===ph.n ? `${ph.col}15` : "transparent",
                    color:dayFilter===ph.n ? ph.col : C.steel,
                    fontFamily:"'Azeret Mono',monospace", fontSize:8, letterSpacing:1 }}>
                  Ph.{ph.n}: {ph.label} ({ph.days})
                </button>
              ))}
            </div>

            {/* Timeline */}
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {DAYS.filter(d => !dayFilter || d.ph === dayFilter).map(day => (
                <div key={day.d} onClick={() => setOpenDay(openDay===day.d ? null : day.d)}
                  style={{ background:openDay===day.d ? C.surface : C.card,
                    borderRadius:8, border:`1px solid ${openDay===day.d ? day.col : C.border}`,
                    overflow:"hidden", cursor:"pointer", transition:"all .2s" }}>
                  <div style={{ padding:"10px 16px", display:"flex", gap:12, alignItems:"center" }}>
                    {/* Day number */}
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                      fontSize:22, color:day.col, minWidth:36, letterSpacing:-1 }}>
                      {String(day.d).padStart(3,"0")}
                    </div>
                    {/* Phase dot */}
                    <div className="dot" style={{ background:day.col, flexShrink:0 }} />
                    {/* Title */}
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                        fontSize:16, color:C.white, lineHeight:1.2 }}>{day.t}</div>
                      <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                        color:C.steel, marginTop:1 }}>{day.ag}</div>
                    </div>
                    <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                      color:day.col, opacity:.6 }}>{openDay===day.d ? "▲" : "▼"}</div>
                  </div>
                  {openDay === day.d && (
                    <div style={{ padding:"0 16px 14px", animation:"fadeUp .3s ease-out" }}>
                      <div style={{ fontSize:12, color:C.steel, marginBottom:10,
                        fontFamily:"'Azeret Mono',monospace" }}>{day.details}</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {day.done.map((d,i) => (
                          <span key={i} style={{ padding:"3px 9px", borderRadius:4,
                            background:C.surface, border:`1px solid ${C.border}`,
                            fontFamily:"'Azeret Mono',monospace", fontSize:9,
                            color:C.steel }}>
                            ✓ {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TAB 2 — AGENTS ══ */}
        {tab === 2 && (
          <div style={{ padding:28 }}>
            <Label col={C.cyan}>Multi-Agent Claude Code Pipeline</Label>
            <HeroTitle col={C.cyan} size="clamp(22px,4vw,40px)">
              8 SPECIALIZED AGENTS.<br/>ONE GAME.
            </HeroTitle>
            <div style={{ fontSize:12, color:C.steel, marginTop:6, marginBottom:24,
              maxWidth:580, lineHeight:1.8 }}>
              Orchestrator-worker architecture. LangGraph state machine.
              Each agent has a specialized skill set, dedicated toolchain,
              and defined handoff protocol.
            </div>

            {/* Agent network diagram */}
            <div style={{ textAlign:"center", marginBottom:28, padding:20,
              background:C.card, borderRadius:12, border:`1px solid ${C.border}` }}>
              <Label col={C.cyan} size={8}>Orchestration Flow</Label>
              <div style={{ display:"flex", justifyContent:"center",
                alignItems:"center", gap:8, marginTop:12, flexWrap:"wrap" }}>
                <div style={{ padding:"10px 20px", borderRadius:8,
                  background:`${C.green}20`, border:`2px solid ${C.green}`,
                  fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                  fontSize:16, color:C.green }}>
                  🧠 ORCHESTRATOR
                </div>
                <div style={{ fontSize:18, color:C.border2 }}>→</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap",
                  justifyContent:"center" }}>
                  {AGENTS.slice(1).map(a => (
                    <div key={a.id} onClick={() => setOpenAgent(openAgent===a.id ? null : a.id)}
                      style={{ padding:"6px 12px", borderRadius:6, cursor:"pointer",
                        background:`${a.col}10`, border:`1px solid ${openAgent===a.id ? a.col : `${a.col}44`}`,
                        fontFamily:"'Azeret Mono',monospace", fontSize:9,
                        color:a.col, transition:"all .2s" }}>
                      {a.icon} {a.name.replace("Agent","")}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Agent cards */}
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:12 }}>
              {AGENTS.map(a => (
                <div key={a.id} className="card" onClick={() => setOpenAgent(openAgent===a.id?null:a.id)}
                  style={{ border:`1px solid ${openAgent===a.id ? a.col : C.border}`,
                    background:openAgent===a.id ? C.surface : C.card, cursor:"pointer" }}>
                  <div style={{ padding:"14px 16px", borderBottom:`1px solid ${a.col}22`,
                    background:`${a.col}08`, display:"flex", gap:10, alignItems:"center" }}>
                    <span style={{ fontSize:24 }}>{a.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                        fontSize:18, color:a.col }}>{a.name}</div>
                      <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                        color:C.steel, marginTop:1 }}>{a.role.slice(0,60)}...</div>
                    </div>
                    <div style={{ color:a.col, fontSize:10, opacity:.5 }}>
                      {openAgent===a.id?"▲":"▼"}
                    </div>
                  </div>
                  {openAgent === a.id && (
                    <div style={{ padding:14, animation:"fadeUp .3s" }}>
                      <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                        color:a.col, letterSpacing:2, marginBottom:6 }}>TOOLS</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:12 }}>
                        {a.tools.map(t => <Chip key={t} col={a.col}>{t}</Chip>)}
                      </div>
                      <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                        color:a.col, letterSpacing:2, marginBottom:6 }}>TRIGGERS</div>
                      {a.triggers.map((tr,i) => (
                        <div key={i} style={{ display:"flex", gap:8, marginBottom:4 }}>
                          <div className="dot" style={{ background:a.col, marginTop:5, flexShrink:0 }} />
                          <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:10,
                            color:C.steel }}>{tr}</div>
                        </div>
                      ))}
                      <div style={{ marginTop:10, background:C.surface, borderRadius:6,
                        padding:"8px 12px", border:`1px solid ${C.border}` }}>
                        <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                          color:a.col, letterSpacing:2, marginBottom:4 }}>OUTPUT FORMAT</div>
                        <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                          color:C.dim }}>{a.outputFormat}</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Handoff protocol */}
            <div style={{ marginTop:20, background:C.card, borderRadius:10,
              border:`1px solid ${C.border}`, padding:18 }}>
              <Label col={C.amber} size={8}>Agent Handoff Protocol</Label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 }}>
                {[
                  { t:"Structured JSON Handoff", col:C.green, desc:"Agent outputs: {task_id, status, artifacts[], next_agent, context_summary}. LangGraph routes to next node." },
                  { t:"Budget Governor", col:C.amber, desc:"Hard token limits per agent per task. Orchestrator aborts if agent exceeds 50K tokens without progress checkpoint." },
                  { t:"Circuit Breaker", col:C.red, desc:"3 consecutive agent errors → pause + human review trigger. Prevents cascading failures in blockchain operations." },
                  { t:"Observability Stack", col:C.cyan, desc:"LangSmith traces all agent chains. Langfuse logs cost per task. GitHub Issues auto-created on agent error > severity 3." },
                ].map(h => (
                  <div key={h.t} className={`card-${h.col===C.green?"green":h.col===C.amber?"amber":h.col===C.red?"red":"cyan"}`}
                    style={{ padding:12 }}>
                    <Label col={h.col} size={8}>{h.t}</Label>
                    <div style={{ fontSize:11, color:C.steel, lineHeight:1.6, marginTop:6 }}>
                      {h.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB 3 — MOL HASHCHAIN ══ */}
        {tab === 3 && (
          <div style={{ padding:28 }}>
            <Label col={C.amber}>Hedera Hashgraph · Mol Hash Chain</Label>
            <HeroTitle col={C.amber} size="clamp(22px,4vw,42px)">
              NOT A BLOCKCHAIN.<br/>A DAG.
            </HeroTitle>
            <div style={{ fontSize:12, color:C.steel, marginTop:6, marginBottom:24,
              maxWidth:580, lineHeight:1.8 }}>
              Hedera Hashgraph uses a Directed Acyclic Graph with asynchronous Byzantine
              Fault Tolerance. 10,000+ TPS. $0.02 NFT mint. 3-5 second deterministic finality.
              Protocol-level royalty enforcement.
            </div>

            {/* Chain comparison */}
            <Label col={C.amber} size={8}>Chain Comparison Matrix</Label>
            <div style={{ overflowX:"auto", marginBottom:24, marginTop:8 }}>
              <table className="data">
                <thead>
                  <tr>
                    {["Chain","NFT Mint","Tx Cost","Finality","TPS","Royalty","Energy/tx"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_CHAINS.map(c => (
                    <tr key={c.name}
                      style={{ background:c.name==="Hedera"?`${C.green}08`:"transparent" }}>
                      <td style={{ color:c.col, fontWeight:700 }}>
                        {c.name==="Hedera" && "★ "}{c.name}
                      </td>
                      <td style={{ color:c.name==="Hedera"?C.green:C.steel }}>{c.nft}</td>
                      <td style={{ color:c.name==="Hedera"?C.green:C.steel }}>{c.tx}</td>
                      <td style={{ color:c.name==="Hedera"?C.green:C.steel }}>{c.fin}</td>
                      <td>{c.tps}</td>
                      <td style={{ color:c.name==="Hedera"?C.green:C.steel }}>{c.royalty}</td>
                      <td>{c.energy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Token families */}
            <Label col={C.amber} size={8}>Mol Token Architecture — 7 Families</Label>
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10, marginTop:8, marginBottom:24 }}>
              {HTS_TOKENS.map(tk => (
                <div key={tk.symbol} className="card-amber" style={{ padding:14 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                      fontSize:20, color:C.amber }}>{tk.symbol}</div>
                    <Chip col={tk.type.includes("Fungible") ? C.green : C.violet}>
                      {tk.type}
                    </Chip>
                    <Chip col={C.amber}>{tk.cost}</Chip>
                  </div>
                  <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                    color:C.green, marginBottom:4 }}>{tk.unit}</div>
                  <div style={{ fontSize:11, color:C.steel, lineHeight:1.5 }}>{tk.useCase}</div>
                </div>
              ))}
            </div>

            {/* MolHashChain architecture */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:20 }}>
              <div className="card-amber" style={{ padding:16 }}>
                <Label col={C.amber} size={8}>MolHashChain — Molecular Mass Registry</Label>
                <div style={{ fontSize:12, color:C.steel, lineHeight:1.7, marginTop:8 }}>
                  Every atom caught in-game submits its atomic mass to <strong style={{color:C.amber}}>Hedera Consensus Service</strong> Topic.
                  Cost: $0.0008/message. The cumulative mol balance becomes <strong style={{color:C.amber}}>Hedera-verified</strong> and tamper-proof.
                  Leaderboard is HCS-backed — no fake scores possible.
                </div>
                <div style={{ marginTop:10, fontFamily:"'Source Code Pro',monospace",
                  fontSize:9, color:C.dim, background:C.surface, padding:"8px 10px",
                  borderRadius:4, lineHeight:1.8 }}>
                  {`HCS_Topic.submitMessage({
  type: "mol_catch",
  element: "V",
  mass_amu: 50.942,
  player_did: "0.0.4729384",
  timestamp: Date.now()
})`}
                </div>
              </div>
              <div className="card-green" style={{ padding:16 }}>
                <Label col={C.green} size={8}>NFT Lifecycle States</Label>
                <div style={{ marginTop:8 }}>
                  {["DRAFT","PENDING","MINTED","ACTIVE","COLLATERAL","SPLIT_LOCKED",
                    "TRANSFERRED","RECYCLING","BURNED"].map((state,i,arr) => (
                    <div key={state} style={{ display:"flex", gap:8, alignItems:"center",
                      marginBottom:4 }}>
                      <div style={{ width:8, height:8, borderRadius:1,
                        background:i===arr.length-1?C.red:i<3?C.amber:C.green,
                        flexShrink:0 }} />
                      <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                        color:i===arr.length-1?C.red:i<3?C.amber:C.green }}>
                        {state}
                      </div>
                      {i < arr.length-1 && (
                        <div style={{ flex:1, height:1, background:C.border }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <CodeBlock code={LUA_EXAMPLES.hedera} lang="javascript" />
          </div>
        )}

        {/* ══ TAB 4 — QUANTUM PHYSICS ══ */}
        {tab === 4 && (
          <div style={{ padding:28 }}>
            <Label col={C.violet}>Quantum Dot Physics · Sub-Atomic Mechanics</Label>
            <HeroTitle col={C.violet} size="clamp(22px,4vw,40px)">
              SIZE DETERMINES COLOR.<br/>ATOMS DETERMINE SIZE.
            </HeroTitle>
            <div style={{ fontSize:12, color:C.steel, marginTop:6, marginBottom:24,
              maxWidth:580, lineHeight:1.8 }}>
              Quantum confinement makes smaller crystals emit bluer light.
              The Brus equation maps exactly: radius (nm) → bandgap (eV) → wavelength (nm).
              In-game: each QD you grow has a mathematically correct emission color.
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20,
              marginBottom:24, alignItems:"start" }}>
              {/* Interactive Brus equation */}
              <div className="card-violet" style={{ padding:18 }}>
                <Label col={C.violet} size={8}>Live Brus Equation Calculator</Label>
                <div style={{ marginTop:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    marginBottom:4, fontFamily:"'Azeret Mono',monospace", fontSize:10 }}>
                    <span style={{ color:C.steel }}>QD Radius</span>
                    <span style={{ color:C.violet }}>{brusR} nm</span>
                  </div>
                  <input type="range" min={0.5} max={5} step={0.1} value={brusR}
                    onChange={e => setBrusR(parseFloat(e.target.value))}
                    style={{ width:"100%", accentColor:C.violet, marginBottom:16 }} />
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    {[
                      ["E_QD", `${brusE.toFixed(3)} eV`, C.amber],
                      ["λ emission", `${brusWav} nm`, brusColor || C.green],
                      ["Diameter", `${(brusR*2).toFixed(1)} nm`, C.violet],
                      ["Material", "CdSe", C.cyan],
                    ].map(([k,v,c]) => (
                      <div key={k} style={{ background:C.surface, borderRadius:6,
                        padding:"8px 12px", border:`1px solid ${C.border}` }}>
                        <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                          color:C.dim, letterSpacing:1 }}>{k}</div>
                        <div style={{ fontFamily:"'Barlow Condensed',sans-serif",
                          fontWeight:700, fontSize:22, color:c,
                          filter:`drop-shadow(0 0 8px ${c}66)` }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {/* Color preview */}
                  <div style={{ marginTop:12, height:40, borderRadius:6,
                    background:brusColor || "#ffffff",
                    boxShadow:`0 0 20px ${brusColor || "#ffffff"}88`,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                      color:"#000", fontWeight:700, mixBlendMode:"difference" }}>
                      {brusWav}nm Emission
                    </span>
                  </div>
                </div>
              </div>

              {/* QD orbit visualization */}
              <div className="card" style={{ padding:18, textAlign:"center" }}>
                <Label col={C.violet} size={8}>CdSe Quantum Dot Sizes</Label>
                <div style={{ marginTop:12 }}>
                  <QDOrbit qdData={QD_SIZES} />
                </div>
                <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                  color:C.dim, marginTop:6 }}>Click dots to see properties</div>
              </div>
            </div>

            {/* QD Size table */}
            <Label col={C.violet} size={8}>Complete CdSe Emission Spectrum Table</Label>
            <div style={{ overflowX:"auto", marginTop:8, marginBottom:20 }}>
              <table className="data">
                <thead>
                  <tr>
                    {["Diameter","λ (nm)","Material","Color","Atoms","Energy (eV)","Use Case"].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {QD_SIZES.map(q => (
                    <tr key={q.nm}>
                      <td style={{ color:C.white }}>{q.nm} nm</td>
                      <td>{q.wav}</td>
                      <td>{q.mat}</td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:14, height:14, borderRadius:"50%",
                            background:q.col, boxShadow:`0 0 6px ${q.col}` }} />
                          {q.col}
                        </div>
                      </td>
                      <td>~{q.atoms.toLocaleString()}</td>
                      <td>{q.energy}</td>
                      <td style={{ color:C.dim, maxWidth:200 }}>{q.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sub-atomic hierarchy */}
            <Label col={C.cyan} size={8}>Sub-Atomic Crafting Hierarchy</Label>
            <div style={{ display:"flex", gap:6, alignItems:"center",
              marginTop:10, marginBottom:16, flexWrap:"wrap" }}>
              {[
                ["Quarks","6 flavors: up/down/strange/charm/top/bottom",C.violet],
                ["→","",C.border],
                ["Hadrons","Proton (2u+1d) · Neutron (1u+2d)",C.cyan],
                ["→","",C.border],
                ["Nuclei","Protons + Neutrons + binding energy",C.amber],
                ["→","",C.border],
                ["Atoms","Nucleus + Electrons (electromagnetic)",C.green],
                ["→","",C.border],
                ["Nanocrystals","2-10nm · Quantum confinement active",C.violet],
                ["→","",C.border],
                ["Quantum Dots","Brus equation determines emission",C.cyan],
                ["→","",C.border],
                ["MOLNFT","Tokenized on Hedera HTS · $0.02",C.amber],
              ].map(([label, desc, col], i) => (
                label === "→" ? (
                  <div key={i} style={{ color:C.border2, fontSize:20, fontWeight:300 }}>→</div>
                ) : (
                  <div key={label} className={`card-${col===C.green?"green":col===C.amber?"amber":col===C.cyan?"cyan":"violet"}`}
                    style={{ padding:"8px 12px", minWidth:100 }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                      fontSize:14, color:col }}>{label}</div>
                    <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                      color:C.dim, lineHeight:1.5 }}>{desc}</div>
                  </div>
                )
              ))}
            </div>

            <CodeBlock code={LUA_EXAMPLES.brus} lang="lua" />
          </div>
        )}

        {/* ══ TAB 5 — GAME ENGINE ══ */}
        {tab === 5 && (
          <div style={{ padding:28 }}>
            <Label col={C.red}>Roblox Studio 2025 · Technical Stack</Label>
            <HeroTitle col={C.red} size="clamp(22px,4vw,40px)">
              PARALLEL LUAU.<br/>FUTURE LIGHTING.<br/>VR + AR.
            </HeroTitle>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14,
              marginTop:16, marginBottom:24 }}>
              {[
                { t:"Rendering Pipeline", col:C.amber, icon:"🖥", items:[
                  "Lighting.Technology = Future (PBR + Raytracing)",
                  "Atmosphere: Density 0.22, Glare 0.12, Haze 0.08",
                  "ColorCorrection: +0.08 contrast, +0.15 saturation",
                  "BloomEffect: Intensity 0.4, Threshold 0.95",
                  "DepthOfField: Focus 40m, Far intensity 0.8",
                  "SunRaysEffect: Intensity 0.12, Spread 0.6",
                ]},
                { t:"Parallel Luau — Actor Model", col:C.cyan, icon:"⚙", items:[
                  "2 server worker threads, 8 client threads",
                  "Actor:BindToMessageParallel() for physics",
                  "SharedTable: cross-context atomic data",
                  "task.desynchronize() / task.synchronize()",
                  "NPC AI offloaded to dedicated Actors",
                  "Molecular dynamics: per-zone Physics Actor",
                ]},
                { t:"VR Support", col:C.violet, icon:"🥽", items:[
                  "Meta Quest 3/4: hand tracking, 72+ FPS",
                  "PSVR2: DualSense haptics + adaptive triggers",
                  "SteamVR: Valve Index / HTC Vive",
                  "Comfort vignette: movement speed-activated",
                  "Snap turn: 45°/90°/smooth options",
                  "VR HUD: wrist-mounted mol counter",
                ]},
                { t:"AR + Multi-Platform", col:C.green, icon:"📱", items:[
                  "iOS ARKit / Android ARCore (gyro camera)",
                  "AR atoms: real-world space overlay",
                  "ANK app bridge: deep link molgang://ank/",
                  "PS5 DualSense: adaptive trigger resistance (pH puzzle)",
                  "Nintendo Switch: Joy-Con gyro aim",
                  "Xbox: impulse triggers, 8 haptic profiles",
                ]},
              ].map(s => (
                <div key={s.t} className={`card-${s.col===C.amber?"amber":s.col===C.cyan?"cyan":s.col===C.violet?"violet":"green"}`}
                  style={{ padding:16 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:10 }}>
                    <span style={{ fontSize:20 }}>{s.icon}</span>
                    <Label col={s.col} size={8}>{s.t}</Label>
                  </div>
                  {s.items.map((item,i) => (
                    <div key={i} style={{ display:"flex", gap:8, marginBottom:5 }}>
                      <div className="dot" style={{ background:s.col, flexShrink:0, marginTop:5 }} />
                      <div style={{ fontSize:11, color:C.steel, lineHeight:1.5 }}>{item}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Performance targets */}
            <Label col={C.red} size={8}>Performance Targets — All 8 Platforms</Label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",
              gap:8, marginTop:8, marginBottom:20 }}>
              {[
                {p:"Meta Quest 3",fps:72,load:5,mem:280,col:C.violet},
                {p:"PSVR2",fps:60,load:8,mem:350,col:C.cyan},
                {p:"PS5",fps:60,load:5,mem:400,col:"#003791"},
                {p:"Xbox Series X",fps:60,load:6,mem:400,col:"#107c10"},
                {p:"Nintendo Switch",fps:30,load:10,mem:200,col:"#e4000f"},
                {p:"PC (High)",fps:60,load:4,mem:600,col:C.steel},
                {p:"Mobile iOS",fps:30,load:8,mem:280,col:C.amber},
                {p:"Smartphone AR",fps:30,load:8,mem:250,col:C.green},
              ].map(pl => (
                <div key={pl.p} className="card" style={{ padding:12 }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                    fontSize:14, color:pl.col, marginBottom:8 }}>{pl.p}</div>
                  <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                    color:C.dim, marginBottom:3 }}>FPS TARGET</div>
                  <ProgressBar pct={(pl.fps/72)*100} col={pl.col} h={4} />
                  <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                    color:pl.col, marginBottom:6 }}>{pl.fps} FPS</div>
                  <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                    color:C.dim }}>MEM: {pl.mem}MB · LOAD: {pl.load}s</div>
                </div>
              ))}
            </div>

            <CodeBlock code={LUA_EXAMPLES.parallel} lang="lua" />
          </div>
        )}

        {/* ══ TAB 6 — GAME WORLD ══ */}
        {tab === 6 && (
          <div style={{ padding:28 }}>
            <Label col={C.green}>Game World · 5 Zones · 39 Reactions</Label>
            <HeroTitle col={C.green} size="clamp(22px,4vw,42px)">
              MOLECULIA.<br/>118 EILANDEN. 5 ZONES.
            </HeroTitle>

            <div style={{ fontSize:12, color:C.steel, marginTop:6, marginBottom:24,
              maxWidth:580, lineHeight:1.8 }}>
              Sonic Open Zone physics. GTA 6 NPC AI. Brookhaven freedom.
              Medal of Honor audio authenticity. Every zone designed around
              real Dutch geography and real chemistry.
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {ZONES.map((zone, i) => (
                <div key={zone.id} className="card"
                  style={{ border:`1px solid ${zone.col}22`, overflow:"hidden" }}>
                  <div style={{ padding:"16px 18px",
                    background:`linear-gradient(90deg, ${zone.col}10, transparent)`,
                    borderBottom:`1px solid ${zone.col}18`,
                    display:"flex", gap:14, alignItems:"flex-start" }}>
                    <span style={{ fontSize:36 }}>{zone.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:900,
                        fontSize:22, color:zone.col, lineHeight:1 }}>{zone.name}</div>
                      <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                        color:C.dim, marginTop:2 }}>{zone.loc} · {zone.size}</div>
                      <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:10,
                        color:C.steel, marginTop:4, fontStyle:"italic" }}>
                        {zone.atm}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding:"12px 18px", display:"grid",
                    gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
                    <div>
                      <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                        color:C.amber, letterSpacing:2, marginBottom:6 }}>⚡ SONIC ELEMENTS</div>
                      {zone.sonic.map((s,j) => (
                        <div key={j} style={{ display:"flex", gap:6, marginBottom:4 }}>
                          <div className="dot" style={{ background:C.amber, flexShrink:0, marginTop:5 }} />
                          <div style={{ fontSize:10, color:C.steel }}>{s}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                        color:C.violet, letterSpacing:2, marginBottom:6 }}>⚗ REACTIONS</div>
                      {zone.reactions.map((r,j) => (
                        <div key={j} style={{ display:"flex", gap:6, marginBottom:4 }}>
                          <div className="dot" style={{ background:C.violet, flexShrink:0, marginTop:5 }} />
                          <div style={{ fontFamily:"'Source Code Pro',monospace",
                            fontSize:9, color:C.steel }}>{r}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:8,
                        color:C.cyan, letterSpacing:2, marginBottom:6 }}>🔬 ELEMENTS</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {zone.elements.map(el => (
                          <Chip key={el} col={zone.col}>{el}</Chip>
                        ))}
                      </div>
                      <div style={{ marginTop:8, fontFamily:"'Azeret Mono',monospace",
                        fontSize:8, color:C.dim, letterSpacing:2 }}>NPC</div>
                      <div style={{ fontSize:10, color:C.steel, marginTop:4 }}>{zone.npc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TAB 7 — CODE LIBRARY ══ */}
        {tab === 7 && (
          <div style={{ padding:28 }}>
            <Label col={C.green}>Code Library — Production-Ready Lua + JS</Label>
            <HeroTitle col={C.green} size="clamp(22px,4vw,40px)">
              EVERY MODULE.<br/>READY TO DEPLOY.
            </HeroTitle>
            <div style={{ fontSize:12, color:C.steel, marginTop:6, marginBottom:24,
              maxWidth:580, lineHeight:1.8 }}>
              Complete code samples for all major systems. Luau with type annotations.
              TypeScript for Hedera SDK. Copy → paste → run in Roblox Studio or Node.js.
            </div>

            {[
              { t:"Brus Equation — QD Emission Calculator", lang:"lua", code:LUA_EXAMPLES.brus, col:C.violet },
              { t:"Hedera HTS — Token Creation + NFT Mint", lang:"javascript", code:LUA_EXAMPLES.hedera, col:C.amber },
              { t:"Parallel Luau — Molecular Dynamics (Lennard-Jones + Verlet)", lang:"lua", code:LUA_EXAMPLES.parallel, col:C.cyan },
            ].map(ex => (
              <div key={ex.t} className="card" style={{ marginBottom:14, overflow:"hidden",
                border:`1px solid ${ex.col}22` }}>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${ex.col}18`,
                  background:`${ex.col}08`, display:"flex", gap:10, alignItems:"center" }}>
                  <Chip col={ex.col}>{ex.lang}</Chip>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                    fontSize:16, color:ex.col }}>{ex.t}</div>
                </div>
                <div style={{ padding:"12px 16px" }}>
                  <div className="code" style={{ maxHeight:360 }}>
                    {ex.code}
                  </div>
                </div>
              </div>
            ))}

            {/* Additional snippets */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { t:"NPC Schedule Engine", col:C.green, code:
`-- NPCScheduleService.lua
local DIREK = {
  {h=5.5, loc="parking", act="arrive"},
  {h=6.0, loc="factory", act="work"},
  {h=18.0,loc="cafe",    act="relax"},
  {h=22.0,loc="home",    act="sleep"},
}
function getTask(hour)
  for _,t in DIREK do
    if hour >= t.h then return t end
  end
end` },
                { t:"CO₂ Atmosphere Effect", col:C.red, code:
`-- EmissionAtmosphere.lua
EmissionRE.OnClientEvent:Connect(
  function(balance)
  local density = balance < -500 and 0.08
    or balance < 0   and 0.15
    or balance < 200 and 0.33
    or balance < 500 and 0.48
    or 0.60
  TweenService:Create(Atmosphere,
    TweenInfo.new(3),
    {Density=density}):Play()
end)` },
                { t:"Quantum Dot Particle VFX", col:C.violet, code:
`-- ReactionVFX.lua
function spawnQDEmission(part, nm)
  local qdCol = QD.EmissionColor(nm/2)
  local pe = Instance.new(
    "ParticleEmitter", part)
  pe.Color = ColorSequence.new(qdCol)
  pe.LightEmission = 1.0
  pe.Rate = 300
  pe.Speed = NumberRange.new(2,12)
  pe.Lifetime = NumberRange.new(.4,1.2)
  task.delay(1.5, pe.Destroy, pe)
end` },
                { t:"HGMS Magnetic Field", col:C.cyan, code:
`-- MagneticField.lua
function showField(magnet, tesla)
  local col = tesla < 0.5
    and Color3.fromRGB(80,160,255)
    or tesla < 1.0
    and Color3.fromRGB(200,100,255)
    or Color3.fromRGB(255,50,50)
  for i = 1, 12 do
    local a = (i/12)*math.pi*2
    local r = 3 + tesla * 2
    createBeam(magnet, a, r, col)
  end
end` },
              ].map(s => (
                <div key={s.t} className="card" style={{ overflow:"hidden",
                  border:`1px solid ${s.col}22` }}>
                  <div style={{ padding:"8px 12px", borderBottom:`1px solid ${s.col}18`,
                    background:`${s.col}08` }}>
                    <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                      fontSize:14, color:s.col }}>{s.t}</div>
                  </div>
                  <div className="code" style={{ padding:12, borderRadius:0,
                    border:"none", maxHeight:160, fontSize:10 }}>
                    {s.code}
                  </div>
                </div>
              ))}
            </div>

            {/* Genesis checklist */}
            <div style={{ marginTop:20, background:C.card, borderRadius:10,
              border:`1px solid ${C.amber}22`, padding:18 }}>
              <Label col={C.amber} size={8}>Mainnet Genesis Checklist (Day 100)</Label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:10 }}>
                {[
                  "Security audit: external firm required",
                  "Multi-sig: 3-of-5 ISSUER wallet",
                  "Liquidity: €10,000 HBAR initial pool",
                  "KYC/AML: Sumsub for loans >€1,000",
                  "Monitoring: Grafana + HCS webhooks",
                  "Genesis tx: signed by Edwin + Diederik",
                  "Roblox publish: public experience",
                  "Announcement: Discord + Farcaster",
                ].map((item, i) => (
                  <div key={i} style={{ display:"flex", gap:8, padding:"6px 10px",
                    background:C.surface, borderRadius:4,
                    border:`1px solid ${C.border}` }}>
                    <div style={{ width:12, height:12, borderRadius:2,
                      border:`1px solid ${C.amber}44`, flexShrink:0, marginTop:1 }} />
                    <div style={{ fontFamily:"'Azeret Mono',monospace", fontSize:9,
                      color:C.steel }}>{item}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:14, textAlign:"center",
                fontFamily:"'Barlow Condensed',sans-serif", fontWeight:700,
                fontSize:18, color:C.amber, letterSpacing:2 }}>
                NOOIT uitvoeren zonder schriftelijke goedkeuring VirtualV Holding B.V. RvB.
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

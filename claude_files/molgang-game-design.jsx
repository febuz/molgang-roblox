import { useState, useEffect, useRef, useCallback } from "react";

/* ─────────────────────────────────────────────
   MOLGANG: GAME DESIGN DOCUMENT v2.0
   Sonic Open Zone + Brookhaven RP + Medal of Honor + GTA 6
   10× realistischer dan elk van de inspiratiebronnen
───────────────────────────────────────────── */

const PALETTE = {
  bg:      "#030507",
  surface: "#07090e",
  card:    "#0b0f16",
  border:  "#111a24",
  green:   "#22c55e",
  lime:    "#86efac",
  gold:    "#f59e0b",
  amber:   "#fbbf24",
  steel:   "#94a3b8",
  sky:     "#38bdf8",
  violet:  "#a78bfa",
  rose:    "#fb7185",
  rust:    "#dc7a3c",
  ink:     "#0d1f1a",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,600;0,900;1,900&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Syne:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --green: ${PALETTE.green}; --gold: ${PALETTE.gold};
    --violet: ${PALETTE.violet}; --sky: ${PALETTE.sky};
    --steel: ${PALETTE.steel}; --bg: ${PALETTE.bg};
  }

  body { background: var(--bg); color: #c8d8e8; font-family: 'Barlow Condensed', sans-serif; }

  /* NOISE GRAIN OVERLAY */
  body::after {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9999;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
    opacity: 0.4;
  }

  /* SCANLINE */
  body::before {
    content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9998;
    background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px);
  }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: #1a3a28; border-radius: 2px; }

  /* ANIMATIONS */
  @keyframes drift  { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-8px) rotate(1deg)} }
  @keyframes throb  { 0%,100%{opacity:1} 50%{opacity:.55} }
  @keyframes sweep  { from{transform:translateX(-100%)} to{transform:translateX(100vw)} }
  @keyframes spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes pop    { 0%{transform:scale(.9);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
  @keyframes trail  { 0%{transform:scaleX(1) skewX(0deg)} 30%{transform:scaleX(1.12) skewX(-6deg)} 100%{transform:scaleX(1) skewX(0deg)} }
  @keyframes glitch {
    0%,95%,100%{clip-path:none;transform:none}
    96%{clip-path:inset(30% 0 50% 0);transform:translate(-4px)}
    97%{clip-path:inset(10% 0 70% 0);transform:translate(4px)}
    98%{clip-path:inset(60% 0 20% 0);transform:translate(-2px)}
  }
  @keyframes radar { 0%{transform:rotate(0deg);opacity:.7} 100%{transform:rotate(360deg);opacity:.2} }
  @keyframes co2rise { 0%{transform:translateY(0);opacity:.8} 100%{transform:translateY(-40px);opacity:0} }

  .drift   { animation: drift 4s ease-in-out infinite; }
  .throb   { animation: throb 2s ease-in-out infinite; }
  .spin    { animation: spin 18s linear infinite; }
  .pop     { animation: pop .4s ease-out forwards; }
  .trail   { animation: trail .8s ease-in-out infinite; }
  .glitch  { animation: glitch 6s infinite; }

  /* TAB BAR */
  .tab { padding: 10px 16px; background: transparent; border: none;
         cursor: pointer; font-family: 'DM Mono', monospace; font-size: 11px;
         letter-spacing: 1px; color: #2a4a38; border-bottom: 2px solid transparent;
         transition: all .2s; white-space: nowrap; }
  .tab:hover { color: #4a7a60; }
  .tab.on { color: var(--green); border-bottom-color: var(--green); }

  /* SECTION HEADERS */
  .hdr { font-family: 'Syne', sans-serif; font-weight: 800; letter-spacing: -1px; }
  .mono { font-family: 'DM Mono', monospace; }
  .cond { font-family: 'Barlow Condensed', sans-serif; }

  /* CARDS */
  .gc { border-radius: 10px; border: 1px solid; overflow: hidden; }

  /* MOMENTUM BAR */
  .mbar { height: 6px; border-radius: 3px; background: #0f1e12; overflow: hidden; }
  .mfill { height: 100%; border-radius: 3px; transition: width .15s ease; }

  /* NPC BADGE */
  .nbadge { padding: 2px 8px; border-radius: 10px; font-family: 'DM Mono', monospace;
            font-size: 9px; letter-spacing: .5px; display: inline-block; }

  /* CODE BLOCK */
  .codeblock { font-family: 'DM Mono', monospace; font-size: 10.5px;
               background: #05080c; border: 1px solid #0f1e2a;
               border-radius: 8px; padding: 16px; line-height: 1.75;
               overflow-x: auto; white-space: pre; }
`;

/* ─── DATA ──────────────────────────────────── */

const INSPIRATION = [
  {
    game: "SONIC FRONTIERS", score: 55, icon: "⚡",
    col: PALETTE.gold,
    headline: "Open Zone Physics",
    what: ["Momentum carry across terrain", "Speed tier system (Walk→Boost→Max)", "Grind rails als snelweg", "Height als gameplay-dimensie", "Customiseerbare snelheidssliders"],
    missing: ["Geen echte wereld", "Geen NPC-geheugen", "Geen weersysteem", "Geen realistische omgeving"],
    molgang: "Sonic-momentum met échte Nederlandse terrein-physics: polderwind geeft weerstand, fabrieksplaat vibreert, ijs in quantum lab verlaagt grip.",
  },
  {
    game: "BROOKHAVEN RP", score: 40, icon: "🏡",
    col: PALETTE.violet,
    headline: "Sandbox Vrijheid",
    what: ["Geen verplichte quests", "Identiteitsvorming via cosmetics", "1.3M concurrent — sociale hangout", "Zero tutorial dwang", "Organisch leren via exploratie"],
    missing: ["Geen physics diepte", "Geen NPC intelligentie", "Geen omgevingsreactiviteit", "Geen educatieve laag"],
    molgang: "Brookhaven-vrijheid + moleculaire identiteit: jouw labjas, badge-collectie en registratie-ratio zijn jouw persoonlijkheid.",
  },
  {
    game: "MEDAL OF HONOR 2010", score: 82, icon: "🎖",
    col: PALETTE.rust,
    headline: "Authentieke Immersie",
    what: ["Echte geluidsopnames (live ammo)", "Tier-1 militaire consultants op set", "Spatiaal audio: radio op afstand → stem dichtbij", "Visuele historische accuraatheid", "\"Je speelt geen game — je bent er\""],
    missing: ["Geen open wereld", "Geen NPC-vrijheid", "Geen sociale elementen"],
    molgang: "MoH-authenticiteit vertaald naar chemie: echte HGMS-geluiden opgenomen, pH-meters uit echte lab-catalogi, BOF-slak compositie van Tata Steel.",
  },
  {
    game: "GTA 6", score: 91, icon: "🌆",
    col: PALETTE.sky,
    headline: "Levende Wereld",
    what: ["100K+ NPC-dialooglijnen per context", "NPC's met dagschema + geheugen", "Weer verandert gedrag", "Crimes ripple outward", "Volledig betreedbare interieurs", "World reageert op speler-acties"],
    missing: ["Geen educatieve laag", "Geen chemische simulatie", "Geen blockchain integratie"],
    molgang: "GTA 6-reactiviteit: Direk's trust-level stijgt bij correcte pH. ANK sluit zaterdag. Storm jaagt Kees naar de schuur. CO₂-balans verandert de atmosfeer.",
  },
];

const ZONES_FULL = [
  {
    id: "zaandam", name: "SLAKKENSPOOR FABRIEK", loc: "Zaandam — Zuiddijk 103",
    col: "#dc7a3c", size: "800 × 600 studs", icon: "🏭",
    tagline: "Staal, slak en de geur van mogelijkheden",
    atmos: "Avondschemering. Oranje fabrieksgloei. Stoomwolken scheren laag over de vloer.",
    sonic: ["Conveyor A + B als grindboost (sprint-start)", "Magnetische bollen als momentum-bumpers", "Reactorvat sprongen (hoogte per pH-waarde)", "Silo-launch: top = lucht-combo record", "Kaai-kraan swinging"],
    moh_audio: ["Conveyor belt: 150 BPM mechanisch geronk (echt opgenomen Zaandam)", "HGMS machine: paramagnetisch gonzen (eigen frequentie per Tesla)", "pH vaten: bubbelgeluiden variëren per zuurgraad", "Stoomrelease elke 45 sec", "Afstandseffect: fabriek klinkt als radio op 200m"],
    gta_npcs: [
      {name:"Direk Vanadis", sched:"05:30 parkeer → 06:00 werk → 18:00 café → 22:00 thuis", trust:"Stijgt bij correcte pH-stap. Daalt bij Cr(VI)-fout. Trust > 0.8 = expert-dialoog.", variants:31},
      {name:"Inspecteur Petra", sched:"09:00-17:00 rondes. 10:30 koffie. 12:00 lunch.", trust:"Blokkeert bij verkeerde volgorde. Waarschuwt vriendelijk bij trust < 0.3.", variants:14},
      {name:"Heftruck Jan", sched:"Continu route belt→opslag. Rijdt sneller bij alarm.", trust:"Niet persistent. Gedragsaanpassing per moment.", variants:8},
    ],
    brookhaven: "Fabriek is vrij verkenbaar. Alle gebouwen betreedbaar. Geen quest-markering op conveyor — speler ontdekt grind organisch.",
    districts: ["Conveyor Zone A+B", "HGMS Hal (3 magneten)", "pH-Reactor Rij (6 vaten)", "Product Opslag (V₂O₅ goud)", "Kaai Uitlopers (IJmuiden referentie)"],
  },
  {
    id: "wognum", name: "NATUUR & BODEM — WOGNUM", loc: "Wognum, Noord-Holland",
    col: "#4ade80", size: "1200 × 1200 studs", icon: "🌸",
    tagline: "Polder, pioenen en onzichtbaar stikstof",
    atmos: "Zeeklimaat. Ochtenddauw op bloembladen. Windturbines aan horizon.",
    sonic: ["Polderwegen: lange sprint-run, wind meewind +8 s/s", "Slootjes springen: timing-combo", "Windturbine-blad: grind naar top voor altitude", "Hooibalen als bounce pads", "Tractor als moving platform"],
    moh_audio: ["Wind: Beaufort 3 default, procedureel (niet looped)", "Vogels: merel + kievit vroeg ochtend, zwartkop middag", "Tractor diesel: RPM-variatie op afstand", "Slootwater: spatiaal per waterloop", "Si-K biostimulant spray: fijn ratelend"],
    gta_npcs: [
      {name:"Ana Stikstra", sched:"06:30 fietsen → 08:00 meten → 16:00 laptop → 20:00 fiets terug", trust:"Enthousiaster bij MolChain-registratie. Stuurt comm-bericht bij zeemist.", variants:28},
      {name:"Kees van der Meer", sched:"04:30 melken → 07:00 tractor → 15:00 pioenenveld → 19:00 huis", trust:"Bedankt voor Si-K. Bij storm: koeien halen = pad geblokkeerd.", variants:16},
      {name:"Wandelaar Truus", sched:"10:00-12:00 en 14:00-16:00 wandelroute langs meetstations.", trust:"Geen persistent geheugen. Geeft natuur-feitjes.", variants:9},
    ],
    brookhaven: "Grootste zone. Geen restricties. Pioenenveld vrij rondlopen. Kees' hoeve inloopbaar. Alle sensoren klikbaar zonder questmarker.",
    districts: ["Pioenenveld Noord (Si-K, rijker bloei)", "Pioenenveld Zuid (onbehandeld, N-overdosis indicatie)", "KNMI Meetstation (3 sensormasten)", "Kees' Hoeve (inloopbaar: tractor, schuur, melkrobot)", "Polderweg (sprint-route, 600 studs recht)"],
  },
  {
    id: "delft", name: "QUANTUM LAB — TU DELFT", loc: "Fictief ruimtestation boven Delft",
    col: "#a78bfa", size: "600 × 600 studs (hoog + diep)", icon: "⚛",
    tagline: "Hier trilt de werkelijkheid. Meet nauwkeurig of verlies alles.",
    atmos: "Cryogeen. −196°C visueel. IJsvorming. Adem condenseert. Neonmist.",
    sonic: ["Superposisie-zones: snelheid +20% + semi-transparant effect", "Cryogene damp vertraagt (viscositeit-physics)", "QPU server-racks: magnetische grind-boog", "Quantum jump pads: teleport-gevoel maar echte physics", "Og-catch: 5 sec window met real-time slow-motion"],
    moh_audio: ["Cryogeen koelsysteem: echte QPU-geluid (IBM quantum lab opname)", "Quantum dot detect: hoog-frequente ping (per element uniek)", "Superposisie-ruis: wit ruis laag onder alles", "Server-fan: variabele RPM op load", "Echo: 100% reverb in cryogene kern"],
    gta_npcs: [
      {name:"Dr. Kwantje van der Berg", sched:"09:00-01:00 lab (altijd te laat). Lunch vergeet patroon (18% kans).", trust:"Stochastisch gedrag: dezelfde vraag = 70% andere uitleg. Trust = wetenschappelijke precisie.", variants:41},
      {name:"QuTech Robot RO-1", sched:"Continu in lab. Detecteert quantum dot spawns. Alert-geluid.", trust:"Geen trust. Puur functioneel gedrag.", variants:5},
    ],
    brookhaven: "Inner Sanctum achter gesloten deuren (50+ elementen vereist) — zichtbaar maar niet toegankelijk. Speler voelt de beloning van progresie zonder pushed te worden.",
    districts: ["Outer Ring (elementen 37–82)", "Cryogenic Core (−196°C)", "Inner Sanctum (50+ elementen slot)", "QPU Server Room (energie-meter display)", "Dr. Kwantje's Desk (chaotisch bureau)"],
  },
  {
    id: "nexus", name: "MOLGANG NEXUS HUB", loc: "Amsterdam IJburg — 2034",
    col: "#22c55e", size: "1000 × 800 studs", icon: "🏛",
    tagline: "Het hart van de moleculaire economie",
    atmos: "Modern futuristisch NL. IJburg grachten. Fietsen. MolChain Tower gloeit.",
    sonic: ["Fietspaden: auto-boost op fietsstrook +6 s/s", "Kanaalbruggen: boogsprong setup", "Tower spiraal: grindroute omhoog = altitude record", "Marktplein kolommen: parkour circuit", "Houseboats: veerende platforms (drijvend oscillatie)"],
    moh_audio: ["Grachten: klotsen op interval (niet looped)", "Tram in verte: Combino-type geluid", "Markt: ambient stemmen NL/Cantonees/Engels", "Tower hum: pulse bij nieuwe chain entry", "Meeuwengeschreeuw: spatiaal, niet altijd"],
    gta_npcs: [
      {name:"Prof. Femke van Mol", sched:"07:00 lab → 09:00 lecture → 12:30 lunch markt → 15:00 tower → 19:00 thuis", trust:"Geeft hints bij lang stilstaan. Past uitleg aan per trust. Corrigeert precies.", variants:24},
      {name:"Ank Koopman", sched:"08:30 ANK open → 17:00 sluit. Zaterdags gesloten (realistisch NL).", trust:"Open/gesloten indicator op gebouw. Leent bij collateral + trust.", variants:19},
      {name:"Marktkoopman Yusuf", sched:"09:00-18:00. Prijzen fluctueren op vraag. Betere deal bij hoge registratie.", trust:"Trust = registratie-ratio. Minder bij Ghost Ally speler.", variants:12},
    ],
    brookhaven: "Spawn point. Geen verplichte NPC-gesprekken. Markt is optioneel. Tower is optioneel betreedbaar. Speler kiest eigen route vanaf minuut 1.",
    districts: ["Spawn Platform (IJburg waterfront)", "MolChain Tower (200 studs, betreedbaar)", "ANK Coöperatief (open/dicht cyclus)", "Open Marktplein (atom DEX)", "Femke's Lab (molecule builder pro)"],
  },
  {
    id: "biome", name: "PERIODIC TABLE BIOME", loc: "Zwevend archipel boven Noord-Holland",
    col: "#34d399", size: "4000 × 4000 studs — 118 eilanden", icon: "🔬",
    tagline: "118 eilanden. Elk element een wereld.",
    atmos: "Magisch maar accuraat. Elk eiland heeft eigen klimaat naar elementgroep.",
    sonic: ["Eiland-hoppen: momentum-carry over water (2 sec grace)", "Orbital ring grind om zware elementen", "Quantum frontier: tijdscompressie zone (Z>82)", "Element-magneten: atoom-bollen trekken bij sprint", "Brug van stardust unlock bij 36 elementen"],
    moh_audio: ["Ruimte ambient: laag, geen repetitie (4-uur lus)", "Element-tonen: frequentie = atoommassa / 10 Hz", "Noble gas zone: zachte sfeer, weinig aanwezig", "Radioactive zone: Geiger counter-tik ritme", "Quiz-zuil activatie: bevestigings-ting"],
    gta_npcs: [
      {name:"Element Geesten (×118)", sched:"Verschijnen bij nabijheid (8 studs). Verdwijnen bij weglopen.", trust:"Geen trust systeem. Tonen één educatief feit per bezoek.", variants:3},
      {name:"Quiz Zuil NPCs", sched:"Altijd aanwezig op eiland. Wacht op interactie.", trust:"Geen trust. Correcte antwoorden geven MolCoins.", variants:6},
    ],
    brookhaven: "Grootste zone. Geen map-markering voor elementen. Speler ontdekt via beweging. 118 eilanden zijn open wereld.",
    districts: ["Alkali Cluster (Gr.1 — rode eilanden)", "Noble Gas Nebula (Gr.18 — paarse nevel)", "Transition Continent (Gr.3-12)", "Lanthanides+Actinides Reef (verborgen, onder water)", "Quantum Frontier (Z>82, donkerste zone)"],
  },
];

const MOVEMENT_DETAIL = {
  tiers: [
    {name:"WALK",   spd:16, col:"#4a6a58", cond:"Default. Geen input."},
    {name:"RUN",    spd:28, col:"#7ecf5a", cond:"W ingedrukt >0.5 sec."},
    {name:"SPRINT", spd:42, col:"#38bdf8", cond:"Shift/Double-tap W."},
    {name:"BOOST",  spd:60, col:PALETTE.gold, cond:"Rail of downhill >3°."},
    {name:"MAX",    spd:80, col:PALETTE.rose, cond:"Quantum zone + boost."},
  ],
  terrain: [
    {name:"Fabrieksplaat (Zaandam)", mod:"+vibratie-effect, −0.02 grip", icon:"🏭"},
    {name:"Polder (Wognum)", mod:"Meewind +8, Tegenwind −6 s/s", icon:"🌾"},
    {name:"Sloot water", mod:"−14 s/s, swim-animatie actief", icon:"💧"},
    {name:"Conveyor belt", mod:"+10 s/s in rijrichting, −6 tegen", icon:"⚙"},
    {name:"Grind rail", mod:"Boost + stelsel, richting gelockt", icon:"⚡"},
    {name:"Cryogeen ijs (Delft)", mod:"−8 grip, slide physics actief", icon:"❄"},
    {name:"IJburg brug", mod:"Boog = extra sprong-hoogte +2 studs", icon:"🌉"},
    {name:"Houseboat", mod:"Oscillatie (+/−0.8 studs Y per sec)", icon:"🚢"},
  ],
  lua: `-- MovementController.lua (LocalScript)
local UIS = game:GetService("UserInputService")
local RS  = game:GetService("RunService")
local char = game.Players.LocalPlayer.Character
local root = char:WaitForChild("HumanoidRootPart")
local hum  = char:WaitForChild("Humanoid")

-- State
local vel       = 16      -- studs/sec
local onRail    = false
local onConveyor = false
local inQuantum = false
local windVec   = 0       -- + = meewind, - = tegenwind (Wognum zone)

-- Terrain Detection (server sets zone attribute)
local function getTerrainMod()
  local zone = workspace:GetAttribute("ActiveZone")
  if zone == "wognum" then
    -- Wind: dot product looprichting met windrichting
    local windDir = workspace:GetAttribute("WindDirection") or Vector3.new(1,0,0)
    local dot = root.CFrame.LookVector:Dot(windDir)
    windVec = dot * 8  -- max ±8 s/s
  elseif zone == "quantum" then
    return inQuantum and 1.2 or 1.0  -- 20% sneller in quantum zone
  end
  return 1.0
end

-- Hill Boost: negatieve Y-richting = downhill = meer snelheid
local function hillBoost(dt)
  local look  = root.CFrame.LookVector
  local slope = -look.Y  -- 0 = vlak, 1 = steil neer
  if slope > 0.05 then
    vel = math.min(60, vel + slope * 18 * dt)
  end
end

-- Momentum Decay
local function decay(dt)
  local target = 16 + windVec
  if vel > target then
    vel = math.max(target, vel - (vel - target) * 0.85 * dt * 10)
  end
end

RS.Heartbeat:Connect(function(dt)
  if onRail then
    vel = math.min(80, vel + 18 * dt)
  elseif onConveyor then
    vel = math.min(60, vel + 12 * dt)
  else
    hillBoost(dt)
    decay(dt)
  end
  local mod = getTerrainMod()
  hum.WalkSpeed = vel * mod
  -- Quantum zone: slow-mo bij Og catch window
  if workspace:GetAttribute("OgCatchWindow") then
    game:GetService("TweenService"):Create(
      workspace.CurrentCamera, TweenInfo.new(.3),
      {FieldOfView = 55}):Play()
  end
end)`
};

const NPC_AI_CODE = {
  schedule: `-- NPCScheduleService.lua  (Knit Server Service)
local GameClock = require(Modules.GameClock)     -- 1 real-min = 1 game-hour
local WeatherSys = require(Modules.WeatherSystem)

-- Direk Vanadis dagschema
local DIREK_SCHEDULE = {
  { h_start=5.5,  h_end=6.0,  loc="parking",  act="arrive",  dlg="morning" },
  { h_start=6.0,  h_end=18.0, loc="factory",  act="work",    dlg="work"    },
  { h_start=18.5, h_end=22.0, loc="cafe",     act="relax",   dlg="off"     },
  { h_start=22.0, h_end=5.5,  loc="home",     act="sleep",   dlg="none"    },
}

-- Trust beïnvloedt dialoogvariant (0.0 → 1.0)
function GetDirekDialogue(playerId, context)
  local trust   = PlayerData:Get(playerId, "direk_trust") or 0.5
  local weather = WeatherSys:State()
  local hour    = GameClock:Hour()

  local branch = "neutral"
  if trust > 0.8 then branch = "expert"
  elseif trust < 0.2 then branch = "cold" end

  -- Storm override
  if weather.beaufort > 6 then
    return DIREK_LINES["storm_" .. branch]
  end
  -- Ochtend-grump
  if hour < 7 then return DIREK_LINES["morning_grumpy"] end

  return DIREK_LINES[branch .. "_" .. context]
end`,

  weather: `-- WeatherSystem.lua  (Server ModuleScript)
-- NL klimaat: Beaufort + neerslag + mist-kans per uur
local NL_CLIMATE = {
  { state="droog_helder",  prob=25, bf=2, fog=false },
  { state="bewolkt",        prob=35, bf=3, fog=false },
  { state="lichte_regen",   prob=25, bf=4, fog=false },
  { state="storm",          prob=8,  bf=7, fog=false },
  { state="zeemist",        prob=7,  bf=1, fog=true  },
}

local current = { state="bewolkt", bf=3, fog=false }

-- Elke 30 game-minuten kans op weerswijziging (=30 real-sec)
task.spawn(function()
  while true do
    task.wait(30)
    if math.random(100) < 20 then  -- 20% kans op overgang
      local roll, cum = math.random(100), 0
      for _, w in ipairs(NL_CLIMATE) do
        cum += w.prob
        if roll <= cum then
          current = w
          -- Broadcast → alle clients (Atmosphere update)
          ReplicatedStorage.WeatherEvent:FireAllClients(w)
          -- NPC overrides
          if w.bf > 6 then
            NPCService:StormOverride()  -- Kees haalt koeien
          end
          break
        end
      end
    end
  end
end)`,

  co2world: `-- EmissionAtmosphere.lua  (LocalScript, client-side)
-- CO₂ balans van speler → visuele wereldstaat
local Lighting    = game:GetService("Lighting")
local Atmosphere  = workspace:FindFirstChildOfClass("Atmosphere")
local EmissionRE  = ReplicatedStorage:WaitForChild("EmissionSync")

-- Tiers: Carbon Hero → Ghost Ally
local TIERS = {
  { max=-500, density=0.08, color=Color3.fromRGB(175,225,200), bright=2.3, label="CARBON HERO"  },
  { max=-100, density=0.15, color=Color3.fromRGB(190,220,205), bright=2.1, label="CO₂ REDUCEER" },
  { max=0,    density=0.22, color=Color3.fromRGB(200,218,225), bright=2.0, label="NEUTRAAL"     },
  { max=200,  density=0.33, color=Color3.fromRGB(210,205,190), bright=1.8, label="EMITTER"      },
  { max=500,  density=0.48, color=Color3.fromRGB(218,195,175), bright=1.6, label="VERVUILER"    },
  { max=math.huge, density=0.60, color=Color3.fromRGB(225,175,165), bright=1.4, label="GHOST ALLY" },
}

EmissionRE.OnClientEvent:Connect(function(balance)
  for _, tier in ipairs(TIERS) do
    if balance < tier.max then
      -- Smooth tween naar nieuwe staat
      local ts = game:GetService("TweenService")
      ts:Create(Atmosphere, TweenInfo.new(3),
        { Density=tier.density, Color=tier.color }):Play()
      ts:Create(Lighting, TweenInfo.new(3),
        { Brightness=tier.bright }):Play()
      -- Ghost Ally: rode glitch particles activeren
      if tier.label == "GHOST ALLY" then
        workspace.GhostGlitchEmitter.Enabled = true
      else
        workspace.GhostGlitchEmitter.Enabled = false
      end
      return
    end
  end
end)`,
};

const REALISM_TABLE = [
  {game:"Brookhaven RP",   sc:40, dims:[30,60, 5,10,40], col:PALETTE.violet},
  {game:"Sonic Frontiers", sc:55, dims:[95,20,10,20,30], col:PALETTE.gold  },
  {game:"GTA 5",           sc:72, dims:[30,80,65,60,20], col:"#ef4444"     },
  {game:"Medal of Honor",  sc:82, dims:[20,75,70,90,10], col:PALETTE.rust  },
  {game:"GTA 6 (analyse)", sc:91, dims:[40,92,88,85,30], col:PALETTE.sky   },
  {game:"MOLGANG Target",  sc:96, dims:[92,90,88,95,98], col:PALETTE.green },
];
const DIM_LABELS = ["Movement\nPhysics","NPC\nAI","World\nReact","Audio\nAuth","Edu\nAccuracy"];

/* ─── SUB-COMPONENTS ─────────────────────────── */

function GlowText({ children, col, size = 28, family = "'Syne', sans-serif" }) {
  return (
    <span style={{ fontFamily: family, fontSize: size, fontWeight: 800,
      color: col, filter: `drop-shadow(0 0 14px ${col}88)`,
      letterSpacing: -1 }}>{children}</span>
  );
}

function Mono({ children, col = "#4a7a60", size = 10 }) {
  return <span style={{ fontFamily: "'DM Mono', monospace", fontSize: size, color: col,
    letterSpacing: .5 }}>{children}</span>;
}

function SectionLabel({ children, col = PALETTE.green }) {
  return (
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: col,
      letterSpacing: 3, marginBottom: 8, opacity: .8 }}>
      // {children.toUpperCase()}
    </div>
  );
}

function Tag({ children, col }) {
  return (
    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 9,
      fontFamily: "'DM Mono', monospace", letterSpacing: .5,
      background: `${col}18`, color: col, border: `1px solid ${col}44`,
      display: "inline-block", margin: "2px 2px 2px 0" }}>
      {children}
    </span>
  );
}

function MomentumSim() {
  const [vel, setVel]       = useState(16);
  const [rail, setRail]     = useState(false);
  const [hill, setHill]     = useState(false);
  const [wind, setWind]     = useState(0);   // −8..+8
  const [ice, setIce]       = useState(false);
  const velRef               = useRef(vel);

  useEffect(() => { velRef.current = vel; }, [vel]);

  useEffect(() => {
    const id = setInterval(() => {
      setVel(v => {
        let nv = v;
        if (rail)       nv = Math.min(80, nv + 1.8);
        else if (hill)  nv = Math.min(60, nv + 0.9);
        else {
          const target = 16 + wind;
          nv = Math.max(Math.max(8, target), nv * (ice ? 0.991 : 0.975));
        }
        if (ice && nv > 50) nv += 0.4; // ijs: minder grip = doorrijden
        return Math.round(nv * 10) / 10;
      });
    }, 80);
    return () => clearInterval(id);
  }, [rail, hill, wind, ice]);

  const tier = vel >= 70 ? [PALETTE.rose, "MAX — Quantum Zone"]
    : vel >= 50 ? [PALETTE.gold, "BOOST — Rail / Downhill"]
    : vel >= 36 ? [PALETTE.sky, "SPRINT — Hold Shift"]
    : vel >= 22 ? [PALETTE.green, "RUN — W ingedrukt"]
    : ["#4a6a58", "WALK — Geen input"];

  const pct = ((vel - 8) / (80 - 8)) * 100;

  return (
    <div style={{ background: PALETTE.card, borderRadius: 12,
      border: `1px solid ${PALETTE.border}`, padding: 20, marginBottom: 20 }}>
      <SectionLabel col={PALETTE.gold}>Live Momentum Simulator</SectionLabel>

      {/* Speedometer */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
            color: "#2a4a38", marginBottom: 2 }}>STUDS / SEC</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 56, fontWeight: 900, lineHeight: 1,
            color: tier[0], filter: `drop-shadow(0 0 20px ${tier[0]}66)` }}>
            {vel.toFixed(1)}
          </div>
        </div>
        <div style={{ paddingBottom: 8 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10,
            color: tier[0] }}>{tier[1]}</div>
        </div>
      </div>

      {/* Bar */}
      <div className="mbar" style={{ marginBottom: 16 }}>
        <div className="mfill" style={{ width: `${pct}%`,
          background: `linear-gradient(90deg, ${tier[0]}66, ${tier[0]})` }}/>
      </div>

      {/* Speed tier legend */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {MOVEMENT_DETAIL.tiers.map(t => (
          <div key={t.name} style={{ flex: 1, minWidth: 60, padding: "6px 8px",
            borderRadius: 6, background: vel >= t.spd - 2 ? `${t.col}18` : PALETTE.surface,
            border: `1px solid ${vel >= t.spd - 2 ? t.col : PALETTE.border}`,
            textAlign: "center", transition: "all .2s" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
              color: vel >= t.spd - 2 ? t.col : "#2a4a38" }}>{t.name}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16,
              color: vel >= t.spd - 2 ? t.col : "#1a3028", fontWeight: 900 }}>
              {t.spd}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          ["⚡ Rail boost", rail, setRail, PALETTE.gold],
          ["⛰ Downhill", hill, setHill, PALETTE.green],
          ["❄ IJslaag (Delft)", ice, setIce, PALETTE.sky],
        ].map(([lbl, active, setter, c]) => (
          <button key={lbl} onClick={() => setter(a => !a)}
            style={{ padding: "6px 14px", borderRadius: 6, cursor: "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              border: `1px solid ${active ? c : PALETTE.border}`,
              background: active ? `${c}18` : "transparent",
              color: active ? c : "#2a4a38", transition: "all .2s" }}>
            {lbl}
          </button>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#2a4a38" }}>
            💨 Wind
          </span>
          <input type="range" min={-8} max={8} value={wind}
            onChange={e => setWind(+e.target.value)}
            style={{ width: 80, accentColor: PALETTE.green }}/>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
            color: wind > 0 ? PALETTE.green : wind < 0 ? PALETTE.rose : "#2a4a38" }}>
            {wind > 0 ? `+${wind}` : wind} s/s
          </span>
        </div>
        <button onClick={() => { setVel(16); setRail(false); setHill(false); setIce(false); setWind(0); }}
          style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${PALETTE.border}`,
            background: "transparent", color: "#2a4a38", cursor: "pointer",
            fontFamily: "'DM Mono', monospace", fontSize: 10 }}>↺</button>
      </div>
    </div>
  );
}

function WeatherWidget() {
  const [wx, setWx] = useState("bewolkt");
  const WX = {
    droog_helder: { icon: "☀", bf: 2, col: "#fbbf24", desc: "Alle NPCs buiten. Ana meet optimaal. Perfecte sprint-condities op polder.", npcFx: "Normaal dagschema" },
    bewolkt:      { icon: "☁", bf: 3, col: PALETTE.steel, desc: "Standaard NL. Default game-staat. Licht bewolkt boven IJmuiden.", npcFx: "Normaal dagschema" },
    lichte_regen: { icon: "🌧", bf: 4, col: PALETTE.sky, desc: "Ana fietst met regenjas. Direk grommelt. Grachten rijzen 0.2 studs.", npcFx: "Paraplu-animaties. Ana: comm-bericht." },
    storm:        { icon: "⛈", bf: 7, col: PALETTE.rose, desc: "Kees haalt koeien. Polderweg geblokkeerd. HGMS extern onbereikbaar.", npcFx: "Storm override: Kees naar schuur. Buiten-quests geblokkeerd." },
    zeemist:      { icon: "🌫", bf: 1, col: "#e2e8f0", desc: "Quantum dots extra zichtbaar (contrast). Ana's sensoren offline tot 09:00.", npcFx: "Ana: 'Sensoren werken niet.' Quantum-bonus: +15% dot-visibility." },
  };
  const w = WX[wx];
  return (
    <div style={{ background: PALETTE.card, borderRadius: 10, border: `1px solid ${PALETTE.border}`,
      overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${PALETTE.border}`,
        display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.entries(WX).map(([k, v]) => (
          <button key={k} onClick={() => setWx(k)}
            style={{ padding: "4px 10px", borderRadius: 8, cursor: "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: 9,
              border: `1px solid ${wx === k ? v.col : PALETTE.border}`,
              background: wx === k ? `${v.col}18` : "transparent",
              color: wx === k ? v.col : "#2a4a38", transition: "all .2s" }}>
            {v.icon} {k.replace("_", " ")}
          </button>
        ))}
      </div>
      <div style={{ padding: 16, display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ fontSize: 48 }}>{w.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20,
            fontWeight: 900, color: w.col, marginBottom: 4 }}>
            Beaufort {w.bf} · {wx.replace("_", " ").toUpperCase()}
          </div>
          <div style={{ fontSize: 13, color: PALETTE.steel, marginBottom: 8, lineHeight: 1.6 }}>
            {w.desc}
          </div>
          <div style={{ fontSize: 11, color: w.col, fontFamily: "'DM Mono', monospace",
            background: `${w.col}10`, padding: "6px 10px", borderRadius: 6,
            border: `1px solid ${w.col}33` }}>
            NPC effect: {w.npcFx}
          </div>
        </div>
      </div>
    </div>
  );
}

function CO2WorldEffect() {
  const [balance, setBalance] = useState(0);
  const TIERS = [
    { max:-500, label:"CARBON HERO",  col:"#22d3ee", bg:"#0c1f24", desc:"Kristalhelder. Groener Wognum. Geen smog. Tower gloeit intenser." },
    { max:-100, label:"CO₂ REDUCEER", col:PALETTE.green, bg:"#0a1a0e", desc:"Licht groener dan normaal. Heldere horizon." },
    { max:0,    label:"NEUTRAAL",     col:PALETTE.lime, bg:"#0b1510", desc:"Standaard NL bewolking. Neutrale atmosfeer." },
    { max:200,  label:"EMITTER",      col:PALETTE.gold, bg:"#180e00", desc:"Lichte haze boven Slakkenspoor. NPC's iets ongerust." },
    { max:500,  label:"VERVUILER",    col:PALETTE.rust, bg:"#1a0a00", desc:"Oranje smog. Horizon troebel. Ana stuurt waarschuwing." },
    { max:Infinity, label:"GHOST ALLY", col:"#ef4444", bg:"#1a0404", desc:"Rode CarbonGhost glitches. Atmosfeer dicht. Speler verliest 0.5× beloningen." },
  ];
  const tier = TIERS.find(t => balance < t.max) || TIERS[5];

  return (
    <div style={{ background: tier.bg, borderRadius: 12, border: `1px solid ${tier.col}33`,
      padding: 20, transition: "all .5s", marginBottom: 16 }}>
      <SectionLabel col={tier.col}>CO₂ Balans → Wereld Visueel (live)</SectionLabel>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
            color: "#2a4a38", marginBottom: 2 }}>BALANS (gram CO₂-equivalent)</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 52, fontWeight: 900, lineHeight: 1,
            color: tier.col, filter: `drop-shadow(0 0 16px ${tier.col}88)` }}>
            {balance >= 0 ? `+${balance}` : balance}g
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18,
            color: tier.col, letterSpacing: 2, fontWeight: 900 }}>
            {tier.label}
          </div>
        </div>
        <div style={{ flex: 1, fontSize: 13, color: PALETTE.steel, lineHeight: 1.7 }}>
          {tier.desc}
        </div>
      </div>
      {/* Slider */}
      <div style={{ marginBottom: 12 }}>
        <input type="range" min={-600} max={600} value={balance}
          onChange={e => setBalance(+e.target.value)}
          style={{ width: "100%", accentColor: tier.col }}/>
        <div style={{ display: "flex", justifyContent: "space-between",
          fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a4a38" }}>
          <span>−600g (Carbon Hero)</span>
          <span>0g</span>
          <span>+600g (Ghost Ally)</span>
        </div>
      </div>
      {/* Quick buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[["🌿 Fotosynthese", -264], ["⭐ Slag CO₂", -44], ["🔥 Methaan", +44],
          ["🏭 Staal CO₂", +88], ["↺ Reset", 0]].map(([lbl, delta]) => (
          <button key={lbl}
            onClick={() => setBalance(delta === 0 ? 0 : b => Math.max(-600, Math.min(600, b + delta)))}
            style={{ padding: "5px 10px", borderRadius: 6, cursor: "pointer",
              border: `1px solid ${delta < 0 ? PALETTE.green : delta > 0 ? "#ef4444" : PALETTE.border}`,
              background: delta < 0 ? "#22c55e18" : delta > 0 ? "#ef444418" : "transparent",
              color: delta < 0 ? PALETTE.green : delta > 0 ? "#ef4444" : "#2a4a38",
              fontFamily: "'DM Mono', monospace", fontSize: 9 }}>
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

function NPCCard({ npc, col }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="npc-card" onClick={() => setOpen(o => !o)}
      style={{ background: PALETTE.card, border: `1px solid ${open ? col : PALETTE.border}`,
        borderRadius: 8, padding: 14, cursor: "pointer",
        borderLeft: `3px solid ${col}`, transition: "all .2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: open ? 12 : 0 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
            fontSize: 16, color: col }}>{npc.name}</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#2a4a38" }}>
            {npc.variants} dialoogvarianten
          </div>
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
          color: "#1a3028", marginTop: 2 }}>{open ? "▲" : "▼"}</div>
      </div>
      {open && (
        <div style={{ animation: "pop .25s ease-out" }}>
          {[["Dagschema", npc.sched, PALETTE.gold],
            ["Trust-systeem", npc.trust, PALETTE.green]].map(([k, v, c]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                color: c, letterSpacing: 1, marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 12, color: PALETTE.steel, lineHeight: 1.6 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RadarChart({ data, labels, col }) {
  const cx = 80, cy = 80, r = 60;
  const n = data.length;
  const pts = data.map((v, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const rr = (v / 100) * r;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  });
  const gridPts = (scale) => Array.from({length: n}, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + scale * r * Math.cos(a), cy + scale * r * Math.sin(a)];
  });
  const polyPath = (ppts) => ppts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + "Z";
  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      {[.25,.5,.75,1].map(s => (
        <path key={s} d={polyPath(gridPts(s))} fill="none"
          stroke={PALETTE.border} strokeWidth={.8}/>
      ))}
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy}
          x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
          stroke={PALETTE.border} strokeWidth={.8}/>;
      })}
      <path d={polyPath(pts)} fill={`${col}30`} stroke={col} strokeWidth={1.5}/>
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={col}/>
      ))}
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const lx = cx + (r + 14) * Math.cos(a);
        const ly = cy + (r + 14) * Math.sin(a);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fill={col} fontSize={7} fontFamily="'DM Mono', monospace">
            {labels[i].split("\n")[0]}
          </text>
        );
      })}
    </svg>
  );
}

function CodePane({ samples }) {
  const keys = Object.keys(samples);
  const [sel, setSel] = useState(keys[0]);
  return (
    <div style={{ background: PALETTE.surface, borderRadius: 10,
      border: `1px solid ${PALETTE.border}`, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${PALETTE.border}`,
        padding: "0 12px", overflowX: "auto" }}>
        {keys.map(k => (
          <button key={k} onClick={() => setSel(k)}
            style={{ padding: "8px 14px", background: "transparent", border: "none",
              borderBottom: `2px solid ${sel === k ? PALETTE.green : "transparent"}`,
              color: sel === k ? PALETTE.green : "#2a4a38", cursor: "pointer",
              fontFamily: "'DM Mono', monospace", fontSize: 10, whiteSpace: "nowrap",
              transition: "all .2s" }}>
            {k}.lua
          </button>
        ))}
      </div>
      <div className="codeblock" style={{ margin: 0, borderRadius: 0, border: "none",
        maxHeight: 360, overflowY: "auto" }}>
        {samples[sel].split("\n").map((line, i) => {
          let col = "#4a7060";
          if (line.trim().startsWith("--")) col = "#2a5a3a";
          else if (/\b(local|function|end|if|then|else|for|while|return|not|and|or|do|repeat|until|break)\b/.test(line)) col = PALETTE.green;
          else if (/"[^"]*"|'[^']*'/.test(line)) col = PALETTE.lime;
          else if (/\b\d+(\.\d+)?\b/.test(line)) col = PALETTE.sky;
          else col = "#8ab8a0";
          return (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <span style={{ color: "#1a3028", fontSize: 9, minWidth: 20,
                textAlign: "right", userSelect: "none" }}>{i + 1}</span>
              <span style={{ color: col }}>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────── */

const TABS = [
  "INSPIRATIEBRONNEN",
  "WORLD ZONES",
  "MOVEMENT PHYSICS",
  "NPC AI SYSTEMEN",
  "OMGEVING",
  "LUA CODE",
  "REALISME MATRIX",
];

export default function GDD() {
  const [tab, setTab]       = useState(0);
  const [zone, setZone]     = useState(0);

  return (
    <div style={{ background: PALETTE.bg, minHeight: "100vh" }}>
      <style>{css}</style>

      {/* ── HEADER ── */}
      <div style={{ background: "#050809", borderBottom: `1px solid ${PALETTE.border}`,
        padding: "14px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 10 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: 26, letterSpacing: -1, color: PALETTE.green,
            filter: `drop-shadow(0 0 16px ${PALETTE.green}55)` }}>
            MOLGANG
          </div>
          <div style={{ width: 1, height: 28, background: PALETTE.border }}/>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
              fontSize: 15, color: "#8ab8a0", letterSpacing: .5 }}>
              GAME DESIGN DOCUMENT — v2.0
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
              color: "#2a4a38", letterSpacing: 1 }}>
              Sonic + Brookhaven + Medal of Honor + GTA 6  ×10 realistischer
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["⚡ Sonic OZ", PALETTE.gold], ["🏡 Brookhaven", PALETTE.violet],
              ["🎖 MoH Auth", PALETTE.rust], ["🌆 GTA 6 AI", PALETTE.sky]].map(([l, c]) => (
              <span key={l} style={{ padding: "3px 9px", borderRadius: 10, fontSize: 9,
                fontFamily: "'DM Mono', monospace", background: `${c}12`,
                color: c, border: `1px solid ${c}33` }}>
                {l}
              </span>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", overflowX: "auto",
          borderBottom: `1px solid ${PALETTE.border}` }}>
          {TABS.map((t, i) => (
            <button key={t} className={`tab ${tab === i ? "on" : ""}`}
              onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ height: "calc(100vh - 100px)", overflowY: "auto" }}>

        {/* ─ TAB 0: INSPIRATIEBRONNEN ─ */}
        {tab === 0 && (
          <div style={{ padding: 28 }}>
            <SectionLabel>Vier Inspiratiebronnen — Elk Getransendeerd</SectionLabel>
            <GlowText col={PALETTE.green} size={38}>
              Hoe MOLGANG verder gaat
            </GlowText>
            <div style={{ fontSize: 14, color: "#4a6a58", marginTop: 6, marginBottom: 32,
              maxWidth: 600, lineHeight: 1.7 }}>
              We namen het beste van elk spel — en vervingen hun zwakste punten
              met échte chemie, échte NL-geografie en echte moleculaire precisie.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
              {INSPIRATION.map((ins, i) => (
                <div key={ins.game} className="gc"
                  style={{ borderColor: `${ins.col}33`, background: PALETTE.card,
                    animationDelay: `${i * .1}s` }}>
                  {/* Header */}
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${ins.col}22`,
                    background: `${ins.col}0a`, display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ fontSize: 32 }}>{ins.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                        fontSize: 20, color: ins.col, letterSpacing: 1 }}>
                        {ins.game}
                      </div>
                      <div style={{ fontSize: 13, color: "#4a6a58" }}>
                        {ins.headline}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 40,
                      fontWeight: 900, color: ins.col, opacity: .3 }}>
                      {ins.score}
                    </div>
                  </div>

                  <div style={{ padding: "14px 20px" }}>
                    {/* What we take */}
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                      color: ins.col, letterSpacing: 2, marginBottom: 6 }}>
                      WAT WE OVERNEMEN
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                      {ins.what.map(w => <Tag key={w} col={ins.col}>{w}</Tag>)}
                    </div>

                    {/* What was missing */}
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                      color: "#2a4a38", letterSpacing: 2, marginBottom: 6 }}>
                      WAT ONTBRAK
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                      {ins.missing.map(m => (
                        <span key={m} style={{ padding: "2px 8px", borderRadius: 10, fontSize: 9,
                          fontFamily: "'DM Mono', monospace", color: "#2a4a38",
                          border: "1px solid #111a24", display: "inline-block", margin: "2px 2px 2px 0" }}>
                          {m}
                        </span>
                      ))}
                    </div>

                    {/* MOLGANG solution */}
                    <div style={{ background: `${ins.col}0c`, borderRadius: 6,
                      border: `1px solid ${ins.col}22`, padding: "10px 14px" }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                        color: ins.col, letterSpacing: 2, marginBottom: 4 }}>
                        MOLGANG OPLOSSING
                      </div>
                      <div style={{ fontSize: 12, color: PALETTE.steel, lineHeight: 1.6 }}>
                        {ins.molgang}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Formula */}
            <div style={{ marginTop: 24, padding: 28, background: PALETTE.card,
              borderRadius: 14, border: `1px solid ${PALETTE.green}22`, textAlign: "center" }}>
              <SectionLabel col={PALETTE.green}>De Formule</SectionLabel>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20,
                fontWeight: 600, color: PALETTE.steel, lineHeight: 2 }}>
                <span style={{ color: PALETTE.gold }}>Sonic Open Zone physics</span>
                {" + "}
                <span style={{ color: PALETTE.violet }}>Brookhaven sandbox vrijheid</span>
                {" + "}
                <span style={{ color: PALETTE.rust }}>Medal of Honor authentieke immersie</span>
                {" + "}
                <span style={{ color: PALETTE.sky }}>GTA 6 levende wereld AI</span>
                {" = "}
                <span style={{ color: PALETTE.green, fontWeight: 900, fontSize: 28,
                  filter: `drop-shadow(0 0 12px ${PALETTE.green}66)` }}>
                  MOLGANG
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ─ TAB 1: ZONES ─ */}
        {tab === 1 && (
          <div style={{ display: "flex", height: "100%" }}>
            {/* Zone selector sidebar */}
            <div style={{ width: 200, background: PALETTE.surface, padding: 14,
              borderRight: `1px solid ${PALETTE.border}`, flexShrink: 0, overflowY: "auto" }}>
              <SectionLabel>Zones</SectionLabel>
              {ZONES_FULL.map((z, i) => (
                <div key={z.id} onClick={() => setZone(i)}
                  style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                    marginBottom: 6, background: zone === i ? `${z.col}18` : "transparent",
                    border: `1px solid ${zone === i ? z.col : PALETTE.border}`,
                    transition: "all .2s" }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{z.icon}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13,
                    fontWeight: 600, color: zone === i ? z.col : "#4a6a58" }}>
                    {z.name.split(" ")[0]}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                    color: "#1a3028" }}>{z.size}</div>
                </div>
              ))}
            </div>

            {/* Zone detail */}
            <div style={{ flex: 1, overflowY: "auto", padding: 28 }}>
              {(() => {
                const z = ZONES_FULL[zone];
                return (
                  <div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                      <span style={{ fontSize: 44 }}>{z.icon}</span>
                      <div>
                        <GlowText col={z.col} size={32}>{z.name}</GlowText>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10,
                          color: "#2a4a38", marginTop: 2 }}>{z.loc} · {z.size}</div>
                      </div>
                    </div>
                    <div style={{ fontStyle: "italic", fontSize: 15, color: PALETTE.steel,
                      marginBottom: 24, paddingLeft: 14,
                      borderLeft: `3px solid ${z.col}` }}>
                      "{z.tagline}"
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

                      {/* Atmosfeer */}
                      <div style={{ background: PALETTE.card, borderRadius: 8, padding: 16,
                        border: `1px solid ${z.col}22` }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                          color: z.col, letterSpacing: 2, marginBottom: 8 }}>ATMOSFEER</div>
                        <div style={{ fontSize: 13, color: PALETTE.steel, lineHeight: 1.7 }}>
                          {z.atmos}
                        </div>
                      </div>

                      {/* Brookhaven principe */}
                      <div style={{ background: PALETTE.card, borderRadius: 8, padding: 16,
                        border: `1px solid ${PALETTE.violet}22` }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                          color: PALETTE.violet, letterSpacing: 2, marginBottom: 8 }}>
                          🏡 BROOKHAVEN VRIJHEID
                        </div>
                        <div style={{ fontSize: 13, color: PALETTE.steel, lineHeight: 1.7 }}>
                          {z.brookhaven}
                        </div>
                      </div>

                      {/* Sonic elementen */}
                      <div style={{ background: PALETTE.card, borderRadius: 8, padding: 16,
                        border: `1px solid ${PALETTE.gold}22` }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                          color: PALETTE.gold, letterSpacing: 2, marginBottom: 8 }}>
                          ⚡ SONIC OPEN ZONE ELEMENTEN
                        </div>
                        {z.sonic.map((s, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 4, height: 4, borderRadius: "50%",
                              background: PALETTE.gold, flexShrink: 0, marginTop: 6 }}/>
                            <div style={{ fontSize: 12, color: PALETTE.steel }}>{s}</div>
                          </div>
                        ))}
                      </div>

                      {/* Medal of Honor audio */}
                      <div style={{ background: PALETTE.card, borderRadius: 8, padding: 16,
                        border: `1px solid ${PALETTE.rust}22` }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                          color: PALETTE.rust, letterSpacing: 2, marginBottom: 8 }}>
                          🎖 MOH AUDIO LAAG
                        </div>
                        {z.moh_audio.map((s, i) => (
                          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                            <div style={{ width: 4, height: 4, borderRadius: "50%",
                              background: PALETTE.rust, flexShrink: 0, marginTop: 6 }}/>
                            <div style={{ fontSize: 12, color: PALETTE.steel }}>{s}</div>
                          </div>
                        ))}
                      </div>

                      {/* GTA NPC's */}
                      <div style={{ gridColumn: "1 / -1", background: PALETTE.card,
                        borderRadius: 8, padding: 16, border: `1px solid ${PALETTE.sky}22` }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                          color: PALETTE.sky, letterSpacing: 2, marginBottom: 12 }}>
                          🌆 GTA 6 NPC SYSTEMEN — {z.gta_npcs.length} CHARACTERS
                        </div>
                        <div style={{ display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
                          {z.gta_npcs.map(n => (
                            <NPCCard key={n.name} npc={n} col={PALETTE.sky}/>
                          ))}
                        </div>
                      </div>

                      {/* Districts */}
                      <div style={{ gridColumn: "1 / -1", background: PALETTE.card,
                        borderRadius: 8, padding: 16, border: `1px solid ${PALETTE.border}` }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                          color: "#2a4a38", letterSpacing: 2, marginBottom: 10 }}>
                          DISTRICTEN
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {z.districts.map((d, i) => (
                            <span key={i} style={{ padding: "4px 12px", borderRadius: 6,
                              background: `${z.col}12`, color: z.col,
                              border: `1px solid ${z.col}33`, fontSize: 11,
                              fontFamily: "'Barlow Condensed', sans-serif" }}>
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ─ TAB 2: MOVEMENT ─ */}
        {tab === 2 && (
          <div style={{ padding: 28 }}>
            <SectionLabel col={PALETTE.gold}>Sonic Open Zone Physics</SectionLabel>
            <GlowText col={PALETTE.gold} size={36}>Movement & Momentum</GlowText>
            <div style={{ fontSize: 13, color: "#4a6a58", marginTop: 6, marginBottom: 24,
              maxWidth: 600, lineHeight: 1.7 }}>
              Gebaseerd op Sonic Frontiers momentum-carry principe — maar volledig
              terrain-aware voor het NL landschap: polderwind, fabrieksconveyor, cryogeen ijs.
              Met Medal of Honor-precisie: elk terreintype heeft exacte physics parameters.
            </div>

            <MomentumSim/>

            {/* Terrain table */}
            <div style={{ marginBottom: 20 }}>
              <SectionLabel col={PALETTE.steel}>Terrein-Modificatoren</SectionLabel>
              <div style={{ display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {MOVEMENT_DETAIL.terrain.map(t => (
                  <div key={t.name} style={{ background: PALETTE.card, borderRadius: 8,
                    padding: 12, border: `1px solid ${PALETTE.border}`,
                    display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20 }}>{t.icon}</span>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
                        fontWeight: 600, color: "#8ab8a0" }}>{t.name}</div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
                        color: PALETTE.gold, marginTop: 2 }}>{t.mod}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Brookhaven freedom note */}
            <div style={{ background: `${PALETTE.violet}0a`, borderRadius: 10,
              border: `1px solid ${PALETTE.violet}22`, padding: 16 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
                color: PALETTE.violet, letterSpacing: 2, marginBottom: 6 }}>
                🏡 BROOKHAVEN VRIJHEID — AANPASBARE SLIDERS (Sonic Frontiers principe)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: 10 }}>
                {MOVEMENT_DETAIL.tiers.map(t => (
                  <div key={t.name} style={{ padding: "8px 12px", borderRadius: 6,
                    background: `${t.col}10`, border: `1px solid ${t.col}33` }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16,
                      fontWeight: 900, color: t.col }}>{t.name}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11,
                      color: PALETTE.steel }}>{t.spd} s/s</div>
                    <div style={{ fontSize: 11, color: "#2a4a38" }}>{t.cond}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#4a6a58", lineHeight: 1.7 }}>
                Speler kan loopsnelheid (16–28), sprintsnelheid (22–60), draaisnelheid en
                momentumbehouding aanpassen via Settings. Geen penalty. Zelfde als Sonic Frontiers'
                accessibility-aanpak. Elke instelling telt mee voor physics — geen visuele truc.
              </div>
            </div>
          </div>
        )}

        {/* ─ TAB 3: NPC AI ─ */}
        {tab === 3 && (
          <div style={{ padding: 28 }}>
            <SectionLabel col={PALETTE.sky}>GTA 6 NPC Systemen</SectionLabel>
            <GlowText col={PALETTE.sky} size={36}>Levende NPC's met Geheugen</GlowText>
            <div style={{ fontSize: 13, color: "#4a6a58", marginTop: 6, marginBottom: 24,
              maxWidth: 600, lineHeight: 1.7 }}>
              Gebaseerd op GTA 6 contextual dialogue (100K+ lines principe), NPC-dagschema's
              en het Red Dead 2 memory-systeem. Alle 6 hoofd-NPC's hebben volledig gedrag.
            </div>

            <WeatherWidget/>

            {/* All NPCs */}
            <SectionLabel col={PALETTE.steel}>Alle Hoofdpersonages</SectionLabel>
            <div style={{ display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10, marginBottom: 24 }}>
              {ZONES_FULL.flatMap(z =>
                z.gta_npcs.slice(0, 2).map(n => (
                  <div key={n.name + z.id}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                      color: z.col, letterSpacing: 1, marginBottom: 4 }}>
                      {z.icon} {z.name.split(" ")[0]}
                    </div>
                    <NPCCard npc={n} col={z.col}/>
                  </div>
                ))
              )}
            </div>

            {/* MoH audio note */}
            <div style={{ background: `${PALETTE.rust}0a`, borderRadius: 10,
              border: `1px solid ${PALETTE.rust}22`, padding: 16 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
                color: PALETTE.rust, letterSpacing: 2, marginBottom: 8 }}>
                🎖 MEDAL OF HONOR AUDIO PRINCIPE — TOEGEPAST OP NPC DIALOOG
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  ["Afstandseffect", "NPC op 200+ studs klinkt als radio. Dichtbij: radiogeluid + echte stem gecombineerd. Identiek aan MoH's squad-communicatie."],
                  ["Contextbewust geluid", "Erik Kraber's principe: 'Sound recognizable without visual support.' Direk's HGMS-commando's zijn herkenbaar ook als je de machine niet ziet."],
                  ["Geen herhaling", "GTA 6 principe: elke context-combinatie geeft unieke lijn. Trust × Weer × Uur × Activiteit = 24+ varianten per NPC."],
                  ["Emotionele authenticiteit", "MoH: geluiden zijn niet gehyped. Direk praat kort en direct — geen acteer-voice. Ana praat snel en enthousiast. Kwantje mompelt."],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: PALETTE.card, borderRadius: 6, padding: 12,
                    border: `1px solid ${PALETTE.border}` }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9,
                      color: PALETTE.rust, marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 12, color: PALETTE.steel, lineHeight: 1.6 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─ TAB 4: OMGEVING ─ */}
        {tab === 4 && (
          <div style={{ padding: 28 }}>
            <SectionLabel col={PALETTE.green}>Reactieve Omgeving</SectionLabel>
            <GlowText col={PALETTE.green} size={36}>De Wereld Leeft</GlowText>
            <div style={{ fontSize: 13, color: "#4a6a58", marginTop: 6, marginBottom: 24,
              maxWidth: 600, lineHeight: 1.7 }}>
              GTA 6-principe: de wereld reageert op jou, herinnert wat je deed,
              en past zich aan. CO₂-balans verandert de atmosfeer. Weer is NL klimaat-model.
            </div>

            <CO2WorldEffect/>
            <WeatherWidget/>

            {/* Environmental detail grid */}
            <SectionLabel col={PALETTE.steel}>Omgevingssystemen</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12 }}>
              {[
                { title: "Dag/Nacht Cyclus", col: PALETTE.gold, icon: "🌅",
                  items: ["24 min real-time = 24 uur game (1min = 1uur)", "Gouden uur 06:30-08:00: laag dramatisch licht", "Middagzon 12:00-15:00: harde schaduwen op fabriek", "Nacht: Tower meest imposant, IJburg reflecties", "Sterren: lichtpuntjes = elementen Z>50"] },
                { title: "Spatial 3D Audio (MoH)", col: PALETTE.rust, icon: "🔊",
                  items: ["Layer 1: Ambient zone (wind, regen, fabriek-hum)", "Layer 2: NPC op afstand = radiogeluid (200m)", "Layer 3: Elementtonen = atoommassa/10 Hz", "Layer 4: Reactie-SFX (bubbels, kristallisatie)", "Layer 5: UI-geluiden (nooit overheersend)"] },
                { title: "Brookhaven Interieur", col: PALETTE.violet, icon: "🚪",
                  items: ["Alle gebouwen betreedbaar (GTA 6 principe)", "ANK vault: open als je credit hebt", "Kees' schuur: inloopbaar, melkrobot actief", "Femke's lab: werkbanken bruikbaar altijd", "Tower: alle 5 verdiepingen betreedbaar"] },
                { title: "Procedurele Details", col: PALETTE.sky, icon: "🌍",
                  items: ["Gras beweegt per windrichting (Beaufort-waarde)", "Slootwater: golfhoogte = windkracht", "Pioenen: meer bloei bij lage N-depositie", "Fabrieksdamp: dichter bij hogere productie", "MolChain Tower pulse = chain-entries per minuut"] },
              ].map(s => (
                <div key={s.title} style={{ background: PALETTE.card, borderRadius: 10,
                  border: `1px solid ${s.col}22`, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: `${s.col}0a`,
                    borderBottom: `1px solid ${s.col}22`,
                    display: "flex", gap: 8, alignItems: "center" }}>
                    <span>{s.icon}</span>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                      fontSize: 15, color: s.col }}>{s.title}</div>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    {s.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                        <div style={{ width: 3, height: 3, borderRadius: "50%",
                          background: s.col, flexShrink: 0, marginTop: 6 }}/>
                        <div style={{ fontSize: 11, color: PALETTE.steel, lineHeight: 1.5 }}>
                          {item}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─ TAB 5: CODE ─ */}
        {tab === 5 && (
          <div style={{ padding: 28 }}>
            <SectionLabel col={PALETTE.lime}>Lua Implementatie</SectionLabel>
            <GlowText col={PALETTE.lime} size={36}>Roblox Code Architectuur</GlowText>
            <div style={{ fontSize: 13, color: "#4a6a58", marginTop: 6, marginBottom: 24,
              maxWidth: 600, lineHeight: 1.7 }}>
              Alle bewegings-, NPC- en omgevingssystemen geïmplementeerd als Knit-services.
              Server/Client gescheiden. DataStore voor NPC-geheugen.
            </div>

            <CodePane samples={NPC_AI_CODE}/>

            {/* Architecture diagram */}
            <div style={{ marginTop: 20, background: PALETTE.card, borderRadius: 10,
              border: `1px solid ${PALETTE.border}`, padding: 20 }}>
              <SectionLabel col={PALETTE.green}>Service Architectuur</SectionLabel>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { name: "SERVER", col: PALETTE.sky, services: ["NPCScheduleService", "WeatherSystem", "EmissionSystem", "ChemistryValidator", "ChainRegistry", "GameClock"] },
                  { name: "CLIENT", col: PALETTE.gold, services: ["MovementController", "EmissionAtmosphere", "WeatherClientFX", "HUDController", "SoundService3D", "MoleculeBuilder"] },
                  { name: "SHARED", col: PALETTE.violet, services: ["ChemistryData (IUPAC)", "DialogueTree", "PlayerData (ProfileService)", "Schedules", "ZoneConfig", "ReactionRegistry"] },
                ].map(layer => (
                  <div key={layer.name} style={{ flex: 1, minWidth: 180, background: PALETTE.surface,
                    borderRadius: 8, padding: 14, border: `1px solid ${layer.col}22` }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
                      fontSize: 18, color: layer.col, marginBottom: 10 }}>
                      {layer.name}
                    </div>
                    {layer.services.map(s => (
                      <div key={s} style={{ fontFamily: "'DM Mono', monospace", fontSize: 10,
                        color: "#4a6a58", padding: "3px 0",
                        borderBottom: `1px solid ${PALETTE.border}`, marginBottom: 3 }}>
                        {s}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─ TAB 6: REALISM MATRIX ─ */}
        {tab === 6 && (
          <div style={{ padding: 28 }}>
            <SectionLabel>Realisme Matrix</SectionLabel>
            <GlowText col={PALETTE.green} size={36}>10× Realistischer</GlowText>
            <div style={{ fontSize: 13, color: "#4a6a58", marginTop: 6, marginBottom: 28,
              maxWidth: 600, lineHeight: 1.7 }}>
              Vijf dimensies van realisme. MOLGANG scoort hoger dan elk spel
              op zijn eigen sterkste dimensie.
            </div>

            {/* Radar charts grid */}
            <div style={{ display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
              {REALISM_TABLE.map(g => (
                <div key={g.game} style={{ background: PALETTE.card, borderRadius: 10,
                  border: `1px solid ${g.col}33`, padding: 14, textAlign: "center" }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14,
                    fontWeight: 600, color: g.col, marginBottom: 8 }}>
                    {g.game}
                  </div>
                  <RadarChart data={g.dims} labels={DIM_LABELS} col={g.col}/>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 36,
                    fontWeight: 900, color: g.col, marginTop: 4,
                    filter: `drop-shadow(0 0 12px ${g.col}55)` }}>
                    {g.sc}
                  </div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8,
                    color: "#2a4a38" }}>/100</div>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <SectionLabel col={PALETTE.steel}>Overall Realisme Score</SectionLabel>
            <div style={{ background: PALETTE.card, borderRadius: 10,
              border: `1px solid ${PALETTE.border}`, padding: 20 }}>
              {REALISM_TABLE.map(g => (
                <div key={g.game} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    marginBottom: 5, fontSize: 13 }}>
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 600, color: g.col }}>{g.game}</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12,
                      color: g.col }}>{g.sc}/100</span>
                  </div>
                  <div className="mbar" style={{ height: 8 }}>
                    <div className="mfill" style={{ width: `${g.sc}%`,
                      background: `linear-gradient(90deg, ${g.col}55, ${g.col})` }}/>
                  </div>
                </div>
              ))}
            </div>

            {/* Waar MOLGANG uniek is */}
            <div style={{ marginTop: 24 }}>
              <SectionLabel col={PALETTE.green}>Unieke MOLGANG Features — Geen enkel ander spel doet dit</SectionLabel>
              <div style={{ display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
                {[
                  { t: "Mol-niveau chemische precisie", d: "IUPAC atoommassa's op 3 decimalen. pH-waarden uit echt lab-protocol BOF-slak. Geen vereenvoudiging.", col: PALETTE.green },
                  { t: "CO₂ balans → visuele wereld", d: "Jouw persoonlijke grammen CO₂ veranderen de atmosfeer van de hele game. Geen enkel spel doet dit.", col: PALETTE.lime },
                  { t: "Echte NL geografie", d: "Wognum, Zaandam, IJmuiden, Amsterdam IJburg — echte coördinaten, echt polderklimaat, echte fauna.", col: PALETTE.sky },
                  { t: "Optionele blockchain die werkt", d: "MolChain registratie is optioneel maar beloont. Geen andere game integreert blockchain als gameplay-mechanisme.", col: PALETTE.violet },
                  { t: "Educatief en leuk tegelijk", d: "Speler leert stoichiometrie, pH-chemie, stikstofketen — zonder het te merken. Geen enkel spel combineert dit.", col: PALETTE.gold },
                  { t: "NPC's met consultants-data", d: "Direk's pH-ladder is de échte BOF-slak H₂SO₄-route. Ana meet echte KNMI-depositiewaarden.", col: PALETTE.rust },
                ].map(f => (
                  <div key={f.t} style={{ background: `${f.col}0a`, borderRadius: 8,
                    border: `1px solid ${f.col}33`, padding: 14 }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                      fontSize: 15, color: f.col, marginBottom: 6 }}>{f.t}</div>
                    <div style={{ fontSize: 12, color: PALETTE.steel, lineHeight: 1.6 }}>{f.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

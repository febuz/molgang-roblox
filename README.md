# MOLGANG — Chemical Engineering Simulator

**Immersive VR/AR chemical engineering simulator on Roblox. Process real BOF steel slag, synthesize fertilizers, and build your own factory.**

Built by [VirtualV Holding B.V.](https://github.com/febuz) + Slakkenspoor VOF

---

## What is MOLGANG?

MOLGANG is a **Chemical Engineering Simulator** where players operate a complete steel slag processing plant, learn real chemistry, and build an industrial empire:

- **Process BOF steel slag** through 12 realistic stations (crushing → magnetic separation → leaching → filtration → product extraction)
- **Control process variables** — temperature (Arrhenius kinetics), pressure (Henry's Law), pH (selective metal precipitation), flow rate
- **Synthesize 10 fertilizers** with real NPK chemistry (Urea, DAP, NPK 15-15-15, Slag Bio-Enhancer)
- **Farm with science** — test soil pH/nutrients, apply fertilizers, grow crops using Liebig's Law of the Minimum
- **Build your factory** — rent 1000m² indoor space, place 22 types of equipment on a grid, manage power and adjacency bonuses
- **Survive weather** — rain/storms/hail damage outdoor operations, motivating the indoor factory
- **Collect all 118 elements** across 6 floating zones in space
- **Play Mahjong** with full Cantonese rules (chi/pong/kong, faan scoring, smart AI)
- **Experience in VR/AR** — laser pointer interaction, teleport locomotion, comfort vignette

## Quick Start

```bash
# Build .rbxl file with Rojo
cd game
rojo build -o MOLGANG.rbxl

# Or serve live to Roblox Studio
rojo serve

# Generate 3D models (requires Blender 5.1+)
flatpak run --filesystem=$PWD org.blender.Blender \
  --background --python assets/blender/generate_slag_models.py
```

## Project Stats

| Metric | Value |
|--------|-------|
| **Lua Scripts** | 64 |
| **Lines of Code** | 27,800+ |
| **3D FBX Models** | 14 (generated via Blender Python) |
| **Server Scripts** | 20 |
| **GUI Screens** | 22 |
| **Client Scripts** | 6 |
| **Shared Modules** | 12 |
| **Game Zones** | 6 |
| **Keyboard Shortcuts** | 16 |
| **Equipment Catalog** | 22 items |
| **Fertilizer Compounds** | 10 (real NPK) |
| **Elements** | 118 (full periodic table) |
| **Molecules** | 25+ |
| **Story Quests** | 12 (3 Acts) |
| **WBSO R&D Hours** | 47h 45min |

## Architecture

```
MOLGANG/
├── game/
│   ├── default.project.json               # Rojo 7.4.4 project config
│   └── src/
│       ├── ServerScriptService/Core/      # 20 server scripts
│       │   ├── EconomyManager.server.lua      # MolCoin economy + DataStore
│       │   ├── AtomSpawner.server.lua         # Weighted spawn, 6 zones
│       │   ├── SlagProcessing.server.lua      # Steel slag leaching pipeline
│       │   ├── FertilizerSystem.server.lua    # NPK farming + quest tracking
│       │   ├── EntrepreneurSystem.server.lua  # Factory builder + 3D placement
│       │   ├── WeatherSystem.server.lua       # Dynamic weather with hazards
│       │   ├── BubbleTeaBar.server.lua        # 6 drinks with gameplay buffs
│       │   ├── SlakkenspoorMiniGame.server.lua # HGMS sorting + pH puzzle
│       │   ├── WorldBuilder.server.lua        # 6 zones + factory + pipeline
│       │   └── [11 more: NPC, Quiz, Chain, Leaderboards, etc.]
│       ├── StarterPlayerScripts/          # 6 client scripts
│       │   ├── GUIManager.client.lua          # 16 keyboard shortcuts
│       │   ├── VRARController.client.lua      # VR laser/teleport + AR
│       │   ├── WeatherEffects.client.lua      # Rain/hail/lightning VFX
│       │   ├── AtomCollector.client.lua       # Proximity auto-collect
│       │   └── HUDController.client.lua       # Full HUD overlay
│       ├── StarterGui/                    # 22 GUI screens
│       │   ├── ProcessControlGui.client.lua   # 4 ChemEng gauges
│       │   ├── FactoryBuilderGui.client.lua   # 40×25 grid floor planner
│       │   ├── SlagProcessingGui.client.lua   # Slag crush/leach/extract
│       │   ├── FertilizerGui.client.lua       # Farm plots + NPK lab
│       │   ├── MahjongGui.client.lua          # Full Cantonese Mahjong
│       │   └── [17 more: Dashboard, Periodic Table, etc.]
│       └── ReplicatedStorage/             # 12 shared modules
│           ├── Modules/ProcessEngineering.lua # Arrhenius, mass balance, pH
│           ├── Modules/SteelSlag.lua          # BOF slag composition + reagents
│           ├── Modules/FertilizerTrack.lua    # NPK compounds + 12 quests
│           ├── Modules/FactoryEquipment.lua   # 22 equipment items + grid
│           ├── Modules/Chemistry.lua          # 25+ molecule recipes
│           └── Modules/MahjongGame.lua        # Full Cantonese rules + AI
├── assets/
│   ├── models/                            # 14 FBX files for Roblox import
│   │   ├── jaw_crusher.fbx, cone_crusher.fbx, ball_mill.fbx
│   │   ├── leaching_tank.fbx, magnetic_separator.fbx
│   │   ├── conveyor_belt.fbx, vibrating_screen.fbx
│   │   ├── cooling_pit.fbx, roasting_kiln.fbx
│   │   ├── storage_silo.fbx, filtration_press.fbx
│   │   ├── slag_chunk.fbx, anvil_hammer.fbx, pipe_section.fbx
│   ├── blender/generate_slag_models.py    # Blender 5.1 Python generator
│   └── ASSET_IMPORT_GUIDE.md              # How to import into Roblox Studio
└── docs/
    ├── WBSO_URENREGISTRATIE_2026.md       # R&D hour registration (47h45m)
    └── guides/                            # QA, deployment, session summaries
```

## Keyboard Shortcuts

| Key | Action | Key | Action |
|-----|--------|-----|--------|
| **P** | Periodic Table | **J** | Slag Processing |
| **U** | Dashboard | **F** | Fertilizer Lab |
| **I** | Inventory | **G** | Factory Builder |
| **K** | Achievements | **C** | Process Control |
| **L** | Leaderboards | **B** | Bubble Tea Bar |
| **Q** | Quest Tracker | **Tab** | Wallet |
| **R** | Recipe Book | **/** | Settings |
| **M** | Minimap | **Esc** | Close All |

## Chemical Engineering Systems

### Steel Slag Processing (12 stations)
```
Cooling Pit → Vibrating Feeder → Jaw Crusher → Vibrating Screen
→ Cone Crusher → Ball Mill → HGMS Magnetic Separator
→ Roasting Kiln (optional, 900°C) → Leaching Tank
→ Filtration Press → Precipitation Reactor → Drying Oven
```

### Reagent Chemistry (6 reagents)
| Reagent | pH | Best For | Cost |
|---------|------|----------|------|
| H2SO4 (Sulfuric Acid) | 1.0 | V, Fe, Mn | 100 MC |
| HCl (Hydrochloric) | 1.5 | Ca, Fe | 80 MC |
| NaOH (Sodium Hydroxide) | 13.0 | Al, Si, Cr | 120 MC |
| HNO3 (Nitric Acid) | 0.5 | Everything | 200 MC |
| Citric Acid | 3.5 | Ca (slow/cheap) | 50 MC |
| Water | 7.0 | Free CaO only | Free |

### Process Control (Arrhenius + Henry's Law)
- Temperature: 0-1000°C, reaction rate k = A × exp(-Ea/RT)
- Pressure: 50-500 kPa, gas solubility via Henry's Law
- pH: 0-14, selective metal precipitation zones
- Flow rate: 1-50 L/min, residence time → conversion

### Fertilizer Track (3 Acts, 12 Quests)
- Act 1: Discovery — soil testing, NPK basics, first harvest
- Act 2: Mastery — industrial NPK, precision agriculture
- Act 3: Crisis — contamination cleanup with Slag Bio-Enhancer + phytoremediation

## VR/AR Support

- **VR**: Laser pointer from right hand, teleport locomotion, comfort vignette, spatial UI scaling (1.5×)
- **AR**: Mobile camera hints, adaptive UI
- **Desktop**: Click-to-interact, keyboard shortcuts

## Security Model

- Server-authoritative economy (PlayerDataBridge prevents Attribute spoofing)
- Rate-limited atom collection (20/min, 0.5s cooldown)
- All MolCoin transactions validated server-side
- Distance checks on all interactions (30 stud max)
- Weather/equipment damage calculated server-side only

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Game Engine | Roblox (Luau) |
| Build Tool | Rojo 7.4.4 |
| 3D Modeling | Blender 5.1 (Python scripted) |
| DataStore | ProfileService pattern |
| VR | Roblox VRService + UserInputService |
| Platform | Linux (Ubuntu 24.04) |

## WBSO (R&D Registration)

Dutch WBSO tax incentive registration: 47h 45min of S&O hours.
See `docs/WBSO_URENREGISTRATIE_2026.md` for detailed hour log.

Researcher: Edwin Hauwert (ref: 219252713)

## License

Educational use. Non-profit first 5 years (2026-2031).

VirtualV Holding B.V. + Slakkenspoor VOF — April 2026

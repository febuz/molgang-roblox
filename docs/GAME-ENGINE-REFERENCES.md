# Game Engine References: Open Source Code to Study & Build From

**Purpose:** Reference engines for building the MOLGANG web-based Chemical Engineering Simulator
**Strategy:** Study Duke 3D (FPS movement), GTA Vice City (open world), Red Alert (factory/RTS) and build our own hybrid engine.

## Status: cloned

Local mirrors live on EDS2 (off the home volume — see EDS2 relocation policy):

```
/media/knight2/EDS2/reference-engines/
├── OpenRA      (GPL-3.0, github.com/OpenRA/OpenRA)
├── OpenSAGE    (LGPL-3.0, github.com/OpenSAGE/OpenSAGE)
└── eduke32     (GPL-2.0, voidpoint.io/terminx/eduke32)
```

`re3` is intentionally **not** mirrored — Take-Two filed a DMCA notice in
February 2021 and the legal status of forks is contested. For the same
study goals (open-world streaming, vehicle physics) use `OpenMW`. See the
README in the reference-engines directory for the full rationale.

Refresh with `git pull --depth=50` per repo. Don't push from here; fork
upstream if you want to contribute.

---

## 1. Open Source Engines to Clone & Study

### 1.1 Duke Nukem 3D — Build Engine (FPS Movement & Level Design)

**Why:** First-person exploration of chemical plants. Duke's Build engine pioneered sector-based 3D that's lightweight enough for web.

```bash
# EDuke32 - modern Duke 3D source port (GPL2)
git clone https://voidpoint.io/terminx/eduke32.git
# Or the JS port:
git clone https://github.com/nickolasburr/build-engine-js.git

# WebBuild - Build engine in JavaScript/WebGL
git clone https://github.com/nickolasburr/build-engine-wasm.git
```

**Key code to study:**
- `source/build/src/engine.c` — Sector rendering, portal engine
- `source/build/src/polymost.c` — 3D polygon renderer
- `source/duke3d/src/player.c` — Player movement, collision
- `source/duke3d/src/sector.c` — Sector interaction (doors, elevators)

**What we take:** First-person camera, sector-based indoor rendering (chemical plant interiors), elevator mechanics (distillation column floors), door interactions.

### 1.2 GTA Vice City — re3 (Open World, Third Person, Vehicles)

**Why:** Third-person character in an open world chemical campus. Walk between buildings, drive carts between zones.

```bash
# re3 - reverse-engineered GTA III/Vice City engine (research)
# Note: Requires original game assets. Code is educational reference only.
# The project was DMCA'd from GitHub but mirrors exist for study:
git clone https://github.com/AlasdairWilkins/re3.git  # if available
# Alternative: OpenMW (similar open-world engine, GPL)
git clone https://github.com/OpenMW/openmw.git
```

**Key code to study:**
- `src/core/Camera.cpp` — Third-person camera follow
- `src/core/PlayerPed.cpp` — Character controller (walk, run, sprint)
- `src/core/World.cpp` — Open world streaming, LOD
- `src/core/Collision.cpp` — Physics collision system
- `src/vehicles/Vehicle.cpp` — Vehicle driving mechanics

**What we take:** Third-person camera (GTA-style follow cam), character animation states (idle/walk/run/sprint), open world zone streaming, vehicle mechanics (for driving lab carts between zones).

### 1.3 Red Alert — OpenRA (Factory Building, RTS Production)

**Why:** Factory gameplay for fertilizer production. Build facilities, manage production chains, resource gathering — all core MOLGANG mechanics.

```bash
# OpenRA - open source Command & Conquer / Red Alert engine (GPL3)
git clone https://github.com/OpenRA/OpenRA.git

# Also: 0 A.D. (open source RTS, GPL2)
git clone https://github.com/0ad/0ad.git
```

**Key code to study:**
- `OpenRA.Mods.Common/Traits/Production/` — Production queue system
- `OpenRA.Mods.Common/Traits/Buildings/` — Building placement & construction
- `OpenRA.Mods.Common/Traits/Economy/` — Resource harvesting & spending
- `OpenRA.Mods.Common/Traits/World/` — Map/terrain management
- `OpenRA.Game/Orders/` — Player command system

**What we take:** Production queue (atom → molecule → fertilizer pipeline), building placement (factory/lab construction), resource economy (MolCoin harvesting), research tree (unlocking molecule recipes).

---

## 2. Our Hybrid Engine Architecture

Combining the three:

```
MOLGANG Engine = Duke3D (indoor FPS) + GTA (open world TPS) + Red Alert (factory RTS)

┌─────────────────────────────────────────────────────────────┐
│                    MOLGANG Hybrid Engine                      │
├──────────┬──────────────┬────────────────────────────────────┤
│  MODE 1  │   MODE 2     │         MODE 3                     │
│  EXPLORE │   BUILD      │         MANAGE                     │
│          │              │                                    │
│ GTA-style│ Red Alert    │   Dashboard/Overview               │
│ 3rd pers │ RTS factory  │   (Current VirtualPC)              │
│ walk/run │ drag-n-drop  │                                    │
│ interact │ production   │   Agent management                 │
│ collect  │ research     │   Economy monitoring               │
│          │              │   Leaderboards                     │
│ Duke3D   │ Resource     │                                    │
│ interiors│ management   │                                    │
│ for labs │ NPK mixing   │                                    │
├──────────┴──────────────┴────────────────────────────────────┤
│                     Shared Systems                            │
│  ┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────────┐│
│  │Physics │ │Chemistry│ │ Economy  │ │ Web3 Token Engine  ││
│  │Collider│ │Simulator│ │ $MOL     │ │ $MOL + MOLCO2      ││
│  └────────┘ └─────────┘ └──────────┘ └────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Renderer: Three.js + WebGPU (outdoor) / Raycaster (indoor) │
│  Audio: Tone.js (3D spatial)                                 │
│  Network: Socket.io (multiplayer)                            │
│  State: Zustand (client) + PostgreSQL (server)               │
└─────────────────────────────────────────────────────────────┘
```

### Mode switching:

| Action | Engine Mode | Camera | Reference |
|--------|------------|--------|-----------|
| Walking campus | GTA mode | 3rd person follow | re3 PlayerPed |
| Entering building | Duke3D mode | 1st person | Build engine sectors |
| Factory management | RTS mode | Top-down isometric | OpenRA production |
| Lab experiments | FPS mode | 1st person + HUD | Duke3D + custom |
| Market/Dashboard | UI mode | None (2D overlay) | VirtualPC dashboard |

---

## 3. Repository Setup for Engine Study

```bash
# Create engine-references directory
mkdir -p /home/knight2/engine-references
cd /home/knight2/engine-references

# Clone reference engines
git clone https://github.com/nickolasburr/build-engine-js.git duke3d-web
git clone https://github.com/OpenRA/OpenRA.git openra
git clone https://github.com/OpenMW/openmw.git openmw-openworld

# Our custom engine (builds on Three.js base)
mkdir molgang-engine
cd molgang-engine
npm init -y
npm install three@latest @types/three zustand
```

---

## 4. Implementation Roadmap

### Phase 1: GTA-Style Open World (Current - game3d.html)
- ✅ Three.js scene with buildings
- ✅ Third-person character controller (WASD + mouse)
- ✅ NPC interaction system
- ✅ Atom collection (walk near to collect)
- ✅ Building interaction (E key)
- ✅ Minimap
- ✅ Web3 wallet ($MOL token)
- TODO: Character animations (idle/walk/run)
- TODO: Day/night cycle
- TODO: Vehicle (lab cart)

### Phase 2: Duke3D Indoor Exploration
- Build sector-based indoor renderer for lab interiors
- First-person camera when entering buildings
- Interactive equipment (click distillation column, reactor)
- Lab puzzles (connect pipes, control temperature)

### Phase 3: Red Alert Factory Mode
- Top-down isometric view for factory management
- Drag-and-drop building placement
- Production queue system (atom→molecule→fertilizer)
- Research tree (unlock recipes, equipment upgrades)
- Worker assignment (send atoms to specific production lines)

### Phase 4: Multiplayer
- Socket.io real-time sync
- See other players walking campus
- Cooperative lab experiments
- Competitive market trading
- Tournament arena (PvP chemistry challenges)

---

## 5. Web3 Token Architecture ($MOL)

```
$MOL Token Economy:
  - ERC-20 compatible token concept (web3.js integration planned)
  - Currently: server-side balance tracking
  - Future: Polygon/Base L2 deployment for real token economy

Token Flow:
  Collect atoms → Synthesize molecules → Earn $MOL
       ↓                                      ↓
  Produce fertilizer → Sell on market → More $MOL
       ↓                                      ↓
  Convert $MOL → MOLCO2 Carbon Credits → Real-world value
       ↓
  Spend $MOL → Unlock advanced labs, cosmetics, research
```

Carbon Credits (MOLCO2):
- 100 $MOL → 1 MOLCO2 carbon credit
- Carbon credits represent verified educational achievement
- Future: tradeable NFTs representing ChemE certifications

---

## 6. Files in Repository

| File | Description |
|------|-------------|
| `/public/game3d.html` | 3D open world game (GTA-style, Three.js) |
| `/public/game.html` | 2D hub game (zone-based, original) |
| `/docs/CHEMICAL-ENGINEERING-GAME-ENGINE.md` | Ideal engine architecture |
| `/docs/GAME-ENGINE-REFERENCES.md` | This document |
| `/docs/VIRTUALPC-ARCHITECTURE.md` | Full system architecture |
| `/docs/ENGINEER-SETUP-GUIDE.md` | New engineer onboarding |

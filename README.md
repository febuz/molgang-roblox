# MOLGANG: The Molecular Chain

**Educational Roblox game about chemistry, blockchain simulation, and cooperative economics.**

Built by [VirtualV Holding B.V.](https://github.com/febuz) + Slakkenspoor VOF

---

## What is MOLGANG?

MOLGANG is a free educational game where players:
- **Collect all 118 elements** of the periodic table across 6 unique zones
- **Build molecules** using real chemistry rules (H2O, V2O5, CaCO3, etc.)
- **Register molecules on MolChain** — a simulated XRPL blockchain
- **Lend & borrow MolCoins** via ANK cooperative (120% collateral, 5% interest)
- **Catch Quantum Dots** — superheavy elements with 10-second catch windows
- **Take quizzes** — 500+ chemistry questions for bonus MolCoins

Non-profit for the first 5 years. All Robux revenue goes to educational prize pools.

## Architecture

```
MOLGANG/
├── game/
│   ├── default.project.json          # Rojo 7.4.4 project config
│   └── src/
│       ├── ServerScriptService/Core/  # 12 server scripts
│       │   ├── AtomSpawner.server.lua     # Weighted spawn across 6 zones
│       │   ├── ChainRegistry.server.lua   # XRPL blockchain simulation
│       │   ├── ANKLending.server.lua      # Cooperative lending (real transfers)
│       │   ├── EconomyManager.server.lua  # MolCoin economy + data persistence
│       │   ├── Leaderboards.server.lua    # 4-category OrderedDataStore
│       │   ├── MaterialManager.server.lua # PBR materials across all 6 zones
│       │   ├── NPCSystem.server.lua       # 12 chemistry NPCs + trust system
│       │   ├── QuantumDots.server.lua     # Superheavy element spawns
│       │   ├── QRBridge.server.lua        # Roblox ↔ Web Game QR session bridge
│       │   ├── QuizSystem.server.lua      # 500+ educational questions
│       │   ├── SlakkenspoorMiniGame.server.lua # HGMS + pH puzzle mini-games
│       │   ├── WorldBuilder.server.lua    # 6 zones, 4000x4000 studs
│       │   └── PlayerDataBridge.lua       # Secure server-only data bridge
│       ├── StarterPlayerScripts/      # 6 client scripts
│       │   ├── AtomCollector.client.lua   # Proximity detection + anti-cheat
│       │   ├── CharacterController.client.lua # Momentum + head tracking + foot IK
│       │   ├── GUIManager.client.lua      # Shortcuts, audio, zone music
│       │   ├── HUDController.client.lua   # Full HUD + mobile buttons
│       │   ├── InteractionSystem.client.lua   # Raycast highlight + inspect + grab
│       │   └── NPCDialogueClient.client.lua   # NPC speech bubbles + trust UI
│       ├── StarterGui/                # 4 GUI scripts
│       │   ├── MiniGameGui.client.lua     # Slakkenspoor mini-game overlay
│       │   ├── PeriodicTableGui.client.lua # 118-element interactive table
│       │   ├── QRBridgeGui.client.lua     # QR panel for web game link
│       │   └── WalletGui.client.lua       # MolWallet + ChainExplorer
│       ├── ReplicatedStorage/         # Shared data & modules
│       │   ├── Data/Elements.lua          # All 118 elements (real data)
│       │   ├── Data/DataTemplate.lua      # Player data schema
│       │   ├── Modules/Chemistry.lua      # 30+ molecule recipes
│       │   └── Remotes/RemoteSetup.lua    # Client-server event map
│       ├── Lighting/                  # Post-processing (Bloom, Atmosphere)
│       └── SoundService/              # Zone-based ambient audio
```

## Architecture (Full Stack)

```
MOLGANG/
├── game/              Roblox game (29 Luau scripts, Rojo 7.4.4)
├── bridge/            Cloudflare Worker — QR/JWT session bridge
│   └── src/worker.ts  POST /v1/generate-qr, /v1/verify-session
└── web-game/          Three.js HD renderer (Vite 6, TypeScript)
    └── src/           Scenes, renderer, HUD, join flow
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Game Engine | Roblox (Luau) |
| Build Tool | Rojo 7.4.4 |
| Web Renderer | Three.js r168, WebGL2 (WebGPU-ready) |
| Web Bundler | Vite 6 + TypeScript |
| Edge API | Cloudflare Workers + KV + R2 |
| Auth | HS256 JWT (Web Crypto API, no library) |
| DataStore | ProfileService pattern + OrderedDataStore |
| Blockchain | XRPL (simulation) + Hedera Mirror Node API |
| Security | Server-side validation, PlayerDataBridge, rate limiting |
| Platform | Linux (Ubuntu 24.04, Flatpak Roblox Studio via Vinegar) |
| GPU | 2x NVIDIA RTX 3090 (rendering + Studio) |
| CI/CD | Trunk-based dev (main + dev), auto-review agent |

## Stats

- **29 Luau scripts**, ~13,600 lines of code
- **118 elements** with real atomic masses, facts, and group colors
- **30+ molecules** with validated chemistry rules
- **6 game zones** across 4000x4000 studs floating archipelago
- **500+ quiz questions** generated from real chemistry data
- **4 leaderboard categories** with global rankings
- **12 NPCs** with chemistry expertise and trust system
- **2 Slakkenspoor mini-games**: HGMS sorter + pH puzzle

## Security Model

- All economy calculations on server (golden rule: never trust client)
- `PlayerDataBridge` module prevents client Attribute spoofing
- Atom collection rate limited (20/min) with distance validation (30 studs)
- Molecule build cooldown (2 sec) with server-side inventory check
- ANK loans validated: collateral checked, balances verified before transfer

## Build & Run

```bash
# Roblox game
cd game && /path/to/rojo build -o MOLGANG.rbxl

# Bridge Worker (local dev)
cd bridge && npm install && npm run dev
# Deploy: npm run deploy (requires wrangler auth + secrets)

# Web Game (local dev)
cd web-game && npm install && npm run dev
# Visit: http://localhost:5173
```

## Zones

| Zone | Location | Theme |
|------|----------|-------|
| Molgang Nexus Hub | Center (0,0) | Spawn, tutorials, MolChain Tower, ANK |
| Periodic Table Biome | North (+2000) | 118 element islands, quiz pillars |
| Quantum Lab | East (+2000) | Cryogenic, quantum dots, neon purple |
| Slakkenspoor Fabriek | West (-2000) | Industrial, BOF slag, HGMS separator |
| MolChain Tower | Center-East | 200-stud DNA helix, chain explorer |
| ANK Kredietunie | Center-West | Glass bank, vault, cooperative loans |

## Team Roles (VirtualV / Slag B.V.)

| Role | Scope | Rate |
|------|-------|------|
| Frontend / 3D Dev | Three.js, WebGPU, shaders, Roblox | EUR 65-85/hr |
| Backend Dev | Cloudflare Workers, Node.js, APIs | EUR 55-70/hr |
| Blockchain Dev | XRPL, Hedera SDK, smart contracts | EUR 75-95/hr |
| 3D Artist | Blender, PBR materials, GLSL | EUR 50-65/hr |

## License

Educational use. Non-profit first 5 years (2026-2031).

VirtualV Holding B.V. + Slakkenspoor VOF -- April 2026

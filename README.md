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
│       ├── ServerScriptService/Core/  # 8 server scripts
│       │   ├── AtomSpawner.server.lua     # Weighted spawn across 6 zones
│       │   ├── ChainRegistry.server.lua   # XRPL blockchain simulation
│       │   ├── ANKLending.server.lua      # Cooperative lending (real transfers)
│       │   ├── EconomyManager.server.lua  # MolCoin economy + data persistence
│       │   ├── Leaderboards.server.lua    # 4-category OrderedDataStore
│       │   ├── QuantumDots.server.lua     # Superheavy element spawns
│       │   ├── QuizSystem.server.lua      # 500+ educational questions
│       │   ├── WorldBuilder.server.lua    # 6 zones, 4000x4000 studs
│       │   └── PlayerDataBridge.lua       # Secure server-only data bridge
│       ├── StarterPlayerScripts/      # 3 client scripts
│       │   ├── AtomCollector.client.lua   # Proximity detection + anti-cheat
│       │   ├── HUDController.client.lua   # Full HUD + mobile buttons
│       │   └── GUIManager.client.lua      # Shortcuts, audio, zone music
│       ├── StarterGui/                # 2 GUI scripts
│       │   ├── PeriodicTableGui.client.lua # 118-element interactive table
│       │   └── WalletGui.client.lua       # MolWallet + ChainExplorer
│       ├── ReplicatedStorage/         # Shared data & modules
│       │   ├── Data/Elements.lua          # All 118 elements (real data)
│       │   ├── Data/DataTemplate.lua      # Player data schema
│       │   ├── Modules/Chemistry.lua      # 30+ molecule recipes
│       │   └── Remotes/RemoteSetup.lua    # Client-server event map
│       ├── Lighting/                  # Post-processing (Bloom, Atmosphere)
│       └── SoundService/              # Zone-based ambient audio
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Game Engine | Roblox (Luau) |
| Build Tool | Rojo 7.4.4 |
| DataStore | ProfileService pattern + OrderedDataStore |
| Security | Server-side validation, PlayerDataBridge, rate limiting |
| Platform | Linux (Ubuntu 24.04, Flatpak Roblox Studio via Vinegar) |
| GPU | 2x NVIDIA RTX 3090 (rendering + Studio) |
| CI/CD | Trunk-based dev (main + dev), auto-review agent |

## Stats

- **20 Luau scripts**, ~9500 lines of code
- **118 elements** with real atomic masses, facts, and group colors
- **30+ molecules** with validated chemistry rules
- **6 game zones** across 4000x4000 studs floating archipelago
- **500+ quiz questions** generated from real chemistry data
- **4 leaderboard categories** with global rankings

## Security Model

- All economy calculations on server (golden rule: never trust client)
- `PlayerDataBridge` module prevents client Attribute spoofing
- Atom collection rate limited (20/min) with distance validation (30 studs)
- Molecule build cooldown (2 sec) with server-side inventory check
- ANK loans validated: collateral checked, balances verified before transfer

## Build & Run

```bash
# Build .rbxl file
cd game
/path/to/rojo build -o MOLGANG.rbxl

# Or serve live to Roblox Studio
/path/to/rojo serve
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

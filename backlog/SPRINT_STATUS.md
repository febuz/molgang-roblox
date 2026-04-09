# MOLGANG Sprint Status — 2026-04-07

## Overall Progress

**Roblox Game:** 29 scripts, ~13,600 LOC, 173KB .rbxl (builds clean with Rojo 7.4.4)  
**Bridge Worker:** 7 TypeScript files, 10/10 tests pass  
**Web Game:** 12 TypeScript files, Three.js + Vite, runs at localhost:5173  

---

## COMPLETED TICKETS

### ROBLOX-01 ✅ Core game scripts (Phase 1 Foundation)
- AtomSpawner.server.lua — weighted spawn across 6 zones
- ChainRegistry.server.lua — XRPL blockchain simulation
- ANKLending.server.lua — cooperative lending (real transfers)
- EconomyManager.server.lua — MolCoin economy + data persistence
- Leaderboards.server.lua — 4-category OrderedDataStore
- QuantumDots.server.lua — superheavy element spawns
- QuizSystem.server.lua — 500+ educational questions
- WorldBuilder.server.lua — 6 zones, 4000x4000 studs
- PlayerDataBridge.lua — secure server-only data bridge

### ROBLOX-02 ✅ Client HUD & GUI scripts
- HUDController.client.lua — full HUD + mobile buttons
- AtomCollector.client.lua — proximity detect + anti-cheat (12 studs, 20/min)
- GUIManager.client.lua — shortcuts, audio, zone music
- PeriodicTableGui.client.lua — 118-element interactive table
- WalletGui.client.lua — MolWallet + ChainExplorer (4 tabs)

### ROBLOX-03 ✅ NPC System
- NPCSystem.server.lua — 12 chemistry NPCs, trust system, proximity dialogue
- NPCDialogueClient.client.lua — speech bubbles, trust indicator, typewriter effect
- 12 NPCs: Prof. Avogadro, Agent Mache, Direk Vanadis, Ana Stikstra, Dr. Kwantje,
  Ank Koopman, Prof. Femke, Marktkoopman Yusuf, Quantum Pete, Boris Slag,
  Element Ghost, Mol Mentor

### ROBLOX-04 ✅ Slakkenspoor Mini-Games
- SlakkenspoorMiniGame.server.lua — HGMS separator + pH puzzle
- MiniGameGui.client.lua — real-time game overlay with conveyor belt display

### ROBLOX-05 ✅ Phase 1 Polish (this session)
- MaterialManager.server.lua — PBR materials across all 6 zones
- CharacterController.client.lua — momentum + head tracking + foot IK
- InteractionSystem.client.lua — raycast highlight + inspect + grab
- QRBridge.server.lua — Roblox ↔ Web Game QR session bridge
- QRBridgeGui.client.lua — QR panel with countdown timer
- RemoteSetup.lua updated: ShowQR, RequestQR, GrabObject events added

### BRIDGE-01 ✅ Cloudflare Worker bridge (bridge/)
- worker.ts — POST /v1/generate-qr, /v1/verify-session, GET /qr/:key
- jwt.ts — HS256 JWT via Web Crypto API (no library)
- qr.ts — QR code generation (via qrserver.com API)
- hedera.ts — Hedera Mirror Node API (NFT verify, HTS balance)
- types.ts — shared TypeScript types
- tests/worker.test.ts — 10/10 tests pass
- wrangler.toml — KV + R2 + secrets configured

### WEB-01 ✅ Three.js Web Game (web-game/)
- main.ts — boot, session load, render loop
- renderer/setup.ts — WebGL2 renderer, ACESFilmic, PCFSoft shadows, post-processing
- renderer/environment.ts — HDR env maps + procedural sky fallback
- scenes/NexusScene.ts — full Nexus Hub 3D world (platform, tower, ANK, plaza)
- scenes/PeriodicTableScene.ts — 118 element islands with physics
- ui/HUD.ts — zone label, balance, inventory slots, FPS stats
- ui/CharacterSelect.ts — 3 classes: Mol Chemist, Quantum Rider, Slag Engineer
- ui/InteractionMenu.ts — E/F/Q/B/R keyboard interactions
- ui/InventoryTransferOverlay.ts — Roblox→Web inventory handoff screen
- join.ts — QR token verification + session setup
- **LIVE at localhost:5173** (Vite dev server running)

---

## OPEN TICKETS (Backlog)

### ROBLOX-06 🔴 CRITICAL: Fix Molecule Builder — missing build button FireServer
**Problem:** HUDController has molecule builder slots UI but NO `RequestBuildMolecule.FireServer` call.
Players can see slot UI but cannot actually trigger a build.
**Fix needed:** Add build button to builderFrame that collects slotted atoms and fires RequestBuildMolecule.
**File:** game/src/StarterPlayerScripts/HUDController.client.lua ~line 347
**Est:** 1-2 hours

### ROBLOX-07 🟡 Chain Register button in HUD
**Problem:** WalletGui shows chain entries but no direct "Register Molecule" button in main HUD.
Players must open WalletGui to register. Should be accessible via HUD shortcut.
**Fix needed:** Add chain register button (or molecule build confirmation auto-triggers chain register).
**File:** game/src/StarterPlayerScripts/HUDController.client.lua

### ROBLOX-08 🟡 Tutorial / Onboarding NPC dialogue
**Problem:** No tutorial flow for new players. First spawn has no guidance.
**Fix needed:** Prof. Avogadro NPC fires initial dialogue on spawn with quest steps:
  1. "Collect H atoms near here" → points to nearest atom
  2. "Combine 2H + O to make H2O" → highlights builder
  3. "Register H2O on MolChain" → opens ChainExplorer
**File:** New script or add to NPCSystem.server.lua

### ROBLOX-09 🟡 Zone traversal bridges
**Problem:** WorldBuilder builds zone islands but bridges between zones may not be navigable.
**Fix needed:** Verify bridge collision and walkability in Studio. Add teleport pads as backup.
**File:** game/src/ServerScriptService/Core/WorldBuilder.server.lua

### ROBLOX-10 🟡 MOLCO2 / carbon credit earn loop
**From CRYPTOS doc:** Players earn MOLCO2 tokens when registering CO₂-related molecules
(CaCO3, CO2, etc). Currently EconomyManager only tracks MolCoins.
**Fix needed:** Add MOLCO2 token tracking to DataTemplate + EconomyManager.
Reactions to reward: CaO+CO₂→CaCO₃, 6CO₂+6H₂O→C₆H₁₂O₆, etc.

### ROBLOX-11 🟢 39 Reactions (currently ~30)
**From CRYPTOS doc:** Game should have exactly 39 reactions/molecules.
Chemistry.lua currently has ~30. Need to add 9 more:
- Zone-specific: V₂O₅ precipitation, TiO₂ separation, quantum dot synthesis,
  Si-K biostimulant, N₂ fixation, NH₄NO₃ decomposition, QPU gate operation,
  Si-Mg alloy, Fe₃O₄ magnetic

### BRIDGE-02 🟢 Deploy to bridge.molgang.app
**Action needed:** Register molgang.app domain, create Cloudflare account, run:
  cd bridge && wrangler secret put JWT_SECRET
                wrangler secret put ROBLOX_API_SECRET
                npm run deploy

### WEB-02 🟡 Character 3D model in web game
**From design doc:** GLTFLoader with 3 LOD levels. Currently using procedural geometry only.
**Fix needed:** Character mesh + animations. Can use placeholder low-poly GLTF for now.

### WEB-03 🟢 Quantum Circuit mini-game (web)
**From user feedback:** Need quantum circuit path in web game experience.
**Design:** Grid-based quantum gate puzzle. Place H/X/CNOT gates to reach target state.
Connected to Quantum Rider character path unlock at Level 3.

### WEB-04 🟢 Periodic Table Scene in web game
**Status:** PeriodicTableScene.ts written but not connected to main.ts zone switching.
**Fix needed:** Add zone selector in HUD to switch between NexusScene and PeriodicTableScene.

---

## KNOWN ISSUES

1. **Vinegar/Studio launch:** `WINEDEBUG=-all` flag required to prevent Vulkan panic.
   Launch command: `DISPLAY=:0 WINEDEBUG=-all flatpak run org.vinegarhq.Vinegar studio ~/MOLGANG.rbxl`

2. **Web game FPS low in dev:** ~7 FPS in browser during heavy system load (Studio + LM Studio running).
   Expected ~60 FPS on clean system.

3. **HUDController uses WaitForChild on Remotes folder directly** (line 32-38) instead of using 
   the RemoteSetup module. Could cause timing issues if scripts load in wrong order.

---

## BUILD COMMANDS

```bash
# Roblox
cd /media/knight2/EDS2/projects/roblox_molgang/game
/media/knight2/EDS2/projects/nexus-game/rojo build -o ../MOLGANG.rbxl

# Bridge worker tests
cd /media/knight2/EDS2/projects/roblox_molgang/bridge
npm test

# Web game
cd /media/knight2/EDS2/projects/roblox_molgang/web-game
npm run dev  # localhost:5173
```

# MOLGANG Sprint Status — 2026-04-09 (Extended Session)

## 🎮 GAME NOW FULLY PLAYABLE (MVP Complete)

**Session Summary (2026-04-09):**
- ✅ Core gameplay loop fully functional
- ✅ Complete resource → crafting → reward cycle
- ✅ Autonomous production system (facilities)
- ✅ Dynamic economy (market trading)
- ✅ New player guidance (tutorial)
- ✅ Interactive NPCs (dialogue system)
- ✅ Leaderboards & competition
- ✅ Central dashboard for navigation

**Before This Session:**
- Game was UI-only (buttons but no gameplay)
- Molecule builder broken (data format mismatch)
- No way to earn passive income
- No guidance for new players

**After This Session:**
- **Fully Playable Loop:** Collect atoms → Craft molecules → Earn coins → Build facilities → Produce automatically
- **4 Major Features Added:** Facilities, Market, Tutorial, NPC Interaction
- **4 UI Systems Added:** LeaderboardGui, MarketGui, DashboardMenu, FacilityBuilder
- **Complete Economics:** Player can sustain gameplay through multiple income streams

---

## Overall Progress

**Roblox Game:** 35+ scripts, ~17,000 LOC, 185KB .rbxl (builds clean with Rojo 7.4.4)  
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

## RESOLVED TICKETS (Extended Session - 2026-04-09)

### Core Gameplay (Critical Path)

**ROBLOX-06 ✅ CRITICAL: Molecule Builder data format fix**
- Fixed: builderQueue → atomMap conversion before RequestBuildMolecule
- Inventory now shows element symbols (H, O, C, Fe) instead of numbers
- Slots clickable to add atoms to builder
- MoleculeBuilt event payload now correct (moleculeName, formula, molCoinsEarned)

**ROBLOX-14 ✅ Production Loop (Facility System)**
- Integrated facility building into EconomyManager
- 4 facility types: Mine (500💰), Factory (1000💰), Lab (2000💰), Office (300💰)
- Autonomous production every 15-30 sec based on facility type
- Mines generate random atoms, Factories/Labs generate molecules
- Office generates passive MolCoins
- Server-side production runs independently, updates player inventory

**ROBLOX-15 ✅ Factory Placement System**
- FacilityBuilder.client.lua: D-key opens facility menu
- Ray-casting click-to-place in world
- Shows facility type, cost, and description before building
- Server validates cost, deducts MolCoins, spawns visual model
- FacilityBuilt event confirms to client
- Data persists in facilityList with position/type/level

**ROBLOX-17 ✅ Market Dynamics**
- MarketDynamics.server.lua: real-time price engine
- 8 tradeable commodities: H, O, C, N, Fe, H2O, CO2, H2SO4
- Prices calculated: base × supplyDemand × timeOscillation × noise
- Supply/demand factor: (buyers-sellers)/100 creates 0.5x-2.0x variance
- Time oscillation: sin(time/600) for daily price cycles
- MarketGui.client.lua: M-key shows live price ticker
- Price updates broadcast every 30 sec

**ROBLOX-08 ✅ Tutorial / Onboarding System**
- TutorialSystem.server.lua: 6-step new player progression
- Steps: Collect atoms → Inventory → Build molecule → Register → Facilities → Market
- Auto-advances when conditions met (5 atoms collected, 1 molecule built, etc.)
- ServerAnnounce events show tutorial hints
- Persists state (completed players skip tutorial on return)
- Integrated into EconomyManager post-build/facility checks

**ROBLOX-16 ✅ NPC Interaction (E-key)**
- NPCInteraction.client.lua: E-key press triggers dialogue
- Detects proximity via player.NearbyNPC attribute (set by server loop)
- RequestNPCInteract fired to server with NPC name
- Server validates, selects dialogue based on trust level (low/medium/high)
- NPCDialogue event fires with NPC name, text, trust level
- Client shows dialogue bubble with medal/color encoding trust
- Auto-dismiss after 5 seconds

### Additional Features

**Leaderboard UI ✅**
- LeaderboardGui.client.lua: L-key shows global rankings
- 4 competitive categories: MolCoins, Molecules, Atoms, ChainTokens
- Top 10 per category with medal indicators (🥇🥈🥉)
- Tabbed interface for easy category switching

**Dashboard Menu ✅**
- DashboardMenu.client.lua: ESC/SPACE opens central navigation
- Shows 4 player statistics (coins, atoms, molecules, facilities)
- Quick-access grid with 8 system links
- Hotkey reference for all game systems
- Reduces cognitive load for new players

### System Integration

**Data Persistence**
- Updated DataTemplate: facilities, facilityList, nextFacilityId
- Facility production integrated into autonomous production loop
- Tutorial state tracked per player

**Remote Events Added**
- RequestBuildFacility: {type, position}
- FacilityBuilt: {facilityId, type, position}
- MarketPricesUpdated: {symbol={current, base, history}}
- (NPCDialogue, RequestNPCInteract already existed)

## OPEN TICKETS (Remaining Work)

### ROBLOX-07 🟢 Chain Register button (Low Priority)
**Status:** Molecules auto-register via ChainRegistry on build
**Optional Enhancement:** Could add explicit register button in HUD for manual control
**Impact:** Nice-to-have, not blocking gameplay

### ROBLOX-09 🟡 Zone traversal bridges (QA Required)
**Status:** WorldBuilder creates 6 zones with bridges
**Action:** Test walkability in Roblox Studio; add teleport pads if needed
**Priority:** Before public testing

### ROBLOX-10 🟡 MOLCO2 / carbon credit system
**Status:** Not yet implemented
**Scope:** New token type for CO₂-related molecule registration
**Estimated effort:** 2-3 hours
**Next step:** Define CO₂-related molecules, add MOLCO2 field to DataTemplate

### ROBLOX-19 🟢 Player avatar customization
**Status:** Character appearance system not yet built
**Scope:** 3-5 character skins/appearances, customization UI
**Estimated effort:** 4-5 hours
**Priority:** Enhancement, not critical for playability

### ROBLOX-20 🟢 Sound effects & music
**Status:** Audio system not implemented
**Scope:** Ambient zone music, sfx for collection/building/trading
**Estimated effort:** 3-4 hours
**Priority:** Immersion enhancement, lower priority

### BRIDGE-02 🟢 Deploy bridge worker to production
**Status:** bridge/ folder has complete CloudFlare Worker implementation
**Scope:** Register domain, set up CF account, deploy
**Estimated effort:** 1 hour setup + DNS config
**Next:** Decide on domain strategy (bridge.molgang.app vs other)

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

---

## GAMEPLAY LOOP NOW FUNCTIONAL (as of commit 675d7b3)

### Complete Core Flow
1. ✅ Atoms spawn continuously in 6 zones (AtomSpawner every 10 sec)
2. ✅ Player walks near atom → auto-collects on proximity (12 studs)
3. ✅ Inventory displays atoms with element SYMBOLS (H, O, C, Fe)
4. ✅ Player clicks atom in inventory → added to builder queue
5. ✅ Player clicks BUILD button → validates chemistry recipe
6. ✅ Server deducts atoms from inventory → creates molecule
7. ✅ Server awards MolCoins (100-1300 depending on molecule)
8. ✅ Client shows "Molecule ✓ +100 MolCoins" popup
9. ✅ Wallet animates coin float effect
10. ✅ MolCoin balance updates on HUD display

**Status:** The game is NO LONGER UI-only. Players can now:
- Collect resources (atoms) by walking around
- See their inventory grow in real-time
- Craft molecules with visual feedback
- Earn rewards (MolCoins) that display with animations
- Progress and see results for their actions

### This Session's Commits
1. **fix(ROBLOX-06):** Molecule builder—convert atomic numbers to symbol map
2. **fix(Core gameplay):** Inventory UI, molecule build feedback, builder interaction
3. **fix(MoleculeBuilt):** Event data format—match client expectations

### Remaining for Full Playability
- ROBLOX-07: Chain register button (auto-registers on build, may not need UI)
- ROBLOX-08: Tutorial onboarding flow
- ROBLOX-09: Zone traversal bridges (already built, needs testing)
- ROBLOX-10: MOLCO2 token tracking (new feature)
- Facility building UI (mines, factories for advanced progression)

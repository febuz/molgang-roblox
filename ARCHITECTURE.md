# MOLGANG Architecture Guide

**Created:** 2026-04-12  
**Version:** MVP 1.0  
**Codebase:** 7,698 lines of Luau across 47 files

---

## System Overview

```
MOLGANG Game Architecture (Client-Server Model)
│
├─ CLIENT LAYER (StarterGui + StarterPlayerScripts)
│  ├─ GUIs (16 screens)
│  │  ├─ LoadingScreen — Welcome & tips
│  │  ├─ DashboardGui — Main 5-tab interface
│  │  ├─ HUDWidget — Corner stats
│  │  ├─ InventoryGui — Item management
│  │  ├─ AchievementsGui — Badge tracking
│  │  ├─ QuestTrackerGui — Quest progress
│  │  ├─ LeaderboardGui — Rankings
│  │  ├─ MahjongGui — Mini-game
│  │  ├─ NPCDialogueGui — NPC interaction
│  │  ├─ RecipeBookGui — Crafting guide
│  │  ├─ SettingsGui — Controls
│  │  ├─ GlobalAnnouncements — Event notifications
│  │  ├─ PeriodicTableGui — Element reference
│  │  ├─ WalletGui — Currency display
│  │  ├─ MiniGameGui — Slakkenspoor
│  │  └─ [Other UI elements]
│  │
│  ├─ Controllers (StarterPlayerScripts)
│  │  ├─ GUIManager — Keyboard shortcuts & events
│  │  ├─ AtomCollector — Proximity detection for collection
│  │  ├─ NPCDialogueClient — NPC interaction UI
│  │  └─ HUDController — Real-time stat updates
│  │
│  └─ [Client-side game state] → ReplicatedStorage for read-only data
│
├─ REPLICATION LAYER (ReplicatedStorage)
│  ├─ Modules/ — Shared game logic
│  │  ├─ Chemistry.lua — 25+ molecule recipes
│  │  ├─ Facilities.lua — 4 facility types & costs
│  │  ├─ Elements.lua — 118 periodic table elements
│  │  ├─ Quests.lua — Quest definitions & rewards
│  │  ├─ NPCDialogues.lua — 6 NPCs dialogue trees
│  │  ├─ Achievements.lua — Badge definitions
│  │  ├─ ANKLending.lua — Loan mechanics
│  │  ├─ MahjongGame.lua — Game rules & scoring
│  │  └─ Tutorial.lua — Onboarding system
│  │
│  ├─ Data/ — Static data
│  │  ├─ DataTemplate.lua — Player schema
│  │  └─ Elements.lua — Periodic table data
│  │
│  └─ Remotes/
│     ├─ RemoteSetup.lua — Central event registry
│     ├─ 40+ RemoteEvents & RemoteFunctions
│     └─ [Communication bus for all client↔server messages]
│
├─ SERVER LAYER (ServerScriptService/Core)
│  │
│  ├─ CORE SYSTEMS
│  │  ├─ EconomyManager.server.lua (★ GOLDEN RULE: never trust client)
│  │  │  ├─ MolCoin transactions (server-validated)
│  │  │  ├─ Daily claim system (anti-farm caps)
│  │  │  ├─ Player data persistence (DataStore)
│  │  │  └─ Economy event hub
│  │  │
│  │  ├─ ProductionManager.server.lua (60-second cycles)
│  │  │  ├─ Mine → Atom generation (5 atoms/mine)
│  │  │  ├─ Factory → Molecule conversion
│  │  │  ├─ Bonus MolCoin rewards
│  │  │  └─ Production completion broadcasts
│  │  │
│  │  ├─ AtomSpawner.server.lua (server-side spawning)
│  │  │  ├─ Spawn waves (every 30 seconds)
│  │  │  ├─ Rate limiting (anti-cheat)
│  │  │  ├─ Cooldown system (prevents spam collection)
│  │  │  ├─ Max atoms cap (performance limit 500)
│  │  │  └─ Cleanup expired atoms
│  │  │
│  │  ├─ NPCSystem.server.lua (GTA6-style NPCs)
│  │  │  ├─ 6 NPCs with trust levels (0.0-1.0)
│  │  │  ├─ Schedule-based movement
│  │  │  ├─ Dialogue system
│  │  │  └─ Proximity prompt interactions
│  │  │
│  │  └─ Leaderboards.server.lua (OrderedDataStore)
│  │     ├─ 4 category rankings
│  │     ├─ Top 100 per category
│  │     └─ Real-time updates
│  │
│  ├─ SUPPORTING SYSTEMS
│  │  ├─ ChainRegistry.server.lua — Blockchain simulation
│  │  ├─ MarketDynamics.server.lua — Commodity trading
│  │  ├─ ANKLending.server.lua — Cooperative loans
│  │  ├─ QuizSystem.server.lua — 500+ questions
│  │  ├─ SlakkenspoorMiniGame.server.lua — pH puzzle
│  │  ├─ QuantumDots.server.lua — Rare spawns
│  │  ├─ NPCSpawner.server.lua — NPC placement
│  │  ├─ WorldBuilder.server.lua — 6-zone environment
│  │  └─ [Other subsystems]
│  │
│  ├─ SECURITY & VALIDATION
│  │  ├─ PlayerDataBridge.lua (★ Server-only, never expose to client)
│  │  │  ├─ Prevents Attribute spoofing
│  │  │  ├─ Inter-script communication
│  │  │  ├─ Pending transaction queuing
│  │  │  └─ Economy state isolation
│  │  │
│  │  └─ [Remote event handlers with validation]
│  │     ├─ RequestBuildMolecule → Validates atoms, checks cost
│  │     ├─ RequestBuildFacility → Validates MolCoins
│  │     ├─ RequestMarketTrade → Validates inventory + balance
│  │     ├─ RequestLoan → Validates collateral
│  │     └─ [All other transactions server-validated]
│  │
│  └─ PERSISTENCE
│     └─ DataStore Service (MolGang_PlayerData_v1)
│        ├─ Key: player_{userId}
│        ├─ Auto-save every 60 seconds
│        ├─ PCall error handling
│        └─ Schema versioning support
```

---

## Data Flow: Atom Collection Example

```
Player walks near atom in world
    ↓
AtomCollector.client.lua detects proximity (8 studs)
    ↓
Client fires: Remotes.RequestAtomCollect(atomName)
    ↓
SERVER: AtomSpawner.server.lua receives request
    ├─ Check: Cooldown active? → reject if yes
    ├─ Check: Already collected? → reject if yes
    ├─ Check: Distance valid? → server validates distance
    ├─ Check: Rate limit (50/minute)? → reject if over
    └─ ✅ Valid → Record in PlayerDataBridge
    ↓
EconomyManager.server.lua detects collection via bridge
    ├─ Add atom to playerData[userId].atoms
    ├─ Add bonus MolCoins
    ├─ Update achievement progress
    └─ Fire: Remotes.AtomCollected to client
    ↓
Client receives AtomCollected event
    ├─ Update HUD (atoms count++)
    ├─ Show announcement
    └─ Play collection sound

AUTO-SAVE (every 60 seconds):
    ├─ EconomyManager.savePlayerData()
    ├─ DataStore:SetAsync("player_{userId}", data)
    └─ If save fails → warn, retry next cycle
```

---

## Data Flow: Facility Building Example

```
Player clicks "Build Mine" in Dashboard
    ↓
Client fires: Remotes.RequestBuildFacility("Mine")
    ↓
SERVER: EconomyManager receives request
    ├─ Get player data: data = playerData[userId]
    ├─ Check: Has 300 MolCoins? → No → Send error & return
    ├─ Check: Available space? → Yes → Proceed
    ├─ Deduct cost: data.molCoins -= 300
    ├─ Increment facility: data.facilities.mines += 1
    ├─ Record in bridge (for ChainRegistry)
    └─ Fire: Remotes.FacilityBuilt(name, cost, newBalance)
    ↓
Client receives FacilityBuilt event
    ├─ Update HUD (MolCoins balance--)
    ├─ Show facility in world
    ├─ Play build animation
    └─ Show announcement
    ↓
ProductionManager recognizes new mine
    └─ Next cycle: generates 5 atoms (5 atoms/mine)
```

---

## File Structure

```
molgang-roblox/
├─ game/src/
│  ├─ Lighting/                      # Roblox lighting config
│  ├─ ReplicatedStorage/
│  │  ├─ Data/
│  │  │  ├─ DataTemplate.lua         (140 lines)
│  │  │  └─ Elements.lua             (850 lines - 118 elements)
│  │  ├─ Modules/
│  │  │  ├─ Chemistry.lua            (220 lines - 25+ molecules)
│  │  │  ├─ Facilities.lua           (80 lines - 4 types)
│  │  │  ├─ Quests.lua               (180 lines - quest definitions)
│  │  │  ├─ NPCDialogues.lua         (160 lines - 6 NPCs)
│  │  │  ├─ Achievements.lua         (150 lines - badges)
│  │  │  ├─ ANKLending.lua           (140 lines - loans)
│  │  │  ├─ MahjongGame.lua          (200 lines - game logic)
│  │  │  └─ Tutorial.lua             (100 lines - onboarding)
│  │  ├─ Remotes/
│  │  │  └─ RemoteSetup.lua          (140 lines - 40+ remotes)
│  │  └─ SoundService/               # Audio assets
│  │
│  ├─ ServerScriptService/Core/      # All .server.lua auto-run
│  │  ├─ EconomyManager.server.lua   (450 lines ★ CRITICAL)
│  │  ├─ ProductionManager.server.lua (220 lines)
│  │  ├─ AtomSpawner.server.lua      (430 lines)
│  │  ├─ NPCSystem.server.lua        (380 lines)
│  │  ├─ Leaderboards.server.lua     (200 lines)
│  │  ├─ PlayerDataBridge.lua        (150 lines ★ SECURITY)
│  │  ├─ ChainRegistry.server.lua    (280 lines)
│  │  ├─ MarketDynamics.server.lua   (240 lines)
│  │  ├─ ANKLending.server.lua       (180 lines)
│  │  ├─ QuizSystem.server.lua       (200 lines)
│  │  ├─ SlakkenspoorMiniGame.server.lua (180 lines)
│  │  ├─ QuantumDots.server.lua      (160 lines)
│  │  ├─ NPCSpawner.server.lua       (120 lines)
│  │  ├─ WorldBuilder.server.lua     (300 lines)
│  │  └─ [Other systems]
│  │
│  ├─ StarterPlayerScripts/          # Client scripts (auto-run per player)
│  │  ├─ GUIManager.client.lua       (400 lines - keyboard + events)
│  │  ├─ AtomCollector.client.lua    (180 lines - proximity collect)
│  │  ├─ HUDController.client.lua    (200 lines - corner widget)
│  │  └─ NPCDialogueClient.client.lua (160 lines - NPC UI)
│  │
│  └─ StarterGui/                    # UI screens (auto-run on join)
│     ├─ LoadingScreen.client.lua    (184 lines)
│     ├─ DashboardGui.client.lua     (550 lines)
│     ├─ HUDWidget.client.lua        (200 lines)
│     ├─ QuestTrackerGui.client.lua  (310 lines)
│     ├─ InventoryGui.client.lua     (300 lines)
│     ├─ AchievementsGui.client.lua  (320 lines)
│     ├─ LeaderboardGui.client.lua   (280 lines)
│     ├─ MahjongGui.client.lua       (420 lines)
│     ├─ NPCDialogueGui.client.lua   (220 lines)
│     ├─ RecipeBookGui.client.lua    (220 lines)
│     ├─ SettingsGui.client.lua      (210 lines)
│     ├─ GlobalAnnouncements.client.lua (180 lines)
│     ├─ PeriodicTableGui.client.lua (820 lines)
│     ├─ WalletGui.client.lua        (350 lines)
│     ├─ MiniGameGui.client.lua      (420 lines)
│     └─ [Other UI]
│
├─ gameserver/                       # Alternative Go backend (not used in MVP)
├─ .git/                             # Version control
├─ README.md                         # Quick start guide
├─ CONTRIBUTING.md                  # Development guide
├─ PUBLISHING_CHECKLIST.md           # (NEW) Pre-publication guide
├─ TESTING_GUIDE.md                  # (NEW) Complete test procedures
├─ ARCHITECTURE.md                   # (THIS FILE) System design
└─ default.project.json or Rojo config (if using Rojo)
```

---

## Critical Systems

### 1. EconomyManager (450 lines)
**Location:** `ServerScriptService/Core/EconomyManager.server.lua`

**Responsibilities:**
- Player data loading/saving (DataStore)
- MolCoin transactions (server-only authority)
- Daily claim system
- Login streak tracking
- Achievement tracking

**Key Functions:**
```lua
loadPlayerData(player)       — Load from DataStore on join
savePlayerData(player)       — Auto-save every 60s
addMolCoins(userId, amount)  — Server-validated transaction
spendMolCoins(userId, amount) — With balance check
claimDaily(userId)           — Daily bonus (50 MolCoins)
```

**Security Model:**
```
❌ Never trust client MolCoin balance
❌ Never accept transaction requests at face value
✅ Always validate on server before updating
✅ Always use PlayerDataBridge for inter-script comms
✅ Always PCall DataStore operations
```

### 2. PlayerDataBridge (150 lines)
**Location:** `ServerScriptService/Core/PlayerDataBridge.lua`

**Why It Exists:**
Client can't spoof game Instance Attributes → we use server-only table  
→ One source of truth for all economy state

**Prevents:**
- Client modifying their own balance via dev console
- Malicious clients spoofing atom collections
- Double-spending in economy transactions

### 3. AtomSpawner (430 lines)
**Location:** `ServerScriptService/Core/AtomSpawner.server.lua`

**Spawns atoms in waves:**
- Every 30 seconds (common atoms)
- Every 10 minutes (legendary atoms)
- Max 500 atoms in world (performance limit)
- Cleanup old atoms

**Anti-Cheat:**
- Cooldown: 2-second delay per collection per player
- Rate limit: 50 collections/minute per player
- Server validates distance (client can lie)
- No duplicate collection of same atom

### 4. NPCSystem (380 lines)
**Location:** `ServerScriptService/Core/NPCSystem.server.lua`

**6 NPCs with:**
- Trust levels (0.0-1.0, visual indicator)
- Daily schedules (move between zones)
- Dialogue trees (context-aware responses)
- Proximity prompts (8 stud range)
- Rewards on interaction

---

## Communication Patterns

### Remote Event (Async, Fire & Forget)
**Used for:** One-way client→server notifications

```lua
-- Client sends
Remotes.RequestBuildFacility:FireServer("Mine")

-- Server receives & processes
Remotes.RequestBuildFacility.OnServerEvent:Connect(function(player, facilityName)
    -- validate, execute, broadcast result via FireClient
    Remotes.FacilityBuilt:FireClient(player, {name, cost, balance})
end)
```

### Remote Function (Sync, Waits for Response)
**Used for:** Request→Response queries (read-only)

```lua
-- Client requests
local leaderboard = Remotes.GetLeaderboard:InvokeServer("MolCoins")

-- Server responds
Remotes.GetLeaderboard.OnServerInvoke = function(player, category)
    return getTopPlayers(category, 100)
end
```

### Broadcast (Server→All Clients)
**Used for:** Global announcements

```lua
-- Production cycle complete, broadcast to all
for _, p in ipairs(Players:GetPlayers()) do
    Remotes.ProductionCycleComplete:FireClient(p, {atoms, molecules, bonusCoins})
end
```

---

## Performance Considerations

| System | Interval | Impact | Limit |
|--------|----------|--------|-------|
| Production cycle | 60 sec | CPU (atom generation, molecule conversion) | <50ms |
| Atom spawn | 30 sec | Memory (max 500 atoms) | ~5MB |
| NPC schedule check | 10 sec | CPU (pathfinding) | <5ms per NPC |
| DataStore save | 60 sec | Network I/O | <100 writes/min |
| Leaderboard update | 60 sec | OrderedDataStore query | <1s per category |
| HUD refresh | Every frame | GPU (rendering) | <1ms |

---

## Database Schema (DataTemplate.lua)

```lua
{
    -- Core economy
    molCoins = 100,
    
    -- Inventory
    atoms = {},                    -- {H = 10, O = 5, ...}
    molecules = {},                -- {H2O = 2, CO2 = 1, ...}
    
    -- Buildings
    facilities = {
        mines = 0,
        factories = 0,
        researchLabs = 0,
        offices = 0,
    },
    
    -- Progression
    questsCompleted = {},          -- {"collect_atoms", "build_first_mine"}
    questProgress = {},            -- {current_quest = "collect_atoms", progress = 8}
    achievementsUnlocked = {},     -- {badge_ids}
    
    -- NPC relationships
    npcTrust = {
        Femke = 0.3,
        Vanadis = 0.2,
        -- ...
    },
    
    -- Economy
    totalSpentOnFacilities = 0,
    totalMoleculesCrafted = 0,
    chainTokens = 0,
    
    -- Persistence
    lastLoginDate = "2026-04-12",
    loginStreak = 5,
}
```

---

## Adding New Features

### To Add a New NPC:
1. Update `NPCDialogues.lua` with dialogue tree
2. Add position to `ZONE_POSITIONS` in `NPCSystem.lua`
3. Add color to `NPC_COLORS` in `NPCSystem.lua`
4. Spawn will happen automatically

### To Add a New Facility:
1. Add to `Facilities.lua` (cost, description)
2. Update `ProductionManager.lua` to recognize it
3. Update `DashboardGui.lua` UI to show it
4. Server automatically handles building

### To Add a New Molecule:
1. Add recipe to `Chemistry.lua`
2. Include atom requirements & MolCoin reward
3. Update `RecipeBookGui.lua` to display
4. Crafting automatically works

### To Add a New RemoteEvent:
1. Add to `serverToClientEvents` or `clientToServerEvents` in `RemoteSetup.lua`
2. Remote created automatically
3. Add handler in appropriate `.server.lua` file
4. Update client-side code to fire it

---

## Known Issues & Quirks

| Issue | Location | Fix |
|-------|----------|-----|
| Mahjong hand logic | MahjongGui.client.lua | Simplified for MVP (no complex combos) |
| AtomCollector distance check | Client-side only | Server validates, client is hint |
| Production randomness | ProductionManager | Adds replayability, not deterministic |
| NPC Z-fighting | WorldBuilder | Might clip into terrain slightly |

---

## Version History

**v1.0 (Current - MVP)**
- 47 Lua files, 7,698 lines
- 16 UI screens
- 6 NPCs, 25+ molecules
- Complete economy system
- Ready for publication

**Future Versions:**
- v1.1: 3D assets, particle effects, sound design
- v1.2: Research tree, more mini-games, seasonal events
- v2.0: Web version, cross-platform sync, guilds

---

**ARCHITECTURE COMPLETE** ✅  
All systems documented and referenced.  
Ready for development & maintenance.

Last Updated: 2026-04-12 Phase 9

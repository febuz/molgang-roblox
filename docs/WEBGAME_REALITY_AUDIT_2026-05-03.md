# MOLGANG Webgame — Reality Audit & Deep Dive
**Date:** 2026-05-03  
**Auditor:** Kimi (CLI)  
**Scope:** virtualpc ↔ molgang-web ↔ molgang-roblox ecosystem

---

## Executive Summary

You are running **three projects** that are supposed to be one product:

| Project | What It Actually Is | Lines of Code | Reality Score |
|---------|---------------------|---------------|---------------|
| **molgang-roblox** | A real Roblox game with working BOF slag chemistry, economy, NPCs, 36 GUIs | ~42,600 Luau | **80% real** — playable prototype |
| **molgang-web** | A Next.js/FastAPI web port with Phaser.js frontend | ~3,500 (est.) | **25% real** — scaffold + 4 ported systems |
| **virtualpc** | Agent orchestration dashboard that *simulates* managing development | ~8,500 TS | **60% real** as devops tool, **5% real** as game backend |

**The core problem:** `virtualpc` thinks it is managing a webgame (task engine has "MOLGANG" milestones, dashboard shows MOLGANG stats), but the actual webgame (`molgang-web`) is missing the gameplay loop that makes it a *game* rather than a periodic table viewer with a crafting bench. Meanwhile, the Roblox version has that loop but is trapped on Roblox.

---

## 1. What Exists Where (The Honest Inventory)

### 1.1 molgang-web — The Webgame Port (Current State)

**Stack:** Next.js 15 + FastAPI + Phaser.js + Colyseus + shared JSON data layer

#### ✅ Actually Shipped (May 1-3)
| Feature | Evidence | Status |
|---------|----------|--------|
| Periodic Table | `/periodic-table` page, `shared/elements.json` (118 elements) | Working |
| Achievements | `/api/achievements/*`, 15 entries from Roblox | Working |
| Inventory | `/api/inventory/*`, `/inventory/[playerId]` | Working |
| Chemistry Bench | `/bench/[playerId]`, 10 recipes, SVG renderer | Working |
| Headless API | `/api/headless/*` (bot-key auth) | Working |
| Age Bands | kid/tween/teen/adult filtering | Working |
| Audio manifest | `/api/audio/*`, Sandrom placeholder | Structure only |

#### ❌ NOT Ported (Tier 1 — Core Gameplay)
| Feature | Roblox Source | Why It Matters |
|---------|---------------|----------------|
| **Quests** | `Quests.lua` + `QuestTrackerGui` | **The spine of the game.** Without quests, the player has no reason to craft molecules or collect atoms. |
| **Wallet/Economy** | `EconomyManager.server.lua` (669 lines) | No currency surface = no progression economy. Achievements track `molCoinsEarned` but there's nowhere to spend them. |
| **NPC Dialogue** | `NPCSystem` + `NPCDialogueGui` | No quest givers, no story, no educational arc. |
| **Research Tree** | `ResearchTree.lua` + `ResearchGui` | No tech gating = all recipes unlocked immediately. Removes discovery and long-term progression. |

#### ❌ NOT Ported (Tier 2-4)
- AtomTrade (P2P trading)
- Market Bidding
- Fertilizer Track (NPK production)
- Mining System
- Factory Builder (isometric placement)
- Mahjong, Bubble Tea minigames
- Steel Making / Slag Processing sub-track
- Guild system, Quantum Racing
- HUD, Minimap, Settings, Tutorial, Loading Screen

#### 🔴 Critical Infrastructure Gaps
| Gap | Impact |
|-----|--------|
| **No database** | All state (inventory, achievements, player progress) lives in process memory. Restart = total data loss. |
| **No quest system** | Player has no goals. The "game" is a sandbox with no objectives. |
| **No wallet** | Achievement rewards are tracked but not spendable. Economy loop is broken. |
| **No NPCs** | Educational content has no narrative delivery mechanism. |
| **No persistence tier** | Cannot support real players. |

### 1.2 molgang-roblox — The Source of Truth

This is the **real game**. It has:
- **Working economy** with DataStore persistence, daily claims, anti-cheat
- **12 quest storyline** across 3 acts
- **6 NPCs** with trust levels, schedules, dialogue trees
- **Full steel slag processing** (12 stations, Arrhenius kinetics, pH effects)
- **10 real NPK fertilizers** with soil testing
- **Factory builder** with 22 equipment types on a grid
- **Weather system** with server-side damage
- **Cantonese Mahjong** with AI
- **36 GUI screens**
- **48 FBX 3D models** generated via Blender Python
- **.rbxl place file** (520 KB) — actually playable

**The web port has ~5% of the Roblox feature set.**

### 1.3 virtualpc — The Agent Dashboard

**What it actually does well:**
- Runs 14 simulated AI agents that complete tasks every 60-90s
- Generates real artifacts via LM Studio/LiteLLM
- Serves live dashboards (`dashboard.html`, `agents.html`, `vitals.html`)
- Tracks commits, tokens, vitals
- Auto-updates from GitHub every 15 minutes

**What it pretends to do (mock/game stubs):**
- `/api/zones/*` — returns random numbers, no game state
- `/api/shop/*` — mock inventory, no real purchases
- `/api/battlepass/*` — mock 100-tier progression
- `/api/tournament/*` — mock PvP leaderboard
- `seasonal-events.ts` — in-memory only, hardcoded leaderboard
- Game milestone tracking — keyword-matches on task titles, not actual game progress

**The disconnect:** VirtualPC's task engine has MOLGANG roadmap items (MOLGANG-007), but completing a task like "Port QuestTrackerGui" in the agent simulation does **not** actually port the code. The agents generate text artifacts (design docs, code snippets) but do not write to `molgang-web/`.

---

## 2. Why It Feels "Far From Realistic"

### 2.1 The Agent Simulation Is Not The Product

VirtualPC's agents simulate development work, but:
- Their "code" artifacts are generated text files, not committed code
- The task engine measures progress by keyword matching, not feature completion
- The dashboard shows "MOLGANG 87% complete" based on task titles, not whether `/quests/[playerId]` exists

**Reality check:** The agent system is a **meta-development dashboard**, not a game development pipeline. It generates ideas and documents; it does not build the game.

### 2.2 The Webgame Has No Game Loop

A game needs:
1. **Goal** → Quests (missing)
2. **Action** → Crafting/collecting (partial — bench exists, but why craft?)
3. **Progression** → Wallet + research tree + achievements (achievements only)
4. **Feedback** → Rewards, unlocks, story (missing)

Right now, a player can:
- View the periodic table ✓
- Craft molecules on the bench ✓
- View achievements ✓
- ...and then do nothing else. There is no *reason* to keep playing.

### 2.3 The Two Games Are Not Synced

- `molgang-web` has its own `shared/elements.json` — synced from Roblox every 4 hours via routine
- But `molgang-web` does not use the Roblox economy, quest, or NPC systems
- The Go gameserver in `molgang-roblox/gameserver/` was built for a future Three.js client but is **not used**
- `virtualpc` has game APIs that neither `molgang-web` nor `molgang-roblox` consume

---

## 3. The Path to Reality (Prioritized)

### Phase 0: Stop the Illusion (This Week)

1. **Separate virtualpc's game stubs from reality**
   - Rename `/api/zones`, `/api/shop`, `/api/battlepass` to `/api/mock/zones`, etc.
   - Add a `?mock=1` flag or separate namespace so the dashboard doesn't confuse simulation data with real game data
   - Update `dashboard.html` MOLGANG card to show **actual molgang-web feature count** (e.g., "4/36 GUIs ported") instead of agent task completion percentage

2. **Fix the webgame's most critical gap: persistence**
   - Add SQLite or Postgres to `molgang-web/api/`
   - Move `shared/achievements.json`, player inventory, and quest state from in-memory to database
   - This is blocking for any real players

### Phase 1: Close the Gameplay Loop (2-3 Weeks)

These are the **minimum viable features** to make molgang-web a *game*:

| Priority | Feature | Source | Effort | Owner |
|----------|---------|--------|--------|-------|
| P0 | **Quest system** | `Quests.lua` + `QuestTrackerGui` | 2-3 days | Zip |
| P0 | **Wallet + MolCoin** | `EconomyManager.server.lua` | 1-2 days | Zip |
| P0 | **NPC dialogue** | `NPCSystem` + `NPCDialogueGui` | 2 days | Mira |
| P1 | **Research tree** | `ResearchTree.lua` | 2 days | Zip |
| P1 | **Fertilizer track** | `FertilizerTrack.lua` | 2 days | Zip |
| P2 | **Mining system** | `MiningSystem.lua` | 1-2 days | Zip |

**After Phase 1, the player has:**
- A reason to play (quests)
- A reward system (MolCoin)
- Progression gating (research tree)
- Educational narrative (NPCs)

This is the difference between a "web tool" and a "webgame."

### Phase 2: Economy + Multiplayer (3-4 Weeks)

- AtomTrade (P2P trading via Colyseus — Colyseus already runs on :2567)
- Market Bidding
- Factory Builder (isometric placement — largest UI rewrite)
- Multiplayer lobby/rooms

### Phase 3: Polish + Minigames (Ongoing)

- Mahjong, Bubble Tea, Quantum Racing
- Steel Making sub-track
- Settings, Tutorial, Loading Screen
- Mobile optimization

### Phase 4: The 3D Pivot (Optional, Scoped)

The user mentioned "GTA6-realistic." This is a **massive scope increase** that should be an explicit decision, not a gradual drift:

- **Honest assessment:** The current Phaser.js 2D arena cannot become "GTA6-realistic"
- **Option A:** Keep 2D Phaser, make it a great 2D game (realistic chemistry, not realistic graphics)
- **Option B:** Pivot to Three.js/Babylon.js 3D — this is a **rebuild**, not an upgrade. Estimate: 3-6 months for one developer.
- **Option C:** Hybrid — 2D for main gameplay, Three.js for molecule viewer only (already planned in MOLGANG-007)

**Recommendation:** Do Option A (complete the 2D game) before considering Option B. A complete 2D game is infinitely better than a half-built 3D one.

---

## 4. What virtualpc Should Actually Do

VirtualPC is valuable as a **development dashboard**, not a game backend. Redirect its energy:

### Keep Doing
- Agent task simulation for ideation and documentation
- Live dashboards for dev metrics (commits, builds, vitals)
- LLM artifact generation for design docs, code review, NPC dialogue writing
- Auto-update and deployment monitoring

### Stop Doing
- Mock game APIs that no client consumes
- Reporting "game progress" based on task titles instead of actual feature shipping
- Pretending the agent simulation is building the game

### Start Doing
- **Feature tracker:** Track actual molgang-web feature completion (e.g., "Quests endpoint: missing" vs "Quests endpoint: shipped")
- **Integration bridge:** Use virtualpc's LLM gateway to generate NPC dialogue, quest text, and chemistry descriptions that get committed to `molgang-web/shared/`
- **QA automation:** Use the headless API + Playwright to run smoke tests after each deploy
- **Asset pipeline:** Use the Blender Python scripts + GPU scheduler to batch-generate FBX → GLB for web

---

## 5. Immediate Actions (Next 48 Hours)

1. **Database for molgang-web**
   ```bash
   cd /media/knight2/EDS2/projects/molgang-web
   # Add SQLAlchemy + SQLite to api/
   # Migrate achievements, inventory, player state
   ```

2. **Port Quests.lua → JSON + endpoints**
   - Read `molgang-roblox/game/src/.../Quests.lua`
   - Extract 12 quests → `shared/quests.json`
   - Build `/api/quests/*` + `/quests/[playerId]` page
   - Hook to NPC dialogue and achievement tracker

3. **Port EconomyManager → Wallet endpoints**
   - Read `molgang-roblox/.../EconomyManager.server.lua`
   - Extract MolCoin logic → `/api/wallet/*`
   - Build `/wallet/[playerId]` page
   - Wire quest rewards → wallet credit

4. **Fix virtualpc dashboard honesty**
   - Update `public/dashboard.html` MOLGANG card to show real feature metrics from molgang-web git log/API
   - Add a "Feature Gap" view: Roblox features vs Web features

---

## 6. Bottom Line

**You do not have a webgame.** You have:
- A **real Roblox game** (molgang-roblox)
- A **partial web port** (molgang-web) missing the core gameplay loop
- A **sophisticated agent dashboard** (virtualpc) that simulates development but does not build the product

**To "nudge it to reality":**
1. Stop measuring agent task completion and start measuring **shipped features**
2. Port the **quest + wallet + NPC** systems from Roblox to web immediately
3. Add **database persistence** so progress survives restarts
4. Use virtualpc's LLM gateway for **content generation** (dialogue, quests, descriptions), not project management theater

The chemistry simulation in molgang-roblox is genuinely impressive. The web version needs that same substance, not more dashboards.

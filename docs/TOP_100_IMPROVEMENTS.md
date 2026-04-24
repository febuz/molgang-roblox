# MOLGANG — Top 100 Improvement List

**Generated:** 2026-04-24 (self-test audit)  
**Auditor:** Automated gameplay simulation + code review  
**Status:** Prioritized by impact (P0 = game-breaking, P1 = major, P2 = polish, P3 = nice-to-have)

---

## P0 — GAME-BREAKING (Fix Immediately)

| # | Issue | System | Details | Fix Effort |
|---|-------|--------|---------|------------|
| 1 | **Economy broken for new players** | Economy | Start: 100 MC, Mine: 5000 MC. No income without facilities. Soft-locked. | Reduce Mine to 500 MC or give 1000 MC start |
| 2 | **Tutorial Step 2 impossible** | Tutorial | "Build a Mine" requires 5000 MC but player has 100 MC | Fix tutorial order: collect atoms → build molecule → earn → build mine |
| 3 | **Slag/mining data not persisted** | DataStore | slagInventory, activeLeaches in DataTemplate but EconomyManager doesn't save them | Add slag fields to save/load in EconomyManager |
| 4 | **Mobile missing 14 shortcuts** | Mobile | Only 3 mobile buttons (PT, MC, MAP) out of 17+ systems | Add mobile button bar for S/F/G/C/T/V/X/B |
| 5 | **No early income path** | Economy | Player can't earn MC fast enough. Atom collection gives 0-10 MC per atom | Add "Starter Quest" giving 500 MC for collecting 5 atoms |

## P1 — MAJOR (Fix This Sprint)

| # | Issue | System | Details | Fix Effort |
|---|-------|--------|---------|------------|
| 6 | Settings missing X shortcut | SettingsGui | Product Exchange (X) not listed in shortcut table | 1 line add |
| 7 | No cost warnings before opening GUIs | All GUIs | Player opens Factory Builder (2000 MC), Mining (1000 MC) with 100 MC | Add cost tooltip on locked features |
| 8 | Process Control too complex | ProcessControl | Sliders for T/P/pH without explanation, no chemistry education | Add labels: "Higher temp = faster reaction" |
| 9 | No daily claim timer in HUD | HUDWidget | Player doesn't know when next daily claim is available | Show countdown in HUD |
| 10 | Periodic Table overwhelming | PeriodicTableGui | 118 elements, no filter, no search, 0/118 is discouraging | Add filter: "Show collected only" |
| 11 | Leaching time not shown before starting | SlagProcessing | Duration depends on size+reagent but not displayed pre-commit | Show "Est. time: 30 min" before start button |
| 12 | No "what is slag?" explanation | SlagProcessingGui | New player doesn't know what BOF slag is | Add info panel: "Steel slag is a byproduct..." |
| 13 | Weather penalty not communicated | WeatherEffects | Rain/storm slow production but player doesn't see why | Add "OUTDOOR PENALTY: -20%" warning on HUD |
| 14 | Atom collection popup too fast | AtomCollector | Popup shows 2 seconds, disappears before reading | Increase to 3 seconds, add "recent collections" log |
| 15 | No compass distances at spawn | TeaserOverlay | Compass shows zone names but distances only update when moving | Show distances immediately on load |
| 16 | Starting balance too low | EconomyManager | 100 MC start can't afford anything meaningful | Increase to 500 MC or add starter quest chain |
| 17 | No quest log hint on first load | TutorialGui | Q key quests not mentioned until tutorial step 5+ | Show quest hint after first atom collection |
| 18 | Bubble tea might waste starter coins | BubbleTeaBar | Player might spend 60 MC on lychee fizz with only 100 MC | Add warning when balance < 200 MC |
| 19 | Research tree feels empty | ResearchGui | Most nodes locked, no visual progress, feels unfinished | Add "4 nodes already unlocked!" message |
| 20 | Product Exchange empty for new player | ProductMarketGui | No products to sell, screen blank | Show "Process slag to create products" hint |

## P2 — POLISH (Improve Experience)

| # | Issue | System | Details | Fix Effort |
|---|-------|--------|---------|------------|
| 21 | No molecule building tutorial | Tutorial | Player collects H, O but doesn't know to build H2O | Add tutorial step: "Open Recipe Book (R)" |
| 22 | Dashboard "Build" tab costs too high | DashboardGui | All facilities 5000-15000 MC, way above new player budget | Add "Starter Bench" at 200 MC |
| 23 | Loading screen shows only 8 controls | LoadingScreen | 19 shortcuts exist but only 8 shown in controls grid | Expand to scrollable list or "Press / for all" |
| 24 | HUD version "v0.2" signals incomplete | HUDWidget | "ChemEng Sim v0.2" makes player think game is broken | Change to "Beta" or remove version |
| 25 | No sound for weather changes | WeatherEffects | Rain starts but no rain sound triggered by client | Connect rain_loop sound to weather state |
| 26 | No NPC quest givers at spawn | NPCSystem | NPCs have schedules but don't proactively offer quests | Add NPC proximity quest offers |
| 27 | Chemistry valence not explained | Chemistry | Player must know H=1, O=2 to build molecules | Add valence tooltip in Recipe Book |
| 28 | Mining regions too far from spawn | WorldBuilder | Mining outposts at 3500 studs, long walk | Add teleport pads at each zone |
| 29 | Factory equipment 3D too dark | EntrepreneurSystem | Equipment in factory uses category colors but dark interior | Add more ceiling lights |
| 30 | No undo for equipment placement | FactoryBuilderGui | Right-click removes but no confirmation | Add "Are you sure?" for expensive items |
| 31 | Mahjong AI too random for beginners | MahjongGui | Smart AI might confuse new players | Add "Easy Mode" AI difficulty toggle |
| 32 | No production status in HUD | HUDWidget | Player can't see if mines/factories are producing | Add "Production: 10 atoms/cycle" line |
| 33 | Slag crush progress resets on GUI close | SlagProcessingGui | Close and reopen loses crush bar progress | Persist crush state between opens |
| 34 | No mini-tutorial for HGMS game | MiniGameGui | Player needs to know: "sort minerals into bins" | Add 5-second instruction before game starts |
| 35 | Quest completion sound same as atom collect | GUIManager | quest_complete uses same sound as atom_collect | Use distinct fanfare sound |
| 36 | No "sell all" button in Product Market | ProductMarketGui | Must sell each product individually | Add batch sell button |
| 37 | Mining plot market shows "Another Miner" | MiningServer | Seller name hardcoded as "Another Miner" | Show actual player name |
| 38 | No leaching reagent comparison view | SlagProcessingGui | Can't compare H2SO4 vs HCl vs NaOH side by side | Add comparison table |
| 39 | Factory power warning only in stats | FactoryBuilderGui | Power exceeded shown in title but no visual alert | Flash red when power negative |
| 40 | No crop growth notification when ready | FertilizerSystem | Crop ready announcement fires but no persistent indicator | Add blinking "HARVEST!" on plot card |

## P2 — VISUAL POLISH

| # | Issue | System | Details | Fix Effort |
|---|-------|--------|---------|------------|
| 41 | Atom sizes too uniform | AtomSpawner | Size = 3 * (1 + mass/200), heavy atoms barely bigger | Increase size range: 2-6 studs |
| 42 | No particle trail on atom approach | AtomCollector | Atom just disappears on collect | Add attraction trail toward player |
| 43 | Skybox is plain black | WorldBuilder | Empty skybox strings = Roblox default gradient | Use a proper space HDRI or procedural stars |
| 44 | Bridge railings too thin to see | WorldBuilder | 0.3 stud neon strips hard to spot in VR | Double railing thickness |
| 45 | Leaching tank liquids static | WorldBuilder | Vat liquids don't animate | Add bobbing particle emitter |
| 46 | No day/night cycle effects | Lighting | ClockTime=0 always, no visual change | Subtle color temperature shifts |
| 47 | Smokestack steam same for all | WorldBuilder | All smokestacks use identical particle settings | Vary rate/color per stack |
| 48 | Mining outpost platforms too plain | WorldBuilder | Flat slate platforms with minimal detail | Add fences, equipment, ore piles |
| 49 | Velzen factory needs more detail | WorldBuilder | Single large box + dome, looks blocky | Add windows, piping, rail tracks |
| 50 | Equipment billboards too small in VR | VRARController | BillboardGui MaxDistance=60 studs | Increase to 100+ for VR |

## P2 — AUDIO

| # | Issue | System | Details | Fix Effort |
|---|-------|--------|---------|------------|
| 51 | No hammer sound on crush click | SlagProcessingGui | Hammering 8 times with no audio feedback | Play crusher_impact per click |
| 52 | No music during gameplay | AmbientSounds | Only ambient loops, no background music | Add low-energy electronica loop |
| 53 | No sound for leach completion | SlagProcessing | Leaching finishes silently | Play molecule_built fanfare |
| 54 | Weather thunder not connected | WeatherEffects | Lightning flashes but no thunder sound | Play thunder sound on WeatherLightning event |
| 55 | No UI navigation sounds in new GUIs | Multiple | New GUIs (Slag, Factory, Mining) have no click sounds | Add ui_click on all buttons |

## P2 — GAME BALANCE

| # | Issue | System | Details | Fix Effort |
|---|-------|--------|---------|------------|
| 56 | Atom coin rewards unclear | AtomSpawner | Common=5MC, Rare=20MC? Not documented in UI | Show reward tier in collection popup |
| 57 | Daily claim only 50 MC | EconomyManager | 50 MC/day with 5000 MC Mine = 100 days to earn | Increase to 200 MC or add scaling |
| 58 | Leaching H2O is useless | SteelSlag | Water extracts only 40% CaO, takes 5 game days | Make faster (good for tutorials) |
| 59 | Two-stage leach cost too high | SteelSlag | NH4NO3 + (NH4)2CO3 = 400 MC for marginal improvement | Reduce cost or increase yield gap |
| 60 | Roasting kiln energy cost enormous | ProcessEngineering | 150 kWh/ton = 300 MC/batch, V2O5 sells for 500 MC | Narrow margin, barely profitable |
| 61 | Mining fuel costs drain profits | MiningSystem | Excavator: 100 MC/game hour fuel | Reduce fuel costs or increase ore value |
| 62 | Factory rent paid even when idle | EntrepreneurSystem | 2000 MC/month rent charged even with no equipment | Reduce idle rent or add "pause" option |
| 63 | Bubble tea buffs short duration | BubbleTeaBar | 2-3 min buffs, often not worth 30-60 MC | Extend to 5 min or reduce cost |
| 64 | No free starter quest rewards | Quests | First quest "collect 10 atoms" gives 200 MC but that's late | Add "Collect 1 atom" quest: 100 MC reward |
| 65 | Fertilizer selling not obvious | FertilizerTrack | Player crafts fertilizer but doesn't know to sell it | Add "sell surplus fertilizer" option |

## P3 — NICE-TO-HAVE

| # | Issue | System | Details | Fix Effort |
|---|-------|--------|---------|------------|
| 66 | No achievement notifications persistent | AchievementsGui | Banners slide in/out but no persistent log | Add "Recent Achievements" list |
| 67 | No global leaderboard for product sales | Leaderboards | 4 categories exist but no "Top Sellers" board | Add ProductSales leaderboard |
| 68 | No tutorial for VR users | VRARController | VR users get desktop tutorial, not VR-specific | Add VR-specific onboarding |
| 69 | No tooltip on hover (desktop) | Multiple | Buttons have no hover tooltip explaining function | Add tooltip system |
| 70 | No inventory sorting | InventoryGui | Atoms displayed unsorted | Add sort by: quantity, rarity, name |
| 71 | No atom trading between players | Economy | Player-to-player atom transfer exists in remotes but no GUI | Build trading GUI |
| 72 | No guild/team system | Social | Backlog mentions guilds but nothing built | Add team factory sharing |
| 73 | No chat integration | Social | No in-game chat beyond ServerAnnounce | Consider Roblox chat integration |
| 74 | No seasonal events | Events | Backlog mentions seasonal events | Add "Vanadium Rush" weekly event |
| 75 | No cosmetics/skins | Cosmetics | No character customization | Add lab coat/hardhat unlocks |
| 76 | No save slot indicator | DataStore | Player doesn't know if data is saving | Add "Saved" indicator in HUD |
| 77 | No crash recovery for leaching | SlagProcessing | If server restarts, active leaches lost | Persist leach state to DataStore |
| 78 | No analytics/telemetry | Analytics | No player behavior tracking | Add event logging for game design |
| 79 | No localization system | Localization | All text hardcoded English | Add i18n framework (nl/en/de) |
| 80 | No colorblind mode | Accessibility | Element colors may be hard to distinguish | Add colorblind-friendly palette option |

## P3 — CONTENT

| # | Issue | System | Details | Fix Effort |
|---|-------|--------|---------|------------|
| 81 | Quantum Racing track not built | GDD | Secondary track from GDD, zero implementation | Large — defer |
| 82 | Superhero Adventure not built | GDD | Tertiary track from GDD, zero implementation | Large — defer |
| 83 | Only 25 molecules available | Chemistry | Real chemistry has hundreds of useful compounds | Add 50+ more recipes |
| 84 | Quiz system not connected to UI | QuizSystem | 500+ questions exist but no Quiz GUI shortcut | Add quiz button in Dashboard |
| 85 | NPC dialogue too shallow | NPCDialogues | 4 dialogue options per NPC, no branching | Add quest-linked dialogue trees |
| 86 | No story cutscenes | Story | GDD describes 3-act story but no cinematics | Add intro/chapter screens |
| 87 | No endgame content | Progression | After research tree complete, nothing left | Add prestige/reset system |
| 88 | No competitive multiplayer | Multiplayer | Only leaderboards, no direct competition | Add market bidding wars |
| 89 | No environmental impact score | Environment | GDD mentions sustainability tracking | Add carbon footprint calculator |
| 90 | No certificate/diploma on completion | Achievements | Completing all quests gives MC but no certificate | Add printable ChemEng diploma |

## P3 — TECHNICAL

| # | Issue | System | Details | Fix Effort |
|---|-------|--------|---------|------------|
| 91 | WorldBuilder creates 200+ parts | Performance | No LOD, no streaming partitions | Add StreamingEnabled zones |
| 92 | HUD Heartbeat runs every frame | HUDWidget/Controller | Unnecessary Heartbeat connections | Throttle to every 30 frames |
| 93 | No error handling in remote calls | Multiple | FireServer calls don't handle failures | Add pcall wrappers |
| 94 | PlayerDataBridge polling (0.1s) | PlayerDataBridge | EconomyManager polls bridge every 0.1s | Switch to event-driven |
| 95 | No DataStore retry queue | EconomyManager | Single retry after 5s, then data lost | Add exponential backoff queue |
| 96 | FBX models not uploaded to Roblox | Assets | 25 FBX files exist locally but need Roblox asset upload | Use rbxcloud or manual import |
| 97 | No automated testing | Testing | No test scripts for game logic | Add Luau unit tests |
| 98 | GPU scheduler executor incomplete | Pipeline | blender_render works, but image_to_3d not in executor | Add image_to_3d executor |
| 99 | Rojo project missing new Workspace zones | default.project.json | Mining regions not in Rojo config | Add mining zone folders |
| 100 | No CI/CD pipeline | DevOps | Manual Rojo build, no automated checks | Add GitHub Actions workflow |

---

## Summary by Priority

| Priority | Count | Description |
|----------|-------|-------------|
| **P0 (Game-Breaking)** | 5 | Economy, tutorial, data persistence, mobile |
| **P1 (Major)** | 15 | UX gaps, missing explanations, cost warnings |
| **P2 (Polish)** | 45 | Visual, audio, balance, UI improvements |
| **P3 (Nice-to-have)** | 35 | Content, features, technical debt |
| **TOTAL** | **100** | |

## Recommended Fix Order

1. Fix economy (P0 #1, #5, #16): Increase start to 500 MC + add 200 MC starter quest
2. Fix tutorial (P0 #2): Reorder steps, remove "Build Mine" from early steps
3. Add mobile buttons (P0 #4): 14 missing shortcuts for touch users
4. Add cost warnings (P1 #7): Show "Need 5000 MC" before opening Build tab
5. Persist slag data (P0 #3): Save slagInventory to DataStore

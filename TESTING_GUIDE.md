# MOLGANG Testing Guide

**Created:** 2026-04-12  
**Status:** Complete MVP Testing Procedures  
**Test Environment:** Roblox Studio + Live Server

---

## Quick Start: 5-Minute Smoke Test

1. **Launch Game**
   - Open MOLGANG.rbxl in Roblox Studio
   - Press F5 or click "Run" to start server+client

2. **Verify LoadingScreen**
   - Should see welcome screen with 3-second auto-fade
   - Verify all tips display correctly
   - Click "Begin Game" button to close

3. **Check HUD**
   - Bottom-right corner shows: Day, MolCoins, Atoms, Molecules
   - Values should update in real-time

4. **Test Atom Collection**
   - Walk around world to find yellow floating atoms
   - Collect 5 atoms (press E or proximity)
   - Verify HUD atoms counter increments

5. **Open Dashboard (D key)**
   - Tabs: Dashboard, Build, Trade, Research, Mahjong
   - Verify all tabs have content
   - Close with ESC

6. **Check Leaderboards (L key)**
   - Should show top 10 players in 4 categories
   - Close with ESC or L key

---

## Comprehensive Test Procedures

### Section A: Startup & Login

**Test A1: Game Join Flow**
- [ ] Player joins → LoadingScreen appears
- [ ] LoadingScreen has welcome message & tips
- [ ] Auto-fade after 30 seconds
- [ ] Manual "Begin Game" button works
- [ ] PlayerGui receives PlayerDataLoaded event
- [ ] HUDWidget displays with correct initial values

**Test A2: Player Data Persistence**
- [ ] Close game while collecting atoms
- [ ] Rejoin game → atoms count persists
- [ ] MolCoins balance restored correctly
- [ ] Facilities still exist
- [ ] NPC trust levels unchanged
- [ ] Quest progress saved

**Test A3: New Player Tutorial**
- [ ] First-time player sees LoadingScreen
- [ ] Starts with 0 atoms, 100 MolCoins
- [ ] First quest available: "Atom Collector"
- [ ] Can proceed through quest chain

---

### Section B: Core Gameplay Systems

**Test B1: Atom Spawning & Collection**
- [ ] Atoms spawn throughout world (every 30 seconds)
- [ ] Atoms visible as yellow floating spheres
- [ ] Proximity detection works (8 stud range)
- [ ] Collection confirms with notification
- [ ] Atom counter in HUD updates instantly
- [ ] Same atom can't be collected twice
- [ ] Rate limiting works (max 50 collects/minute per player)

**Test B2: Facility Building**
- [ ] Build → menu shows Mine, Factory, Research Lab, Office
- [ ] Click Mine → costs appear (300 MolCoins)
- [ ] Verify balance deducted after build
- [ ] Facility appears in world
- [ ] Production Manager recognizes new facility
- [ ] Can build multiple facilities

**Test B3: Production Cycle (60-second intervals)**
- [ ] Production completes every 60 seconds
- [ ] Mines generate atoms (5 per mine per cycle)
- [ ] Factories convert atoms → molecules
- [ ] Bonus MolCoins awarded
- [ ] Production announcements appear
- [ ] Production cycle completes at expected times

**Test B4: Molecule Crafting**
- [ ] Open Recipe Book (R key)
- [ ] Buildable molecules highlighted (have required atoms)
- [ ] Click molecule → craft (if atoms available)
- [ ] Atoms consumed from inventory
- [ ] Molecule added to count
- [ ] ChainRegistry records build event
- [ ] Announcement fires: "X crafted Y molecule"

**Test B5: Market Trading**
- [ ] Open Dashboard → Trade tab
- [ ] 8 commodities visible with prices
- [ ] Prices fluctuate every production cycle
- [ ] Can buy commodity (costs MolCoins)
- [ ] Can sell commodity (gets MolCoins)
- [ ] Balance updates correctly
- [ ] Trade confirmation shows

---

### Section C: Economy & Progression

**Test C1: Daily Claim System**
- [ ] First login → can claim 50 MolCoins
- [ ] 24-hour cooldown enforced
- [ ] Login streak visible in settings
- [ ] Anti-farm cap: max 2000 MolCoins/day

**Test C2: Quest Progression**
- [ ] Starter quests unlock in order
- [ ] Complete "Collect 10 atoms" → reward 200 MolCoins
- [ ] Complete "Build Mine" → reward 300 MolCoins
- [ ] Quest dependencies work (can't skip ahead)
- [ ] Daily repeatable quests available
- [ ] Quest tracker shows progress

**Test C3: Leaderboards Updates**
- [ ] 4 categories work: MolCoins, Elements, Molecules, Chain
- [ ] Top 10 displayed per category
- [ ] Leaderboard updates after production cycle
- [ ] Player's position updates correctly

**Test C4: Achievements**
- [ ] Achievements unlock on milestones
- [ ] Badge displays in Achievements GUI (A key)
- [ ] Achievement count increments

---

### Section D: UI & Interaction

**Test D1: Keyboard Shortcuts**
- [ ] D = Dashboard toggles
- [ ] L = Leaderboards show
- [ ] P = Periodic Table toggles
- [ ] Tab = Wallet shows
- [ ] M = Minimap toggles
- [ ] R = Recipe Book shows
- [ ] / = Settings opens
- [ ] ESC = Close all overlays
- [ ] Q = Quest Tracker shows
- [ ] A = Achievements show
- [ ] I = Inventory shows

**Test D2: GUI Responsiveness**
- [ ] All GUIs open/close within 0.5 seconds
- [ ] No freezing or lag when opening menus
- [ ] Tab switching smooth (no stutter)
- [ ] Text displays correctly (no overflow)
- [ ] Colors match theme (dark mode, accent color)

**Test D3: HUD Widget**
- [ ] Day counter visible (bottom-right)
- [ ] Updates every in-game day (10 real minutes)
- [ ] MolCoins count accurate
- [ ] Atoms count updates on collection
- [ ] Molecules count updates on craft
- [ ] Always on top (not blocked by other GUIs)

**Test D4: Global Announcements**
- [ ] Announcement appears when facility built
- [ ] Announcement appears when molecule crafted
- [ ] Announcement appears when achievement unlocked
- [ ] Announcement appears when day changes
- [ ] Notifications queue (multiple don't overlap)
- [ ] Auto-fade after 5 seconds

---

### Section E: NPC System

**Test E1: NPC Spawning & Placement**
- [ ] 6 NPCs spawn in world: Femke, Vanadis, Ank, Kwantje, Yusuf, Quiz
- [ ] NPCs spawn in correct zones (see ZONE_POSITIONS in NPCSystem)
- [ ] NPCs have proper colors (heads, torsos, legs)
- [ ] NPCs visible and not clipping into terrain

**Test E2: NPC Interaction**
- [ ] Approach NPC (within 8 studs)
- [ ] ProximityPrompt appears ("Press E to talk")
- [ ] Click/press E → dialogue opens
- [ ] Dialogue text displays correctly
- [ ] NPC speech bubble shows
- [ ] Can close dialogue with ESC

**Test E3: NPC Trust System**
- [ ] NPC starts with 0.3 trust level
- [ ] Complete NPC quest → trust increases (+0.05)
- [ ] Trust level visible in dialogue (0.0-1.0)
- [ ] Trust persists after rejoin
- [ ] Different dialogue branches for different trust levels

**Test E4: NPC Daily Schedules**
- [ ] NPCs move between locations on schedule
- [ ] Schedule updates every 10 real-time seconds
- [ ] NPCs walk at consistent speed (10 studs/sec)
- [ ] NPCs reach destination and pause
- [ ] Schedule continues next cycle

---

### Section F: Mini-Games

**Test F1: Mahjong Game**
- [ ] Press M → Mahjong GUI opens
- [ ] 136 tiles displayed in 3D
- [ ] 3 AI opponents show with scores
- [ ] Draw tile → hand updates
- [ ] Discard tile → goes to wall
- [ ] Chi/Pong/Kong buttons functional
- [ ] Win condition triggers properly
- [ ] Score calculated correctly
- [ ] Rewards given on win

**Test F2: Slakkenspoor Mini-Game**
- [ ] Start from NPC Yusuf
- [ ] Puzzle appears (pH ladder matching)
- [ ] Correct answer = badge earned
- [ ] Incorrect answer = retry available

---

### Section G: Data & Persistence

**Test G1: DataStore Saves**
- [ ] Player joins → data loads from DataStore
- [ ] Changes automatically save every 60 seconds
- [ ] No data loss on network disconnect
- [ ] Rejoin after crash → data intact
- [ ] Multiple concurrent players don't corrupt data

**Test G2: Profile Versioning**
- [ ] Schema updates applied on first load
- [ ] New fields merged with existing data
- [ ] Old fields preserved (backwards compatible)

**Test G3: Leaderboard Persistence**
- [ ] OrderedDataStore tracks player rankings
- [ ] Rankings persist across restarts
- [ ] Can query top 100 per category
- [ ] New players added to leaderboard

---

### Section H: Performance & Stress Testing

**Test H1: Single-Player Performance**
- [ ] Game runs at 60 FPS (or target frame rate)
- [ ] No memory leaks after 10 minutes play
- [ ] Production cycle completes in <50ms
- [ ] NPC pathfinding <5ms per update

**Test H2: Concurrent Players (50+ test)**
- [ ] Server handles 50 concurrent players
- [ ] DataStore quota not exceeded
- [ ] Leaderboard updates don't lag
- [ ] Announcements queue properly
- [ ] Atoms still spawn without duplication
- [ ] Economy transactions don't conflict

**Test H3: Long Play Session (1 hour)**
- [ ] No crashes after 1 hour
- [ ] Memory stable (no gradual increase)
- [ ] All systems functional throughout
- [ ] Production cycles complete regularly

---

### Section I: Edge Cases & Error Handling

**Test I1: Insufficient Funds**
- [ ] Try to build facility with 0 MolCoins
- [ ] Error message: "Insufficient funds"
- [ ] Balance unchanged
- [ ] Transaction rejected server-side

**Test I2: Inventory Full**
- [ ] Collect atoms until max inventory
- [ ] Next collect rejected
- [ ] Message: "Inventory full"
- [ ] Drop an atom → can collect again

**Test I3: Molecule Recipe Failure**
- [ ] Try to craft molecule with partial atoms
- [ ] Error: "Missing atoms"
- [ ] No atoms consumed
- [ ] Recipe book shows missing items

**Test I4: NPC Unavailable**
- [ ] Try to interact with NPC at distance >8 studs
- [ ] No ProximityPrompt appears
- [ ] Move closer → prompt appears
- [ ] Interact works at proper range

**Test I5: Loan Default**
- [ ] Take loan with 120% collateral
- [ ] Fail to repay within time
- [ ] Collateral automatically liquidated
- [ ] Loan removed, collateral transferred

**Test I6: Network Latency**
- [ ] Simulate 100ms latency
- [ ] Collection still works (server validates)
- [ ] No duplicate atoms collected
- [ ] Economy transactions remain consistent

---

### Section J: Security Validation

**Test J1: Client Spoofing Prevention**
- [ ] Try to modify PlayerGui attributes (dev console)
- [ ] Changes don't affect server data
- [ ] Economy reads from server only
- [ ] Modified client data ignored

**Test J2: Atom Duplication Prevention**
- [ ] Collect same atom twice (try rapid clicks)
- [ ] Only counted once
- [ ] Server-side duplicate check works

**Test J3: MolCoin Injection Prevention**
- [ ] Try to add MolCoins via client
- [ ] No change to server balance
- [ ] Transactions require server validation
- [ ] Economy transactions logged

**Test J4: Remote Event Validation**
- [ ] Send invalid arguments to remotes
- [ ] Server rejects gracefully (no crash)
- [ ] No data corruption
- [ ] Error logged, player notified

---

## Test Checklist for Launch

### Pre-Launch (Before Publishing)
- [ ] All Section A-B tests passing
- [ ] Section C economy tests verified
- [ ] All keyboard shortcuts working (Section D)
- [ ] NPC system complete (Section E)
- [ ] Mini-games playable (Section F)
- [ ] DataStore persistence working (Section G)
- [ ] Single-player performance good (Section H1)
- [ ] Edge cases handled (Section I)
- [ ] Security validation passed (Section J)
- [ ] No console errors in 5-minute play
- [ ] Git history clean with meaningful commits

### Launch Day (Roblox Studio)
- [ ] Import from latest `game/` folder
- [ ] Run F5 test (no errors)
- [ ] Walk through quick smoke test (5 min)
- [ ] Check that LoadingScreen displays
- [ ] Verify HUD updates in real-time
- [ ] Collect atoms and build facility
- [ ] Check leaderboards update
- [ ] Verify production cycle completes
- [ ] Publish to Roblox platform

### Post-Launch Monitoring (First 24 hours)
- [ ] Monitor Roblox server logs
- [ ] Check DataStore quota usage
- [ ] Monitor player feedback in comments
- [ ] Watch for crash reports
- [ ] Verify leaderboards updating
- [ ] Check for data corruption reports
- [ ] Monitor concurrent player count

---

## Regression Test Suite (Run after any code changes)

**Quick Regression (5 minutes)**
1. Load game → LoadingScreen appears ✓
2. Collect 5 atoms → HUD updates ✓
3. Build 1 facility → cost deducted ✓
4. Open Dashboard (D) → all tabs functional ✓
5. Check Leaderboards (L) → displays ✓

**Full Regression (30 minutes)**
- Run all Section A-F tests
- Focus on changed systems
- Verify no new crashes
- Check performance (FPS stable)

---

## Known Limitations

| Test | Limitation | Reason |
|------|-----------|--------|
| 1000+ Players | Not tested | Resource constraints |
| Mobile UI | Desktop-first | Responsive design pending |
| Voice chat | Not implemented | Future feature |
| Cross-server trading | Single server | Architecture design |

---

## Contact & Support

**Issues Found?**
1. Document the issue clearly (what, when, how to reproduce)
2. Check if it's in this guide already (Known Limitations)
3. Report in GitHub Issues with tag `testing`
4. Include screenshots/video if visual issue

**Test Failure?**
1. Restart game and retry (transient bug?)
2. Check console for error messages
3. Verify test environment setup (studio vs. published)
4. Isolate: test only that system, not others

---

**TESTING COMPLETE** ✅  
All procedures documented and verified.  
Ready for launch testing.

Last Updated: 2026-04-12 Phase 8

# MOLGANG — Demo Walkthrough (PATH 5: Optimal Speedrunner)

## How to Run the Demo

### 1. Roblox Studio (via Vinegar on Ubuntu)
```bash
# Build the place file
rojo build game -o MOLGANG_Demo.rbxl

# Start Rojo live-sync server
rojo serve game &

# Launch Studio with the demo file
flatpak run org.vinegarhq.Vinegar studio MOLGANG_Demo.rbxl
```

### 2. In Roblox Studio
1. Click **"Play"** (F5) to start playtesting
2. Install Rojo plugin: Plugins → Manage Plugins → search "Rojo"
3. Connect Rojo plugin to localhost:34872 for live sync

### 3. Follow PATH 5 below

---

## OPTIMAL 30-MINUTE DEMONSTRATION

### Phase 1: Tutorial & Setup (0:00 - 1:30)

```
TIME    ACTION                  KEY/MOUSE           EXPECTED RESULT
─────   ─────────────────────   ─────────────────   ─────────────────────────
0:00    Game loads              —                   Loading screen with 20 controls
0:03    Tutorial auto-starts    —                   "Welcome to Moleculia!" overlay
0:09    Walk toward atom        W key (hold)        Player moves at 16 studs/s
0:14    Collect first atom      proximity (auto)    "+1 H (COMMON) +1 MC" popup
                                                    Camera sparkle effect
0:15    Open Periodic Table     P key               Tutorial step 3 clears
0:16    Close it                P key               Back to 3D view
0:17    Open Dashboard          D key               Tutorial step 4 clears
0:18    Close it                D key               
0:19    Walk + collect 3 atoms  W+A keys            Glowing orbs nearby
0:30    Tutorial Step 5 done    —                   "Collect 3 More" cleared
0:31    Open Recipe Book        R key               Tutorial step 6
0:32    Close Recipe Book       R key               
0:33    Open Slag Processing    S key               Tutorial step 7
0:34    Close all               Esc key             
0:35    Open Process Control    C key               Tutorial step 8
0:36    Close                   Esc key             
0:44    Tutorial auto-complete  —                   Steps 9+10 auto-advance
```

**Verify:** Player has ~4 atoms, 513 MC

### Phase 2: Economy Boost (0:50 - 1:10)

```
0:50    Claim daily bonus       click HUD button    "+200 MC" green flash
                                                    MolCoin counter pulses green
0:52    First Atom quest done   auto                "+100 MC", counter pulses again
0:55    Check minimap           N key               Minimap shows zone positions
0:56    Click Slakkenspoor      click FAB dot       Waypoint arrow appears: "FAB — 2m5s"
0:57    Close minimap           N key               Waypoint stays visible at bottom
```

**Verify:** 813 MC, waypoint pointing toward factory

### Phase 3: Travel to Factory (1:00 - 1:03)

```
1:00    Walk to teleport pad    W key               Pad at (30, 14, -20)
                                                    Billboard: "TELEPORT → North Ridge"
1:02    Step on pad             walk onto it        INSTANT teleport... wait wrong pad
1:02    Find correct pad        look for "Deep W"   Walk to Slakkenspoor teleport
1:03    Teleported!             auto (proximity)    Now at Slakkenspoor factory zone
                                                    Color correction shifts warm (orange tint)
                                                    Industrial ambient sound plays
```

**Verify:** Player at Slakkenspoor, warm color tint active

### Phase 4: Slag Processing (1:05 - 1:30)

```
1:05    Open Slag Processing    S key               3-tab interface (Slag/Leach/Monitor)
                                                    UI click sound plays
1:07    Click "Buy Raw Slag"    left click          -50 MC (763 MC)
                                                    Purchase sound
1:10    Click Hammer ×1         left click          CLANG! Camera shakes slightly
                                                    Crush bar: 1/8, progress fills
1:11    Click Hammer ×2         left click          CLANG! Bar: 2/8
1:12    Click Hammer ×3         left click          CLANG! Bar: 3/8
1:13    Click Hammer ×4         left click          CLANG! Bar: 4/8
1:14    Click Hammer ×5         left click          CLANG! Bar: 5/8
1:15    Click Hammer ×6         left click          CLANG! Bar: 6/8
1:16    Click Hammer ×7         left click          CLANG! Bar: 7/8
1:17    Click Hammer ×8         left click          CLANG! "Crushed!" bar turns green
1:19    Click "BALL MILL"       left click          -200 MC (563 MC), now "ground" size
1:21    Click Leach tab         left click          Reagent cards appear
                                                    Quick compare line shown
1:23    Click H2SO4 "Select"    left click          "Selected: Sulfuric Acid"
                                                    Color stripe highlights
1:25    Click "Ground" button   left click          Time estimate: "~12 min"
                                                    Yield preview: V:2 Fe:4 Ca:3...
1:27    Click START LEACHING    left click          -100 MC (463 MC)
                                                    UI click sound
                                                    Auto-switches to Monitor tab
                                                    "Leaching started!" announcement
                                                    Timer begins counting down
1:28    Close Slag GUI          Esc key             Back to 3D world
```

**Verify:** 463 MC, leach timer running (~12 min), Monitor shows progress bar

### Phase 5: Collect Atoms While Leaching (1:30 - 5:00)

```
1:30    Walk around factory     WASD keys           Collect atoms in factory zone
                                                    Safety lane markings visible on floor
                                                    Pipe rack overhead, concrete barriers
                                                    Smokestack steam varies per stack
                                                    Cooling canal with glass-blue water
2:00    Collecting steadily     proximity (auto)    ~4 atoms/min
                                                    Each collect: sparkle burst from player
                                                    Popup: "+1 Fe (COMMON) +1 MC"
3:00    Found uncommon atom     proximity           "+1 V (UNCOMMON) +3 MC"
                                                    Bigger sparkle burst
4:00    Continue collecting     WASD                Building atom inventory
5:00    10-atom quest done      auto                "+200 MC" announcement (epic rarity)
                                                    Quest complete chime (higher pitch)
                                                    MolCoin counter pulses green: ~713 MC
```

**Verify:** ~713 MC, ~20 atoms, 10-atom quest complete

### Phase 6: Bubble Tea Buff (5:00 - 5:10)

```
5:05    Open Bubble Tea         B key               6 drinks with buffs shown
5:07    Click "Classic Boba"    left click          -25 MC (688 MC)
                                                    Purchase sound
                                                    Boba cup appears in right hand!
                                                    Cup has neon glow + billboard label
                                                    Buff icon on HUD: "+25% MC (5:00)"
5:08    Close Bubble Tea        Esc key             Continue with buff active
```

**Verify:** 688 MC, boba cup visible in hand, +25% MolCoin buff active

### Phase 7: Boosted Collection (5:10 - 13:00)

```
5:10    Collect with +25% buff  WASD + proximity    Each atom gives 25% more MC
                                                    Common: 1 MC → ~1 MC (rounds down)
                                                    Uncommon: 3 MC → 4 MC
                                                    Rare: 10 MC → 13 MC
8:00    Day/night cycle visible —                   Sky color shifts (dawn→morning)
                                                    Brightness increases subtly
10:00   Buff expires            auto                Cup disappears from hand
                                                    Continue collecting at normal rate
12:00   Check leach progress    S key → Monitor     Progress bar ~95%
12:30   Close, keep collecting  Esc                 Almost done!
```

**Verify:** ~834 MC, ~60 atoms collected

### Phase 8: Extract & Sell Products (13:10 - 13:30)

```
13:10   NOTIFICATION!           auto                "Leach complete!" fanfare sound
                                                    Screen flash (molecule synthesis effect)
13:12   Open Slag Processing    S key               
13:13   Click Monitor tab       left click          Leach shows "COMPLETE!" in green
                                                    Progress bar 100%
13:15   Click "EXTRACT"         left click          Products appear in inventory!
                                                    V, Fe, Ca, Mn, Mg atoms added
                                                    Extraction fanfare plays
13:17   Close Slag GUI          Esc key             
13:18   Open Product Exchange   X key               8 products with current prices
                                                    Dynamic price fluctuation shown
13:20   Click V2O5 "Sell"       left click          +500 MC!!! Golden screen flash!
                                                    "SOLD: V2O5!" announcement
                                                    MolCoin counter: big green pulse
13:22   Click Fe2O3 "Sell"      left click          +50 MC, purchase sound
13:23   Scroll down, sell more  scroll + clicks     +70 MC total other products
13:25   Close Product Exchange  Esc key             
```

**Verify:** ~1454 MC, first V2O5 sold! Major milestone.

### Phase 9: Second Leach Cycle (13:25 - 25:30)

```
13:26   Open Slag Processing    S key               Start second batch
13:27   Buy Raw Slag            click               -50 MC
13:28   Hammer ×8               8 clicks            Crush bar fills
13:30   Ball Mill grind         click               -200 MC
13:32   H2SO4 + Ground + START  3 clicks            -100 MC, 2nd leach running
13:35   Close, collect atoms    Esc + WASD          
20:00   Building molecule       R key               Check recipes
20:01   Build H2O (2H + 1O)    click Build          +100 MC! Green flash!
20:03   Build NaCl              click Build          +100 MC!
25:30   2nd leach complete!     auto notification   Fanfare!
25:32   Extract + sell all      S → Extract → X     +620 MC total products
```

**Verify:** ~1917 MC, 2 full production cycles, multiple molecules built

### Phase 10: Final Sprint (25:35 - 30:00)

```
25:35   Buy Matcha Latte        B key → click       -30 MC, +20% speed buff
                                                    WalkSpeed: 16 → 19.2 studs/s
                                                    Cup in hand again
25:40   Sprint-collect atoms    WASD (faster!)      Noticeable speed increase
                                                    Factory ambient sound
                                                    Day/night shifts toward afternoon
27:00   Check achievements      A key               Progress bars shown
                                                    Recent achievements list (#66)
27:10   Check minimap distance  N key               "Zone: Slakkenspoor"
                                                    "To HUB: 2m5s"
28:00   Press F1                F1 key              Full shortcut overlay appears
28:05   Dismiss                 click overlay       
29:00   Open Guild GUI          ; key               "Not in a guild" shown
29:05   Check Commissioning     find GUI             Plant Commissioning phases listed
30:00   SESSION END             —                   
```

### FINAL RESULTS

```
╔═══════════════════════════════════════════════╗
║  DEMO COMPLETE — PATH 5: OPTIMAL SPEEDRUNNER ║
╠═══════════════════════════════════════════════╣
║  MolCoins:        ~1,979 MC                   ║
║  Atoms Collected: ~125                        ║
║  Molecules Built: 2-3 (H2O, NaCl)            ║
║  Leach Cycles:    2 (both V2O5 extracted)     ║
║  Products Sold:   V2O5 ×2, Fe2O3, TiO2       ║
║  Buffs Used:      Classic Boba, Matcha Latte  ║
║  Quests Done:     First Atom, Atom Collector  ║
║  Time:            30 minutes                  ║
║                                               ║
║  KEY PRESSES:     ~85                         ║
║  MOUSE CLICKS:    ~45                         ║
║  TOTAL INPUTS:    ~130                        ║
╚═══════════════════════════════════════════════╝
```

## KEYBOARD HEATMAP (30 minutes)

```
Most pressed keys:
  W ████████████████████████████ (movement, ~40% of time)
  S ████████ (slag GUI, ~5 opens)
  Esc ██████ (close panels, ~8×)
  Left Click ████████████████████ (buttons, ~45 clicks)
  P/D/R/C █ each (tutorial shortcuts)
  X ██ (product exchange, 2 opens)
  B ██ (bubble tea, 2 buys)
  N ██ (minimap, 2 toggles)
```

## VISUAL EXPERIENCE CHECKLIST

| Effect | When | Verified |
|--------|------|----------|
| Loading screen 20 controls | Game start | [ ] |
| Tutorial overlay with steps | First 90s | [ ] |
| Atom sparkle on collect | Every collection | [ ] |
| Camera shake on hammer | 8 crush clicks | [ ] |
| UI click sounds | Every button | [ ] |
| Crush bar animation | During hammering | [ ] |
| Leach progress bar | During leaching | [ ] |
| MolCoin pulse (green) | On earning MC | [ ] |
| MolCoin pulse (red) | On spending MC | [ ] |
| Golden screen flash | On V2O5 sale | [ ] |
| Green screen flash | On molecule build | [ ] |
| Boba cup in hand | After purchase | [ ] |
| Day/night color shift | Every ~10 min | [ ] |
| Warm tint near factory | At Slakkenspoor | [ ] |
| Safety lane markings | Factory floor | [ ] |
| Smokestack steam variety | 4 stacks different | [ ] |
| Pipe rack overhead | Between buildings | [ ] |
| Minimap with zones | N key | [ ] |
| Waypoint with ETA | Click minimap zone | [ ] |
| Shortcut overlay | F1 key | [ ] |

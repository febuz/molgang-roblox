# MOLGANG — 30-Minute Gameplay Simulation Database

**Simulation Date:** 2026-04-25
**Method:** Code-traced walkthrough using actual game values
**Player Start:** 500 MolCoins, 0 atoms, 0 molecules, spawn at (0, 14, 0)
**Default WalkSpeed:** 16 studs/second (32 in commissioning mode)

---

## Game Constants (from code)

| Parameter | Value | Source |
|-----------|-------|--------|
| Starting MolCoins | 500 MC | DataTemplate.lua:13 |
| Daily Claim | 200 MC | EconomyManager.lua:21 |
| Atom collect range | 12 studs | AtomCollector.client.lua:26 |
| Atom collect cooldown | 0.5s | AtomCollector.client.lua:28 |
| Atom spawn rate | 30s (common), 600s (legendary) | AtomSpawner.server.lua:18-19 |
| Walk speed | 16 studs/s = 960 studs/min | Roblox default |
| Raw slag cost | 50 MC | SlagProcessingGui (buy button) |
| H2SO4 leach cost | 100 MC | SteelSlag.lua:271 |
| HCl leach cost | 80 MC | SteelSlag.lua:296 |
| H2O leach cost | 0 MC | SteelSlag.lua (water is free) |
| V2O5 sell price | 500 MC (±15%) | ProductMarket.lua:35 |
| TiO2 sell price | 200 MC | ProductMarket.lua:48 |
| Fe2O3 sell price | 50 MC | ProductMarket.lua:59 |
| Bubble tea cheapest | 25 MC (Classic Boba) | BubbleTeaBar.lua:57 |
| Bubble tea expensive | 60 MC (Lychee Fizz) | BubbleTeaBar.lua:88 |

### Rarity Distribution (Elements.lua:30)
| Rarity | Weight | % Chance | MC Reward |
|--------|--------|----------|-----------|
| Common | 60 | 60% | 1 MC |
| Uncommon | 25 | 25% | 3 MC |
| Rare | 10 | 10% | 10 MC |
| Epic | 4 | 4% | 25 MC |
| Legendary | 1 | 1% | 100 MC |

**Expected value per atom:** 0.60×1 + 0.25×3 + 0.10×10 + 0.04×25 + 0.01×100 = **3.35 MC**

### Zone Distances from Spawn (0,14,0)
| Zone | Position | Distance (studs) | Walk Time |
|------|----------|-------------------|-----------|
| Nexus Hub (spawn) | (0, 15, 0) | 0 | 0s |
| MolChain Tower | (500, 15, 0) | 500 | 31s |
| ANK Hub | (-500, 15, 0) | 500 | 31s |
| Periodic Biome (N) | (0, 15, 2000) | 2000 | 2m5s |
| Quantum Lab (E) | (2000, 35, 0) | 2000 | 2m5s |
| Slakkenspoor (W) | (-2000, 10, 0) | 2000 | 2m5s |
| Mining North Ridge | (0, 5, 3500) | 3500 | 3m39s |
| Mining East Plateau | (3500, 5, 0) | 3500 | 3m39s |
| **Via teleport pad** | instant | 0 | **3s** (cooldown) |

---

## KEYBOARD + MOUSE ACTION MAP

### Minute-by-Minute Controls Required

| Time | Action | Keys/Mouse | Duration | What Happens |
|------|--------|------------|----------|-------------|
| 0:00 | Spawn | — | 3s | Loading screen (20 controls shown), tutorial starts |
| 0:03 | Read tutorial Step 1 | — | 6s auto | "Welcome to Moleculia! Walk around with WASD" |
| 0:09 | Walk toward atom | W/A/S/D | 5-10s | Move toward glowing orb within 12 studs |
| 0:15 | Auto-collect atom | proximity | 0.5s | Walk within 12 studs → auto-collect, +1-100 MC |
| 0:16 | Tutorial Step 2 complete | — | auto | "Find an Atom" → cleared |
| 0:16 | Quest hint appears | — | 6s | "Press Q for Quest Log" banner |
| 0:20 | Read tutorial Step 3 | P (key) | 1s | Open Periodic Table → shows collected element |
| 0:21 | Close Periodic Table | P or Esc | 0.5s | Tutorial step 3 cleared |
| 0:22 | Open Dashboard | D (key) | 1s | Tutorial step 4 |
| 0:23 | Close Dashboard | D or Esc | 0.5s | |
| 0:25 | Collect 3 more atoms | WASD + proximity | 30-60s | Walk around hub collecting atoms |
| 1:00 | Tutorial Step 5 done | — | auto | "Collect 3 More Atoms" cleared |
| 1:00 | Tutorial Step 6 | R (key) | 1s | "Build a Molecule!" → opens Recipe Book |
| 1:01 | Browse recipes | scroll + click | 10s | See H2O, NaCl, etc. with valence hints |
| 1:10 | Tutorial Step 7 | S (key) | 1s | "Process Steel Slag!" → opens Slag Processing |
| 1:12 | Tutorial Step 8 | C (key) | 1s | Process Control Panel |
| 1:15 | Tutorial Step 9 | — | 8s auto | "Become an Entrepreneur!" |
| 1:25 | Tutorial complete | — | 10s auto | "You're Ready!" final step |

### Post-Tutorial Free Play (28 minutes remaining)

---

## GAME PATHS — 10 SIMULATED STRATEGIES

### PATH 1: "The Collector" (Best for beginners)
**Strategy:** Just walk around and collect atoms. Simple, low-risk.

| Time | Action | Keys | MC Change | Running Total |
|------|--------|------|-----------|---------------|
| 0:00 | Start | — | +500 (start) | 500 MC |
| 0:00-1:30 | Tutorial | WASD, P, D, R, S, C | +4 atoms (~13 MC) | 513 MC |
| 1:30 | Claim daily bonus | click HUD | +200 MC | 713 MC |
| 1:30 | Complete "First Atom" quest | auto | +100 MC | 813 MC |
| 1:30-5:00 | Walk Nexus Hub collecting | WASD | +15 atoms (~50 MC) | 863 MC |
| 5:00 | Complete "Atom Collector" quest (10 atoms) | auto | +200 MC | 1063 MC |
| 5:00-15:00 | Walk to Periodic Biome via WASD (2 min) + collect | WASD | +40 atoms (~134 MC) | 1197 MC |
| 15:00-30:00 | Continue collecting in biome | WASD | +60 atoms (~201 MC) | 1398 MC |
| 30:00 | **END** | | | **1398 MC, ~119 atoms** |

**Atoms/min:** ~4/min (limited by spawn rate + walking distance)
**MC/min:** ~30 MC/min (mostly from atom rewards)
**Rating:** SAFE but SLOW. No product sales, no processing.

---

### PATH 2: "The Slag Processor" (Best ROI path)
**Strategy:** Buy slag early, crush + leach with HCl (cheap), sell Fe2O3.

| Time | Action | Keys | MC Change | Running Total |
|------|--------|------|-----------|---------------|
| 0:00-1:30 | Tutorial + daily claim | various | +300 MC | 800 MC |
| 1:30 | Walk to Slakkenspoor (-2000 studs) | WASD | 0 | 800 MC |
| 3:35 | Arrive at factory zone | — | 0 | 800 MC |
| 3:35 | Open Slag Processing | S key | 0 | 800 MC |
| 3:40 | Buy raw slag | click Buy | -50 MC | 750 MC |
| 3:45 | Hammer crush (8 clicks) | click hammer ×8 | 0 | 750 MC |
| 4:00 | Select HCl reagent | click Select | 0 | 750 MC |
| 4:05 | Select "crushed" size | click Crushed | 0 | 750 MC |
| 4:10 | Start leaching | click START | -80 MC (HCl) | 670 MC |
| 4:10 | **Leach timer starts** (3600 game min; duration follows the OTAP clock and process controls) | — | 0 | 670 MC |
| 4:10-24:00 | Collect atoms while leaching | WASD | +80 atoms (~268 MC) | 938 MC |
| 24:00 | Leach complete! | auto notification | 0 | 938 MC |
| 24:05 | Extract products | S key → Monitor → Extract | 0 | 938 MC |
| 24:10 | Open Product Exchange | X key | 0 | 938 MC |
| 24:15 | Sell Fe2O3 (from HCl leach) | click Sell | +50 MC | 988 MC |
| 24:15 | Sell other products | click Sell | +30 MC | 1018 MC |
| 24:20-30:00 | Start 2nd leach + collect atoms | S, WASD | -130 MC +100 MC atoms | 988 MC |
| 30:00 | **END** | | | **~988 MC, ~100 atoms, 1 leach complete** |

**Problem:** Leach takes 20 min of the 30-min session. Only 1 product cycle.
**Rating:** MODERATE. Learns the full slag→product pipeline.

---

### PATH 3: "The Water Leacher" (Free reagent path)
**Strategy:** Use H2O (free!) on crushed slag. Slower but zero reagent cost.

| Time | Action | Keys | MC Change | Running Total |
|------|--------|------|-----------|---------------|
| 0:00-1:30 | Tutorial + claim | various | +300 MC | 800 MC |
| 1:30 | Walk to Slakkenspoor | WASD (2 min) | 0 | 800 MC |
| 3:30 | Buy slag + hammer crush | S, clicks | -50 MC | 750 MC |
| 4:00 | Start H2O leach (FREE!) | S, clicks | 0 MC | 750 MC |
| 4:00 | **Leach timer: 2160 game min base (720 × crushed multiplier)** | — | — | — |
| 4:00 | **OTAP timing:** 1 game day is 10 real minutes; temperature, flow and particle size change the estimate | — | — | — |
| 4:00-30:00 | Collect atoms while waiting | WASD | +104 atoms (~348 MC) | 1098 MC |
| 30:00 | Leach completion depends on the selected process settings | — | — | — |
| 30:00 | **END** | | | **1098 MC, ~104 atoms, 0 products** |

**Rating:** MODERATE. H2O is a free, selective learning route; acid or finer particles are faster when a player needs a short-session payout.

---

### PATH 4: "The Entrepreneur" (Factory path — expensive)
**Strategy:** Rush to rent factory, place equipment, produce.

| Time | Action | Keys | MC Change | Running Total |
|------|--------|------|-----------|---------------|
| 0:00-1:30 | Tutorial + claim | various | +300 MC | 800 MC |
| 1:30-5:00 | Collect atoms aggressively | WASD | +50 MC | 850 MC |
| 5:00 | Complete 10-atom quest | auto | +200 MC | 1050 MC |
| 5:00 | Open Factory Builder | G key | 0 | 1050 MC |
| 5:00 | **Cost warning appears:** "Factory rental costs 2000 MC/month" | — | 0 | 1050 MC |
| 5:00 | **Cannot afford!** | — | — | — |
| 5:00-15:00 | Must collect more atoms | WASD | +40 atoms (~134 MC) | 1184 MC |
| 15:00 | Still can't afford factory (need 2000 MC) | — | — | — |
| 15:00-30:00 | Keep collecting | WASD | +60 atoms (~200 MC) | 1384 MC |
| 30:00 | **END** | | | **1384 MC, ~110 atoms, NO factory** |

**Rating:** FAILURE. Factory is too expensive for 30-min session. Need ~45 min or slag sales first.

---

### PATH 5: "The Optimal Speedrunner" (Maximum MC in 30 min)
**Strategy:** Claim daily, complete quests, buy cheap slag, H2SO4 leach on powder (fastest), sell V2O5.

| Time | Action | Keys | MC Change | Running Total |
|------|--------|------|-----------|---------------|
| 0:00 | Skip tutorial quickly | P, D, R, S, C fast | +4 atoms | 513 MC |
| 0:30 | Claim daily | click | +200 MC | 713 MC |
| 0:35 | First Atom quest | auto | +100 MC | 813 MC |
| 0:40 | Use teleport pad to Slakkenspoor | walk to pad (30s) + step on | 0 | 813 MC |
| 0:43 | Arrive at Slakkenspoor instantly | — | 0 | 813 MC |
| 0:45 | Buy slag | S → Buy | -50 MC | 763 MC |
| 0:50 | Hammer crush | click ×8 | 0 | 763 MC |
| 1:00 | Machine grind to "ground" | click Grind | -200 MC | 563 MC |
| 1:05 | Select H2SO4 + ground size | clicks | 0 | 563 MC |
| 1:10 | Start leach | click START | -100 MC | 463 MC |
| 1:10 | **Leach timer: ground + H2SO4 = ~720 min = ~12 real min** | — | — | — |
| 1:10-5:00 | Collect atoms near factory | WASD | +15 atoms (~50 MC) | 513 MC |
| 5:00 | 10-atom quest complete | auto | +200 MC | 713 MC |
| 5:00 | Buy Classic Boba (+25% MC) | B key, click | -25 MC | 688 MC |
| 5:00-12:00 | Collect atoms with coin boost | WASD | +28 atoms (~117 MC × 1.25) | 834 MC |
| 13:10 | **Leach complete!** Extract. | S → Monitor → Extract | 0 | 834 MC |
| 13:15 | Sell V2O5 | X key → V2O5 → Sell | +500 MC | **1334 MC** |
| 13:20 | Sell Fe2O3 + TiO2 + others | X key, clicks | +120 MC | 1454 MC |
| 13:25 | Buy 2nd batch slag | S → Buy | -50 MC | 1404 MC |
| 13:30 | Hammer + grind + H2SO4 leach #2 | clicks | -300 MC | 1104 MC |
| 13:30-25:00 | Collect atoms | WASD | +46 atoms (~193 MC) | 1297 MC |
| 25:30 | **2nd leach complete!** Extract + sell | S, X, clicks | +620 MC | **1917 MC** |
| 25:35 | Buy Matcha Latte (+20% speed) | B key | -30 MC | 1887 MC |
| 25:35-30:00 | Sprint-collect atoms at 19.2 stud/s | WASD (faster!) | +22 atoms (~92 MC) | 1979 MC |
| 30:00 | **END** | | | **~1979 MC, ~125 atoms, 2 leach cycles, V2O5 sold** |

**Rating:** EXCELLENT. Best realistic 30-min outcome.

---

### PATH 6: "The Miner" (Mining path)
**Strategy:** Rush to buy mining plot, deploy equipment.

| Time | Action | Keys | MC Change | Running Total |
|------|--------|------|-----------|---------------|
| 0:00-1:30 | Tutorial + claim | various | +300 MC | 800 MC |
| 1:30 | Open Mining GUI | V key | 0 | 800 MC |
| 1:30 | Browse exploration licenses | click Explore tab | 0 | 800 MC |
| 1:35 | Buy cheapest license | click | -800 MC | **0 MC!** |
| 1:35 | **Broke!** No money for equipment | — | — | — |
| 1:35-15:00 | Must collect atoms to earn back | WASD | +54 atoms (~181 MC) | 181 MC |
| 15:00-30:00 | Continue collecting | WASD | +60 atoms (~200 MC) | 381 MC |
| 30:00 | **END** | | | **381 MC, ~114 atoms, 1 unexplored plot** |

**Rating:** TERRIBLE. Mining is a long-term investment, not viable in 30 min.

---

### PATH 7: "The Molecule Builder" (Chemistry-focused)
**Strategy:** Collect atoms, build molecules for MC.

| Time | Action | Keys | MC Change | Running Total |
|------|--------|------|-----------|---------------|
| 0:00-1:30 | Tutorial + claim | various | +300 MC | 800 MC |
| 1:30-10:00 | Collect H and O atoms | WASD (Nexus Hub) | +34 atoms (~114 MC) | 914 MC |
| 10:00 | Open Recipe Book | R key | 0 | 914 MC |
| 10:05 | Build H2O (2H + 1O = 100 MC) | click Build | +100 MC | 1014 MC |
| 10:10 | Build H2 (2H = 60 MC) | click Build | +60 MC | 1074 MC |
| 10:15 | Build NaCl (if have Na + Cl = 100 MC) | click | +100 MC | 1174 MC |
| 10:15-20:00 | Collect more atoms for recipes | WASD | +40 atoms (~134 MC) | 1308 MC |
| 20:00-25:00 | Build more molecules | R, clicks | +300 MC (3-5 molecules) | 1608 MC |
| 25:00-30:00 | Final collection sprint | WASD | +20 atoms (~67 MC) | 1675 MC |
| 30:00 | **END** | | | **~1675 MC, ~94 atoms, 5-8 molecules** |

**Rating:** GOOD. Solid income through molecule building.

---

### PATH 8: "The Bubble Tea Addict" (Worst path)
**Strategy:** Spend all money on bubble tea, wander aimlessly.

| Time | Action | Keys | MC Change | Running Total |
|------|--------|------|-----------|---------------|
| 0:00-1:30 | Tutorial + claim | various | +300 MC | 800 MC |
| 1:30 | Walk to Bubble Tea Bar | WASD | 0 | 800 MC |
| 2:00 | Buy Lychee Fizz (60 MC) | B key, click | -60 MC | 740 MC |
| 2:05 | Buy Brown Sugar Pearl (50 MC) | click | -50 MC | 690 MC |
| 2:15 | Buy Matcha Latte (30 MC) | click | -30 MC | 660 MC |
| 2:25 | Buy Taro Milk Tea (40 MC) | click | -40 MC | 620 MC |
| 2:30-30:00 | Wander with buffs but don't use them | WASD | +110 atoms (~368 MC) | 988 MC |
| 30:00 | **END** | | | **988 MC, ~110 atoms, 4 teas consumed** |

**Rating:** POOR. Buffs wasted if not applied to production.

---

### PATH 9: "The Trader" (Social/market path)
**Strategy:** Trade atoms with other players, use market bidding.

| Time | Action | Keys | MC Change | Running Total |
|------|--------|------|-----------|---------------|
| 0:00-1:30 | Tutorial + claim | various | +300 MC | 800 MC |
| 1:30-10:00 | Collect rare atoms | WASD (Quantum Lab zone for rare bonus) | +34 atoms | 914 MC |
| 10:00 | Open Atom Trading | . (period) key | 0 | 914 MC |
| 10:05 | Trade common atoms for rare ones | clicks | ±0 MC | 914 MC |
| 10:10 | Place market bid for V2O5 | X key → bid | -500 MC (escrow) | 414 MC |
| 10:15-25:00 | Collect + molecule build | WASD, R | +60 atoms + 400 MC molecules | 814 MC |
| 25:00 | Bid expires (no sellers in teaser) | auto | +500 MC (refund) | 1314 MC |
| 25:00-30:00 | Final collection | WASD | +20 atoms (~67 MC) | 1381 MC |
| 30:00 | **END** | | | **1381 MC, ~114 atoms, 3-4 molecules** |

**Rating:** NEUTRAL. Trading features need multi-player to shine.

---

### PATH 10: "The HSE Responder" (Safety track)
**Strategy:** Select HSE role, respond to incident.

| Time | Action | Keys | MC Change | Running Total |
|------|--------|------|-----------|---------------|
| 0:00-1:30 | Tutorial + claim | various | +300 MC | 800 MC |
| 1:30-5:00 | Collect 20 O atoms (HSE Officer unlock) | WASD | +20 atoms (~67 MC) | 867 MC |
| 5:00 | Open Safety GUI | click in Dashboard | 0 | 867 MC |
| 5:05 | Select "HSE Officer" role | click Select | 0 | 867 MC |
| 5:10 | Start "Acid Spill in Tank Farm" | click RESPOND | 0 | 867 MC |
| 5:15 | Teleported to incident arena | — | 0 | 867 MC |
| 5:15-10:00 | Use abilities: Evacuation, Containment, SCBA | click 1/2/3, WASD dodge | 0 | 867 MC |
| 10:00 | Incident contained! | auto | +500 MC | **1367 MC** |
| 10:05 | Teleported back to hub | auto | 0 | 1367 MC |
| 10:05-20:00 | Collect atoms + attempt 2nd incident | WASD, GUI | +40 atoms + 1000 MC mission | 2501 MC |
| 20:00-30:00 | Collect + molecule build | WASD, R | +40 atoms + 200 MC | 2701 MC |
| 30:00 | **END** | | | **~2701 MC, ~100 atoms, 2 incidents resolved** |

**Rating:** BEST. Highest MC if skill-based content works well.

---

## SUMMARY — RANKED BY 30-MINUTE OUTCOME

| Rank | Path | Strategy | Final MC | Atoms | Products | Rating |
|------|------|----------|----------|-------|----------|--------|
| 1 | **PATH 10** | HSE Responder | **2701 MC** | ~100 | 2 incidents | BEST |
| 2 | **PATH 5** | Optimal Speedrunner | **1979 MC** | ~125 | 2 V2O5 sold | EXCELLENT |
| 3 | **PATH 7** | Molecule Builder | **1675 MC** | ~94 | 5-8 molecules | GOOD |
| 4 | **PATH 1** | The Collector | **1398 MC** | ~119 | none | SAFE |
| 5 | **PATH 4** | Entrepreneur | **1384 MC** | ~110 | no factory | BLOCKED |
| 6 | **PATH 9** | The Trader | **1381 MC** | ~114 | 3-4 molecules | NEUTRAL |
| 7 | **PATH 3** | Water Leacher | **1098 MC** | ~104 | none (too slow) | BAD |
| 8 | **PATH 2** | Slag Processor | **988 MC** | ~100 | 1 leach done | MODERATE |
| 9 | **PATH 8** | Bubble Tea Addict | **988 MC** | ~110 | 4 teas wasted | POOR |
| 10 | **PATH 6** | The Miner | **381 MC** | ~114 | 1 empty plot | TERRIBLE |

---

## KEY FINDINGS

### What Works Well
1. **Daily claim (200 MC) + First Atom quest (100 MC)** gives 300 MC within 2 minutes — strong early boost
2. **Teleport pads** save 2+ minutes per zone transition
3. **Bubble tea buffs** are valuable IF combined with atom collection or slag processing
4. **Molecule building** (R key) is an underrated income source — H2O = 100 MC from just 3 atoms
5. **HSE incidents** are the highest MC/min activity (500-2000 MC per 5-min mission)

### What Needs Fixing
1. **Deep mining is a trap** for new players — premium licenses remain expensive, but the Practice Outcrop now costs 200 MC and can be explored by hand for free
2. **Leach timing must be communicated clearly** — the current OTAP clock is 10 real minutes per game day, and particle size/process controls materially change completion time
3. **Factory rent (2000 MC)** is impossible in 30 min — need ~45+ min or prior session wealth
4. **Ground/Powder crush costs** (200/500 MC) are steep for new players
5. **Atom spawn rate** limits collection to ~4/min regardless of strategy

### Recommended Balance Changes
1. Use the 200 MC Practice Outcrop and free hand survey as the tutorial mine; keep premium deposits gated behind equipment and capital
2. Keep reagent/particle-size trade-offs visible in the leach estimate and avoid stale “days” messaging
3. Add "First Molecule" quest: build H2O = 200 MC bonus
4. Consider factory "trial rental" (500 MC for 1 game month)
5. Increase atom spawn density at Nexus Hub for first 5 minutes

---

## DETAILED KEYBOARD/MOUSE TIMELINE (Optimal Path — PATH 5)

```
TIME    KEY/MOUSE           ACTION                          SCREEN STATE
----    ---------           ------                          ------------
0:00    —                   Game loads                      Loading screen (20 controls)
0:03    —                   Tutorial Step 1 auto            "Welcome to Moleculia!"
0:09    W key (hold)        Walk toward atom                3rd person, atom glowing ahead
0:14    —                   Auto-collect (proximity)        "+1 H (COMMON) +1 MC" popup
0:15    P key               Open Periodic Table             Tutorial Step 3 clears
0:16    P key               Close Periodic Table            Back to 3D view
0:17    D key               Open Dashboard                  Tutorial Step 4
0:18    D key               Close Dashboard                 
0:19    W+A keys            Walk toward next atoms          Collecting 3 more
0:30    W key               Walking, auto-collecting        Tutorial Step 5 completes
0:31    R key               Open Recipe Book                Tutorial Step 6 "Build a Molecule!"
0:32    R key               Close Recipe Book               
0:33    S key               Open Slag Processing            Tutorial Step 7
0:34    Esc key             Close all overlays              
0:35    C key               Process Control Panel           Tutorial Step 8
0:36    Esc key             Close                           
0:44    —                   Tutorial auto-completes         Steps 9+10 auto-advance
0:50    click HUD           Claim daily bonus               "+200 MC" popup, total: 713 MC
0:52    —                   "First Atom" quest auto         "+100 MC", total: 813 MC
0:55    W key (hold)        Walk toward teleport pad        Pad at (30, 14, -20)
1:00    —                   Step on pad                     Teleported to Slakkenspoor!
1:03    S key               Open Slag Processing GUI        3-tab interface appears
1:05    click "Buy"         Buy raw slag chunk              -50 MC, slag in inventory
1:07    click hammer ×1     Hammer the slag                 CLANG sound, progress 1/8
1:08    click hammer ×2     Continue                        Progress 2/8
1:09    click hammer ×3     Continue                        Progress 3/8
1:10    click hammer ×4     Continue                        Progress 4/8
1:11    click hammer ×5     Continue                        Progress 5/8
1:12    click hammer ×6     Continue                        Progress 6/8
1:13    click hammer ×7     Continue                        Progress 7/8
1:14    click hammer ×8     Final hammer!                   "Crushed!" bar fills green
1:16    click "BALL MILL"   Grind to "ground" size          -200 MC, now 563 MC
1:18    click Leach tab     Switch to leaching tab          Reagent cards shown
1:20    click H2SO4 Select  Choose sulfuric acid            "Selected: Sulfuric Acid"
1:22    click "Ground" btn  Choose ground particle size     Time estimate appears
1:24    click START LEACH   Begin leaching!                 -100 MC, timer starts: "~12 min"
1:25    Esc key             Close Slag GUI                  Back to 3D world
1:25    W key               Walk around factory collecting  Atoms spawn in factory zone
2:00    —                   Auto-collect atoms              Building up atom inventory
5:00    —                   10-atom quest auto-completes    +200 MC, total: ~713 MC
5:05    B key               Open Bubble Tea Bar             6 drink options shown
5:07    click "Classic Boba" Buy cheapest tea (+25% MC)     -25 MC, boba cup appears in hand!
5:08    Esc key             Close Bubble Tea                Cup visible, buff icon on HUD
5:10    W+D keys            Walk and collect with bonus     +25% MC on all atoms for 5 min
10:00   —                   Buff expires                    Cup disappears from hand
13:10   —                   NOTIFICATION: "Leach complete!" Fanfare sound plays
13:12   S key               Open Slag Processing            
13:13   click Monitor tab   Switch to monitor               Leach shows "COMPLETE!"
13:15   click "EXTRACT"     Extract products                V, Fe, Ca, Mn atoms appear!
13:17   Esc key             Close Slag GUI                  
13:18   X key               Open Product Exchange           8 products with prices shown
13:20   click V2O5 "Sell"   Sell vanadium pentoxide         +500 MC! Cha-ching sound!
13:22   click Fe2O3 "Sell"  Sell iron oxide                 +50 MC
13:23   click TiO2 "Sell"   Sell titanium dioxide           +200 MC (if had Ti atoms)
13:25   Esc key             Close Product Exchange          
13:26   S key               Start 2nd leach cycle           Repeat: buy→crush→grind→leach
13:40   Esc key             Close, continue collecting      2nd leach running (~12 min)
25:30   —                   2nd leach complete!             
25:32   S→Extract→X→Sell    Extract and sell again          +620 MC
25:40   B key               Buy Matcha Latte (+speed)       -30 MC, 20% faster walking!
25:45   W key (hold)        Sprint-collect atoms            19.2 stud/s instead of 16
30:00   —                   SESSION END                     ~1979 MC, 125 atoms

TOTAL INPUTS: ~85 key presses, ~45 mouse clicks, 30 minutes
```

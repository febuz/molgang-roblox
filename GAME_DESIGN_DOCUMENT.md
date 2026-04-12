# 🎮 MOLGANG - Complete Game Design Document (GDD)

**Version:** 2.0 - Next Level Experience  
**Status:** Active Development (Updated 2026-04-12)  
**Platform:** Roblox (Primary), Web/VR (Future)  
**Target Audience:** Ages 8-99 (Educational + Entertainment)  
**Development Timeline:** 200+ hours (8-12 weeks)  
**Primary Focus:** Fertilizer Chemistry Track (Educational Core)

---

## 📖 Table of Contents

1. [Game Overview](#game-overview)
2. [Core Vision & Values](#core-vision--values)
3. [Game Tracks](#game-tracks)
   - [Track 1: Fertilizer Chemistry (PRIMARY)](#track-1-fertilizer-chemistry-primary)
   - [Track 2: Quantum Racing (SECONDARY)](#track-2-quantum-racing-secondary)
   - [Track 3: Superhero Adventure (SECONDARY)](#track-3-superhero-adventure-secondary)
4. [Complete Storylines](#complete-storylines)
5. [Progression Systems](#progression-systems)
6. [World & Environment](#world--environment)
7. [Characters & NPCs](#characters--npcs)
8. [Gameplay Mechanics](#gameplay-mechanics)
9. [UI/UX Design](#uiux-design)
10. [Technical Specifications](#technical-specifications)

---

## Game Overview

### What is MOLGANG?

**MOLGANG** is an educational entertainment game that teaches **chemistry and fertilizer production** through engaging gameplay, while offering multiple parallel tracks for different player preferences:

- **Chemistry learners** focus on the Fertilizer Track (scientific progression)
- **Competitive players** enjoy Quantum Racing (skill-based competition)
- **Story-driven players** experience Superhero Adventure (narrative progression)

### Core Loop (All Tracks)

```
Collect Elements → Process Chemistry → Produce Fertilizer → Earn Rewards → Unlock New Areas
```

### Key Statistics

- **Player Base Target:** 5,000+ MAU (monthly active users)
- **Daily Active Users:** 1,000+ 
- **Average Session:** 30-60 minutes
- **Progression Time:** 50-100 hours to reach endgame
- **Performance Target:** 60 FPS, <1 GB memory

---

## Core Vision & Values

### Educational Mission
```
Primary: Teach fertilizer chemistry through interactive gameplay
Secondary: Explain periodic table elements and their uses
Tertiary: Inspire environmental stewardship
```

### Game Philosophy

1. **Learning Through Play** - Chemistry learned naturally, not lectured
2. **Multiple Paths** - Different playstyles, same educational core
3. **Inclusive Design** - Accessible to all ages, genders, skill levels
4. **Progressive Difficulty** - Tutorials → Expert challenges
5. **Rewarding Mastery** - Skills unlock cosmetics, power-ups, story progression

### Values

- 🌍 **Environmental Responsibility** - Game teaches sustainable practices
- 👥 **Inclusivity** - All genders, abilities, learning styles welcome
- 🎓 **Educational Integrity** - Accurate chemistry, not oversimplified
- 🎮 **Fun First** - Learning happens because gameplay is engaging
- 🏆 **Achievement-Driven** - Clear progression paths, rewarding milestones

---

## Game Tracks

### TRACK 1: Fertilizer Chemistry (PRIMARY)

**This is the educational CORE of MOLGANG. All other tracks build on this.**

#### Track Overview

```
Goal: Master fertilizer chemistry and become a soil scientist
Duration: 40-60 hours to completion
Difficulty: Progressive (Beginner → Intermediate → Expert)
Playstyle: Learning, experimentation, achievement-focused
Target Players: Students, chemistry enthusiasts, farmers
```

#### Story: "The Great Soil Crisis"

**Act 1: Discovery (Hours 0-15)**

Setting: Small village with dying crops

```
Chapter 1: The Withering Fields (Tutorial)
├─ NPC: Farmer Chen (elderly, patient)
├─ Problem: Crops are failing
├─ Solution: Soil needs nutrients (nitrogen, phosphorus, potassium)
├─ Player Discovery: Basic NPK concept
└─ Reward: Starter nitrogen plant

Chapter 2: First Fertilizer (Learning)
├─ NPC: Dr. Femke (chemistry professor)
├─ Challenge: Make simple compost
│   └─ Ingredients: Organic matter (leaves, waste)
│   └─ Process: Heating → decomposition → finished compost
├─ Mechanics: Mixing gameplay (drag-drop chemistry)
├─ Science Taught: Decomposition, nutrient cycling
└─ Reward: Compost recipe, fertilizer plant unlock

Chapter 3: The NPK Solution (Experimentation)
├─ NPC: Vanadis (agricultural engineer)
├─ Challenge: Balance N-P-K for specific crops
│   ├─ Nitrogen (N): Plant growth, green leaves
│   ├─ Phosphorus (P): Root development, energy
│   └─ Potassium (K): Overall health, disease resistance
├─ Minigame: NPK Balance Puzzle
│   └─ Adjust ratios, test on crops, see results
├─ Science Taught: NPK, nutrient balance, crop-specific needs
└─ Reward: Unlock 3 crop types (wheat, corn, rice)
```

**Act 2: Mastery (Hours 15-40)**

Setting: Regional farm cooperative, expanding operations

```
Chapter 4: Industrial Scale (Advanced Fertilizers)
├─ NPC: Kwantje (quantum physicist turned agronomist)
├─ Challenge: Create commercial fertilizers
│   ├─ Urea (high nitrogen)
│   ├─ Phosphate rock (phosphorus)
│   └─ Potassium chloride (potassium)
├─ Minigame: Chemical Reaction Chain
│   ├─ Multi-step synthesis
│   ├─ Heat control (temperature management)
│   └─ Pressure systems (if temp too high/low, reaction fails)
├─ Science Taught: Industrial chemistry, Haber process, efficiency
└─ Reward: Unlock large-scale production, new crop types
  
Chapter 5: Organic vs Synthetic (Sustainability)
├─ NPC: Yusuf (market trader, environmental activist)
├─ Branching Storyline:
│   ├─ Path A: Organic fertilizers (compost, manure, biosolids)
│   ├─ Path B: Synthetic fertilizers (chemical, efficient, concentrated)
│   └─ Path C: Hybrid approach (best of both)
├─ Gameplay: Two parallel production lines
│   ├─ Organic: Slower production, lower yields, environmental +10
│   └─ Synthetic: Faster production, higher yields, environmental -10
├─ Science Taught: Sustainability, trade-offs, environmental impact
└─ Reward: Unlock both production methods, choice affects story

Chapter 6: Soil Health Testing (Microbiology)
├─ NPC: Quiz the Robot (education bot)
├─ Challenge: Test soil composition
│   ├─ pH levels (acidic vs alkaline)
│   ├─ Organic matter content
│   ├─ Microbial health (earthworms, bacteria)
│   └─ Heavy metal contamination
├─ Minigame: Soil Analysis Lab
│   ├─ Collect soil samples
│   ├─ Run tests (visual feedback)
│   ├─ Interpret results
│   └─ Recommend treatments
├─ Science Taught: Soil science, microbiology, environmental testing
└─ Reward: Soil analysis tool unlocked, diagnostic quests
```

**Act 3: Crisis & Resolution (Hours 40-60)**

Setting: Regional environmental crisis

```
Chapter 7: The Contamination Crisis
├─ NPC: All previous NPCs appear
├─ Crisis: Agricultural runoff has contaminated local waterway
├─ Challenge: Fix the problem using chemistry knowledge
│   ├─ Nitrogen runoff causing algal bloom
│   ├─ Phosphorus enrichment in water
│   └─ Soil erosion from improper farming
├─ Minigame: Complex Chemistry Problem
│   ├─ Multi-step solution (not single-answer)
│   ├─ Trade-offs (quick fix vs long-term solution)
│   └─ Player choice affects ending
├─ Science Taught: Water chemistry, nutrient cycling, ecosystem impact
└─ Story Branch: Decision shapes final chapter

Chapter 8: The Solution (Ending - Multiple Outcomes)
├─ Ending A: Organic Pioneer (chose organic path)
│   ├─ Slower recovery, but sustainable
│   ├─ Unlock: Organic specialist cosmetics
│   └─ New role: Mentor to other farmers
├─ Ending B: Efficiency Expert (chose synthetic path)
│   ├─ Fast recovery, precision farming adopted
│   ├─ Unlock: Industrial scientist cosmetics
│   └─ New role: Technical consultant
├─ Ending C: Balanced Steward (chose hybrid)
│   ├─ Moderate recovery, sustainable AND productive
│   ├─ Unlock: Soil scientist cosmetics
│   └─ New role: Environmental consultant
└─ Post-Game: Endless mode (keep playing, unlock advanced recipes)
```

#### Core Mechanics: Fertilizer Production

**System 1: Element Collection**

```
How it works:
├─ Harvest crops, animals, minerals from game world
├─ Elements: N, P, K, S, Ca, Mg, Fe, Zn, etc.
├─ Collection methods:
│   ├─ Farming (grow & harvest crops)
│   ├─ Mining (extract minerals)
│   ├─ Composting (convert organic waste)
│   └─ Trading (buy from other players)
└─ Storage: Inventory system (player can hold 500 units)

Progression:
├─ Early: Manual collection (time-based farming)
├─ Mid: Unlocked farms (passive income every 60 seconds)
├─ Late: Autonomous production (factories run without input)
```

**System 2: Fertilizer Synthesis**

```
How it works:
├─ Open Fertilizer Lab (in Nexus or home)
├─ Select recipe (unlock as you progress)
├─ Add required elements:
│   ├─ Display requirements clearly
│   ├─ Drag elements into reaction chamber
│   ├─ System validates (no wrong combinations, but different results)
│   └─ Heating/cooling minigame (control temperature)
├─ Wait for processing (5 sec to 5 min depending on recipe)
└─ Collect finished fertilizer

Recipe Examples:
├─ Compost (simple, 10 organic matter)
│   └─ Output: 10 general fertilizer, 5 XP
├─ Urea (intermediate, 5N + 1P + 1K + energy)
│   └─ Output: 8 urea, 20 XP
├─ NPK Balanced (advanced, 3N + 2P + 2K + 1S)
│   └─ Output: 8 balanced fertilizer, 50 XP
└─ Custom Mix (expert, any elements)
    └─ Output: Unknown results, high XP reward if correct
```

**System 3: Crop Testing**

```
How it works:
├─ Select a fertilizer you made
├─ Choose a crop type (wheat, corn, rice, lettuce, etc.)
├─ Plant fertilized crop
├─ Wait for growth (5-10 minutes real time OR instant with premium)
├─ Measure results:
│   ├─ Yield (how much produced)
│   ├─ Quality (appearance, nutritional value)
│   ├─ Time to harvest (faster or slower)
│   └─ Environmental impact (carbon footprint calculated)
└─ Feedback: What worked, what didn't

Progression:
├─ Early: Simple binary (good/bad fertilizer)
├─ Mid: Detailed feedback (needs more N, too much P, etc.)
├─ Late: Complex metrics (yield per water unit, carbon efficiency)
```

**System 4: Research & Unlocking**

```
Knowledge Tree (Similar to Tech Tree):
├─ Tier 1: Basic Nutrients
│   ├─ Nitrogen (N)
│   ├─ Phosphorus (P)
│   └─ Potassium (K)
│
├─ Tier 2: Secondary Nutrients
│   ├─ Sulfur (S)
│   ├─ Calcium (Ca)
│   └─ Magnesium (Mg)
│
├─ Tier 3: Micronutrients
│   ├─ Iron (Fe)
│   ├─ Zinc (Zn)
│   ├─ Copper (Cu)
│   ├─ Boron (B)
│   ├─ Molybdenum (Mo)
│   └─ Manganese (Mn)
│
├─ Tier 4: Advanced Techniques
│   ├─ Slow-release fertilizers
│   ├─ Foliar feeding (spraying leaves)
│   ├─ Soil amendments (limestone, sulfur)
│   └─ Microbial inoculants
│
└─ Tier 5: Expert Methods
    ├─ Precision agriculture (drones, sensors)
    ├─ Hydroponic systems
    ├─ Vertical farming
    └─ Space farming (joke tech, but possible)

How to Unlock:
├─ Complete story missions (mandatory unlocks)
├─ Achieve chemistry challenges (bonus unlocks)
├─ Reach XP milestones (passive unlocks)
└─ Discover recipes through experimentation (secret unlocks)
```

#### Progression: Fertilizer Chemistry Track

```
Level 1-10: Beginner Scientist
├─ Tutorial: NPK basics, compost making
├─ Crops: 3 types (wheat, corn, rice)
├─ Fertilizers: 2 types (compost, manure)
├─ Production: Manual only (player must act)
└─ Cosmetics: Basic scientist outfit

Level 11-25: Intermediate Chemist
├─ Elements: 6 types (N, P, K, S, Ca, Mg)
├─ Crops: 8 types (add lettuce, potato, tomato, bean, carrot, pumpkin)
├─ Fertilizers: 5 types (urea, phosphate, potassium chloride, NPK, custom)
├─ Production: Unlock 1 automated farm
└─ Cosmetics: Advanced scientist outfit, element badges

Level 26-50: Advanced Specialist
├─ Elements: 13 types (add all micronutrients)
├─ Crops: 15 types (add exotic crops: cocoa, coffee, tea)
├─ Fertilizers: 15 types (specialized for each crop)
├─ Production: Unlock 3 automated farms + factory
└─ Cosmetics: Expert scientist outfit, specialization badges

Level 51-75: Master Scientist
├─ Unlock: All basic recipes
├─ Challenge: Create custom optimized mixes
├─ Production: Full automation (factories run 24/7)
├─ Research: Discover secret recipes
└─ Cosmetics: Master scientist outfit, achievement badges

Level 76-100: Legend/Soil Scientist
├─ Unlock: All advanced & expert techniques
├─ Challenge: Environmental problem-solving quests
├─ Production: Mega factories (10,000+ units/day)
├─ Role: Can mentor players, create public recipes
└─ Cosmetics: Legendary scientist outfit, unique aura
```

#### Rewards System: Fertilizer Chemistry Track

```
Experience Points (XP):
├─ Completing story missions: 100-1000 XP
├─ Successful fertilizer synthesis: 10-100 XP
├─ Testing crops: 5-50 XP
├─ Discovering new recipes: 500 XP
└─ Helping other players: 25 XP

In-Game Currency:
├─ MolCoins (earned through gameplay)
│   ├─ Selling surplus fertilizer: 1 coin per 5 units
│   ├─ Daily bonuses: 100 coins
│   ├─ Milestones: 500 coins
│   └─ Top leaderboard: 1000 coins
├─ PremiumCoin (optional purchase)
│   ├─ Speed up crop growth (5 min → instant)
│   ├─ Unlock cosmetics
│   └─ Get bonus storage
└─ Environmental Points (unique to this track)
    ├─ Using organic fertilizers: +1 point
    ├─ Sustainable practices: +5 points
    └─ Unlock exclusive "Green Scientist" cosmetics

Cosmetics & Customization:
├─ Scientist Outfits (10 variants)
├─ Lab Themes (5 themes: clean, rustic, industrial, nature, futuristic)
├─ Element Badges (18 badges, one per element)
├─ Achievement Medals (25 medals for milestones)
├─ Fertilizer Bottle Skins (change appearance of produced items)
└─ Aura Effects (glow while wearing)

Unlockable Features:
├─ Advanced recipes
├─ Automated farms
├─ Large factories
├─ Public recipe sharing
├─ Mentorship role
└─ Special events (seasonal challenges)
```

#### Fertilizer Chemistry Track - Leaderboards

```
Weekly Leaderboards:
├─ Highest Production (total fertilizer made this week)
├─ Best Efficiency (most yield per resource used)
├─ Most Sustainable (lowest environmental impact)
├─ Fastest Grower (most crops grown successfully)
└─ Richest Scientist (most MolCoins earned)

Monthly Leaderboards:
├─ Same as weekly, reset each month
├─ Top 100 earn MolCoins + exclusive cosmetics

All-Time Leaderboards:
├─ Total XP Gained
├─ Total Fertilizer Produced
├─ Unique Recipes Discovered
├─ Environmental Score
└─ Player Mentored Count
```

---

### TRACK 2: Quantum Racing (SECONDARY)

**Competitive, fast-paced gameplay with quantum mechanics theme**

#### Track Overview

```
Goal: Master quantum racing and become the fastest Atom Racer
Duration: 30-50 hours to completion
Playstyle: Action, competition, skill-based
Target Players: Competitive gamers, racing fans
```

#### Story: "The Quantum Velocity Championship"

```
Act 1: Discovery (Hours 0-10)
├─ Introduce Kwantje (quantum specialist NPC)
├─ Learn basic racing mechanics
├─ Complete tutorial races on Beginner track
└─ Unlock first racing vehicle

Act 2: Rising Champion (Hours 10-30)
├─ Compete in weekly races
├─ Unlock harder tracks
├─ Discover quantum power-ups
├─ Climb leaderboards
└─ Face rival racers (AI competitors)

Act 3: The Championship (Hours 30-50)
├─ Final tournament bracket
├─ Face legendary racers
├─ Unlock rare cosmetics
└─ Become the Quantum Racing Champion
```

#### Core Mechanics: Racing System

```
Three Race Types:
├─ Sprint (Quick 2-5 minute races)
├─ Endurance (10-30 minute races, longer tracks)
└─ Quantum Challenge (Puzzle + racing hybrid)

Vehicle Types:
├─ Novice: Basic handling, slow, forgiving
├─ Standard: Balanced handling, medium speed
├─ Advanced: Responsive, fast, harder to control
├─ Legendary: Best performance, very hard to master

Tracks (Industrial Theme):
├─ Slag Collection Course (obstacles: moving belts, toxic zones)
├─ Production Line Rush (machinery, tight corners)
├─ Contamination Cleanse (hazardous materials, reverse-race)
├─ Quantum Loop (theoretical physics-themed, mind-bending)
└─ Championship Circuit (combination of all elements)
```

#### Progression: Quantum Racing Track

```
Level 1-20: Rookie Racer
├─ Vehicles: Novice class only
├─ Tracks: Beginner only (3 tracks)
├─ Races: Single player, no multiplayer
└─ Cosmetics: Rookie outfit

Level 21-40: Pro Racer
├─ Vehicles: Unlock Standard class
├─ Tracks: Intermediate (5 tracks)
├─ Races: 4-player multiplayer races
└─ Cosmetics: Pro outfit, vehicle skins

Level 41-70: Elite Racer
├─ Vehicles: Unlock Advanced class
├─ Tracks: All tracks available
├─ Races: 8-player tournaments
└─ Cosmetics: Elite outfit, legendary skins

Level 71-100: Champion
├─ Vehicles: Legendary class
├─ Challenges: Daily/weekly special events
├─ Rewards: Unique cosmetics, MolCoins
└─ Role: Can compete for championship title
```

#### Rewards: Quantum Racing Track

```
MolCoins (earnings per race):
├─ 1st place: 100-500 coins (depending on difficulty)
├─ 2nd place: 50-250 coins
├─ 3rd place: 25-100 coins
├─ Participation: 10 coins minimum

Cosmetics:
├─ Vehicle Skins (30+ designs)
├─ Racing Suits (10+ outfits)
├─ Helmet Designs (15+ variants)
├─ Vehicle Upgrades (visual only, no gameplay advantage)
└─ Achievement Titles ("Champion", "Speed Demon", etc.)

Special Rewards:
├─ Top 10 weekly: 1000 MolCoins + exclusive cosmetic
├─ Top 3 monthly: 5000 MolCoins + legendary cosmetic
└─ Annual champion: 50,000 MolCoins + Hall of Fame entry
```

---

### TRACK 3: Superhero Adventure (SECONDARY)

**Story-driven, progression-based gameplay with chemistry superpowers**

#### Track Overview

```
Goal: Master chemistry-based superpowers, save the world
Duration: 35-50 hours to completion
Playstyle: Story-driven, action, exploration
Target Players: Story enthusiasts, all genders (especially female players)
```

#### Story: "The Chemistry Defender"

```
Act 1: Origin (Hours 0-15)
├─ Protagonist discovers chemistry knowledge grants powers
├─ Gain first power: Thermodynamics Mastery
├─ Save neighborhood from environmental crisis
└─ Unlock: Costume, basic abilities, social media following

Act 2: Rising Hero (Hours 15-35)
├─ Gain second power: Atomic Force
├─ Discover villain plot (industrial pollution)
├─ Save city from contamination
├─ Unlock: Advanced abilities, team-up missions
└─ Gain third power: Molecular Architect

Act 3: Global Crisis (Hours 35-50)
├─ Villain reveals master plan (global contamination)
├─ Final battle using all three powers
├─ Save the world
├─ Unlock: Legendary costume, endgame content, mentorship role
```

#### Three Superhero Powers (Chemistry-Based)

**Power 1: Thermodynamics Mastery**
```
Abilities:
├─ Heat Wave: Create zone of extreme heat (melt obstacles)
├─ Freeze Field: Drop temperature (freeze contaminated areas)
├─ Energy Pulse: Convert thermal energy to blast waves
└─ Thermal Vision: See heat sources (find pollution hotspots)

Cooldown: 30 seconds
Duration: 20 seconds per activation
Energy Cost: 25% of max energy per use
Applications:
├─ Melt industrial waste
├─ Freeze toxic spills
├─ Heat water for purification
└─ Power electrical systems
```

**Power 2: Atomic Force**
```
Abilities:
├─ Atomic Rearrange: Restructure matter (change obstacles)
├─ Molecular Shield: Create protective barrier
├─ Particle Acceleration: Speed boost with charged particles
└─ Atomic Sense: Detect atomic structure (find hidden materials)

Cooldown: 40 seconds
Duration: 15 seconds per activation
Energy Cost: 30% of max energy per use
Applications:
├─ Break down contaminated structures
├─ Reconstruct destroyed ecosystems
├─ Create temporary platforms
└─ Purify contaminated areas
```

**Power 3: Molecular Architect**
```
Abilities:
├─ Build Structures: Create bridges, barriers, platforms
├─ Chemical Bond Chains: Link elements together temporarily
├─ Bonding Catalyze: Speed up beneficial reactions
└─ Molecular Sense: See chemical bonds (understand environment)

Cooldown: 50 seconds
Duration: 30 seconds per activation (longest)
Energy Cost: 35% of max energy per use
Applications:
├─ Build paths through contamination
├─ Seal chemical leaks
├─ Create safe zones for people
└─ Restore damaged environments
```

#### Progression: Superhero Adventure Track

```
Level 1-30: New Hero
├─ Unlock: Thermodynamics Mastery
├─ Missions: 10 story missions
├─ Cosmetics: Basic hero suit
└─ Sidekick: None yet

Level 31-60: Rising Champion
├─ Unlock: Atomic Force
├─ Missions: 15 story missions + side quests
├─ Cosmetics: Advanced suit skins
└─ Sidekick: One AI companion unlocked

Level 61-90: World Protector
├─ Unlock: Molecular Architect
├─ Missions: 20+ story missions + daily challenges
├─ Cosmetics: Legendary suit variants
└─ Sidekick: Multiple companions available

Level 91-120: Legend
├─ All powers mastered
├─ Unlock: Endgame dungeons
├─ Cosmetics: Unique legendary outfit
└─ Role: Mentor younger heroes
```

#### Customization: Superhero Cosmetics

```
Female Hero Outfits (30+ variants):
├─ Starter: Basic suit (blue/red/green)
├─ Elemental: 
│   ├─ Thermodynamics (red/orange/yellow theme)
│   ├─ Atomic Force (green/blue/purple theme)
│   └─ Molecular Architect (cyan/white/silver theme)
├─ Seasonal:
│   ├─ Summer (light colors, short sleeves)
│   ├─ Winter (dark colors, thermal outfit)
│   ├─ Spring (pastel colors, flowers)
│   └─ Autumn (earth tones, leaves)
├─ Cultural:
│   ├─ Japanese inspired
│   ├─ Indian inspired
│   ├─ African inspired
│   ├─ European inspired
│   └─ Latin American inspired
├─ Exclusive:
│   ├─ Top 10 leaderboard reward
│   ├─ Story completion variants
│   ├─ Special event rewards
│   └─ Premium cosmetics (optional purchase)
└─ Customization:
    ├─ Color palette (12 primary colors customizable)
    ├─ Symbols (achievement-based emblems)
    ├─ Aura effects (glow based on power)
    └─ Cape/cloak style (8 variants)

Male Hero Outfits (Available for all players):
├─ Similar to female outfits
├─ Alternative designs if preferred
└─ Same customization options
```

#### Rewards: Superhero Adventure Track

```
Experience & Currency:
├─ Story missions: 500-2000 XP
├─ Side quests: 200-500 XP
├─ Daily challenges: 100 XP + 100 MolCoins
└─ Environmental cleanup: 50-200 XP + resources

Cosmetics:
├─ Story completion: Outfit unlocks (not purchasable)
├─ Milestone achievements: Badges, aura effects
├─ Special events: Limited-time cosmetics
└─ Premium cosmetics: Optional real-money purchases

Progression Rewards:
├─ New powers (mandatory story unlocks)
├─ Advanced abilities (unlocked via challenges)
├─ Sidekick companions (unlocked at levels 30, 60, 90)
├─ Home base expansions (decorations, upgrades)
└─ Mentorship role (can guide new heroes)
```

---

## Complete Storylines

### Global Story: "The Element Crisis"

**Setting:** Year 2035, near-future Earth with advanced technology

**World State:**
```
- Climate change has caused agricultural collapse
- Soil degradation in 40% of farmland
- Corporations monopolizing food production
- Environmental groups fighting for change
- Emerging quantum technology offers hope
```

**Inciting Incident:**
```
A massive contamination event occurs:
├─ Industrial chemical spill into regional aquifer
├─ Crops failing across multiple counties
├─ Local communities need food urgently
└─ Government declares environmental emergency
```

**Three Parallel Responses:**

**Response 1: The Farmers (Fertilizer Chemistry Track)**
```
Farmer Chen: "We need to fix our soil"
→ Player learns traditional farming + modern chemistry
→ Produces organic solutions → Saves local farms
→ Discovers corporate conspiracy in Act 2
→ Act 3: Chooses sustainable future
```

**Response 2: The Racers (Quantum Racing Track)**
```
Kwantje: "We need to move fast and adapt"
→ Player races against climate, against competitors
→ Faster solutions, quantum mechanics as theme
→ Discovers AI racing technology could help
→ Act 3: Racing tournament for resources
```

**Response 3: The Heroes (Superhero Adventure Track)**
```
Chemistry Teacher: "We have tools they forgot about"
→ Player gains chemistry superpowers
→ Directly fights contamination
→ Discovers villain behind spill
→ Act 3: Epic showdown, save everyone
```

**Story Integration:**

```
All three tracks intersect at key moments:
├─ Intro: All players witness the contamination
├─ Mid-point: Player meets characters from other tracks
├─ Crisis: All three tracks' stories converge
├─ Resolution: Choices in your track affect overall world
└─ Ending: Different outcomes based on which track you prioritized
```

**Hidden Ending:**
```
If player completes all three tracks:
├─ Unlock: Master storyline
├─ Cutscene: All three protagonists meet
├─ Choice: Combine methods for ultimate solution
├─ Reward: Legendary cosmetics from all tracks
└─ New role: Council member, shape game's future
```

---

## Progression Systems

### Experience & Leveling

```
Universal Level (1-120)
├─ Earned in all activities
├─ Affects base stats (health, damage, speed)
├─ Unlocks new content
└─ No level cap for post-game

Track-Specific Levels
├─ Chemistry Level (1-100): Farm mastery
├─ Racing Level (1-100): Speed mastery
└─ Adventure Level (1-120): Power mastery
```

### Skill Trees

```
Chemistry Track Skills:
├─ Tier 1: Basic nutrients (5 skills)
├─ Tier 2: Advanced synthesis (10 skills)
├─ Tier 3: Optimization (15 skills)
└─ Tier 4: Mastery (20 skills)

Racing Track Skills:
├─ Tier 1: Handling (5 skills)
├─ Tier 2: Speed control (10 skills)
├─ Tier 3: Racing techniques (15 skills)
└─ Tier 4: Championship level (20 skills)

Adventure Track Skills:
├─ Tier 1: Power control (5 skills)
├─ Tier 2: Combo attacks (10 skills)
├─ Tier 3: Advanced abilities (15 skills)
└─ Tier 4: Legendary techniques (20 skills)
```

### Achievements & Badges

```
Story Achievements (20 total):
├─ Completing each chapter
├─ Finishing all three tracks
└─ Unlocking all story branches

Challenge Achievements (30 total):
├─ Reaching high leaderboard positions
├─ Discovering secret recipes/routes
├─ Helping other players
└─ Special event completions

Collection Achievements (25 total):
├─ Collecting all cosmetics
├─ Finding all secrets
├─ Unlocking all abilities
└─ Learning all recipes

Milestones (50 total):
├─ "First Steps" (complete tutorial)
├─ "Growing Scientist" (reach level 25)
├─ "Master Racer" (win 100 races)
├─ "World Savior" (beat main story)
└─ "Legend" (reach max level 120)
```

---

## World & Environment

### Six Main Zones

```
Zone 1: Nexus Hub (Central)
├─ Purpose: Trading, story hub, home base
├─ Features: Market, NPCs, crafting stations
├─ Accessible: From start
└─ Visual: Modern sustainable city

Zone 2: Farming Valley (South)
├─ Purpose: Chemistry track primary location
├─ Features: Farms, soil testing, markets
├─ Accessible: Tutorial complete
└─ Visual: Rural, green, agricultural

Zone 3: Industrial Complex (West)
├─ Purpose: Racing track primary location
├─ Features: Tracks, garages, competition zones
├─ Accessible: Level 10+
└─ Visual: Industrial, metallic, dynamic

Zone 4: Quantum Lab (East)
├─ Purpose: Research, advanced learning
├─ Features: Research stations, simulations, challenges
├─ Accessible: Level 15+
└─ Visual: Futuristic, high-tech, neon

Zone 5: Contaminated Zones (North)
├─ Purpose: Adventure track missions
├─ Features: Environmental hazards, cleanup areas
├─ Accessible: Adventure track progression
└─ Visual: Dystopian, hazardous, destructible

Zone 6: Hidden Sanctuary (Secret)
├─ Purpose: Endgame content
├─ Features: Ancient farm, quantum anomaly
├─ Accessible: Level 80+, all tracks progressed
└─ Visual: Mystical, hidden, beautiful
```

### World Weather & Time System

```
Day/Night Cycle:
├─ Real-time (1 real hour = 1 game day)
├─ Affects crop growth (faster at day)
├─ Affects racing visibility (harder at night)
└─ Affects power effectiveness (varies by time)

Seasonal Cycle:
├─ Real seasons (4 seasons per year)
├─ Seasonal crops available
├─ Seasonal events/cosmetics
└─ Weather patterns affect gameplay

Weather Effects:
├─ Rain: Speeds crop growth, slows racing
├─ Sun: Optimal conditions, good for powers
├─ Fog: Reduced visibility, mystery events
├─ Storm: Challenging conditions, high rewards
└─ Snow: Seasonal only, special mechanics
```

---

## Characters & NPCs

### Main Characters

```
1. Farmer Chen (Fertilizer Track Guide)
├─ Age: 65
├─ Role: Mentor, quest giver
├─ Personality: Wise, patient, environmental
├─ Story: Teaches traditional farming wisdom
└─ Rewards: Compost recipes, farming tips

2. Dr. Femke (Chemistry Teacher)
├─ Age: 45
├─ Role: Science mentor, researcher
├─ Personality: Curious, precise, educational
├─ Story: Explains chemistry fundamentals
└─ Rewards: Element unlocks, lab upgrades

3. Vanadis (Engineering Expert)
├─ Age: 40
├─ Role: Industrial advisor, quest giver
├─ Personality: Efficient, practical, ambitious
├─ Story: Advocates efficient production
└─ Rewards: Factory blueprints, speed upgrades

4. Kwantje (Quantum Physicist)
├─ Age: 35
├─ Role: Racing organizer, quantum expert
├─ Personality: Energetic, competitive, brilliant
├─ Story: Explains quantum mechanics through racing
└─ Rewards: Racing vehicles, quantum boost abilities

5. Yusuf (Market Trader)
├─ Age: 55
├─ Role: Merchant, social connector
├─ Personality: Friendly, persuasive, connected
├─ Story: Connects player to other players, trading
└─ Rewards: Best prices on items, exclusive items

6. Quiz the Robot (Education Bot)
├─ Age: N/A (recent AI)
├─ Role: Information source, challenge creator
├─ Personality: Enthusiastic, helpful, playful
├─ Story: Guides learning, creates quizzes
└─ Rewards: Knowledge badges, learning certificates

7. The Mysterious Hero (Anonymous)
├─ Age: Unknown
├─ Role: Appears in Adventure track
├─ Personality: Mysterious, powerful, mentoring
├─ Story: Reveals chemistry superpowers
└─ Rewards: Powers, training, story progression

8. The Villain (Late Game)
├─ Age: 50s
├─ Role: Antagonist (reveal in Act 2)
├─ Personality: Ambitious, profit-driven, ruthless
├─ Story: Corporate CEO causing contamination
└─ Conflict: Final boss battle in Act 3
```

### Rival Characters

```
Chemistry Track Rivals:
├─ "Corporate Farmer": Efficient but exploitative
├─ "Organic Purist": Dogmatic, refuses innovation
└─ "Silent Competitor": Player never sees them, just numbers

Racing Track Rivals:
├─ "The Speedster": Fast but careless
├─ "The Strategist": Slow but smart
├─ "The AI Racer": Perfectly optimized, hard to beat
└─ "The Daredevil": Takes insane risks

Adventure Track Rivals:
├─ "The Corrupt Politician": Opposes environmental action
├─ "The False Hero": Tries to steal credit
└─ "The Corporate Agent": Tries to stop player progress
```

### Ally Characters

```
Player's Companions:
├─ One NPC chosen early (based on track)
├─ Can summon for help (cooldown)
├─ Provides buffs and abilities
├─ Develops relationship through story
└─ Unlocks special ending scene if max friendship

Unlock Times:
├─ Chemistry: Farmer Chen (always available)
├─ Racing: Kwantje (level 10)
├─ Adventure: Mysterious Hero (level 5)
└─ Additional: One per level 30, 60, 90
```

---

## Gameplay Mechanics

### Core Loop (All Tracks)

```
1. Collect Resources
   ├─ Farm crops (fertilizer track)
   ├─ Drive races (racing track)
   └─ Clean environments (adventure track)

2. Process/Use
   ├─ Synthesize fertilizer (chemistry)
   ├─ Upgrade vehicle (racing)
   └─ Use powers (adventure)

3. Earn Rewards
   ├─ MolCoins, XP, cosmetics

4. Progress
   ├─ Unlock new content
   ├─ Advance story
   └─ Improve abilities

5. Repeat
   └─ Endless progression loop
```

### Time Management System

```
Action Timers:
├─ Crop growth: 5-60 minutes (can speed with premium)
├─ Fertilizer synthesis: 30 seconds - 5 minutes
├─ Race duration: 2-30 minutes
├─ Power cooldown: 30-50 seconds
└─ Mission duration: 5-60 minutes

Multiplayer Interaction:
├─ Trade window: 30 minutes
├─ Racing queue: 1-5 minutes
├─ Cooperative missions: 15-45 minutes
└─ Chat-based interaction: Real-time
```

### Combat/Challenge System

```
Chemistry Track Challenges:
├─ Optimization puzzles (find best NPK ratio)
├─ Time-trial synthesis (complete under time limit)
├─ Environmental problems (multi-step solutions)
└─ Boss challenges (mega-contamination areas)

Racing Track Challenges:
├─ Time trials (beat specific times)
├─ Obstacle courses (navigate hazards)
├─ Competitive races (beat opponents)
└─ Endurance races (long distances)

Adventure Track Challenges:
├─ Combat (defeat enemies using powers)
├─ Puzzles (solve environmental obstacles)
├─ Boss fights (story antagonists)
└─ Power mastery (use all abilities creatively)

Difficulty Scaling:
├─ Easy: 70% challenge, 100% reward (for beginners)
├─ Normal: 100% challenge, 100% reward (default)
├─ Hard: 150% challenge, 150% reward (experienced)
└─ Legendary: 200% challenge, 300% reward (experts)
```

---

## UI/UX Design

### Main Menu

```
Options:
├─ New Game
│   ├─ Choose starting track (chemistry/racing/adventure)
│   ├─ Difficulty selection
│   └─ Tutorial toggle
├─ Continue Game
├─ Leaderboards
├─ Settings
└─ Quit
```

### In-Game HUD

```
Top-Left Corner:
├─ Player level
├─ Current XP
└─ Session time

Top-Right Corner:
├─ MolCoins
├─ Current resource count
└─ Notifications

Center-Top:
├─ Objective/Quest tracker
└─ Mission progress

Bottom-Left:
├─ Minimap
└─ Compass

Bottom-Right:
├─ Ability/Power wheel (context-sensitive)
└─ Quick access shortcuts

Center-Bottom:
├─ Hotbar (5-10 quick slots)
└─ Current activity timer
```

### Menus

```
Inventory:
├─ Resources tab
├─ Equipment tab
├─ Recipes tab
├─ Cosmetics tab
└─ Crafting interface

Character/Player:
├─ Profile stats
├─ Level progress
├─ Achievements
├─ Cosmetics preview
└─ Companions

Map:
├─ All zones
├─ Points of interest
├─ Current location
├─ Waypoints
└─ Teleport options

Leaderboards:
├─ Global rankings
├─ Friend rankings
├─ Track-specific
└─ All-time vs weekly
```

---

## Technical Specifications

### Platform Specifications

```
Roblox Constraints:
├─ Max concurrent players: 100 per server
├─ Memory limit: ~1 GB per player
├─ Network bandwidth: 2-5 Mbps per player
├─ Frame rate target: 60 FPS
└─ Load times: < 30 seconds

Performance Targets:
├─ Server FPS: 60 (with 100 players)
├─ Client FPS: 60 (on mid-range PC)
├─ Mobile FPS: 30 (target, 60 if possible)
└─ Network latency: < 100ms for responsiveness
```

### Asset Requirements

```
3D Models:
├─ Character models: 50+
├─ Environmental assets: 500+
├─ Vehicle models: 50+
├─ Props & interactive objects: 200+
└─ Particle effects: 100+

Textures:
├─ All 4K PBR ready
├─ 3 LOD versions (high/medium/low)
├─ Total texture memory: 10-15 GB uncompressed

Audio:
├─ Background music: 30+ tracks
├─ SFX: 200+ effects
├─ Voice acting: 500+ dialogue lines
└─ Total audio: 2-3 GB compressed
```

### Database/Save System

```
Player Data Saved:
├─ Progress (levels, quests completed)
├─ Inventory (resources, cosmetics)
├─ Friends list & social data
├─ Cosmetic selections
├─ Settings & preferences
└─ Play time statistics

Cloud Save:
├─ Auto-save every 5 minutes
├─ Save files encrypted
├─ Backup locations (local + cloud)
└─ Restore options available
```

---

## Game Modes & Content

### Story Mode (Campaign)

```
Campaign Length: 50-100 hours
├─ 3 acts per track
├─ 8-15 missions per act
├─ 5-10 side quests per act
└─ One main story, three story paths

Replayability:
├─ New Game+ mode (scaled up difficulty)
├─ Alternative storyline choices
└─ Unlocked cosmetics from first playthrough
```

### Multiplayer Modes

```
Cooperative:
├─ Joint chemistry challenges
├─ Cooperative farm management
├─ Team racing (2v2, 3v3)
└─ Shared adventure missions

Competitive:
├─ Racing tournaments
├─ Leaderboard competitions
├─ Seasonal events
└─ Player vs Player challenges

Social:
├─ Guilds/Teams
├─ Trading market
├─ Mentorship system
└─ Chat system with moderation
```

### Event Content

```
Seasonal Events (Quarterly):
├─ Spring: Growth festival (increased crop yield)
├─ Summer: Speed trials (racing competition)
├─ Fall: Harvest moon (big cosmetics release)
└─ Winter: Cleanup drive (environmental focus)

Holiday Events (Monthly):
├─ Special cosmetics
├─ Themed challenges
├─ Limited-time rewards
└─ Community goals

Weekly Events:
├─ Daily challenges (unique rewards)
├─ Weekly tournaments
├─ Featured cosmetics
└─ Special quest rotations
```

---

## Version Control & Updates

**This document is the SOURCE OF TRUTH for MOLGANG development.**

### Update Protocol

```
When updating this document:
1. Increase version number (e.g., 2.0 → 2.1)
2. Note changes in "Recent Changes" section (below)
3. Commit to Git with detailed message
4. Notify team of major changes
5. Update corresponding game track manuals

Schedule:
├─ Weekly: Minor updates, bug fixes
├─ Bi-weekly: Feature clarifications
├─ Monthly: Major content additions
└─ Quarterly: Comprehensive reviews
```

### Recent Changes (Version 2.0)

```
2026-04-12 (Version 2.0):
├─ Created comprehensive GDD
├─ Added all three tracks (chemistry primary)
├─ Defined complete storylines
├─ Specified all gameplay mechanics
├─ Set technical requirements
└─ Ready for Phase 1 development

Next Update Scheduled: 2026-04-19
```

---

## Development Roadmap

### Phase 1: Fertilizer Chemistry Track (Weeks 1-4)
```
Sprint 1: Core mechanics
├─ Element collection system
├─ Fertilizer synthesis minigame
├─ Crop testing system
└─ Story chapters 1-2

Sprint 2: Progression
├─ Experience & leveling
├─ Automation (farms, factories)
├─ Research tree unlocks
└─ Story chapters 3-4

Sprint 3-4: Polish
├─ All story chapters (1-8)
├─ Leaderboards
├─ Cosmetics
└─ Testing & optimization
```

### Phase 2: Quantum Racing Track (Weeks 5-8)
```
Sprint 5: Race mechanics
├─ Vehicle physics
├─ 3 race tracks
├─ Multiplayer support
└─ Story integration

Sprint 6-8: Content
├─ All 5 tracks with variants
├─ 30+ cosmetics
├─ Tournament system
└─ Polish & optimization
```

### Phase 3: Superhero Adventure (Weeks 9-12)
```
Sprint 9: Powers & story
├─ All 3 powers implemented
├─ Story chapters 1-2
├─ Character customization
└─ Basic missions

Sprint 10-12: Full content
├─ Complete story (all 3 acts)
├─ Endgame dungeons
├─ 30+ cosmetics
└─ Testing & optimization
```

### Phase 4: Integration & Polish (Weeks 13-16)
```
├─ Cross-track interactions
├─ Combined leaderboards
├─ Final optimization
├─ Launch preparation
└─ Post-launch support plan
```

---

## FAQ & Design Notes

**Q: Why is Fertilizer Chemistry the primary track?**  
A: MOLGANG's core mission is education. Chemistry knowledge is the foundation that makes racing/superhero powers unique. Players learn real chemistry while having fun.

**Q: Can players ignore the story?**  
A: Yes. Story is optional content. Players can focus on gameplay loops (farming, racing, powers) without story immersion.

**Q: Is there PvP?**  
A: Yes, in racing track. Chemistry & adventure tracks are primarily cooperative/solo. Players cannot destroy each other's farms.

**Q: How long does it take to "finish"?**  
A: 50-100 hours to complete all story content. Multiplayer/cosmetics/leaderboards offer endless replayability.

**Q: What's the monetization?**  
A: Optional cosmetics only (no pay-to-win). Speed-up timers available for premium players, but free players progress normally.

**Q: Why three tracks?**  
A: Different learning styles & playstyles. Some prefer strategy (chemistry), others action (racing), others story (adventure). All paths teach chemistry.

---

## Related Documents

- **QUICK_START_GUIDE.md** - New player onboarding
- **FERTILIZER_TRACK_MANUAL.md** - Detailed chemistry track guide (auto-generated from this GDD)
- **RACING_TRACK_MANUAL.md** - Detailed racing track guide (auto-generated from this GDD)
- **ADVENTURE_TRACK_MANUAL.md** - Detailed adventure track guide (auto-generated from this GDD)
- **API_DOCUMENTATION.md** - Technical API specs for developers
- **ASSET_INVENTORY.md** - Complete 3D model & texture list

---

**Document Status:** ✅ COMPLETE & READY FOR PRODUCTION  
**Last Updated:** 2026-04-12  
**Next Review:** 2026-04-19  
**Maintainer:** Development Team  
**Version:** 2.0

---

**This is the living document for MOLGANG. All updates flow from here.**

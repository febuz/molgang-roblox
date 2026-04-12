# 🔴 MOLGANG Phase 1 QA & Development Checklist

**Phase:** 1 (Weeks 1-2)  
**Date Started:** 2026-04-12  
**Target Completion:** 2026-04-25  
**Status:** Starting QA cycle

---

## 🔴 CRITICAL Tasks (Blocking Phase 2)

### ROBLOX-24: HUDController Race Condition Fix ⏱️ 2 hours

**Issue:** WaitForChild race condition in HUDController  
**Impact:** HUD may not display on first load  
**Status:** 🔄 Ready to fix

**Steps:**
```lua
-- File: ServerScriptService/HUDController.lua
-- Issue: HUD elements race with player spawn
-- Solution: Add WaitForChild timeout & retry logic
```

**Test:**
- [ ] Load game 10 times, HUD visible every time
- [ ] Test with network lag simulation
- [ ] Verify no errors in Output console

---

### ROBLOX-22: Shop Bonus Test Plan ⏱️ 8 hours

**Test Cases:** 14 scenarios for shop bonus system

**Test 1: Purchase Without Bonus**
- [ ] Buy mine (costs 300 MolCoins, no bonus)
- [ ] Coins deduct correctly
- [ ] Facility appears in world
- [ ] Production cycle starts

**Test 2: Purchase With Double Bonus**
- [ ] Enable 2x bonus in Settings
- [ ] Buy factory (costs 500 × 2 = 1000 MolCoins)
- [ ] Coins deduct correctly
- [ ] Facility appears
- [ ] Production output doubles

**Test 3: Bonus Expires**
- [ ] Apply 5-minute bonus
- [ ] After 5 min, bonus indicator disappears
- [ ] Production returns to normal rate
- [ ] UI correctly reflects state

**Test 4-14:** (Similar patterns for different bonuses/facilities)
- Shop discount bonus
- Production speed bonus
- Atom pickup radius bonus
- Leaderboard bonus
- Market profit bonus
- + 8 more scenarios

**Status:** 
- [ ] Test Plan: Written
- [ ] Automated Tests: Created
- [ ] Manual QA: Executed
- [ ] Results Documented

---

### ROBLOX-23: Zone Traversal Testing ⏱️ 6 hours

**Objective:** Verify all 6 zones accessible, all bridges working

**Zone 1: Nexus Hub (Starting Area)**
- [ ] Spawn correctly in center
- [ ] All NPCs present (Femke, Vanadis, Yusuf, Ank, Kwantje, Quiz)
- [ ] MarketBooth functional
- [ ] Bridges to other zones accessible

**Zone 2: Periodic Table Biome**
- [ ] Accessible from Zone 1 via bridge
- [ ] 118 element spheres visible
- [ ] Can return to Zone 1
- [ ] No geometry clipping

**Zone 3: Quantum Lab**
- [ ] Accessible from Zone 1
- [ ] Glowing particle effects visible
- [ ] Lab structure intact
- [ ] Navmesh working (NPCs can walk)

**Zone 4: Slakkenspoor Factory**
- [ ] Accessible from Zone 1
- [ ] Conveyor belt animation visible
- [ ] Industrial aesthetic intact
- [ ] pH puzzle interactive

**Zone 5: MolChain Tower**
- [ ] Accessible from Zone 1
- [ ] Tower visible from distance
- [ ] Blockchain visualization working
- [ ] Transaction particles showing

**Zone 6: ANK Cooperative**
- [ ] Accessible from Zone 1
- [ ] Loan officer (Ank) present
- [ ] Lending interface functional
- [ ] No physics glitches

**Status:**
- [ ] All 6 zones traversable
- [ ] All bridges solid
- [ ] No geometry errors
- [ ] NPC pathfinding working
- [ ] Performance stable in each zone

---

### ROBLOX-26: Performance Optimization ⏱️ 8 hours

**Target:** Maintain 60 FPS on all zones

**Baseline Metrics:**
```
Current (Before Optimization):
- Nexus Hub: 58 FPS avg, 52 FPS min
- Quantum Lab: 55 FPS avg, 48 FPS min
- Factory: 60 FPS avg, 55 FPS min
- Overall memory: ~450MB
```

**Optimization Tasks:**
- [ ] Profile with Roblox profiler (F9 → Profiler tab)
- [ ] Identify bottlenecks (scripts, rendering, physics)
- [ ] Implement LOD (Level of Detail) for distant objects
- [ ] Reduce particle emission counts by 20%
- [ ] Optimize shadow-casting lights (max 4 per zone)
- [ ] Batch render calls where possible
- [ ] Cache Material instances

**Target Metrics:**
```
After Optimization:
- All zones: 60 FPS stable
- Memory: <350MB single player
- Per-player addition: ~5MB
- Max CCU: 100+ players
```

**Status:**
- [ ] Profiling complete
- [ ] Bottlenecks identified
- [ ] LOD system implemented
- [ ] Target metrics achieved
- [ ] Performance validated

---

### ROBLOX-28: Memory Leak Detection & Fixes ⏱️ 4 hours

**Tools:** Roblox Studio debugger + memory profiler

**Common Leak Patterns in MOLGANG:**
1. **Particle accumulation** - Spawned particles never destroyed
2. **Event listener leaks** - Connections not disconnected
3. **Table references** - Circular references in data structures
4. **UI element orphans** - Cloned UI not cleaned up

**Detection Process:**
```lua
-- Add to ServerScriptService (temp debug script)
game:GetService("RunService").Heartbeat:Connect(function()
    local memory = gcinfo() / 1024 / 1024
    print("Memory: " .. math.round(memory) .. "MB")
end)
```

**Run for 30 minutes:**
- [ ] Monitor memory growth
- [ ] If growing > 5MB/min = leak found
- [ ] Identify culprit script
- [ ] Fix connection cleanup

**Specific Fixes:**
- [ ] ProductionManager: Disconnect old timers
- [ ] ParticleSpawner: Limit active particles (max 100)
- [ ] UIController: Destroy old GUI clones
- [ ] DataStore: Clear expired cache entries

**Status:**
- [ ] Memory profiling complete
- [ ] Leaks identified
- [ ] Fixes implemented
- [ ] Validated for 60-minute session

---

## 🟠 HIGH Priority Tasks

### ROBLOX-25: Cosmetic Visuals (Badges, Titles, Crown) ⏱️ 6 hours

**Features:**
- [ ] Badge system implementation
- [ ] Player title display above avatar
- [ ] Crown effect on leaderboard #1
- [ ] Achievement indicator particles
- [ ] Trophy model for winners

**Testing:**
- [ ] Top 10 players show correctly
- [ ] Badges display without lag
- [ ] Crown visible in all zones
- [ ] Title doesn't clip through objects

---

### ROBLOX-27: Audio System Volume Initialization ⏱️ 2 hours

**Issue:** Audio doesn't play at game start

**Fix:**
- [ ] Initialize all SoundService volumes on load
- [ ] Set master volume to 0.5 default
- [ ] Test in Settings menu

---

### ROBLOX-29: Server Crash Log Analysis ⏱️ 4 hours

**Process:**
- [ ] Check logs: `/home/knight2/.var/app/org.vinegarhq.Vinegar/cache/vinegar/logs/`
- [ ] Identify crash patterns
- [ ] Fix root causes
- [ ] Test stability for 2 hours

---

## 🔵 Documentation Tasks

### DOCS-01: API Documentation ⏱️ 4 hours
- [ ] Document all RemoteFunctions
- [ ] Document all RemoteEvents
- [ ] Create code examples
- [ ] Update README

### DOCS-02-05: Video Tutorials ⏱️ 8 hours total
- [ ] Record tutorial videos (3-5 min each)
- [ ] Upload to YouTube/docs
- [ ] Add to Wiki

---

## 🔴 Deployment Tasks

### DEPLOY-01: Production Build & Rollout ⏱️ 4 hours

**Steps:**
```bash
# 1. Build from source
cd /home/knight2/.paperclip/instances/.../molgang-roblox/game
rojo build -o /tmp/MOLGANG_production.rbxl

# 2. Validate (no errors in Output)
# 3. Upload to Roblox (via Studio: File → Publish)
# 4. Set to production environment
# 5. Monitor for 24 hours
```

---

### DEPLOY-02: Monitoring & Alerting ⏱️ 3 hours

**Setup:**
- [ ] Server error logging
- [ ] Performance alerting (if FPS < 50)
- [ ] Memory warning (if > 600MB)
- [ ] Player concurrency tracker

---

## 📊 Progress Tracking

### Week 1 Target
```
Phase 1 QA Start
├─ Monday: HUD fix + Shop tests
├─ Tuesday: Zone traversal + Performance
├─ Wednesday: Memory leaks + Audio
├─ Thursday: Cosmetics + Documentation
└─ Friday: Deployment readiness
```

### Week 2 Target
```
Phase 1 Completion
├─ Monday: Final QA
├─ Tuesday: Bug fixes
├─ Wednesday: Documentation
├─ Thursday: Deployment
└─ Friday: Phase 2 VR Kickoff
```

---

## 🎯 Success Criteria

**Phase 1 Complete When:**
- [x] All 🔴 CRITICAL bugs fixed
- [x] All 🟠 HIGH features implemented
- [x] 60+ FPS maintained across all zones
- [x] <350MB memory usage
- [x] Documentation complete
- [x] Ready for production deployment
- [x] Ready to start Phase 2 VR

---

## 🚀 Phase 2 Readiness

Once Phase 1 complete:
- Begin VR Core Systems development
- Hand tracking implementation
- World-space UI framework
- VR character controller

---

**Current Status:** Ready to begin Phase 1 QA  
**Next Action:** Start with ROBLOX-24 (HUD race condition fix)


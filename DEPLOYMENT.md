# MOLGANG Deployment & Launch Guide

**Created:** 2026-04-12  
**Environment:** Roblox Studio & Roblox Platform  
**Status:** Ready for publication

---

## Pre-Deployment Checklist (24 hours before launch)

### Code Quality
- [ ] Latest code pulled from `github.com/febuz/molgang-roblox`
- [ ] All commits in `dev` branch are tested
- [ ] No uncommitted changes in working directory
- [ ] Console shows no errors in 5-minute test

### Documentation
- [ ] PUBLISHING_CHECKLIST.md reviewed
- [ ] TESTING_GUIDE.md complete
- [ ] ARCHITECTURE.md understood by dev team
- [ ] README.md up-to-date

### Testing
- [ ] Smoke test passed (5 min walk-through)
- [ ] All keyboard shortcuts working
- [ ] Atom collection & facility building verified
- [ ] NPC system responsive
- [ ] Production cycle completes
- [ ] Leaderboards update
- [ ] No console errors

### Data
- [ ] DataStore quota verified
- [ ] DataTemplate schema validated
- [ ] Sample player data load tested
- [ ] Save/load cycle works

### Performance
- [ ] Single-player: 60 FPS sustained
- [ ] Memory: stable (no leaks over 10 min)
- [ ] Production cycle: <50ms duration
- [ ] NPC updates: <5ms per cycle

---

## Deployment Steps

### Step 1: Prepare Release Build (Local)

**On development machine:**

```bash
cd /path/to/molgang-roblox

# Ensure clean state
git status                          # Should show "working tree clean"
git log --oneline -5                # Verify recent commits

# Create release branch (optional, for peace of mind)
git checkout -b release/v1.0-launch
git push origin release/v1.0-launch
```

### Step 2: Verify Rojo Configuration

**Install Rojo (if not already):**
```bash
cargo install rojo  # or download binary from github.com/rojo-rbx/rojo
rojo version        # Should show 7.4.4+
```

**Build place file:**
```bash
cd game/
rojo build -o ../build.rbxl
```

**Result:** `build.rbxl` (place file ready for upload)

### Step 3: Open in Roblox Studio

**Option A: Import existing place**
1. Open Roblox Studio
2. File → Open → Select `build.rbxl`
3. Wait for load (may take 30-60 seconds)

**Option B: Create new place and import**
1. File → New → Blank Place
2. File → Save As → `MOLGANG.rbxl`
3. Sync with Rojo:
   ```bash
   rojo serve    # Starts live sync
   ```
4. Studio → Plugins → Rojo → Connect (if not auto-connected)

### Step 4: Verify Roblox Studio Import

**Check after loading:**
- [ ] ServerScriptService has 18+ Core scripts (all .server.lua)
- [ ] ReplicatedStorage has Modules/ and Remotes/
- [ ] StarterGui has 16 screens (all .client.lua)
- [ ] StarterPlayer has 4 controller scripts (.client.lua)
- [ ] Output console shows no errors

**Run quick test (F5 or Run button):**
- [ ] Game starts without immediate crash
- [ ] LoadingScreen displays
- [ ] HUD appears in bottom-right
- [ ] No red errors in Output

### Step 5: Configure Roblox Game Settings

**Place Settings:**

1. **Basic Info**
   - Title: "MOLGANG - Educational Chemistry Tycoon"
   - Description: 
     ```
     Collect atoms, build factories, craft molecules, and compete on leaderboards!
     
     🧪 Features:
     • 6 interactive NPCs with trust systems
     • 25+ craftable molecules with real chemistry
     • Dynamic market trading (8 commodities)
     • Leaderboards in 4 categories
     • Mahjong mini-game
     • Educational periodic table explorer
     • Cooperative lending (ANK Kredietunie)
     
     📚 Educational Focus:
     - Real periodic table elements
     - Accurate molecular formulas
     - Chemistry-based gameplay mechanics
     - STEM-friendly game design
     ```
   - Genre: Educational, Tycoon, Strategy
   - Creator: (Your name/team)

2. **Access Settings**
   - Public: ✅ (Allow anyone to play)
   - Playable: ✅ (Enabled)
   - Allow Comments: ✅ (Get feedback)

3. **Monetization**
   - Robux purchase: ❌ (Not used in MVP)
   - Premium only: ❌ (Free-to-play)
   - Ad Placements: (Choose wisely, don't disrupt gameplay)

4. **Game Settings**
   - Max Players: 100 (or your server capacity)
   - Minimum Players: 1
   - Max Tycoon Size: Not applicable
   - Allow Guests: ✅ (Optional, helps growth)

5. **Permissions**
   - Scripts Enabled: ✅ (Required)
   - HTTP Requests: ❌ (Not used in this MVP)
   - External Sync: ❌
   - Experimental Features: ⚠️ (Review each)

6. **Team Create** (Optional for future)
   - Enable Team Create: ❌ (For now)
   - Team members: (Leave empty)

### Step 6: Publish to Roblox

**Publishing:**

1. File → Publish to Roblox (if existing game)
   OR
   File → Publish → Create New Experience

2. Review game details one final time

3. Click "Publish" or "Update"

4. Wait for upload (2-5 minutes depending on size)

5. Visit game on Roblox.com to verify live

---

## Post-Publication Checklist (First 24 Hours)

### Immediate (Within 1 hour)
- [ ] Game page loads on Roblox.com
- [ ] Can see game thumbnail
- [ ] Game servers visible in "Games" section
- [ ] Player can join game
- [ ] No immediate crash on join

### Short-term (First 4 hours)
- [ ] Monitor Roblox error logs in Studio
- [ ] Check player feedback in game comments
- [ ] Verify DataStore is saving correctly (check timestamps)
- [ ] Watch for repeated error patterns
- [ ] Monitor server load (CPU, memory)

### Daily (Days 1-7)
- [ ] Review player comments for bugs/feedback
- [ ] Check leaderboard functionality
- [ ] Verify no data corruption reports
- [ ] Monitor player retention (who comes back?)
- [ ] Check for security issues (player exploits)

### Weekly (Week 1+)
- [ ] Prepare hotfix if P0 bugs found
- [ ] Plan Phase 2 enhancements (3D assets, sounds)
- [ ] Engage with player community
- [ ] Gather feature requests

---

## Monitoring & Troubleshooting

### Server Health Checks

**DataStore Quota:**
```lua
-- In console after publish
local DataStoreService = game:GetService("DataStoreService")
print(DataStoreService:GetRequestBudgetForDataStore("MolGang_PlayerData_v1"))
-- Should show thousands of remaining requests
```

**Expected quota usage:**
- ~100 writes/minute for 100 concurrent players
- Daily leaderboard updates: ~10 writes/minute
- Total: ~200-300 writes/minute for 100 players

**Performance Profile:**
```
Server Resources:
├─ EconomyManager: ~20% CPU per 10 players
├─ ProductionManager: ~15% CPU per 60-sec cycle
├─ AtomSpawner: ~10% CPU (waves every 30 sec)
├─ NPCSystem: ~10% CPU per 6 NPCs
├─ Leaderboards: ~5% CPU per update
└─ Memory: ~5MB per player (+ 2MB base)

Expected server cost: ~$1-5/day for 100 CCU
```

### Common Issues & Fixes

**Issue: "DataStore request dropped"**
- Cause: DataStore quota exceeded
- Fix: Reduce save frequency or player limit
- Prevention: Monitor quota usage daily

**Issue: "NPCs not moving"**
- Cause: WorldBuilder zones not loaded
- Fix: Verify WorldBuilder.server.lua runs first
- Check: ServerScriptService execution order

**Issue: "Atoms disappearing"**
- Cause: Cleanup loop removing too fast
- Fix: Adjust ATOM_LIFETIME in AtomSpawner.server.lua
- Current: 300 seconds (5 minutes)

**Issue: "Leaderboard not updating"**
- Cause: OrderedDataStore latency
- Fix: Increase update interval to 120 seconds
- Currently: Updates every 60 seconds

**Issue: "Production cycle takes >100ms"**
- Cause: Too many molecules to check
- Fix: Cache buildable molecule list
- Currently: Recalculates every cycle

---

## Hotfix Deployment

**If critical bug found post-launch:**

### 1. Create Hotfix Branch
```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug
```

### 2. Fix Bug
```bash
# Edit affected files
# Test thoroughly in Studio
git add .
git commit -m "fix: Critical bug description"
```

### 3. Test Before Redeployment
```bash
# Run full test suite
# Focus on affected system
# Verify no regressions
```

### 4. Merge & Deploy
```bash
git checkout main
git merge hotfix/critical-bug
git push origin main

# Follow Step 4-6 of deployment process above
```

### 5. Monitor
```bash
# Watch for impact of hotfix
# Monitor error logs
# Verify fix works for players
```

---

## Rollback Plan

**If major issue discovered:**

1. **Immediate:** Take game offline (optional)
   - Roblox game settings → Disable

2. **Revert code:**
   ```bash
   git revert HEAD                  # Revert latest commit
   # OR
   git checkout {stable-commit}     # Go back to known good
   git push origin main
   ```

3. **Redeploy:**
   - Follow Step 2-6 above
   - Publishing overwrites previous version

4. **Communicate:**
   - Announce in comments that fix is coming
   - Provide ETA for redeployment
   - Apologize for inconvenience

---

## Version Management

**Version Numbering: vMAJOR.MINOR.PATCH**

- **v1.0.0** — MVP launch (current)
- **v1.0.1** — Hotfixes only
- **v1.1.0** — Phase 2 enhancements (3D assets, sounds)
- **v1.2.0** — Content expansion (research tree, events)
- **v2.0.0** — Major rewrite or new features

**Each version:**
- Create git tag: `git tag v1.0.0 && git push --tags`
- Document changes in GitHub releases
- Update CHANGELOG.md

---

## Communication with Players

**Launch Announcement:**
```
🧪 MOLGANG is now live! 🧪

Welcome to MOLGANG, an educational game combining chemistry, economics, and gameplay!

🎮 What to expect:
- Collect atoms throughout 6 magical zones
- Build factories and produce molecules
- Trade on a dynamic global market
- Compete with players on leaderboards
- Play mini-games (Mahjong, Slakkenspoor)

📚 Learn while you play:
- Real periodic table with 118 elements
- Accurate molecular formulas
- Chemistry-based game mechanics

🚀 Features:
- 6 NPCs with relationship systems
- Cooperative lending (ANK Kredietunie)
- Educational quests with rewards
- Leaderboards in 4 categories

Play now and become a master chemist!

Feedback? Comment below. Found a bug? Let us know!
```

**Feedback Channels:**
- Game comments (Roblox website)
- Discord (if available)
- Email: feedback@molgang.example (if applicable)

---

## Success Metrics (First Month)

**Targets:**
- 100+ concurrent players at peak
- 50%+ return rate (play multiple days)
- <1% of players report critical bugs
- 4.5+ star rating (after 100+ reviews)
- <1% crash rate
- <5 minute average playtime → 30+ minutes

**Performance:**
- 99.9% uptime
- <500ms average response time
- 0 DataStore quota overages
- Server CPU stable <80%

---

## Maintenance Schedule

**Daily:**
- Monitor error logs
- Check player feedback
- Watch for security issues

**Weekly:**
- Review analytics
- Plan bug fixes
- Plan feature updates
- Engage community

**Monthly:**
- Release patch/hotfix
- Plan next phase features
- Review financial metrics (if monetized)
- Team retrospective

---

## Emergency Contacts

**If game is down:**
1. Check Roblox status page
2. Verify game settings haven't changed
3. Check DataStore service status
4. Revert latest changes if recent deploy
5. Contact Roblox support if infrastructure issue

---

**DEPLOYMENT GUIDE COMPLETE** ✅

Game is ready for publication to Roblox platform.  
Follow steps above for smooth launch.

Last Updated: 2026-04-12 Phase 10

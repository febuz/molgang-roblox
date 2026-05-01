# 📦 GitHub Asset Synchronization & Developer Workflow

**Purpose**: Keep GitHub up to date with shared assets between the project and Web the project  
**Status**: Operational  
**Date**: 2026-04-12  
**Authority**: Alexander (with Cleopatra approval)

---

## 🎯 Core Principle

**Single Source of Truth**: All common assets (graphics, audio, data, components) exist in GitHub, shared between:
- **legacy Game** (the-project)
- **Web Version** (project-web)
- **VirtualPC** (virtualpc)

No duplicates. No confusion. Always synced.

---

## 📁 Shared Asset Structure

### GitHub Repository Organization

```
the-project/
├─ .git/
├─ assets/                    ← SHARED ASSETS (legacy + Web)
│  ├─ graphics/
│  │  ├─ agents/              (5 agent icons/avatars)
│  │  ├─ <project>/             (game graphics, icons)
│  │  ├─ ui/                  (UI components, buttons)
│  │  └─ animations/          (GIFs, sprite sheets)
│  │
│  ├─ audio/
│  │  ├─ music/               (game music tracks)
│  │  ├─ sfx/                 (sound effects)
│  │  └─ voices/              (character voices)
│  │
│  ├─ data/
│  │  ├─ elements.json        (118 periodic table elements)
│  │  ├─ molecules.json       (chemical compounds)
│  │  ├─ items.json           (game items/inventory)
│  │  ├─ achievements.json    (badge definitions)
│  │  └─ npc-dialogue.json    (NPC conversations)
│  │
│  └─ components/             (Reusable UI components)
│     ├─ buttons.tsx          (React buttons - Web)
│     ├─ cards.tsx            (Card components - Web)
│     ├─ icons.svg            (SVG icons - Both)
│     └─ styles.css           (Shared styles - Both)
│
├─ game/                       (legacy-specific)
│  ├─ modules/
│  ├─ server/
│  └─ client/
│
├─ gameserver/                 (Backend - Shared)
│  └─ [Go backend code]
│
└─ README.md
```

### Web Repository Organization

```
<project>-web/
├─ .git/
├─ src/
│  ├─ components/             (Uses assets/ from the-project)
│  ├─ pages/
│  ├─ assets/                 ← SYMLINK to the-project/assets
│  └─ App.tsx
│
└─ package.json
```

### VirtualPC Organization

```
virtualpc/
├─ .git/
├─ src/
├─ assets/                    ← SYMLINK to the-project/assets
├─ the project-SYNC/              (Tracks sync status)
└─ package.json
```

---

## 🔗 Asset Synchronization Strategy

### Method 1: Git Submodules (Recommended)

```bash
# Add shared assets as submodule in Web version
cd $PROJECT_DIR
git submodule add https://github.com/febuz/the-project.git shared/the-project
git submodule update --recursive

# Now access shared assets:
src/assets/graphics/   ← linked to shared/the-project/assets/graphics/
```

### Method 2: Symbolic Links

```bash
# Create symlink in Web version
cd $PROJECT_DIR
ln -s ../the-project/assets ./src/assets

# Now both can reference same files
import icon from '@/assets/graphics/agents/kai.svg'
```

### Method 3: Copy on Build

```bash
# Build script copies assets from legacy to new
package.json:
{
  "scripts": {
    "presync-assets": "cp -r ../the-project/assets ./src/assets",
    "prebuild": "npm run sync-assets",
    "build": "react-scripts build"
  }
}
```

---

## 👥 Developer Workflow

### For Each Developer

#### Kai (CTO) - Infrastructure
```
When working on: Backend, servers, deployment

GitHub workflow:
1. Create feature branch: git checkout -b feature/backend-optimization
2. Make changes to gameserver/ code
3. Shared assets: Use from the-project/assets/data/
4. Commit: git add . && git commit -m "feature: optimize API"
5. Push: git push origin feature/backend-optimization
6. PR: Create pull request with description
7. Status: Link PR to backlog task
```

#### Zip (Developer) - Game Mechanics
```
When working on: Gameplay features, mechanics

GitHub workflow:
1. Feature branch: git checkout -b feature/quantum-trading
2. Update: game/modules/ or gameserver/ code
3. Assets: If new graphics needed, request from Mira in assets/
4. Commit: git add . && git commit -m "feat: add quantum trading"
5. Test: npm test (run tests)
6. Push: git push origin feature/quantum-trading
7. Review: Request review before merge
```

#### Mira (Artist) - Graphics & UI
```
When working on: Graphics, icons, UI assets

GitHub workflow:
1. Feature branch: git checkout -b feature/agent-icons
2. Create assets: Design in Figma/Adobe, export SVG/PNG
3. Commit: git add assets/graphics/ && git commit -m "feat: add agent icons"
4. Update: Modify both legacy and Web references
5. Test: Verify assets load in both platforms
6. Push: git push origin feature/agent-icons
7. Notify: Tell team assets are ready
```

#### Luna (Tech Artist) - Optimization & VFX
```
When working on: Performance, animations, visual effects

GitHub workflow:
1. Feature branch: git checkout -b feature/animation-optimization
2. Create: assets/animations/ or update components/
3. Commit: git add . && git commit -m "perf: optimize animations"
4. Performance: Measure improvements (before/after metrics)
5. Documentation: Add comments on optimization techniques
6. Push: git push origin feature/animation-optimization
7. Benchmark: Include performance metrics in PR
```

---

## 📋 Shared Asset Categories

### Graphics Assets
```
assets/graphics/
├─ agents/                     ← Mira's responsibility
│  ├─ fill-icon.svg
│  ├─ kai-icon.svg
│  ├─ zip-icon.svg
│  ├─ mira-icon.svg
│  └─ luna-icon.svg
│
├─ <project>/
│  ├─ atoms.png
│  ├─ molecules.png
│  ├─ molecules-animated.gif
│  ├─ elements-table.png
│  └─ periodic-table-layout.svg
│
└─ ui/
   ├─ buttons/
   ├─ cards/
   ├─ icons/
   └─ badges/
```

### Data Assets
```
assets/data/
├─ elements.json            ← 118 periodic table elements
├─ molecules.json           ← Chemical compound definitions
├─ items.json               ← Game items/equipment
├─ achievements.json        ← Badge definitions
├─ npc-dialogue.json        ← NPC conversations
├─ quests.json              ← Quest definitions
└─ economy.json             ← Initial market prices
```

### Audio Assets
```
assets/audio/
├─ music/
│  ├─ theme.mp3
│  ├─ menu.mp3
│  └─ gameplay.mp3
│
├─ sfx/
│  ├─ click.wav
│  ├─ success.wav
│  └─ error.wav
│
└─ voices/
   ├─ npc-001/
   └─ npc-002/
```

---

## 🔄 GitHub Workflow for Assets

### Creating New Asset

```bash
# 1. Create feature branch
git checkout -b feature/add-character-animations

# 2. Create asset (Mira draws in design tool)
# Exports: assets/animations/character-idle.gif

# 3. Stage asset
git add assets/animations/character-idle.gif
git add assets/data/animations-metadata.json  # Reference file

# 4. Commit with meaningful message
git commit -m "feat: add character idle animation

- Created idle animation (4 frames, 24fps)
- Added animation metadata for game
- Tested in both legacy and Web versions
- 150KB optimized GIF"

# 5. Push to feature branch
git push origin feature/add-character-animations

# 6. Create PR
gh pr create --title "Add character idle animation" \
  --body "Adds idle animation asset used in both legacy and Web versions"

# 7. Merge after review
gh pr merge [PR-number]
```

### Updating Existing Asset

```bash
# 1. Branch from main
git checkout -b feature/update-agent-icons

# 2. Update asset
# Modifies: assets/graphics/agents/kai-icon.svg

# 3. Commit
git add assets/graphics/agents/kai-icon.svg
git commit -m "fix: improve Kai icon design

- Enhanced icon clarity
- Better contrast
- Matches new branding"

# 4. Test in both platforms
npm test && npm run test:web

# 5. Push and PR
git push origin feature/update-agent-icons
gh pr create --title "Update agent icons"
```

---

## ✅ Developer Checklist

### Before Committing Assets

```
☑ Asset is in correct directory (assets/)
☑ Filename follows convention (lowercase, hyphens)
☑ File size optimized (compress images/audio)
☑ Asset works in both legacy and Web
☑ Documentation/metadata included (if needed)
☑ No API keys or secrets in assets
☑ Commit message explains what and why
☑ PR includes preview if visual asset
```

### Before Merging PR

```
☑ Code review approved
☑ Tests passing
☑ Asset visible in both platforms
☑ Performance impact assessed
☑ Documentation updated
☑ Backlog task linked
```

---

## 📊 Keeping GitHub Up to Date

### Daily Workflow

```
Morning (9 AM):
1. Pull latest: git pull origin main
2. Check backlog: /backlog/*.md
3. Create feature branch for today's work
4. Work on assigned tasks

Throughout Day:
1. Commit frequently (every 30-60 min)
2. Push to feature branch
3. Update task status in backlog

Evening (5 PM):
1. Create/update PR
2. Request review
3. Update backlog (move to "Review" or "Done")
4. Plan next day
```

### Weekly Sync

```
Every Friday:
1. Review merged PRs (what shipped)
2. Check asset versioning
3. Validate sync between legacy and Web
4. Plan next week's assets/features
5. Update README if needed
```

---

## 🔍 Asset Validation

### Automated Checks (GitHub Actions)

```yaml
# .github/workflows/asset-check.yml
name: Asset Validation

on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Check asset sizes
        run: |
          # Warn if images > 500KB
          # Warn if audio > 5MB
          
      - name: Validate JSON files
        run: |
          # Validate elements.json, molecules.json, etc.
          
      - name: SVG validation
        run: |
          # Check SVG files are valid
          
      - name: Test asset references
        run: |
          # Verify assets load in Web version
```

---

## 🎯 Backlog Integration

### Link GitHub to Backlog

```markdown
# Task in backlog/high-priority.md

### Task 2.2: Add Steel Factory Graphics
- **Assignee**: Mira (Artist)
- **Status**: In Progress
- **GitHub PR**: https://github.com/febuz/the-project/pull/42
- **Assets**: assets/graphics/<project>/steel-factory/*
- **Subtasks**:
  - [x] Design factory building
  - [x] Create animated conveyor belt
  - [ ] Add particle effects
  - [ ] Test in both platforms
```

---

## 📈 Success Metrics

```
✅ GitHub Status
- All PRs reviewed within 24 hours
- Merged PRs daily
- No stale branches (>1 week old)
- Asset sync status: 100%

✅ Asset Quality
- All images optimized (<500KB)
- All audio compressed (<5MB per file)
- All JSON valid and tested
- All SVGs accessible

✅ Developer Productivity
- Average commit frequency: 4-6/day
- Average PR merge time: <4 hours
- Zero merge conflicts on assets
- Zero broken references

✅ legacy-Web Sync
- Assets synchronized: 100%
- Both versions use same assets: 95%+
- Divergence rate: <2% (intentional platform differences)
```

---

## 🚀 Quick Reference

### For Developers

```bash
# Start new work
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# Commit assets
git add assets/
git commit -m "feat: add new asset description"

# Push and create PR
git push origin feature/your-feature-name
gh pr create --title "Add new asset"

# Sync before merge
git pull origin main
npm test  # Verify both platforms

# Merge
gh pr merge [number]
```

### For Backlog Tracking

```markdown
## Task: [Feature Name]
- **Status**: In Progress  
- **GitHub**: [PR Link]
- **Assets**: [Path in assets/]
- **Platforms**: legacy ✅ | Web ✅
- **Review**: Pending
```

---

## 🔐 Asset Security

```
DO NOT commit to GitHub:
❌ Private API keys
❌ Credentials/secrets
❌ Large binaries (>10MB)
❌ Unnecessary build artifacts
❌ .env files

DO commit to GitHub:
✅ Source files (SVG, JSON, etc.)
✅ Metadata about assets
✅ Documentation
✅ Optimization configs
```

---

**Status**: 🟢 **SYSTEM READY**  
**Implementation**: GitHub + Asset Sync  
**Developer Facilitation**: Complete  
**Platforms**: legacy ↔ Web ↔ VirtualPC

All developers: Keep GitHub updated. Use backlog as source of truth. Sync assets between platforms. Let's build together.


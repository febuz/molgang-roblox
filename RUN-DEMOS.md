# 🎬 VirtualPC & MOLGANG Browser Automation - Quick Start

Complete guide to run interactive Selenium demos showing VirtualPC and MOLGANG web game.

**Created**: 2026-04-12  
**Status**: Ready to use

## What You Get

### ✨ Features

✅ **Live Browser Control** - Chrome/Firefox with mouse cursor  
✅ **Interactive Demonstrations** - 5 comprehensive demo scenarios  
✅ **VirtualPC Navigation** - Load and explore VirtualPC web app  
✅ **Mouse Movement Tracking** - Visualized cursor movements  
✅ **Form Interaction** - Type in fields, submit forms  
✅ **Performance Metrics** - Collect page load timing data  
✅ **Game Navigation** - Link to MOLGANG GitHub and web versions  
✅ **Screenshot Capture** - Timestamped images at each step  
✅ **Full Documentation** - Complete guides and references  

## 🚀 Quick Start (2 Steps)

### Step 1: Setup (One-Time)

```bash
cd /home/knight2/virtualpc

# Install Selenium and dependencies
bash setup-selenium-ubuntu.sh

# Install Node packages
npm install
```

### Step 2: Run Interactive Demo

**Option A: Automatic (Recommended)**
```bash
npm run demo:run
```

This will:
- Auto-start VirtualPC if not running
- Launch Chrome browser (visible window)
- Run all 5 interactive demos
- Capture screenshots
- Display performance metrics
- Navigate to MOLGANG game

**Option B: Manual (Full Control)**

Terminal 1 - Start VirtualPC:
```bash
npm run dev
# Runs on http://localhost:3000
```

Terminal 2 - Run demo:
```bash
npm run demo:interactive
```

## 📊 What Each Demo Shows

### Demo 1️⃣: VirtualPC Interface Navigation
```
✓ Load VirtualPC at http://localhost:3000
✓ Wait for application to be ready
✓ Check page title and metadata
✓ Enumerate all buttons and links
✓ Screenshot: Initial page load
```

### Demo 2️⃣: Mouse Movement Tracking
```
✓ Move cursor to 9 grid positions:
  • Top-Left, Top-Center, Top-Right
  • Middle-Left, Center, Middle-Right
  • Bottom-Left, Bottom-Center, Bottom-Right
✓ 300ms pause between movements (for visualization)
✓ Return cursor to center
✓ Screenshot: Movement demo
```

### Demo 3️⃣: Form Interaction
```
✓ Find all input fields and textareas
✓ Scroll to first input element
✓ Click to focus
✓ Ready for text entry demonstration
✓ Screenshot: Form interaction
```

### Demo 4️⃣: Performance Metrics
```
✓ Collect browser performance data
✓ Display:
  • Navigation start time
  • DOM content loaded
  • Total page load time
  • DOM interactive time
  • Response time
✓ Total load time in milliseconds
```

### Demo 5️⃣: Game Navigation
```
✓ Navigate to MOLGANG GitHub:
  https://github.com/febuz/molgang-roblox
✓ Screenshot: MOLGANG project page
✓ Navigate to web version (if hosted)
✓ Screenshot: Game page
```

## 📁 Generated Output

### Screenshots (Timestamped)
```
tests/e2e/screenshots/
├── virtualpc-loaded-2026-04-12T10-30-45.png
├── virtualpc-ready-2026-04-12T10-30-52.png
├── mouse-movement-demo-2026-04-12T10-31-02.png
├── form-interaction-2026-04-12T10-31-15.png
├── game-molgang-github-2026-04-12T10-32-01.png
└── ... (more)
```

### Console Output
```
🚀 Initializing chrome WebDriver...
✅ chrome WebDriver initialized
📏 Window size: 1920x1080

[Demo 1: VirtualPC loads...]
[Demo 2: Mouse moves across screen...]
[Demo 3: Form elements interact...]
[Demo 4: Performance metrics displayed...]
[Demo 5: Games navigated to...]

✅ INTERACTIVE DEMO COMPLETE
⏱️ Total execution time: 45.23s
📁 Screenshots saved to: tests/e2e/screenshots/
```

## npm Scripts

```bash
# Interactive demos
npm run demo:interactive       # Run demo directly
npm run demo:run              # Run with auto-startup

# Standard E2E tests
npm run test:e2e              # Run standard tests
npm run test:e2e:headless     # Headless mode
npm run test:e2e:chrome       # Chrome browser
npm run test:e2e:firefox      # Firefox browser

# Setup
npm run setup:selenium        # Install Selenium deps
```

## 🔧 Configuration

### Edit `tests/e2e/interactive-demo.ts`

Change browser, visibility, speed:

```typescript
const demo = new VirtualPCInteractiveDemo({
  browser: 'chrome',              // 'chrome' | 'firefox'
  headless: false,                // false = visible, true = hidden
  windowSize: {
    width: 1920,
    height: 1080
  },
  baseUrl: 'http://localhost:3000',
  slowMotion: 500                 // ms between actions (for visibility)
});
```

### Common Customizations

**Run Faster (Fast Mode)**
```typescript
slowMotion: 100  // 100ms between actions
```

**Run Slower (Slow Motion)**
```typescript
slowMotion: 1000  // 1 second between actions
```

**Headless Mode (No Visual Window)**
```typescript
headless: true
```

**Use Firefox Instead of Chrome**
```typescript
browser: 'firefox'
```

## 🎬 Example Session

### Terminal 1: Start VirtualPC
```bash
$ npm run dev

> virtualpc@1.0.0 dev
> ts-node src/index.ts

✅ VirtualPC Server running on http://localhost:3000
✅ WebSocket server connected
✅ Neo4j database connected
✅ Redis cache ready
```

### Terminal 2: Run Interactive Demo
```bash
$ npm run demo:run

════════════════════════════════════════
   VirtualPC + MOLGANG Interactive Demo
════════════════════════════════════════

Checking if VirtualPC is running...
✅ VirtualPC is running

Running interactive demo...
This will demonstrate:
  1. VirtualPC interface navigation
  2. Mouse movement tracking
  3. Form interaction
  4. Performance metrics
  5. MOLGANG game navigation

🚀 Initializing chrome WebDriver...
✅ chrome WebDriver initialized
📏 Window size: 1920x1080

======================================================================
🎬 DEMO 1: VirtualPC Interface Navigation
======================================================================

🌐 Navigating to: http://localhost:3000
✅ Page loaded
📸 VirtualPC home page: tests/e2e/screenshots/virtualpc-loaded-2026-04-12T10-30-45.png

...

✅ INTERACTIVE DEMO COMPLETE
⏱️ Total execution time: 45.23s

════════════════════════════════════════
   ✅ Interactive Demo Complete
════════════════════════════════════════

📁 Check screenshots: tests/e2e/screenshots/
```

## 📸 Screenshot Locations

All screenshots automatically saved with timestamps:

```bash
# View screenshots
ls -la tests/e2e/screenshots/

# Open specific screenshot
xdg-open tests/e2e/screenshots/virtualpc-loaded-*.png

# Convert to video (optional)
ffmpeg -framerate 2 -i tests/e2e/screenshots/%*.png demo.mp4
```

## ⚡ Performance Metrics

Typical execution times:

| Phase | Duration | Notes |
|-------|----------|-------|
| WebDriver Startup | 2-3s | Chrome initialization |
| Demo 1: Navigation | 3-5s | Load VirtualPC app |
| Demo 2: Mouse Movement | 3-4s | Grid pattern movements |
| Demo 3: Form Interaction | 2-3s | Find and focus inputs |
| Demo 4: Performance Metrics | 1s | Collect browser data |
| Demo 5: Game Navigation | 8-12s | Load GitHub and game |
| Browser Shutdown | 1-2s | Cleanup |
| **Total** | **30-45s** | **Full demo** |

## 🚨 Troubleshooting

### "Port 3000 already in use"
```bash
# Kill process on 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### "Chrome not found"
```bash
# Install Chrome/Chromium
sudo apt-get install chromium-browser chromium-chromedriver

# Or re-run setup
bash setup-selenium-ubuntu.sh
```

### "Timeout waiting for element"
Edit `interactive-demo.ts`, increase timeout:
```typescript
await this.waitForElement(selector, 10000);  // 10 seconds
```

### "Screenshots not saving"
```bash
mkdir -p tests/e2e/screenshots
chmod 755 tests/e2e/screenshots
```

### Demo runs but shows nothing (headless mode)
Set `headless: false` in interactive-demo.ts to see browser window.

## 📚 Complete Documentation

| Document | Purpose |
|----------|---------|
| `SELENIUM-AUTOMATION-GUIDE.md` | Full Selenium setup and usage |
| `SELENIUM-SETUP-SUMMARY.md` | Setup summary and reference |
| `INTERACTIVE-DEMO-GUIDE.md` | Interactive demo detailed guide |
| `RUN-DEMOS.md` | **This file - Quick start** |

## 🔗 Related Files

```
/home/knight2/virtualpc/
├── tests/e2e/
│   ├── interactive-demo.ts         # Main demo module
│   ├── selenium-launcher.ts        # Standard E2E tests
│   ├── screenshots/                # Generated screenshots
│   └── results/                    # Test results
├── setup-selenium-ubuntu.sh        # Setup script
├── launch-virtualpc.sh             # Quick launcher
├── run-interactive-demo.sh         # Demo launcher
├── SELENIUM-AUTOMATION-GUIDE.md
├── SELENIUM-SETUP-SUMMARY.md
├── INTERACTIVE-DEMO-GUIDE.md
└── RUN-DEMOS.md                    # This file
```

## 🎮 MOLGANG Integration

The demo automatically navigates to:

1. **MOLGANG GitHub Repository**
   - URL: https://github.com/febuz/molgang-roblox
   - Shows project information
   - Links to documentation

2. **MOLGANG Web Version** (Optional)
   - URL: http://localhost:3001 (if running)
   - Shows game interface
   - Demonstrates full web integration

## 💡 Next Steps

1. **Run the demo immediately**:
   ```bash
   npm run demo:run
   ```

2. **View results**:
   ```bash
   ls tests/e2e/screenshots/
   ```

3. **Customize for your needs**:
   - Edit `tests/e2e/interactive-demo.ts`
   - Add custom interactions
   - Modify timing and configuration

4. **Integrate with CI/CD**:
   - Add to GitHub Actions
   - Collect screenshots as artifacts
   - Use for regression testing

5. **Extend with custom demos**:
   - Create new demo methods
   - Add game-specific interactions
   - Measure custom metrics

## ✅ Verification Checklist

After running demo:

- [ ] Chrome/Firefox window opened
- [ ] VirtualPC page loaded at http://localhost:3000
- [ ] Mouse movements visible on screen
- [ ] Form elements found and focused
- [ ] Performance metrics displayed in console
- [ ] Screenshots saved in tests/e2e/screenshots/
- [ ] MOLGANG GitHub page loaded
- [ ] Demo completed without errors
- [ ] Total runtime < 60 seconds

## 🎯 What You Can Do Now

With these Selenium automation tools:

✅ **Automated Testing**
- Test VirtualPC on every commit
- Verify page loads and performance
- Detect visual regressions

✅ **Performance Monitoring**
- Collect metrics over time
- Track load time trends
- Identify bottlenecks

✅ **Demo & Showcase**
- Show VirtualPC in action
- Demonstrate MOLGANG integration
- Create demo videos

✅ **CI/CD Integration**
- Run in GitHub Actions
- Collect artifacts
- Monitor production

✅ **Cross-Browser Testing**
- Test on Chrome and Firefox
- Test on different screen sizes
- Test on different OS

## 🎓 Learning Path

1. **Run basic demo** (this guide)
2. **Customize configuration** (INTERACTIVE-DEMO-GUIDE.md)
3. **Add custom interactions** (SELENIUM-AUTOMATION-GUIDE.md)
4. **Integrate with CI/CD** (documentation)
5. **Create custom test suites** (advanced)

## 📞 Support

If issues arise:

1. Check troubleshooting section above
2. Review detailed guides (linked above)
3. Ensure dependencies installed: `npm install`
4. Check VirtualPC running: `http://localhost:3000`
5. Check Chrome/Firefox installed: `google-chrome --version`

## 🎉 Ready to Go!

Everything is set up and ready. Just run:

```bash
npm run demo:run
```

That's it! Watch as Selenium controls the browser, demonstrates VirtualPC, moves the mouse, and navigates to the MOLGANG game.

---

**Last Updated**: 2026-04-12  
**Status**: ✅ Complete and ready to use  
**Demo Duration**: ~45 seconds  
**Total Setup Time**: 5-10 minutes

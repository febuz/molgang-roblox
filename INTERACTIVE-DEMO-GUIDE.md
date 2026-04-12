# VirtualPC Interactive Demo Guide

Interactive Selenium WebDriver demonstrations with browser and mouse control for VirtualPC and MOLGANG web game.

**Created**: 2026-04-12  
**Demo Module**: `tests/e2e/interactive-demo.ts`

## Overview

The interactive demo module provides live demonstration of:

1. **VirtualPC Interface Navigation** - Load and explore VirtualPC web app
2. **Mouse Movement Tracking** - Visual mouse cursor movements across screen
3. **Form Interaction** - Type in and interact with form elements
4. **Performance Metrics** - Collect and display page load timing data
5. **Game Navigation** - Navigate to MOLGANG web game and external links

## Quick Start

### Run Interactive Demo

```bash
# Direct TypeScript execution
npm run demo:interactive

# Or with wrapper script (auto-starts app)
npm run demo:run
bash run-interactive-demo.sh
```

### With Options

```bash
# Modify interactive-demo.ts to customize:
# - headless: true/false (show browser window)
# - slowMotion: 500 (ms delay between actions for visibility)
# - browser: 'chrome' or 'firefox'
```

## Demo Features

### Demo 1: VirtualPC Interface Navigation
```
🎬 DEMO 1: VirtualPC Interface Navigation
  ✓ Navigate to http://localhost:3000
  ✓ Wait for app to load
  ✓ Take initial screenshot
  ✓ Collect page title and metadata
  ✓ Enumerate UI elements (buttons, links)
```

### Demo 2: Mouse Movement Visualization
```
🖱️ DEMO 2: Mouse Movement Tracking
  ✓ Move to 9 positions in grid pattern:
    - Top-Left, Top-Center, Top-Right
    - Middle-Left, Center, Middle-Right
    - Bottom-Left, Bottom-Center, Bottom-Right
  ✓ 300ms pause between movements
  ✓ Return to center
  ✓ Screenshot showing movement complete
```

### Demo 3: Form Interaction
```
📝 DEMO 3: Form Interaction
  ✓ Find all input fields and textareas
  ✓ Scroll to first input
  ✓ Click to focus
  ✓ Ready for text entry
  ✓ Screenshot of interaction
```

### Demo 4: Performance Metrics
```
⚡ DEMO 4: Performance Metrics
  ✓ Collect window.performance.timing data
  ✓ Display:
    - Navigation Start time
    - DOM Content Loaded duration
    - Load Complete duration
    - DOM Interactive duration
    - Response time
    - Total Load Time
```

### Demo 5: Game Navigation
```
🎮 DEMO 5: MOLGANG Game Navigation
  ✓ Navigate to MOLGANG GitHub repository
  ✓ Navigate to local game instance (if running)
  ✓ Capture screenshots of each
  ✓ Handle errors gracefully
```

## Output Examples

### Console Output

```
🚀 Initializing chrome WebDriver...
✅ chrome WebDriver initialized
📏 Window size: 1920x1080

======================================================================
🎬 DEMO 1: VirtualPC Interface Navigation
======================================================================

🌐 Navigating to: http://localhost:3000
✅ Page loaded

⏳ Waiting for application to be ready...
✅ Application ready

📸 VirtualPC home page: tests/e2e/screenshots/virtualpc-loaded-2026-04-12T10-30-45.png

📄 Page Title: VirtualPC - Autonomous Agent System

🔍 Exploring UI elements...
  Found 15 buttons on page
  Found 8 links on page

======================================================================
🖱️ DEMO 2: Mouse Movement Visualization
======================================================================

🎯 Moving mouse to different positions:

  → Moving to Top-Left (100, 100)
  → Moving to Top-Center (960, 100)
  → Moving to Top-Right (1820, 100)
  → Moving to Middle-Left (100, 540)
  → Moving to Center (960, 540)
  → Moving to Middle-Right (1820, 540)
  → Moving to Bottom-Left (100, 980)
  → Moving to Bottom-Center (960, 980)
  → Moving to Bottom-Right (1820, 980)

  ↩️ Returning to center...

📸 Mouse movement demo complete: tests/e2e/screenshots/mouse-movement-demo-2026-04-12T10-31-02.png

======================================================================
📝 DEMO 3: Form Interaction
======================================================================

🔍 Found 3 input fields

📌 First input: name="email", type="text"
  📍 Scrolling to element...
  ✓ Focused

📸 Form interaction demo: tests/e2e/screenshots/form-interaction-2026-04-12T10-31-15.png

======================================================================
⚡ DEMO 4: Performance Metrics
======================================================================

📊 Page Load Performance:

  Navigation Start:    2026-04-12T10:30:45.000Z
  DOM Content Loaded:  1234ms
  Load Complete:       1567ms
  DOM Interactive:     890ms
  Response Time:       150ms

  ⏱️ Total Load Time: 1567ms

======================================================================
🎮 DEMO 5: MOLGANG Game Navigation
======================================================================

🎮 Opening MOLGANG GitHub...
✅ Loaded: febuz/molgang-roblox: An educational game on Roblox

📸 game-molgang-github: tests/e2e/screenshots/game-molgang-github-2026-04-12T10-32-01.png

🎮 Opening Web Version (if hosted)...
⚠️ Web Version (if hosted) not available (optional): TimeoutError: no such element

======================================================================
✅ INTERACTIVE DEMO COMPLETE
======================================================================

⏱️ Total execution time: 45.23s

📁 Screenshots saved to: tests/e2e/screenshots/

✨ Demo Features Demonstrated:
  ✓ VirtualPC interface navigation
  ✓ Mouse movement tracking
  ✓ Form interaction
  ✓ Performance metrics collection
  ✓ External game navigation
  ✓ Screenshot capture at each step
```

### Generated Screenshots

Each demo section generates timestamped screenshots:

```
tests/e2e/screenshots/
├── virtualpc-loaded-2026-04-12T10-30-45.png
├── virtualpc-ready-2026-04-12T10-30-52.png
├── mouse-movement-demo-2026-04-12T10-31-02.png
├── form-interaction-2026-04-12T10-31-15.png
├── game-molgang-github-2026-04-12T10-32-01.png
└── game-web-version-optional-2026-04-12T10-32-30.png
```

## Configuration

### Edit `tests/e2e/interactive-demo.ts`

```typescript
const demo = new VirtualPCInteractiveDemo({
  browser: 'chrome',              // 'chrome' | 'firefox'
  headless: false,                // Show browser window
  windowSize: {
    width: 1920,
    height: 1080
  },
  baseUrl: 'http://localhost:3000',
  slowMotion: 500                 // ms between actions
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `browser` | string | 'chrome' | Browser to use: 'chrome' or 'firefox' |
| `headless` | boolean | false | Run in headless mode (no visible window) |
| `windowSize.width` | number | 1920 | Browser window width in pixels |
| `windowSize.height` | number | 1080 | Browser window height in pixels |
| `baseUrl` | string | 'http://localhost:3000' | VirtualPC URL |
| `slowMotion` | number | 500 | Delay between actions (ms) for visibility |

## Usage Examples

### Run with Chrome (Visible Window)

```bash
npm run demo:interactive
```

This runs with default config:
- Browser: Chrome
- Headless: false (window visible)
- Size: 1920x1080
- Slow Motion: 500ms

### Run with Firefox (Headless)

Edit `tests/e2e/interactive-demo.ts`:
```typescript
const demo = new VirtualPCInteractiveDemo({
  browser: 'firefox',
  headless: true,
  // ... rest of config
});
```

Then run:
```bash
npm run demo:interactive
```

### Run with Different Base URL

Edit `tests/e2e/interactive-demo.ts`:
```typescript
const demo = new VirtualPCInteractiveDemo({
  baseUrl: 'http://localhost:3001',
  // ... rest of config
});
```

### Run with Different Timing

Edit `tests/e2e/interactive-demo.ts`:
```typescript
const demo = new VirtualPCInteractiveDemo({
  slowMotion: 1000,  // 1 second between actions (slow)
  // ... rest of config
});
```

Or for fast execution:
```typescript
slowMotion: 100,  // 100ms between actions (fast)
```

## npm Scripts

```bash
# Run interactive demo directly
npm run demo:interactive

# Run with wrapper (auto-starts app if needed)
npm run demo:run

# Run all E2E tests
npm run test:e2e

# Other E2E commands
npm run test:e2e:headless
npm run test:e2e:chrome
npm run test:e2e:firefox
```

## Integration Points

### CI/CD Pipeline

Add to GitHub Actions `.github/workflows/e2e-tests.yml`:

```yaml
- name: Run interactive demo
  run: npm run demo:interactive
  
- name: Upload screenshots
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: demo-screenshots
    path: tests/e2e/screenshots/
```

### Load Testing

Use as baseline for load testing:

```bash
# Run demo, measure performance
time npm run demo:interactive
```

### Regression Testing

Screenshots serve as visual regression baseline:

```bash
# Capture baseline
npm run demo:interactive

# Later, compare new screenshots to baseline
# Identify visual changes
```

## Troubleshooting

### Demo Times Out

**Problem**: Selenium waits too long for elements  
**Solution**: Increase timeout in code:
```typescript
await this.waitForElement(selector, 10000);  // 10 seconds
```

### Mouse Not Moving in Headless Mode

**Problem**: Mouse movements not visible in headless mode  
**Solution**: Set `headless: false` to see movements:
```typescript
headless: false,
```

### Screenshots Not Saving

**Problem**: Directory doesn't exist  
**Solution**: Script creates directory automatically, or manually:
```bash
mkdir -p tests/e2e/screenshots
chmod 755 tests/e2e/screenshots
```

### Performance Metrics Show 0

**Problem**: Page not fully loaded when metrics collected  
**Solution**: Add delay after navigation:
```typescript
await this.driver.wait(until.elementLocated(By.css('body')), 10000);
await this.sleep(2000);  // Additional 2 second wait
```

## Advanced Usage

### Custom Mouse Paths

Extend the demo to draw custom paths:

```typescript
async drawMousePath(): Promise<void> {
  const path = [
    { x: 100, y: 100 },
    { x: 500, y: 200 },
    { x: 900, y: 150 },
    { x: 1200, y: 400 },
  ];

  for (const point of path) {
    await this.actions.move({ x: point.x, y: point.y }).perform();
    await this.sleep(200);
  }
}
```

### Custom Element Interaction

Extend to interact with specific elements:

```typescript
async customInteraction(): Promise<void> {
  // Find and click specific button
  await this.clickElement(
    'button[aria-label="Login"]',
    'Login button'
  );

  // Fill form
  await this.typeText('input[name="email"]', 'test@example.com');
  await this.typeText('input[name="password"]', 'password123');

  // Submit
  await this.clickElement('button[type="submit"]', 'Submit button');
}
```

### Performance Monitoring

Add custom performance tracking:

```typescript
async measurePerformance(): Promise<void> {
  const metrics = await this.driver.executeScript(`
    return {
      memory: performance.memory,
      navigation: performance.getEntriesByType('navigation'),
      timing: performance.timing
    };
  `);
  console.log(JSON.stringify(metrics, null, 2));
}
```

## Files and Structure

```
/home/knight2/virtualpc/
├── tests/e2e/
│   ├── interactive-demo.ts          # Main demo module
│   ├── selenium-launcher.ts         # Standard E2E tests
│   ├── screenshots/                 # Generated screenshots
│   └── results/                     # Test results
├── run-interactive-demo.sh          # Demo launcher script
├── INTERACTIVE-DEMO-GUIDE.md        # This file
└── package.json                     # Updated with demo scripts
```

## Performance Targets

Typical interactive demo execution:

- **Total Runtime**: 30-60 seconds (5 demos)
- **VirtualPC Load**: 1-3 seconds
- **Mouse Movements**: 3-5 seconds
- **Form Interaction**: 2-3 seconds
- **Game Navigation**: 5-10 seconds
- **Memory Usage**: 400-600MB
- **CPU Usage**: 30-60%

## Next Steps

1. **Run the demo**:
   ```bash
   npm run demo:run
   ```

2. **View screenshots**:
   ```bash
   ls tests/e2e/screenshots/
   ```

3. **Customize for your needs**:
   - Edit `tests/e2e/interactive-demo.ts`
   - Add custom demos
   - Modify timeouts and delays

4. **Integrate with CI/CD**:
   - Add to GitHub Actions
   - Collect screenshots as artifacts
   - Use for regression testing

## Resources

- [Selenium WebDriver Docs](https://www.selenium.dev/documentation/)
- [WebDriver Actions API](https://www.selenium.dev/webdriver/)
- [Mouse Movement Guide](https://en.wikipedia.org/wiki/Pointer_capture)

---

**Last Updated**: 2026-04-12  
**Status**: Ready for use  
**Demo Duration**: ~45 seconds  
**Automation Features**: 5 comprehensive demos

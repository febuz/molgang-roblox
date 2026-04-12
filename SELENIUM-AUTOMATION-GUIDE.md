# Selenium Automation Guide for VirtualPC

Automated browser testing and launching for VirtualPC using Selenium WebDriver on Ubuntu.

## Prerequisites

- Ubuntu 18.04+ or Debian-based system
- Node.js 18+
- npm or yarn
- Internet connection

## Quick Start

### 1. Setup Selenium Environment (Ubuntu)

```bash
# Make setup script executable
chmod +x setup-selenium-ubuntu.sh

# Run setup (installs Chrome, ChromeDriver, Firefox, GeckoDriver, etc.)
bash setup-selenium-ubuntu.sh

# Or with sudo if needed
sudo bash setup-selenium-ubuntu.sh
```

This script will:
- Update system packages
- Install Chrome/Chromium
- Install Firefox
- Install ChromeDriver and GeckoDriver
- Install required system dependencies
- Create directories for screenshots and results

### 2. Install Project Dependencies

```bash
cd /home/knight2/virtualpc

# Install npm dependencies (including Selenium)
npm install

# Or reinstall if you just added dependencies
npm install --save-dev selenium-webdriver @types/selenium-webdriver webdriver
```

### 3. Start VirtualPC Application

In one terminal:

```bash
npm run dev
# Application will start at http://localhost:3000
```

### 4. Run Selenium Automation

In another terminal:

```bash
# Using TypeScript directly
npm run test:e2e

# Or using ts-node
npx ts-node tests/e2e/selenium-launcher.ts

# For headless mode (no visual browser window)
HEADLESS=true npm run test:e2e

# Specific browser
npm run test:e2e:chrome    # Chrome/Chromium
npm run test:e2e:firefox   # Firefox
```

## Build and Run Compiled Version

```bash
# Build TypeScript to JavaScript
npm run build

# Run compiled version
node dist/tests/e2e/selenium-launcher.js

# Or run the TypeScript directly with ts-node
npx ts-node tests/e2e/selenium-launcher.ts
```

## What Gets Tested

The automation script performs the following tests:

1. **Page Load** - Verifies page title and URL
2. **Content Visibility** - Checks if main content is visible
3. **Health Endpoint** - Tests API /health endpoint
4. **Page Load Time** - Measures load time (threshold: <5s)

## Output

After tests complete:

1. **Console Output** - Real-time test results
2. **Test Results JSON** - `tests/e2e/results/virtualpc-test-results.json`
3. **Screenshots** - `tests/e2e/screenshots/`
   - `virtualpc-initial.png` - First load
   - `virtualpc-final.png` - After tests

Example console output:
```
🚀 Initializing chrome WebDriver...
✅ chrome WebDriver initialized successfully

📱 Launching VirtualPC at http://localhost:3000...
✅ VirtualPC loaded successfully

⏳ Waiting for application to be ready...
✅ Application is ready

📸 Screenshot saved: tests/e2e/screenshots/virtualpc-initial.png

🧪 Running Tests...

1. Page Load Test
  ✓ Page title: VirtualPC - Autonomous Agent System
  ✓ Current URL: http://localhost:3000/

2. Content Visibility Test
  ✓ Main content visible: true

3. Health Endpoint Test
  ✓ Health check: 200

4. Page Load Time Test
  ✓ Page load time: 1234ms

============================================================
📊 TEST RESULTS
============================================================

✅ Page Load (145ms)
✅ Content Visibility (289ms)
✅ Health Endpoint (156ms)
✅ Page Load Time (1234ms)

------------------------------------------------------------
Total: 4 | Passed: 4 | Failed: 0
Success Rate: 100.0%
============================================================

💾 Results saved to: tests/e2e/results/virtualpc-test-results.json
```

## Configuration

Edit `tests/e2e/selenium-launcher.ts` to customize:

```typescript
const launcher = new VirtualPCSeleniumLauncher({
  browser: 'chrome',        // 'chrome' or 'firefox'
  headless: false,          // true for headless, false for visible
  windowSize: {             // Browser window size
    width: 1920,
    height: 1080
  },
  timeout: 10000,           // Timeout in ms
  baseUrl: 'http://localhost:3000'
});
```

## Browser Support

| Browser | Desktop | Mobile | Status |
|---------|---------|--------|--------|
| Chrome | ✅ | N/A | Fully supported |
| Chromium | ✅ | N/A | Fully supported |
| Firefox | ✅ | N/A | Fully supported |
| Edge | ⚠️ | N/A | Can be configured |

## Troubleshooting

### Chrome/ChromeDriver not found

```bash
# Install manually
sudo apt-get install chromium-browser chromium-chromedriver

# Or use the setup script
bash setup-selenium-ubuntu.sh
```

### Port 3000 already in use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

### Timeout errors

Increase the timeout in the configuration:

```typescript
timeout: 20000  // 20 seconds instead of 10
```

### Screenshots not saving

Ensure directory exists:

```bash
mkdir -p tests/e2e/screenshots
mkdir -p tests/e2e/results
```

### Permission denied errors

Run with appropriate permissions:

```bash
sudo bash setup-selenium-ubuntu.sh
```

## Advanced Usage

### Custom Tests

Add tests to `VirtualPCSeleniumLauncher` class:

```typescript
async testLoginFlow(): Promise<void> {
  const testName = 'Login Flow';
  const startTime = Date.now();

  try {
    // Find login button and click
    await this.click('button[aria-label="Login"]');

    // Type credentials
    await this.typeText('input[name="email"]', 'test@example.com');
    await this.typeText('input[name="password"]', 'password123');

    // Submit form
    await this.click('button[type="submit"]');

    // Wait for redirect
    await this.driver.wait(until.urlContains('/dashboard'), 5000);

    this.results.push({
      test: testName,
      passed: true,
      duration: Date.now() - startTime,
    });
  } catch (error) {
    this.results.push({
      test: testName,
      passed: false,
      duration: Date.now() - startTime,
      error: String(error),
    });
  }
}
```

### Parallel Testing

Run multiple browser instances:

```typescript
const launchers = [
  new VirtualPCSeleniumLauncher({ browser: 'chrome' }),
  new VirtualPCSeleniumLauncher({ browser: 'firefox' }),
];

await Promise.all(launchers.map(l => l.launch()));
```

### Performance Testing

```typescript
async testPerformanceMetrics(): Promise<void> {
  const metrics = await this.driver.executeScript(
    'return window.performance.timing'
  );

  console.log('Navigation Start:', metrics.navigationStart);
  console.log('Load Complete:', metrics.loadEventEnd);
  console.log('Total Load Time:', metrics.loadEventEnd - metrics.navigationStart);
}
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: bash setup-selenium-ubuntu.sh
      - run: npm install
      - run: npm run build
      - run: npm run dev &
      - run: sleep 5
      - run: npm run test:e2e:headless
```

## Performance Targets

- **Page Load**: < 5 seconds
- **Test Completion**: < 30 seconds
- **Memory Usage**: < 500MB per browser instance
- **CPU Usage**: < 50% during tests

## Useful Commands

```bash
# Run specific browser
npm run test:e2e:chrome

# Run headless (no visual window)
HEADLESS=true npm run test:e2e

# Run and watch for changes
npm run test:e2e -- --watch

# Compile and run
npm run build && node dist/tests/e2e/selenium-launcher.js

# Check Chrome version
google-chrome --version

# Check ChromeDriver version
chromedriver --version

# Kill all Chrome processes
pkill -f chrome

# Check what's using port 3000
lsof -i :3000
```

## Resources

- [Selenium WebDriver Documentation](https://www.selenium.dev/documentation/)
- [WebDriver API](https://www.selenium.dev/webdriver/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Firefox GeckoDriver](https://github.com/mozilla/geckodriver)

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review error messages in console output
3. Check screenshots in `tests/e2e/screenshots/`
4. Verify VirtualPC is running on http://localhost:3000
5. Ensure Selenium dependencies are installed: `npm install`

---

**Last Updated**: 2026-04-12
**Status**: Ready for use

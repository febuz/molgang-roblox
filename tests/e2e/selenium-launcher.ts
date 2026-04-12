/**
 * Selenium Browser Automation for VirtualPC
 * Launches VirtualPC in a browser and performs automated interactions
 */

import { Builder, WebDriver, By, until, WebElement } from 'selenium-webdriver';
import Chrome from 'selenium-webdriver/chrome';
import Firefox from 'selenium-webdriver/firefox';
import * as fs from 'fs';
import * as path from 'path';

interface BrowserConfig {
  browser: 'chrome' | 'firefox';
  headless: boolean;
  windowSize: { width: number; height: number };
  timeout: number;
  baseUrl: string;
}

interface TestResult {
  test: string;
  passed: boolean;
  duration: number;
  error?: string;
}

export class VirtualPCSeleniumLauncher {
  private driver: WebDriver | null = null;
  private config: BrowserConfig;
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor(config: Partial<BrowserConfig> = {}) {
    this.config = {
      browser: config.browser || 'chrome',
      headless: config.headless !== false,
      windowSize: config.windowSize || { width: 1920, height: 1080 },
      timeout: config.timeout || 10000,
      baseUrl: config.baseUrl || 'http://localhost:3000',
    };
  }

  /**
   * Initialize the WebDriver
   */
  async initialize(): Promise<void> {
    console.log(`\n🚀 Initializing ${this.config.browser} WebDriver...`);

    try {
      const builder = new Builder().forBrowser(this.config.browser);

      if (this.config.browser === 'chrome') {
        const chromeOptions = new Chrome.Options();
        if (this.config.headless) {
          chromeOptions.addArguments('--headless=new');
        }
        chromeOptions.addArguments(
          `--window-size=${this.config.windowSize.width},${this.config.windowSize.height}`,
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer'
        );
        builder.setChromeOptions(chromeOptions);
      } else if (this.config.browser === 'firefox') {
        const firefoxOptions = new Firefox.Options();
        if (this.config.headless) {
          firefoxOptions.addArguments('--headless');
        }
        firefoxOptions.addArguments(`--width=${this.config.windowSize.width}`, `--height=${this.config.windowSize.height}`);
        builder.setFirefoxOptions(firefoxOptions);
      }

      this.driver = await builder.build();
      this.driver.manage().setTimeouts({ implicit: this.config.timeout });

      console.log(`✅ ${this.config.browser} WebDriver initialized successfully`);
    } catch (error) {
      console.error('❌ Failed to initialize WebDriver:', error);
      throw error;
    }
  }

  /**
   * Launch VirtualPC application
   */
  async launch(): Promise<void> {
    if (!this.driver) throw new Error('WebDriver not initialized');

    console.log(`\n📱 Launching VirtualPC at ${this.config.baseUrl}...`);
    this.startTime = Date.now();

    try {
      await this.driver.get(this.config.baseUrl);
      await this.driver.wait(until.elementLocated(By.css('body')), this.config.timeout);

      console.log('✅ VirtualPC loaded successfully');
    } catch (error) {
      console.error('❌ Failed to launch VirtualPC:', error);
      throw error;
    }
  }

  /**
   * Wait for application to be ready
   */
  async waitForApplicationReady(): Promise<void> {
    if (!this.driver) throw new Error('WebDriver not initialized');

    console.log('\n⏳ Waiting for application to be ready...');

    try {
      // Wait for main app container
      await this.driver.wait(
        until.elementLocated(By.css('[id="root"], [id="app"], [class*="container"]')),
        this.config.timeout
      );

      // Wait for any loading spinners to disappear
      try {
        await this.driver.wait(
          until.stalenessOf(await this.driver.findElement(By.css('[class*="loading"], [class*="spinner"]')).catch(() => null)),
          3000
        );
      } catch {
        // Loading indicator might not exist, which is fine
      }

      console.log('✅ Application is ready');
    } catch (error) {
      console.error('❌ Application failed to become ready:', error);
      throw error;
    }
  }

  /**
   * Get current page title
   */
  async getPageTitle(): Promise<string> {
    if (!this.driver) throw new Error('WebDriver not initialized');
    return await this.driver.getTitle();
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    if (!this.driver) throw new Error('WebDriver not initialized');
    return await this.driver.getCurrentUrl();
  }

  /**
   * Get page source
   */
  async getPageSource(): Promise<string> {
    if (!this.driver) throw new Error('WebDriver not initialized');
    return await this.driver.getPageSource();
  }

  /**
   * Take a screenshot
   */
  async takeScreenshot(filename: string): Promise<string> {
    if (!this.driver) throw new Error('WebDriver not initialized');

    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const filepath = path.join(screenshotDir, filename);
    const screenshot = await this.driver.takeScreenshot();
    fs.writeFileSync(filepath, screenshot, 'base64');

    console.log(`📸 Screenshot saved: ${filepath}`);
    return filepath;
  }

  /**
   * Find element by CSS selector
   */
  async findElement(selector: string): Promise<WebElement | null> {
    if (!this.driver) throw new Error('WebDriver not initialized');

    try {
      return await this.driver.findElement(By.css(selector));
    } catch {
      return null;
    }
  }

  /**
   * Find all elements by CSS selector
   */
  async findElements(selector: string): Promise<WebElement[]> {
    if (!this.driver) throw new Error('WebDriver not initialized');

    return await this.driver.findElements(By.css(selector));
  }

  /**
   * Click an element
   */
  async click(selector: string): Promise<void> {
    if (!this.driver) throw new Error('WebDriver not initialized');

    const element = await this.driver.findElement(By.css(selector));
    await this.driver.executeScript('arguments[0].scrollIntoView(true);', element);
    await element.click();
  }

  /**
   * Type text into an element
   */
  async typeText(selector: string, text: string): Promise<void> {
    if (!this.driver) throw new Error('WebDriver not initialized');

    const element = await this.driver.findElement(By.css(selector));
    await element.clear();
    await element.sendKeys(text);
  }

  /**
   * Get element text
   */
  async getText(selector: string): Promise<string> {
    if (!this.driver) throw new Error('WebDriver not initialized');

    const element = await this.driver.findElement(By.css(selector));
    return await element.getText();
  }

  /**
   * Test: Page loads successfully
   */
  async testPageLoad(): Promise<void> {
    const testName = 'Page Load';
    const startTime = Date.now();

    try {
      const title = await this.getPageTitle();
      const url = await this.getCurrentUrl();

      console.log(`  ✓ Page title: ${title}`);
      console.log(`  ✓ Current URL: ${url}`);

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
      throw error;
    }
  }

  /**
   * Test: Check if main content is visible
   */
  async testContentVisibility(): Promise<void> {
    const testName = 'Content Visibility';
    const startTime = Date.now();

    try {
      const element = await this.findElement('[id="root"], [id="app"], [class*="main"]');

      if (!element) {
        throw new Error('Main content container not found');
      }

      const isDisplayed = await element.isDisplayed();
      console.log(`  ✓ Main content visible: ${isDisplayed}`);

      this.results.push({
        test: testName,
        passed: isDisplayed,
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

  /**
   * Test: Verify API health endpoint
   */
  async testHealthEndpoint(): Promise<void> {
    const testName = 'Health Endpoint';
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.config.baseUrl}/health`);
      const isHealthy = response.ok;

      console.log(`  ✓ Health check: ${response.status}`);

      this.results.push({
        test: testName,
        passed: isHealthy,
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

  /**
   * Test: Measure page load time
   */
  async testPageLoadTime(): Promise<void> {
    const testName = 'Page Load Time';
    const duration = Date.now() - this.startTime;
    const isAcceptable = duration < 5000; // 5 seconds threshold

    console.log(`  ✓ Page load time: ${duration}ms`);

    this.results.push({
      test: testName,
      passed: isAcceptable,
      duration: duration,
    });
  }

  /**
   * Run all tests
   */
  async runTests(): Promise<void> {
    console.log('\n🧪 Running Tests...\n');

    try {
      console.log('1. Page Load Test');
      await this.testPageLoad();

      console.log('\n2. Content Visibility Test');
      await this.testContentVisibility();

      console.log('\n3. Health Endpoint Test');
      await this.testHealthEndpoint();

      console.log('\n4. Page Load Time Test');
      await this.testPageLoadTime();
    } catch (error) {
      console.error('Error during testing:', error);
    }
  }

  /**
   * Print test results
   */
  printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(60) + '\n');

    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;

    this.results.forEach((result) => {
      const icon = result.passed ? '✅' : '❌';
      const error = result.error ? `\n   Error: ${result.error}` : '';
      console.log(`${icon} ${result.test} (${result.duration}ms)${error}`);
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Save results to file
   */
  saveResultsToFile(filename: string = 'test-results.json'): void {
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filepath = path.join(resultsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));

    console.log(`\n💾 Results saved to: ${filepath}`);
  }

  /**
   * Close the browser
   */
  async quit(): Promise<void> {
    if (this.driver) {
      console.log('\n🔌 Closing browser...');
      await this.driver.quit();
      this.driver = null;
      console.log('✅ Browser closed');
    }
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const launcher = new VirtualPCSeleniumLauncher({
    browser: 'chrome',
    headless: false, // Set to true for headless mode
    windowSize: { width: 1920, height: 1080 },
    baseUrl: 'http://localhost:3000',
  });

  try {
    // Initialize WebDriver
    await launcher.initialize();

    // Launch application
    await launcher.launch();

    // Wait for app to be ready
    await launcher.waitForApplicationReady();

    // Take initial screenshot
    await launcher.takeScreenshot('virtualpc-initial.png');

    // Run tests
    await launcher.runTests();

    // Print results
    launcher.printResults();

    // Save results
    launcher.saveResultsToFile('virtualpc-test-results.json');

    // Take final screenshot
    await launcher.takeScreenshot('virtualpc-final.png');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await launcher.quit();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export default VirtualPCSeleniumLauncher;

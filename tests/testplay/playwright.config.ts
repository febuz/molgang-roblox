import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for VirtualPC testplay.
 *
 * Alexander runs this nightly (and on every CI deploy). Scenarios live in
 * tests/testplay/*.spec.ts. Results are written to tests/testplay/results/
 * and exposed via /api/testplay/latest.
 */
export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'results/latest.json' }],
  ],
  use: {
    baseURL: process.env.TESTPLAY_BASE_URL || 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
    // Enable when load-test farm lands:
    // { name: 'z-fold-5',        use: { ...devices['Galaxy Z Fold 5'] } },
    // { name: 'iphone-16',       use: { ...devices['iPhone 15 Pro'] } },
  ],
});

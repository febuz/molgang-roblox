#!/usr/bin/env tsx
import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', msg => console.log(`[page ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => console.log('[page error]', err.message));
  await page.goto('http://localhost:3100/dashboard.html', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'data/verify-dashboard.png', fullPage: true });

  // Check that Data-* agents are rendered
  const teamHtml = await page.locator('#team-overview').innerHTML().catch(() => '');
  const hasDataAgents = /Data-/.test(teamHtml);
  console.log('Has Data-* agents in team overview:', hasDataAgents);

  // Check task stats are updated
  const activeTasks = await page.locator('#active-tasks').textContent().catch(() => '');
  console.log('Active tasks text:', activeTasks);

  await browser.close();
})();

import { test, expect, Page } from '@playwright/test';

/**
 * Atom Lab testplay scenario.
 *
 * Drives the 2D MOLGANG web game end-to-end:
 *   1. Load /game/2d, confirm the hub renders
 *   2. Navigate to the Atom Lab zone
 *   3. Click atoms on the canvas until at least 3 are collected
 *   4. Confirm the HUD atom counter reflects the collection
 *   5. Navigate to the Synthesis Lab, assert recipes render
 *
 * Human-like pacing: 80-180ms between clicks, mouse moves to target
 * before clicking, no teleports.
 */

const humanWait = (min = 80, max = 180) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

async function humanClick(page: Page, x: number, y: number) {
  await page.mouse.move(x, y, { steps: 8 });
  await humanWait();
  await page.mouse.click(x, y);
  await humanWait();
}

test.describe('MOLGANG — Atom Lab', () => {
  test('hub loads with expected zones', async ({ page }) => {
    await page.goto('/game/2d');
    await expect(page.locator('#hub')).toBeVisible();
    await expect(page.locator('#hub')).toContainText('Chemical Engineering Simulator');
    await expect(page.locator('#hub')).toContainText('Atom Lab');
    await expect(page.locator('#hub')).toContainText('Fertilizer Factory');
  });

  test('atom collection advances HUD counter', async ({ page }) => {
    await page.goto('/game/2d');
    await page.click('.nav-btn:has-text("Lab")');
    await expect(page.locator('#lab-canvas')).toBeVisible();

    // Canvas-based — click in a 3x3 grid to cover where atoms might be floating
    const canvas = page.locator('#lab-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('no canvas bounding box');

    let collected = 0;
    for (let attempt = 0; attempt < 25 && collected < 3; attempt++) {
      for (let i = 0; i < 3 && collected < 3; i++) {
        for (let j = 0; j < 3 && collected < 3; j++) {
          const x = box.x + (box.width * (i + 0.5)) / 3;
          const y = box.y + (box.height * (j + 0.5)) / 3;
          await humanClick(page, x, y);
          const count = parseInt((await page.locator('#h-atoms').textContent()) || '0', 10);
          if (count > collected) collected = count;
        }
      }
      await humanWait(300, 500);
    }

    expect(collected).toBeGreaterThanOrEqual(3);
  });

  test('synthesis recipes render with tier badges', async ({ page }) => {
    await page.goto('/game/2d');
    await page.click('.nav-btn:has-text("Recipes")');
    await expect(page.locator('#recipe-list')).toBeVisible();
    await expect(page.locator('.recipe-card').first()).toBeVisible();
    await expect(page.locator('.r-tier').first()).toBeVisible();
  });
});

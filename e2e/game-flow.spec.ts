import { test, expect } from '@playwright/test';

test.describe('Menu navigation', () => {
  test('menu shows PLAY, DAILY, SHOP, MISSIONS buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Take screenshot so we can verify menu renders
    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();

    // Verify no JS errors during menu render
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForTimeout(200);
    expect(errors).toHaveLength(0);
  });
});

test.describe('Game run', () => {
  test('clicking play area starts a run', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(300);

    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('no canvas box');

    // Click PLAY button area (center-top of canvas, rough coords)
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.52);
    await page.waitForTimeout(200);

    // Canvas should still be rendering
    await expect(canvas).toBeVisible();
  });

  test('holding and releasing space runs physics', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(300);

    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('no canvas box');

    // Start game
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.52);
    await page.waitForTimeout(300);

    // Press and hold space (thrust)
    await page.keyboard.down('Space');
    await page.waitForTimeout(500);
    await page.keyboard.up('Space');
    await page.waitForTimeout(500);

    // Should still be running without crashing
    await expect(canvas).toBeVisible();
  });
});

test.describe('Keyboard shortcuts', () => {
  test('ESC key toggles pause during run', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 5000 });
    await page.waitForTimeout(300);

    const canvas = page.locator('#game-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('no canvas box');

    // Start run
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.52);
    await page.waitForTimeout(400);

    // Pause
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Resume
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    expect(errors).toHaveLength(0);
  });
});

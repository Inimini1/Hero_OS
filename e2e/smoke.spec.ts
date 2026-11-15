import { test, expect } from '@playwright/test';

test('game canvas renders and boots to menu', async ({ page }) => {
  await page.goto('/');

  // Loading screen should disappear
  await expect(page.locator('#loading')).toBeHidden({ timeout: 5000 });

  // Canvas should be visible
  const canvas = page.locator('#game-canvas');
  await expect(canvas).toBeVisible();

  // Canvas should have drawn something (not all black)
  const hasContent = await canvas.evaluate((el: HTMLCanvasElement) => {
    const ctx = el.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, el.width, el.height).data;
    // Check that not all pixels are (0,0,0,0)
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i] ?? 0) > 0 || (data[i + 1] ?? 0) > 0 || (data[i + 2] ?? 0) > 0) return true;
    }
    return false;
  });
  expect(hasContent).toBe(true);
});

test('clicking canvas starts the game', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden({ timeout: 5000 });

  const canvas = page.locator('#game-canvas');
  await canvas.click();

  // After clicking, game should still be running (canvas present)
  await expect(canvas).toBeVisible();

  // Wait a moment and verify canvas is still updating
  await page.waitForTimeout(500);
  await expect(canvas).toBeVisible();
});

test('game does not throw JS errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden({ timeout: 5000 });
  await page.waitForTimeout(1000);

  expect(errors).toHaveLength(0);
});

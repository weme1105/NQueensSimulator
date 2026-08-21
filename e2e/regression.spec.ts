import { expect, test, type Page } from '@playwright/test';

async function installPlayableBoard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const app = window.nqApp;
    if (!app) throw new Error('nqApp bridge is missing');
    const size = 4;
    const cells = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        cells.push({ row, col, regionId: row, state: 0 });
      }
    }
    app.installBoard({ size, cells });
  });
}

async function enterPlayMode(page: Page): Promise<void> {
  await installPlayableBoard(page);
  await page.locator('#play').click();
  await expect(page.locator('body')).toHaveClass(/nq-play-mode/, { timeout: 15_000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#board .cell')).toHaveCount(64);
});

test('global settings live in the app bar instead of puzzle toolbar', async ({ page }) => {
  const appBar = page.locator('.nq-app-bar');
  const settings = page.locator('.nq-settings-button');
  await expect(appBar).toBeVisible();
  await expect(settings).toBeVisible();
  await expect(appBar.locator('.nq-settings-button')).toHaveCount(1);
  await expect(page.locator('.toolbar .nq-settings-button')).toHaveCount(0);
});

test('display settings switch region modes and coordinate visibility', async ({ page }) => {
  await page.locator('.nq-settings-button').click();
  await expect(page.locator('.nq-settings-backdrop')).toHaveClass(/open/);

  const regionSelect = page.locator('.nq-region-select');
  await regionSelect.selectOption('numbers');
  await expect(page.locator('body')).toHaveClass(/nq-region-numbers-only/);
  await expect(page.locator('body')).not.toHaveClass(/nq-region-colors-only/);

  await regionSelect.selectOption('colors');
  await expect(page.locator('body')).toHaveClass(/nq-region-colors-only/);
  await expect(page.locator('body')).not.toHaveClass(/nq-region-numbers-only/);

  await regionSelect.selectOption('both');
  await expect(page.locator('body')).not.toHaveClass(/nq-region-numbers-only/);
  await expect(page.locator('body')).not.toHaveClass(/nq-region-colors-only/);

  const coordinates = page.locator('.nq-show-coordinates');
  await expect(coordinates).toBeChecked();
  await coordinates.uncheck();
  await expect(page.locator('body')).toHaveClass(/nq-hide-coordinates/);
  await coordinates.check();
  await expect(page.locator('body')).not.toHaveClass(/nq-hide-coordinates/);
});

test('play-only tips appear in global app bar and close when leaving play mode', async ({ page }) => {
  await expect(page.locator('.nq-rule-tip')).not.toBeVisible();
  await expect(page.locator('.nq-operation-tip')).not.toBeVisible();

  await enterPlayMode(page);
  await expect(page.locator('.nq-app-bar .nq-rule-tip')).toBeVisible();
  await expect(page.locator('.nq-app-bar .nq-operation-tip')).toBeVisible();

  await page.locator('.nq-operation-tip').click();
  await expect(page.locator('.nq-operation-panel')).toHaveClass(/open/);

  await page.locator('#play').click();
  await expect(page.locator('body')).not.toHaveClass(/nq-play-mode/);
  await expect(page.locator('.nq-operation-panel')).not.toHaveClass(/open/);
  await expect(page.locator('.annotation-tools')).not.toBeVisible();
});

test('annotation More panel exposes drawing appearance controls', async ({ page }) => {
  await enterPlayMode(page);
  const tools = page.locator('.annotation-tools');
  await expect(tools).toBeVisible();

  await expect(page.locator('.annotation-more-panel')).not.toBeVisible();
  await page.locator('.annotation-more-toggle').click();
  await expect(tools).toHaveClass(/more-open/);
  await expect(page.locator('.annotation-color')).toBeVisible();
  await expect(page.locator('.annotation-opacity')).toBeVisible();
  await expect(page.locator('.annotation-width')).toBeVisible();

  await page.locator('.annotation-more-toggle').click();
  await expect(tools).not.toHaveClass(/more-open/);
  await expect(page.locator('.annotation-more-panel')).not.toBeVisible();
});

test('annotation primary row keeps only dropdown, More, Undo and Clear', async ({ page }) => {
  await enterPlayMode(page);
  const row = page.locator('.annotation-row');
  await expect(row.locator('.annotation-tool-select')).toHaveCount(1);
  await expect(row.locator('.annotation-more-toggle')).toHaveCount(1);
  await expect(row.locator('.annotation-undo')).toHaveCount(1);
  await expect(row.locator('.annotation-clear')).toHaveCount(1);
  await expect(row.locator('.annotation-eraser')).toHaveCount(0);
});

test('board size picker respects 4 to 20 limits', async ({ page }) => {
  for (let i = 0; i < 10; i++) await page.locator('.nq-size-minus').click();
  await expect(page.locator('.nq-size-current')).toHaveText('4');
  await expect(page.locator('.nq-size-minus')).toBeDisabled();

  for (let i = 0; i < 20; i++) await page.locator('.nq-size-plus').click();
  await expect(page.locator('.nq-size-current')).toHaveText('20');
  await expect(page.locator('.nq-size-plus')).toBeDisabled();
});

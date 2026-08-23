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

function settingsButton(page: Page) {
  return page.locator('.nq-app-bar .nq-settings-button');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#board .cell')).toHaveCount(64);
});

test('global settings live in the app bar instead of puzzle toolbar', async ({ page }) => {
  const appBar = page.locator('.nq-app-bar');
  const settings = settingsButton(page);
  await expect(appBar).toBeVisible();
  await expect(settings).toHaveCount(1);
  await expect(settings).toBeVisible();
  await expect(page.locator('.nq-settings-button')).toHaveCount(1);
  await expect(page.locator('.toolbar .nq-settings-button')).toHaveCount(0);
});

test('display settings switch region modes and coordinate visibility', async ({ page }) => {
  await settingsButton(page).click();
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

test('display settings persist after reload', async ({ page }) => {
  await settingsButton(page).click();
  await page.locator('.nq-region-select').selectOption('numbers');
  await page.locator('.nq-show-coordinates').uncheck();
  await page.reload();
  await expect(page.locator('#board .cell')).toHaveCount(64);
  await expect(page.locator('body')).toHaveClass(/nq-region-numbers-only/);
  await expect(page.locator('body')).toHaveClass(/nq-hide-coordinates/);
  await settingsButton(page).click();
  await expect(page.locator('.nq-region-select')).toHaveValue('numbers');
  await expect(page.locator('.nq-show-coordinates')).not.toBeChecked();
});

test('settings dialog closes through close button, backdrop and Escape', async ({ page }) => {
  const button = settingsButton(page);
  const backdrop = page.locator('.nq-settings-backdrop');
  await button.click();
  await page.locator('.nq-settings-close').click();
  await expect(backdrop).not.toHaveClass(/open/);

  await button.click();
  await backdrop.click({ position: { x: 4, y: 4 } });
  await expect(backdrop).not.toHaveClass(/open/);

  await button.click();
  await page.keyboard.press('Escape');
  await expect(backdrop).not.toHaveClass(/open/);
});

test('play-only tips appear in global app bar and close when leaving play mode', async ({ page }) => {
  await expect(page.locator('.nq-rule-tip')).not.toBeVisible();
  await expect(page.locator('.nq-operation-tip')).not.toBeVisible();

  await enterPlayMode(page);
  await expect(page.locator('.nq-app-bar .nq-rule-tip')).toBeVisible();
  await expect(page.locator('.nq-app-bar .nq-operation-tip')).toBeVisible();

  await page.locator('.nq-operation-tip').click();
  await expect(page.locator('.nq-operation-panel')).toHaveClass(/open/);
  await expect(page.locator('#play')).toBeVisible();

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

test('annotation appearance controls update their displayed values', async ({ page }) => {
  await enterPlayMode(page);
  await page.locator('.annotation-more-toggle').click();
  await page.locator('.annotation-opacity').fill('42');
  await expect(page.locator('.annotation-opacity-value')).toHaveText('42%');
  await page.locator('.annotation-width').fill('14');
  await expect(page.locator('.annotation-width-value')).toHaveText('14');
  await page.locator('.annotation-color').fill('#123456');
  await expect(page.locator('.annotation-color')).toHaveValue('#123456');
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
  const minus = page.locator('.nq-size-minus');
  const plus = page.locator('.nq-size-plus');
  const current = page.locator('.nq-size-current');

  await expect(current).toHaveText('8');
  for (let i = 0; i < 4; i++) await minus.click();
  await expect(current).toHaveText('4');
  await expect(minus).toBeDisabled();

  for (let i = 0; i < 16; i++) await plus.click();
  await expect(current).toHaveText('20');
  await expect(plus).toBeDisabled();
});

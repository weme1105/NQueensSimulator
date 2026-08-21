import { expect, test } from '@playwright/test';

async function enterPlayMode(page: import('@playwright/test').Page): Promise<void> {
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

  await page.locator('#play').click();
  await expect(page.locator('body')).toHaveClass(/nq-play-mode/, { timeout: 15_000 });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#board .cell')).toHaveCount(64);
});

test('loads the app and resizes the board through the UI', async ({ page }) => {
  await expect(page.locator('.nq-size-current')).toHaveText('8');
  await page.locator('.nq-size-plus').click();
  await expect(page.locator('.nq-size-current')).toHaveText('9');

  await page.locator('#new').click();
  await expect(page.locator('#board .cell')).toHaveCount(81);
});

test('rejects random generation above the supported limit', async ({ page }) => {
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#n');
    if (!input) throw new Error('#n is missing');
    input.value = '13';
  });
  await page.locator('#random').click();
  await expect(page.locator('#status')).toContainText('最大支援 12×12');
});

test('unlocks solver tools after seven Operation Tips taps', async ({ page }) => {
  await enterPlayMode(page);

  const operationTips = page.locator('.nq-operation-tip');
  await expect(operationTips).toBeVisible();
  for (let i = 0; i < 7; i++) await operationTips.click();

  await expect(page.locator('#stepSolve')).toBeVisible();
  await expect(page.locator('#autoQueen')).toBeVisible();
});

test('annotation tool dropdown includes eraser and can be disabled', async ({ page }) => {
  await enterPlayMode(page);

  const tool = page.locator('.annotation-tool-select');
  await expect(tool).toBeVisible();
  await expect(tool.locator('option[value="eraser"]')).toHaveText('橡皮擦');

  await tool.selectOption('eraser');
  await expect(tool).toHaveValue('eraser');
  await expect(page.locator('.annotation-canvas')).toHaveClass(/enabled/);

  await tool.selectOption('off');
  await expect(tool).toHaveValue('off');
  await expect(page.locator('.annotation-canvas')).not.toHaveClass(/enabled/);
});

import { test, expect } from '@playwright/test';

// Each Playwright test gets a fresh browser context (empty IndexedDB), so
// tests build their own data through the real UI.

test('log time against a categorized item and see it in the category cards', async ({ page }) => {
  // Create a category.
  await page.goto('/#/categories');
  await page.getByPlaceholder('New category name').fill('Work');
  await page.getByRole('button', { name: 'Add category' }).click();
  await expect(page.getByRole('button', { name: 'Work', exact: true })).toBeVisible();

  // Create a time item in it.
  await page.goto('/#/time');
  await page.getByRole('button', { name: 'New item' }).click();
  await page.getByLabel('Title').fill('Client project');
  await page.getByLabel('Category').selectOption({ label: 'Work' });
  await page.getByRole('button', { name: 'Create item' }).click();

  // Item renders with its category badge; category cards are hidden until
  // time-related sections render, then show zeroed tiles.
  const item = page.locator('.time-item', { hasText: 'Client project' });
  await expect(item.locator('.time-item-category')).toHaveText('Work');

  // Log 30 minutes.
  await item.getByRole('button', { name: 'Add 15 minutes' }).click();
  await page.locator('.time-item', { hasText: 'Client project' }).getByRole('button', { name: 'Add 15 minutes' }).click();

  // Overall summary and the Work category card both show the logged time.
  await expect(page.locator('.time-overall .time-today-value')).toHaveText('30m');
  const workCard = page.locator('.time-category-card', { has: page.getByRole('heading', { name: 'Work' }) });
  await expect(workCard.locator('.time-summary-value').nth(0)).toHaveText('30m'); // Today
  await expect(workCard.locator('.time-summary-value').nth(1)).toHaveText('30m'); // Week
  await expect(workCard.locator('.time-summary-value').nth(2)).toHaveText('30m'); // Month

  // Subtracting below zero prunes the day: totals return to zero.
  await page.locator('.time-item', { hasText: 'Client project' }).getByRole('button', { name: 'Subtract 15 minutes' }).click();
  await page.locator('.time-item', { hasText: 'Client project' }).getByRole('button', { name: 'Subtract 15 minutes' }).click();
  await expect(page.locator('.time-overall .time-today-value')).toHaveText('0m');
});

test('an uncategorized item alone shows no category cards', async ({ page }) => {
  await page.goto('/#/time');
  await page.getByRole('button', { name: 'New item' }).click();
  await page.getByLabel('Title').fill('Podcasts');
  await page.getByRole('button', { name: 'Create item' }).click();

  await expect(page.locator('.time-item', { hasText: 'Podcasts' })).toBeVisible();
  await expect(page.locator('.time-category-cards')).toHaveCount(0);
});

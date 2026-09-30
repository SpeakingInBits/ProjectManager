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

test('settings can group items by category and sort them within groups', async ({ page }) => {
  // Two categories and four items, created in non-alphabetical order.
  await page.goto('/#/categories');
  for (const name of ['Work', 'Personal']) {
    await page.getByPlaceholder('New category name').fill(name);
    await page.getByRole('button', { name: 'Add category' }).click();
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  }
  const items: Array<[string, string | null]> = [
    ['Zebra', 'Work'],
    ['Errands', null],
    ['Alpha', 'Work'],
    ['Books', 'Personal'],
  ];
  for (const [title, category] of items) {
    await page.goto('/#/time/new');
    await page.getByLabel('Title').fill(title);
    if (category) await page.getByLabel('Category').selectOption({ label: category });
    await page.getByRole('button', { name: 'Create item' }).click();
    await expect(page.locator('.time-item', { hasText: title })).toBeVisible();
  }

  const titles = page.locator('.time-item-title');

  // Default: creation order, no group headings.
  await expect(titles).toHaveText([/Zebra/, /Errands/, /Alpha/, /Books/]);
  await expect(page.locator('.time-group-title')).toHaveCount(0);

  // Group by category: alphabetical groups, "No category" last, creation
  // order within groups.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Group items by category').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.time-group-title')).toHaveText(['Personal', 'Work', 'No category']);
  await expect(titles).toHaveText([/Books/, /Zebra/, /Alpha/, /Errands/]);

  // Both checked: sorted within groups.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Sort items alphabetically').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(titles).toHaveText([/Books/, /Alpha/, /Zebra/, /Errands/]);

  // The view settings survive a reload (persisted in localStorage).
  await page.reload();
  await expect(page.locator('.time-group-title')).toHaveText(['Personal', 'Work', 'No category']);
  await expect(titles).toHaveText([/Books/, /Alpha/, /Zebra/, /Errands/]);
});

test('an uncategorized item alone shows no category cards', async ({ page }) => {
  await page.goto('/#/time');
  await page.getByRole('button', { name: 'New item' }).click();
  await page.getByLabel('Title').fill('Podcasts');
  await page.getByRole('button', { name: 'Create item' }).click();

  await expect(page.locator('.time-item', { hasText: 'Podcasts' })).toBeVisible();
  await expect(page.locator('.time-category-cards')).toHaveCount(0);
});

test('merging an item moves its logged time into the target and deletes it', async ({ page }) => {
  for (const title of ['Design', 'Design (dup)']) {
    await page.goto('/#/time/new');
    await page.getByLabel('Title').fill(title);
    await page.getByRole('button', { name: 'Create item' }).click();
    await expect(page.locator('.time-item', { hasText: title })).toBeVisible();
  }
  const item = (title: string) => page.locator('.time-item').filter({ has: page.getByText(title, { exact: true }) });

  // 30m on the target, 15m on the duplicate.
  await item('Design').getByRole('button', { name: 'Add 15 minutes' }).click();
  await item('Design').getByRole('button', { name: 'Add 15 minutes' }).click();
  await item('Design (dup)').getByRole('button', { name: 'Add 15 minutes' }).click();
  await expect(item('Design').locator('.time-total')).toHaveText('30m');

  // Merge the duplicate into the target from its edit page.
  await item('Design (dup)').getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('button', { name: 'Merge into another item…' }).click();
  const merge = page.getByRole('button', { name: 'Merge', exact: true });
  await expect(merge).toBeDisabled();
  await page.getByLabel('Merge into').selectOption({ label: 'Design' });
  await merge.click();

  // Back on the Time page: one item left, holding the combined time.
  await expect(page.locator('.time-item')).toHaveCount(1);
  await expect(item('Design').locator('.time-total')).toHaveText('45m');
  await expect(page.locator('.time-overall .time-today-value')).toHaveText('45m');
});

test('merge is not offered when there is no other item', async ({ page }) => {
  await page.goto('/#/time/new');
  await page.getByLabel('Title').fill('Only item');
  await page.getByRole('button', { name: 'Create item' }).click();
  await page.locator('.time-item', { hasText: 'Only item' }).getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit time item' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Merge into another item…' })).toHaveCount(0);
});

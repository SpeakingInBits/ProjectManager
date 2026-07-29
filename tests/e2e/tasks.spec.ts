import { test, expect } from '@playwright/test';

test('create a standalone task, complete it, and find it under "Show completed"', async ({ page }) => {
  await page.goto('/#/tasks/new');
  await page.getByLabel('Title').fill('Write more tests');
  await page.getByRole('button', { name: 'Create task' }).click();

  // Lands on the tasks list with the new task visible.
  const item = page.locator('.task-item', { hasText: 'Write more tests' });
  await expect(item).toBeVisible();

  // Completing hides it (completed tasks are filtered out by default).
  await item.getByRole('checkbox').check();
  await expect(page.locator('.task-item')).toHaveCount(0);

  // "Show completed" reveals it, struck through via the done modifier class.
  await page.getByLabel('Show completed').check();
  const done = page.locator('.task-item', { hasText: 'Write more tests' });
  await expect(done).toBeVisible();
  await expect(done).toHaveClass(/task-item--done/);
});

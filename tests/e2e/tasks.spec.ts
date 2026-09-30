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

test('completion confirmation setting guards completing a task and persists', async ({ page }) => {
  await page.goto('/#/tasks/new');
  await page.getByLabel('Title').fill('Confirm me');
  await page.getByRole('button', { name: 'Create task' }).click();
  const item = page.locator('.task-item', { hasText: 'Confirm me' });
  await expect(item).toBeVisible();

  // Turn confirmation on from the Tasks page settings.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByLabel('Ask for confirmation before completing a task').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // Declining the dialog leaves the task open and its checkbox unchecked.
  const messages: string[] = [];
  page.once('dialog', (dialog) => {
    messages.push(dialog.message());
    void dialog.dismiss();
  });
  // click(), not check(): check() asserts the box ends up checked, but the
  // re-render replaces the row (here unchecked, below removed).
  await item.getByRole('checkbox').click();
  await expect(item.getByRole('checkbox')).not.toBeChecked();
  expect(messages).toEqual(['Mark "Confirm me" as completed?']);

  // The setting survives a reload; accepting completes the task.
  await page.reload();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('.task-item', { hasText: 'Confirm me' }).getByRole('checkbox').click();
  await expect(page.locator('.task-item')).toHaveCount(0);

  // Un-completing never asks (no dialog handler registered — Playwright
  // would auto-dismiss one, which would leave the task completed).
  await page.getByLabel('Show completed').check();
  await page.locator('.task-item--done', { hasText: 'Confirm me' }).getByRole('checkbox').click();
  await expect(page.locator('.task-item--done')).toHaveCount(0);
  await page.getByLabel('Show completed').uncheck();
  await expect(page.locator('.task-item', { hasText: 'Confirm me' })).toBeVisible();
});

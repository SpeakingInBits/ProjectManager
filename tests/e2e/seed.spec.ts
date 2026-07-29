import { test, expect } from '@playwright/test';

// Smoke test: seedTestData() (the dev-only console helper) populates every
// page. Counts are exact because the seeder uses a fixed-seed PRNG — if the
// seeder's dataset changes shape, update these numbers alongside it.

declare global {
  interface Window {
    seedTestData: () => Promise<void>;
  }
}

test('seedTestData populates projects, tasks, and time pages', async ({ page }) => {
  await page.goto('/#/');
  await page.waitForFunction(() => typeof window.seedTestData === 'function');

  // seedTestData reloads the page when done, which destroys the evaluate
  // context — fire it without awaiting the in-page promise.
  await page.evaluate(() => {
    void window.seedTestData();
  });

  // The reload lands back on the projects page, now populated.
  await expect(page.locator('.project-card')).toHaveCount(5, { timeout: 15000 });

  // 26 seeded tasks, 6 completed → 20 visible with the default filter.
  await page.goto('/#/tasks');
  await expect(page.locator('.task-item')).toHaveCount(20);

  await page.goto('/#/time');
  await expect(page.locator('.time-item')).toHaveCount(7);
  // Seeded time history populates all three category cards plus "No category".
  await expect(page.locator('.time-category-card')).toHaveCount(4);
});

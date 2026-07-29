import { defineConfig, devices } from '@playwright/test';

// UI tests drive the real app in Chromium against the Vite dev server (started
// automatically if not already running). Each test gets a fresh browser
// context, so IndexedDB always starts empty — no cleanup needed between tests.
export default defineConfig({
  testDir: 'tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});

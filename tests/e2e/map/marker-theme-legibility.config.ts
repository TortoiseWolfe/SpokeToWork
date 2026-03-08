import { defineConfig, devices } from '@playwright/test';

/**
 * Minimal Playwright config for marker theme legibility screenshots.
 * No webServer — expects Storybook to already be running on :6006.
 *
 * Run:
 *   docker compose exec spoketowork pnpm exec playwright test \
 *     --config=tests/e2e/map/marker-theme-legibility.config.ts
 */
export default defineConfig({
  testDir: '.',
  // .manual.ts extension so the main playwright.config.ts (testDir
  // ./tests/e2e, no testMatch filter) doesn't pick this up — it would
  // fail ×39 projects trying to hit :6006 while webServer starts :3000.
  testMatch: 'marker-theme-legibility.manual.ts',
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'off',
    screenshot: 'off', // We handle screenshots manually
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

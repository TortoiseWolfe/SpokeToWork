import { defineConfig, devices } from '@playwright/test';

/**
 * Minimal Playwright config for Storybook audit.
 * No webServer — expects Storybook to already be running.
 */
export default defineConfig({
  testDir: '.',
  testMatch: 'storybook-audit.spec.ts',
  timeout: 300_000,
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

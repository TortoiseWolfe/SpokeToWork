/**
 * Auth Setup - Creates shared authenticated session for E2E tests
 *
 * This runs ONCE before all tests and saves authenticated state.
 * Tests then reuse this state instead of logging in repeatedly.
 *
 * Playwright pattern: https://playwright.dev/docs/auth
 */

import { test as setup, expect } from '@playwright/test';
import {
  createTestUser,
  generateTestEmail,
  DEFAULT_TEST_PASSWORD,
} from './utils/test-user-factory';

const AUTH_FILE = 'tests/e2e/fixtures/storage-state-auth.json';

setup('authenticate shared test user', async ({ page }) => {
  // Use primary test user from env, or create a shared one
  const email =
    process.env.TEST_USER_PRIMARY_EMAIL || generateTestEmail('e2e-shared');
  const password = DEFAULT_TEST_PASSWORD;

  // Ensure user exists with confirmed email
  if (!process.env.TEST_USER_PRIMARY_EMAIL) {
    await createTestUser(email, password, { createProfile: true });
  }

  // Navigate to sign-in
  await page.goto('/sign-in');

  // Fill credentials and submit
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for successful auth - URL changes away from sign-in
  await page.waitForURL((url) => !url.pathname.includes('/sign-in'), {
    timeout: 15000,
  });

  // Verify authenticated state - user menu should be visible
  const userMenu = page.locator('[aria-label="User account menu"]');
  await expect(userMenu).toBeVisible({ timeout: 15000 });

  // Dismiss cookie banner if present (include in saved state)
  const acceptButton = page.getByRole('button', { name: /accept all/i });
  if (await acceptButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await acceptButton.click();
  }

  // Save authenticated state
  await page.context().storageState({ path: AUTH_FILE });

  console.log(`✓ Auth setup complete: ${email}`);
});

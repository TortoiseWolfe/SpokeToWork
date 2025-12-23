/**
 * Auth Setup - Creates shared authenticated session for E2E tests
 *
 * This runs ONCE before all tests and saves authenticated state.
 * Tests then reuse this state instead of logging in repeatedly.
 *
 * Playwright pattern: https://playwright.dev/docs/auth
 */

import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import {
  createTestUser,
  generateTestEmail,
  DEFAULT_TEST_PASSWORD,
} from './utils/test-user-factory';

const AUTH_FILE = 'tests/e2e/fixtures/storage-state-auth.json';

/**
 * Check if existing auth state is still valid
 */
function isAuthStateValid(): boolean {
  try {
    if (!fs.existsSync(AUTH_FILE)) return false;

    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const origin = state.origins?.find(
      (o: { origin: string }) => o.origin === 'http://localhost:3000'
    );
    if (!origin) return false;

    const authToken = origin.localStorage?.find((item: { name: string }) =>
      item.name.includes('auth-token')
    );
    if (!authToken) return false;

    const tokenData = JSON.parse(authToken.value);
    const expiresAt = tokenData.expires_at;

    // Check if token expires more than 5 minutes from now
    const now = Math.floor(Date.now() / 1000);
    return expiresAt > now + 300;
  } catch {
    return false;
  }
}

setup('authenticate shared test user', async ({ page }) => {
  // Skip login if we already have a valid auth state
  if (isAuthStateValid()) {
    console.log('✓ Auth setup skipped: using existing valid session');
    return;
  }

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

  // Check for rate limiting error before attempting login
  const rateLimitError = page.getByText(/temporarily locked|too many/i);
  if (await rateLimitError.isVisible({ timeout: 1000 }).catch(() => false)) {
    throw new Error(
      'Account is rate-limited. Wait 10 minutes or use a different test user.'
    );
  }

  // Fill credentials and submit
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Check for rate limiting error after login attempt
  if (await rateLimitError.isVisible({ timeout: 2000 }).catch(() => false)) {
    throw new Error(
      'Account is rate-limited. Wait 10 minutes or use a different test user.'
    );
  }

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

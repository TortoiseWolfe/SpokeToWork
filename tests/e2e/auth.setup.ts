/**
 * Auth Setup - Creates shared authenticated session for E2E tests
 *
 * This runs ONCE before all tests and saves authenticated state.
 * Tests then reuse this state instead of logging in repeatedly.
 *
 * Playwright pattern: https://playwright.dev/docs/auth
 *
 * Feature: 062-fix-e2e-auth
 * - Improved token validation to handle multiple origins (3000, 3001)
 * - Better error handling and logging
 * - Extended token expiry threshold (10 minutes)
 */

import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import {
  createTestUser,
  generateTestEmail,
  DEFAULT_TEST_PASSWORD,
} from './utils/test-user-factory';
import { ensureTestRoutes } from './utils/supabase-admin';

const AUTH_FILE = 'tests/e2e/fixtures/storage-state-auth.json';

// Force re-authentication if set (useful for debugging)
const FORCE_REAUTH = process.env.FORCE_E2E_REAUTH === 'true';

/**
 * Check if existing auth state is still valid
 *
 * Validates:
 * 1. File exists
 * 2. Contains auth token for a localhost origin (3000 or 3001)
 * 3. Token expires more than 10 minutes from now
 */
function isAuthStateValid(): boolean {
  // Allow forcing re-authentication via env var
  if (FORCE_REAUTH) {
    console.log('FORCE_E2E_REAUTH=true, skipping cached auth');
    return false;
  }

  try {
    if (!fs.existsSync(AUTH_FILE)) {
      console.log('Auth state file not found, will authenticate');
      return false;
    }

    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));

    // Find origin matching the base URL host (localhost or Docker service name).
    // BASE_URL may be http://localhost:3000 or http://spoketowork:3000 etc.
    const baseHost = (() => {
      try {
        return new URL(process.env.BASE_URL || 'http://localhost:3000').host;
      } catch {
        return 'localhost:3000';
      }
    })();

    const origin = state.origins?.find((o: { origin: string }) => {
      try {
        return new URL(o.origin).host === baseHost;
      } catch {
        return false;
      }
    });

    if (!origin) {
      console.log('No localhost origin found in auth state');
      return false;
    }

    const authToken = origin.localStorage?.find((item: { name: string }) =>
      item.name.includes('auth-token')
    );

    if (!authToken) {
      console.log('No auth-token found in localStorage');
      return false;
    }

    const tokenData = JSON.parse(authToken.value);
    const expiresAt = tokenData.expires_at;

    if (!expiresAt) {
      console.log('Token has no expires_at field');
      return false;
    }

    // Check if token expires more than 10 minutes from now (increased from 5)
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = expiresAt - now;

    if (timeRemaining < 600) {
      // 10 minutes
      console.log(
        `Token expires in ${timeRemaining}s (< 10 min), will re-authenticate`
      );
      return false;
    }

    console.log(`Auth state valid, token expires in ${timeRemaining}s`);
    return true;
  } catch (error) {
    console.log('Error checking auth state:', error);
    return false;
  }
}

// Increase timeout for auth setup (default 30s may not be enough for slow hydration)
setup.setTimeout(60000);

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

  // Ensure user exists with confirmed email (only if using dynamic user)
  if (!process.env.TEST_USER_PRIMARY_EMAIL) {
    console.log('Creating dynamic test user...');
    await createTestUser(email, password, { createProfile: true });
  }

  console.log(`Authenticating as: ${email}`);

  // Navigate to sign-in
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');

  // Check if already redirected away from sign-in (user might already be logged in)
  const currentUrl = page.url();
  const isOnSignIn = currentUrl.includes('/sign-in');

  if (!isOnSignIn) {
    console.log(
      'Already redirected from sign-in page (user may be logged in), checking auth...'
    );
    // Verify we're actually logged in by checking for user menu
    const userMenu = page.locator('[aria-label="User account menu"]');
    if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✓ User already logged in, saving fresh auth state');
      await page.context().storageState({ path: AUTH_FILE });
      return;
    }
    // If no user menu visible, navigate back to sign-in to try logging in
    console.log('Not logged in, navigating to sign-in...');
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
  }

  // Dismiss cookie banner FIRST (before login) to prevent it blocking form elements
  const acceptButton = page.getByRole('button', { name: /accept all/i });
  if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Dismissing cookie consent banner...');
    await acceptButton.click();
    await page.waitForTimeout(500); // Wait for banner animation
  }

  // Dismiss any promotional banners that might block the form
  const dismissBanner = page.getByRole('button', {
    name: /dismiss.*banner/i,
  });
  if (await dismissBanner.isVisible({ timeout: 500 }).catch(() => false)) {
    await dismissBanner.click();
    await page.waitForTimeout(300);
  }

  // Check if user menu is now visible (might have been hidden by banners)
  const userMenuCheck = page.locator('[aria-label="User account menu"]');
  if (await userMenuCheck.isVisible({ timeout: 1000 }).catch(() => false)) {
    console.log('✓ User already logged in after dismissing banners');
    await page.context().storageState({ path: AUTH_FILE });
    return;
  }

  // Check for rate limiting error before attempting login
  const rateLimitError = page.getByText(/temporarily locked|too many/i);
  if (await rateLimitError.isVisible({ timeout: 1000 }).catch(() => false)) {
    throw new Error(
      'Account is rate-limited. Wait 10 minutes or use a different test user.'
    );
  }

  // Verify we're on sign-in page with login form visible
  // Wait longer for client-side hydration - form may take time to render
  const emailInput = page.locator('input[type="email"], input[name="email"]');

  // Wait up to 15 seconds for the form to appear (client-side hydration can be slow)
  let formVisible = false;
  for (let i = 0; i < 15; i++) {
    if (await emailInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      formVisible = true;
      break;
    }
    // Check if user is actually logged in (redirected)
    if (await userMenuCheck.isVisible({ timeout: 100 }).catch(() => false)) {
      console.log('✓ User is logged in (redirected from sign-in)');
      await page.context().storageState({ path: AUTH_FILE });
      return;
    }
    // Log progress
    if (i === 5) {
      console.log('Waiting for sign-in form to render...');
    }
  }

  if (!formVisible) {
    // Take a screenshot for debugging
    await page.screenshot({
      path: 'test-results/auth-form-not-visible.png',
    });
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());
    throw new Error(
      `Login form not visible after 15s. URL: ${page.url()}. Check test-results/auth-form-not-visible.png`
    );
  }

  // Fill credentials and submit
  await emailInput.fill(email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Check for rate limiting error after login attempt
  if (await rateLimitError.isVisible({ timeout: 2000 }).catch(() => false)) {
    throw new Error(
      'Account is rate-limited. Wait 10 minutes or use a different test user.'
    );
  }

  // Wait for successful auth - URL changes away from sign-in
  try {
    await page.waitForURL((url) => !url.pathname.includes('/sign-in'), {
      timeout: 15000,
    });
  } catch {
    // Check for error message on page
    const errorMessage = await page
      .locator('.alert-error, [role="alert"]')
      .textContent()
      .catch(() => null);
    if (errorMessage) {
      throw new Error(`Login failed: ${errorMessage}`);
    }
    throw new Error(
      `Login failed: Still on sign-in page after 15s. Check credentials for ${email}`
    );
  }

  // Verify authenticated state - user menu should be visible
  const userMenu = page.locator('[aria-label="User account menu"]');
  try {
    await expect(userMenu).toBeVisible({ timeout: 15000 });
  } catch {
    throw new Error(
      `Login appeared to succeed (redirected from sign-in) but user menu not visible. ` +
        `Auth state may not be properly hydrating.`
    );
  }

  // Save authenticated state
  await page.context().storageState({ path: AUTH_FILE });

  // Ensure test user has routes for route E2E tests
  await ensureTestRoutes(email);

  console.log(`✓ Auth setup complete: ${email}`);
});

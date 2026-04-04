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

// Increase timeout — derives encryption keys for 3 users (up to 40s each on firefox)
setup.setTimeout(360000);

setup('authenticate shared test user', async ({ page }) => {
  // Skip login if we already have a valid auth state AND all users' keys are cached
  if (isAuthStateValid()) {
    // Check if SECONDARY and TERTIARY keys are in the storageState
    const secondaryEmail2 = process.env.TEST_USER_SECONDARY_EMAIL;
    const tertiaryEmail2 = process.env.TEST_USER_TERTIARY_EMAIL;
    let allKeysCached = true;

    try {
      const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
      const localStorage = state.origins?.[0]?.localStorage || [];
      const cachedKeys = localStorage
        .filter((item: { name: string }) => item.name.startsWith('stw_keys_'))
        .map((item: { name: string }) => item.name);

      // We need at least keys for all configured test users
      if (cachedKeys.length < 2) {
        allKeysCached = false;
        console.log(
          `Auth state valid but only ${cachedKeys.length} user key(s) cached — need to derive more`
        );
      }

      // NOTE: Do NOT check DB for keys here. global-setup deletes DB rows
      // but the file cache is still valid for session auth. Re-derivation
      // takes 3+ min per user under CI load and exceeds the 360s timeout
      // when 18 shards all derive simultaneously. Instead, messaging tests
      // use waitForEncryptionKeys() in their beforeAll to poll for DB keys
      // before sending messages.
    } catch {
      allKeysCached = false;
    }

    if (allKeysCached) {
      console.log('✓ Auth setup skipped: valid session + all keys cached');
      return;
    }
    // Fall through to derive missing keys
    console.log('Auth state valid but missing user keys — deriving...');
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

  // Ensure secondary and tertiary test users exist (needed for multi-user E2E tests)
  const secondaryEmail = process.env.TEST_USER_SECONDARY_EMAIL;
  const secondaryPassword = process.env.TEST_USER_SECONDARY_PASSWORD;
  const tertiaryEmail = process.env.TEST_USER_TERTIARY_EMAIL;
  const tertiaryPassword = process.env.TEST_USER_TERTIARY_PASSWORD;

  if (secondaryEmail && secondaryPassword) {
    try {
      const { getUserByEmail } = await import('./utils/test-user-factory');
      const existing = await getUserByEmail(secondaryEmail);
      if (!existing) {
        console.log(`Creating secondary test user: ${secondaryEmail}`);
        await createTestUser(secondaryEmail, secondaryPassword, {
          createProfile: true,
        });
      }
    } catch (err) {
      console.warn(`Failed to ensure secondary user: ${err}`);
    }
  }

  if (tertiaryEmail && tertiaryPassword) {
    try {
      const { getUserByEmail } = await import('./utils/test-user-factory');
      const existing = await getUserByEmail(tertiaryEmail);
      if (!existing) {
        console.log(`Creating tertiary test user: ${tertiaryEmail}`);
        await createTestUser(tertiaryEmail, tertiaryPassword, {
          createProfile: true,
        });
      }
    } catch (err) {
      console.warn(`Failed to ensure tertiary user: ${err}`);
    }
  }

  console.log(`Authenticating as: ${email}`);

  // Navigate to sign-in
  // Use domcontentloaded instead of networkidle - WebKit fires networkidle
  // before React hydration completes, causing login form timeouts
  await page.goto('/sign-in');
  await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');
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

  // Wait up to 20 seconds for the form to appear (client-side hydration can be slow,
  // especially on WebKit which fires networkidle before React is interactive)
  let formVisible = false;
  for (let i = 0; i < 20; i++) {
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
      `Login form not visible after 20s. URL: ${page.url()}. Check test-results/auth-form-not-visible.png`
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

  // Pre-derive encryption keys so all tests start with cached keys in localStorage.
  // Without this, every messaging test triggers a ReAuth modal + argon2id
  // (90s on firefox, causing shard 2/4 timeout).
  console.log('Pre-deriving encryption keys for messaging tests...');
  await page.goto('/messages');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(3000); // Let React hydrate

  // Handle encryption setup page if keys haven't been initialized.
  // global-setup.ts deletes all keys from the DB, so the app must query Supabase
  // Cloud, discover no keys exist, and redirect to /messages/setup. Under 18-shard
  // contention this round-trip can take 5-10s, so wait up to 15s for the button.
  const setupBtn = page.locator(
    'button:has-text("Set Up Encrypted Messaging")'
  );
  if (await setupBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
    const pwd = process.env.TEST_USER_PRIMARY_PASSWORD || password;
    await page.locator('#setup-password').fill(pwd);
    await page.locator('#setup-confirm').fill(pwd);
    await setupBtn.click();
    await page.waitForURL(/\/messages(?!\/setup)/, { timeout: 120000 });
    console.log('✓ Encryption keys initialized');
  }

  // Handle ReAuth modal (derives keys via argon2id, caches to localStorage)
  const reAuthInput = page.locator('#reauth-password');
  if (await reAuthInput.isVisible({ timeout: 15000 }).catch(() => false)) {
    const pwd = process.env.TEST_USER_PRIMARY_PASSWORD || password;
    await reAuthInput.fill(pwd);
    const unlockBtn = page.getByRole('button', { name: /unlock/i });
    if (await unlockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await unlockBtn.click();
      // Wait for argon2id to complete (up to 120s on firefox)
      await page
        .locator('[role="presentation"], [role="dialog"]')
        .first()
        .waitFor({ state: 'hidden', timeout: 120000 });
      console.log('✓ Encryption keys derived and cached to localStorage');
    }
  } else {
    console.log('✓ No ReAuth modal (keys already available)');
  }

  // Save authenticated state WITH encryption key cache in localStorage
  await page.context().storageState({ path: AUTH_FILE });

  // Pre-derive encryption keys for SECONDARY and TERTIARY test users.
  // Each needs its own browser context (different auth session).
  // The browser-derived keys are compatible with all browser engines
  // (Node.js @noble/curves keys are NOT compatible with firefox WebCrypto).
  const additionalUsers = [
    { email: secondaryEmail, password: secondaryPassword },
    { email: tertiaryEmail, password: tertiaryPassword },
  ].filter(
    (u): u is { email: string; password: string } => !!u.email && !!u.password
  );

  for (const { email: userEmail, password: userPwd } of additionalUsers) {
    console.log(`Pre-deriving encryption keys for ${userEmail}...`);
    const browser = page.context().browser();
    if (!browser) continue;

    const ctx = await browser.newContext();
    const p = await ctx.newPage();

    try {
      // Log in as this user
      await p.goto('/sign-in');
      await p.waitForLoadState('domcontentloaded');
      const emailInput = p.locator('input[type="email"], input[name="email"]');
      await emailInput.waitFor({ state: 'visible', timeout: 10000 });
      await emailInput.fill(userEmail);
      await p.fill('input[type="password"], input[name="password"]', userPwd);
      await p.click('button[type="submit"]');
      await p
        .waitForURL((url) => !url.pathname.includes('/sign-in'), {
          timeout: 15000,
        })
        .catch(() => {});

      // Navigate to /messages and handle encryption setup + ReAuth
      await p.goto('/messages');
      await p.waitForLoadState('domcontentloaded');
      await p.waitForTimeout(3000);

      // Handle encryption setup page
      const setupBtn2 = p.locator(
        'button:has-text("Set Up Encrypted Messaging")'
      );
      if (await setupBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
        await p.locator('#setup-password').fill(userPwd);
        await p.locator('#setup-confirm').fill(userPwd);
        await setupBtn2.click();
        await p.waitForURL(/\/messages(?!\/setup)/, { timeout: 180000 });
      }

      // Handle ReAuth modal
      const reAuth2 = p.locator('#reauth-password');
      if (await reAuth2.isVisible({ timeout: 15000 }).catch(() => false)) {
        await reAuth2.fill(userPwd);
        const unlock2 = p.getByRole('button', { name: /unlock/i });
        if (await unlock2.isVisible({ timeout: 3000 }).catch(() => false)) {
          await unlock2.click();
          // Argon2id key derivation takes 60-90s on chromium, up to 180s on
          // Firefox/WebKit under CI contention (12 parallel shards).
          await p
            .locator('[role="presentation"], [role="dialog"]')
            .first()
            .waitFor({ state: 'hidden', timeout: 180000 });
        }
      }

      // Extract stw_keys_* entries from this context's localStorage
      const keys = await p.evaluate(() => {
        const entries: { name: string; value: string }[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith('stw_keys_')) {
            entries.push({ name: k, value: localStorage.getItem(k)! });
          }
        }
        return entries;
      });

      // Merge into the saved storageState file
      if (keys.length > 0) {
        const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
        if (state.origins?.[0]?.localStorage) {
          for (const entry of keys) {
            state.origins[0].localStorage =
              state.origins[0].localStorage.filter(
                (item: { name: string }) => item.name !== entry.name
              );
            state.origins[0].localStorage.push(entry);
          }
          fs.writeFileSync(AUTH_FILE, JSON.stringify(state, null, 2));
          console.log(`✓ Keys derived and cached for ${userEmail}`);
        }
      }
    } catch (err) {
      console.warn(`⚠ Key derivation failed for ${userEmail}:`, err);
    } finally {
      await ctx.close();
    }
  }

  // Ensure test user has routes for route E2E tests
  await ensureTestRoutes(email);

  console.log(`✓ Auth setup complete: ${email}`);
});

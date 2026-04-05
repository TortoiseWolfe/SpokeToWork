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
import { getShardUsers } from './utils/shard-users';
import {
  hasPrebakedKeys,
  getPrebakedKeysForUser,
} from './utils/prebaked-keys';

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
  // Per-shard users: each shard authenticates its own unique users
  const shardUsers = getShardUsers();
  const isShardMode = !!process.env.E2E_SHARD_INDEX;

  // FAST PATH: When pre-baked keys are available in shard mode, sign in via API
  // instead of browser. This avoids GoTrue rate limiting (24 shards all hitting
  // the sign-in UI simultaneously) and eliminates Argon2id entirely.
  if (isShardMode && hasPrebakedKeys()) {
    console.log('Using programmatic auth with pre-baked keys...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('⚠ Missing SUPABASE_URL or ANON_KEY — falling back to browser auth');
    } else {
      const client = createClient(supabaseUrl, supabaseAnonKey);
      const allUsers = [
        shardUsers.primary,
        shardUsers.secondary,
        shardUsers.tertiary,
      ];

      // Sign in all users and collect their sessions + pre-baked keys
      const localStorageEntries: { name: string; value: string }[] = [];

      for (const user of allUsers) {
        const prebaked = getPrebakedKeysForUser(user.email);
        if (!prebaked) continue;

        // Retry sign-in — newly created users may take a moment to be available
        let data: Awaited<ReturnType<typeof client.auth.signInWithPassword>>['data'] | null = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          const result = await client.auth.signInWithPassword({
            email: user.email,
            password: user.password,
          });
          if (!result.error && result.data.session) {
            data = result.data;
            break;
          }
          console.log(`  Sign-in attempt ${attempt + 1}/5 for ${user.email}: ${result.error?.message}`);
          await new Promise((r) => setTimeout(r, 3000));
        }

        if (!data?.session) {
          console.warn(`⚠ Programmatic sign-in failed for ${user.email} after 5 attempts`);
          continue;
        }

        const userId = data.user.id;

        // Add auth token to localStorage entries
        const tokenKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
        localStorageEntries.push({
          name: tokenKey,
          value: JSON.stringify(data.session),
        });

        // Add pre-baked encryption keys
        localStorageEntries.push({
          name: `stw_keys_${userId}`,
          value: JSON.stringify(prebaked.localStorage),
        });

        console.log(`✓ Programmatic auth + keys for ${user.email} (${userId.slice(0, 8)}...)`);
      }

      if (localStorageEntries.length > 0) {
        // Build storage state JSON (same format Playwright expects)
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const origin = new URL(baseUrl).origin;
        const storageState = {
          cookies: [],
          origins: [
            {
              origin,
              localStorage: localStorageEntries,
            },
          ],
        };

        fs.writeFileSync(AUTH_FILE, JSON.stringify(storageState, null, 2));
        console.log(`✓ Programmatic auth complete — ${localStorageEntries.length / 2} users, storage state written`);

        // Still need routes for route E2E tests
        await ensureTestRoutes(shardUsers.primary.email);
        return;
      }
      // Fall through to browser auth if programmatic failed
      console.warn('⚠ No sessions created — falling back to browser auth');
    }
  }

  // Skip login if we already have a valid auth state AND all users' keys are cached.
  // In shard mode, always re-authenticate (cached state is for shared user, not shard user).
  if (!isShardMode && isAuthStateValid()) {
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

  // Use shard-specific users in CI, or env vars / dynamic user locally
  const email = isShardMode
    ? shardUsers.primary.email
    : process.env.TEST_USER_PRIMARY_EMAIL || generateTestEmail('e2e-shared');
  const password = shardUsers.primary.password;

  // Ensure user exists with confirmed email (only if using dynamic user locally)
  if (!isShardMode && !process.env.TEST_USER_PRIMARY_EMAIL) {
    console.log('Creating dynamic test user...');
    await createTestUser(email, password, { createProfile: true });
  }

  // Secondary and tertiary user credentials.
  // In shard mode: always set (shard-specific emails).
  // In local dev: only set if env vars are configured (smoke tests skip these).
  const secondaryEmail = isShardMode
    ? shardUsers.secondary.email
    : process.env.TEST_USER_SECONDARY_EMAIL;
  const secondaryPassword = isShardMode
    ? shardUsers.secondary.password
    : process.env.TEST_USER_SECONDARY_PASSWORD;
  const tertiaryEmail = isShardMode
    ? shardUsers.tertiary.email
    : process.env.TEST_USER_TERTIARY_EMAIL;
  const tertiaryPassword = isShardMode
    ? shardUsers.tertiary.password
    : process.env.TEST_USER_TERTIARY_PASSWORD;

  // In local dev, ensure secondary/tertiary users exist
  if (!isShardMode) {
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

  // Inject encryption keys into localStorage.
  // With pre-baked keys: inject directly (no Argon2id, no /messages navigation).
  // Without pre-baked keys (local dev): navigate to /messages and derive via UI.
  const primaryPrebaked = getPrebakedKeysForUser(email);
  if (primaryPrebaked) {
    // Pre-baked keys: inject into localStorage via page.evaluate
    // The app reads stw_keys_{userId} on load and skips ReAuth if present.
    await page.goto('/'); // Need a page loaded to access localStorage
    await page.waitForLoadState('domcontentloaded');

    // Get the user ID from the auth session
    const userId = await page.evaluate(() => {
      const storageKeys = Object.keys(localStorage);
      const authKey = storageKeys.find(
        (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
      );
      if (!authKey) return null;
      try {
        const session = JSON.parse(localStorage.getItem(authKey) || '{}');
        return session?.user?.id || null;
      } catch {
        return null;
      }
    });

    if (userId) {
      await page.evaluate(
        ({ uid, keys }) => {
          localStorage.setItem(`stw_keys_${uid}`, JSON.stringify(keys));
        },
        { uid: userId, keys: primaryPrebaked.localStorage }
      );
      console.log(`✓ Pre-baked encryption keys injected for ${email} (${userId.slice(0, 8)}...)`);
    } else {
      console.warn('⚠ Could not extract userId from auth session — falling back to UI derivation');
    }
  }

  // Fall back to UI-based key derivation if no pre-baked keys or injection failed
  if (!primaryPrebaked) {
    console.log('Pre-deriving encryption keys via UI (no pre-baked keys)...');
    await page.goto('/messages');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

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

    const reAuthInput = page.locator('#reauth-password');
    if (await reAuthInput.isVisible({ timeout: 15000 }).catch(() => false)) {
      const pwd = process.env.TEST_USER_PRIMARY_PASSWORD || password;
      await reAuthInput.fill(pwd);
      const unlockBtn = page.getByRole('button', { name: /unlock/i });
      if (await unlockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await unlockBtn.click();
        await page
          .locator('[role="presentation"], [role="dialog"]')
          .first()
          .waitFor({ state: 'hidden', timeout: 120000 });
        console.log('✓ Encryption keys derived and cached to localStorage');
      }
    } else {
      console.log('✓ No ReAuth modal (keys already available)');
    }
  }

  // Save authenticated state WITH encryption key cache in localStorage
  await page.context().storageState({ path: AUTH_FILE });

  // Inject encryption keys for SECONDARY and TERTIARY test users.
  // With pre-baked keys: inject directly into the storageState file (no browser needed).
  // Without pre-baked keys (local dev): derive via UI in separate browser contexts.
  const additionalUsers = [
    { email: secondaryEmail, password: secondaryPassword },
    { email: tertiaryEmail, password: tertiaryPassword },
  ].filter(
    (u): u is { email: string; password: string } => !!u.email && !!u.password
  );

  if (hasPrebakedKeys()) {
    // Pre-baked keys path: inject into storageState file directly.
    // We need user IDs for the localStorage key names (stw_keys_{userId}).
    // Log in each user briefly just to get their userId, then inject keys.
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));

    for (const { email: userEmail } of additionalUsers) {
      const prebaked = getPrebakedKeysForUser(userEmail);
      if (!prebaked) continue;

      const browser = page.context().browser();
      if (!browser) continue;
      const ctx = await browser.newContext();
      const p = await ctx.newPage();

      try {
        // Quick login to get userId
        await p.goto('/sign-in');
        await p.waitForLoadState('domcontentloaded');
        const emailInput = p.locator('input[type="email"], input[name="email"]');
        await emailInput.waitFor({ state: 'visible', timeout: 10000 });
        await emailInput.fill(userEmail);
        await p.fill(
          'input[type="password"], input[name="password"]',
          additionalUsers.find((u) => u.email === userEmail)?.password || ''
        );
        await p.click('button[type="submit"]');
        await p
          .waitForURL((url) => !url.pathname.includes('/sign-in'), {
            timeout: 15000,
          })
          .catch(() => {});

        // Extract userId from auth session
        const userId = await p.evaluate(() => {
          const storageKeys = Object.keys(localStorage);
          const authKey = storageKeys.find(
            (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
          );
          if (!authKey) return null;
          try {
            const session = JSON.parse(localStorage.getItem(authKey) || '{}');
            return session?.user?.id || null;
          } catch {
            return null;
          }
        });

        if (userId && state.origins?.[0]?.localStorage) {
          const entry = {
            name: `stw_keys_${userId}`,
            value: JSON.stringify(prebaked.localStorage),
          };
          state.origins[0].localStorage = state.origins[0].localStorage.filter(
            (item: { name: string }) => item.name !== entry.name
          );
          state.origins[0].localStorage.push(entry);
          console.log(`✓ Pre-baked keys injected for ${userEmail} (${userId.slice(0, 8)}...)`);
        } else {
          console.warn(`⚠ Could not get userId for ${userEmail}`);
        }
      } catch (err) {
        console.warn(`⚠ Key injection failed for ${userEmail}:`, err);
      } finally {
        await ctx.close();
      }
    }

    fs.writeFileSync(AUTH_FILE, JSON.stringify(state, null, 2));
  } else {
    // No pre-baked keys (local dev): derive via UI in separate browser contexts.
    for (const { email: userEmail, password: userPwd } of additionalUsers) {
      console.log(`Pre-deriving encryption keys for ${userEmail}...`);
      const browser = page.context().browser();
      if (!browser) continue;

      const ctx = await browser.newContext();
      const p = await ctx.newPage();

      try {
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

        await p.goto('/messages');
        await p.waitForLoadState('domcontentloaded');
        await p.waitForTimeout(3000);

        const setupBtn2 = p.locator(
          'button:has-text("Set Up Encrypted Messaging")'
        );
        if (await setupBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
          await p.locator('#setup-password').fill(userPwd);
          await p.locator('#setup-confirm').fill(userPwd);
          await setupBtn2.click();
          await p.waitForURL(/\/messages(?!\/setup)/, { timeout: 180000 });
        }

        const reAuth2 = p.locator('#reauth-password');
        if (await reAuth2.isVisible({ timeout: 15000 }).catch(() => false)) {
          await reAuth2.fill(userPwd);
          const unlock2 = p.getByRole('button', { name: /unlock/i });
          if (await unlock2.isVisible({ timeout: 3000 }).catch(() => false)) {
            await unlock2.click();
            await p
              .locator('[role="presentation"], [role="dialog"]')
              .first()
              .waitFor({ state: 'hidden', timeout: 180000 });
          }
        }

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

        if (keys.length > 0) {
          const state2 = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
          if (state2.origins?.[0]?.localStorage) {
            for (const entry of keys) {
              state2.origins[0].localStorage =
                state2.origins[0].localStorage.filter(
                  (item: { name: string }) => item.name !== entry.name
                );
              state2.origins[0].localStorage.push(entry);
            }
            fs.writeFileSync(AUTH_FILE, JSON.stringify(state2, null, 2));
            console.log(`✓ Keys derived and cached for ${userEmail}`);
          }
        }
      } catch (err) {
        console.warn(`⚠ Key derivation failed for ${userEmail}:`, err);
      } finally {
        await ctx.close();
      }
    }
  }

  // Ensure test user has routes for route E2E tests
  await ensureTestRoutes(email);

  console.log(`✓ Auth setup complete: ${email}`);
});

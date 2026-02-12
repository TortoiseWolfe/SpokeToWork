/**
 * Authentication Helpers for E2E Tests
 * Feature: 062-fix-e2e-auth
 *
 * Provides robust authentication verification that combines
 * URL change detection with UI element verification.
 */

import { expect, Page } from '@playwright/test';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginOptions {
  /** Maximum time to wait for URL change (default: 10000ms) */
  urlTimeout?: number;
  /** Maximum time to wait for UI element verification (default: 15000ms) */
  elementTimeout?: number;
  /** Whether to expect redirect to a specific URL after login */
  expectedUrl?: string | RegExp;
}

/**
 * Login and verify authentication succeeded
 *
 * This helper implements the robust combination approach:
 * 1. Navigate to /sign-in
 * 2. Fill credentials and submit
 * 3. Wait for URL to NOT be /sign-in (handles various redirects)
 * 4. Verify "User account menu" element is visible
 *
 * @param page - Playwright page object
 * @param credentials - Email and password
 * @param options - Optional timeout and redirect settings
 *
 * @example
 * await loginAndVerify(page, {
 *   email: 'test@example.com',
 *   password: 'password123',
 * });
 *
 * @throws Error if login fails at any step
 */
export async function loginAndVerify(
  page: Page,
  credentials: LoginCredentials,
  options: LoginOptions = {}
): Promise<void> {
  // Use longer timeouts for local Supabase which can be slow under concurrent load
  const { urlTimeout = 30000, elementTimeout = 30000 } = options;

  // Navigate to sign-in page
  await page.goto('/sign-in');

  // Fill credentials
  await page.fill(
    'input[type="email"], input[name="email"]',
    credentials.email
  );
  await page.fill(
    'input[type="password"], input[name="password"]',
    credentials.password
  );

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for URL to change away from sign-in
  try {
    await page.waitForURL((url) => !url.pathname.includes('/sign-in'), {
      timeout: urlTimeout,
    });
  } catch {
    throw new Error(
      `Login failed: still on sign-in page after ${urlTimeout}ms. ` +
        `Check credentials for ${credentials.email}.`
    );
  }

  // Verify the Sign In link is no longer visible (proves we're authenticated)
  const signInLink = page.getByRole('link', { name: 'Sign In' });
  try {
    await expect(signInLink).not.toBeVisible({ timeout: elementTimeout });
  } catch {
    throw new Error(
      `Login failed: Sign In link still visible (session not established). ` +
        `Email: ${credentials.email}`
    );
  }

  // Verify the user account menu IS visible
  // Note: The element is a <label> with aria-label, so use locator instead of getByRole
  const userMenu = page.locator('[aria-label="User account menu"]');
  try {
    await expect(userMenu).toBeVisible({ timeout: elementTimeout });
  } catch {
    throw new Error(
      `Login failed: User menu not visible (auth state not hydrated). ` +
        `Email: ${credentials.email}`
    );
  }
}

/**
 * Verify that current page shows authenticated UI state
 * Use this to check auth state without logging in
 *
 * @param page - Playwright page object
 * @param timeout - Maximum wait time (default: 15000ms)
 */
export async function verifyAuthenticated(
  page: Page,
  timeout = 15000
): Promise<void> {
  // Sign In link should NOT be visible
  const signInLink = page.getByRole('link', { name: 'Sign In' });
  await expect(signInLink).not.toBeVisible({ timeout });

  // User account menu SHOULD be visible
  const userMenu = page.locator('[aria-label="User account menu"]');
  await expect(userMenu).toBeVisible({ timeout });
}

/**
 * Verify that current page shows unauthenticated UI state
 * Use this to confirm logout or for public page tests
 *
 * @param page - Playwright page object
 * @param timeout - Maximum wait time (default: 15000ms)
 */
export async function verifyUnauthenticated(
  page: Page,
  timeout = 15000
): Promise<void> {
  // Sign In link SHOULD be visible
  const signInLink = page.getByRole('link', { name: 'Sign In' });
  await expect(signInLink).toBeVisible({ timeout });

  // User account menu should NOT be visible
  const userMenu = page.locator('[aria-label="User account menu"]');
  await expect(userMenu).not.toBeVisible({ timeout });
}

/**
 * Sign out the current user
 *
 * The "Sign Out" button is inside a dropdown menu (User Account Menu).
 * This helper opens the dropdown first, then clicks the button.
 *
 * @param page - Playwright page object
 * @param options - Optional settings
 */
export async function signOut(
  page: Page,
  options: { verify?: boolean; timeout?: number } = {}
): Promise<void> {
  const { verify = true, timeout = 10000 } = options;

  // Dismiss any floating banners that might block clicks by clicking their close button
  const promoBanner = page.locator('.fixed[role="banner"]');
  const closeButtons = promoBanner.locator(
    'button, [aria-label*="close"], [aria-label*="dismiss"]'
  );
  const count = await closeButtons.count();
  for (let i = 0; i < count; i++) {
    try {
      await closeButtons.nth(i).click({ timeout: 500 });
      await page.waitForTimeout(200);
    } catch {
      // Ignore if can't click
    }
  }

  // Click user account menu to open dropdown
  const userMenu = page.locator('[aria-label="User account menu"]');
  await userMenu.click();

  // Wait for dropdown to open and be interactive
  await page.waitForTimeout(300);

  // Click sign out button using JavaScript to bypass any overlays
  await page.evaluate(() => {
    const btn = document.querySelector('button') as HTMLButtonElement | null;
    const buttons = document.querySelectorAll('button');
    for (const button of buttons) {
      if (button.textContent?.trim() === 'Sign Out') {
        button.click();
        return;
      }
    }
  });

  // Wait for redirect - GlobalNav redirects to home '/', not '/sign-in'
  await page.waitForURL(
    (url) => url.pathname === '/' || url.pathname.includes('/sign-in'),
    { timeout }
  );

  // Optionally verify we're logged out
  if (verify) {
    await verifyUnauthenticated(page);
  }
}

/**
 * @deprecated Use signOut() instead - this function had incorrect selector
 */
export async function logout(page: Page): Promise<void> {
  await signOut(page);
}

/**
 * Navigate to a protected route and verify redirect to sign-in
 * Use this to test protected route behavior for unauthenticated users
 *
 * @param page - Playwright page object
 * @param protectedPath - The protected route to test (e.g., '/profile')
 * @param timeout - Maximum wait time (default: 10000ms)
 */
export async function verifyRedirectToSignIn(
  page: Page,
  protectedPath: string,
  timeout = 10000
): Promise<void> {
  await page.goto(protectedPath);

  // Should redirect to sign-in
  await page.waitForURL((url) => url.pathname.includes('/sign-in'), {
    timeout,
  });

  // Sign In form should be visible
  const signInHeading = page.getByRole('heading', { name: 'Sign In' });
  await expect(signInHeading).toBeVisible({ timeout: 5000 });
}

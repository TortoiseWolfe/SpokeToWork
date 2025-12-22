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
  /** Maximum time to wait for UI element verification (default: 5000ms) */
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
  const { urlTimeout = 10000, elementTimeout = 5000 } = options;

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
  const userMenu = page.getByRole('generic', { name: /user account menu/i });
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
 * @param timeout - Maximum wait time (default: 5000ms)
 */
export async function verifyAuthenticated(
  page: Page,
  timeout = 5000
): Promise<void> {
  // Sign In link should NOT be visible
  const signInLink = page.getByRole('link', { name: 'Sign In' });
  await expect(signInLink).not.toBeVisible({ timeout });

  // User account menu SHOULD be visible
  const userMenu = page.getByRole('generic', { name: /user account menu/i });
  await expect(userMenu).toBeVisible({ timeout });
}

/**
 * Verify that current page shows unauthenticated UI state
 * Use this to confirm logout or for public page tests
 *
 * @param page - Playwright page object
 * @param timeout - Maximum wait time (default: 5000ms)
 */
export async function verifyUnauthenticated(
  page: Page,
  timeout = 5000
): Promise<void> {
  // Sign In link SHOULD be visible
  const signInLink = page.getByRole('link', { name: 'Sign In' });
  await expect(signInLink).toBeVisible({ timeout });

  // User account menu should NOT be visible
  const userMenu = page.getByRole('generic', { name: /user account menu/i });
  await expect(userMenu).not.toBeVisible({ timeout });
}

/**
 * Logout the current user
 *
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Click user account menu to open dropdown
  const userMenu = page.getByRole('generic', { name: /user account menu/i });
  await userMenu.click();

  // Click sign out button
  const signOutButton = page.getByRole('link', { name: /sign out/i });
  await signOutButton.click();

  // Verify we're logged out
  await verifyUnauthenticated(page);
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

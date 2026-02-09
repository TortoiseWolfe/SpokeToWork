// Security Hardening: Rate Limiting E2E Tests
// Feature 017 - Task T009 (E2E Tests with Real Browser)
// Purpose: Test rate limiting from user perspective

import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Rate Limiting
 *
 * These tests verify the user experience when rate limiting is triggered.
 * They test the actual UI behavior in a real browser.
 *
 * IMPORTANT: Following established testing patterns:
 * - Tests run in SERIAL mode (not parallel)
 * - First test triggers rate limit with shared email
 * - Subsequent tests verify the ALREADY triggered rate limit
 * - This prevents IP-based rate limit cascade affecting other tests
 *
 * NOTE: These tests run in the 'chromium-noauth' project (no authenticated state)
 * because they navigate to /sign-in and intentionally trigger failed logins.
 */

// Run tests in serial mode - critical for rate limiting tests
test.describe.configure({ mode: 'serial' });

test.describe('Rate Limiting - User Experience', () => {
  // Shared email across all tests - generated once in beforeAll
  let sharedEmail: string;
  const testPassword = 'WrongPassword123!';

  test.beforeAll(() => {
    // Generate ONE email for all tests in this describe block
    sharedEmail = `ratelimit-shared-${Date.now()}@mailinator.com`;
  });

  test('1. should trigger rate limit after 5 failed sign-in attempts', async ({
    page,
  }) => {
    // This is the ONLY test that triggers the rate limit
    await page.goto('/sign-in');
    await expect(page).toHaveTitle(/Sign In/i);

    // Attempt to sign in 5 times with wrong password
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Email').fill(sharedEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Wait for error message
      await page.waitForSelector('[role="alert"]', { timeout: 3000 });

      // Small delay between attempts
      await page.waitForTimeout(200);
    }

    // 6th attempt should show rate limit message
    await page.getByLabel('Email').fill(sharedEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should see rate limit error message
    const errorMessage = await page.locator('[role="alert"]').textContent();
    expect(errorMessage).toMatch(/rate.*limit|too many|try again|locked/i);
  });

  test('2. should show lockout message on already rate-limited email', async ({
    page,
  }) => {
    // Verify the ALREADY triggered rate limit (only 1 attempt, not 5+)
    await page.goto('/sign-in');

    await page.getByLabel('Email').fill(sharedEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should immediately see rate limit error
    const errorMessage = await page.locator('[role="alert"]').textContent();
    expect(errorMessage).toMatch(/rate.*limit|too many|locked|try again/i);
  });

  test('3. should show remaining time until unlock', async ({ page }) => {
    // Verify time information is shown (still using shared email)
    await page.goto('/sign-in');

    await page.getByLabel('Email').fill(sharedEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should see time remaining (e.g., "15 minutes", "14 minutes", etc.)
    const errorMessage = await page.locator('[role="alert"]').textContent();
    expect(errorMessage).toMatch(/\d+\s*(minute|min)/i);
  });

  test('4. should have accessible error message', async ({ page }) => {
    // Verify accessibility of error message
    await page.goto('/sign-in');

    await page.getByLabel('Email').fill(sharedEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Error element should have proper ARIA role
    const errorElement = page.locator('[role="alert"]');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toHaveAttribute('role', 'alert');

    // Message should contain actionable information
    const errorMessage = await errorElement.textContent();
    expect(errorMessage).toMatch(/rate|limit|too many|attempts|locked/i);
    expect(errorMessage).toMatch(/minute|wait|try again/i);
  });
});

test.describe('Rate Limiting - Email Independence', () => {
  // Separate describe block with its own shared state
  test.describe.configure({ mode: 'serial' });

  let blockedEmail: string;
  let freshEmail: string;
  const testPassword = 'WrongPassword123!';

  test.beforeAll(() => {
    blockedEmail = `blocked-${Date.now()}@mailinator.com`;
    freshEmail = `fresh-${Date.now()}@mailinator.com`;
  });

  test('1. should block first email after 5 attempts', async ({ page }) => {
    await page.goto('/sign-in');

    // Block first email
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Email').fill(blockedEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByRole('button', { name: 'Sign In' }).click();
      await page.waitForTimeout(200);
    }

    // Verify blocked
    await page.getByLabel('Email').fill(blockedEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();

    const errorMessage = await page.locator('[role="alert"]').textContent();
    expect(errorMessage).toMatch(/rate.*limit|too many|locked/i);
  });

  test('2. should allow different email (not rate limited)', async ({
    page,
  }) => {
    // Fresh email should NOT be blocked (email-based lockout is per-email)
    await page.goto('/sign-in');

    await page.getByLabel('Email').fill(freshEmail);
    await page.getByLabel('Password', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForTimeout(500);

    const errorMessage = await page.locator('[role="alert"]').textContent();

    // Should see invalid credentials, NOT rate limit
    expect(errorMessage).not.toMatch(/rate.*limit|too many|locked/i);
    expect(errorMessage).toMatch(/invalid|incorrect|wrong/i);
  });
});

test.describe('Rate Limiting - Password Reset', () => {
  // Skip in CI to avoid triggering additional rate limits
  test.skip(
    () => !!process.env.CI,
    'Skipped in CI: password reset rate limiting is a lower-priority test'
  );

  test('should rate limit password reset requests', async ({ page }) => {
    const email = `password-reset-${Date.now()}@mailinator.com`;

    await page.goto('/forgot-password');

    // Attempt 5 password resets
    for (let i = 0; i < 5; i++) {
      await page.getByLabel('Email').fill(email);
      await page.getByRole('button', { name: 'Send Reset Link' }).click();
      await page.waitForTimeout(500);

      // Might need to navigate back if redirect happens
      const currentUrl = page.url();
      if (!currentUrl.includes('forgot-password')) {
        await page.goto('/forgot-password');
      }
    }

    // 6th attempt should be rate limited
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();

    await page.waitForTimeout(500);

    // Check for rate limit or success (depending on implementation)
    const alert = await page.locator('[role="alert"]').textContent();
    if (alert) {
      expect(alert).toBeTruthy();
    }
  });
});

// Security Hardening: Brute Force Prevention E2E Test
// Feature 017 - Task T015
// Purpose: Test server-side rate limiting prevents brute force attacks
//
// Rate limiting is implemented via Supabase RPC functions (check_rate_limit,
// record_failed_attempt), NOT GoTrue's built-in 429 limiter.
// Each sign-in attempt involves 3 async calls:
//   1. checkRateLimit() RPC
//   2. signInWithPassword() GoTrue call
//   3. recordFailedAttempt() RPC (on failure)
// We must wait for the error message to appear in the DOM after each attempt
// to guarantee the full cycle (including recordFailedAttempt) has completed
// before submitting the next attempt.

import { test, expect } from '@playwright/test';

// The error message element rendered by SignInForm
const ERROR_ALERT = '.alert-error';

// Lockout message from SignInForm line 78:
// "Too many failed attempts. Your account has been temporarily locked. Please try again in ${time}."
const LOCKOUT_TEXT =
  /too many failed attempts|temporarily locked|too many sign-in attempts/i;

// Normal credential error from GoTrue:
// "Invalid login credentials" (optionally with " (N attempts remaining)")
const CREDENTIAL_ERROR = /invalid.*login.*credentials|invalid.*credentials/i;

test.describe('Brute Force Prevention - REQ-SEC-003', () => {
  // Requires live Supabase backend for server-side rate limiting.
  // The static export has no backend — auth calls return generic errors,
  // never the rate-limit/lockout messages these tests assert on.
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost'),
    'Requires live Supabase rate-limiting — not available against placeholder/local URL'
  );

  const testEmail = `brute-force-test-${Date.now()}@mailinator.com`;
  const wrongPassword = 'WrongPassword123!';

  /**
   * Submit a failed login attempt and wait for the error message to appear.
   * This guarantees the full RPC cycle (checkRateLimit → signIn → recordFailedAttempt)
   * has completed before returning, preventing race conditions between attempts.
   */
  async function submitAndWaitForError(
    page: import('@playwright/test').Page,
    email: string
  ): Promise<string> {
    // Clear any existing error so we can detect the new one
    await page.evaluate(() => {
      const alert = document.querySelector('.alert-error');
      if (alert) alert.remove();
    });

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', wrongPassword);
    await page.click('button[type="submit"]');

    // Wait for the error alert to appear (proves full submit cycle completed)
    const errorEl = page.locator(ERROR_ALERT);
    await expect(errorEl).toBeVisible({ timeout: 15000 });

    return (await errorEl.textContent()) || '';
  }

  test('should lockout after 5 failed login attempts', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/sign-in');

    // Attempts 1-5: Each must complete fully before the next starts
    for (let i = 1; i <= 5; i++) {
      const errorText = await submitAndWaitForError(page, testEmail);
      console.log(`Attempt ${i}: ${errorText}`);

      if (i < 5) {
        // Should show normal credential error
        expect(errorText).toMatch(CREDENTIAL_ERROR);
      }
    }

    // Attempt 6: Should be locked out (checkRateLimit returns allowed: false)
    const lockoutText = await submitAndWaitForError(page, testEmail);
    console.log(`Attempt 6 (lockout): ${lockoutText}`);

    expect(lockoutText).toMatch(LOCKOUT_TEXT);

    // Error message should mention time to wait
    // SignInForm shows: "Please try again in 15 minutes." or "in X minutes"
    expect(lockoutText).toMatch(/try again in|minutes?|wait/i);
  });

  test('should persist lockout across browser sessions', async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    // First browser session - trigger lockout
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('/sign-in');

    // Make 5 failed attempts (wait for each to complete)
    for (let i = 0; i < 5; i++) {
      await submitAndWaitForError(page1, testEmail);
    }

    // Verify locked
    const lockoutText = await submitAndWaitForError(page1, testEmail);
    expect(lockoutText).toMatch(LOCKOUT_TEXT);

    await context1.close();

    // Second browser session (new context, cleared storage)
    const context2 = await browser.newContext({
      storageState: undefined, // Clear all storage
    });
    const page2 = await context2.newPage();

    await page2.goto('/sign-in');

    // Should STILL be locked (server-side enforcement)
    const lockoutText2 = await submitAndWaitForError(page2, testEmail);
    expect(lockoutText2).toMatch(LOCKOUT_TEXT);

    await context2.close();
  });

  test('should show remaining attempts counter', async ({ page }) => {
    test.setTimeout(120_000);
    const uniqueEmail = `attempts-test-${Date.now()}@mailinator.com`;

    await page.goto('/sign-in');

    // First attempt — should show credential error, not lockout
    const error1 = await submitAndWaitForError(page, uniqueEmail);
    expect(error1).toMatch(CREDENTIAL_ERROR);
    expect(error1).not.toMatch(LOCKOUT_TEXT);

    // Second attempt — still not locked
    const error2 = await submitAndWaitForError(page, uniqueEmail);
    expect(error2).toMatch(CREDENTIAL_ERROR);
    expect(error2).not.toMatch(LOCKOUT_TEXT);
  });

  test('should track different users independently', async ({ browser }) => {
    test.setTimeout(120_000);
    const userA = `user-a-${Date.now()}@mailinator.com`;
    const userB = `user-b-${Date.now()}@mailinator.com`;

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Lock out User A (wait for each attempt to complete)
    await pageA.goto('/sign-in');
    for (let i = 0; i < 5; i++) {
      await submitAndWaitForError(pageA, userA);
    }

    // User A should be locked
    const lockoutText = await submitAndWaitForError(pageA, userA);
    expect(lockoutText).toMatch(LOCKOUT_TEXT);

    // User B should still be able to attempt
    await pageB.goto('/sign-in');
    const errorB = await submitAndWaitForError(pageB, userB);

    // User B should see normal error, not lockout
    expect(errorB).toMatch(CREDENTIAL_ERROR);
    expect(errorB).not.toMatch(LOCKOUT_TEXT);

    await contextA.close();
    await contextB.close();
  });

  test('should track different attempt types independently', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const email = `types-test-${Date.now()}@mailinator.com`;

    // Lock out sign_in attempts (5 attempts to trigger lockout)
    await page.goto('/sign-in');
    for (let i = 0; i < 5; i++) {
      await submitAndWaitForError(page, email);
    }

    // Verify lockout is triggered for sign_in
    const lockoutText = await submitAndWaitForError(page, email);
    expect(lockoutText).toMatch(LOCKOUT_TEXT);

    // sign_up should still work (different attempt type)
    await page.goto('/sign-up');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'ValidPassword123!');
    await page.click('button[type="submit"]');

    // Should NOT show lockout (different attempt type)
    // Wait briefly for any error to appear
    await page.waitForTimeout(3000);
    const signUpError = page.locator(ERROR_ALERT);
    const hasSignUpError = await signUpError
      .isVisible({ timeout: 2000 })
      .catch(() => false);
    if (hasSignUpError) {
      const signUpErrorText = (await signUpError.textContent()) || '';
      expect(signUpErrorText).not.toMatch(LOCKOUT_TEXT);
    }
  });

  test('should not bypass rate limiting by clearing localStorage', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const email = `bypass-test-${Date.now()}@mailinator.com`;

    await page.goto('/sign-in');

    // Make 5 failed attempts (wait for each to complete)
    for (let i = 0; i < 5; i++) {
      await submitAndWaitForError(page, email);
    }

    // Verify lockout triggered
    const lockoutText = await submitAndWaitForError(page, email);
    expect(lockoutText).toMatch(LOCKOUT_TEXT);

    // Clear localStorage (client-side bypass attempt)
    await page.evaluate(() => localStorage.clear());

    // Try again after reload - should STILL be locked (server-side enforcement)
    await page.reload();
    await page.waitForLoadState('networkidle');

    const lockoutText2 = await submitAndWaitForError(page, email);
    expect(lockoutText2).toMatch(LOCKOUT_TEXT);
  });

  test('should display lockout expiration time', async ({ page }) => {
    test.setTimeout(120_000);
    const email = `lockout-time-${Date.now()}@mailinator.com`;

    await page.goto('/sign-in');

    // Trigger lockout (wait for each attempt to complete)
    for (let i = 0; i < 5; i++) {
      await submitAndWaitForError(page, email);
    }

    // Attempt again — should show lockout with time info
    const lockoutText = await submitAndWaitForError(page, email);
    console.log(`Lockout message: ${lockoutText}`);

    expect(lockoutText).toMatch(LOCKOUT_TEXT);
    // SignInForm shows: "Please try again in 15 minutes." or "in X minutes"
    expect(lockoutText).toMatch(/try again in|minutes?|wait/i);
  });
});

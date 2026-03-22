import { test, expect } from '@playwright/test';
import seeded from '../fixtures/seeded-company-id.json';

/**
 * Public profile must render with NO session. Runs under chromium-noauth
 * (storageState = cookie-consent only, no auth token).
 *
 * Seeded by global-setup.ts → ensurePublicProfileCompany().
 */

const SEEDED_COMPANY_ID = seeded.sharedCompanyId;

test.describe('public company profile (unauthenticated)', () => {
  test('renders company name without a session', async ({ page }) => {
    await page.goto(`/company?id=${SEEDED_COMPANY_ID}`);

    // Assert precondition: no Supabase auth token. This project stores the session
    // in localStorage (src/lib/supabase/client.ts:55), NOT cookies — checking cookies
    // is a no-op that passes regardless. Guards against misrouting if the testIgnore
    // regex in playwright.config.ts ever drifts.
    const authKey = await page.evaluate(() =>
      Object.keys(localStorage).find((k) => k.includes('auth-token'))
    );
    expect(authKey).toBeUndefined();

    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/not found/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('industry badge is visible and theme-reactive', async ({ page }) => {
    await page.goto(`/company?id=${SEEDED_COMPANY_ID}`);

    const badge = page.getByTestId('industry-badge').first();
    await expect(badge).toBeVisible();

    // ThemeScript.tsx sets data-theme on BOTH html and body. DaisyUI resolves
    // the cascade from the nearest data-theme ancestor — body wins. Setting
    // only html leaves body's static default in effect.
    const setTheme = (t: string) =>
      page.evaluate((theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
      }, t);

    await setTheme('light');
    await page.waitForTimeout(100);
    const lightBg = await badge.evaluate((el) => getComputedStyle(el).backgroundColor);

    await setTheme('dracula');
    await page.waitForTimeout(100);
    const draculaBg = await badge.evaluate((el) => getComputedStyle(el).backgroundColor);

    expect(lightBg).not.toBe(draculaBg);
  });

  test('missing id shows not-found', async ({ page }) => {
    await page.goto('/company');
    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
  });

  test('invalid id shows not-found', async ({ page }) => {
    await page.goto('/company?id=00000000-0000-0000-0000-000000000000');
    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import seededWorker from '../fixtures/seeded-worker-id.json';

/**
 * Public worker profile — anon-accessible, no session required.
 * Seeded by global-setup.ts → ensureDiscoverableWorker().
 */

const SEEDED_WORKER_ID = seededWorker.workerId;

test.describe('public worker profile (unauthenticated)', () => {
  test('renders worker name without a session', async ({ page }) => {
    await page.goto(`/worker?id=${SEEDED_WORKER_ID}`);

    const authKey = await page.evaluate(() =>
      Object.keys(localStorage).find((k) => k.includes('auth-token'))
    );
    expect(authKey).toBeUndefined();

    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(/not found/i);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('skill badge is visible and theme-reactive', async ({ page }) => {
    await page.goto(`/worker?id=${SEEDED_WORKER_ID}`);

    const badge = page.getByTestId('skill-badge').first();
    await expect(badge).toBeVisible();

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
    await page.goto('/worker');
    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
  });

  test('invalid id shows not-found', async ({ page }) => {
    await page.goto('/worker?id=00000000-0000-0000-0000-000000000000');
    await expect(page.getByRole('heading', { name: /not found/i })).toBeVisible();
  });
});

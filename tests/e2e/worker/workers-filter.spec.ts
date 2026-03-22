import { test, expect } from '@playwright/test';

/**
 * Workers list skill filter — anon-accessible.
 * Relies on global-setup.ts seeding a Courier-tagged worker.
 */

test.describe('workers list skill filter (unauthenticated)', () => {
  test('workers page renders without a session', async ({ page }) => {
    await page.goto('/workers');
    await expect(page.getByRole('heading', { name: /workers/i })).toBeVisible();
  });

  test('skill filter dropdown renders', async ({ page }) => {
    await page.goto('/workers');
    await expect(page.getByRole('group').or(page.locator('details').first())).toBeVisible();
  });
});

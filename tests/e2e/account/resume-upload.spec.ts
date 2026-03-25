import { test, expect } from '@playwright/test';

/**
 * Account Settings — Resumes & Visibility
 * Requires authenticated session (wired via global-setup.ts fixtures).
 */

test.describe('Account Settings — Resumes & Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
  });

  test('renders My Resumes section', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'My Resumes' });
    await expect(heading).toBeVisible();
  });

  test('renders Profile Visibility section', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Profile Visibility' });
    await expect(heading).toBeVisible();

    // Toggle should be visible
    await expect(page.getByText('Profile visible to employers')).toBeVisible();
  });

  test('visibility radio defaults to Private', async ({ page }) => {
    // Wait for Profile Visibility section to render (async visibility fetch)
    await expect(
      page.getByRole('heading', { name: 'Profile Visibility' })
    ).toBeVisible({ timeout: 15000 });
    const privateRadio = page.getByRole('radio', { name: /private/i });
    await expect(privateRadio).toBeChecked({ timeout: 10000 });
  });

  test('changes visibility to Applied and persists', async ({ page }) => {
    // Wait for visibility controls to load before interacting
    await expect(
      page.getByRole('heading', { name: 'Profile Visibility' })
    ).toBeVisible({ timeout: 15000 });
    const appliedRadio = page.getByRole('radio', { name: /applied/i });
    await expect(appliedRadio).toBeVisible({ timeout: 10000 });
    await appliedRadio.check();
    await expect(appliedRadio).toBeChecked();

    // Reload and verify
    await page.waitForTimeout(1000);
    await page.reload();
    await page.waitForLoadState('networkidle');

    const reloadedRadio = page.getByRole('radio', { name: /applied/i });
    await expect(reloadedRadio).toBeChecked();

    // Clean up: set back to private
    const privateRadio = page.getByRole('radio', { name: /private/i });
    await privateRadio.check();
    await page.waitForTimeout(1000);
  });
});

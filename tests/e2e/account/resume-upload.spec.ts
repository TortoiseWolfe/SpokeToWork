import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { executeSQL, escapeSQL } from '../utils/supabase-admin';

/**
 * Account Settings — Resumes & Visibility
 * Requires authenticated session (wired via global-setup.ts fixtures).
 * Sets role='worker' before each test to ensure resume/visibility sections render.
 * (employer-team-workflow may change role to 'employer' in a parallel shard.)
 */

test.describe('Account Settings — Resumes & Visibility', () => {
  // beforeEach runs executeSQL + Supabase update + page.goto + networkidle — can exceed 30s on Firefox/WebKit CI
  test.slow(
    ({ browserName }) => browserName === 'firefox' || browserName === 'webkit',
    'Firefox/WebKit: slow executeSQL + networkidle under 18-shard CI load'
  );

  test.beforeEach(async ({ page }) => {
    // Ensure user role is 'worker' (may have been changed by employer tests in another shard)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const email = process.env.TEST_USER_PRIMARY_EMAIL;
    if (url && key && email) {
      const admin = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const rows = (await executeSQL(
        `SELECT id FROM auth.users WHERE email = '${escapeSQL(email!)}'`
      )) as { id: string }[];
      if (rows[0]?.id) {
        await admin
          .from('user_profiles')
          .update({ role: 'worker' })
          .eq('id', rows[0].id);
      }
    }

    await page.goto('/account');
    await page.waitForLoadState('networkidle');
  });

  test('renders My Resumes section', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'My Resumes' });
    await expect(heading).toBeVisible({ timeout: 15000 });
  });

  test('renders Profile Visibility section', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Profile Visibility' });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Toggle should be visible
    await expect(page.getByText('Profile visible to employers')).toBeVisible({
      timeout: 15000,
    });
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

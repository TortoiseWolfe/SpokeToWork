import { test, expect, type Browser, type Page } from '@playwright/test';
import { loginAndVerify } from '../utils/auth-helpers';

/**
 * Admin user list: table, stats, badges, non-admin denial.
 * Requires admin user seeded in global-setup.ts and live Supabase.
 */

test.describe.configure({ timeout: 60000 });

const ADMIN_EMAIL =
  process.env.TEST_USER_ADMIN_EMAIL ?? 'admin@spoketowork.com';
const ADMIN_PASSWORD = process.env.TEST_USER_ADMIN_PASSWORD ?? '';

async function createAdminPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await ctx.newPage();
  test.skip(!ADMIN_PASSWORD, 'Admin password not configured in .env');
  await loginAndVerify(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return page;
}

test.describe('Admin user list — authenticated admin', () => {
  test('admin navigates from dashboard to user list', async ({ browser }) => {
    const page = await createAdminPage(browser);
    await page.goto('/admin');
    await page.getByRole('link', { name: 'Users' }).click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await page.context().close();
  });

  test('user table renders with stats and rows', async ({ browser }) => {
    const page = await createAdminPage(browser);
    await page.goto('/admin/users');

    const table = page.locator('[data-testid="admin-user-table"]');
    await expect(table).toBeVisible({ timeout: 15000 });

    // Stats bar present
    await expect(
      page.locator('[data-testid="stat-total-users"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="stat-workers"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-employers"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-admins"]')).toBeVisible();

    // At least one user row (the admin user at minimum)
    const rows = page.locator('[data-testid^="user-row-"]');
    await expect(rows.first()).toBeVisible();

    // Total stat matches row count
    const totalText = await page
      .locator('[data-testid="stat-total-users"]')
      .textContent();
    const rowCount = await rows.count();
    expect(Number(totalText)).toBe(rowCount);

    await page.context().close();
  });

  test('admin badge appears on admin users', async ({ browser }) => {
    const page = await createAdminPage(browser);
    await page.goto('/admin/users');
    await expect(page.locator('[data-testid="admin-user-table"]')).toBeVisible({
      timeout: 15000,
    });

    const adminBadge = page.locator('.badge.badge-warning', {
      hasText: 'admin',
    });
    await expect(adminBadge.first()).toBeVisible();
    await page.context().close();
  });

  test('role badges display on rows', async ({ browser }) => {
    const page = await createAdminPage(browser);
    await page.goto('/admin/users');
    await expect(page.locator('[data-testid="admin-user-table"]')).toBeVisible({
      timeout: 15000,
    });

    // At least one role badge
    const roleBadge = page.locator(
      '[data-testid^="user-row-"] .badge.badge-sm'
    );
    await expect(roleBadge.first()).toBeVisible();
    await page.context().close();
  });

  test('back link returns to admin dashboard', async ({ browser }) => {
    const page = await createAdminPage(browser);
    await page.goto('/admin/users');
    await expect(page.locator('[data-testid="admin-user-table"]')).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('link', { name: 'Back to Admin' }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await page.context().close();
  });
});

test.describe('Admin user list — non-admin user', () => {
  test('regular user sees access denied', async ({ page }) => {
    await page.goto('/admin/users');
    const denied = page.locator('.alert-error');
    const signIn = page.getByRole('link', { name: 'Sign In' }).first();
    await expect(denied.or(signIn)).toBeVisible({ timeout: 15000 });
    // User table should NOT be visible
    await expect(
      page.locator('[data-testid="admin-user-table"]')
    ).not.toBeVisible();
  });
});

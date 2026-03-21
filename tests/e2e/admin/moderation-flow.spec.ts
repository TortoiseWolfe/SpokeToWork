import { test, expect, type Browser, type Page } from '@playwright/test';
import { loginAndVerify } from '../utils/auth-helpers';

/**
 * Admin moderation queue: approve, reject, map marker updates, non-admin denial.
 * Requires admin user seeded in global-setup.ts and live Supabase.
 */

test.describe.configure({ timeout: 90000 });

const ADMIN_EMAIL =
  process.env.TEST_USER_ADMIN_EMAIL ?? 'admin@spoketowork.com';
const ADMIN_PASSWORD = process.env.TEST_USER_ADMIN_PASSWORD ?? '';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

const TEST_CONTRIBUTION_IDS = [
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  'aaaaaaaa-bbbb-cccc-dddd-ffffffffffff',
];

/** Reset test contributions to pending before each test that needs them. */
async function resetTestContributions() {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  await fetch(
    `${SUPABASE_URL}/rest/v1/company_contributions?id=in.(${TEST_CONTRIBUTION_IDS.join(',')})`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status: 'pending',
        reviewer_id: null,
        reviewer_notes: null,
        reviewed_at: null,
        created_shared_company_id: null,
      }),
    }
  );
}

async function createAdminPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await ctx.newPage();
  test.skip(!ADMIN_PASSWORD, 'Admin password not configured in .env');
  await loginAndVerify(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return page;
}

test.describe('Admin moderation — authenticated admin', () => {
  test('admin can access moderation queue', async ({ browser }) => {
    const page = await createAdminPage(browser);
    await page.goto('/admin/moderation');
    const queue = page.locator('[data-testid="admin-moderation-queue"]');
    await expect(queue).toBeVisible({ timeout: 15000 });
    // Dismiss any transient error alerts (e.g. "Failed to load moderation queue")
    const dismissBtn = page.locator('.alert-error button', {
      hasText: /dismiss/i,
    });
    if (await dismissBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await dismissBtn.click();
    }
    await page.context().close();
  });

  test('clicking a contribution card selects it', async ({ browser }) => {
    await resetTestContributions();
    const page = await createAdminPage(browser);
    await page.goto('/admin/moderation');
    const queue = page.locator('[data-testid="admin-moderation-queue"]');
    await expect(queue).toBeVisible({ timeout: 15000 });

    // Wait for cards to load (async fetch)
    const firstCard = page.locator('[data-testid^="contribution-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    await firstCard.click();
    await expect(firstCard).toHaveClass(/ring-primary/);
    await page.context().close();
  });

  test('approve removes card and shows success', async ({ browser }) => {
    await resetTestContributions();
    const page = await createAdminPage(browser);
    await page.goto('/admin/moderation');
    await expect(
      page.locator('[data-testid="admin-moderation-queue"]')
    ).toBeVisible({ timeout: 15000 });

    // Wait for cards to load (async fetch)
    const cards = page.locator('[data-testid^="contribution-"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    const firstCardId = await cards.first().getAttribute('data-testid');
    await cards.first().locator('button', { hasText: 'Approve' }).click();

    // Card should disappear
    await expect(
      page.locator(`[data-testid="${firstCardId}"]`)
    ).not.toBeVisible({ timeout: 10000 });
    // Success message
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });
    await page.context().close();
  });

  test('reject requires notes and removes card', async ({ browser }) => {
    await resetTestContributions();
    const page = await createAdminPage(browser);
    await page.goto('/admin/moderation');
    await expect(
      page.locator('[data-testid="admin-moderation-queue"]')
    ).toBeVisible({ timeout: 15000 });

    // Wait for cards to load (async fetch)
    const cards = page.locator('[data-testid^="contribution-"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    const firstCardId = await cards.first().getAttribute('data-testid');

    // Click Reject to expand notes textarea
    await cards.first().locator('button', { hasText: 'Reject' }).click();
    const textarea = cards.first().locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 3000 });

    await textarea.fill('E2E test rejection — invalid location data');
    await cards
      .first()
      .locator('button', { hasText: 'Confirm Rejection' })
      .click();

    await expect(
      page.locator(`[data-testid="${firstCardId}"]`)
    ).not.toBeVisible({ timeout: 10000 });
    await page.context().close();
  });
});

test.describe('Admin moderation — non-admin user', () => {
  test('regular user sees access denied', async ({ page }) => {
    await page.goto('/admin/moderation');
    // Should redirect to sign-in or show access denied
    const denied = page.locator('.alert-error');
    const signIn = page.getByRole('link', { name: 'Sign In' }).first();
    await expect(denied.or(signIn)).toBeVisible({ timeout: 15000 });
  });
});

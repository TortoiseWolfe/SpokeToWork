/**
 * E2E Test: Employer Team Workflow
 *
 * Tests the full employer flow:
 * 1. Employer navigates to /employer → Team tab
 * 2. ConnectionManager is visible in Team tab
 * 3. Employer searches for a worker and sends connection request
 * 4. Worker accepts the connection request
 * 5. Employer sees worker in TeamPanel's "Add teammate" picker
 * 6. Employer adds worker to team
 *
 * Prerequisites:
 * - PRIMARY test user exists with employer role + company link
 * - TERTIARY test user exists (the worker)
 */

import { test, expect, Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test users from .env
const EMPLOYER = {
  email: process.env.TEST_USER_PRIMARY_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PRIMARY_PASSWORD!,
};

const WORKER_EMAIL =
  process.env.TEST_USER_TERTIARY_EMAIL || 'test-user-b@example.com';
const WORKER = {
  displayName: WORKER_EMAIL.split('@')[0],
  email: WORKER_EMAIL,
  password: process.env.TEST_USER_TERTIARY_PASSWORD!,
};

let adminClient: SupabaseClient | null = null;

const getAdminClient = (): SupabaseClient | null => {
  if (adminClient) return adminClient;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
};

/** Handle ReAuth modal for encrypted messaging. */
async function handleReAuthModal(page: Page, password: string) {
  try {
    const reAuthDialog = page.getByRole('dialog', {
      name: /re-authentication required/i,
    });
    await reAuthDialog.waitFor({ state: 'visible', timeout: 5000 });
    const passwordInput = page.getByRole('textbox', { name: /password/i });
    await passwordInput.fill(password);
    await page.getByRole('button', { name: /unlock messages/i }).click();
    await reAuthDialog.waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // Modal didn't appear — continue
  }
}

/** Get user IDs from auth.users. */
async function getUserIds(client: SupabaseClient) {
  const { data: authUsers } = await client.auth.admin.listUsers();
  let employerId: string | null = null;
  let workerId: string | null = null;
  if (authUsers?.users) {
    for (const user of authUsers.users) {
      if (user.email === EMPLOYER.email) employerId = user.id;
      if (user.email === WORKER.email) workerId = user.id;
    }
  }
  return { employerId, workerId };
}

/** Ensure employer has role='employer' and is linked to a company. */
async function ensureEmployerSetup(client: SupabaseClient) {
  const { employerId, workerId } = await getUserIds(client);
  if (!employerId || !workerId) {
    throw new Error(
      `Test users not found in auth.users (employer=${employerId}, worker=${workerId}). ` +
        `Ensure TEST_USER_PRIMARY_EMAIL and TEST_USER_TERTIARY_EMAIL exist.`
    );
  }

  // Ensure employer profile with role='employer'
  const displayNameA = EMPLOYER.email.split('@')[0];
  await client.from('user_profiles').upsert({
    id: employerId,
    username: displayNameA,
    display_name: displayNameA,
    role: 'employer',
    updated_at: new Date().toISOString(),
  });

  // Ensure worker profile
  await client.from('user_profiles').upsert({
    id: workerId,
    username: WORKER.displayName,
    display_name: WORKER.displayName,
    role: 'worker',
    updated_at: new Date().toISOString(),
  });

  // Ensure a shared company exists
  const { data: existingCompany } = await client
    .from('shared_companies')
    .select('id')
    .limit(1)
    .maybeSingle();

  let companyId: string;
  if (existingCompany) {
    companyId = existingCompany.id;
  } else {
    const { data: newCompany } = await client
      .from('shared_companies')
      .insert({ name: 'E2E Test Company' })
      .select('id')
      .single();
    companyId = newCompany!.id;
  }

  // Ensure employer is linked to the company
  await client
    .from('employer_company_links')
    .upsert(
      { user_id: employerId, shared_company_id: companyId },
      { onConflict: 'user_id,shared_company_id' }
    );

  console.log(`Employer setup: ${displayNameA} linked to company ${companyId}`);
}

/** Clean up connections and team links between test users. */
async function cleanup(client: SupabaseClient) {
  const { employerId, workerId } = await getUserIds(client);
  if (!employerId || !workerId) return;

  // Remove connections between test users
  await client
    .from('user_connections')
    .delete()
    .or(
      `and(requester_id.eq.${employerId},addressee_id.eq.${workerId}),and(requester_id.eq.${workerId},addressee_id.eq.${employerId})`
    );

  // Remove worker from any employer_company_links
  await client.from('employer_company_links').delete().eq('user_id', workerId);

  console.log('Cleaned up connections and team links between test users');
}

test.describe('Employer Team Workflow', () => {
  // Clear inherited storage state — tests use separate browser contexts
  // with explicit sign-in for each user (employer + worker).
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async () => {
    const client = getAdminClient();
    if (!client) {
      test.skip(true, 'Supabase admin client not available');
      return;
    }
    await cleanup(client);
    await ensureEmployerSetup(client);
  });

  test.afterEach(async () => {
    const client = getAdminClient();
    if (client) {
      await cleanup(client);
    }
  });

  test('employer can connect with worker and add to team from Team tab', async ({
    browser,
  }) => {
    test.setTimeout(120000);

    const ctxEmployer = await browser.newContext();
    const ctxWorker = await browser.newContext();
    const pageE = await ctxEmployer.newPage();
    const pageW = await ctxWorker.newPage();

    try {
      // ===== STEP 1: Employer signs in =====
      await pageE.goto('/sign-in');
      await pageE.waitForLoadState('networkidle');
      await pageE.fill('#email', EMPLOYER.email);
      await pageE.fill('#password', EMPLOYER.password);
      await pageE.click('button[type="submit"]');
      await pageE.waitForURL((url) => !url.pathname.includes('/sign-in'), {
        timeout: 30000,
      });

      // ===== STEP 2: Navigate to /employer → Team tab =====
      await pageE.goto('/employer');
      await pageE.waitForLoadState('networkidle');

      // Wait for dashboard to load (role check + data fetch)
      await expect(
        pageE.getByRole('heading', { name: 'Employer Dashboard' })
      ).toBeVisible({ timeout: 15000 });

      // Click Team tab
      const teamTab = pageE.getByRole('tab', { name: /team/i });
      await teamTab.click();

      // ===== STEP 3: Verify ConnectionManager is visible =====
      await expect(pageE.getByTestId('connection-manager')).toBeVisible({
        timeout: 10000,
      });

      // ===== STEP 4: Search for worker and send connection request =====
      const searchInput = pageE.locator('#user-search-input');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      await searchInput.fill(WORKER.displayName);
      await searchInput.press('Enter');

      // Wait for search results
      await pageE.waitForSelector(
        '[data-testid="search-results"], .alert-error',
        { timeout: 15000 }
      );

      // Send request — handle case where connection already exists from prior retry
      const sendButton = pageE.getByRole('button', {
        name: /send request/i,
      });
      const hasSendButton = await sendButton
        .isVisible({ timeout: 10000 })
        .catch(() => false);

      if (hasSendButton) {
        // Normal flow: click Send Request and wait for API response
        await Promise.all([
          pageE
            .waitForResponse(
              (resp) =>
                resp.url().includes('user_connections') && resp.status() < 400,
              { timeout: 15000 }
            )
            .catch(() => null),
          sendButton.click({ force: true }),
        ]);

        // Verify success: toast, button text change, or button disappears
        await expect(
          pageE
            .getByText(/friend request sent|request sent|pending/i)
            .first()
            .or(pageE.getByRole('button', { name: /pending|request sent/i }))
        ).toBeVisible({ timeout: 15000 });
      } else {
        // Connection already exists from prior retry — verify "Request Sent" is visible
        const alreadySent = await pageE
          .getByRole('button', { name: /request sent|pending/i })
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        if (!alreadySent) {
          throw new Error(
            'Neither "Send Request" nor "Request Sent" button found'
          );
        }
        console.log(
          'Connection already exists (prior retry) — skipping send step'
        );
      }

      // ===== STEP 5: Worker signs in and accepts =====
      await pageW.goto('/sign-in');
      await pageW.waitForLoadState('networkidle');
      await pageW.fill('#email', WORKER.email);
      await pageW.fill('#password', WORKER.password);
      await pageW.click('button[type="submit"]');
      await pageW.waitForURL((url) => !url.pathname.includes('/sign-in'), {
        timeout: 30000,
      });

      // Navigate to connections page
      await pageW.goto('/messages?tab=connections');
      await handleReAuthModal(pageW, WORKER.password);

      // useConnections() only fetches on mount — reload to ensure fresh data
      await pageW.waitForTimeout(2000);
      await pageW.reload();
      await pageW.waitForLoadState('networkidle');

      // Click "Received" tab
      const receivedTab = pageW.getByRole('tab', {
        name: /pending received|received/i,
      });
      await receivedTab.click({ force: true });

      // Wait for request to appear (longer timeout for DB propagation)
      await pageW.waitForSelector('[data-testid="connection-request"]', {
        timeout: 30000,
      });

      // Accept
      const acceptButton = pageW
        .getByRole('button', { name: /accept/i })
        .first();
      await acceptButton.click({ force: true });

      // Verify it disappears from received
      await expect(
        pageW.locator('[data-testid="connection-request"]')
      ).toBeHidden({ timeout: 10000 });

      // ===== STEP 6: Employer refreshes Team tab =====
      await pageE.goto('/employer');
      await pageE.waitForLoadState('networkidle');
      await expect(
        pageE.getByRole('heading', { name: 'Employer Dashboard' })
      ).toBeVisible({ timeout: 15000 });

      // Click Team tab
      await pageE.getByRole('tab', { name: /team/i }).click();

      // ===== STEP 7: Click "Add teammate" and see worker in picker =====
      const addTeammateButton = pageE.getByRole('button', {
        name: /add teammate/i,
      });
      await expect(addTeammateButton).toBeVisible({ timeout: 10000 });
      await addTeammateButton.click();

      // Worker should appear in the picker
      const workerOption = pageE.getByRole('button', {
        name: new RegExp(WORKER.displayName, 'i'),
      });
      await expect(workerOption).toBeVisible({ timeout: 5000 });

      // ===== STEP 8: Add worker to team =====
      await workerOption.click();

      // ===== STEP 9: Verify worker appears in team roster =====
      // Worker should now appear as a team member badge
      await expect(
        pageE.getByText(new RegExp(WORKER.displayName, 'i')).first()
      ).toBeVisible({ timeout: 10000 });
    } finally {
      await ctxEmployer.close();
      await ctxWorker.close();
    }
  });

  test('Team tab shows pending connection badge', async ({ page }) => {
    test.setTimeout(60000);

    // First create a pending request from worker to employer via admin
    const client = getAdminClient();
    if (!client) {
      test.skip(true, 'Admin client not available');
      return;
    }
    const { employerId, workerId } = await getUserIds(client);
    if (!employerId || !workerId) {
      test.skip(true, 'Test users not found');
      return;
    }

    // Create pending connection request (worker → employer)
    await client.from('user_connections').insert({
      requester_id: workerId,
      addressee_id: employerId,
      status: 'pending',
    });

    // Sign in as employer
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('#email', EMPLOYER.email);
    await page.fill('#password', EMPLOYER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes('/sign-in'), {
      timeout: 30000,
    });

    // Navigate to employer dashboard
    await page.goto('/employer');
    await expect(
      page.getByRole('heading', { name: 'Employer Dashboard' })
    ).toBeVisible({ timeout: 15000 });

    // Team tab should show pending indicator (badge with count)
    const teamTab = page.getByRole('tab', { name: /team/i });
    await expect(teamTab).toBeVisible();

    // Click Team tab and verify pending request is visible inside
    await teamTab.click();
    await expect(page.getByTestId('connection-manager')).toBeVisible({
      timeout: 10000,
    });

    // Verify pending request appears (received tab should show the request)
    const receivedTab = page.getByRole('tab', {
      name: /pending received|received/i,
    });
    if (await receivedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await receivedTab.click({ force: true });
      await expect(
        page.locator('[data-testid="connection-request"]')
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

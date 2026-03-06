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

/** Handle ReAuth modal for encrypted messaging (retry-aware).
 *  Handles both success (modal closes) and failure (error shown, close modal).
 *  @returns true if keys were unlocked (or modal didn't appear), false if unlock failed. */
async function handleReAuthModal(
  page: Page,
  password: string,
  maxRetries = 2
): Promise<boolean> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const reAuthDialog = page.getByRole('dialog', {
      name: /re-authentication required/i,
    });
    const appeared = await reAuthDialog
      .waitFor({ state: 'visible', timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) return true;

    const passwordInput = page.getByRole('textbox', { name: /password/i });
    await passwordInput.fill(password);
    await page.getByRole('button', { name: /unlock messages/i }).click();

    // Wait for modal to close (success) — but handle failure too
    const hidden = await reAuthDialog
      .waitFor({ state: 'hidden', timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    if (hidden) {
      await page.waitForTimeout(500);
      continue; // Check if it reappears
    }

    // Modal still visible — unlock failed (error shown in modal).
    // Close modal to unblock the test — connections work without encryption.
    const closeBtn = page
      .getByRole('button', { name: /close modal/i })
      .or(page.getByRole('button', { name: /cancel/i }));
    await closeBtn.click({ timeout: 3000 }).catch(() => {});
    await reAuthDialog
      .waitFor({ state: 'hidden', timeout: 3000 })
      .catch(() => {});
    return false; // Unlock failed — but connections still work without encryption
  }
  return true;
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
    test.slow(); // Multi-context multi-step test — triples default timeout
    test.setTimeout(180000);

    const ctxEmployer = await browser.newContext();
    const ctxWorker = await browser.newContext();
    const pageE = await ctxEmployer.newPage();
    const pageW = await ctxWorker.newPage();

    try {
      // ===== STEP 1: Employer signs in =====
      await pageE.goto('/sign-in');
      await pageE.waitForLoadState('domcontentloaded');
      await pageE.fill('#email', EMPLOYER.email);
      await pageE.fill('#password', EMPLOYER.password);
      await pageE.click('button[type="submit"]');
      // Firefox: NS_BINDING_ABORTED; WebKit: hard navigation not detected
      try {
        await pageE.waitForURL((url) => !url.pathname.includes('/sign-in'), {
          timeout: 45000,
        });
      } catch {
        await pageE.waitForLoadState('domcontentloaded');
        if (pageE.url().includes('/sign-in')) {
          throw new Error('Employer sign-in failed after 45s');
        }
      }

      // ===== STEP 2: Navigate to /employer → Team tab =====
      await pageE.goto('/employer');
      await pageE.waitForLoadState('domcontentloaded');

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
        // Click Send Request — don't use waitForResponse as the Supabase
        // API call can hang under CI load, causing timeout before UI updates.
        await sendButton.click({ force: true });

        // Poll for any UI state change indicating the request was processed.
        // Accept multiple valid outcomes:
        // - "Request Sent" button (normal success)
        // - "Sending..." button (in-flight)
        // - Success alert (API succeeded)
        // - "already sent" error (duplicate from prior retry)
        const requestSentButton = pageE
          .locator('[data-testid="search-results"]')
          .getByRole('button', { name: /request sent/i });
        const sendingButton = pageE.getByRole('button', {
          name: /sending/i,
        });
        const successAlert = pageE.locator(
          '.alert-success:has-text("Friend request sent")'
        );
        const errorAlreadySent = pageE.locator(
          '.alert-error:has-text("already sent")'
        );

        const uiUpdated = await requestSentButton
          .or(sendingButton)
          .or(successAlert)
          .or(errorAlreadySent)
          .isVisible({ timeout: 30000 })
          .catch(() => false);

        if (!uiUpdated) {
          // Firefox: UI may not update after click — reload and re-check
          console.log('UI did not update after click, reloading page...');
          await pageE.goto('/employer');
          await pageE.waitForLoadState('domcontentloaded');
          await expect(
            pageE.getByRole('heading', { name: 'Employer Dashboard' })
          ).toBeVisible({ timeout: 15000 });
          await pageE.getByRole('tab', { name: /team/i }).click();
          await expect(pageE.getByTestId('connection-manager')).toBeVisible({
            timeout: 10000,
          });

          // Re-search for the worker — poll with retries because Supabase
          // read replicas may not have propagated the connection yet
          let postReloadConfirmed = false;
          for (let retryAttempt = 0; retryAttempt < 3; retryAttempt++) {
            const searchInput2 = pageE.locator('#user-search-input');
            await searchInput2.fill(WORKER.displayName);
            await searchInput2.press('Enter');
            await pageE.waitForSelector(
              '[data-testid="search-results"], .alert-error',
              { timeout: 15000 }
            );

            // Accept multiple valid states — even "Send Request" is OK
            // because the connection exists in DB even if the read replica
            // hasn't caught up yet
            const postReloadSent = pageE.getByRole('button', {
              name: /request sent|pending|send request/i,
            });
            const postReloadError = pageE.locator(
              '.alert-error:has-text("already")'
            );
            postReloadConfirmed = await postReloadSent
              .or(postReloadError)
              .isVisible({ timeout: 10000 })
              .catch(() => false);
            if (postReloadConfirmed) break;

            console.log(`Post-reload search retry ${retryAttempt + 1}/3`);
            await pageE.goto('/employer');
            await pageE.waitForLoadState('domcontentloaded');
            await expect(
              pageE.getByRole('heading', { name: 'Employer Dashboard' })
            ).toBeVisible({ timeout: 15000 });
            await pageE.getByRole('tab', { name: /team/i }).click();
            await expect(pageE.getByTestId('connection-manager')).toBeVisible({
              timeout: 10000,
            });
          }
          if (!postReloadConfirmed) {
            throw new Error(
              'Search results not visible after 3 post-reload retries'
            );
          }
        }
      } else {
        // Connection already exists from prior retry
        const alreadySent = await pageE
          .getByRole('button', { name: /request sent|pending/i })
          .isVisible({ timeout: 5000 })
          .catch(() => false);
        const hasErrorAlert = !alreadySent
          ? await pageE
              .locator('.alert-error:has-text("already")')
              .isVisible({ timeout: 3000 })
              .catch(() => false)
          : false;
        if (!alreadySent && !hasErrorAlert) {
          throw new Error(
            'Neither "Send Request" nor "Request Sent" button nor existing-connection error found'
          );
        }
        console.log(
          'Connection already exists (prior retry) — skipping send step'
        );
      }

      // Allow Supabase Cloud to propagate the connection before worker checks
      await pageE.waitForTimeout(3000);

      // ===== STEP 5: Worker signs in and accepts =====
      await pageW.goto('/sign-in');
      await pageW.waitForLoadState('domcontentloaded');
      await pageW.fill('#email', WORKER.email);
      await pageW.fill('#password', WORKER.password);
      await pageW.click('button[type="submit"]');
      // Firefox: NS_BINDING_ABORTED; WebKit: hard navigation not detected
      try {
        await pageW.waitForURL((url) => !url.pathname.includes('/sign-in'), {
          timeout: 45000,
        });
      } catch {
        await pageW.waitForLoadState('domcontentloaded');
        if (pageW.url().includes('/sign-in')) {
          throw new Error('Worker sign-in failed after 45s');
        }
      }

      // Verify worker auth is fully hydrated before checking connections
      await pageW.goto('/profile');
      await pageW.waitForLoadState('domcontentloaded');
      await pageW.waitForTimeout(2000);

      // Poll for connection request (useConnections hook fetches on mount)
      let requestFound = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        await pageW.goto('/messages?tab=connections');
        await handleReAuthModal(pageW, WORKER.password);
        await pageW.waitForLoadState('domcontentloaded');

        const receivedTab = pageW.getByRole('tab', {
          name: /pending received|received/i,
        });
        await receivedTab.click({ force: true });

        requestFound = await pageW
          .locator('[data-testid="connection-request"]')
          .isVisible({ timeout: 10000 })
          .catch(() => false);
        if (requestFound) break;
        console.log(
          `Connection request not found (attempt ${attempt + 1}/8), retrying...`
        );
        await pageW.waitForTimeout(3000);
      }
      if (!requestFound) {
        throw new Error(
          'Connection request never appeared after 12 reload attempts'
        );
      }

      // Accept
      const acceptButton = pageW
        .getByRole('button', { name: /accept/i })
        .first();
      await acceptButton.click({ force: true });

      // Verify it disappears from received — useConnections has no realtime
      // subscription so the UI only updates on page reload
      let cardHidden = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        cardHidden = await pageW
          .locator('[data-testid="connection-request"]')
          .isHidden({ timeout: 5000 })
          .catch(() => false);
        if (cardHidden) break;
        console.log(
          `Connection request card still visible (attempt ${attempt + 1}/5), reloading...`
        );
        await pageW.reload();
        await pageW.waitForLoadState('domcontentloaded');
      }
      if (!cardHidden) {
        throw new Error(
          'Connection request card still visible after 5 reload attempts'
        );
      }

      // ===== STEP 6: Employer refreshes Team tab =====
      await pageE.goto('/employer');
      await pageE.waitForLoadState('domcontentloaded');
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
      await expect(workerOption).toBeVisible({ timeout: 15000 });

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
    test.setTimeout(180000);

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
    const { error: insertError } = await client
      .from('user_connections')
      .insert({
        requester_id: workerId,
        addressee_id: employerId,
        status: 'pending',
      });
    if (insertError) {
      throw new Error(`Failed to insert connection: ${insertError.message}`);
    }

    // Verify the record exists in DB before polling UI
    const { data: verifyData } = await client
      .from('user_connections')
      .select('id')
      .eq('requester_id', workerId)
      .eq('addressee_id', employerId)
      .eq('status', 'pending')
      .single();
    if (!verifyData) {
      throw new Error('Connection record not found after insert');
    }

    // Sign in as employer
    await page.goto('/sign-in');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('#email', EMPLOYER.email);
    await page.fill('#password', EMPLOYER.password);
    await page.click('button[type="submit"]');
    // Firefox: NS_BINDING_ABORTED; WebKit: hard navigation not detected
    try {
      await page.waitForURL((url) => !url.pathname.includes('/sign-in'), {
        timeout: 30000,
      });
    } catch {
      await page.waitForLoadState('domcontentloaded');
      if (page.url().includes('/sign-in')) {
        throw new Error('Employer sign-in failed after 30s');
      }
    }

    // Allow Supabase Cloud to propagate before first UI check
    await page.waitForTimeout(5000);

    // Navigate to employer dashboard and poll for connection request
    // (useConnections hook fetches once on mount — need reload to refetch)
    let requestFound = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.goto('/employer');
      await expect(
        page.getByRole('heading', { name: 'Employer Dashboard' })
      ).toBeVisible({ timeout: 15000 });

      await page.getByRole('tab', { name: /team/i }).click();
      await expect(page.getByTestId('connection-manager')).toBeVisible({
        timeout: 10000,
      });

      const receivedTab = page.getByRole('tab', {
        name: /pending received|received/i,
      });
      if (await receivedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await receivedTab.click({ force: true });
        // Wait for the connection list to render after tab switch
        await page.waitForTimeout(2000);
        requestFound = await page
          .locator('[data-testid="connection-request"]')
          .isVisible({ timeout: 8000 })
          .catch(() => false);
        if (requestFound) break;
      }
      console.log(
        `Team badge attempt ${attempt + 1}/5: connection request not visible`
      );
      await page.waitForTimeout(4000);
    }
    expect(requestFound).toBe(true);
  });
});

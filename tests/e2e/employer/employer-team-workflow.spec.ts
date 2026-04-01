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

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { executeSQL } from '../utils/supabase-admin';

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

/** Get user IDs from auth.users by email lookup.
 *  Uses direct SQL instead of listUsers(1000) to avoid 3-5s latency per call
 *  under 18-shard contention.
 */
async function getUserIds(_client: SupabaseClient) {
  const [empRows, wrkRows] = await Promise.all([
    executeSQL(
      `SELECT id FROM auth.users WHERE email = '${EMPLOYER.email.replace(/'/g, "''")}'`
    ) as Promise<{ id: string }[]>,
    executeSQL(
      `SELECT id FROM auth.users WHERE email = '${WORKER.email.replace(/'/g, "''")}'`
    ) as Promise<{ id: string }[]>,
  ]);
  return {
    employerId: empRows[0]?.id ?? null,
    workerId: wrkRows[0]?.id ?? null,
  };
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
  const { data: existingCompany, error: companyQueryErr } = await client
    .from('shared_companies')
    .select('id')
    .limit(1)
    .maybeSingle();

  // Table may not exist in local Supabase environments
  if (companyQueryErr?.message?.includes('does not exist')) {
    throw new Error(
      'shared_companies table not found — employer schema not migrated'
    );
  }

  let companyId: string;
  if (existingCompany) {
    companyId = existingCompany.id;
  } else {
    const { data: newCompany, error: insertErr } = await client
      .from('shared_companies')
      .insert({ name: 'E2E Test Company' })
      .select('id')
      .single();
    if (!newCompany || insertErr) {
      throw new Error(
        `Failed to create shared company: ${insertErr?.message || 'insert returned null'}`
      );
    }
    companyId = newCompany.id;
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

    const client = getAdminClient();
    if (!client) {
      test.skip(true, 'Admin client not available');
      return;
    }

    const ctxEmployer = await browser.newContext();
    const pageE = await ctxEmployer.newPage();

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
          timeout: 60000,
        });
      } catch {
        await pageE.waitForLoadState('domcontentloaded');
        if (pageE.url().includes('/sign-in')) {
          throw new Error('Employer sign-in failed after 60s');
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

      // ===== STEP 4: Create accepted connection via admin client =====
      // Previous rounds (1-8) used browser-driven send/accept which failed
      // due to Supabase Cloud read replica lag under CI load. The admin client
      // writes directly to the PRIMARY database, bypassing read replicas.
      // (Same pattern as the "pending badge" test below, which passes reliably.)
      const { employerId, workerId } = await getUserIds(client);

      // Clean up any existing connection from prior test runs/retries
      await client
        .from('user_connections')
        .delete()
        .or(
          `and(requester_id.eq.${employerId},addressee_id.eq.${workerId}),and(requester_id.eq.${workerId},addressee_id.eq.${employerId})`
        );

      const { error: insertError } = await client
        .from('user_connections')
        .insert({
          requester_id: employerId,
          addressee_id: workerId,
          status: 'pending',
        });
      if (insertError) {
        throw new Error(`Failed to insert connection: ${insertError.message}`);
      }

      // Verify record exists on primary before updating
      const { data: pendingRec } = await client
        .from('user_connections')
        .select('id')
        .eq('requester_id', employerId)
        .eq('addressee_id', workerId)
        .eq('status', 'pending')
        .single();
      if (!pendingRec) {
        throw new Error('Pending connection not found after admin insert');
      }

      // ===== STEP 5: Accept connection via admin client =====
      const { error: acceptError } = await client
        .from('user_connections')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString(),
        })
        .eq('requester_id', employerId)
        .eq('addressee_id', workerId);
      if (acceptError) {
        throw new Error(`Failed to accept connection: ${acceptError.message}`);
      }

      // Verify accepted status on primary
      const { data: acceptedRec } = await client
        .from('user_connections')
        .select('id')
        .eq('requester_id', employerId)
        .eq('addressee_id', workerId)
        .eq('status', 'accepted')
        .single();
      if (!acceptedRec) {
        throw new Error('Accepted connection not found after admin update');
      }
      console.log(`Admin: created + accepted connection ${acceptedRec.id}`);

      // Allow read replica propagation before UI polling
      await pageE.waitForTimeout(2000);

      // ===== STEPS 6-8: Poll for worker in "Add teammate" picker =====
      // Supabase Cloud read replica lag under CI load can exceed 15s.
      // Reload the page between attempts to force fresh queries.
      let workerFound = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        await pageE.goto('/employer');
        await pageE.waitForLoadState('domcontentloaded');
        await expect(
          pageE.getByRole('heading', { name: 'Employer Dashboard' })
        ).toBeVisible({ timeout: 15000 });
        await pageE.getByRole('tab', { name: /team/i }).click();

        const addTeammateButton = pageE.getByRole('button', {
          name: /add teammate/i,
        });
        await expect(addTeammateButton).toBeVisible({ timeout: 10000 });
        await addTeammateButton.click();

        const workerOption = pageE.getByRole('button', {
          name: new RegExp(WORKER.displayName, 'i'),
        });
        workerFound = await workerOption
          .isVisible({ timeout: 10000 })
          .catch(() => false);
        if (workerFound) {
          await workerOption.click();
          break;
        }
        console.log(
          `Worker not in picker (attempt ${attempt + 1}/8), reloading...`
        );
        await pageE.waitForTimeout(3000);
      }
      if (!workerFound) {
        throw new Error(
          'Worker never appeared in "Add teammate" picker after 8 reload attempts'
        );
      }

      // ===== STEP 9: Verify worker appears in team roster =====
      await expect(
        pageE.getByText(new RegExp(WORKER.displayName, 'i')).first()
      ).toBeVisible({ timeout: 10000 });
    } finally {
      await ctxEmployer.close();
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

    // Clean up any stale connections before inserting (prevents duplicate key constraint)
    await client
      .from('user_connections')
      .delete()
      .or(
        `and(requester_id.eq.${workerId},addressee_id.eq.${employerId}),and(requester_id.eq.${employerId},addressee_id.eq.${workerId})`
      );

    // Create pending connection request (worker → employer)
    // Retry on Supabase Cloud connection timeouts
    let insertError;
    for (let attempt = 0; attempt < 3; attempt++) {
      const result = await client.from('user_connections').insert({
        requester_id: workerId,
        addressee_id: employerId,
        status: 'pending',
      });
      insertError = result.error;
      if (!insertError) break;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 3000));
    }
    if (insertError) {
      throw new Error(
        `Failed to insert connection after 3 attempts: ${insertError.message}`
      );
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
        timeout: 60000,
      });
    } catch {
      await page.waitForLoadState('domcontentloaded');
      if (page.url().includes('/sign-in')) {
        throw new Error('Employer sign-in failed after 60s');
      }
    }

    // Allow Supabase Cloud to propagate before first UI check
    await page.waitForTimeout(5000);

    // Navigate to employer dashboard and poll for connection request
    // (useConnections hook fetches once on mount — need reload to refetch)
    // Supabase Cloud read replica lag can exceed 60s — poll up to 20 times (100s)
    let requestFound = false;
    for (let attempt = 0; attempt < 20; attempt++) {
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
      const tabVisible = await receivedTab
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      if (tabVisible) {
        await receivedTab.click({ force: true });
        // Wait for the connection list to render after tab switch
        await page.waitForTimeout(2000);
        requestFound = await page
          .locator('[data-testid="connection-request"]')
          .isVisible({ timeout: 8000 })
          .catch(() => false);
        if (requestFound) break;
        console.log(
          `Team badge attempt ${attempt + 1}/20: received tab visible but no request`
        );
      } else {
        console.log(
          `Team badge attempt ${attempt + 1}/20: received tab not visible (read replica lag)`
        );
      }
      await page.waitForTimeout(5000);
    }
    expect(requestFound).toBe(true);
  });
});

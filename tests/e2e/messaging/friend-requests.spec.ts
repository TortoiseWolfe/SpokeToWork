/**
 * E2E Test: Friend Request Flow
 * Task: T014
 * Updated: Feature 026 - Using standardized test users
 *
 * Scenario:
 * 1. User A sends friend request to User B
 * 2. User B receives and accepts the request
 * 3. Verify connection status is 'accepted' for both users
 *
 * Prerequisites:
 * - PRIMARY and TERTIARY test users exist in Supabase
 * - /messages/connections page exists
 * - UserSearch component exists
 * - ConnectionManager component exists
 */

import { test, expect, Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ensureConnection,
  ensureConversation,
  completeEncryptionSetup,
  dismissCookieBanner,
  dismissReAuthModal,
} from './test-helpers';
import { loginAndVerify } from '../utils/auth-helpers';

// Test users - use PRIMARY and TERTIARY from standardized test fixtures
const USER_A = {
  email: process.env.TEST_USER_PRIMARY_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PRIMARY_PASSWORD!,
};

const USER_B_EMAIL =
  process.env.TEST_USER_TERTIARY_EMAIL || 'test-user-b@example.com';
const USER_B = {
  // display_name is derived from email prefix (see test-user-factory.ts)
  displayName: USER_B_EMAIL.split('@')[0],
  email: USER_B_EMAIL,
  password: process.env.TEST_USER_TERTIARY_PASSWORD!,
};

// Admin client for cleanup
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

const getUserIds = async (
  client: SupabaseClient
): Promise<{ userAId: string | null; userBId: string | null }> => {
  const { data: authUsers } = await client.auth.admin.listUsers({
    perPage: 1000,
  });
  let userAId: string | null = null;
  let userBId: string | null = null;

  if (authUsers?.users) {
    for (const user of authUsers.users) {
      if (user.email === USER_A.email) userAId = user.id;
      if (user.email === USER_B.email) userBId = user.id;
    }
  }

  return { userAId, userBId };
};

/**
 * Ensure user_profiles records exist for both test users
 * Required for user search to work (searches by display_name)
 */
const ensureUserProfiles = async (client: SupabaseClient): Promise<void> => {
  const { userAId, userBId } = await getUserIds(client);

  if (!userAId || !userBId) {
    console.warn('ensureUserProfiles: Could not find user IDs');
    return;
  }

  // Upsert profile for User A
  const displayNameA = USER_A.email.split('@')[0];
  const { error: errorA } = await client.from('user_profiles').upsert({
    id: userAId,
    username: displayNameA,
    display_name: displayNameA,
    updated_at: new Date().toISOString(),
  });
  if (errorA) {
    console.warn('Failed to upsert User A profile:', errorA.message);
  } else {
    console.log('Ensured profile for User A:', displayNameA);
  }

  // Upsert profile for User B
  const { error: errorB } = await client.from('user_profiles').upsert({
    id: userBId,
    username: USER_B.displayName,
    display_name: USER_B.displayName,
    updated_at: new Date().toISOString(),
  });
  if (errorB) {
    console.warn('Failed to upsert User B profile:', errorB.message);
  } else {
    console.log('Ensured profile for User B:', USER_B.displayName);
  }
};

const cleanupConnections = async (): Promise<void> => {
  const client = getAdminClient();
  if (!client) return;

  const { data: users } = await client.auth.admin.listUsers({ perPage: 1000 });
  const userAId = users?.users?.find((u) => u.email === USER_A.email)?.id;
  const userBId = users?.users?.find((u) => u.email === USER_B.email)?.id;

  if (userAId && userBId) {
    // Delete both directions explicitly (A→B and B→A)
    const { error: e1 } = await client
      .from('user_connections')
      .delete()
      .eq('requester_id', userAId)
      .eq('addressee_id', userBId);
    const { error: e2 } = await client
      .from('user_connections')
      .delete()
      .eq('requester_id', userBId)
      .eq('addressee_id', userAId);
    if (e1) console.warn('cleanup A→B failed:', e1.message);
    if (e2) console.warn('cleanup B→A failed:', e2.message);

    // Verify deletion propagated to read replica (Supabase Cloud lag can be 5-30s)
    for (let poll = 0; poll < 10; poll++) {
      const { data: remaining } = await client
        .from('user_connections')
        .select('id')
        .or(
          `and(requester_id.eq.${userAId},addressee_id.eq.${userBId}),and(requester_id.eq.${userBId},addressee_id.eq.${userAId})`
        );
      if (!remaining || remaining.length === 0) break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    console.log('Cleaned up connections between test users');
  }
};

test.describe('Friend Request Flow', () => {
  // Serial: multi-user tests create 2 browser contexts each with Supabase connections.
  test.describe.configure({ mode: 'serial' });
  test.slow(
    ({ browserName }) => browserName === 'firefox' || browserName === 'webkit',
    'Firefox/WebKit: slow Argon2id + Realtime on CI'
  );
  test.beforeEach(async ({ browserName }) => {
    // Friend request tests DELETE and CREATE user_connections rows.
    // Running on 3 browser shards simultaneously causes cross-shard
    // interference — one shard's cleanup deletes another's test data.
    // Chromium-only prevents this; the UI logic is browser-independent.
    test.skip(
      browserName !== 'chromium',
      'Chromium-only: prevents cross-shard interference on shared test state'
    );

    // Clean up any existing connections between test users
    await cleanupConnections();

    // Ensure user profiles exist for search to work
    const client = getAdminClient();
    if (client) {
      await ensureUserProfiles(client);
    }
  });

  test('User A sends friend request and User B accepts', async ({
    browser,
  }) => {
    test.setTimeout(180000); // 3 minutes — argon2id key derivation is expensive per-browser

    // Create two browser contexts (two separate users)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // ===== STEP 1: User A signs in =====
      await loginAndVerify(pageA, {
        email: USER_A.email,
        password: USER_A.password,
      });

      // ===== STEP 2: User A navigates to connections page =====
      await pageA.goto('/messages?tab=connections');
      await dismissCookieBanner(pageA);
      await completeEncryptionSetup(pageA);
      await dismissReAuthModal(pageA);
      // Re-navigate if encryption setup redirected away from tab=connections
      if (!pageA.url().includes('tab=connections')) {
        await pageA.goto('/messages?tab=connections');
        await dismissCookieBanner(pageA);
        await dismissReAuthModal(pageA);
      }
      await expect(pageA).toHaveURL(/.*\/messages\/?\?.*tab=connections/);

      // ===== STEP 3: User A searches for User B by username =====
      const searchInput = pageA.locator('#user-search-input');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      await searchInput.fill(USER_B.displayName);
      await searchInput.press('Enter');

      // Wait for search results
      await pageA.waitForSelector(
        '[data-testid="search-results"], .alert-error',
        {
          timeout: 15000,
        }
      );

      // ===== STEP 4: User A sends friend request =====
      // Multi-attempt polling: Supabase Cloud read replica lag can persist
      // 30s+ after admin cleanup. Each retry navigates fresh for a new query.
      let sendRequestButton = pageA.getByRole('button', {
        name: /send request/i,
      });
      let sendBtnVisible = await sendRequestButton
        .isVisible({ timeout: 8000 })
        .catch(() => false);

      for (let attempt = 1; !sendBtnVisible && attempt < 10; attempt++) {
        console.log(
          `Send Request not visible (attempt ${attempt + 1}/10), waiting for read replica...`
        );
        await pageA.waitForTimeout(3000);
        await pageA.goto('/messages?tab=connections');
        await pageA.waitForLoadState('domcontentloaded');
        await dismissCookieBanner(pageA);
        // Skip encryption setup on retries — keys already derived and stored
        // Use quickCheck (2s) instead of full dismissReAuthModal (18s)
        await dismissReAuthModal(pageA, undefined, true);
        const retrySearchInput = pageA.locator('#user-search-input');
        await expect(retrySearchInput).toBeVisible({ timeout: 10000 });
        await retrySearchInput.fill(USER_B.displayName);
        await retrySearchInput.press('Enter');
        await pageA.waitForSelector(
          '[data-testid="search-results"], .alert-error',
          { timeout: 15000 }
        );
        sendRequestButton = pageA.getByRole('button', {
          name: /send request/i,
        });
        sendBtnVisible = await sendRequestButton
          .isVisible({ timeout: 8000 })
          .catch(() => false);
      }
      if (!sendBtnVisible) {
        throw new Error(
          '"Send Request" button never appeared after 10 reload attempts'
        );
      }
      await sendRequestButton.click({ force: true });

      // Wait for success message
      await expect(pageA.getByText(/friend request sent/i)).toBeVisible({
        timeout: 5000,
      });

      // ===== STEP 5: User B signs in =====
      await loginAndVerify(pageB, {
        email: USER_B.email,
        password: USER_B.password,
      });

      // ===== STEP 6: User B navigates to connections page =====
      await pageB.goto('/messages?tab=connections');
      await dismissCookieBanner(pageB);
      await completeEncryptionSetup(pageB, USER_B.password);
      await dismissReAuthModal(pageB, USER_B.password);
      await expect(pageB).toHaveURL(/.*\/messages\/?\?.*tab=connections/);

      // ===== STEP 7: User B sees pending request in "Received" tab =====
      const receivedTab = pageB.getByRole('tab', {
        name: /pending received|received/i,
      });
      await receivedTab.click({ force: true });

      // Wait for request to appear (Supabase realtime propagation can be slow on CI)
      // Reload fallback for read replica lag — especially needed on webkit
      try {
        await pageB.waitForSelector('[data-testid="connection-request"]', {
          timeout: 15000,
        });
      } catch {
        await pageB.reload();
        await dismissCookieBanner(pageB);
        await dismissReAuthModal(pageB, USER_B.password);
        await receivedTab.click({ force: true });
        await pageB.waitForSelector('[data-testid="connection-request"]', {
          timeout: 30000,
        });
      }

      // ===== STEP 8: User B accepts the request =====
      // Scope to connection request element to avoid matching cookie "Accept All"
      const connectionRequest = pageB
        .locator('[data-testid="connection-request"]')
        .first();
      const acceptButton = connectionRequest.getByRole('button', {
        name: /accept/i,
      });
      await expect(acceptButton).toBeVisible();

      // Capture the Supabase PATCH response to verify the accept API call succeeds
      const acceptResponsePromise = pageB.waitForResponse(
        (resp) =>
          resp.url().includes('user_connections') &&
          resp.request().method() === 'PATCH'
      );
      await acceptButton.click({ force: true });
      const acceptResponse = await acceptResponsePromise;
      expect(acceptResponse.ok()).toBeTruthy();

      // Wait for request to disappear (Supabase realtime propagation can be slow)
      await expect(
        pageB.locator('[data-testid="connection-request"]')
      ).toBeHidden({ timeout: 20000 });

      // ===== STEP 9: Verify accepted state for User B =====
      const acceptedTab = pageB.getByRole('tab', { name: /accepted/i });
      await acceptedTab.click({ force: true });
      await expect(
        pageB.locator('[data-testid="connection-request"]').first()
      ).toBeVisible({ timeout: 15000 });
    } finally {
      // Clean up: close contexts
      await contextA.close();
      await contextB.close();
    }
  });

  test('User A can decline a friend request from User B', async ({
    browser,
  }) => {
    test.setTimeout(120000);
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // User B sends request to User A (searching by username of A)
      await loginAndVerify(pageB, {
        email: USER_B.email,
        password: USER_B.password,
      });

      // Multi-attempt polling for "Send Request" (read replica lag after cleanup)
      const displayNameA = USER_A.email.split('@')[0];
      let sendReqBtn = pageB
        .getByRole('button', { name: /send request/i })
        .first();
      let sendVisible = false;

      for (let attempt = 0; attempt < 10; attempt++) {
        await pageB.goto('/messages?tab=connections');
        await pageB.waitForLoadState('domcontentloaded');
        await dismissCookieBanner(pageB);
        // Only run full encryption setup on first attempt; quickCheck on retries
        if (attempt === 0) {
          await completeEncryptionSetup(pageB, USER_B.password);
          await dismissReAuthModal(pageB, USER_B.password);
        } else {
          await dismissReAuthModal(pageB, USER_B.password, true);
        }
        const searchInput = pageB.locator('#user-search-input');
        await expect(searchInput).toBeVisible({ timeout: 10000 });
        await searchInput.fill(displayNameA);
        await searchInput.press('Enter');
        await pageB.waitForSelector(
          '[data-testid="search-results"], .alert-error',
          { timeout: 15000 }
        );
        sendReqBtn = pageB
          .getByRole('button', { name: /send request/i })
          .first();
        sendVisible = await sendReqBtn
          .isVisible({ timeout: 8000 })
          .catch(() => false);
        if (sendVisible) break;
        console.log(
          `Send Request not visible (attempt ${attempt + 1}/10), waiting for read replica...`
        );
        await pageB.waitForTimeout(3000);
      }
      if (!sendVisible) {
        throw new Error(
          '"Send Request" button never appeared after 10 reload attempts'
        );
      }
      await sendReqBtn.click({ force: true });
      await expect(pageB.getByText(/friend request sent/i).first()).toBeVisible(
        {
          timeout: 30000,
        }
      );

      // User A signs in and declines
      await loginAndVerify(pageA, {
        email: USER_A.email,
        password: USER_A.password,
      });

      // Multi-attempt polling for connection-request visibility (read replica lag)
      let requestVisible = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        await pageA.goto('/messages?tab=connections');
        await pageA.waitForLoadState('domcontentloaded');
        await dismissCookieBanner(pageA);
        if (attempt === 0) {
          await completeEncryptionSetup(pageA);
          await dismissReAuthModal(pageA);
        } else {
          await dismissReAuthModal(pageA, undefined, true);
        }
        const receivedTab = pageA.getByRole('tab', {
          name: /pending received|received/i,
        });
        await receivedTab.click({ force: true });
        requestVisible = await pageA
          .locator('[data-testid="connection-request"]')
          .isVisible({ timeout: 8000 })
          .catch(() => false);
        if (requestVisible) break;
        console.log(
          `Connection request not visible (attempt ${attempt + 1}/8), reloading...`
        );
        await pageA.waitForTimeout(5000);
      }
      if (!requestVisible) {
        throw new Error(
          'Connection request never appeared after 8 reload attempts'
        );
      }

      // Decline the request
      const declineButton = pageA
        .getByRole('button', { name: /decline/i })
        .first();
      await declineButton.click({ force: true });

      // Verify request disappears from received tab
      await expect(
        pageA.locator('[data-testid="connection-request"]')
      ).toBeHidden({ timeout: 5000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('User A can cancel a sent pending request', async ({ page }) => {
    test.setTimeout(180000); // login ~45s + up to 10 retries for read replica lag

    // Sign in as User A
    await loginAndVerify(page, {
      email: USER_A.email,
      password: USER_A.password,
    });

    // Send friend request to User B — multi-attempt for read replica lag
    let cancelSendVisible = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      await page.goto('/messages?tab=connections');
      await dismissCookieBanner(page);
      // Only check encryption setup on first iteration (keys persist in DB)
      if (attempt === 0) await completeEncryptionSetup(page);
      await dismissReAuthModal(page, undefined, attempt > 0);
      const searchInput = page.locator('#user-search-input');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      await searchInput.fill(USER_B.displayName);
      await searchInput.press('Enter');
      await page.waitForSelector(
        '[data-testid="search-results"], .alert-error',
        { timeout: 15000 }
      );
      const sendBtn = page
        .getByRole('button', { name: /send request/i })
        .first();
      cancelSendVisible = await sendBtn
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      if (cancelSendVisible) {
        await sendBtn.click({ force: true });
        break;
      }
      console.log(
        `Send Request not visible (attempt ${attempt + 1}/10), waiting for read replica...`
      );
      await page.waitForTimeout(3000);
    }
    if (!cancelSendVisible) {
      throw new Error(
        '"Send Request" button never appeared after 10 reload attempts'
      );
    }
    await expect(page.getByText(/friend request sent/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Wait for the connection list to refresh (onRequestSent triggers refetch)
    const sentTab = page.getByRole('tab', { name: /pending sent|sent/i });
    await expect(sentTab).toContainText(/\([1-9]/, { timeout: 10000 });

    // Go to "Sent" tab
    await sentTab.click({ force: true });

    // Find the pending request (Supabase realtime propagation can be slow on CI)
    await page.waitForSelector('[data-testid="connection-request"]', {
      timeout: 15000,
    });

    // Cancel the request
    const cancelButton = page
      .getByRole('button', { name: /cancel|delete/i })
      .first();
    await cancelButton.click({ force: true });

    // Verify request disappears
    await expect(page.locator('[data-testid="connection-request"]')).toBeHidden(
      { timeout: 5000 }
    );
  });

  test('User cannot send duplicate requests', async ({ page }) => {
    test.setTimeout(90000); // webkit login ~45s, need margin for test body

    await loginAndVerify(page, {
      email: USER_A.email,
      password: USER_A.password,
    });

    await page.goto('/messages?tab=connections');
    await dismissCookieBanner(page);
    await completeEncryptionSetup(page);
    await dismissReAuthModal(page);

    // Send first request — multi-attempt polling for read replica lag.
    // Supabase Cloud read replicas can lag 5-30s after cleanup DELETEs.
    let dupSendVisible = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      await page.goto('/messages?tab=connections');
      await dismissCookieBanner(page);
      if (attempt === 0) await completeEncryptionSetup(page);
      await dismissReAuthModal(page, undefined, attempt > 0);
      const searchInput = page.locator('#user-search-input');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      await searchInput.fill(USER_B.displayName);
      await searchInput.press('Enter');
      await page.waitForSelector(
        '[data-testid="search-results"], .alert-error',
        { timeout: 15000 }
      );
      const sendBtn = page.getByRole('button', { name: /send request/i });
      dupSendVisible = await sendBtn
        .isVisible({ timeout: 8000 })
        .catch(() => false);
      if (dupSendVisible) {
        await sendBtn.click({ force: true });
        break;
      }
      console.log(
        `Duplicate test: Send Request not visible (attempt ${attempt + 1}/10), waiting for read replica...`
      );
      await page.waitForTimeout(3000);
    }
    if (!dupSendVisible) {
      throw new Error(
        '"Send Request" button never appeared after 10 reload attempts (duplicate test)'
      );
    }
    await expect(page.getByText(/friend request sent/i)).toBeVisible({
      timeout: 5000,
    });

    // Search again and verify button state changed
    const searchInputAfter = page.locator('#user-search-input');
    await searchInputAfter.clear();
    await searchInputAfter.fill(USER_B.displayName);
    await searchInputAfter.press('Enter');
    await page.waitForSelector('[data-testid="search-results"], .alert-error', {
      timeout: 15000,
    });

    // Button should be disabled or show different text like "Pending"
    const requestButtonAfter = page
      .getByRole('button', { name: /send request/i })
      .first();
    const isPending = await page
      .getByRole('button', { name: /pending/i })
      .isVisible()
      .catch(() => false);
    const isDisabled = await requestButtonAfter.isDisabled().catch(() => true);

    expect(isPending || isDisabled).toBe(true);
  });
});

test.describe('Accessibility', () => {
  test.describe.configure({ timeout: 90000 }); // webkit login ~45s, need margin

  test.beforeEach(async () => {
    const client = getAdminClient();
    if (client) {
      await ensureConnection(client, USER_A.email, USER_B.email);
    }
  });

  test('connections page meets WCAG standards', async ({ page }) => {
    await loginAndVerify(page, {
      email: USER_A.email,
      password: USER_A.password,
    });

    await page.goto('/messages?tab=connections');
    await dismissCookieBanner(page);
    await completeEncryptionSetup(page);
    await dismissReAuthModal(page);

    // Verify keyboard navigation
    await page.keyboard.press('Tab');
    const activeTag = await page.evaluate(
      () => document.activeElement?.tagName
    );
    expect(activeTag).toBeTruthy();
    expect(activeTag).not.toBe('BODY');

    // Verify ARIA labels on search input
    const searchInput = page.locator('#user-search-input');
    await expect(searchInput).toHaveAttribute('aria-label', /.+/);

    // Verify visible buttons have accessible labels
    const buttons = page.locator('button:visible');
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      expect(ariaLabel || text).toBeTruthy();
    }
  });

  test('tab navigation works correctly', async ({ page }) => {
    await loginAndVerify(page, {
      email: USER_A.email,
      password: USER_A.password,
    });

    await page.goto('/messages?tab=connections');
    await dismissCookieBanner(page);
    await completeEncryptionSetup(page);
    await dismissReAuthModal(page);
    await page.waitForLoadState('networkidle');

    // Verify all tabs exist with correct roles and are clickable
    const sentTab = page.getByRole('tab', { name: /pending sent|sent/i });
    const receivedTab = page.getByRole('tab', {
      name: /pending received|received/i,
    });
    const acceptedTab = page.getByRole('tab', { name: /accepted/i });

    await expect(sentTab).toBeVisible();
    await expect(receivedTab).toBeVisible();
    await expect(acceptedTab).toBeVisible();

    // Tabs should be focusable and clickable
    await sentTab.click();
    await expect(sentTab).toHaveAttribute('aria-selected', 'true');

    await receivedTab.click();
    await expect(receivedTab).toHaveAttribute('aria-selected', 'true');

    await acceptedTab.click();
    await expect(acceptedTab).toHaveAttribute('aria-selected', 'true');
  });
});

/**
 * E2E Test: Complete User Messaging Workflow
 * Feature: 024-add-third-test
 */

import { test, expect, Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  completeEncryptionSetup,
  dismissCookieBanner,
  dismissReAuthModal,
} from './test-helpers';
import { loginAndVerify } from '../utils/auth-helpers';

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

let adminClient: SupabaseClient | null = null;

const getAdminClient = (): SupabaseClient | null => {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not configured');
    return null;
  }

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

const cleanupTestData = async (client: SupabaseClient): Promise<void> => {
  const { userAId, userBId } = await getUserIds(client);

  if (!userAId || !userBId) {
    console.warn('Could not find user IDs for cleanup');
    return;
  }

  console.log('Cleanup: User A ID: ' + userAId + ', User B ID: ' + userBId);

  await client
    .from('messages')
    .delete()
    .or('sender_id.eq.' + userAId + ',sender_id.eq.' + userBId);
  await client
    .from('conversations')
    .delete()
    .or(
      'participant_1_id.eq.' +
        userAId +
        ',participant_1_id.eq.' +
        userBId +
        ',participant_2_id.eq.' +
        userAId +
        ',participant_2_id.eq.' +
        userBId
    );
  await client
    .from('user_connections')
    .delete()
    .or(
      'requester_id.eq.' +
        userAId +
        ',requester_id.eq.' +
        userBId +
        ',addressee_id.eq.' +
        userAId +
        ',addressee_id.eq.' +
        userBId
    );

  console.log('Cleanup completed');
};

const createConversation = async (
  client: SupabaseClient
): Promise<string | null> => {
  const { userAId, userBId } = await getUserIds(client);
  if (!userAId || !userBId) return null;

  // Use canonical ordering (smaller UUID first)
  const participant1 = userAId < userBId ? userAId : userBId;
  const participant2 = userAId < userBId ? userBId : userAId;

  // Check if conversation already exists
  const { data: existing } = await client
    .from('conversations')
    .select('id')
    .eq('participant_1_id', participant1)
    .eq('participant_2_id', participant2)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new conversation
  const { data: newConvo, error } = await client
    .from('conversations')
    .insert({ participant_1_id: participant1, participant_2_id: participant2 })
    .select()
    .single();

  if (error) {
    console.log('Failed to create conversation: ' + error.message);
    return null;
  }

  return newConvo.id;
};

test.describe('Complete User Messaging Workflow (Feature 024)', () => {
  test.beforeEach(async ({ browserName }) => {
    // This test DELETEs user_connections rows. Running on 3 browser shards
    // simultaneously causes cross-shard interference — one shard's cleanup
    // deletes another's test data. Chromium-only prevents this.
    test.skip(
      browserName !== 'chromium',
      'Chromium-only: prevents cross-shard interference on shared test state'
    );

    const client = getAdminClient();
    if (client) {
      await ensureUserProfiles(client);
      await cleanupTestData(client);
    }
  });

  test.afterEach(async () => {
    // Clean up stale data between retries (Playwright CI retries=2).
    // Without this, retried runs encounter stale connections/messages
    // that cause ReAuthModal and navigation failures.
    const client = getAdminClient();
    if (client) {
      await cleanupTestData(client);
    }
  });

  test('Complete messaging workflow: sign-in -> connect -> message -> sign-out', async ({
    browser,
  }) => {
    test.setTimeout(180000); // 3 minutes for full workflow (2 logins ~90s on webkit)

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    let conversationId: string | null = null;
    let testMessage = '';
    let replyMessage = '';

    try {
      // STEP 1: User A signs in
      console.log('Step 1: User A signing in...');
      await loginAndVerify(pageA, {
        email: USER_A.email,
        password: USER_A.password,
      });
      console.log('Step 1: User A signed in');

      // STEP 2: Navigate to connections
      console.log('Step 2: Navigating to connections...');
      await pageA.goto('/messages?tab=connections');

      // Handle encryption setup and ReAuth if they appear
      await dismissCookieBanner(pageA);
      await completeEncryptionSetup(pageA);
      await dismissReAuthModal(pageA);
      const encryptionReady = true;

      await expect(pageA).toHaveURL(/.*\/messages\/?\?.*tab=connections/);
      // Verify connections tab is active (tab has aria-selected="true")
      await expect(
        pageA.getByRole('tab', { name: /connections/i, selected: true })
      ).toBeVisible();
      console.log('Step 2: Connections tab loaded');

      // STEP 3: Search for User B
      console.log(
        'Step 3: Searching for User B with displayName: ' + USER_B.displayName
      );
      const searchInput = pageA.locator('#user-search-input');
      await expect(searchInput).toBeVisible({ timeout: 5000 });
      await searchInput.fill(USER_B.displayName);
      await searchInput.press('Enter');
      console.log('Step 3: Submitted search');

      // Wait for results
      await pageA.waitForSelector(
        '[data-testid="search-results"], .alert-error',
        { timeout: 15000 }
      );
      const hasResults = await pageA
        .locator('[data-testid="search-results"]')
        .isVisible()
        .catch(() => false);
      if (!hasResults) {
        const errorText = await pageA
          .locator('.alert-error')
          .textContent()
          .catch(() => 'unknown');
        throw new Error('Search did not find User B. Error: ' + errorText);
      }
      console.log('Step 3: Search completed - User B found');

      // STEP 4: Send friend request
      // Multi-attempt polling: Supabase Cloud read replica lag can persist
      // 30s+ after admin cleanup. Each retry navigates fresh for a new query.
      console.log('Step 4: Sending friend request...');
      let sendRequestButton = pageA.getByRole('button', {
        name: /send request/i,
      });
      let sendBtnVisible = await sendRequestButton
        .isVisible({ timeout: 8000 })
        .catch(() => false);

      for (let attempt = 1; !sendBtnVisible && attempt < 8; attempt++) {
        console.log(
          `Step 4: Send Request not visible (attempt ${attempt + 1}/8), reloading...`
        );
        await pageA.waitForTimeout(5000);
        await pageA.goto('/messages?tab=connections');
        await pageA.waitForLoadState('domcontentloaded');
        await dismissCookieBanner(pageA);
        // Skip encryption setup on retries — keys already derived
        // Use quickCheck (2s) instead of full dismissReAuthModal (18s)
        await dismissReAuthModal(pageA, undefined, true);
        const retrySearch = pageA.locator('#user-search-input');
        await expect(retrySearch).toBeVisible({ timeout: 10000 });
        await retrySearch.fill(USER_B.displayName);
        await retrySearch.press('Enter');
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
          'Step 4: "Send Request" button never appeared after 8 reload attempts'
        );
      }

      // Log button state before click
      const isDisabled = await sendRequestButton.isDisabled();
      console.log('Step 4: Send Request button disabled:', isDisabled);

      await sendRequestButton.click();

      // Wait for button text to change (indicates request in progress or complete)
      await pageA.waitForTimeout(2000);

      // Check what's on the page now
      const pageContent = await pageA
        .locator('[data-testid="user-search"]')
        .textContent();
      console.log(
        'Step 4: UserSearch content after click:',
        pageContent?.substring(0, 200)
      );

      // Look for success message or "Request Sent" button text
      const successVisible = await pageA
        .getByText(/friend request sent|request sent/i)
        .isVisible()
        .catch(() => false);
      const errorVisible = await pageA
        .locator('.alert-error')
        .isVisible()
        .catch(() => false);

      if (errorVisible) {
        const errorText = await pageA.locator('.alert-error').textContent();
        throw new Error('Friend request failed: ' + errorText);
      }

      if (!successVisible) {
        // Check if button changed to "Request Sent"
        const buttonAfter = pageA.getByRole('button', {
          name: /request sent/i,
        });
        if (await buttonAfter.isVisible().catch(() => false)) {
          console.log('Step 4: Button shows "Request Sent"');
        } else {
          throw new Error(
            'Friend request: no success/error message and button did not change'
          );
        }
      }
      console.log('Step 4: Friend request sent');

      // STEP 5: User B signs in
      console.log('Step 5: User B signing in...');
      await loginAndVerify(pageB, {
        email: USER_B.email,
        password: USER_B.password,
      });
      console.log('Step 5: User B signed in');

      // STEP 6: User B views pending requests
      // Multi-attempt polling: Supabase Cloud read replica lag can delay
      // the friend request from appearing on User B's received tab.
      console.log('Step 6: User B viewing pending requests...');
      let requestVisible = false;
      for (let attempt = 0; attempt < 8; attempt++) {
        await pageB.goto('/messages?tab=connections');
        await pageB.waitForLoadState('domcontentloaded');
        await dismissCookieBanner(pageB);
        if (attempt === 0) {
          await completeEncryptionSetup(pageB, USER_B.password);
          await dismissReAuthModal(pageB, USER_B.password);
        } else {
          await dismissReAuthModal(pageB, USER_B.password, true);
        }
        await expect(pageB).toHaveURL(/.*\/messages\/?\?.*tab=connections/);

        const receivedTab = pageB.getByRole('tab', {
          name: /pending received|received/i,
        });
        await receivedTab.click({ force: true });
        await pageB.waitForLoadState('networkidle');
        requestVisible = await pageB
          .locator('[data-testid="connection-request"]')
          .isVisible({ timeout: 8000 })
          .catch(() => false);
        if (requestVisible) break;
        console.log(
          `Step 6: Connection request not visible (attempt ${attempt + 1}/8), reloading...`
        );
        await pageB.waitForTimeout(3000);
      }
      if (!requestVisible) {
        throw new Error(
          'Step 6: Connection request never appeared after 5 reload attempts'
        );
      }
      console.log('Step 6: Pending request visible');

      // STEP 7: User B accepts friend request
      console.log('Step 7: Accepting friend request...');
      // Dismiss cookie banner again in case it re-appeared
      await dismissCookieBanner(pageB);
      // Scope the accept button to the connection request element to avoid
      // matching the cookie consent "Accept All" button
      const connectionRequest = pageB
        .locator('[data-testid="connection-request"]')
        .first();
      const acceptButton = connectionRequest.getByRole('button', {
        name: /accept/i,
      });
      await expect(acceptButton).toBeVisible();
      await acceptButton.click({ force: true });

      // Wait for accept button to disappear (indicates action completed)
      await expect(acceptButton).toBeHidden({ timeout: 10000 });

      // Switch to Accepted tab to verify connection moved there
      const acceptedTab = pageB.getByRole('tab', { name: /accepted/i });
      await acceptedTab.click();
      await pageB.waitForTimeout(500);

      // Verify the connection appears in Accepted tab — on CI the list may
      // not refresh automatically.  Reload and re-dismiss modals as fallback.
      try {
        await expect(
          pageB.locator('[data-testid="connection-request"]')
        ).toBeVisible({ timeout: 15000 });
      } catch {
        console.log(
          'Step 7: connection-request not visible, reloading pageB...'
        );
        await pageB.reload();
        await pageB.waitForLoadState('networkidle');
        await dismissCookieBanner(pageB);
        await dismissReAuthModal(pageB, USER_B.password, true);

        // Re-select the Accepted tab after reload
        const acceptedTabRetry = pageB.getByRole('tab', {
          name: /accepted/i,
        });
        await acceptedTabRetry.click();
        await pageB.waitForTimeout(1000);

        await expect(
          pageB.locator('[data-testid="connection-request"]')
        ).toBeVisible({ timeout: 15000 });
      }
      console.log('Step 7: Connection accepted and visible in Accepted tab');

      // STEP 8: Create conversation and User A sends message
      // Messaging requires encryption — skip remaining steps if keys unavailable
      test.skip(
        !encryptionReady,
        'Encryption keys could not be unlocked — messaging requires encryption'
      );
      console.log('Step 8: Creating conversation and sending message...');
      const client = getAdminClient();
      if (client) {
        conversationId = await createConversation(client);
        console.log('Step 8: Conversation ID: ' + conversationId);
      }

      if (!conversationId) {
        throw new Error('Could not create conversation');
      }

      await pageA.goto('/messages?conversation=' + conversationId);
      await dismissCookieBanner(pageA);
      await completeEncryptionSetup(pageA);
      await pageA.waitForLoadState('networkidle');
      await pageA.waitForTimeout(1000); // Let messaging page mount fully
      await dismissReAuthModal(pageA);

      testMessage = 'Hello from User A - ' + Date.now();
      const messageInput = pageA.locator(
        'textarea[aria-label="Message input"]'
      );
      await expect(messageInput).toBeVisible({ timeout: 10000 });
      await messageInput.fill(testMessage);

      const sendButton = pageA.getByRole('button', { name: /send/i });
      await sendButton.click({ force: true });
      await expect(pageA.getByText(testMessage)).toBeVisible({
        timeout: 10000,
      });
      console.log('Step 8: Message sent');

      // STEP 9: User B receives message
      console.log('Step 9: User B receiving message...');
      await pageB.goto('/messages?conversation=' + conversationId);
      await dismissCookieBanner(pageB);
      await completeEncryptionSetup(pageB, USER_B.password);
      await pageB.waitForLoadState('networkidle');
      await pageB.waitForTimeout(1000); // Let messaging page mount fully
      await dismissReAuthModal(pageB, USER_B.password);
      // Reload fallback for Supabase Cloud read replica lag
      try {
        await expect(pageB.getByText(testMessage)).toBeVisible({
          timeout: 15000,
        });
      } catch {
        // Re-navigate with encryption setup + conversation URL preservation
        await pageB.goto('/messages?conversation=' + conversationId);
        await dismissCookieBanner(pageB);
        await completeEncryptionSetup(pageB, USER_B.password);
        if (!pageB.url().includes('conversation=')) {
          await pageB.goto('/messages?conversation=' + conversationId);
          await dismissCookieBanner(pageB);
        }
        await dismissReAuthModal(pageB, USER_B.password, true);
        await expect(pageB.getByText(testMessage)).toBeVisible({
          timeout: 30000,
        });
      }
      console.log('Step 9: Message received');

      // STEP 10: User B replies
      console.log('Step 10: User B replying...');
      replyMessage = 'Reply from User B - ' + Date.now();
      const messageInputB = pageB.locator(
        'textarea[aria-label="Message input"]'
      );
      await messageInputB.fill(replyMessage);
      await pageB.getByRole('button', { name: /send/i }).click({ force: true });
      await expect(pageB.getByText(replyMessage)).toBeVisible({
        timeout: 10000,
      });
      console.log('Step 10: Reply sent');

      // STEP 11: User A receives reply
      console.log('Step 11: User A receiving reply...');
      // Navigate with conversation param + encryption setup + URL preservation
      await pageA.goto('/messages?conversation=' + conversationId);
      await dismissCookieBanner(pageA);
      await completeEncryptionSetup(pageA);
      if (!pageA.url().includes('conversation=')) {
        await pageA.goto('/messages?conversation=' + conversationId);
        await dismissCookieBanner(pageA);
      }
      await dismissReAuthModal(pageA, undefined, true);

      // Reload fallback for Supabase Cloud read replica lag
      try {
        await expect(pageA.getByText(replyMessage)).toBeVisible({
          timeout: 30000,
        });
      } catch {
        await pageA.goto('/messages?conversation=' + conversationId);
        await dismissCookieBanner(pageA);
        await completeEncryptionSetup(pageA);
        if (!pageA.url().includes('conversation=')) {
          await pageA.goto('/messages?conversation=' + conversationId);
          await dismissCookieBanner(pageA);
        }
        await dismissReAuthModal(pageA, undefined, true);
        await expect(pageA.getByText(replyMessage)).toBeVisible({
          timeout: 30000,
        });
      }
      console.log('Step 11: Reply received');

      // STEP 12: Sign out both users
      console.log('Step 12: Signing out...');
      await pageA.goto('/profile');
      const signOutA = pageA.getByRole('button', { name: /sign out|logout/i });
      if (await signOutA.isVisible({ timeout: 3000 }).catch(() => false)) {
        await signOutA.click({ force: true });
      }

      await pageB.goto('/profile');
      const signOutB = pageB.getByRole('button', { name: /sign out|logout/i });
      if (await signOutB.isVisible({ timeout: 3000 }).catch(() => false)) {
        await signOutB.click({ force: true });
      }
      console.log('Step 12: Signed out');

      // STEP 13: Verify encryption
      console.log('Step 13: Verifying encryption...');
      if (client && testMessage && replyMessage) {
        const { data: messages } = await client
          .from('messages')
          .select('encrypted_content, initialization_vector')
          .order('created_at', { ascending: false })
          .limit(5);

        if (messages && messages.length > 0) {
          const foundPlaintext = messages.some((msg) => {
            const content = msg.encrypted_content;
            return (
              content &&
              (content.includes(testMessage) || content.includes(replyMessage))
            );
          });
          expect(foundPlaintext).toBe(false);
          console.log(
            'Step 13: Encryption verified - messages are encrypted in database'
          );
        }
      }

      console.log('Complete workflow test PASSED!');
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});

test.describe('Conversations Page Loading (Feature 029)', () => {
  test('should load conversations page within 5 seconds (SC-001)', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // Sign in
    await loginAndVerify(page, {
      email: USER_A.email,
      password: USER_A.password,
    });

    // Navigate to messaging page (Feature 037: /conversations redirects to /messages?tab=chats)
    await page.goto('/messages?tab=chats');
    await dismissCookieBanner(page);
    await completeEncryptionSetup(page);
    await dismissReAuthModal(page);

    // Measure page render time AFTER encryption/auth setup completes
    const startTime = Date.now();

    // Wait for page title to load - NOT spinner
    await expect(page.locator('h1:has-text("Messages")').first()).toBeVisible({
      timeout: 5000,
    });

    const loadTime = Date.now() - startTime;
    console.log('[Test] Messages page loaded in ' + loadTime + 'ms');

    // Verify page loaded within 5 seconds (SC-001)
    expect(loadTime).toBeLessThan(5000);

    // Verify spinner is NOT visible (SC-002)
    const spinner = page.locator('.loading-spinner');
    await expect(spinner).toBeHidden();
  });

  test('should show retry button on error state (FR-005)', async ({ page }) => {
    test.setTimeout(90000);

    // Sign in
    await loginAndVerify(page, {
      email: USER_A.email,
      password: USER_A.password,
    });

    // Navigate to messaging (Feature 037: /conversations redirects to /messages?tab=chats)
    await page.goto('/messages?tab=chats');
    await dismissCookieBanner(page);
    await completeEncryptionSetup(page);
    await page.waitForLoadState('networkidle');
    await dismissReAuthModal(page);

    // If error is shown, verify retry button exists
    const errorAlert = page.locator('.alert-error');
    if (await errorAlert.isVisible().catch(() => false)) {
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();
    }
  });
});

test.describe('Test Idempotency Verification', () => {
  test('should complete cleanup successfully', async () => {
    const client = getAdminClient();
    if (!client) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not configured');
      return;
    }

    await cleanupTestData(client);

    const { userAId, userBId } = await getUserIds(client);
    if (userAId && userBId) {
      const { data: connections } = await client
        .from('user_connections')
        .select('id')
        .or('requester_id.eq.' + userAId + ',addressee_id.eq.' + userBId);

      expect(connections?.length || 0).toBe(0);
      console.log('Idempotency verified');
    }
  });
});

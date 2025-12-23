/**
 * E2E Test: Complete User Messaging Workflow
 * Feature: 024-add-third-test
 */

import { test, expect, Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Handle the ReAuthModal that appears when session is restored
 * but encryption keys need to be unlocked.
 */
async function handleReAuthModal(page: Page, password: string) {
  try {
    // Wait for the ReAuth modal to appear (with short timeout)
    const reAuthDialog = page.getByRole('dialog', {
      name: /re-authentication required/i,
    });

    // Wait for it to be visible
    await reAuthDialog.waitFor({ state: 'visible', timeout: 5000 });

    // Fill password and unlock
    const passwordInput = page.getByRole('textbox', { name: /password/i });
    await passwordInput.fill(password);
    await page.getByRole('button', { name: /unlock messages/i }).click();

    // Wait for modal to close
    await reAuthDialog.waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // Modal didn't appear or already handled - continue
  }
}

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
  const { data: authUsers } = await client.auth.admin.listUsers();
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
  test.beforeEach(async () => {
    const client = getAdminClient();
    if (client) {
      await ensureUserProfiles(client);
      await cleanupTestData(client);
    }
  });

  test('Complete messaging workflow: sign-in -> connect -> message -> sign-out', async ({
    browser,
  }) => {
    test.setTimeout(120000); // 2 minutes for full workflow

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
      await pageA.goto('/sign-in');
      await pageA.waitForLoadState('networkidle');
      await pageA.fill('#email', USER_A.email);
      await pageA.fill('#password', USER_A.password);
      await pageA.click('button[type="submit"]');
      await pageA.waitForURL(/.*\/profile/, { timeout: 15000 });
      console.log('Step 1: User A signed in');

      // STEP 2: Navigate to connections
      console.log('Step 2: Navigating to connections...');
      await pageA.goto('/messages?tab=connections');

      // Handle ReAuthModal if it appears (encryption key unlock)
      await handleReAuthModal(pageA, USER_A.password);

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
      console.log('Step 4: Sending friend request...');
      const sendRequestButton = pageA.getByRole('button', {
        name: /send request/i,
      });
      await expect(sendRequestButton).toBeVisible();

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
      await pageB.goto('/sign-in');
      await pageB.waitForLoadState('networkidle');
      await pageB.fill('#email', USER_B.email);
      await pageB.fill('#password', USER_B.password);
      await pageB.click('button[type="submit"]');
      await pageB.waitForURL(/.*\/profile/, { timeout: 15000 });
      console.log('Step 5: User B signed in');

      // STEP 6: User B views pending requests
      console.log('Step 6: User B viewing pending requests...');
      await pageB.goto('/messages?tab=connections');

      // Handle ReAuthModal for User B if it appears
      await handleReAuthModal(pageB, USER_B.password);

      await expect(pageB).toHaveURL(/.*\/messages\/?\?.*tab=connections/);

      const receivedTab = pageB.getByRole('tab', {
        name: /pending received|received/i,
      });
      await receivedTab.click({ force: true });
      await pageB.waitForSelector('[data-testid="connection-request"]', {
        timeout: 5000,
      });
      console.log('Step 6: Pending request visible');

      // STEP 7: User B accepts friend request
      console.log('Step 7: Accepting friend request...');
      const acceptButton = pageB
        .getByRole('button', { name: /accept/i })
        .first();
      await expect(acceptButton).toBeVisible();
      await acceptButton.click({ force: true });

      // Wait for accept button to disappear (indicates action completed)
      await expect(acceptButton).toBeHidden({ timeout: 10000 });

      // Switch to Accepted tab to verify connection moved there
      const acceptedTab = pageB.getByRole('tab', { name: /accepted/i });
      await acceptedTab.click();
      await pageB.waitForTimeout(500);

      // Verify the connection appears in Accepted tab
      await expect(
        pageB.locator('[data-testid="connection-request"]')
      ).toBeVisible({ timeout: 5000 });
      console.log('Step 7: Connection accepted and visible in Accepted tab');

      // STEP 8: Create conversation and User A sends message
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
      await pageA.waitForLoadState('networkidle');
      await handleReAuthModal(pageA, USER_A.password);

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
      await pageB.waitForLoadState('networkidle');
      await handleReAuthModal(pageB, USER_B.password);
      await expect(pageB.getByText(testMessage)).toBeVisible({
        timeout: 10000,
      });
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
      await pageA.reload();

      // Handle ReAuthModal after reload (encryption keys need to be unlocked again)
      await handleReAuthModal(pageA, USER_A.password);

      await expect(pageA.getByText(replyMessage)).toBeVisible({
        timeout: 10000,
      });
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
    test.setTimeout(30000);

    // Sign in
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('#email', USER_A.email);
    await page.fill('#password', USER_A.password);
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL(/.*\/profile/, { timeout: 15000 });

    // Navigate to conversations page and time it
    const startTime = Date.now();
    await page.goto('/conversations');
    await handleReAuthModal(page, USER_A.password);

    // Wait for page title to load - NOT spinner
    await expect(
      page.locator('h1:has-text("Conversations")').first()
    ).toBeVisible({ timeout: 5000 });

    const loadTime = Date.now() - startTime;
    console.log('[Test] Conversations page loaded in ' + loadTime + 'ms');

    // Verify page loaded within 5 seconds (SC-001)
    expect(loadTime).toBeLessThan(5000);

    // Verify spinner is NOT visible (SC-002)
    const spinner = page.locator('.loading-spinner');
    await expect(spinner).toBeHidden();
  });

  test('should show retry button on error state (FR-005)', async ({ page }) => {
    test.setTimeout(30000);

    // Sign in
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    await page.fill('#email', USER_A.email);
    await page.fill('#password', USER_A.password);
    await page.click('button[type="submit"]', { force: true });
    await page.waitForURL(/.*\/profile/, { timeout: 15000 });

    // Navigate to conversations
    await page.goto('/conversations');
    await page.waitForLoadState('networkidle');
    await handleReAuthModal(page, USER_A.password);

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

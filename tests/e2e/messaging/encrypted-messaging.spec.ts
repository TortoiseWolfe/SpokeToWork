/**
 * E2E Test for Encrypted Messaging Flow
 * Task: T044
 *
 * Tests:
 * 1. Send encrypted message from User A → User B
 * 2. User B receives and decrypts message correctly
 * 3. Verify database only stores ciphertext (zero-knowledge)
 * 4. Verify encryption keys never sent to server
 * 5. Test delivery status indicators
 * 6. Test pagination and message history
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

const BASE_URL = process.env.NEXT_PUBLIC_DEPLOY_URL || 'http://localhost:3000';

// Test users - use PRIMARY and TERTIARY from standardized test fixtures (Feature 026)
const USER_A_EMAIL = process.env.TEST_USER_PRIMARY_EMAIL || 'test@example.com';
const USER_A = {
  displayName: USER_A_EMAIL.split('@')[0],
  email: USER_A_EMAIL,
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

// Supabase admin client for database verification
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

const adminClient = getAdminClient();

test.describe('Encrypted Messaging Flow', () => {
  test.beforeEach(async () => {
    if (adminClient) {
      await ensureConnection(adminClient, USER_A.email, USER_B.email);
      await ensureConversation(adminClient, USER_A.email, USER_B.email);
    }
  });

  test('should send and receive encrypted message between two users', async ({
    browser,
  }) => {
    test.setTimeout(120000);
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

      // ===== STEP 2: User B signs in (in separate context) =====
      await loginAndVerify(pageB, {
        email: USER_B.email,
        password: USER_B.password,
      });

      // ===== STEP 3: User A navigates to conversations =====
      await pageA.goto(`${BASE_URL}/messages?tab=chats`);
      await dismissCookieBanner(pageA);
      await completeEncryptionSetup(pageA);
      await dismissReAuthModal(pageA);
      await expect(pageA).toHaveURL(/.*\/messages/);

      // ===== STEP 4: User A selects conversation with User B =====
      // Filter by User B's display name to ensure correct conversation
      const conversationItem = pageA
        .locator('[data-testid*="conversation"]')
        .filter({ hasText: USER_B.displayName });
      // Retry with reload if conversation list doesn't populate (read replica lag)
      try {
        await conversationItem.waitFor({ state: 'visible', timeout: 30000 });
      } catch {
        await pageA.reload();
        await dismissCookieBanner(pageA);
        await dismissReAuthModal(pageA);
        await conversationItem.waitFor({ state: 'visible', timeout: 30000 });
      }
      await conversationItem.click();

      // Wait for messages page to load
      await pageA.waitForURL(/.*\/messages\/?\?conversation=.*/);

      // ===== STEP 5: User A sends an encrypted message =====
      const testMessage = `Test encrypted message ${Date.now()}`;
      const messageInput = pageA.locator(
        'textarea[aria-label="Message input"]'
      );
      await expect(messageInput).toBeVisible();
      await messageInput.fill(testMessage);

      const sendButton = pageA.getByRole('button', { name: /send/i });
      await expect(sendButton).toBeEnabled();
      await sendButton.click();

      // Wait for sending state to complete
      await expect(sendButton).not.toContainText('Sending');

      // ===== STEP 6: Verify message appears in User A's view =====
      const messageA = pageA.getByText(testMessage);
      await expect(messageA).toBeVisible({ timeout: 15000 });

      // ===== STEP 7: User B navigates to conversations =====
      await pageB.goto(`${BASE_URL}/messages?tab=chats`);
      await dismissCookieBanner(pageB);
      await completeEncryptionSetup(pageB, USER_B.password);
      await dismissReAuthModal(pageB, USER_B.password);
      await expect(pageB).toHaveURL(/.*\/messages/);

      // ===== STEP 8: User B opens conversation with User A =====
      const conversationItemB = pageB
        .locator('[data-testid*="conversation"]')
        .filter({ hasText: USER_A.displayName });
      // Retry with reload if conversation list doesn't populate (read replica lag)
      try {
        await conversationItemB.waitFor({ state: 'visible', timeout: 30000 });
      } catch {
        await pageB.reload();
        await dismissCookieBanner(pageB);
        await dismissReAuthModal(pageB, USER_B.password);
        await conversationItemB.waitFor({ state: 'visible', timeout: 30000 });
      }
      await conversationItemB.click();

      await pageB.waitForURL(/.*\/messages\/?\?conversation=.*/);

      // ===== STEP 9: User B sees the decrypted message =====
      const messageB = pageB.getByText(testMessage);
      await expect(messageB).toBeVisible({ timeout: 30000 });

      // ===== STEP 10: Verify User B can reply =====
      const replyMessage = `Reply from User B ${Date.now()}`;
      const messageInputB = pageB.locator(
        'textarea[aria-label="Message input"]'
      );
      await messageInputB.fill(replyMessage);
      await pageB.getByRole('button', { name: /send/i }).click();

      // Verify reply appears in User B's view
      const replyB = pageB.getByText(replyMessage);
      await expect(replyB).toBeVisible({ timeout: 15000 });

      // ===== STEP 11: User A sees the reply =====
      await pageA.reload();
      await dismissCookieBanner(pageA);
      await dismissReAuthModal(pageA);
      const replyA = pageA.getByText(replyMessage);
      await expect(replyA).toBeVisible({ timeout: 15000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should verify zero-knowledge encryption in database', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const adminClient = getAdminClient();

    if (!adminClient) {
      test.skip(true, 'SUPABASE_SERVICE_ROLE_KEY not configured');
      return;
    }

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    try {
      // Sign in as User A
      await loginAndVerify(pageA, {
        email: USER_A.email,
        password: USER_A.password,
      });

      // Navigate to conversation
      await pageA.goto(`${BASE_URL}/messages?tab=chats`);
      await dismissCookieBanner(pageA);
      await completeEncryptionSetup(pageA);
      await dismissReAuthModal(pageA);
      const conversationItem = pageA
        .locator('[data-testid*="conversation"]')
        .filter({ hasText: USER_B.displayName });
      await conversationItem.waitFor({ state: 'visible', timeout: 30000 });
      await conversationItem.click();
      await pageA.waitForURL(/.*\/messages\/?\?conversation=.*/);

      // Send a test message with known plaintext
      const secretMessage = `Secret message for zero-knowledge test ${Date.now()}`;
      const messageInput = pageA.locator(
        'textarea[aria-label="Message input"]'
      );
      await messageInput.fill(secretMessage);
      await pageA.getByRole('button', { name: /send/i }).click();

      // Wait for message to appear
      await expect(pageA.getByText(secretMessage)).toBeVisible({
        timeout: 15000,
      });

      // Wait a moment for database write to complete
      await pageA.waitForTimeout(2000);

      // ===== VERIFY DATABASE ENCRYPTION =====
      // Query messages table directly as admin
      const { data: messages, error } = await adminClient
        .from('messages')
        .select('encrypted_content, initialization_vector')
        .order('created_at', { ascending: false })
        .limit(10);

      expect(error).toBeNull();
      expect(messages).toBeTruthy();
      expect(messages!.length).toBeGreaterThan(0);

      // Verify that the plaintext is NOT in the database
      const foundPlaintext = messages!.some((msg) => {
        const content = msg.encrypted_content;
        // Check if encrypted_content contains the secret message (it shouldn't)
        return content && content.includes(secretMessage);
      });

      expect(foundPlaintext).toBe(false); // Plaintext should NEVER be in database

      // Verify encrypted_content is base64 (ciphertext format)
      const hasEncryptedData = messages!.every((msg) => {
        const content = msg.encrypted_content;
        const iv = msg.initialization_vector;

        // Both should be base64 strings (not plaintext)
        const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(content);
        const hasIV = typeof iv === 'string' && iv.length > 0;

        return isBase64 && hasIV;
      });

      expect(hasEncryptedData).toBe(true); // All messages should be encrypted
    } finally {
      await contextA.close();
    }
  });

  test('should show delivery status indicators', async ({ browser }) => {
    test.setTimeout(120000);
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // User A signs in and navigates to conversation
      await loginAndVerify(pageA, {
        email: USER_A.email,
        password: USER_A.password,
      });

      await pageA.goto(`${BASE_URL}/messages?tab=chats`);
      await dismissCookieBanner(pageA);
      await completeEncryptionSetup(pageA);
      await dismissReAuthModal(pageA);
      const conversationItem = pageA
        .locator('[data-testid*="conversation"]')
        .filter({ hasText: USER_B.displayName });
      await conversationItem.waitFor({ state: 'visible', timeout: 30000 });
      await conversationItem.click();
      await pageA.waitForURL(/.*\/messages\/?\?conversation=.*/);

      // Send a message
      const testMessage = `Delivery status test ${Date.now()}`;
      const messageInput = pageA.locator(
        'textarea[aria-label="Message input"]'
      );
      await messageInput.fill(testMessage);
      await pageA.getByRole('button', { name: /send/i }).click();

      // Wait for message to appear
      await expect(pageA.getByText(testMessage)).toBeVisible({
        timeout: 15000,
      });

      // ===== VERIFY "SENT" STATUS (✓) =====
      // Message should show single checkmark initially
      const messageBubble = pageA
        .locator('[data-testid="message-bubble"]')
        .filter({ hasText: testMessage });
      await expect(messageBubble).toBeVisible();

      // Look for delivery status indicator
      const deliveryStatus = messageBubble.locator(
        '[data-testid="delivery-status"]'
      );
      await expect(deliveryStatus).toBeVisible();

      // Message shows "sent" initially (recipient hasn't loaded it yet)
      // ReadReceipt uses SVG icons, not text; check aria-label instead
      await expect(deliveryStatus).toHaveAttribute(
        'aria-label',
        /Message (sent|delivered|read)/
      );

      // ===== USER B READS THE MESSAGE =====
      await loginAndVerify(pageB, {
        email: USER_B.email,
        password: USER_B.password,
      });

      await pageB.goto(`${BASE_URL}/messages?tab=chats`);
      await dismissCookieBanner(pageB);
      await completeEncryptionSetup(pageB, USER_B.password);
      await dismissReAuthModal(pageB, USER_B.password);
      const conversationItemB = pageB
        .locator('[data-testid*="conversation"]')
        .filter({ hasText: USER_A.displayName });
      await conversationItemB.waitFor({ state: 'visible', timeout: 30000 });
      await conversationItemB.click();
      await pageB.waitForURL(/.*\/messages\/?\?conversation=.*/);

      // Verify User B sees the message
      await expect(pageB.getByText(testMessage)).toBeVisible({
        timeout: 30000,
      });

      // ===== VERIFY "READ" STATUS (✓✓ colored) =====
      // Reload User A's page to see updated read status
      await pageA.reload();
      await dismissCookieBanner(pageA);
      await completeEncryptionSetup(pageA);
      await dismissReAuthModal(pageA);
      await expect(pageA.getByText(testMessage)).toBeVisible({
        timeout: 30000,
      });

      const updatedMessageBubble = pageA
        .locator('[data-testid="message-bubble"]')
        .filter({ hasText: testMessage });
      const updatedStatus = updatedMessageBubble.locator(
        '[data-testid="delivery-status"]'
      );

      // Should still show delivered/read status (SVG icons, check aria-label)
      await expect(updatedStatus).toHaveAttribute(
        'aria-label',
        /Message (delivered|read)/
      );
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should load message history with pagination', async ({ page }) => {
    test.setTimeout(90000);
    await loginAndVerify(page, {
      email: USER_A.email,
      password: USER_A.password,
    });

    await page.goto(`${BASE_URL}/messages?tab=chats`);
    await dismissCookieBanner(page);
    await completeEncryptionSetup(page);
    await dismissReAuthModal(page);
    const conversationItem = page
      .locator('[data-testid*="conversation"]')
      .filter({ hasText: USER_B.displayName });
    // Retry with reload if conversation list doesn't populate (read replica lag)
    try {
      await conversationItem.waitFor({ state: 'visible', timeout: 30000 });
    } catch {
      await page.reload();
      await dismissCookieBanner(page);
      await dismissReAuthModal(page);
      await conversationItem.waitFor({ state: 'visible', timeout: 30000 });
    }
    await conversationItem.click();
    await page.waitForURL(/.*\/messages\/?\?conversation=.*/);

    // ===== SEND MULTIPLE MESSAGES =====
    const messageCount = 55; // More than default page size (50)
    const messagesToSend = 10; // Send 10 new messages for this test

    for (let i = 0; i < messagesToSend; i++) {
      const messageInput = page.locator('textarea[aria-label="Message input"]');
      // Wait for textarea to be enabled (sending cycle: setSending(true) → network → setSending(false))
      await expect(messageInput).toBeEnabled({ timeout: 10000 });
      await messageInput.fill(`Pagination test message ${i + 1}`);
      await page.getByRole('button', { name: /send/i }).click();
    }

    // Wait for last message to appear
    await expect(
      page.getByText(`Pagination test message ${messagesToSend}`)
    ).toBeVisible({ timeout: 5000 });

    // ===== VERIFY PAGINATION =====
    // Count visible messages (should be limited to page size)
    const messageBubbles = page.locator('[data-testid="message-bubble"]');
    const visibleCount = await messageBubbles.count();

    // Should show up to 50 messages initially (default page size)
    expect(visibleCount).toBeGreaterThan(0);
    expect(visibleCount).toBeLessThanOrEqual(50);

    // ===== TEST "LOAD MORE" FUNCTIONALITY =====
    // Scroll to top of message thread
    await page
      .locator('[data-testid="message-thread"]')
      .first()
      .evaluate((el) => {
        el.scrollTop = 0;
      });

    // Look for "Load More" button
    const loadMoreButton = page.getByRole('button', {
      name: /load more|older messages/i,
    });

    if (await loadMoreButton.isVisible()) {
      const countBefore = await messageBubbles.count();

      await loadMoreButton.click();

      // Wait for more messages to load
      await page.waitForTimeout(2000);

      const countAfter = await messageBubbles.count();

      // Should have loaded more messages
      expect(countAfter).toBeGreaterThan(countBefore);
    }
  });
});

test.describe('Encryption Key Security', () => {
  test.beforeEach(async () => {
    if (adminClient) {
      await ensureConnection(adminClient, USER_A.email, USER_B.email);
      await ensureConversation(adminClient, USER_A.email, USER_B.email);
    }
  });

  test('should never send private keys to server', async ({
    page,
    context,
  }) => {
    test.setTimeout(90000);
    // Monitor network requests to verify no private keys are sent
    const networkRequests: any[] = [];

    page.on('request', (request) => {
      const postData = request.postData();
      if (postData) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          body: postData,
        });
      }
    });

    // Sign in and send a message
    await loginAndVerify(page, {
      email: USER_A.email,
      password: USER_A.password,
    });

    await page.goto(`${BASE_URL}/messages?tab=chats`);
    await dismissCookieBanner(page);
    await completeEncryptionSetup(page);
    await dismissReAuthModal(page);
    const conversationItem = page
      .locator('[data-testid*="conversation"]')
      .filter({ hasText: USER_B.displayName });
    // Retry with reload if conversation list doesn't populate (read replica lag)
    try {
      await conversationItem.waitFor({ state: 'visible', timeout: 30000 });
    } catch {
      await page.reload();
      await dismissCookieBanner(page);
      await dismissReAuthModal(page);
      await conversationItem.waitFor({ state: 'visible', timeout: 30000 });
    }
    await conversationItem.click();
    await page.waitForURL(/.*\/messages\/?\?conversation=.*/);

    const messageInput = page.locator('textarea[aria-label="Message input"]');
    await messageInput.fill('Key security test message');
    await page.getByRole('button', { name: /send/i }).click();

    await expect(page.getByText('Key security test message')).toBeVisible();

    // ===== VERIFY NO PRIVATE KEYS IN NETWORK REQUESTS =====
    const foundPrivateKey = networkRequests.some((req) => {
      const body = req.body.toLowerCase();
      // Check for common private key indicators
      return (
        body.includes('"d":') || // JWK private key component
        body.includes('"privatekey"') ||
        body.includes('private_key') ||
        body.includes('privatekey')
      );
    });

    expect(foundPrivateKey).toBe(false); // Private keys should NEVER be sent to server
  });
});

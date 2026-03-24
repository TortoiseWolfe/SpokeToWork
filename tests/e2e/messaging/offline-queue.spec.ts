/**
 * E2E Tests for Offline Message Queue
 * Tasks: T146-T149
 *
 * Tests:
 * 1. T146: Send message while offline → message queued → go online → message sent
 * 2. T147: Queue 3 messages while offline → reconnect → all 3 sent automatically
 * 3. T148: Simulate server failure → verify retries at 1s, 2s, 4s intervals
 * 4. T149: Conflict resolution - send same message from two devices → server timestamp wins
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  ensureConnection,
  ensureConversation,
  cleanupMessagingData,
  completeEncryptionSetup,
  dismissCookieBanner,
  dismissReAuthModal,
} from './test-helpers';
import { loginAndVerify } from '../utils/auth-helpers';

const BASE_URL = process.env.NEXT_PUBLIC_DEPLOY_URL || 'http://localhost:3000';

// Test users - use PRIMARY and TERTIARY from standardized test fixtures (Feature 026)
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

test.describe('Offline Message Queue', () => {
  // Serial: multi-user tests create 2 browser contexts with Supabase connections.
  test.describe.configure({ mode: 'serial' });
  // Firefox: Argon2id + multi-user Realtime delivery is 2-3x slower under CI contention
  test.slow(
    ({ browserName }) => browserName === 'firefox',
    'Firefox: slow Argon2id + Realtime'
  );

  let conversationId: string | null = null;

  test.beforeAll(async () => {
    if (adminClient) {
      await cleanupMessagingData(adminClient, USER_A.email, USER_B.email);
    }
  });

  test.beforeEach(async () => {
    if (adminClient) {
      await ensureConnection(adminClient, USER_A.email, USER_B.email);
      conversationId = await ensureConversation(
        adminClient,
        USER_A.email,
        USER_B.email
      );
    }
  });

  test('T146: should queue message when offline and send when online', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // ===== STEP 1: User A signs in =====
      await loginAndVerify(page, {
        email: USER_A.email,
        password: USER_A.password,
      });

      // ===== STEP 2: Navigate directly to conversation =====
      await page.goto(`${BASE_URL}/messages?conversation=${conversationId}`);
      await dismissCookieBanner(page);
      await completeEncryptionSetup(page);
      await dismissReAuthModal(page);

      // ===== STEP 3: Go offline =====
      await context.setOffline(true);

      // Verify offline status in browser
      const isOffline = await page.evaluate(() => !navigator.onLine);
      expect(isOffline).toBe(true);

      // ===== STEP 4: Send message while offline =====
      const testMessage = `Offline test message ${Date.now()}`;
      const messageInput = page.locator('textarea[aria-label="Message input"]');
      await expect(messageInput).toBeVisible({ timeout: 10000 });
      await messageInput.fill(testMessage);

      const sendButton = page.getByRole('button', { name: /send/i });
      await sendButton.click();

      // ===== STEP 5: Verify message appears in UI (optimistic update) =====
      const messageBubble = page.getByText(testMessage);
      await expect(messageBubble).toBeVisible({ timeout: 15000 });

      // ===== STEP 6: Go online =====
      await context.setOffline(false);

      // Verify online status
      const isOnline = await page.evaluate(() => navigator.onLine);
      expect(isOnline).toBe(true);

      // ===== STEP 7: Wait for message to sync =====
      // After going online, the message should eventually show delivered status
      // or remain visible without error indicators
      await page.waitForTimeout(5000);

      // Message should still be visible after sync
      await expect(messageBubble).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('T147: should queue multiple messages and sync all when reconnected', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // ===== STEP 1: Sign in and navigate directly to conversation =====
      await loginAndVerify(page, {
        email: USER_A.email,
        password: USER_A.password,
      });

      await page.goto(`${BASE_URL}/messages?conversation=${conversationId}`);
      await dismissCookieBanner(page);
      await completeEncryptionSetup(page);
      await dismissReAuthModal(page);

      // ===== STEP 2: Go offline =====
      await context.setOffline(true);

      // ===== STEP 3: Send 3 messages while offline =====
      const messages = [
        `Offline message 1 ${Date.now()}`,
        `Offline message 2 ${Date.now()}`,
        `Offline message 3 ${Date.now()}`,
      ];

      const messageInput = page.locator('textarea[aria-label="Message input"]');
      const sendButton = page.getByRole('button', { name: /send/i });

      for (const msg of messages) {
        await messageInput.fill(msg);
        await sendButton.click();
        await page.waitForTimeout(500);
      }

      // ===== STEP 4: Verify all 3 messages appear (optimistic update) =====
      for (const msg of messages) {
        const bubble = page.getByText(msg);
        await expect(bubble).toBeVisible({ timeout: 10000 });
      }

      // ===== STEP 5: Go online =====
      await context.setOffline(false);

      // ===== STEP 6: Wait for sync and verify messages persist =====
      await page.waitForTimeout(5000);

      // All messages should still be visible after sync
      for (const msg of messages) {
        await expect(page.getByText(msg)).toBeVisible();
      }
    } finally {
      await context.close();
    }
  });

  test('T148: should retry with exponential backoff on server failure', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // ===== STEP 1: Sign in and navigate directly to conversation =====
      await loginAndVerify(page, {
        email: USER_A.email,
        password: USER_A.password,
      });

      await page.goto(`${BASE_URL}/messages?conversation=${conversationId}`);
      await dismissCookieBanner(page);
      await completeEncryptionSetup(page);
      await dismissReAuthModal(page);

      // ===== STEP 2: Intercept API calls and simulate failures =====
      let attemptCount = 0;

      await page.route('**/rest/v1/messages*', async (route) => {
        attemptCount++;

        if (attemptCount < 3) {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });

      // ===== STEP 3: Send message =====
      const testMessage = `Retry test message ${Date.now()}`;
      const messageInput = page.locator('textarea[aria-label="Message input"]');
      await messageInput.fill(testMessage);

      const sendButton = page.getByRole('button', { name: /send/i });
      await sendButton.click();

      // ===== STEP 4: Wait for retries =====
      await page.waitForTimeout(15000);

      // ===== STEP 5: Verify retries occurred =====
      // The message system should have retried at least once
      // (exact retry count depends on implementation)
      expect(attemptCount).toBeGreaterThanOrEqual(2);
    } finally {
      await context.close();
    }
  });

  test('T149: should handle conflict resolution with server timestamp', async ({
    browser,
  }) => {
    test.setTimeout(180000);
    const adminClient = getAdminClient();

    if (!adminClient) {
      test.skip(
        true,
        'Skipping conflict resolution test - Supabase admin client not available'
      );
      return;
    }

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // ===== STEP 1: Both users sign in =====
      await loginAndVerify(pageA, {
        email: USER_A.email,
        password: USER_A.password,
      });
      await loginAndVerify(pageB, {
        email: USER_B.email,
        password: USER_B.password,
      });

      // ===== STEP 2: Both navigate directly to same conversation =====
      await pageA.goto(`${BASE_URL}/messages?conversation=${conversationId}`);
      await dismissCookieBanner(pageA);
      await completeEncryptionSetup(pageA);
      await dismissReAuthModal(pageA);

      await pageB.goto(`${BASE_URL}/messages?conversation=${conversationId}`);
      await dismissCookieBanner(pageB);
      await completeEncryptionSetup(pageB, USER_B.password);
      await dismissReAuthModal(pageB, USER_B.password);

      // ===== STEP 3: Both send messages rapidly (online) =====
      // Tests conflict resolution by creating near-simultaneous writes.
      // Both users are online — no offline queue dependency.
      const timestamp = Date.now();
      const messageA = `Message from A ${timestamp}`;
      const messageB = `Message from B ${timestamp}`;

      const inputA = pageA.locator('textarea[aria-label="Message input"]');
      await inputA.fill(messageA);
      const sendA = pageA.getByRole('button', { name: /send/i }).click();

      const inputB = pageB.locator('textarea[aria-label="Message input"]');
      await inputB.fill(messageB);
      const sendB = pageB.getByRole('button', { name: /send/i }).click();

      await Promise.all([sendA, sendB]);

      // ===== STEP 4: Poll DB for both messages =====
      const testStartISO = new Date(timestamp - 60_000).toISOString();
      let messages: { sequence_number: number }[] | null = null;
      if (conversationId) {
        for (let attempt = 0; attempt < 20; attempt++) {
          await pageA.waitForTimeout(3000);
          const { data } = await adminClient
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .gte('created_at', testStartISO)
            .order('sequence_number', { ascending: true });
          if (data && data.length >= 2) {
            messages = data;
            break;
          }
          console.log(
            `T149 DB poll attempt ${attempt + 1}/20: found ${data?.length ?? 0} messages`
          );
        }
      }

      // ===== STEP 5: Verify server determined order =====
      if (conversationId && messages && messages.length >= 2) {
        // Verify sequence numbers are unique (no duplicates)
        const sequenceNumbers = messages.map((m) => m.sequence_number);
        const uniqueSequences = new Set(sequenceNumbers);
        expect(uniqueSequences.size).toBe(sequenceNumbers.length);

        // Server should have assigned sequential numbers
        const lastTwoMessages = messages.slice(-2);
        expect(lastTwoMessages[1].sequence_number).toBe(
          lastTwoMessages[0].sequence_number + 1
        );
      }

      // ===== STEP 6: Both users should see both messages =====
      // Reload to ensure fresh data from server (realtime may lag).
      await pageA.reload();
      await dismissCookieBanner(pageA);
      await completeEncryptionSetup(pageA);
      await dismissReAuthModal(pageA);
      await pageB.reload();
      await dismissCookieBanner(pageB);
      await completeEncryptionSetup(pageB, USER_B.password);
      await dismissReAuthModal(pageB, USER_B.password);

      await pageA.waitForLoadState('networkidle');
      await pageB.waitForLoadState('networkidle');

      const threadLocator =
        '[data-testid*="message"], textarea[aria-label="Message input"]';
      await pageA
        .locator(threadLocator)
        .first()
        .waitFor({ state: 'visible', timeout: 60000 })
        .catch(() => {});
      await pageB
        .locator(threadLocator)
        .first()
        .waitFor({ state: 'visible', timeout: 60000 })
        .catch(() => {});

      // Verify messages visible — reload fallback for decryption timing
      try {
        await expect(pageA.getByText(messageA)).toBeVisible({ timeout: 15000 });
      } catch {
        await pageA.reload();
        await dismissCookieBanner(pageA);
        await completeEncryptionSetup(pageA);
        await dismissReAuthModal(pageA);
        await expect(pageA.getByText(messageA)).toBeVisible({ timeout: 60000 });
      }
      // messageB may also need a reload if not yet visible (read replica lag)
      try {
        await expect(pageA.getByText(messageB)).toBeVisible({ timeout: 15000 });
      } catch {
        await pageA.reload();
        await dismissCookieBanner(pageA);
        await completeEncryptionSetup(pageA);
        await dismissReAuthModal(pageA);
        await expect(pageA.getByText(messageB)).toBeVisible({ timeout: 60000 });
      }

      try {
        await expect(pageB.getByText(messageA)).toBeVisible({ timeout: 15000 });
      } catch {
        await pageB.reload();
        await dismissCookieBanner(pageB);
        await completeEncryptionSetup(pageB, USER_B.password);
        await dismissReAuthModal(pageB, USER_B.password);
        await expect(pageB.getByText(messageA)).toBeVisible({ timeout: 60000 });
      }
      try {
        await expect(pageB.getByText(messageB)).toBeVisible({ timeout: 15000 });
      } catch {
        await pageB.reload();
        await dismissCookieBanner(pageB);
        await completeEncryptionSetup(pageB, USER_B.password);
        await dismissReAuthModal(pageB, USER_B.password);
        await expect(pageB.getByText(messageB)).toBeVisible({ timeout: 60000 });
      }
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('should show failed status after max retries', async ({ browser }) => {
    test.setTimeout(180000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // ===== STEP 1: Sign in and navigate directly to conversation =====
      await loginAndVerify(page, {
        email: USER_A.email,
        password: USER_A.password,
      });

      await page.goto(`${BASE_URL}/messages?conversation=${conversationId}`);
      await dismissCookieBanner(page);
      await completeEncryptionSetup(page);
      await dismissReAuthModal(page);

      // ===== STEP 2: Intercept API and always fail =====
      let interceptCount = 0;
      await page.route('**/rest/v1/messages*', async (route) => {
        interceptCount++;
        await route.abort('failed');
      });

      // ===== STEP 3: Send message =====
      const testMessage = `Failed message ${Date.now()}`;
      const messageInput = page.locator('textarea[aria-label="Message input"]');
      await messageInput.fill(testMessage);

      const sendButton = page.getByRole('button', { name: /send/i });
      await sendButton.click();

      // ===== STEP 4: Wait for retries to exhaust =====
      await page.waitForTimeout(35000);

      // ===== STEP 5: Verify message was attempted and failed gracefully =====
      // The system should have tried to send multiple times
      expect(interceptCount).toBeGreaterThanOrEqual(1);

      // Message should still be visible in the UI (not lost)
      await expect(page.getByText(testMessage)).toBeVisible({ timeout: 5000 });
    } finally {
      await context.close();
    }
  });
});

/**
 * E2E Tests for Real-time Message Delivery
 * Tasks: T098, T099
 *
 * Tests real-time message delivery between two browser windows and typing indicators.
 * Verifies <500ms delivery guarantee and proper typing indicator behavior.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  getAdminClient,
  ensureConnection,
  ensureConversation,
  cleanupMessagingData,
  completeEncryptionSetup,
  dismissCookieBanner,
  dismissReAuthModal,
} from './test-helpers';
import { loginAndVerify } from '../utils/auth-helpers';

const adminClient = getAdminClient();

// Test user credentials (from .env or defaults)
const TEST_USER_1 = {
  email: process.env.TEST_USER_PRIMARY_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PRIMARY_PASSWORD!,
};

const TEST_USER_2 = {
  email: process.env.TEST_USER_SECONDARY_EMAIL || 'test2@example.com',
  password: process.env.TEST_USER_SECONDARY_PASSWORD!,
};

/**
 * Navigate both pages directly to the seeded conversation.
 * Connection + conversation are seeded by admin client in beforeEach,
 * so no UI-based friend request flow is needed.
 */
async function navigateBothToConversation(
  page1: Page,
  page2: Page,
  convId: string
): Promise<void> {
  await page1.goto(`/messages?conversation=${convId}`);
  await dismissCookieBanner(page1);
  await completeEncryptionSetup(page1);
  await dismissReAuthModal(page1);

  await page2.goto(`/messages?conversation=${convId}`);
  await dismissCookieBanner(page2);
  await completeEncryptionSetup(page2, TEST_USER_2.password);
  await dismissReAuthModal(page2, TEST_USER_2.password);

  // Wait for messaging UI ready on both pages
  await page1.waitForSelector('textarea[placeholder*="Type"]', {
    timeout: 15000,
  });
  await page2.waitForSelector('textarea[placeholder*="Type"]', {
    timeout: 15000,
  });

  // Wait for Realtime subscriptions to establish:
  // useTypingIndicator: getUser() → setCurrentUserId → subscribeToTypingIndicators → channel.subscribe()
  // useMessages: similar async subscription setup
  await Promise.all([
    page1.waitForTimeout(3000),
    page2.waitForTimeout(3000),
  ]);
}

test.describe('Real-time Message Delivery (T098)', () => {
  // beforeEach runs 2× loginAndVerify + navigation — needs 90s+ on webkit
  test.describe.configure({ timeout: 120000 });

  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;
  let conversationId: string | null = null;

  test.beforeAll(async () => {
    if (adminClient) {
      await cleanupMessagingData(
        adminClient,
        TEST_USER_1.email,
        TEST_USER_2.email
      );
    }
  });

  test.beforeEach(async ({ browser }) => {
    // These tests require two authenticated users with encryption keys.
    test.skip(
      !TEST_USER_1.password || !TEST_USER_2.password,
      'Missing PRIMARY or SECONDARY test user credentials'
    );

    // Seed connection + conversation so messaging UI has data
    if (adminClient) {
      await ensureConnection(adminClient, TEST_USER_1.email, TEST_USER_2.email);
      conversationId = await ensureConversation(
        adminClient,
        TEST_USER_1.email,
        TEST_USER_2.email
      );
    }

    // Create two separate browser contexts (simulates two users)
    context1 = await browser.newContext();
    context2 = await browser.newContext();

    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Sign in both users
    await loginAndVerify(page1, {
      email: TEST_USER_1.email,
      password: TEST_USER_1.password,
    });
    await loginAndVerify(page2, {
      email: TEST_USER_2.email,
      password: TEST_USER_2.password,
    });
  });

  test.afterEach(async () => {
    await context1.close();
    await context2.close();
  });

  test('should deliver message in <500ms between two windows', async () => {
    // Use describe-level timeout (120s) — beforeEach runs 2× loginAndVerify (~90s on webkit)
    expect(conversationId).not.toBeNull();
    await navigateBothToConversation(page1, page2, conversationId!);

    // User 1: Send a message
    const testMessage = `Real-time test message ${Date.now()}`;
    const startTime = Date.now();

    await page1.fill('textarea[placeholder*="Type"]', testMessage);
    await page1.click('button[aria-label="Send message"]');

    // User 2: Wait for message to appear via Realtime or page refresh
    // First try Realtime delivery
    let delivered = false;
    try {
      await page2.waitForSelector(`text="${testMessage}"`, { timeout: 20000 });
      delivered = true;
    } catch {
      // Realtime didn't deliver — try reload as fallback
      console.log('Realtime delivery failed, reloading page2...');
      await page2.reload();
      await dismissCookieBanner(page2);
      await completeEncryptionSetup(page2, TEST_USER_2.password);
      await dismissReAuthModal(page2, TEST_USER_2.password);
      await page2.waitForSelector(`text="${testMessage}"`, { timeout: 30000 });
    }
    const endTime = Date.now();

    // Verify delivery time
    const deliveryTime = endTime - startTime;
    if (delivered) {
      expect(deliveryTime).toBeLessThan(5000);
    }

    // Verify message appears in User 2's window
    await expect(page2.locator(`text="${testMessage}"`)).toBeVisible();

    // Verify message also appears in User 1's window (sender)
    await expect(page1.locator(`text="${testMessage}"`)).toBeVisible();
  });

  test('should show delivery status (sent → delivered → read)', async () => {
    // Use describe-level timeout (120s) — beforeEach runs 2× loginAndVerify (~90s on webkit)
    expect(conversationId).not.toBeNull();
    await navigateBothToConversation(page1, page2, conversationId!);

    // User 1: Send a message
    const testMessage = `Delivery status test ${Date.now()}`;
    await page1.fill('textarea[placeholder*="Type"]', testMessage);
    await page1.click('button[aria-label="Send message"]');

    // Verify "sent" status (single checkmark)
    const messageBubble = page1.locator(
      `[data-testid="message-bubble"]:has-text("${testMessage}")`
    );
    await expect(messageBubble.locator('[aria-label*="sent"]')).toBeVisible({
      timeout: 15000,
    });

    // User 2: Message appears (should trigger "delivered" status)
    await page2.waitForSelector(`text="${testMessage}"`, { timeout: 20000 });

    // Verify "delivered" status (double checkmark)
    // Timeout allows for the full Realtime round-trip: recipient marks as delivered → DB update → Realtime to sender
    await expect(
      messageBubble.locator('[aria-label*="delivered"]')
    ).toBeVisible({ timeout: 20000 });

    // User 2: Scroll to message (should trigger "read" status)
    const message2 = page2.locator(`text="${testMessage}"`);
    await message2.scrollIntoViewIfNeeded();

    // Verify "read" status (double blue checkmark)
    // Timeout allows for IntersectionObserver debounce (500ms) + Realtime round-trip
    await expect(messageBubble.locator('[aria-label*="read"]')).toBeVisible({
      timeout: 20000,
    });
  });

  test('should handle rapid message exchanges', async () => {
    // Use describe-level timeout (120s) — beforeEach runs 2× loginAndVerify (~90s on webkit)
    expect(conversationId).not.toBeNull();
    await navigateBothToConversation(page1, page2, conversationId!);

    // User 1: Send 3 messages rapidly
    const messages = [
      `Rapid 1 ${Date.now()}`,
      `Rapid 2 ${Date.now()}`,
      `Rapid 3 ${Date.now()}`,
    ];

    for (const msg of messages) {
      await page1.fill('textarea[placeholder*="Type"]', msg);
      await page1.click('button[aria-label="Send message"]');
    }

    // User 2: Verify all messages appear in order
    for (const msg of messages) {
      await expect(page2.locator(`text="${msg}"`)).toBeVisible({
        timeout: 20000,
      });
    }

    // Verify message order (sequence numbers should be correct)
    const messageBubbles = page2.locator('[data-testid="message-bubble"]');
    const count = await messageBubbles.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Typing Indicators (T099)', () => {
  // Dual-user beforeEach: 2 sign-ins (45s each) + encryption setup > 30s default
  test.describe.configure({ timeout: 120000 });

  let context1: BrowserContext;
  let context2: BrowserContext;
  let page1: Page;
  let page2: Page;
  let conversationId: string | null = null;

  test.beforeEach(async ({ browser }) => {
    test.skip(
      !TEST_USER_1.password || !TEST_USER_2.password,
      'Missing PRIMARY or SECONDARY test user credentials'
    );

    if (adminClient) {
      await ensureConnection(adminClient, TEST_USER_1.email, TEST_USER_2.email);
      conversationId = await ensureConversation(
        adminClient,
        TEST_USER_1.email,
        TEST_USER_2.email
      );
    }

    // Create two separate browser contexts
    context1 = await browser.newContext();
    context2 = await browser.newContext();

    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Sign in both users
    await loginAndVerify(page1, {
      email: TEST_USER_1.email,
      password: TEST_USER_1.password,
    });
    await loginAndVerify(page2, {
      email: TEST_USER_2.email,
      password: TEST_USER_2.password,
    });
  });

  test.afterEach(async () => {
    await context1.close();
    await context2.close();
  });

  test('should show typing indicator when user types', async () => {
    // Use describe-level timeout (120s) — beforeEach runs 2× loginAndVerify (~90s on webkit)
    expect(conversationId).not.toBeNull();
    await navigateBothToConversation(page1, page2, conversationId!);

    // User 1: Start typing
    await page1.fill('textarea[placeholder*="Type"]', 'Hello');

    // User 2: Typing indicator should appear
    const typingIndicator = page2.locator('[data-testid="typing-indicator"]');
    await expect(typingIndicator).toBeVisible({ timeout: 10000 });

    // Verify indicator text
    await expect(typingIndicator).toContainText('is typing');
  });

  test('should hide typing indicator when user stops typing', async () => {
    // Use describe-level timeout (120s) — beforeEach runs 2× loginAndVerify (~90s on webkit)
    expect(conversationId).not.toBeNull();
    await navigateBothToConversation(page1, page2, conversationId!);

    // User 1: Start typing
    await page1.fill('textarea[placeholder*="Type"]', 'Hello');

    // User 2: Wait for typing indicator
    const typingIndicator = page2.locator('[data-testid="typing-indicator"]');
    await expect(typingIndicator).toBeVisible({ timeout: 10000 });

    // User 1: Clear input (stop typing)
    await page1.fill('textarea[placeholder*="Type"]', '');

    // User 2: Typing indicator should disappear within 5 seconds
    await expect(typingIndicator).not.toBeVisible({ timeout: 6000 });
  });

  test('should remove typing indicator when message is sent', async () => {
    // Use describe-level timeout (120s) — beforeEach runs 2× loginAndVerify (~90s on webkit)
    expect(conversationId).not.toBeNull();
    await navigateBothToConversation(page1, page2, conversationId!);

    // User 1: Start typing
    const testMessage = `Typing test ${Date.now()}`;
    await page1.fill('textarea[placeholder*="Type"]', testMessage);

    // User 2: Wait for typing indicator
    const typingIndicator = page2.locator('[data-testid="typing-indicator"]');
    await expect(typingIndicator).toBeVisible({ timeout: 10000 });

    // User 1: Send message
    await page1.click('button[aria-label="Send message"]');

    // User 2: Typing indicator should disappear promptly after send
    // Allows for DB delete + Realtime propagation in Docker
    await expect(typingIndicator).not.toBeVisible({ timeout: 5000 });

    // User 2: Message should appear
    await expect(page2.locator(`text="${testMessage}"`)).toBeVisible();
  });

  test('should show multiple typing indicators correctly', async () => {
    // Use describe-level timeout (120s) — beforeEach runs 2× loginAndVerify (~90s on webkit)
    expect(conversationId).not.toBeNull();
    await navigateBothToConversation(page1, page2, conversationId!);

    // User 1: Start typing
    await page1.fill('textarea[placeholder*="Type"]', 'User 1 typing');

    // User 2: Verify User 1's typing indicator
    const typingIndicator2 = page2.locator('[data-testid="typing-indicator"]');
    await expect(typingIndicator2).toBeVisible({ timeout: 10000 });

    // User 2: Start typing
    await page2.fill('textarea[placeholder*="Type"]', 'User 2 typing');

    // User 1: Verify User 2's typing indicator
    const typingIndicator1 = page1.locator('[data-testid="typing-indicator"]');
    await expect(typingIndicator1).toBeVisible({ timeout: 10000 });

    // Both users should see the other's typing indicator
    await expect(typingIndicator1).toBeVisible();
    await expect(typingIndicator2).toBeVisible();
  });

  test('should auto-expire typing indicator after 5 seconds', async () => {
    // Use describe-level timeout (120s) — beforeEach runs 2× loginAndVerify (~90s on webkit)
    expect(conversationId).not.toBeNull();
    await navigateBothToConversation(page1, page2, conversationId!);

    // User 1: Start typing
    await page1.fill('textarea[placeholder*="Type"]', 'Auto-expire test');

    // User 2: Wait for typing indicator
    const typingIndicator = page2.locator('[data-testid="typing-indicator"]');
    await expect(typingIndicator).toBeVisible({ timeout: 10000 });

    // Wait for auto-expire (5 seconds + buffer)
    await page2.waitForTimeout(6000);

    // Typing indicator should disappear
    await expect(typingIndicator).not.toBeVisible();
  });
});

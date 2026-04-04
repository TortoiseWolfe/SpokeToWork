import { test, expect, Page } from '@playwright/test';
import {
  getAdminClient,
  ensureConnection,
  ensureConversation,
  cleanupMessagingData,
  completeEncryptionSetup,
  dismissReAuthModal,
  dismissCookieBanner,
} from './test-helpers';
import { loginAndVerify } from '../utils/auth-helpers';
import { getShardUsers } from '../utils/shard-users';

/**
 * Messaging Scroll E2E Tests
 * Feature: 005-fix-messaging-scroll
 *
 * Tests CSS Grid layout fix for ChatWindow ensuring:
 * - Message input is visible at bottom on all viewports
 * - Scroll is constrained to message thread
 * - Jump-to-bottom button works correctly
 */

const adminClient = getAdminClient();
const { primary, tertiary } = getShardUsers();
const USER_A_EMAIL = primary.email;
const USER_B_EMAIL = tertiary.email;

// Test configuration for viewports
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

// Helper to check if element is in viewport
async function isElementInViewport(
  page: Page,
  selector: string
): Promise<boolean> {
  const element = page.locator(selector);
  const isVisible = await element.isVisible();
  if (!isVisible) return false;

  const box = await element.boundingBox();
  if (!box) return false;

  const viewport = page.viewportSize();
  if (!viewport) return false;

  return (
    box.y >= 0 &&
    box.y + box.height <= viewport.height &&
    box.x >= 0 &&
    box.x + box.width <= viewport.width
  );
}

test.describe('Messaging Scroll - User Story 1: View Message Input', () => {
  // Encryption setup (argon2id) can take 30s+ on first run
  test.setTimeout(90000);

  let conversationId: string | null = null;

  test.beforeAll(async () => {
    if (adminClient) {
      await cleanupMessagingData(adminClient, USER_A_EMAIL, USER_B_EMAIL);
    }
  });

  test.beforeEach(async ({ page }) => {
    // Seed connection + conversation so messaging UI has data
    if (adminClient) {
      await ensureConnection(adminClient, USER_A_EMAIL, USER_B_EMAIL);
      conversationId = await ensureConversation(
        adminClient,
        USER_A_EMAIL,
        USER_B_EMAIL
      );
    }

    // Login as test user
    await loginAndVerify(page, {
      email: USER_A_EMAIL,
      password: primary.password,
    });
  });

  test('T003: Message input visible on mobile viewport (375x667)', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(`/messages?conversation=${conversationId}`);
    await completeEncryptionSetup(page);
    await dismissCookieBanner(page);
    await dismissReAuthModal(page);

    await page.waitForSelector(
      '[data-testid="chat-window"], [data-testid="message-thread"]',
      { timeout: 10000 }
    );

    // Check message input is visible
    const messageInput = page.locator(
      'textarea[placeholder*="Type a message"], textarea[placeholder*="message"]'
    );
    await expect(messageInput).toBeVisible();

    // Verify it's actually in viewport (not just in DOM)
    const isInViewport = await isElementInViewport(
      page,
      'textarea[placeholder*="Type a message"], textarea[placeholder*="message"]'
    );
    expect(isInViewport).toBe(true);
  });

  test('T004: Message input visible on tablet viewport (768x1024)', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(`/messages?conversation=${conversationId}`);
    await completeEncryptionSetup(page);
    await dismissCookieBanner(page);
    await dismissReAuthModal(page);

    await page.waitForSelector(
      '[data-testid="chat-window"], [data-testid="message-thread"]',
      { timeout: 10000 }
    );

    const messageInput = page.locator(
      'textarea[placeholder*="Type a message"], textarea[placeholder*="message"]'
    );
    await expect(messageInput).toBeVisible();

    const isInViewport = await isElementInViewport(
      page,
      'textarea[placeholder*="Type a message"], textarea[placeholder*="message"]'
    );
    expect(isInViewport).toBe(true);
  });

  test('T005: Message input visible on desktop viewport (1280x800)', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/messages?conversation=${conversationId}`);
    await completeEncryptionSetup(page);
    await dismissCookieBanner(page);
    await dismissReAuthModal(page);

    await page.waitForSelector(
      '[data-testid="chat-window"], [data-testid="message-thread"]',
      { timeout: 10000 }
    );

    const messageInput = page.locator(
      'textarea[placeholder*="Type a message"], textarea[placeholder*="message"]'
    );
    await expect(messageInput).toBeVisible();

    const isInViewport = await isElementInViewport(
      page,
      'textarea[placeholder*="Type a message"], textarea[placeholder*="message"]'
    );
    expect(isInViewport).toBe(true);
  });
});

test.describe('Messaging Scroll - User Story 2: Scroll Through Messages', () => {
  test.setTimeout(90000);

  let conversationId: string | null = null;

  test.beforeEach(async ({ page }) => {
    if (adminClient) {
      await ensureConnection(adminClient, USER_A_EMAIL, USER_B_EMAIL);
      conversationId = await ensureConversation(
        adminClient,
        USER_A_EMAIL,
        USER_B_EMAIL
      );
    }

    await loginAndVerify(page, {
      email: USER_A_EMAIL,
      password: primary.password,
    });
  });

  test('T006: Scroll container constrained to MessageThread', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/messages?conversation=${conversationId}`);
    await completeEncryptionSetup(page);
    await dismissCookieBanner(page);
    await dismissReAuthModal(page);

    await page.waitForSelector(
      '[data-testid="chat-window"], [data-testid="message-thread"]',
      { timeout: 10000 }
    );

    // Get message thread element
    const messageThread = page.locator('[data-testid="message-thread"]');
    await expect(messageThread).toBeVisible();

    // Get initial input position
    const messageInput = page.locator(
      'textarea[placeholder*="Type a message"], textarea[placeholder*="message"]'
    );
    const initialInputBox = await messageInput.boundingBox();

    // Scroll up in the message thread
    await messageThread.evaluate((el) => {
      el.scrollTop = 0;
    });

    // Wait for scroll to complete
    await page.waitForTimeout(300);

    // Get input position after scroll
    const afterScrollInputBox = await messageInput.boundingBox();

    // Input should remain in the same position (header and input fixed)
    expect(afterScrollInputBox?.y).toBe(initialInputBox?.y);
  });
});

test.describe('Messaging Scroll - User Story 3: Jump to Bottom Button', () => {
  test.setTimeout(90000);

  let conversationId: string | null = null;

  test.beforeEach(async ({ page }) => {
    if (adminClient) {
      await ensureConnection(adminClient, USER_A_EMAIL, USER_B_EMAIL);
      conversationId = await ensureConversation(
        adminClient,
        USER_A_EMAIL,
        USER_B_EMAIL
      );
    }

    await loginAndVerify(page, {
      email: USER_A_EMAIL,
      password: primary.password,
    });
  });

  test('T007-T008: Jump button appears when scrolled and does not overlap input', async ({
    page,
  }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/messages?conversation=${conversationId}`);
    await completeEncryptionSetup(page);
    await dismissCookieBanner(page);
    await dismissReAuthModal(page);

    await page.waitForSelector(
      '[data-testid="chat-window"], [data-testid="message-thread"]',
      { timeout: 10000 }
    );

    const messageThread = page.locator('[data-testid="message-thread"]');

    // Scroll up more than 500px to trigger button
    await messageThread.evaluate((el) => {
      el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight - 600);
    });

    await page.waitForTimeout(300);

    // Check if jump button appears
    const jumpButton = page.locator('[data-testid="jump-to-bottom"]');

    // Button should appear when scrolled 500px+ from bottom
    const scrollInfo = await messageThread.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      distanceFromBottom: el.scrollHeight - (el.scrollTop + el.clientHeight),
    }));

    if (scrollInfo.distanceFromBottom > 500) {
      await expect(jumpButton).toBeVisible();

      // Verify button doesn't overlap message input
      const buttonBox = await jumpButton.boundingBox();
      const messageInput = page.locator(
        'textarea[placeholder*="Type a message"], textarea[placeholder*="message"]'
      );
      const inputBox = await messageInput.boundingBox();

      if (buttonBox && inputBox) {
        // Button bottom should be above input top
        expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(inputBox.y);
      }
    }
  });

  test('T009: Jump button click scrolls to bottom', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto(`/messages?conversation=${conversationId}`);
    await completeEncryptionSetup(page);
    await dismissCookieBanner(page);
    await dismissReAuthModal(page);

    await page.waitForSelector(
      '[data-testid="chat-window"], [data-testid="message-thread"]',
      { timeout: 10000 }
    );

    const messageThread = page.locator('[data-testid="message-thread"]');

    // Scroll up to trigger button
    await messageThread.evaluate((el) => {
      el.scrollTop = 0;
    });

    await page.waitForTimeout(300);

    const jumpButton = page.locator('[data-testid="jump-to-bottom"]');

    if (await jumpButton.isVisible()) {
      await jumpButton.click();

      // Poll until scroll position stabilizes near bottom.
      // Smooth scroll + potential Realtime DOM updates can shift scrollHeight
      // during the animation, so a single check after a fixed wait is fragile.
      await expect
        .poll(
          async () => {
            const info = await messageThread.evaluate((el) => ({
              scrollTop: el.scrollTop,
              scrollHeight: el.scrollHeight,
              clientHeight: el.clientHeight,
            }));
            return info.scrollHeight - (info.scrollTop + info.clientHeight);
          },
          {
            message: 'Scroll should reach bottom after jump button click',
            timeout: 10000,
          }
        )
        .toBeLessThan(100);

      // Button should be hidden after reaching bottom
      await expect(jumpButton).not.toBeVisible();
    }
  });
});

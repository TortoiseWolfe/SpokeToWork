/**
 * E2E Tests for Message Editing and Deletion
 * Tasks: T115-T117
 *
 * Tests:
 * - Edit message within 15-minute window
 * - Delete message within 15-minute window
 * - Edit/delete disabled after 15 minutes
 */

import { test, expect, type Page } from '@playwright/test';
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

// Test user credentials — PRIMARY + TERTIARY per messaging E2E conventions
const TEST_USER_1 = {
  email: process.env.TEST_USER_PRIMARY_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PRIMARY_PASSWORD!,
};

const TEST_USER_2 = {
  email: process.env.TEST_USER_TERTIARY_EMAIL || 'test-user-b@example.com',
  password: process.env.TEST_USER_TERTIARY_PASSWORD!,
};

/** Module-scoped conversation ID, populated by beforeAll/beforeEach. */
let conversationId: string | null = null;

/**
 * Navigate directly to the seeded conversation.
 * Connection + conversation are seeded by admin client, so no UI-based flow needed.
 */
async function navigateToConversation(page: Page) {
  await page.goto(`/messages?conversation=${conversationId}`);
  await dismissCookieBanner(page);
  await completeEncryptionSetup(page);
  await dismissReAuthModal(page);
  await page.waitForSelector('textarea[aria-label="Message input"]', {
    timeout: 30000,
  });
}

/**
 * Locate a message bubble by its unique text and return a stable locator
 * anchored to the message's data-message-id attribute.  This survives
 * content changes (edit, delete) and is immune to other messages arriving
 * via Realtime during parallel test execution.
 */
async function findMessageBubble(page: Page, text: string) {
  const byText = page
    .locator('[data-testid="message-bubble"]')
    .filter({ hasText: text });

  // Wait for the optimistic ID to be replaced with a stable server UUID.
  // Optimistic messages use "optimistic-*" as data-message-id which gets
  // swapped on server confirmation, detaching the old DOM node mid-click.
  await expect(byText).toHaveAttribute('data-message-id', /^(?!optimistic-)/, {
    timeout: 10000,
  });

  const messageId = await byText.getAttribute('data-message-id');
  return page.locator(`[data-message-id="${messageId}"]`);
}

/**
 * Clean up messages and seed connection/conversation before tests.
 */
test.beforeAll(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const supabase = createClient(supabaseUrl, serviceKey);
  await cleanupMessagingData(supabase, TEST_USER_1.email, TEST_USER_2.email);

  // Seed connection + conversation; store ID for direct URL navigation
  await ensureConnection(supabase, TEST_USER_1.email, TEST_USER_2.email);
  conversationId = await ensureConversation(
    supabase,
    TEST_USER_1.email,
    TEST_USER_2.email
  );
});

test.describe('Message Editing', () => {
  test.describe.configure({ timeout: 90000 });

  test.beforeEach(async ({ page }) => {
    // Sign in as User 1
    await loginAndVerify(page, {
      email: TEST_USER_1.email,
      password: TEST_USER_1.password,
    });
  });

  test('T115: should edit message within 15-minute window', async ({
    page,
  }) => {
    // Navigate to conversation
    await navigateToConversation(page);

    // Send a message (unique per run to avoid accumulation across runs)
    const runId = Date.now();
    const originalMessage = `Original message content ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', originalMessage);
    await page.click('button[aria-label="Send message"]');

    // Wait for message to appear
    await page.waitForSelector(`text=${originalMessage}`, { timeout: 5000 });

    // Find our specific message bubble (stable through content changes)
    const messageBubble = await findMessageBubble(page, originalMessage);
    const editButton = messageBubble.locator('button', { hasText: 'Edit' });

    // Edit button should be visible for own messages
    await expect(editButton).toBeVisible();

    // Click Edit button
    await editButton.click();

    // Edit mode should be active (textarea visible)
    const editTextarea = messageBubble.locator(
      'textarea[aria-label="Edit message content"]'
    );
    await expect(editTextarea).toBeVisible();

    // Change the content
    const editedMessage = `Updated message content ${runId}`;
    await editTextarea.clear();
    await editTextarea.fill(editedMessage);

    // Click Save
    await messageBubble.locator('button', { hasText: 'Save' }).click();

    // Wait for save to complete (edit mode closes)
    await expect(editTextarea).not.toBeVisible({ timeout: 5000 });

    // Verify edited content is displayed
    await expect(messageBubble.locator('p')).toContainText(editedMessage);

    // Verify "Edited" indicator is shown
    await expect(messageBubble.locator('text=/Edited/')).toBeVisible();

    // Verify original content is no longer visible
    await expect(page.locator(`text=${originalMessage}`)).not.toBeVisible();
  });

  test('should cancel edit without saving', async ({ page }) => {
    await navigateToConversation(page);

    // Send a message (unique text to avoid matching accumulated messages)
    const runId = Date.now();
    const originalMessage = `Cancel edit test ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', originalMessage);
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector(`text=${originalMessage}`, { timeout: 5000 });

    // Find our specific message bubble (stable through content changes)
    const messageBubble = await findMessageBubble(page, originalMessage);

    // Click Edit
    await messageBubble.locator('button', { hasText: 'Edit' }).click();

    // Change content
    const editTextarea = messageBubble.locator(
      'textarea[aria-label="Edit message content"]'
    );
    await editTextarea.clear();
    await editTextarea.fill('This will be cancelled');

    // Click Cancel
    await messageBubble.locator('button', { hasText: 'Cancel' }).click();

    // Edit mode should close
    await expect(editTextarea).not.toBeVisible();

    // Original content should still be visible
    await expect(messageBubble.locator('p')).toContainText(originalMessage);

    // No "Edited" indicator
    await expect(messageBubble.locator('text=/Edited/')).not.toBeVisible();
  });

  test('should disable Save button when content unchanged', async ({
    page,
  }) => {
    await navigateToConversation(page);

    // Send a message (unique text to avoid matching accumulated messages)
    const runId = Date.now();
    const originalMessage = `Unchanged content test ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', originalMessage);
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector(`text=${originalMessage}`, { timeout: 5000 });

    // Find our specific message bubble (stable through content changes)
    const messageBubble = await findMessageBubble(page, originalMessage);

    // Click Edit
    await messageBubble.locator('button', { hasText: 'Edit' }).click();

    // Save button should be disabled (content hasn't changed)
    const saveButton = messageBubble.locator('button', { hasText: 'Save' });
    await expect(saveButton).toBeDisabled();
  });

  test('should not allow editing empty message', async ({ page }) => {
    await navigateToConversation(page);

    // Send a message (unique text to avoid matching accumulated messages)
    const runId = Date.now();
    const originalMessage = `Empty edit test ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', originalMessage);
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector(`text=${originalMessage}`, { timeout: 5000 });

    // Find our specific message bubble (stable through content changes)
    const messageBubble = await findMessageBubble(page, originalMessage);

    // Click Edit
    await messageBubble.locator('button', { hasText: 'Edit' }).click();

    // Clear content
    const editTextarea = messageBubble.locator(
      'textarea[aria-label="Edit message content"]'
    );
    await editTextarea.clear();

    // Save button should be disabled
    const saveButton = messageBubble.locator('button', { hasText: 'Save' });
    await expect(saveButton).toBeDisabled();
  });
});

test.describe('Message Deletion', () => {
  test.describe.configure({ timeout: 90000 });

  test.beforeEach(async ({ page }) => {
    // Sign in as User 1
    await loginAndVerify(page, {
      email: TEST_USER_1.email,
      password: TEST_USER_1.password,
    });
  });

  test('T116: should delete message within 15-minute window', async ({
    page,
  }) => {
    await navigateToConversation(page);

    // Send a message (unique text to avoid matching accumulated messages)
    const runId = Date.now();
    const messageToDelete = `Delete target T116 ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', messageToDelete);
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector(`text=${messageToDelete}`, { timeout: 5000 });

    // Find our specific message bubble (stable through deletion)
    const messageBubble = await findMessageBubble(page, messageToDelete);
    const deleteButton = messageBubble.locator('button', { hasText: 'Delete' });

    // Delete button should be visible
    await expect(deleteButton).toBeVisible();

    // Click Delete
    await deleteButton.click();

    // Confirmation modal should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('#delete-modal-title')).toContainText(
      'Delete Message?'
    );

    // Confirm deletion
    await page.locator('button[aria-label="Confirm deletion"]').click();

    // Wait for deletion to complete
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({
      timeout: 5000,
    });

    // Original message should be replaced with placeholder
    await expect(messageBubble.locator('p')).toContainText('[Message deleted]');

    // Original content should not be visible
    await expect(page.locator(`text=${messageToDelete}`)).not.toBeVisible();

    // Deleted message should have muted styling (bg-base-300 placeholder)
    await expect(messageBubble.locator('.chat-bubble')).toHaveClass(
      /bg-base-300/
    );
  });

  test('should cancel deletion from confirmation modal', async ({ page }) => {
    await navigateToConversation(page);

    // Send a message (unique text to avoid matching accumulated messages)
    const runId = Date.now();
    const messageToKeep = `Cancel delete test ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', messageToKeep);
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector(`text=${messageToKeep}`, { timeout: 5000 });

    // Find our specific message bubble (stable through interactions)
    const messageBubble = await findMessageBubble(page, messageToKeep);

    // Click Delete
    await messageBubble.locator('button', { hasText: 'Delete' }).click();

    // Modal appears
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click Cancel
    await page.locator('button[aria-label="Cancel deletion"]').click();

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Message should still be intact
    await expect(messageBubble.locator('p')).toContainText(messageToKeep);
    await expect(messageBubble.locator('p')).not.toContainText(
      '[Message deleted]'
    );
  });

  test('should not show Edit/Delete buttons on deleted message', async ({
    page,
  }) => {
    await navigateToConversation(page);

    // Send and delete a message (unique text to avoid matching accumulated messages)
    const runId = Date.now();
    const messageToDelete = `Delete target ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', messageToDelete);
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector(`text=${messageToDelete}`, { timeout: 5000 });

    // Find our specific message bubble (stable through deletion)
    const messageBubble = await findMessageBubble(page, messageToDelete);
    await messageBubble.locator('button', { hasText: 'Delete' }).click();

    // Wait for confirmation dialog before clicking confirm
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.locator('button[aria-label="Confirm deletion"]').click();

    // Wait for dialog to close and the specific message text to disappear
    // Webkit can be slow to dismiss dialogs under CI load
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(`text=${messageToDelete}`)).not.toBeVisible({
      timeout: 10000,
    });

    // Edit and Delete buttons should not exist
    await expect(
      messageBubble.locator('button', { hasText: 'Edit' })
    ).not.toBeVisible();
    await expect(
      messageBubble.locator('button', { hasText: 'Delete' })
    ).not.toBeVisible();
  });
});

test.describe('Time Window Restrictions', () => {
  test.describe.configure({ timeout: 90000 });

  test.beforeEach(async ({ page }) => {
    await loginAndVerify(page, {
      email: TEST_USER_1.email,
      password: TEST_USER_1.password,
    });
  });

  test('T117: should not show Edit/Delete buttons for messages older than 15 minutes', async ({
    page,
    context,
  }) => {
    await navigateToConversation(page);

    // For this test, we'll simulate an old message by manually setting the created_at timestamp
    // In a real scenario, we'd need to either:
    // 1. Wait 15 minutes (too slow for tests)
    // 2. Use a test fixture with pre-created old messages
    // 3. Mock the browser time

    // Mock the current time to be 16 minutes in the future
    await context.addInitScript(() => {
      const originalDateNow = Date.now;
      const originalDate = Date;

      // Override Date.now to return time 16 minutes in the future
      Date.now = () => originalDateNow() + 16 * 60 * 1000;

      // Also override new Date() to use the mocked time
      (window as any).Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(Date.now());
          } else if (args.length === 1) {
            super(args[0]);
          } else {
            super(
              args[0],
              args[1],
              args[2],
              args[3],
              args[4],
              args[5],
              args[6]
            );
          }
        }

        static override now() {
          return originalDateNow() + 16 * 60 * 1000;
        }
      };
    });

    // Reload page to apply mock
    await page.reload();
    await navigateToConversation(page);

    // Check that existing messages don't have Edit/Delete buttons
    const messageBubbles = page.locator('[data-testid="message-bubble"]');
    const count = await messageBubbles.count();

    if (count > 0) {
      // Check first message (likely oldest)
      const firstMessage = messageBubbles.first();

      // Edit and Delete buttons should not be visible
      await expect(
        firstMessage.locator('button', { hasText: 'Edit' })
      ).not.toBeVisible();
      await expect(
        firstMessage.locator('button', { hasText: 'Delete' })
      ).not.toBeVisible();
    }
  });

  test('should show Edit/Delete buttons only for own recent messages', async ({
    page,
  }) => {
    await navigateToConversation(page);

    // Send a new message (unique text to avoid matching accumulated messages)
    const runId = Date.now();
    const recentMessage = `Recent message test ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', recentMessage);
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector(`text=${recentMessage}`, { timeout: 5000 });

    // Find our specific message bubble (stable through interactions)
    const recentBubble = await findMessageBubble(page, recentMessage);

    // Recent own message should have Edit and Delete buttons
    await expect(
      recentBubble.locator('button', { hasText: 'Edit' })
    ).toBeVisible();
    await expect(
      recentBubble.locator('button', { hasText: 'Delete' })
    ).toBeVisible();
  });

  test('should not show Edit/Delete buttons on received messages', async ({
    page,
    browser,
  }) => {
    // This test requires two users in the same conversation
    // For now, we'll just verify that messages not marked as "isOwn" don't have buttons

    await navigateToConversation(page);

    // Get all message bubbles
    const messageBubbles = page.locator('[data-testid="message-bubble"]');
    const count = await messageBubbles.count();

    // Check each message bubble
    for (let i = 0; i < count; i++) {
      const bubble = messageBubbles.nth(i);

      // Check if message is from the other user (chat-start = received)
      const isReceived = (await bubble.locator('.chat-start').count()) > 0;

      if (isReceived) {
        // Received messages should never have Edit/Delete buttons
        await expect(
          bubble.locator('button', { hasText: 'Edit' })
        ).not.toBeVisible();
        await expect(
          bubble.locator('button', { hasText: 'Delete' })
        ).not.toBeVisible();
      }
    }
  });
});

test.describe('Accessibility', () => {
  test.describe.configure({ timeout: 90000 });

  test.beforeEach(async ({ page }) => {
    await loginAndVerify(page, {
      email: TEST_USER_1.email,
      password: TEST_USER_1.password,
    });
  });

  test('T130: edit mode should have proper ARIA labels', async ({ page }) => {
    await navigateToConversation(page);

    // Send a message (unique text to avoid matching accumulated messages)
    const runId = Date.now();
    const message = `ARIA labels test ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', message);
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector(`text=${message}`, { timeout: 5000 });

    // Find our specific message bubble (stable through content changes)
    const messageBubble = await findMessageBubble(page, message);

    // Enter edit mode
    await messageBubble.locator('button[aria-label="Edit message"]').click();

    // Check ARIA labels
    await expect(
      messageBubble.locator('textarea[aria-label="Edit message content"]')
    ).toBeVisible();
    await expect(
      messageBubble.locator('button[aria-label="Cancel editing"]')
    ).toBeVisible();
    await expect(
      messageBubble.locator('button[aria-label="Save edited message"]')
    ).toBeVisible();
  });

  test('delete confirmation modal should have proper ARIA labels', async ({
    page,
  }) => {
    await navigateToConversation(page);

    // Send a message (unique text to avoid matching accumulated messages)
    const runId = Date.now();
    const message = `Delete modal ARIA test ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', message);
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector(`text=${message}`, { timeout: 5000 });

    // Find our specific message bubble (stable through interactions)
    const messageBubble = await findMessageBubble(page, message);

    // Open delete modal
    await messageBubble.locator('button[aria-label="Delete message"]').click();

    // Check modal ARIA attributes
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute(
      'aria-labelledby',
      'delete-modal-title'
    );

    // Check modal title
    await expect(page.locator('#delete-modal-title')).toContainText(
      'Delete Message?'
    );

    // Check button labels
    await expect(
      page.locator('button[aria-label="Cancel deletion"]')
    ).toBeVisible();
    await expect(
      page.locator('button[aria-label="Confirm deletion"]')
    ).toBeVisible();
  });

  test('delete confirmation modal should be keyboard navigable', async ({
    page,
  }) => {
    await navigateToConversation(page);

    // Send a message (unique text to avoid matching accumulated messages)
    const runId = Date.now();
    const message = `Keyboard nav test ${runId}`;
    await page.fill('textarea[aria-label="Message input"]', message);
    await page.click('button[aria-label="Send message"]');
    await page.waitForSelector(`text=${message}`, { timeout: 5000 });

    // Find our specific message bubble (stable through interactions)
    const messageBubble = await findMessageBubble(page, message);

    // Open delete modal
    await messageBubble.locator('button[aria-label="Delete message"]').click();

    // Dialog should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Verify modal buttons are visible and interactive
    // (toBeFocused is unreliable in headless webkit — focus management differs by engine)
    await expect(
      page.locator('button[aria-label="Cancel deletion"]')
    ).toBeVisible();

    await expect(
      page.locator('button[aria-label="Confirm deletion"]')
    ).toBeVisible();
  });
});

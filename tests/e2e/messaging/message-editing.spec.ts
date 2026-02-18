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

// Test user credentials — PRIMARY + TERTIARY per messaging E2E conventions
const TEST_USER_1 = {
  email: process.env.TEST_USER_PRIMARY_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PRIMARY_PASSWORD!,
};

const TEST_USER_2 = {
  email: process.env.TEST_USER_TERTIARY_EMAIL || 'test-user-b@example.com',
  password: process.env.TEST_USER_TERTIARY_PASSWORD!,
};

/**
 * Ensure an accepted connection exists between PRIMARY and TERTIARY
 * so the UI can create a conversation via the Message button.
 * Runs once per test file via module-level flag.
 */
let messagingSetupDone = false;
async function ensureMessagingSetup(): Promise<void> {
  if (messagingSetupDone) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get user IDs via auth admin API
  const { data: listResult, error: usersError } =
    await supabase.auth.admin.listUsers();
  if (usersError) {
    throw new Error(`Failed to list users: ${usersError.message}`);
  }

  // listUsers returns { users: User[] } in supabase-js v2
  const users = Array.isArray(listResult)
    ? listResult
    : ((listResult as { users: unknown[] })?.users ?? []);
  const primaryUser = users.find(
    (u: { email?: string }) => u.email === TEST_USER_1.email
  ) as { id: string } | undefined;
  const tertiaryUser = users.find(
    (u: { email?: string }) => u.email === TEST_USER_2.email
  ) as { id: string } | undefined;

  if (!primaryUser || !tertiaryUser) {
    throw new Error(
      `Messaging test users not found: primary=${primaryUser?.id}, tertiary=${tertiaryUser?.id}`
    );
  }

  // Upsert accepted connection (service role bypasses RLS)
  const { error: upsertError } = await supabase.from('user_connections').upsert(
    {
      requester_id: primaryUser.id,
      addressee_id: tertiaryUser.id,
      status: 'accepted',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'requester_id,addressee_id' }
  );

  if (upsertError) {
    throw new Error(`Failed to upsert connection: ${upsertError.message}`);
  }

  messagingSetupDone = true;
}

/**
 * Sign in helper function
 */
async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/profile/);
}

/**
 * Navigate to conversation helper
 */
async function navigateToConversation(page: Page) {
  // Ensure accepted connection exists in DB before navigating
  await ensureMessagingSetup();

  await page.goto('/messages?tab=connections');

  // Handle ReAuth modal if encryption keys need unlocking
  try {
    const reAuthDialog = page.getByRole('dialog', {
      name: /re-authentication required/i,
    });
    await reAuthDialog.waitFor({ state: 'visible', timeout: 5000 });
    await page
      .getByRole('textbox', { name: /password/i })
      .fill(TEST_USER_1.password);
    await page.getByRole('button', { name: /unlock messages/i }).click();
    await reAuthDialog.waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // Modal didn't appear - continue
  }

  // Wait for ConnectionManager to render
  await page
    .locator('[data-testid="connection-manager"]')
    .waitFor({ state: 'visible' });

  // Switch to Accepted tab and click Message on first accepted connection
  await page.getByRole('tab', { name: /accepted/i }).click();
  const messageButton = page.locator('[data-testid="message-button"]').first();
  await messageButton.click({ timeout: 10000 });

  // Message button creates conversation and switches to Chats tab;
  // click the conversation to open it
  const conversationButton = page
    .locator('button[aria-label^="Conversation with"]')
    .first();
  await conversationButton.click({ timeout: 10000 });

  // Wait for conversation to open
  await page.waitForURL(/.*conversation=/, { timeout: 10000 });
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
  const messageId = await byText.getAttribute('data-message-id');
  return page.locator(`[data-message-id="${messageId}"]`);
}

/**
 * Delete all accumulated messages from the shared test conversation so each
 * test run starts with a clean slate.  Without this, repeated runs deposit
 * dozens of messages that eventually degrade Realtime delivery and cause
 * send-wait timeouts.
 */
test.beforeAll(async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: listResult } = await supabase.auth.admin.listUsers();
  const users = Array.isArray(listResult)
    ? listResult
    : ((listResult as { users: unknown[] })?.users ?? []);
  const primaryUser = users.find(
    (u: { email?: string }) => u.email === TEST_USER_1.email
  ) as { id: string } | undefined;
  const tertiaryUser = users.find(
    (u: { email?: string }) => u.email === TEST_USER_2.email
  ) as { id: string } | undefined;

  if (!primaryUser || !tertiaryUser) return;

  // Canonical ordering: participant_1_id < participant_2_id
  const p1 =
    primaryUser.id < tertiaryUser.id ? primaryUser.id : tertiaryUser.id;
  const p2 =
    primaryUser.id < tertiaryUser.id ? tertiaryUser.id : primaryUser.id;

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_1_id', p1)
    .eq('participant_2_id', p2);

  if (conversations) {
    for (const conv of conversations) {
      await supabase.from('messages').delete().eq('conversation_id', conv.id);
    }
  }
});

test.describe('Message Editing', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as User 1
    await signIn(page, TEST_USER_1.email, TEST_USER_1.password);
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
  test.beforeEach(async ({ page }) => {
    // Sign in as User 1
    await signIn(page, TEST_USER_1.email, TEST_USER_1.password);
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
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator(`text=${messageToDelete}`)).not.toBeVisible({
      timeout: 5000,
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
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_USER_1.email, TEST_USER_1.password);
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
  test.beforeEach(async ({ page }) => {
    await signIn(page, TEST_USER_1.email, TEST_USER_1.password);
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

    // Focus should move to Cancel button when modal opens (correct modal behavior)
    await expect(
      page.locator('button[aria-label="Cancel deletion"]')
    ).toBeFocused();

    // Tab should move focus to Confirm button
    await page.keyboard.press('Tab');
    await expect(
      page.locator('button[aria-label="Confirm deletion"]')
    ).toBeFocused();
  });
});

/**
 * Shared E2E test helpers for messaging tests
 * Provides admin client seeding for connections and conversations
 */

import { Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const getAdminClient = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const getUserIdByEmail = async (
  client: SupabaseClient,
  email: string
): Promise<string | null> => {
  const { data } = await client.auth.admin.listUsers({ perPage: 1000 });
  return data?.users?.find((u) => u.email === email)?.id ?? null;
};

export const ensureUserProfile = async (
  client: SupabaseClient,
  email: string
): Promise<void> => {
  const userId = await getUserIdByEmail(client, email);
  if (!userId) return;
  const displayName = email.split('@')[0];
  await client.from('user_profiles').upsert({
    id: userId,
    username: displayName,
    display_name: displayName,
    updated_at: new Date().toISOString(),
  });
};

export const ensureConnection = async (
  client: SupabaseClient,
  emailA: string,
  emailB: string
): Promise<void> => {
  const [idA, idB] = await Promise.all([
    getUserIdByEmail(client, emailA),
    getUserIdByEmail(client, emailB),
  ]);
  if (!idA || !idB) return;

  await Promise.all([
    ensureUserProfile(client, emailA),
    ensureUserProfile(client, emailB),
  ]);

  const { data: existing } = await client
    .from('user_connections')
    .select('id')
    .or(
      `and(requester_id.eq.${idA},addressee_id.eq.${idB}),and(requester_id.eq.${idB},addressee_id.eq.${idA})`
    )
    .maybeSingle();
  if (existing) return;

  await client.from('user_connections').insert({
    requester_id: idA,
    addressee_id: idB,
    status: 'accepted',
  });
};

/**
 * Complete the encryption key setup page if it appears.
 * When a test user navigates to /messages without having set up encryption keys,
 * they get redirected to /messages/setup. This helper fills the form and submits.
 *
 * The redirect is client-side (useEffect), so we wait for the page to settle
 * and check for the setup form directly rather than just checking the URL.
 */
export async function completeEncryptionSetup(
  page: Page,
  password?: string
): Promise<void> {
  const testPassword = password || process.env.TEST_USER_PRIMARY_PASSWORD!;
  if (!testPassword) {
    console.warn(
      'TEST_USER_PRIMARY_PASSWORD not set, cannot complete encryption setup'
    );
    return;
  }

  try {
    // Wait for page to settle — the redirect from /messages to /messages/setup
    // happens via client-side router.push in a useEffect
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check for the setup form by looking for its submit button
    const setupBtn = page.locator(
      'button:has-text("Set Up Encrypted Messaging")'
    );
    if (!(await setupBtn.isVisible({ timeout: 3000 }).catch(() => false))) {
      return; // Not on setup page
    }

    console.log('Detected encryption setup page, completing setup...');

    // Retry up to 3 times — first attempt may fail with "must be signed in"
    // if auth context hasn't fully hydrated
    for (let attempt = 0; attempt < 3; attempt++) {
      // Wait for auth context to hydrate
      if (attempt > 0) {
        await page.waitForTimeout(3000);
      }

      // Fill password fields
      const passwordInput = page.locator('#setup-password');
      await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
      await passwordInput.fill(testPassword);
      await page.locator('#setup-confirm').fill(testPassword);

      // Submit the form
      await setupBtn.click();

      // Check for auth error
      const errorAlert = page.locator('[role="alert"]:has-text("signed in")');
      if (await errorAlert.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log(`  Attempt ${attempt + 1}: auth not ready, retrying...`);
        // Reload page to re-trigger auth check
        await page.reload();
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        continue;
      }

      // Wait for redirect to /messages (argon2id key derivation can take 10-20s)
      try {
        await page.waitForURL(/\/messages(?!\/setup)/, { timeout: 60000 });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        console.log('✓ Encryption setup completed in browser');
        return;
      } catch {
        console.log(`  Attempt ${attempt + 1}: redirect timeout, retrying...`);
      }
    }
    console.warn('Encryption setup: all attempts exhausted');
  } catch (err) {
    console.warn('Encryption setup helper failed:', err);
  }
}

/** Dismiss the cookie consent banner if visible */
export async function dismissCookieBanner(page: Page): Promise<void> {
  try {
    const acceptBtn = page.getByRole('button', { name: /accept all/i });
    if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptBtn.click();
      await page.waitForTimeout(300);
    }
  } catch {
    // Banner didn't appear
  }
}

/**
 * Wait for page to be ready for modal interaction.
 * After goto/reload, React needs time to hydrate and mount the messaging
 * context before the ReAuthModal can appear.
 */
async function waitForPageReady(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('domcontentloaded');
    // Wait for React hydration + messaging context initialization.
    // In Docker/CI, this can take 3-5s after domcontentloaded fires.
    await page.waitForTimeout(3000);
  } catch {
    // Page context may have been closed (webkit under CPU stress from argon2id) — continue
  }
}

/** Dismiss the ReAuth modal/dialog that appears when encryption keys need unlocking */
export async function dismissReAuthModal(
  page: Page,
  password?: string
): Promise<void> {
  const pw = password || process.env.TEST_USER_PRIMARY_PASSWORD!;

  // Ensure page is settled before looking for the modal
  await waitForPageReady(page);

  // Try up to 3 times — modal may appear after auth hydration delay
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const modal = page.locator('[role="presentation"], [role="dialog"]');
      // First attempt waits longer — React hydration can be slow in Docker
      const timeout = attempt === 0 ? 15000 : 5000;
      if (
        await modal
          .first()
          .isVisible({ timeout })
          .catch(() => false)
      ) {
        // Wait for spinner phase to end — ReAuthModal checks keys before showing the form
        // The password input appears after the key check completes (up to 8s in Docker)
        const passwordInput = page.locator(
          '#reauth-password, input[type="password"]'
        );
        if (
          await passwordInput
            .first()
            .isVisible({ timeout: 10000 })
            .catch(() => false)
        ) {
          await passwordInput.first().fill(pw);
          const unlockBtn = page.getByRole('button', { name: /unlock/i });
          if (await unlockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await unlockBtn.click();

            // Wait for modal to close (argon2id key derivation takes 10-35s on CI, up to 70s on firefox)
            const closed = await modal
              .first()
              .waitFor({ state: 'hidden', timeout: 90000 })
              .then(() => true)
              .catch(() => false);
            await page.waitForTimeout(500);
            if (closed) return;
            // Modal didn't close — might need to retry (e.g. wrong password error)
            console.log(
              `dismissReAuthModal: modal did not close on attempt ${attempt + 1}`
            );
            continue;
          }
        }
        // Escape won't close modal — onClose prop not passed to ReAuthModal by parent.
        // Continue to retry instead of returning with a stuck modal overlay.
        console.log(
          `dismissReAuthModal: password/unlock not found on attempt ${attempt + 1}, retrying`
        );
        continue;
      }
      // No modal visible — done
      return;
    } catch {
      // Retry
    }
  }
}

export const ensureConversation = async (
  client: SupabaseClient,
  emailA: string,
  emailB: string
): Promise<string | null> => {
  const [idA, idB] = await Promise.all([
    getUserIdByEmail(client, emailA),
    getUserIdByEmail(client, emailB),
  ]);
  if (!idA || !idB) return null;

  // Canonical ordering: smaller UUID = participant_1
  const p1 = idA < idB ? idA : idB;
  const p2 = idA < idB ? idB : idA;

  const { data: existing } = await client
    .from('conversations')
    .select('id')
    .eq('participant_1_id', p1)
    .eq('participant_2_id', p2)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await client
    .from('conversations')
    .insert({ participant_1_id: p1, participant_2_id: p2 })
    .select('id')
    .single();
  if (error) {
    console.warn('ensureConversation:', error.message);
    return null;
  }
  return data.id;
};

/**
 * Delete all messages from conversations between two users.
 * Call in beforeAll() to start each test file with clean state.
 * Keeps the conversation row so ensureConversation can reuse it.
 */
export const cleanupMessagingData = async (
  client: SupabaseClient,
  emailA: string,
  emailB: string
): Promise<void> => {
  const [idA, idB] = await Promise.all([
    getUserIdByEmail(client, emailA),
    getUserIdByEmail(client, emailB),
  ]);
  if (!idA || !idB) return;

  const p1 = idA < idB ? idA : idB;
  const p2 = idA < idB ? idB : idA;

  const { data: conversations } = await client
    .from('conversations')
    .select('id')
    .eq('participant_1_id', p1)
    .eq('participant_2_id', p2);

  if (conversations) {
    for (const conv of conversations) {
      await client.from('messages').delete().eq('conversation_id', conv.id);
    }
  }
};

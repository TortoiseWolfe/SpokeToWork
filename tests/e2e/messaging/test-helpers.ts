/**
 * Shared E2E test helpers for messaging tests
 * Provides admin client seeding for connections and conversations
 */

import { Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { executeSQL, escapeSQL } from '../utils/supabase-admin';
import { getPrebakedKeysForUser } from '../utils/prebaked-keys';

export const getAdminClient = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

export const getUserIdByEmail = async (
  _client: SupabaseClient,
  email: string
): Promise<string | null> => {
  // Use direct SQL instead of listUsers({perPage:1000}) which fetches ALL
  // users and takes 3-5s per call. Under 18-shard contention, beforeAll hooks
  // were making 10+ listUsers calls and exceeding the 30s timeout.
  const rows = (await executeSQL(
    `SELECT id FROM auth.users WHERE email = '${escapeSQL(email)}'`
  )) as { id: string }[];
  return rows[0]?.id ?? null;
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

  // Check both directions — a connection may exist in either direction
  const { data: existing } = await client
    .from('user_connections')
    .select('id')
    .or(
      `and(requester_id.eq.${idA},addressee_id.eq.${idB}),and(requester_id.eq.${idB},addressee_id.eq.${idA})`
    )
    .maybeSingle();
  if (existing) return;

  // Use upsert to handle concurrent calls from parallel browser shards.
  // Without this, a second shard hitting the UNIQUE(requester_id, addressee_id)
  // constraint silently fails, leaving the test with no connection.
  const { error } = await client.from('user_connections').upsert(
    {
      requester_id: idA,
      addressee_id: idB,
      status: 'accepted',
    },
    { onConflict: 'requester_id,addressee_id' }
  );
  if (error) {
    console.error('ensureConnection INSERT failed:', error.message);
  }

  // Verify the connection is readable (Supabase Cloud read replica lag can be 5-30s)
  for (let poll = 0; poll < 10; poll++) {
    const { data: verified } = await client
      .from('user_connections')
      .select('id')
      .or(
        `and(requester_id.eq.${idA},addressee_id.eq.${idB}),and(requester_id.eq.${idB},addressee_id.eq.${idA})`
      )
      .maybeSingle();
    if (verified) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.warn('ensureConnection: connection not verified after 10 polls');
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

    // Diagnostic: log WHY we ended up on the setup page
    const diag = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith('stw_keys_')
      );
      const authKey = Object.keys(localStorage).find((k) =>
        k.includes('auth-token')
      );
      return {
        url: window.location.href,
        stwKeysCount: keys.length,
        stwKeyNames: keys,
        hasAuthToken: !!authKey,
      };
    });
    console.log('Encryption setup page diagnostic:', JSON.stringify(diag));
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

      // Wait for redirect to /messages (argon2id key derivation can take 10-20s
      // on chromium, up to 90s on Firefox CI runners)
      try {
        await page.waitForURL(/\/messages(?!\/setup)/, { timeout: 120000 });
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

/** Dismiss the ReAuth modal/dialog that appears when encryption keys need unlocking.
 *  @param quickCheck - Use in retry loops where keys are already derived.
 *    Reduces wait from 18s to 2s when no modal appears. */
export async function dismissReAuthModal(
  page: Page,
  password?: string,
  quickCheck = false
): Promise<void> {
  const pw = password || process.env.TEST_USER_PRIMARY_PASSWORD!;

  // Quick check path for retry loops — keys already derived, modal won't appear
  if (quickCheck) {
    const modal = page.locator('[role="presentation"], [role="dialog"]');
    if (
      !(await modal
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false))
    ) {
      return; // No modal — done in 2s instead of 18s
    }
    // Modal found unexpectedly — fall through to full handling
  }

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

  // Verify the conversation is readable on the read replica.
  // Supabase Cloud read-replica lag can delay the INSERT by 5-30s.
  // Without this, the user's sendMessage INSERT fails silently because
  // the RLS policy can't find the conversation on the replica.
  for (let poll = 0; poll < 10; poll++) {
    const { data: verified } = await client
      .from('conversations')
      .select('id')
      .eq('id', data.id)
      .maybeSingle();
    if (verified) return data.id;
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.warn('ensureConversation: not verified after 10 polls');
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
    // Only delete messages older than 2 minutes to avoid cross-shard interference.
    // With 12 parallel shards, another shard's test may have just sent a message
    // in this conversation. Deleting ALL messages would destroy in-progress test data.
    const twoMinAgo = new Date(Date.now() - 120_000).toISOString();
    for (const conv of conversations) {
      await client
        .from('messages')
        .delete()
        .eq('conversation_id', conv.id)
        .lt('created_at', twoMinAgo);
    }
  }
};

/**
 * Wait for a message to appear on the receiving page with robust fallbacks.
 *
 * 1. Wait for text via Realtime (15s)
 * 2. On timeout: reload page, re-setup encryption, wait again (30s)
 * 3. After 2 reload attempts: query DB to verify message exists
 * 4. If in DB but not visible: final reload + wait
 *
 * This consolidates the inconsistent reload patterns across messaging tests
 * into one tested, reliable function.
 */
export async function waitForMessageDelivery(
  page: Page,
  messageText: string,
  options?: {
    /** Initial Realtime wait timeout (default 15000) */
    timeout?: number;
    /** Password for dismissReAuthModal after reload */
    password?: string;
    /** Max page reloads before giving up (default 2) */
    maxReloads?: number;
    /** Conversation ID — used to wait for data-messages-subscribed after reload */
    conversationId?: string;
  }
): Promise<void> {
  const timeout = options?.timeout ?? 20000;
  const maxReloads = options?.maxReloads ?? 2;
  const password = options?.password;
  const conversationId = options?.conversationId;

  // Attempt 1: wait for Realtime delivery
  const locator = page.locator(`text="${messageText}"`);
  try {
    await locator.waitFor({ state: 'visible', timeout });
    return; // Realtime delivered — fast path
  } catch {
    // Realtime didn't deliver — fall through to reload
  }

  // Reload fallback loop
  for (let attempt = 0; attempt < maxReloads; attempt++) {
    console.log(
      `waitForMessageDelivery: Realtime miss, reload attempt ${attempt + 1}/${maxReloads}`
    );
    // page.reload() can crash on Firefox/WebKit when the browser context
    // is being torn down due to test timeout. Catch and exit the reload
    // loop gracefully — the final assertion will report the real failure.
    try {
      await page.reload();
    } catch (reloadErr) {
      const msg =
        reloadErr instanceof Error ? reloadErr.message : String(reloadErr);
      if (msg.includes('Target page') || msg.includes('closed')) {
        console.warn(
          'waitForMessageDelivery: page closed during reload, exiting retry loop'
        );
        break;
      }
      throw reloadErr;
    }
    await dismissCookieBanner(page);
    await completeEncryptionSetup(page, password);
    // On Firefox/WebKit, the ReAuthModal may take 3-5s to appear after page load.
    // Wait for page to settle before quickCheck so we don't miss the modal.
    await page.waitForTimeout(3000);
    await dismissReAuthModal(page, password, true);

    // Wait for at least one successful poll cycle after reload.
    // data-messages-last-poll proves: keys are ready, loadMessages() ran,
    // messages were fetched AND decrypted. This is a stronger signal than
    // data-messages-subscribed (which only means the Realtime channel connected).
    try {
      await page.waitForSelector('body[data-messages-last-poll]', {
        timeout: 20000,
      });
    } catch {
      // Poll hasn't fired yet — continue with message wait
    }

    // Wait for the message text to appear (poll should have loaded it)
    try {
      await locator.waitFor({ state: 'visible', timeout: 30000 });
      return; // Message appeared after reload
    } catch {
      // Diagnostic: what IS in the DOM right now?
      const diag = await page
        .evaluate(() => {
          const bubbles = document.querySelectorAll(
            '[data-testid="message-bubble"]'
          );
          const url = window.location.href;
          const texts = Array.from(bubbles)
            .slice(-3)
            .map((b) => b.textContent?.substring(0, 80));
          return { url, bubbleCount: bubbles.length, lastTexts: texts };
        })
        .catch(() => ({ url: 'unknown', bubbleCount: -1, lastTexts: [] }));
      console.log(
        `waitForMessageDelivery diagnostic (attempt ${attempt + 1}):`,
        JSON.stringify(diag)
      );
    }
  }

  // Final attempt: the page's 10s polling fallback should have fetched by now.
  // Give it one more generous wait.
  try {
    await locator.waitFor({ state: 'visible', timeout: 30000 });
    return;
  } catch {
    // Final diagnostic before throwing
    const finalDiag = await page
      .evaluate(() => {
        const bubbles = document.querySelectorAll(
          '[data-testid="message-bubble"]'
        );
        const url = window.location.href;
        const texts = Array.from(bubbles)
          .slice(-5)
          .map((b) => b.textContent?.substring(0, 100));
        const pollAttr =
          document.body.getAttribute('data-messages-last-poll') || 'none';
        const subAttr =
          document.body.getAttribute('data-messages-subscribed') || 'none';
        return {
          url,
          bubbleCount: bubbles.length,
          lastTexts: texts,
          lastPoll: pollAttr,
          subscribed: subAttr,
        };
      })
      .catch(() => ({
        url: 'unknown',
        bubbleCount: -1,
        lastTexts: [],
        lastPoll: 'error',
        subscribed: 'error',
      }));
    console.log(
      'waitForMessageDelivery FINAL diagnostic:',
      JSON.stringify(finalDiag)
    );

    // DB-level diagnostic: check if any messages exist in this conversation
    const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (adminUrl && adminKey && conversationId) {
      try {
        const { createClient: cc } = await import('@supabase/supabase-js');
        const admin = cc(adminUrl, adminKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: dbMsgs, error: dbErr } = await admin
          .from('messages')
          .select('id, sender_id, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(3);
        console.log(
          'waitForMessageDelivery DB diagnostic:',
          JSON.stringify({
            conversationId,
            dbMessageCount: dbMsgs?.length ?? -1,
            dbError: dbErr?.message ?? null,
            recentMessages: dbMsgs?.map((m) => ({
              id: m.id.substring(0, 8),
              age: `${Math.round((Date.now() - new Date(m.created_at).getTime()) / 1000)}s`,
            })),
          })
        );
      } catch {
        console.log('waitForMessageDelivery DB diagnostic: query failed');
      }
    }

    throw new Error(
      `waitForMessageDelivery: "${messageText}" not visible after ${maxReloads} reloads and polling fallback`
    );
  }
}

/**
 * Wait for both users to have encryption keys in the database.
 *
 * auth.setup.ts derives keys in browser and inserts them into
 * user_encryption_keys, but shard 3/6 can start tests before
 * auth.setup finishes for the tertiary user. Without waiting,
 * sendMessage() fails at getUserPublicKey() with "recipientKey-MISSING".
 *
 * Uses PostgREST (admin client), NOT executeSQL, to avoid rate-limiting.
 * Polls up to 30×3s = 90s max.
 */
export async function injectPrebakedKeys(
  page: Page,
  email: string
): Promise<void> {
  const prebaked = getPrebakedKeysForUser(email);
  if (!prebaked) return; // No pre-baked keys (local dev) — app will derive via Argon2id

  // Get userId from the page's Supabase auth session in localStorage
  const userId = await page.evaluate(() => {
    const storageKeys = Object.keys(localStorage);
    const authKey = storageKeys.find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    if (!authKey) return null;
    try {
      const session = JSON.parse(localStorage.getItem(authKey) || '{}');
      return session?.user?.id || null;
    } catch {
      return null;
    }
  });

  if (!userId) {
    console.warn(`injectPrebakedKeys: no userId in localStorage for ${email}`);
    return;
  }

  await page.evaluate(
    ({ uid, keys }) => {
      localStorage.setItem(`stw_keys_${uid}`, JSON.stringify(keys));
    },
    { uid: userId, keys: prebaked.localStorage }
  );
  console.log(`Injected pre-baked keys for ${email} (${userId.slice(0, 8)}...)`);
}

export async function waitForEncryptionKeys(
  client: SupabaseClient,
  email1: string,
  email2: string
): Promise<void> {
  const id1 = await getUserIdByEmail(client, email1);
  const id2 = await getUserIdByEmail(client, email2);
  if (!id1 || !id2) {
    console.warn('waitForEncryptionKeys: could not resolve user IDs');
    return;
  }

  for (let poll = 0; poll < 30; poll++) {
    const result = await client
      .from('user_encryption_keys')
      .select('user_id')
      .in('user_id', [id1, id2])
      .eq('revoked', false);
    const rows = (result.data ?? []) as { user_id: string }[];
    const userIds = new Set(rows.map((k) => k.user_id));
    if (userIds.has(id1) && userIds.has(id2)) {
      console.log(`Both users have encryption keys (poll ${poll + 1})`);
      return;
    }
    if (poll % 5 === 0) {
      console.log(
        `Waiting for encryption keys: ${userIds.size}/2 users ready (poll ${poll + 1}/30)`
      );
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.warn('waitForEncryptionKeys: timed out after 90s');
}

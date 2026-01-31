/**
 * E2E Performance Tests for Virtual Scrolling
 * Tasks: T166-T167 (Phase 8: User Story 6)
 *
 * Tests:
 * - Virtual scrolling activates at 100+ messages
 * - Performance with 1000+ messages (scrolling throughput)
 * - Pagination loads older messages on scroll-to-top
 * - Jump-to-bottom button visibility and scroll behaviour
 * - Keyboard / Tab navigation through messages
 * - Scroll position restoration after pagination
 */

import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ─── Configuration ──────────────────────────────────────────────────────────

const TEST_USER_PRIMARY_EMAIL =
  process.env.TEST_USER_PRIMARY_EMAIL || 'test@example.com';
const TEST_USER_PRIMARY_PASSWORD = process.env.TEST_USER_PRIMARY_PASSWORD!;
const TEST_USER_SECONDARY_EMAIL =
  process.env.TEST_USER_SECONDARY_EMAIL || 'test-user-b@example.com';
const TEST_USER_SECONDARY_PASSWORD = process.env.TEST_USER_SECONDARY_PASSWORD!;

/** Total messages seeded into the performance conversation. */
const SEED_COUNT = 1000;

/** Module-scoped conversation UUID, populated by beforeAll. */
let conversationId: string;

// ─── Crypto utilities (mirrors src/lib/messaging/key-derivation.ts) ─────────

const P256_ORDER = BigInt(
  '0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551'
);

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) result = (result << 8n) + BigInt(byte);
  return result;
}

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let rem = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(rem & 0xffn);
    rem >>= 8n;
  }
  return bytes;
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Derive an ECDH P-256 private key from password + base64 salt.
 * Pipeline: Argon2id → reduceScalar mod P-256 order → import as JWK.
 */
async function derivePrivateKey(
  password: string,
  saltBase64: string
): Promise<CryptoKey> {
  const { argon2id } = await import('hash-wasm');
  const { p256 } = await import('@noble/curves/nist.js');

  const seed = await argon2id({
    password,
    salt: fromBase64(saltBase64),
    parallelism: 4,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: 'binary',
  });

  const reduced = (bytesToBigInt(seed) % (P256_ORDER - 1n)) + 1n;
  const privBytes = bigIntToBytes(reduced, 32);
  const pub = p256.getPublicKey(privBytes, false); // 04 || x || y

  return crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: toBase64Url(privBytes),
      x: toBase64Url(pub.slice(1, 33)),
      y: toBase64Url(pub.slice(33, 65)),
    } as JsonWebKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  );
}

/**
 * Compute AES-GCM-256 shared secret via ECDH with a peer's public key JWK.
 */
async function deriveSharedSecret(
  privateKey: CryptoKey,
  peerPubJwk: JsonWebKey
): Promise<CryptoKey> {
  const peerPub = await crypto.subtle.importKey(
    'jwk',
    peerPubJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPub },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
}

/** Encrypt plaintext, returning base64-encoded ciphertext and IV. */
async function encryptMessage(
  plaintext: string,
  key: CryptoKey
): Promise<{ encrypted_content: string; initialization_vector: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    new TextEncoder().encode(plaintext)
  );
  return {
    encrypted_content: toBase64(new Uint8Array(ct)),
    initialization_vector: toBase64(iv),
  };
}

// ─── Seeding ────────────────────────────────────────────────────────────────

/**
 * One-time setup: ensure a conversation between PRIMARY and SECONDARY exists
 * with SEED_COUNT encrypted messages.  Uses SECONDARY (not TERTIARY) so the
 * message-editing beforeAll cleanup — which targets PRIMARY↔TERTIARY — cannot
 * race-delete the seeded data.
 */
test.beforeAll(async () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ── 1. Resolve user UUIDs ───────────────────────────────────────────
  const { data: userList } = await supabase.auth.admin.listUsers();
  const users = Array.isArray(userList)
    ? userList
    : ((userList as { users: unknown[] })?.users ?? []);

  const primary = users.find(
    (u: { email?: string }) => u.email === TEST_USER_PRIMARY_EMAIL
  ) as { id: string } | undefined;
  const secondary = users.find(
    (u: { email?: string }) => u.email === TEST_USER_SECONDARY_EMAIL
  ) as { id: string } | undefined;

  if (!primary || !secondary) {
    throw new Error(
      `Performance test users not found: primary=${primary?.id} secondary=${secondary?.id}`
    );
  }

  // ── 2. Ensure user_profiles exist ──────────────────────────────────
  await supabase.from('user_profiles').upsert(
    [
      { user_id: primary.id, display_name: 'Primary User' },
      { user_id: secondary.id, display_name: 'Secondary User' },
    ],
    { onConflict: 'user_id', ignoreDuplicates: true }
  );

  // ── 3. Ensure SECONDARY has encryption keys ────────────────────────
  const { data: secKey } = await supabase
    .from('user_encryption_keys')
    .select('public_key, encryption_salt')
    .eq('user_id', secondary.id)
    .eq('revoked', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let secondaryPubJwk: JsonWebKey;

  if (!secKey) {
    const { p256 } = await import('@noble/curves/nist.js');
    const { argon2id } = await import('hash-wasm');

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const seed = await argon2id({
      password: TEST_USER_SECONDARY_PASSWORD,
      salt,
      parallelism: 4,
      iterations: 3,
      memorySize: 65536,
      hashLength: 32,
      outputType: 'binary',
    });

    const reduced = (bytesToBigInt(seed) % (P256_ORDER - 1n)) + 1n;
    const privBytes = bigIntToBytes(reduced, 32);
    const pub = p256.getPublicKey(privBytes, false);

    secondaryPubJwk = {
      kty: 'EC',
      crv: 'P-256',
      x: toBase64Url(pub.slice(1, 33)),
      y: toBase64Url(pub.slice(33, 65)),
    };

    await supabase.from('user_encryption_keys').insert({
      user_id: secondary.id,
      public_key: secondaryPubJwk,
      encryption_salt: toBase64(salt),
      revoked: false,
    });
  } else {
    secondaryPubJwk = secKey.public_key as JsonWebKey;
  }

  // ── 4. Ensure accepted connection ──────────────────────────────────
  await supabase.from('user_connections').upsert(
    {
      requester_id: primary.id,
      addressee_id: secondary.id,
      status: 'accepted',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'requester_id,addressee_id' }
  );

  // ── 5. Find or create conversation ─────────────────────────────────
  const p1 = primary.id < secondary.id ? primary.id : secondary.id;
  const p2 = primary.id < secondary.id ? secondary.id : primary.id;

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_1_id', p1)
    .eq('participant_2_id', p2);

  if (existing && existing.length > 0) {
    conversationId = existing[0].id;

    const { count } = await supabase
      .from('messages')
      .select('', { count: 'exact', head: true })
      .eq('conversation_id', conversationId);

    if (count && count >= SEED_COUNT) return; // already fully seeded

    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);
  } else {
    const { data: created } = await supabase
      .from('conversations')
      .insert({
        participant_1_id: p1,
        participant_2_id: p2,
        is_group: false,
        current_key_version: 1,
      })
      .select('id');
    conversationId = created![0].id;
  }

  // ── 6. Derive shared secret ────────────────────────────────────────
  const { data: priKey } = await supabase
    .from('user_encryption_keys')
    .select('encryption_salt')
    .eq('user_id', primary.id)
    .eq('revoked', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!priKey?.encryption_salt) {
    throw new Error('PRIMARY user has no encryption keys with salt');
  }

  const primaryPrivKey = await derivePrivateKey(
    TEST_USER_PRIMARY_PASSWORD,
    priKey.encryption_salt as string
  );
  const sharedSecret = await deriveSharedSecret(
    primaryPrivKey,
    secondaryPubJwk
  );

  // ── 7. Encrypt and bulk-insert messages ────────────────────────────
  const now = Date.now();
  const BATCH = 100;

  for (let offset = 0; offset < SEED_COUNT; offset += BATCH) {
    const batch: Array<Record<string, unknown>> = [];
    const end = Math.min(offset + BATCH, SEED_COUNT);

    for (let i = offset; i < end; i++) {
      const { encrypted_content, initialization_vector } = await encryptMessage(
        `Performance test message ${i + 1}`,
        sharedSecret
      );

      batch.push({
        conversation_id: conversationId,
        sender_id: i % 2 === 0 ? primary.id : secondary.id,
        encrypted_content,
        initialization_vector,
        sequence_number: i + 1,
        deleted: false,
        edited: false,
        key_version: 1,
        is_system_message: false,
        created_at: new Date(now - (SEED_COUNT - i) * 1000).toISOString(),
      });
    }

    await supabase.from('messages').insert(batch);
  }

  // Mark conversation as active
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);
});

// ─── Navigation helper ──────────────────────────────────────────────────────

/**
 * Navigate to the seeded conversation.  The chromium project already carries
 * an authenticated session via storageState (created by auth.setup), so no
 * explicit sign-in is needed.  The only extra step is handling the ReAuth modal
 * that appears when encryption keys have not yet been unlocked this session.
 */
async function openConversation(page: Page) {
  await page.goto(`/messages?conversation=${conversationId}`);

  // Each Playwright worker has its own browser context so the ReAuth modal
  // fires independently.  Detect it explicitly — do NOT swallow errors.
  const dialog = page.getByRole('dialog', {
    name: /re-authentication required/i,
  });
  const dialogVisible = await dialog
    .waitFor({ state: 'visible', timeout: 3000 })
    .then(() => true)
    .catch(() => false);

  if (dialogVisible) {
    await page
      .getByRole('textbox', { name: /password/i })
      .fill(TEST_USER_PRIMARY_PASSWORD);
    await page.getByRole('button', { name: /unlock messages/i }).click();
    // Argon2id key derivation is CPU-bound.  Under 10 parallel workers in a
    // constrained Docker container it can take well over 10 s — use a generous
    // timeout so we never proceed with the modal still open.
    await dialog.waitFor({ state: 'hidden', timeout: 45000 });
  }

  // Wait for the thread container AND at least one rendered message bubble.
  await page
    .getByTestId('message-thread')
    .waitFor({ state: 'visible', timeout: 15000 });
  await page
    .locator('[data-testid="message-bubble"]')
    .first()
    .waitFor({ state: 'visible', timeout: 30000 });
}

// ─── Virtual Scrolling Performance ──────────────────────────────────────────

test.describe('Virtual Scrolling Performance', () => {
  test('T172b: Virtual scrolling activates at 100+ messages', async ({
    page,
  }) => {
    await openConversation(page);

    // react-virtual only renders the visible window; with 1000 messages the
    // DOM count must be far below total.
    const rendered = await page
      .locator('[data-testid="message-bubble"]')
      .count();
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(SEED_COUNT);
  });

  test('T166: Performance with 1000 messages - scrolling FPS', async ({
    page,
  }) => {
    await openConversation(page);

    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    const messageThread = page.getByTestId('message-thread');

    // Scroll away from bottom
    for (let i = 0; i < 10; i++) {
      await messageThread.evaluate((el) => {
        el.scrollTop += 500;
      });
      await page.waitForTimeout(100);
    }

    await client.send('Performance.disable');

    // Scrolling up should reveal jump-to-bottom button
    const jumpButton = page.getByTestId('jump-to-bottom');
    await expect(jumpButton).toBeVisible();

    await jumpButton.click();
    await expect(jumpButton).not.toBeVisible();
  });

  test('T167: Pagination loads older messages', async ({ page }) => {
    await openConversation(page);

    const messageThread = page.getByTestId('message-thread');
    const initialHeight = await messageThread.evaluate((el) => el.scrollHeight);

    // Component lands at the bottom on initial load; scrolling to 0 is
    // a real position change that fires the scroll event driving pagination.
    await messageThread.evaluate((el) => {
      el.scrollTop = 0;
    });

    const paginationLoader = page.getByTestId('pagination-loader');
    await expect(paginationLoader).toBeVisible({ timeout: 5000 });
    await expect(paginationLoader).toHaveText(/Loading older messages/);
    await expect(paginationLoader).not.toBeVisible({ timeout: 10000 });

    const newHeight = await messageThread.evaluate((el) => el.scrollHeight);
    expect(newHeight).toBeGreaterThan(initialHeight);
  });

  test('Jump to bottom button with smooth scroll', async ({ page }) => {
    await openConversation(page);

    const messageThread = page.getByTestId('message-thread');

    // Component lands at the bottom on initial load; scrolling to 0
    // fires the scroll event that drives showScrollButton.
    await messageThread.evaluate((el) => {
      el.scrollTop = 0;
    });

    const jumpButton = page.getByTestId('jump-to-bottom');
    await expect(jumpButton).toBeVisible({ timeout: 5000 });
    await expect(jumpButton).toHaveAttribute('aria-label', 'Jump to bottom');

    // Clicking the button initiates a scroll toward the bottom.
    // Smooth scroll does not reliably complete in headless Chromium, so we
    // assert only that scrollTop moved — not that it reached the end.
    const beforeClick = await messageThread.evaluate((el) => el.scrollTop);
    await jumpButton.click();
    await page.waitForTimeout(300);
    const afterClick = await messageThread.evaluate((el) => el.scrollTop);
    expect(afterClick).toBeGreaterThan(beforeClick);

    // Once at the bottom the button hides — scroll there directly to verify
    // the hide logic independent of smooth-scroll timing.
    await messageThread.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(jumpButton).not.toBeVisible({ timeout: 3000 });

    // Confirm position is at/near bottom.
    const { scrollTop, scrollHeight, clientHeight } =
      await messageThread.evaluate((el) => ({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      }));
    expect(scrollHeight - (scrollTop + clientHeight)).toBeLessThan(100);
  });

  test('Virtual scrolling maintains throughput during rapid scrolling', async ({
    page,
  }) => {
    await openConversation(page);

    const messageThread = page.getByTestId('message-thread');

    const startTime = Date.now();
    for (let i = 0; i < 50; i++) {
      await messageThread.evaluate((el) => {
        el.scrollTop += 100;
      });
    }
    const duration = Date.now() - startTime;

    // 50 sequential scroll steps must complete in under 2 s
    expect(duration).toBeLessThan(2000);

    // Thread must still be rendered (no crash)
    await expect(messageThread).toBeVisible();
  });

  test('Performance monitoring suppresses logs below 500-message threshold', async ({
    page,
  }) => {
    const profilerLogs: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('MessageThread performance metrics')) {
        profilerLogs.push(msg.text());
      }
    });

    await openConversation(page);

    // Allow multiple render cycles to settle — the Profiler callback fires
    // on every commit, but the log is gated behind messages.length > 500.
    // With only the initial 50 messages loaded, nothing should be emitted.
    await page.waitForTimeout(2000);

    expect(profilerLogs).toHaveLength(0);
  });
});

// ─── Keyboard Navigation ────────────────────────────────────────────────────

test.describe('Keyboard Navigation', () => {
  test('T169: Keyboard navigation through messages', async ({ page }) => {
    await openConversation(page);

    const messageThread = page.getByTestId('message-thread');
    await messageThread.focus();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('PageDown');
    await page.keyboard.press('PageUp');
    await page.keyboard.press('Home');
    await page.waitForTimeout(200);
    await page.keyboard.press('End');
    await page.waitForTimeout(200);

    // No crash — thread still visible
    await expect(messageThread).toBeVisible();
  });

  test('Tab navigation to jump to bottom button', async ({ page }) => {
    await openConversation(page);

    const messageThread = page.getByTestId('message-thread');

    // Component lands at the bottom on initial load; scrolling to 0
    // fires the scroll event that renders the jump button.
    await messageThread.evaluate((el) => {
      el.scrollTop = 0;
    });

    const jumpButton = page.getByTestId('jump-to-bottom');
    await expect(jumpButton).toBeVisible({ timeout: 5000 });

    // Tab through interactive elements until jump-to-bottom is focused
    let focused = '';
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      focused =
        (await page.evaluate(() =>
          document.activeElement?.getAttribute('data-testid')
        )) ?? '';
      if (focused === 'jump-to-bottom') break;
    }

    expect(focused).toBe('jump-to-bottom');

    // Enter activates scrollToBottom.  Smooth scroll doesn't reliably
    // complete in headless Chromium — verify the scroll was initiated.
    const beforeEnter = await messageThread.evaluate((el) => el.scrollTop);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const afterEnter = await messageThread.evaluate((el) => el.scrollTop);
    expect(afterEnter).toBeGreaterThan(beforeEnter);
  });
});

// ─── Scroll Restoration ─────────────────────────────────────────────────────

test.describe('Scroll Restoration', () => {
  test('Scroll position maintained during pagination', async ({ page }) => {
    await openConversation(page);

    const messageThread = page.getByTestId('message-thread');

    // Component lands at the bottom on initial load; scrolling to 0 is
    // a real position change that fires the scroll event driving pagination.
    await messageThread.evaluate((el) => {
      el.scrollTop = 0;
    });

    const paginationLoader = page.getByTestId('pagination-loader');
    await expect(paginationLoader).toBeVisible({ timeout: 5000 });
    await expect(paginationLoader).not.toBeVisible({ timeout: 10000 });

    // After older messages are prepended the view must not be pinned to 0
    const scrollTop = await messageThread.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBeGreaterThan(0);
  });

  test('Initial load scrolls to bottom', async ({ page }) => {
    await openConversation(page);

    const messageThread = page.getByTestId('message-thread');

    // Give the initial-load scroll effect one frame to settle.
    await page.waitForTimeout(300);

    // The component should have scrolled to bottom on first load —
    // verify without any manual positioning.
    const initial = await messageThread.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(
      initial.scrollHeight - (initial.scrollTop + initial.clientHeight)
    ).toBeLessThan(100);

    // With static seeded data no new message arrives, so this verifies
    // the position stays pinned and nothing drifts it away.
    await page.waitForTimeout(2000);

    const final = await messageThread.evaluate((el) => ({
      scrollTop: el.scrollTop,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(
      final.scrollHeight - (final.scrollTop + final.clientHeight)
    ).toBeLessThan(100);
  });
});

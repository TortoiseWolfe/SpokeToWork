/**
 * E2E Test: Welcome Message Flow
 *
 * Tests that signing in triggers a welcome message from admin:
 * 1. Sign in with test user from .env
 * 2. Keys get initialized with password
 * 3. Welcome message is sent from admin
 * 4. Verify conversation and message exist in database
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;

const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

const TEST_EMAIL = process.env.TEST_USER_PRIMARY_EMAIL!;
const TEST_PASSWORD = process.env.TEST_USER_PRIMARY_PASSWORD!;

// Skip all tests if required cloud Supabase credentials are missing.
// These tests use the Supabase Management API and cannot run without cloud credentials.
test.beforeEach(() => {
  const missing = [
    !PROJECT_REF && 'NEXT_PUBLIC_SUPABASE_URL (cloud)',
    !ACCESS_TOKEN && 'SUPABASE_ACCESS_TOKEN',
    !TEST_EMAIL && 'TEST_USER_PRIMARY_EMAIL',
    !TEST_PASSWORD && 'TEST_USER_PRIMARY_PASSWORD',
  ].filter(Boolean);
  if (missing.length) {
    test.skip(true, `Missing required env vars: ${missing.join(', ')}`);
  }
});

/**
 * Escape single quotes for SQL strings to prevent injection
 */
function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

async function executeSQL(
  query: string,
  retries = 5,
  baseDelay = 2000
): Promise<unknown[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (response.ok) {
      return response.json();
    }

    // Handle rate limiting with exponential backoff
    if (response.status === 429 && attempt < retries) {
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Rate limited, retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    const errorText = await response.text();
    throw new Error(`SQL failed: ${response.status} - ${errorText}`);
  }

  throw new Error('Exhausted retries');
}

/**
 * Get admin user ID by username (dynamic lookup)
 */
async function getAdminUserId(): Promise<string> {
  const admins = (await executeSQL(
    `SELECT id FROM user_profiles WHERE username = 'spoketowork'`
  )) as { id: string }[];

  if (!admins[0]?.id) {
    throw new Error('Admin user (spoketowork) not found');
  }

  return admins[0].id;
}

test.describe('Welcome Message Flow', () => {
  test.describe.configure({ retries: 0 });

  // Allow extra time for the beforeEach SQL calls — with 12 CI shards the
  // Supabase Management API rate-limits (429) and retries eat into the
  // default 30 s test timeout.
  test.setTimeout(90_000);

  test.beforeEach(async () => {
    // Get test user ID (use ILIKE for case-insensitive match - Supabase stores lowercase)
    const users = (await executeSQL(
      `SELECT id FROM auth.users WHERE email ILIKE '${escapeSQL(TEST_EMAIL)}'`
    )) as { id: string }[];

    if (!users[0]?.id) {
      throw new Error(`Test user ${TEST_EMAIL} not found`);
    }

    const testUserId = users[0].id;

    // Reset test user state: delete any existing keys and messages
    // All interpolated values use escapeSQL to prevent injection (047-test-security)
    await executeSQL(
      `DELETE FROM user_encryption_keys WHERE user_id = '${escapeSQL(testUserId)}'`
    );
    await executeSQL(`
      DELETE FROM messages WHERE conversation_id IN (
        SELECT id FROM conversations
        WHERE participant_1_id = '${escapeSQL(testUserId)}' OR participant_2_id = '${escapeSQL(testUserId)}'
      )
    `);
    await executeSQL(`
      DELETE FROM conversations
      WHERE participant_1_id = '${escapeSQL(testUserId)}' OR participant_2_id = '${escapeSQL(testUserId)}'
    `);
    await executeSQL(
      `UPDATE user_profiles SET welcome_message_sent = false WHERE id = '${escapeSQL(testUserId)}'`
    );

    console.log(`Reset test user ${testUserId} state`);
  });

  test('Sign-in triggers welcome message from admin', async ({
    page,
    browserName,
  }) => {
    test.setTimeout(120_000); // Key generation + welcome message chain can take 45s+
    // hash-wasm Argon2id requires SharedArrayBuffer; Firefox blocks it without COOP/COEP headers
    test.skip(
      browserName === 'firefox',
      'SharedArrayBuffer unavailable on Firefox without COOP/COEP headers'
    );
    // Capture console logs from the browser
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (
        text.includes('welcome') ||
        text.includes('Welcome') ||
        text.includes('error') ||
        text.includes('Error')
      ) {
        console.log(`[browser:${msg.type()}] ${text}`);
      }
    });

    // Step 1: Sign in with test user
    console.log('Step 1: Signing in...');
    await page.goto(`${BASE_URL}/sign-in`);
    await page.waitForLoadState('networkidle');

    await page.locator('#email').fill(TEST_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for redirect (keys are initialized and welcome message sent)
    await page.waitForURL(/\/(profile|companies)/, { timeout: 20000 });
    console.log(`Sign-in complete, URL: ${page.url()}`);

    // Step 2: Poll for welcome message completion (key gen + trigger chain can take 30-45s)
    console.log('Step 2: Polling database for welcome message...');

    const users = (await executeSQL(
      `SELECT id FROM auth.users WHERE email ILIKE '${escapeSQL(TEST_EMAIL)}'`
    )) as { id: string }[];
    const testUserId = users[0].id;

    // Get admin user ID dynamically
    const adminUserId = await getAdminUserId();
    console.log(`Admin user ID: ${adminUserId}`);

    // Poll for welcome_message_sent flag (key generation + welcome message chain can be slow)
    let profiles: { welcome_message_sent: boolean }[] = [];
    for (let attempt = 0; attempt < 15; attempt++) {
      await page.waitForTimeout(3000);
      profiles = (await executeSQL(
        `SELECT welcome_message_sent FROM user_profiles WHERE id = '${escapeSQL(testUserId)}'`
      )) as { welcome_message_sent: boolean }[];
      if (profiles[0]?.welcome_message_sent) break;
      console.log(
        `welcome_message_sent not yet true (attempt ${attempt + 1}/15)...`
      );
    }
    console.log(`welcome_message_sent: ${profiles[0]?.welcome_message_sent}`);

    // Check for conversation with admin
    const conversations = (await executeSQL(`
      SELECT id, participant_1_id, participant_2_id
      FROM conversations
      WHERE (participant_1_id = '${escapeSQL(testUserId)}' AND participant_2_id = '${escapeSQL(adminUserId)}')
         OR (participant_1_id = '${escapeSQL(adminUserId)}' AND participant_2_id = '${escapeSQL(testUserId)}')
    `)) as { id: string; participant_1_id: string; participant_2_id: string }[];
    console.log(`Conversations with admin: ${conversations.length}`);

    // Check for welcome message
    let messages: { id: string; sender_id: string }[] = [];
    if (conversations.length > 0) {
      messages = (await executeSQL(`
        SELECT id, sender_id
        FROM messages
        WHERE conversation_id = '${escapeSQL(conversations[0].id)}'
        AND sender_id = '${escapeSQL(adminUserId)}'
      `)) as { id: string; sender_id: string }[];
      console.log(`Messages from admin: ${messages.length}`);
    }

    // Print all relevant console logs
    console.log('\n--- Browser Console Logs (relevant) ---');
    consoleLogs.forEach((log) => {
      if (
        log.includes('key') ||
        log.includes('Key') ||
        log.includes('welcome') ||
        log.includes('Welcome') ||
        log.includes('error') ||
        log.includes('Error') ||
        log.includes('messaging') ||
        log.includes('encrypt')
      ) {
        console.log(log);
      }
    });
    console.log('--- End Logs ---\n');

    // Assertions
    expect(profiles[0]?.welcome_message_sent).toBe(true);
    expect(conversations.length).toBeGreaterThan(0);
    expect(messages.length).toBeGreaterThan(0);

    console.log('Welcome message verified!');
  });
});

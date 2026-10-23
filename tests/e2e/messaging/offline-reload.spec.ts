/**
 * E2E: /messages survives the network being unreachable (#96)
 *
 * Opening or reloading /messages while the backend cannot be reached used to
 * blank the page: auth.getUser() (a network call) returned null, the cached
 * keys in localStorage were never looked up, hasKeys() read "offline" as "no
 * keys", and the app redirected to /messages/setup, whose RSC payload cannot
 * load offline. Any throw on that path also left the key-check spinner up
 * forever.
 *
 * "Unreachable" is simulated by aborting every Supabase API request
 * (auth/rest/realtime/functions/storage) at the context level. We do NOT use
 * context.setOffline(true) for the reload: on localhost the service worker
 * deliberately skips /_next/ requests, so the app's own JS chunks could not be
 * fetched either and the page would fail before any app code ran, which tests
 * Chromium, not the app. supabase-js sees the same fetch failure either way
 * (AuthRetryableFetchError).
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  ensureConnection,
  ensureConversation,
  cleanupMessagingData,
  completeEncryptionSetup,
  dismissCookieBanner,
  waitForEncryptionKeys,
  dismissReAuthModal,
  injectPrebakedKeys,
} from './test-helpers';
import { loginAndVerify } from '../utils/auth-helpers';
import { getShardUsers } from '../utils/shard-users';

const BASE_URL = process.env.NEXT_PUBLIC_DEPLOY_URL || 'http://localhost:3000';

const { primary, tertiary } = getShardUsers();
const USER_A = primary;
const USER_B = {
  displayName: tertiary.email.split('@')[0],
  email: tertiary.email,
  password: tertiary.password,
};

const adminClient =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )
    : null;

const SUPABASE_API = [
  '**/auth/v1/**',
  '**/rest/v1/**',
  '**/realtime/v1/**',
  '**/functions/v1/**',
  '**/storage/v1/**',
];

async function makeBackendUnreachable(context: BrowserContext) {
  for (const pattern of SUPABASE_API) {
    await context.route(pattern, (route) =>
      route.abort('internetdisconnected')
    );
  }
}

/** Every URL the main frame visits, so a flash through /messages/setup is caught. */
function trackNavigations(page: Page): string[] {
  const visited: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) visited.push(frame.url());
  });
  return visited;
}

test.describe('Messages page with the backend unreachable (#96)', () => {
  test.describe.configure({ mode: 'serial' });
  test.slow(
    ({ browserName }) => browserName === 'firefox' || browserName === 'webkit',
    'Firefox/WebKit: slow Argon2id on CI'
  );

  let conversationId: string | null = null;

  test.beforeAll(async ({}, testInfo) => {
    testInfo.setTimeout(120000);
    if (adminClient) {
      await cleanupMessagingData(adminClient, USER_A.email, USER_B.email);
    }
  });

  test.beforeEach(async ({}, testInfo) => {
    testInfo.setTimeout(120000);
    if (adminClient) {
      await ensureConnection(adminClient, USER_A.email, USER_B.email);
      conversationId = await ensureConversation(
        adminClient,
        USER_A.email,
        USER_B.email
      );
      await waitForEncryptionKeys(adminClient, USER_A.email, USER_B.email);
    }
  });

  async function openThread(page: Page) {
    await loginAndVerify(page, {
      email: USER_A.email,
      password: USER_A.password,
    });
    await injectPrebakedKeys(page, USER_A.email);
    await page.goto(`${BASE_URL}/messages?conversation=${conversationId}`);
    await dismissCookieBanner(page);
    await completeEncryptionSetup(page);
    await dismissReAuthModal(page);
    await expect(
      page.locator('textarea[aria-label="Message input"]')
    ).toBeVisible({ timeout: 30000 });
  }

  test('reload with cached keys and no backend shows the thread, not setup, not a spinner', async ({
    browser,
  }) => {
    test.setTimeout(120000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await openThread(page);

      const visited = trackNavigations(page);
      await makeBackendUnreachable(context);
      await page.reload();

      // The cached keys were found without the network, so the thread is
      // usable: the input renders.
      await expect(
        page.locator('textarea[aria-label="Message input"]')
      ).toBeVisible({ timeout: 10000 });

      // Not a blank/error document, not the setup route, not a spinner.
      expect(page.url()).toContain('/messages');
      expect(page.url()).not.toContain('/messages/setup');
      expect(visited.some((u) => u.includes('/messages/setup'))).toBe(false);
      await expect(page.locator('.loading-spinner')).toHaveCount(0, {
        timeout: 10000,
      });
    } finally {
      await context.close();
    }
  });

  test('reload with no cached keys and no backend shows an offline notice, not setup', async ({
    browser,
  }) => {
    test.setTimeout(120000);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await openThread(page);

      // Drop the key cache so the page cannot restore, then cut the backend.
      await page.evaluate(() => {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith('stw_keys_')) localStorage.removeItem(k);
        }
      });

      const visited = trackNavigations(page);
      await makeBackendUnreachable(context);
      await page.reload();

      // "Cannot tell" is not "no keys": no redirect to key setup (Argon2id).
      await expect(page.getByTestId('messages-offline-notice')).toBeVisible({
        timeout: 10000,
      });
      expect(page.url()).not.toContain('/messages/setup');
      expect(visited.some((u) => u.includes('/messages/setup'))).toBe(false);
      await expect(page.locator('.loading-spinner')).toHaveCount(0, {
        timeout: 10000,
      });
    } finally {
      await context.close();
    }
  });
});

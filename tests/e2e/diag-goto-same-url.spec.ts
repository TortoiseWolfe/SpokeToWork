// THROWAWAY experiment (diag branch only, never merged): which way of moving between pages
// makes WebKit fail with "page.goto: WebKit encountered an internal error"?
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ID = '4fe9f00a-f1d4-416a-9e23-4f7fb9807ffc';

async function swState(page: Page) {
  return page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'no-sw-api';
    const regs = await navigator.serviceWorker.getRegistrations();
    return `regs=${regs.length} controller=${navigator.serviceWorker.controller ? 'yes' : 'no'}`;
  });
}

async function run(
  page: Page,
  label: string,
  url: string,
  rounds: number,
  gapMs: number,
  settle: boolean
) {
  let failures = 0;
  const messages: string[] = [];
  for (let i = 0; i < rounds; i++) {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    } catch (e) {
      failures++;
      messages.push(`round ${i}: ${String(e).split('\n')[0]}`);
    }
    if (settle) {
      await page
        .waitForLoadState('networkidle', { timeout: 5000 })
        .catch(() => {});
    }
    if (gapMs) await page.waitForTimeout(gapMs);
  }
  console.log(
    `DIAG ${label}: ${failures}/${rounds} failed; sw: ${await swState(page).catch(() => 'n/a')}; ${messages.join(' | ')}`
  );
  expect(failures, label).toBe(0);
}

test.describe('goto same URL', () => {
  test.setTimeout(300000);
  test('A /blog?x=1 (no slash, redirected) back to back, 1 s gap', async ({
    page,
  }) => {
    await run(page, 'A blog noslash gap1000', `${BASE}/blog?x=1`, 25, 1000, true);
  });
  test('B /blog/?x=1 (canonical) back to back, 1 s gap', async ({ page }) => {
    await run(page, 'B blog slash gap1000', `${BASE}/blog/?x=1`, 25, 1000, true);
  });
  test('C /blog?x=1 no gap, no settle', async ({ page }) => {
    await run(page, 'C blog noslash nogap', `${BASE}/blog?x=1`, 25, 0, false);
  });
  test('D /messages?conversation (signed in, app busy), 1 s gap', async ({
    page,
  }) => {
    await run(
      page,
      'D messages noslash gap1000',
      `${BASE}/messages?conversation=${ID}`,
      25,
      1000,
      true
    );
  });
  test('E /messages/?conversation (canonical), 1 s gap', async ({ page }) => {
    await run(
      page,
      'E messages slash gap1000',
      `${BASE}/messages/?conversation=${ID}`,
      25,
      1000,
      true
    );
  });
  test('F /messages?conversation after 20 s idle', async ({ page }) => {
    await page.goto(`${BASE}/messages?conversation=${ID}`);
    await page.waitForTimeout(20000);
    await run(
      page,
      'F messages noslash after idle',
      `${BASE}/messages?conversation=${ID}`,
      3,
      20000,
      true
    );
  });
});

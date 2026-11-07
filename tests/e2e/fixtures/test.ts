/**
 * The `test` every E2E spec imports, instead of the one from `@playwright/test`.
 *
 * ## What it changes
 *
 * Before a spec leaves a page with `page.goto()` or `page.reload()`, the old page is
 * given a moment to finish its own loads. That is all. Nothing else about `test`
 * differs.
 *
 * ## Why
 *
 * WebKit, in Playwright's Linux build, cancels every request the old page still has in
 * flight (route prefetches, chunks, data calls) when a navigation replaces it. It then
 * sometimes fails to load the NEXT page: `page.goto: WebKit encountered an internal
 * error`, with no `commit` event after about three seconds. Neither is a bug in the app.
 * Each one turned a required check flaky and a retry only hid it.
 *
 * The sibling project grand-daze measured this over 720 page loads per way of moving
 * between pages: moving on straight away failed 11 times, waiting for the network to go
 * quiet first failed 0 times (grand-daze issue 33 and its shared fixture). This is the
 * same wait, in one place instead of in each spec.
 *
 * ## What it is not
 *
 * - Not a retry, and not a longer timeout. The wait is best effort and capped at
 *   `SETTLE_LIMIT_MS`; if the page never goes quiet the navigation simply goes ahead, as
 *   it did before. A page that really is broken still fails on the navigation itself.
 * - Not a cure for navigations the PAGE starts (a link click, a redirect). It wraps the
 *   two calls a spec makes itself.
 *
 * ## How it is wired
 *
 * The `browser` fixture is wrapped once per worker so that every context made from it,
 * whether Playwright's own `context` and `page` fixtures or a spec's own
 * `browser.newContext()`, patches each page it opens. A spec gets this by importing
 * `test` from here; `tests/unit/e2e-specs-use-the-shared-test.test.ts` fails when one
 * imports `test` from `@playwright/test` directly.
 */
import {
  test as base,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';

/** Longest a page is given to go quiet before the next navigation goes ahead. */
export const SETTLE_LIMIT_MS = 5_000;

const PATCHED = Symbol.for('spoketowork.e2e.settleBeforeNavigating');

type Patchable = Page & { [PATCHED]?: true };

/** Wait for the network to go quiet, or give up quietly after the limit. */
async function waitForQuietOrGiveUp(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout: SETTLE_LIMIT_MS });
  } catch {
    // Best effort: a page that keeps a request open (a live subscription, a tile
    // layer) never goes quiet. The navigation goes ahead exactly as it did before.
  }
}

/** Make `page.goto` and `page.reload` wait for the page being left to go quiet first. */
function patchPage(page: Page): void {
  const p = page as Patchable;
  if (p[PATCHED]) return;
  p[PATCHED] = true;

  const originalGoto = page.goto.bind(page);
  const originalReload = page.reload.bind(page);

  const settle = async () => {
    // about:blank (a fresh page) has nothing in flight
    if (page.isClosed() || !/^https?:/.test(page.url())) return;
    await waitForQuietOrGiveUp(page);
  };

  page.goto = async (...args: Parameters<Page['goto']>) => {
    await settle();
    return originalGoto(...args);
  };
  page.reload = async (...args: Parameters<Page['reload']>) => {
    await settle();
    return originalReload(...args);
  };
}

function patchContext(context: BrowserContext): void {
  context.pages().forEach(patchPage);
  context.on('page', patchPage);
}

const CONTEXTS_PATCHED = Symbol.for(
  'spoketowork.e2e.settleBeforeNavigating.ctx'
);

/** Wrap `newContext` and `newPage` once, so every context made from `browser` is patched. */
function patchBrowser(browser: Browser): void {
  const b = browser as Browser & { [CONTEXTS_PATCHED]?: true };
  if (b[CONTEXTS_PATCHED]) return;
  b[CONTEXTS_PATCHED] = true;

  const originalNewContext = browser.newContext.bind(browser);
  browser.newContext = async (...args: Parameters<Browser['newContext']>) => {
    const context = await originalNewContext(...args);
    patchContext(context);
    return context;
  };

  const originalNewPage = browser.newPage.bind(browser);
  browser.newPage = async (...args: Parameters<Browser['newPage']>) => {
    const page = await originalNewPage(...args);
    patchPage(page);
    patchContext(page.context());
    return page;
  };
}

export const test = base.extend<object, { browser: Browser }>({
  browser: [
    async ({ browser }, use) => {
      patchBrowser(browser);
      await use(browser);
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';

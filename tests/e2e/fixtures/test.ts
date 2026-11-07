/**
 * The `test` every E2E spec imports, instead of the one from `@playwright/test`.
 *
 * ## What it changes
 *
 * Two things, both waits and nothing else:
 *
 * 1. Before a spec leaves a page with `page.goto()` or `page.reload()`, the old page is
 *    given a moment to finish its own loads.
 * 2. After `page.goto()` lands on the sign-in page, the call does not return until React
 *    has attached to the sign-in form (the same wait `loginAndVerify` makes).
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
 * "Quiet" here means quiet right now: no request of the page's is in flight and none has
 * started or ended for `QUIET_MS`. Playwright's `networkidle` alone is not enough: it
 * fires once after the load and then returns at once for ever, so a page that started
 * new calls a second later (the messages page reading and marking messages) counted as
 * quiet while those calls were still running, and WebKit failed the next load with the
 * internal error (CI run 42409134076, delivery status spec).
 *
 * The second wait is for the same kind of flake from the other side. `goto` returns at
 * the `load` event, which can be before React hydrates the form, and hydration resets
 * the controlled inputs: a spec that fills the email straight after `goto('/sign-in')`
 * lost it (the failure screenshots showed an empty Email box beside a filled Password
 * box, then the browser's own "email is required" check blocked the submit). Specs that
 * sign in without `loginAndVerify` (their own users, their own contexts) hit this in
 * WebKit.
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
import { waitForSignInFormHydrated } from '../utils/auth-helpers';
import {
  test as base,
  type Browser,
  type BrowserContext,
  type Page,
  type Request,
} from '@playwright/test';

/** Longest a page is given to go quiet before the next navigation goes ahead. */
export const SETTLE_LIMIT_MS = 5_000;

const PATCHED = Symbol.for('spoketowork.e2e.settleBeforeNavigating');

type Patchable = Page & { [PATCHED]?: true };

/** How long a page must have no request starting or finishing to count as quiet. */
export const QUIET_MS = 500;

const ACTIVITY = Symbol.for('spoketowork.e2e.requestActivity');

type Activity = { pending: Set<Request>; lastChange: number };

type Tracked = Page & { [ACTIVITY]?: Activity };

/**
 * Count the page's requests as they start and end.
 *
 * Playwright's `waitForLoadState('networkidle')` is a one-time lifecycle event: once the
 * page has been idle after loading it returns at once, however many requests the app has
 * started since (reading messages, marking them read, refreshing a session). A spec that
 * moves on a second or two after the page loaded therefore left with calls still in
 * flight, which is exactly what makes WebKit fail the next load. This count answers
 * "is it quiet right now".
 */
function trackRequests(page: Page): Activity {
  const state: Activity = { pending: new Set(), lastChange: Date.now() };
  (page as Tracked)[ACTIVITY] = state;
  const started = (request: Request) => {
    state.pending.add(request);
    state.lastChange = Date.now();
  };
  const ended = (request: Request) => {
    state.pending.delete(request);
    state.lastChange = Date.now();
  };
  page.on('request', started);
  page.on('requestfinished', ended);
  page.on('requestfailed', ended);
  return state;
}

/** Wait for the network to go quiet, or give up quietly after the limit. */
async function waitForQuietOrGiveUp(page: Page): Promise<void> {
  const deadline = Date.now() + SETTLE_LIMIT_MS;
  try {
    await page.waitForLoadState('networkidle', { timeout: SETTLE_LIMIT_MS });
    const state = (page as Tracked)[ACTIVITY];
    while (state && !page.isClosed() && Date.now() < deadline) {
      if (
        state.pending.size === 0 &&
        Date.now() - state.lastChange >= QUIET_MS
      ) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } catch {
    // Best effort: a page that keeps a request open (a live subscription, a tile
    // layer) never goes quiet. The navigation goes ahead exactly as it did before.
  }
}

/** True when the page is showing the sign-in route (with or without the trailing slash). */
function isSignInPage(page: Page): boolean {
  try {
    return /\/sign-in\/?$/.test(new URL(page.url()).pathname);
  } catch {
    return false;
  }
}

/** Make `page.goto` and `page.reload` wait for the page being left to go quiet first. */
function patchPage(page: Page): void {
  const p = page as Patchable;
  if (p[PATCHED]) return;
  p[PATCHED] = true;
  trackRequests(page);

  const originalGoto = page.goto.bind(page);
  const originalReload = page.reload.bind(page);

  const settle = async () => {
    // about:blank (a fresh page) has nothing in flight
    if (page.isClosed() || !/^https?:/.test(page.url())) return;
    await waitForQuietOrGiveUp(page);
  };

  page.goto = async (...args: Parameters<Page['goto']>) => {
    await settle();
    const response = await originalGoto(...args);
    if (!page.isClosed() && isSignInPage(page)) {
      try {
        await waitForSignInFormHydrated(page);
      } catch {
        // Best effort: a sign-in page with no form (already signed in and
        // redirected, or genuinely broken) goes back to the spec unchanged.
      }
    }
    return response;
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

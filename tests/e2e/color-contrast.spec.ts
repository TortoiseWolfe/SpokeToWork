import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/**
 * WCAG AAA colour-contrast gate (#79).
 *
 * Before this, page-level contrast coverage was ONE test, on ONE route, at ONE
 * theme, at AA: tests/e2e/tests/accessibility.spec.ts runs axe against `/` only,
 * under whatever theme Playwright's default `colorScheme: 'light'` produces. So
 * `spoketowork-dark` — the shipped default — had never been contrast-checked,
 * and `color-contrast-enhanced` (AAA) had never been run at all.
 *
 * Two other things looked like coverage and were not: storybook-contrast-audit
 * prints violations then asserts only that stories exist (and skips itself when
 * Storybook is not running, i.e. always in CI), and audit-pages.mjs hardcoded
 * an axe-core path that no longer resolves.
 *
 * This asserts on `violations` only — cases where axe MEASURED the ratio and
 * confirmed it is under the AAA threshold (7:1 normal text, 4.5:1 large).
 * `incomplete` is counted in the failure message but never fails the test:
 * DaisyUI `.btn` gradients stop axe resolving a flat background colour, so
 * every button lands in the needs-review bucket. Those are not defects, and
 * asserting on them would make this gate unusable.
 */

interface ContrastNodeData {
  fgColor?: string;
  bgColor?: string;
  contrastRatio?: number;
  expectedContrastRatio?: string;
  fontSize?: string;
  fontWeight?: string;
}
interface AxeNode {
  target?: string[];
  html?: string;
  any?: { data?: ContrastNodeData }[];
}
interface AxeRuleResult {
  id: string;
  nodes: AxeNode[];
}
interface AxeResults {
  violations: AxeRuleResult[];
  incomplete: AxeRuleResult[];
}

/**
 * Only the two brand themes.
 *
 * These are the only ones with hand-written AAA overrides (globals.css, the
 * `[data-theme='spoketowork-*']` blocks tuning .label-text, inactive .tab,
 * .text-error/info/success/warning, th, .card). The 32 stock DaisyUI themes the
 * switcher also offers were never authored to AAA, so sweeping them would
 * produce a large permanently-red baseline about someone else's palettes.
 *
 * This gate is theme-agnostic: adding a theme here is the whole cost of gating
 * it, which is the property you want in place BEFORE authoring new palettes.
 */
const THEMES = ['spoketowork-light', 'spoketowork-dark'] as const;

const APP_DIR = join(process.cwd(), 'src/app');

/**
 * ROUTES ARE ENUMERATED, NOT LISTED.
 *
 * The existing contrast test covers 1 of this app's 39 routes because its route
 * list is a hardcoded `page.goto('/')`. A green run there means "the homepage
 * meets AA in one theme", which is not what anyone reads it as.
 *
 * Deriving from `src/app/**\/page.tsx` means a new route is covered the day it
 * is created, and opting one out becomes an explicit, visible entry below
 * rather than an omission nobody notices.
 */
function enumerateRoutes(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Route groups `(name)` and private folders `_name` contribute no URL
      // segment. `[slug]` DOES — collapsing it too would merge
      // /blog/tags/[tag] onto /blog/tags and produce duplicate test titles,
      // which Playwright rejects outright.
      const seg =
        entry.name.startsWith('(') || entry.name.startsWith('_')
          ? ''
          : `/${entry.name}`;
      out.push(...enumerateRoutes(join(dir, entry.name), prefix + seg));
    } else if (entry.name === 'page.tsx') {
      out.push(prefix === '' ? '/' : prefix);
    }
  }
  return out;
}

/**
 * Routes this sweep cannot measure, each with the reason. Never silent.
 *
 * The sweep runs SIGNED OUT (see `test.use` below), so anything auth-gated
 * renders a loading spinner or an "Authentication Required" card rather than
 * the page — measuring those would report contrast for a spinner and call the
 * route covered.
 */
const EXCLUDED: Record<string, string> = {
  '/profile':
    'ProtectedRoute — renders a spinner then redirects when signed out',
  '/account':
    'ProtectedRoute — renders a spinner then redirects when signed out',
  '/payment-demo':
    'ProtectedRoute, plus Stripe/PayPal third-party iframes we do not control',
  '/admin': 'useAdminGate redirects to /sign-in when signed out',
  '/admin/users': 'useAdminGate redirects to /sign-in when signed out',
  '/admin/moderation': 'useAdminGate redirects to /sign-in when signed out',
  '/employer': 'redirects to /sign-in when signed out',
  '/companies': 'redirects to /sign-in when signed out',
  '/messages':
    'encryption-key flow; bounces to /messages/setup when no keys exist',
  '/messages/setup':
    'encryption-key derivation (Argon2id), slow and auth-gated',
  '/messages/new-group': 'auth-gated group creation flow',
  '/conversations':
    'server redirect to /messages that still emitted a page under output: export — unstable target',
  '/map':
    'MapLibre WebGL canvas. CI runners have no GPU (playwright.config.ts already excludes map.spec.ts from firefox for this), and canvas pixels are not a contrast subject',
  '/themes':
    'renders 34 nested data-theme preview scopes at once, so violations attribute to preview cards rather than the active theme',
  '/auth/callback':
    'transient OAuth handler — redirects on load, no UI to measure',
  '/reset-password': 'transient token-driven state',
  '/verify-email': 'transient token-driven state',
};

/**
 * Dynamic segments need a real instance — the template alone proves nothing.
 * Both URLs verified present in the built `out/` directory.
 */
const INSTANCES: Record<string, string> = {
  '/blog/[slug]': '/blog/getting-started-job-hunt-companion',
  '/blog/tags/[tag]': '/blog/tags/career',
};

/**
 * ROUTE TEMPLATES ARE NOT `page.tsx`, SO ENUMERATION CANNOT SEE THEM.
 *
 * `not-found.tsx` renders on EVERY unmatched URL in the product and has no
 * route of its own, so it sits outside any enumeration-based gate. A template
 * cannot be enumerated; it has to be REACHED, by requesting a path deliberately
 * chosen not to match anything.
 *
 * `contains` then proves the probe actually landed on that template. Without
 * it, a path that later started resolving to something else would leave this
 * measuring the wrong page while still reporting the template as covered —
 * which is precisely the class of failure this issue is about.
 */
const TEMPLATE_PROBES: Record<string, { source: string; contains: string }> = {
  '/__contrast-probe-unmatched-route__/': {
    source: 'src/app/not-found.tsx',
    contains: 'Page Not Found',
  },
};

/**
 * Templates no navigation can reach, recorded rather than left silent — the
 * same contract as EXCLUDED.
 */
const UNREACHABLE_TEMPLATES: Record<string, string> = {
  'src/app/global-error.tsx':
    'renders only when the ROOT layout itself throws. No URL reaches it, and a ' +
    'static export offers no way to induce that from a navigation, so a route ' +
    'sweep cannot measure it. If it grows real UI it needs a component-level ' +
    'contrast test, not this gate.',
};

const ALL = enumerateRoutes(APP_DIR).sort();
const SKIPPED = ALL.filter((r) => r in EXCLUDED);
const PAGES = [
  ...ALL.filter((r) => !(r in EXCLUDED)).map((r) => INSTANCES[r] ?? r),
  ...Object.keys(TEMPLATE_PROBES),
];

// Printed loudly at collection time, so a shrinking sweep can never read as a
// passing one.
console.log(
  `[color-contrast] sweeping ${PAGES.length} paths ` +
    `(${ALL.length - SKIPPED.length} of ${ALL.length} routes + ` +
    `${Object.keys(TEMPLATE_PROBES).length} route template(s)) x ${THEMES.length} themes` +
    (SKIPPED.length
      ? `\n[color-contrast] excluded ${SKIPPED.length}:\n` +
        SKIPPED.map((r) => `  - ${r}: ${EXCLUDED[r]}`).join('\n')
      : '') +
    `\n[color-contrast] route templates reached by probe:\n` +
    Object.entries(TEMPLATE_PROBES)
      .map(([p, t]) => `  - ${t.source} via ${p}`)
      .join('\n') +
    `\n[color-contrast] route templates NOT measurable here:\n` +
    Object.entries(UNREACHABLE_TEMPLATES)
      .map(([f, why]) => `  - ${f}: ${why}`)
      .join('\n')
);

// axe-core is a transitive dependency under pnpm's strict node_modules layout;
// resolve it through jest-axe (a direct dependency) so the path survives
// lockfile bumps. Playwright's TS transform runs as CJS, so `require` is
// ambient here.
const jestAxeEntry: string = require.resolve('jest-axe');
const axePath: string = require.resolve('axe-core/axe.min.js', {
  paths: [dirname(jestAxeEntry)],
});
const axeSource = readFileSync(axePath, 'utf8');

// File scope, not inside the describe: Playwright rejects screenshot/video/trace
// in a describe-level use() because they force a new worker.
//
// Signed OUT, deliberately. Under storage-state-auth.json, AuthContext
// validates the session and, on a static export, a failure redirects the page
// to `/` — a multi-route sweep would then audit the homepage N times and pass.
// See the same warning at tests/e2e/accessibility/contact-form-keyboard.spec.ts.
// That fixture also already seeds cookie-consent, so the banner needs no
// handling here.
//
// Artifacts off: ~46 tests, and the failure message already carries the
// fg/bg/ratio triple, so per-step screenshots would bloat test-results for
// nothing.
test.use({
  storageState: './tests/e2e/fixtures/storage-state.json',
  viewport: { width: 1280, height: 1024 },
  screenshot: 'off',
  video: 'off',
  trace: 'off',
});

test.describe('WCAG AAA color-contrast-enhanced (violations only)', () => {
  /**
   * Coverage floor. Upstream has none; this is a genuine addition.
   *
   * Everything else here is per-(theme, route), so an enumeration that silently
   * returned nothing would produce zero tests and a green run — the exact shape
   * of failure #76 catalogued. This fails instead.
   */
  test('sweep manifest is not empty and matches the route tree', () => {
    expect(
      ALL.length,
      'enumerateRoutes found no routes — src/app layout changed or the walk broke'
    ).toBeGreaterThan(30);

    expect(
      PAGES.length,
      'the swept path list collapsed; EXCLUDED may have grown silently'
    ).toBeGreaterThan(15);

    // Every EXCLUDED key must correspond to a route that actually exists,
    // otherwise an exclusion silently outlives the route it was written for
    // and quietly stops meaning anything.
    const stale = Object.keys(EXCLUDED).filter((r) => !ALL.includes(r));
    expect(
      stale,
      `EXCLUDED entries for routes that no longer exist: ${stale.join(', ')}`
    ).toEqual([]);

    const staleInstances = Object.keys(INSTANCES).filter(
      (r) => !ALL.includes(r)
    );
    expect(
      staleInstances,
      `INSTANCES entries for routes that no longer exist: ${staleInstances.join(', ')}`
    ).toEqual([]);
  });

  for (const theme of THEMES) {
    for (const path of PAGES) {
      test(`${theme} — ${path}`, async ({ page }) => {
        // Seed localStorage rather than setting data-theme directly.
        //
        // ThemeScript.tsx reads localStorage.getItem('theme') before falling
        // back to prefers-color-scheme, and re-applies at DOMContentLoaded —
        // so an attribute set from the test gets clobbered, while a seeded
        // value is what ThemeScript itself computes from. It also survives a
        // reload.
        await page.addInitScript(
          (t) => window.localStorage.setItem('theme', t),
          theme
        );

        // NOT networkidle: /sign-in, /sign-up, /forgot-password and
        // /messages/setup mount pollers that never let the network settle.
        await page.goto(path, { waitUntil: 'domcontentloaded' });
        // Give client-side redirects and hydration a chance to finish, so the
        // execution context is stable before axe is injected.
        await page.waitForLoadState('load').catch(() => {});
        await page.waitForTimeout(1200);

        // Confirm the theme actually took, or every "no violations" result
        // below would be a measurement of the wrong palette.
        await expect
          .poll(
            () => page.evaluate(() => document.documentElement.dataset.theme),
            { message: `data-theme never became ${theme} on ${path}` }
          )
          .toBe(theme);

        // Prove the probe landed on the template it claims to measure.
        const probe = TEMPLATE_PROBES[path];
        if (probe) {
          await expect(
            page.getByText(probe.contains).first(),
            `${path} must render ${probe.source} (looking for "${probe.contains}"); ` +
              `if it does not, this test is measuring the wrong page`
          ).toBeVisible();
        }

        await page.evaluate(axeSource);
        const results = await page.evaluate<AxeResults>(async () => {
          // Playwright RETRIES an evaluate whose execution context is
          // destroyed mid-call — which is what a client-side redirect or a
          // late hydration does. A bare axe.run() then starts a second time
          // while the first is still in flight and throws "Axe is already
          // running". Caching the promise makes the retry await the original.
          const w = window as unknown as {
            __stwAxeRun?: Promise<AxeResults>;
            axe: { run: (d: Document, o: unknown) => Promise<AxeResults> };
          };
          w.__stwAxeRun ??= w.axe.run(document, {
            runOnly: { type: 'rule', values: ['color-contrast-enhanced'] },
            resultTypes: ['violations', 'incomplete'],
          });
          return w.__stwAxeRun;
        });

        // Dump the fg/bg/ratio triple so a fix does not need a second run to
        // diagnose.
        const details = results.violations.flatMap((v) =>
          v.nodes.map((n) => {
            const d = n.any?.[0]?.data ?? {};
            return {
              target: n.target?.[0],
              html: n.html?.slice(0, 100),
              fg: d.fgColor,
              bg: d.bgColor,
              ratio: d.contrastRatio,
              expected: d.expectedContrastRatio,
              fontSize: d.fontSize,
              fontWeight: d.fontWeight,
            };
          })
        );

        const incompleteCount = results.incomplete.reduce(
          (n, v) => n + v.nodes.length,
          0
        );

        expect(
          details,
          `color-contrast-enhanced (AAA) violations on ${path} [${theme}] ` +
            `(${incompleteCount} incomplete/needs-review — expected, not a failure):\n` +
            JSON.stringify(details, null, 2)
        ).toHaveLength(0);
      });
    }
  }
});

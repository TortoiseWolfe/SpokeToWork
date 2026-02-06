# E2E Test Failure Log

> Reference for diagnosing and fixing E2E test failures in CI.
> Last updated from GitHub Actions Run #161 (2026-02-06).

## Run #161 Summary

| Field  | Value                                                          |
| ------ | -------------------------------------------------------------- |
| Run    | #161 (ID: 21740037622)                                         |
| Commit | `ae6f43b` — fix(docker): use dynamic ports in E2E compose      |
| Date   | 2026-02-06 05:36–06:12 UTC (~36 min)                           |
| Result | **FAILURE** — 23 of 119 tests failed in the one shard that ran |

## Pipeline Status

| Stage                 | Status    | Notes                                                         |
| --------------------- | --------- | ------------------------------------------------------------- |
| Build                 | PASS      | Next.js static export builds successfully                     |
| Smoke Tests           | PASS      | `protected-routes.spec.ts`, `sign-up.spec.ts` — chromium only |
| Auth Setup            | PASS      | Generates `storage-state-auth.json` for authenticated tests   |
| E2E (firefox 3/4)     | **FAIL**  | 23 failed, 96 passed out of 119                               |
| E2E (11 other shards) | CANCELLED | fail-fast triggered by firefox 3/4                            |

Only 1 of 12 shards ran to completion. The other 11 (chromium 1–4, firefox 1/2/4, webkit 1–4) were cancelled immediately when firefox 3/4 failed.

---

## Failing Tests by Category

### Category 1: Map/Route Rendering (12 tests)

Map layers and polylines not rendering in CI. All are assertion failures on DOM element visibility or CSS properties.

| Test File                                      | Test Name                                                 | Error                                               |
| ---------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `routes/active-route-visual.spec.ts:32`        | map loads with route polylines visible                    | `expect(received).toBe(expected)`                   |
| `routes/active-route-visual.spec.ts:88`        | route layers have correct styling properties              | `expect(received).toBe(expected)`                   |
| `routes/route-home-connection.spec.ts:33`      | BUG CHECK: Does route geometry START at home coordinates? | `expect(received).toBe(expected)`                   |
| `routes/route-visual-verification.spec.ts:34`  | VERIFY: active route has glow layer on map                | `expect(received).toBe(expected)`                   |
| `routes/route-visual-verification.spec.ts:88`  | VERIFY: active route line is wider (10px vs 6px)          | `expect(received).toBeGreaterThan(expected)`        |
| `routes/route-visual-verification.spec.ts:140` | VERIFY: switching routes changes map layers               | `expect(received).toBe(expected)`                   |
| `routes/route-visual-verification.spec.ts:238` | VERIFY: route polyline connects home to companies         | `expect(received).toBe(expected)`                   |
| `routes/route-visual-verification.spec.ts:336` | VERIFY: home marker visible for user route                | `expect(received).not.toBe(expected)`               |
| `routes/start-end-markers.spec.ts:47`          | map page should show start/end markers for active route   | `expect(locator).toBeVisible()` — element not found |

**Likely root cause**: Leaflet/MapLibre map layers not initializing in headless CI. Could be missing CSS imports, WebGL issues in headless browsers, or route data not loading (no API/Supabase connection in CI static export).

### Category 2: OAuth/Security Timeouts (5 tests)

All 5 tests in `security/oauth-csrf.spec.ts` time out clicking OAuth elements.

| Test File                         | Test Name                                                  | Error                                     |
| --------------------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| `security/oauth-csrf.spec.ts:8`   | should reject OAuth callback with modified state parameter | `locator.click: Timeout 10000ms exceeded` |
| `security/oauth-csrf.spec.ts:61`  | should prevent OAuth callback without state parameter      | `locator.click: Timeout 10000ms exceeded` |
| `security/oauth-csrf.spec.ts:79`  | should reject reused state token (replay attack)           | `locator.click: Timeout 10000ms exceeded` |
| `security/oauth-csrf.spec.ts:121` | should timeout expired state tokens                        | `locator.click: Timeout 10000ms exceeded` |
| `security/oauth-csrf.spec.ts:146` | should validate state session ownership                    | `locator.click: Timeout 10000ms exceeded` |

**Likely root cause**: No OAuth provider configured in CI. These tests click OAuth login buttons that redirect to external providers — in a static export served by `npx serve`, there's no server-side OAuth handler. These tests may need to be skipped in CI or mocked.

### Category 3: Accessibility Violations (6 tests)

Automated axe-core checks detecting WCAG violations.

| Test File                         | Test Name                                             | Error                                               |
| --------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| `tests/accessibility.spec.ts:9`   | homepage passes automated accessibility checks        | 4 accessibility violations detected                 |
| `tests/accessibility.spec.ts:19`  | themes page passes automated accessibility checks     | 4 accessibility violations detected                 |
| `tests/accessibility.spec.ts:27`  | components page passes automated accessibility checks | 4 accessibility violations detected                 |
| `tests/accessibility.spec.ts:35`  | accessibility settings page passes automated checks   | 2–5 violations (varies by retry)                    |
| `tests/accessibility.spec.ts:43`  | skip to main content link works                       | `expect(locator).toBeFocused()` — element not found |
| `tests/accessibility.spec.ts:146` | ARIA landmarks are present                            | `expect(locator).toHaveCount(expected)` failed      |
| `tests/accessibility.spec.ts:164` | color contrast meets WCAG standards                   | `expect(received).toHaveLength(expected)`           |
| `tests/accessibility.spec.ts:322` | error messages are associated with form fields        | `expect(received).toBe(expected)`                   |

**Likely root cause**: Actual a11y regressions in the UI. The violations are real (ARIA landmarks, color contrast, skip-link, form field associations). These need component-level fixes.

### Category 4: Security/Brute-Force (2 tests)

| Test File                          | Test Name                                          | Error                                               |
| ---------------------------------- | -------------------------------------------------- | --------------------------------------------------- |
| `security/brute-force.spec.ts:120` | should track different users independently         | `expect(locator).toBeVisible()` — element not found |
| `security/brute-force.spec.ts:159` | should track different attempt types independently | `expect(locator).toBeVisible()` — element not found |

**Likely root cause**: Rate-limiting UI feedback not rendering. The brute-force tests expect visible feedback elements after multiple failed login attempts. May require Supabase Edge Functions or rate-limiting middleware not available in static export.

---

## Environment Context

- **CI builds a static export** (`next build && next export`) served by `npx serve out -l 3000`
- **No server-side API routes** in production — all server logic is in Supabase
- **No Supabase connection in CI** for most E2E tests (except auth setup which uses real Supabase)
- **Browsers**: Chromium, Firefox, WebKit — sharded 4 ways each (12 total jobs)
- **Fail-fast**: Enabled — first shard failure cancels all remaining shards

## Historical Context

E2E tests have failed for runs 151–161. Recent fix attempts:

- Run 154: fix(e2e): resolve critical E2E test failures in CI
- Run 155: feat(docker): Add self-hosted local Supabase via Docker Compose profiles
- Run 156: fix(docker): fix Supabase auth URLs and port isolation
- Run 157: fix(e2e): resolve TypeScript errors blocking git push
- Runs 158–159: refactor(ci): migrate non-sensitive secrets to GitHub Actions variables
- Run 160: fix(deps): resolve CI audit failures (to-ico removal, next bump)
- Run 161: fix(docker): use dynamic ports in E2E compose

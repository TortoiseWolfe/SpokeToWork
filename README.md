```
Fix SpokeToWork E2E tests until ALL 18 shards pass (6 per browser × 3 browsers).

BASELINE: 12/18 pass (run 23963311165 on a951619, 2026-04-03).
Failing: shard 2/6 + 3/6 on all 3 browsers. E2E has NEVER passed all 18.

METHODOLOGY (follow strictly, no guessing):

1. PULL LOGS:
   gh run list --limit 1 --workflow e2e.yml
   If in_progress → report and wait.
   If completed → gh run view <ID> 2>&1 | grep -E "(✓|X) E2E"
   If all 18 green → DONE, celebrate.

2. GET FAILURE DETAILS (for each failing shard):
   gh api repos/TortoiseWolfe/SpokeToWork/actions/jobs/<JOB_ID>/logs 2>&1 | grep -P "  \d+\) \[" | head -12
   gh api repos/TortoiseWolfe/SpokeToWork/actions/jobs/<JOB_ID>/logs 2>&1 | grep -E "Failed to fetch|Connection terminated|TypeError|Error:" | head -10

3. CONFIRMED ROOT CAUSES (from deep log analysis 2026-04-03):

   SHARD 3/6 — sendMessage() silently fails, optimistic message never swaps
   a. Message is sent (textarea fill + Send click). Optimistic message appears instantly
      with data-message-id="optimistic-*". But the ID NEVER swaps to a server UUID.
   b. After 45s timeout, test reloads page. Message is GONE (never persisted to DB).
   c. The optimistic message STAYS in the DOM (not removed by page.tsx catch block),
      which means sendMessage() returned { queued: true } — NOT threw an error.
   d. Browser console output is NOT captured by Playwright in CI. Cannot see
      app-level logs (sendMessage errors, RLS retries, etc.) in the job logs.
   e. The sendMessage() flow before INSERT: getUser() → ensureKeys() →
      conversations.select() → getUserPublicKey() → importKey() → deriveSharedSecret()
      → encryptMessage() → INSERT. If any of these hang or fail, INSERT never fires.
   f. isTransientFetchError() was added to the INSERT retry loop, but the INSERT may
      not even be reached if earlier steps fail.
   g. KEY DIAGNOSTIC GAP: No browser console capture in CI. Need to add
      page.on('console') listener in message-editing tests to capture app-level logs.
   h. Files: src/services/messaging/message-service.ts (sendMessage flow lines 116-478),
      src/app/messages/page.tsx (handleSendMessage lines 399-468),
      tests/e2e/messaging/message-editing.spec.ts (findMessageBubble lines 57-90)

   SHARD 2/6 — Mixed read-replica lag + test cleanup races
   a. friend-requests (chromium): "Send Request" button never appears after 10-15 retries.
      Read replica hasn't replicated user_connections deletion from cleanupConnections().
      Replica lag exceeds 45s under CI load. Tests already poll but not long enough.
   b. employer-team (chromium): cleanup() deletes connections but DOESN'T POLL for
      replication (unlike cleanupConnections() which polls 20×2s). On retry, INSERT
      hits "duplicate key" because old record is still on replica.
      File: tests/e2e/employer/employer-team-workflow.spec.ts (cleanup function ~line 139)
   c. employer-team (chromium): after updating status to 'accepted', the .single() query
      reads stale 'pending' from replica. Needs polling loop before asserting.
   d. companies-crud (chromium + webkit): getDrawerApplicationCount() returns stale count
      after delete. Needs retry loop before assertion.
   e. encrypted-messaging (firefox): 3 send attempts all fail DB verification (replica lag).
      waitForMessageDelivery reloads page, but Firefox closes the browser context during
      reload. page.reload() throws "Target page...has been closed".
      File: tests/e2e/messaging/test-helpers.ts:449 (wrap reload in try-catch)
   f. map theme toggle (webkit only): test polls isStyleLoaded() but WebKit fires
      style.load before React re-renders <BikeRoutesLayer>. Source doesn't exist yet.
      FIX: poll for getSource('all-bike-routes') !== undefined, not just isStyleLoaded().
      File: tests/e2e/map.spec.ts:441

4. KEY FILES:
   - src/services/messaging/message-service.ts — isRLSError + retry loop (line ~310-375)
   - tests/e2e/employer/employer-team-workflow.spec.ts — cleanup() needs replication polling
   - tests/e2e/companies/companies-crud.spec.ts — count assertion needs retry loop
   - tests/e2e/messaging/test-helpers.ts:449 — page.reload() crash on Firefox
   - tests/e2e/map.spec.ts:441 — webkit theme toggle skip
   - tests/e2e/messaging/friend-requests.spec.ts — retry count tuning
   - tests/e2e/messaging/message-editing.spec.ts — findMessageBubble (45s wait)
   - .github/workflows/e2e.yml — shard config, stagger delays
   - tests/e2e/global-setup.ts — test user creation + key seeding
   - tests/e2e/auth.setup.ts — encryption key derivation + storage-state-auth.json
   - src/app/messages/page.tsx — optimistic message lifecycle, 10s polling fallback

5. WHAT NOT TO DO (lessons from 2026-04-03 session):
   - Do NOT add storageState to encrypted-messaging browser.newContext() — causes auth
     token conflicts when loginAndVerify is called for different users afterward.
   - Do NOT change page.tsx loadMessages() message preservation logic — content-based
     dedup is fragile. The original optimistic-only filter is correct.
   - Do NOT use executeSQL as fallback in test DB verification — 18 shards calling
     Management API causes rate-limit cascades (429 errors, see commit ba0c036).
   - Do NOT add sendMessageAndVerify() polling to message-editing tests — 30s polling +
     45s findMessageBubble = 75s, dangerously close to 90s test timeout.
   - Do NOT add aggressive polling loops (20×2s) in test cleanup — 18 shards each
     polling 20 times overwhelms Supabase rate limits and causes unrelated shards to fail.
     Keep polls to 5×3s maximum (see commit a951619 regression fix).
   - Make ONE targeted change at a time. Push. Verify no regressions. Then next change.
   - Add page.on('console') capture in messaging tests — browser console output is NOT
     visible in Playwright CI logs by default. Without it, you're blind to app-level errors.

6. FIX (only after diagnosis):
   - Docker must be running: docker compose exec spoketowork echo alive
   - Type check: docker compose exec spoketowork pnpm run type-check
   - Unit test: docker compose exec spoketowork pnpm test
   - Commit with descriptive message explaining the ROOT CAUSE
   - Push, verify new CI run starts

7. REGRESSION GUARD:
   - Before pushing any fix, verify passing shards still pass
   - Track shard-level results per push in this format:
     PUSH <hash> <date>: <pass>/<total> [<failing shards>]
   - If a previously passing shard breaks, revert immediately
   - Current tracking:
     PUSH ba0c036 2026-04-02: 12/18 [chromium 2/6,3/6 firefox 2/6,3/6 webkit 2/6,3/6]
     PUSH a96fa22 2026-04-03: 12/18 [same — baseline confirmed after revert]
     PUSH 7592aa2 2026-04-03: 10/18 [3 regressions from excessive polling rate-limiting]
     PUSH a951619 2026-04-03: 12/18 [regressions fixed, baseline restored]

RULES:
- NEVER guess — read logs and code first
- NEVER increase timeouts without fixing the underlying issue
- NEVER skip, ignore, bypass, or work around a failing test — fix the root cause
- If the same fix doesn't work twice, the diagnosis is WRONG
- If you've tried 3+ fixes for the same test, do a deeper code review
- Make ONE change at a time, push, verify. No stacking risky changes.
- Track: what failed, what the actual error was, what you changed, whether it helped
```

# SpokeToWork - Job Hunting by Bicycle

Track companies, plan bicycle routes, find work locally.

**[Try it →](https://SpokeToWork.com/)**

## What It Does

| Feature            | Description                                               |
| ------------------ | --------------------------------------------------------- |
| 🏢 Track Companies | Maintain target employers with status, priority, contacts |
| 🚴 Plan Routes     | Optimized bicycle routes connecting multiple companies    |
| 💬 Secure Messages | End-to-end encrypted communication                        |
| 📅 Schedule        | Calendar integration for interviews                       |
| 📱 Works Offline   | PWA that syncs when back online                           |

## Quick Links

- **App**: [SpokeToWork.com](https://SpokeToWork.com/)
- **Storybook**: [SpokeToWork.com/storybook](https://SpokeToWork.com/storybook/)
- **Status**: [SpokeToWork.com/status](https://SpokeToWork.com/status)

## Tech Stack

Next.js 15 • React 19 • TypeScript • Tailwind CSS 4 • Supabase • PWA

## For Contributors

Docker required. All commands run inside container.

```bash
docker compose up                           # Start dev
docker compose exec spoketowork pnpm test   # Run tests
```

See [CLAUDE.md](./CLAUDE.md) for full development documentation.

## Lighthouse Scores

Performance 92 • Accessibility 98 • Best Practices 95 • SEO 100 • PWA 92

## Technical Debt

~~**053 - Unified Browser Event Hooks**~~ ✅ **COMPLETE**

> ~~Duplicate event listeners (online/offline, click-outside, visibility). Consolidate into hooks.~~ Created `useOnlineStatus`, `useClickOutside`, `useVisibilityChange` hooks. Migrated 3 components.
> [View Spec](specs/053-unified-event-hooks/spec.md)

~~**054 - Code Consolidation**~~ ✅ **COMPLETE**

> ~~Duplicate implementations (offline queue, audit logger, email validation, rate limiter).~~ All consolidated: offline queue has adapters, email validation delegates to auth, dead code removed.
> [View Spec](specs/054-code-consolidation/spec.md)

~~**055 - Test Coverage Expansion**~~ ✅ **COMPLETE**

> ```54% coverage in lib/services/hooks. Critical payment and auth files untested.~~ Audit found 68% file ratio (297 test files, 3631 tests). Critical files already tested.
> [View Spec](specs/055-test-coverage/spec.md)
> ```

---

All P1/P2 technical debt specs complete. See [docs/TECHNICAL-DEBT.md](./docs/TECHNICAL-DEBT.md) for future items.

## E2E Test Remediation

**Status**: 125 unique failures (27 CRITICAL, 65 HIGH, 24 MEDIUM, 9 LOW)

**Root Causes**:

- AUTH_FAILURE (51%): Tests show "Sign In" link when authenticated state expected
- STATE_DEPENDENT (26%): Tests assume data from previous runs
- OVERLAY_BLOCKING (16%): Cookie consent banner visible in 95% of failures

**Analysis Report**: [docs/specs/e2e-remediation/analysis-report.md](./docs/specs/e2e-remediation/analysis-report.md)

To start the remediation workflow:

```bash
/speckit.workflow Fix E2E test failures: 27 CRITICAL (auth failures blocking 51% of tests), 65 HIGH (feature-specific). Primary root cause is authentication not persisting - tests show "Sign In" link when auth expected. Secondary issue is cookie banner blocking 95% of tests. See docs/specs/e2e-remediation/analysis-report.md
```

## Design System Redesign

Custom SpokeToWork theme (dark default + light variant) built on the existing DaisyUI/Tailwind stack. Storybook upgrade to v10, then bottom-up component reskin.

**Design doc**: [docs/plans/2026-02-13-design-system-redesign.md](./docs/plans/2026-02-13-design-system-redesign.md)
**Implementation plan**: [docs/plans/2026-02-13-design-system-implementation.md](./docs/plans/2026-02-13-design-system-implementation.md)

### Session Continuation Prompt

```
Read these files to pick up the design system redesign:

1. CLAUDE.md - Project rules, Docker setup, coding standards
2. docs/plans/2026-02-13-design-system-redesign.md - Approved design (colors, aesthetic, constraints)
3. docs/plans/2026-02-13-design-system-implementation.md - Task-by-task plan
4. docs/STORYBOOK_NOTES.md - Current Storybook state (needs v10 upgrade)
5. src/app/globals.css - Current theme config, DaisyUI plugin block, typography system

Use superpowers:executing-plans to work through the implementation plan.
Start at Phase 1 Task 1 (or wherever the plan left off).

Key context:
- Everything runs inside Docker: docker compose exec spoketowork <command>
- pnpm, not npm
- DaisyUI beta with Tailwind v4 CSS-first config (@plugin syntax)
- Brand colors: orange #E67E22 (primary), cyan #00d9ff (secondary), green #22c55e (accent), navy #132a4e (base)
- Dark theme default, light variant available
- Preserve all existing accessibility work (WCAG touch targets, ARIA patterns, colorblind filters)
- Aesthetic: mission with personality. Headspace-like. Not silly, not corporate.
```

## Development Tasks

### Codebase Polish (Complete)

All items completed in commit `a93fbdb` and surrounding work.

<details>
<summary>Checklist</summary>

- [x] Read CLAUDE.md before starting
- [x] Found prior work documentation at repo root
- [x] Identified all 5 tab-pattern components (not just 2-3)

**Keyboard Navigation** — `useRovingTabIndex` hook, ARIA roles, tests verify focus movement

- [x] ConversationList (3 tabs: All, Unread, Archived)
- [x] UnifiedSidebar (2 tabs: Chats, Connections)
- [x] ConnectionManager (4 tabs: Received, Sent, Accepted, Blocked)
- [x] PaymentButton (2 tabs: Stripe, PayPal)
- [x] TileLayerSelector (variable tiles, some disabled)
- [x] Arrow key navigation between tabs works
- [x] Home/End jump to first/last tab
- [x] TileLayerSelector: arrow keys skip disabled options
- [x] Tests verify actual focus movement (not just handler existence)

**Message Edit/Delete** — Services wired through MessageBubble, deleted messages show placeholder

- [x] Traced chain: service -> page handlers -> component props -> UI
- [x] Edit handler calls service and updates conversation
- [x] Delete handler shows placeholder (not filtered out)
- [x] Tests for both operations

**Real-time Notifications** — `useEmployerApplications` hook + `ApplicationToast`

- [x] Subscription hook for employer dashboard
- [x] Toast on new application (no page refresh)
- [x] Hook cleans up on unmount

**Dockerfile.e2e Cleanup**

- [x] Base URL no longer references old repo name
- [x] Unnecessary build step removed or conditional
- [x] Default CMD matches actual invocation

**Cross-Browser Reliability** — Browser-specific timeouts in auth helpers

- [x] Firefox auth tests pass (no navigation abort during sign-out)
- [x] Webkit auth tests pass consistently (no intermittent timeouts)
- [x] All three browser projects green

**Admin User Seeding (Cloud CI)** — `global-setup.ts` seeds via Management API

- [x] Admin user seeded in cloud Supabase
- [x] Encryption keys exist for admin
- [x] welcome-message and complete-flows specs pass in CI

**Map Snapshot Baselines** — 8 snapshots across themes and browsers

- [x] Baselines regenerated after auth fixes
- [x] Stable across consecutive runs

</details>

---

### Employer Redesign

```
Read CLAUDE.md first. SpokeToWork has two problems: it doesn't look like a product, and it doesn't work like one for employers.

The landing page looks like a stock DaisyUI template. Emoji icons on the feature cards, a text-only hero with no visual weight, and nothing that says this is a job-hunting app for cyclists. The accessibility tooling and theme system are solid, but the page has no personality. Start with the hero section. It needs a visual anchor that communicates the core concept. Give it structure, visual hierarchy, and a reason to keep scrolling. Then rework the feature cards. Which feature matters most? Make that decision visible.

There are no employer-facing pages at all. Employers sign up the same as job seekers and land on the same dashboard. Build an employer dashboard that shows incoming applications with status highlighting. The mapping between status values and visual styles needs to live in one place. If a new status shows up that the code doesn't recognize, it should fall back gracefully. Seed the database with realistic test data, not three placeholder rows.

The design language you establish on the landing page carries through to the employer dashboard. Both need to feel like the same app when you switch themes. Every color uses DaisyUI semantic tokens. Hardcoded hex values will break 31 of 32 themes. Check your work against at least 3: light, dark, and one high-contrast like dracula or synthwave.

The existing accessibility features are load-bearing. The skip-to-content link, the font scaling toolbar, the colorblind filters, the 44px touch targets. Read what's there before you move things around. Keep pages under 150 lines. Use the component generator for new components. Tests first, then implementation.
```

<details>
<summary>Checklist</summary>

**Design Quality**

- [ ] Read CLAUDE.md before starting
- [ ] Understood the existing design system (DaisyUI, Tailwind v4, Geist fonts)
- [ ] Hero has visual weight and clear hierarchy (not just floating text)
- [ ] Hero communicates what the app does without reading a paragraph
- [ ] Call-to-action buttons feel intentional, not afterthoughts
- [ ] Feature cards have visual differentiation and scanning rhythm
- [ ] At least one feature card is visually prioritized over others
- [ ] Page feels like a product, not a template

**Theme Compatibility**

- [ ] ALL colors use DaisyUI semantic tokens (primary, secondary, accent, base-\*)
- [ ] Zero hardcoded hex values or Tailwind color utilities (bg-blue-500, text-gray-700, etc.)
- [ ] Verified against light theme (no broken contrast)
- [ ] Verified against dark theme (no invisible elements)
- [ ] Verified against a high-contrast theme like dracula or synthwave
- [ ] Visual design holds across all 3 tested themes
- [ ] Landing page and employer dashboard feel like the same app across themes

**Accessibility Preservation**

- [ ] Skip-to-content link still works (Tab reveals, Enter jumps)
- [ ] Font scaling toolbar works at all sizes (S through XL)
- [ ] Touch targets remain 44px minimum
- [ ] Focus order is logical top-to-bottom
- [ ] Colorblind filters don't break the new layout
- [ ] No new axe-core violations introduced

**Auth Pages**

- [ ] Sign-in page has visual identity, not just a centered form
- [ ] Sign-up page matches sign-in design language
- [ ] OAuth buttons (Google, GitHub) feel like first-class options
- [ ] Form validation states styled consistently

**Employer Dashboard**

- [ ] Dashboard page exists with incoming applications
- [ ] Status highlighting with centralized status-to-style mapping
- [ ] Unknown status values fall back gracefully (not broken layout)
- [ ] Seeded with realistic test data (varied statuses, not 3 placeholder rows)
- [ ] Visual design matches the landing page's design language

**Sign-Up Routing**

- [ ] Sign-up flow asks user type (employer vs job seeker)
- [ ] Proper routing based on user type selection
- [ ] Both paths work end-to-end

**Employee Management**

- [ ] Employee list with add/remove
- [ ] Updates without page refresh
- [ ] Tests written first

**Application Lifecycle**

- [ ] Application tracking (list, view, accept/reject)
- [ ] Status transitions work and update the dashboard

**Profile and Account**

- [ ] Profile page feels like a destination after sign-in
- [ ] Avatar is prominent, auth provider visible
- [ ] Page has enough structure to grow without redesign

**Architecture**

- [ ] Services created in src/lib/employer/ (not inline in pages)
- [ ] Custom hooks in src/hooks/ for data fetching
- [ ] Pages are thin (<150 lines)
- [ ] 5-file component structure followed (index, component, test, stories, a11y)
- [ ] Used component generator (not manual creation)
- [ ] Shared design components reused across pages

**Testing (TDD)**

- [ ] Tests written BEFORE implementation (TDD approach)
- [ ] Unit tests for services and hooks
- [ ] Component tests for new components
- [ ] E2E tests for new user flows
- [ ] All new tests passing

</details>

---

### Message Reliability

```
Read CLAUDE.md first. The encrypted messaging system has reliability issues that users are reporting but nobody's diagnosed yet.

After going offline and coming back online, some messages show up twice in the conversation. Separately, sometimes a message just doesn't appear at all on the recipient's side even though the sender sees it fine. And occasionally the first message someone sends right after logging in fails silently, no error, just gone.

There are also two UX problems. The typing indicator shows someone as typing long after they've stopped or closed the tab. And after reconnecting from an offline period, messages appear out of order even though they have sequence numbers.

Start by reading the messaging quickstart doc and tracing the decryption pipeline end to end. The system uses end-to-end encryption, so understand the key management and caching layers before you start changing anything. Diagnose each symptom, find the root cause, fix it, and write tests that prove the fix works.
```

<details>
<summary>Checklist</summary>

**Diagnosis**

- [ ] Read CLAUDE.md before starting
- [ ] Read messaging quickstart doc
- [ ] Traced the full decryption pipeline (message -> cache lookup -> key derivation -> decrypt -> UI)
- [ ] Identified all three module-level caches in the realtime hook
- [ ] Understood encryption scheme (ECDH P-256 + AES-GCM-256) before making changes

**Duplicate Messages**

- [ ] Diagnosed: offline queue sync has no dedup by message ID
- [ ] Fix: Messages deduplicated during offline sync (not just suppressed in UI)
- [ ] Test: Send messages offline, reconnect, verify no duplicates

**Silent Message Loss**

- [ ] Diagnosed: decryption failure returns null, message silently dropped from conversation
- [ ] Fix: Failed decryption shows placeholder (user knows message exists but can't be read)
- [ ] Fix: Root cause of decryption failure addressed (stale shared secret cache)
- [ ] Test: Simulated decryption failure shows placeholder, not empty gap

**First-Message-After-Login Failure**

- [ ] Diagnosed: message send doesn't wait for key derivation to complete
- [ ] Fix: Send waits for keys to be ready before encrypting
- [ ] Test: Message sent immediately after login succeeds

**Typing Indicator Cleanup**

- [ ] Diagnosed: no cleanup on disconnect or tab close
- [ ] Fix: Typing status cleared on disconnect, tab close, and session end
- [ ] Fix: Stale typing records cleaned up (not orphaned forever)
- [ ] Test: Close tab while typing, indicator disappears within timeout

**Cache Invalidation**

- [ ] Shared secret cache invalidated on key rotation or re-authentication
- [ ] Private key cache invalidated on re-authentication
- [ ] Profile cache has TTL or invalidation strategy
- [ ] No thundering herd on concurrent decryption of many messages

**Message Ordering**

- [ ] Diagnosed: no sequence number re-ordering after offline sync
- [ ] Fix: Messages sorted by sequence number after sync completes
- [ ] Test: Offline messages interleaved with online messages appear in correct order

**Encryption Constraint**

- [ ] Did NOT attempt to log or display decrypted message content for debugging
- [ ] Verified fixes using metadata (message IDs, timestamps, sequence numbers) not plaintext

**Architecture**

- [ ] Realtime hook stays under 400 lines (extract cache/sync if needed)
- [ ] New modules follow existing patterns

**Testing**

- [ ] Messaging E2E specs pass
- [ ] Encryption unit tests pass
- [ ] Offline queue tests pass
- [ ] No regressions in existing test suite

</details>

---

### Accessibility Suite

```
Read CLAUDE.md first. Run the accessibility tests and figure out what's failing. These are real component bugs, not environment issues. Don't touch the test assertions, fix the actual components. Some of these are straightforward but at least one has a structural decision that'll break other pages if you get it wrong. Read the test expectations carefully before you start changing things.

There's also an orientation problem on mobile viewports. Run those tests and you'll see something in the CSS isn't respecting the viewport width after a rotation. The test output shows the numbers.

Start with those two areas. Once both specs are green, show me the results before moving on.
```

---

## License

MIT - See [LICENSE](./LICENSE)

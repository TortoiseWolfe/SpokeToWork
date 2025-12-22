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

## License

MIT - See [LICENSE](./LICENSE)

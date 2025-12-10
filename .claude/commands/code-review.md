---
description: Perform a comprehensive code review covering security, performance, code quality, and test coverage
---

Execute a systematic code review of the codebase. This is an extensive review that FIXes issues directly rather than just documenting them.

## Phase 1: Security Audit

Use Explore agents to scan for:

1. **Encryption patterns**
   - Search: `crypto.subtle`, `ECDH`, `AES-GCM`, `generateKey`
   - Verify: Keys are non-extractable, IVs are random per message
   - Check: Private keys never persisted to storage

2. **XSS vulnerabilities**
   - Search: `dangerouslySetInnerHTML`, `innerHTML`, user content rendering
   - Verify: DOMPurify used for all user-generated HTML
   - Check: No raw string interpolation in HTML contexts

3. **Authentication & authorization**
   - Search: `getUser`, `getSession`, auth checks
   - Verify: All sensitive routes check authentication
   - Check: CSRF protection on state-changing operations

4. **Rate limiting**
   - Search: `rate_limit`, `RateLimiter`, failed attempts
   - Verify: Login, password reset, contact forms protected
   - Check: Both client-side and server-side limits exist

5. **Secrets & environment**
   - Search: API keys, tokens, credentials in code
   - Verify: All secrets in environment variables
   - Check: No NEXT*PUBLIC* prefix on sensitive values

Report findings in a table: | Issue | File:Line | Severity | Status |

## Phase 2: Performance Analysis

1. **Large components without memoization**
   - Find components >300 LOC without React.memo
   - FIX: Wrap with memo() immediately

2. **Expensive computations**
   - Search: ECDH derivation, crypto operations, large data transforms
   - Check: Results cached appropriately
   - FIX: Add caching where missing

3. **Polling vs realtime**
   - Search: `setInterval`, polling patterns
   - Check: Could use Supabase realtime instead
   - FIX: Convert to realtime subscriptions

4. **Duplicate event listeners**
   - Search: `addEventListener`, `online`, `offline`
   - Check: Multiple components listening to same events
   - FIX: Consolidate to single listener with event bus

5. **Query patterns**
   - Search: N+1 queries, repeated fetches
   - Check: Data fetched efficiently
   - FIX: Batch queries, add caching

## Phase 3: Code Quality

1. **Duplicate files**
   - Find files with similar names/content
   - FIX: Delete duplicates, keep canonical version

2. **ESLint disables**
   - Search: `eslint-disable`, `@ts-ignore`, `@ts-expect-error`
   - Review: Each disable for legitimacy
   - FIX: Remove unnecessary disables, fix underlying issues

3. **TODO comments**
   - Search: `TODO`, `FIXME`, `HACK`, `XXX`
   - Categorize: Quick fix vs needs issue
   - FIX: Resolve quick fixes, create issues for complex ones

4. **Unimplemented stubs**
   - Search: `throw new Error('Not implemented')`, empty function bodies
   - FIX: Implement or remove dead code

5. **Dead code**
   - Search: Unused exports, unreachable code
   - FIX: Delete immediately

## Phase 4: Test Coverage

1. **Untested services**
   - List all files in src/services/ and src/lib/
   - Check: Corresponding test file exists
   - FIX: Create tests for untested services

2. **Excluded tests**
   - Check vitest.config.ts for excluded patterns
   - Investigate: Why are tests excluded?
   - FIX: Unblock excluded tests

3. **Skipped tests**
   - Search: `it.skip`, `describe.skip`, `test.skip`
   - Investigate: Why skipped?
   - FIX: Enable or delete

4. **Test quality**
   - Run: `docker compose exec spoketowork pnpm test -- --run`
   - Verify: All tests pass
   - Report: Total test count and coverage

## Phase 5: Documentation

1. **Update CODE-REVIEW-ISSUES.md**
   - Document all findings
   - Mark fixed items as complete
   - Track remaining work

2. **Update SECURITY-ARCHITECTURE.md** (if security findings)
   - Document security patterns
   - Note any changes made

3. **Create GitHub issues** (optional, ask user)
   - One issue per unique finding
   - Include file paths and line numbers
   - NEVER create duplicates

## Output Format

Provide a summary table at the end:

| Category      | Found | Fixed | Remaining |
| ------------- | ----- | ----- | --------- |
| Security      | X     | Y     | Z         |
| Performance   | X     | Y     | Z         |
| Code Quality  | X     | Y     | Z         |
| Test Coverage | X     | Y     | Z         |

**CRITICAL**: Fix issues directly. Do not defer work to "later" or create issues as a way to avoid fixing things. If it can be fixed now, fix it now.

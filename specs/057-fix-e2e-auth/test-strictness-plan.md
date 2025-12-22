# Plan: Fix E2E Test URL Matching Strictness

## Problem

Tests use exact URL matching that fails when query parameters are present:

```typescript
// FAILS: Actual URL is /sign-in/?returnUrl=%2Fprofile%2F
await page.waitForURL('/sign-in');
await expect(page).toHaveURL('/sign-in');
```

## Affected Files

| File                                         | Line Count    | Pattern                |
| -------------------------------------------- | ------------- | ---------------------- |
| `tests/e2e/auth/protected-routes.spec.ts`    | 8 occurrences | `/sign-in` exact match |
| `tests/e2e/auth/session-persistence.spec.ts` | 6 occurrences | `/sign-in` exact match |
| `tests/e2e/auth/user-registration.spec.ts`   | 3 occurrences | `/sign-in` exact match |

## Solution

Replace exact string matches with regex patterns that allow query parameters:

```typescript
// BEFORE (strict - fails)
await page.waitForURL('/sign-in');
await expect(page).toHaveURL('/sign-in');

// AFTER (flexible - passes)
await page.waitForURL(/\/sign-in/);
await expect(page).toHaveURL(/\/sign-in/);
```

## Implementation Tasks

### T001: Fix protected-routes.spec.ts (8 changes)

Lines to update: 24, 25, 77, 162, 163, 171, 217, 218

```typescript
// Line 24-25
await page.waitForURL(/\/sign-in/);
await expect(page).toHaveURL(/\/sign-in/);

// Line 77
await page.waitForURL(/\/sign-in/);

// Line 162-163
await page.waitForURL(/\/sign-in/);
await expect(page).toHaveURL(/\/sign-in/);

// Line 171
await page.waitForURL(/\/sign-in/);

// Line 217-218
await page.waitForURL(/\/sign-in/);
await expect(page).toHaveURL(/\/sign-in/);
```

### T002: Fix session-persistence.spec.ts (6 changes)

Lines to update: 27, 179, 196, 197, 222, 227, 228

```typescript
// All instances: replace '/sign-in' with /\/sign-in/
```

### T003: Fix user-registration.spec.ts (3 changes)

Lines to update: 67, 68, 127

```typescript
// All instances: replace '/sign-in' with /\/sign-in/
```

## Verification

After fixes, run:

```bash
docker compose exec -e SKIP_WEBSERVER=true -e PLAYWRIGHT_TEST_BASE_URL=http://localhost:3001 \
  spoketowork pnpm exec playwright test tests/e2e/auth/ --project=chromium
```

## Notes

- Using regex `/\/sign-in/` matches both `/sign-in` and `/sign-in/?returnUrl=...`
- This is a common Playwright pattern for flexible URL matching
- Does not affect test intent - still verifies user lands on sign-in page

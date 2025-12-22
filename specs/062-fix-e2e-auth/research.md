# Technical Research: Fix E2E Test Authentication Failures

**Date**: 2025-12-22
**Feature**: 062-fix-e2e-auth

## Research Questions

### Q1: How to pre-seed localStorage in Playwright?

**Decision**: Use `storageState` file in playwright.config.ts

**Rationale**:

- Playwright natively supports `storageState` which includes localStorage
- Applied globally to all tests without code changes
- Can be overridden per-project or per-test if needed

**Alternatives Rejected**:

- `page.evaluate()` in beforeEach: Slower, requires code in every test
- Playwright fixtures: More complex, same result as storageState

**Implementation**:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    storageState: './tests/e2e/fixtures/storage-state.json',
  },
});
```

**Storage State Format**:

```json
{
  "cookies": [],
  "origins": [
    {
      "origin": "http://localhost:3000",
      "localStorage": [
        {
          "name": "cookie-consent",
          "value": "{\"necessary\":true,\"functional\":true,\"analytics\":true,\"marketing\":false,\"timestamp\":1734892800000,\"version\":\"1.0.0\",\"lastUpdated\":1734892800000,\"method\":\"explicit\"}"
        }
      ]
    }
  ]
}
```

---

### Q2: Best pattern for verifying authentication success?

**Decision**: Combination of URL wait + element visibility check

**Rationale**:

- URL check alone misses cases where redirect succeeds but session isn't hydrated
- Element check alone is slow and may miss navigation errors
- Combination catches both issues: navigation problems AND session hydration

**Alternatives Rejected**:

- URL check only (`waitForURL(/profile/)`): 51% of failures show correct URL but wrong UI
- Element check only: Slower, doesn't detect redirect failures early
- Cookie/localStorage check: Fragile, depends on Supabase internals

**Implementation**:

```typescript
// Wait for navigation (fast failure on redirect issues)
await page.waitForURL((url) => !url.pathname.includes('/sign-in'), {
  timeout: 10000,
});

// Verify authenticated UI state (catches session hydration issues)
await expect(
  page.getByRole('generic', { name: /user account menu/i })
).toBeVisible({ timeout: 5000 });
```

---

### Q3: How should tests handle missing environment variables?

**Decision**: Fail fast at module load with descriptive error

**Rationale**:

- Silent skips hide configuration problems
- CI should fail immediately if secrets aren't configured
- Clear error message enables quick debugging

**Alternatives Rejected**:

- `test.skip()`: Hides problems, tests appear to pass
- Warning + continue: Leads to cascade of unclear failures
- Fallback to hardcoded values: Security risk, non-deterministic

**Implementation**:

```typescript
// At module load time (before any exports)
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'SUPABASE_SERVICE_ROLE_KEY required - check .env locally or GitHub Secrets in CI'
  );
}
```

---

### Q4: How to isolate tests that need user state?

**Decision**: Each test file creates its own user in `beforeAll`, deletes in `afterAll`

**Rationale**:

- Prevents cross-test contamination
- Enables parallel test execution
- Timestamp-based emails ensure uniqueness

**Alternatives Rejected**:

- Shared test user: Tests interfere with each other
- Per-test user creation: Too slow, rate limiting issues
- Database seeding: Complex, hard to maintain

**Implementation**:

```typescript
let testUser: TestUser | null = null;

test.beforeAll(async () => {
  testUser = await createTestUser(
    generateTestEmail('e2e-mytest'), // e2e-mytest-1734892800000-abc123@mailinator.com
    DEFAULT_TEST_PASSWORD
  );
});

test.afterAll(async () => {
  if (testUser) await deleteTestUser(testUser.id);
});
```

---

### Q5: Cookie consent localStorage key format?

**Decision**: Use exact format from `src/utils/consent-types.ts`

**Source Analysis**:

```typescript
// src/utils/consent-types.ts:215
export enum StorageKey {
  CONSENT = 'cookie-consent',
}

// src/utils/consent-types.ts:272
export const DEFAULT_CONSENT_STATE: ConsentState = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
  timestamp: Date.now(),
  version: '1.0.0',
  lastUpdated: Date.now(),
  method: ConsentMethod.DEFAULT,
};
```

**For Tests** (accept all to prevent any banner):

```json
{
  "necessary": true,
  "functional": true,
  "analytics": true,
  "marketing": false,
  "timestamp": 1734892800000,
  "version": "1.0.0",
  "lastUpdated": 1734892800000,
  "method": "explicit"
}
```

---

## Technical Constraints Discovered

1. **Playwright storageState applies at browser context creation** - Cannot change mid-test without creating new context

2. **Supabase auth session is also in localStorage** - storageState won't include auth tokens (they're generated per-login)

3. **Cookie consent checks `method` field** - Must be "explicit" or "banner" to be considered valid user consent

4. **Global setup runs before storageState is applied** - Can't use global-setup.ts to generate storageState dynamically

5. **Playwright projects share config** - storageState in `use` applies to all projects unless overridden

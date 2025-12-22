# E2E Auth Fix - Quickstart Guide

## Overview

This guide covers the new E2E test patterns for authentication and cookie consent handling.

## Prerequisites

1. Environment variables configured in `.env`:

   ```bash
   TEST_USER_PRIMARY_EMAIL=...
   TEST_USER_PRIMARY_PASSWORD=...
   SUPABASE_SERVICE_ROLE_KEY=...  # Required for test user creation
   ```

2. Docker environment running:
   ```bash
   docker compose up
   ```

## Pattern 1: Cookie Consent Pre-seeding

The cookie consent banner blocks 95% of test interactions. Pre-seed localStorage to dismiss it.

### Global Setup (Recommended)

Create `tests/e2e/fixtures/storage-state.json`:

```json
{
  "cookies": [],
  "origins": [
    {
      "origin": "http://localhost:3000",
      "localStorage": [
        {
          "name": "cookie-consent",
          "value": "{\"necessary\":true,\"functional\":true,\"analytics\":true,\"marketing\":true,\"timestamp\":1735300000000,\"version\":\"1.0.0\",\"lastUpdated\":1735300000000,\"method\":\"explicit\"}"
        }
      ]
    }
  ]
}
```

Configure in `playwright.config.ts`:

```typescript
use: {
  storageState: './tests/e2e/fixtures/storage-state.json',
  // ... other options
}
```

### Per-Test Override

For tests that need the banner visible:

```typescript
test.use({ storageState: { cookies: [], origins: [] } });

test('cookie banner displays on first visit', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('region', { name: 'Cookie consent banner' })
  ).toBeVisible();
});
```

## Pattern 2: Authentication with Robust Verification

Use the `loginAndVerify()` helper for consistent auth behavior.

### Usage

```typescript
import { loginAndVerify } from '../utils/auth-helpers';

test('authenticated user sees profile', async ({ page }) => {
  await loginAndVerify(page, {
    email: process.env.TEST_USER_PRIMARY_EMAIL!,
    password: process.env.TEST_USER_PRIMARY_PASSWORD!,
  });

  // Now authenticated - proceed with test
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible();
});
```

### How It Works

The helper combines URL verification with element checking:

1. Navigates to sign-in page
2. Fills credentials and submits
3. Waits for navigation away from `/sign-in/`
4. Verifies authenticated UI elements appear (user menu, no "Sign In" link)

### Error Handling

The helper provides clear error messages:

- "Login failed: still on sign-in page after 30s"
- "Login failed: Sign In link still visible (session not established)"
- "Login failed: User menu not visible (auth state not hydrated)"

## Pattern 3: Dynamic Test User Creation

For tests requiring isolated user state, create users dynamically.

### Usage

```typescript
import { createTestUser, deleteTestUser } from '../utils/test-user-factory';

test.describe('user settings', () => {
  let testUser: { email: string; password: string; userId: string };

  test.beforeAll(async () => {
    testUser = await createTestUser('settings-test');
  });

  test.afterAll(async () => {
    await deleteTestUser(testUser.userId);
  });

  test('user can update display name', async ({ page }) => {
    await loginAndVerify(page, testUser);
    // Test with isolated user...
  });
});
```

### Fail-Fast Validation

The factory validates environment variables at import time:

```typescript
// This throws immediately if SUPABASE_SERVICE_ROLE_KEY is missing
import { createTestUser } from '../utils/test-user-factory';
```

Error message:

```
Error: TEST_USER_FACTORY: Missing required SUPABASE_SERVICE_ROLE_KEY.
This is required for dynamic test user creation via Supabase Admin API.
Add SUPABASE_SERVICE_ROLE_KEY to your .env file.
```

## Pattern 4: Test Migration Checklist

When migrating existing tests:

1. **Remove manual cookie dismissal code**:

   ```typescript
   // DELETE THIS - no longer needed
   await page.getByRole('button', { name: 'Accept All' }).click();
   ```

2. **Replace auth code with helper**:

   ```typescript
   // BEFORE (unreliable)
   await page.goto('/sign-in');
   await page.fill('[name="email"]', email);
   await page.fill('[name="password"]', password);
   await page.click('button[type="submit"]');
   await page.waitForURL('/');

   // AFTER (robust)
   await loginAndVerify(page, { email, password });
   ```

3. **Add proper isolation for state-dependent tests**:

   ```typescript
   // BEFORE (shared state, flaky)
   test('delete user data', async ({ page }) => { ... });

   // AFTER (isolated)
   test.describe('delete user data', () => {
     let testUser;
     test.beforeAll(async () => { testUser = await createTestUser('delete-test'); });
     test.afterAll(async () => { await deleteTestUser(testUser.userId); });
     test('deletes successfully', async ({ page }) => { ... });
   });
   ```

## Running Tests

```bash
# Run all E2E tests
docker compose exec spoketowork pnpm exec playwright test

# Run specific test file
docker compose exec spoketowork pnpm exec playwright test tests/e2e/auth.spec.ts

# Run with UI for debugging
docker compose exec spoketowork pnpm exec playwright test --ui

# Run headed (visible browser)
docker compose exec spoketowork pnpm exec playwright test --headed
```

## Debugging

### Check Auth State

Add this to your test for debugging:

```typescript
await page.goto('/');
const signInLink = page.getByRole('link', { name: 'Sign In' });
const userMenu = page.getByRole('generic', { name: 'User account menu' });
console.log('Sign In visible:', await signInLink.isVisible());
console.log('User menu visible:', await userMenu.isVisible());
```

### Check Cookie Consent State

```typescript
const consentState = await page.evaluate(() =>
  localStorage.getItem('cookie-consent')
);
console.log('Consent state:', consentState);
```

### View Storage State

```typescript
const storageState = await page.context().storageState();
console.log(JSON.stringify(storageState, null, 2));
```

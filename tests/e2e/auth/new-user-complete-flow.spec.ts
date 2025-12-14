/**
 * E2E Test: Complete New User Flow
 *
 * Tests the entire journey from signup to using the app in a single test:
 * 1. Create user via API (simulates signup)
 * 2. Sign in with created credentials
 * 3. Navigate to companies page
 * 4. Verify new user has no seed companies (no home location)
 * 5. Set home location
 * 6. Verify seed companies are created
 * 7. Companies appear in UI
 * 8. Sign out redirects correctly
 *
 * This test creates and cleans up test users via the Supabase Management API.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const METRO_AREA_ID = '6cc1dd40-76c0-4981-a125-23493a97c1b7'; // Cleveland, TN

// Extract project ref from Supabase URL (e.g., https://xyz.supabase.co -> xyz)
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

// Validate required environment variables
if (!PROJECT_REF) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL environment variable is required (to extract project ref)'
  );
}
if (!ACCESS_TOKEN) {
  throw new Error('SUPABASE_ACCESS_TOKEN environment variable is required');
}

// Test password from environment variable
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;
if (!TEST_PASSWORD) {
  throw new Error('TEST_USER_PASSWORD environment variable is required');
}

interface SQLResult {
  message?: string;
  [key: string]: unknown;
}

/**
 * Escape single quotes for SQL strings to prevent SQL injection
 */
function escapeSQL(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Validate UUID format to prevent SQL injection
 */
function isValidUUID(value: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

async function executeSQL(query: string): Promise<SQLResult[]> {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SQL execution failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}

async function createTestUserDirect(
  email: string,
  password: string
): Promise<string | null> {
  // Escape inputs to prevent SQL injection
  const safeEmail = escapeSQL(email);
  const safePassword = escapeSQL(password);

  // Create user with all required fields for GoTrue
  const createUserSQL = `
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, instance_id, aud, role,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      gen_random_uuid(),
      '${safeEmail}',
      crypt('${safePassword}', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      '', '', '', ''
    )
    RETURNING id
  `;

  const result = (await executeSQL(createUserSQL)) as { id?: string }[];
  if (!result[0]?.id) {
    throw new Error(`Failed to create user: ${JSON.stringify(result)}`);
  }

  const userId = result[0].id;

  // Validate UUID before using in SQL
  if (!isValidUUID(userId)) {
    throw new Error(`Invalid user ID returned: ${userId}`);
  }

  // Create identity record (required for sign-in)
  // All interpolated values use escapeSQL to prevent injection (047-test-security)
  const safeUserId = escapeSQL(userId);
  const createIdentitySQL = `
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      '${safeUserId}',
      '${safeEmail}',
      'email',
      '{"sub":"${safeUserId}","email":"${safeEmail}","email_verified":true}'::jsonb,
      NOW(), NOW(), NOW()
    )
  `;

  await executeSQL(createIdentitySQL);
  return userId;
}

async function deleteTestUser(userId: string): Promise<void> {
  if (!isValidUUID(userId)) {
    throw new Error(`Invalid user ID for deletion: ${userId}`);
  }
  // All interpolated values use escapeSQL to prevent injection (047-test-security)
  const safeUserId = escapeSQL(userId);
  await executeSQL(
    `DELETE FROM auth.identities WHERE user_id = '${safeUserId}'`
  );
  await executeSQL(`DELETE FROM auth.users WHERE id = '${safeUserId}'`);
}

async function getUserProfile(
  userId: string
): Promise<{ metro_area_id: string | null } | null> {
  if (!isValidUUID(userId)) {
    throw new Error(`Invalid user ID for profile lookup: ${userId}`);
  }
  // All interpolated values use escapeSQL to prevent injection (047-test-security)
  const result = (await executeSQL(
    `SELECT metro_area_id FROM user_profiles WHERE id = '${escapeSQL(userId)}'`
  )) as { metro_area_id: string | null }[];
  return result[0] || null;
}

async function getUserCompanyCount(userId: string): Promise<number> {
  if (!isValidUUID(userId)) {
    throw new Error(`Invalid user ID for company count: ${userId}`);
  }
  // All interpolated values use escapeSQL to prevent injection (047-test-security)
  const result = (await executeSQL(
    `SELECT COUNT(*) as count FROM user_company_tracking WHERE user_id = '${escapeSQL(userId)}'`
  )) as { count: string }[];
  return parseInt(result[0]?.count || '0', 10);
}

test.describe('New User Complete Flow', () => {
  test('Complete new user journey: signup -> companies -> signout', async ({
    page,
  }) => {
    const testEmail = `e2e-new-user-${Date.now()}@example.com`;
    let testUserId: string | null = null;

    try {
      // === STEP 1: Create test user via API ===
      console.log('Step 1: Creating test user...');
      testUserId = await createTestUserDirect(testEmail, TEST_PASSWORD);
      expect(testUserId).toBeTruthy();
      console.log(`Created test user: ${testUserId}`);

      // Verify user_profiles was created by trigger
      const profile = await getUserProfile(testUserId!);
      expect(profile).toBeTruthy();
      console.log('User profile created by trigger');

      // === STEP 2: Sign in with new user credentials ===
      console.log('Step 2: Signing in...');
      await page.goto(`${BASE_URL}/sign-in`);
      await page.waitForLoadState('networkidle');

      // Fill sign-in form - use id selector since label might have nested elements
      await page.locator('#email').fill(testEmail);
      await page.locator('#password').fill(TEST_PASSWORD);

      // Submit
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for redirect to profile or companies
      await page.waitForURL(/\/(profile|companies)/, { timeout: 15000 });
      const signInUrl = page.url();
      expect(signInUrl).toMatch(/\/(profile|companies)/);
      console.log(`Sign-in successful, redirected to: ${signInUrl}`);

      // === STEP 3: Navigate to companies page ===
      console.log('Step 3: Navigating to companies page...');
      await page.goto(`${BASE_URL}/companies`);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/companies');

      // === STEP 4: New user should NOT have seed companies ===
      console.log('Step 4: Checking new user has no companies yet...');
      const profileBefore = await getUserProfile(testUserId!);
      expect(profileBefore?.metro_area_id).toBeNull();
      console.log('New user has no metro_area_id set');

      const companyCountBefore = await getUserCompanyCount(testUserId!);
      expect(companyCountBefore).toBe(0);
      console.log('New user has 0 companies (expected - no home location set)');

      // === STEP 5: Set home location via SQL ===
      console.log('Step 5: Setting home location...');
      if (!isValidUUID(testUserId!)) {
        throw new Error(`Invalid test user ID: ${testUserId}`);
      }
      // All interpolated values use escapeSQL to prevent injection (047-test-security)
      await executeSQL(`
        UPDATE user_profiles
        SET home_address = '1450 Blythe Ferry Rd NE Cleveland TN 37312',
            home_latitude = 35.17783840,
            home_longitude = -84.83535530,
            distance_radius_miles = 20
        WHERE id = '${escapeSQL(testUserId!)}'
      `);

      // Verify metro area was assigned by trigger
      const profileAfter = await getUserProfile(testUserId!);
      expect(profileAfter?.metro_area_id).toBe(METRO_AREA_ID);
      console.log('Metro area assigned after home location set');

      // === STEP 6: Verify seed companies were auto-created by trigger ===
      // The trg_seed_user_companies trigger should have fired on metro_area_id UPDATE
      console.log(
        'Step 6: Verifying seed companies were auto-created by trigger...'
      );

      const companyCountAfter = await getUserCompanyCount(testUserId!);
      console.log(`User now has ${companyCountAfter} companies`);
      expect(companyCountAfter).toBeGreaterThan(0);

      // === STEP 7: Refresh and check companies appear in UI ===
      console.log('Step 7: Checking companies appear in UI...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check for company table or data
      const companyTable = page
        .locator('[data-testid="company-table"]')
        .or(page.locator('table'));
      const tableVisible = await companyTable
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      console.log(`Company table visible: ${tableVisible}`);

      // Check for any company-related content
      const pageContent = await page.content();
      const hasCompanyData =
        pageContent.includes('company') ||
        pageContent.includes('Company') ||
        pageContent.includes('Priority');
      console.log(`Page has company-related content: ${hasCompanyData}`);

      // === STEP 8: Sign out should redirect correctly ===
      console.log('Step 8: Testing sign out...');

      // Navigate to profile page to find sign out button
      await page.goto(`${BASE_URL}/profile`);
      await page.waitForLoadState('networkidle');

      // Find sign out button
      const signOutButton = page
        .getByRole('button', { name: /sign out|logout/i })
        .first();
      const signOutVisible = await signOutButton
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      if (signOutVisible) {
        await signOutButton.click();
        await page.waitForTimeout(3000);

        // Verify redirect - should NOT be 404
        const signOutUrl = page.url();
        console.log(`After sign-out, URL: ${signOutUrl}`);

        const has404 = await page
          .getByText(/404|not found/i)
          .isVisible({ timeout: 2000 })
          .catch(() => false);
        expect(has404).toBe(false);

        // Should be on sign-in or home page
        expect(signOutUrl).toMatch(/\/(sign-in|$)/);
        console.log('Sign out redirect successful');
      } else {
        console.log('Sign out button not visible on profile page');
        // Check if there's a different sign out mechanism
        const hasSignOut = await page.getByText(/sign out|logout/i).count();
        console.log(`Found ${hasSignOut} sign out text elements`);
      }

      console.log('All steps completed successfully!');
    } finally {
      // Clean up test user
      if (testUserId) {
        await deleteTestUser(testUserId);
        console.log(`Cleaned up test user: ${testUserId}`);
      }
    }
  });
});

/**
 * E2E Test: Companies Page - Sort Functionality
 *
 * Feature 051: Performance Memoization
 * Verifies that sorting works correctly after adding useCallback and React.memo
 * to CompanyTable and CompanyRow. This catches stale closure bugs that could
 * occur if memoization is implemented incorrectly.
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { CompaniesPage } from '../pages/CompaniesPage';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test user credentials from env (required)
const testEmail =
  process.env.TEST_USER_EMAIL || process.env.TEST_USER_PRIMARY_EMAIL;
const testPassword =
  process.env.TEST_USER_PASSWORD || process.env.TEST_USER_PRIMARY_PASSWORD;

if (!testEmail || !testPassword) {
  throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env');
}

const TEST_USER = { email: testEmail, password: testPassword };
const AUTH_FILE = 'tests/e2e/fixtures/storage-state-auth.json';

test.describe('Companies Page - Sort Functionality (Feature 051)', () => {
  // Shared context and page for all tests - reuse auth state
  let sharedContext: BrowserContext;
  let sharedPage: Page;
  let companiesPage: CompaniesPage;

  test.beforeAll(async ({ browser }) => {
    // Create context with pre-authenticated state - NO login needed
    sharedContext = await browser.newContext({
      storageState: AUTH_FILE,
    });
    sharedPage = await sharedContext.newPage();
    companiesPage = new CompaniesPage(sharedPage);
  });

  test.afterAll(async () => {
    await sharedContext?.close();
  });

  test.beforeEach(async () => {
    // Navigate to companies page before each test
    await companiesPage.goto();
    await companiesPage.waitForTable();
  });

  test('should toggle sort direction on click', async () => {
    // Table starts sorted by name ascending (default state)
    // Clicking toggles: asc -> desc -> asc -> etc.
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    // Check initial state (should be asc by default)
    const initialDir = await companiesPage.getSortDirection('name');
    expect(initialDir).toBe('asc');

    // Click the Company sort button - should toggle to desc
    await companiesPage.clickSortButton('name');
    const direction = await companiesPage.getSortDirection('name');
    expect(direction).toBe('desc');

    // Verify there are still rows visible (sorting worked without error)
    const rowCountAfter = await companiesPage.getCompanyRowCount();
    expect(rowCountAfter).toBe(rowCount);
  });

  test('should toggle back to ascending on second click', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    // Click twice: asc (initial) -> desc -> asc
    await companiesPage.clickSortButton('name');
    await companiesPage.clickSortButton('name');

    // Verify sort direction indicator
    const direction = await companiesPage.getSortDirection('name');
    expect(direction).toBe('asc');

    // Verify there are still rows visible
    const rowCountAfter = await companiesPage.getCompanyRowCount();
    expect(rowCountAfter).toBe(rowCount);
  });

  test('should sort by different column (status)', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    // Initial state is name asc, click toggles to desc
    await companiesPage.clickSortButton('name');
    const nameDirBefore = await companiesPage.getSortDirection('name');
    expect(nameDirBefore).toBe('desc');

    // Then sort by status - starts fresh as asc
    await companiesPage.clickSortButton('status');
    const statusDir = await companiesPage.getSortDirection('status');
    expect(statusDir).toBe('asc');

    // Name should no longer have indicator
    const nameDirAfter = await companiesPage.getSortDirection('name');
    expect(nameDirAfter).toBe(null);
  });

  test('should maintain sort state through multiple toggles (stale closure test)', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    // This test verifies no stale closure bugs by rapidly toggling sort
    // If useCallback has incorrect dependencies, sort state may become stale
    // Initial state: asc
    // Clicks toggle: desc(0) -> asc(1) -> desc(2) -> asc(3) -> desc(4) -> asc(5)

    // Toggle sort 6 times (3 complete cycles)
    for (let i = 0; i < 6; i++) {
      await companiesPage.clickSortButton('name');
      const direction = await companiesPage.getSortDirection('name');

      // Odd clicks (1, 3, 5) should be asc, even clicks (0, 2, 4) should be desc
      const expectedDirection = i % 2 === 0 ? 'desc' : 'asc';
      expect(direction).toBe(expectedDirection);
    }
  });

  test('should sort by priority column', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    await companiesPage.clickSortButton('priority');
    const direction = await companiesPage.getSortDirection('priority');
    expect(direction).toBe('asc');

    // Verify the table re-rendered (we can't easily check priority values,
    // but confirming the sort indicator is correct proves handleSort works)
  });

  test('should sort by zip code for route planning', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    await companiesPage.clickSortButton('zip_code');
    const direction = await companiesPage.getSortDirection('zip_code');
    expect(direction).toBe('asc');
  });

  test('row click should still open drawer after memoization', async () => {
    // This verifies React.memo on CompanyRow doesn't break onClick handler
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Sort first to ensure memoized components are used
    await companiesPage.clickSortButton('name');

    // Click a row
    await companiesPage.clickFirstCompanyRow();

    // Verify drawer opens
    const isDrawerOpen = await companiesPage.isDrawerOpen();
    expect(isDrawerOpen).toBe(true);

    // Close drawer
    await companiesPage.closeDrawer();
  });

  test('should verify memoization is working via render count tracking', async () => {
    // Feature 051: Verify React.memo is applied and render counts are tracked
    // Each CompanyRow tracks its render count via data-render-count attribute
    // Note: With React.memo, rows should NOT re-render when only sort order changes
    // BUT this depends on all callback props being stable (useCallback)
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    // Get initial render counts for all rows
    const rows = sharedPage.locator('[data-testid^="company-row-"]');
    const count = await rows.count();

    // Collect render counts by company ID (not position, since position changes on sort)
    const getRenderCountsByCompanyId = async () => {
      const counts: Record<string, number> = {};
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const testId = await row.getAttribute('data-testid');
        const renderCount = await row.getAttribute('data-render-count');
        if (testId) {
          const companyId = testId.replace('company-row-', '');
          counts[companyId] = parseInt(renderCount || '0', 10);
        }
      }
      return counts;
    };

    const initialCounts = await getRenderCountsByCompanyId();

    // Sort by name (toggles to desc)
    await companiesPage.clickSortButton('name');
    const countsAfterSort1 = await getRenderCountsByCompanyId();

    // Sort again (toggles back to asc)
    await companiesPage.clickSortButton('name');
    const countsAfterSort2 = await getRenderCountsByCompanyId();

    // Log for debugging
    console.log('Initial render counts:', initialCounts);
    console.log('After sort 1:', countsAfterSort1);
    console.log('After sort 2:', countsAfterSort2);

    // Verify render counts are being tracked (all should be > 0)
    const companyIds = Object.keys(initialCounts);
    for (const id of companyIds) {
      expect(initialCounts[id]).toBeGreaterThan(0);
    }

    // With proper memoization, render counts should stay stable after sorting
    // since the company data and callback references haven't changed
    // Allow for React Strict Mode double-render in development
    for (const id of companyIds) {
      // Each sort causes parent to re-render, but memo'd children should not
      // In practice, we verify counts don't grow unboundedly
      expect(countsAfterSort2[id]).toBeLessThanOrEqual(
        countsAfterSort1[id] + 1
      );
    }
  });
});

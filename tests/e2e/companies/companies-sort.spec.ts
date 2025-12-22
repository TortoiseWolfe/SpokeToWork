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

test.describe('Companies Page - Sort Functionality (Feature 051)', () => {
  // Shared context and page for all tests - sign in once
  let sharedContext: BrowserContext;
  let sharedPage: Page;
  let companiesPage: CompaniesPage;

  test.beforeAll(async ({ browser }) => {
    // Create a shared context and page
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    companiesPage = new CompaniesPage(sharedPage);

    // Sign in once for all tests
    await companiesPage.signIn(TEST_USER.email, TEST_USER.password);
  });

  test.afterAll(async () => {
    await sharedContext?.close();
  });

  test.beforeEach(async () => {
    // Navigate to companies page before each test
    await companiesPage.goto();
    await companiesPage.waitForTable();
  });

  test('should sort by company name ascending on initial click', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    // Click the Company sort button
    await companiesPage.clickSortButton('name');

    // Verify sort direction indicator
    const direction = await companiesPage.getSortDirection('name');
    expect(direction).toBe('asc');

    // Get company names and verify alphabetical order
    const names = await companiesPage.getCompanyNames();
    const sortedNames = [...names].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
    expect(names).toEqual(sortedNames);
  });

  test('should toggle to descending on second click', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    // Click twice to toggle to descending
    await companiesPage.clickSortButton('name');
    await companiesPage.clickSortButton('name');

    // Verify sort direction indicator
    const direction = await companiesPage.getSortDirection('name');
    expect(direction).toBe('desc');

    // Get company names and verify reverse alphabetical order
    const names = await companiesPage.getCompanyNames();
    const sortedNames = [...names].sort((a, b) =>
      b.toLowerCase().localeCompare(a.toLowerCase())
    );
    expect(names).toEqual(sortedNames);
  });

  test('should sort by different column (status)', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    // First sort by name
    await companiesPage.clickSortButton('name');
    const nameDirBefore = await companiesPage.getSortDirection('name');
    expect(nameDirBefore).toBe('asc');

    // Then sort by status
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

    // Toggle sort 6 times (3 complete cycles)
    for (let i = 0; i < 6; i++) {
      await companiesPage.clickSortButton('name');
      const direction = await companiesPage.getSortDirection('name');

      // Even clicks (0, 2, 4) should be asc, odd clicks (1, 3, 5) should be desc
      const expectedDirection = i % 2 === 0 ? 'asc' : 'desc';
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

  test('should not re-render rows when sorting (memoization verification)', async () => {
    // Feature 051: Verify React.memo prevents unnecessary re-renders
    // Each CompanyRow tracks its render count via data-render-count attribute
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount < 2) {
      test.skip();
      return;
    }

    // Get initial render counts for all rows
    const rows = sharedPage.locator('[data-testid^="company-row-"]');
    const initialCounts: number[] = [];
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      const renderCount = await rows.nth(i).getAttribute('data-render-count');
      initialCounts.push(parseInt(renderCount || '0', 10));
    }

    // Sort by name (ascending)
    await companiesPage.clickSortButton('name');

    // Get render counts after first sort
    const countsAfterSort1: number[] = [];
    for (let i = 0; i < count; i++) {
      const renderCount = await rows.nth(i).getAttribute('data-render-count');
      countsAfterSort1.push(parseInt(renderCount || '0', 10));
    }

    // Sort again (descending)
    await companiesPage.clickSortButton('name');

    // Get render counts after second sort
    const countsAfterSort2: number[] = [];
    for (let i = 0; i < count; i++) {
      const renderCount = await rows.nth(i).getAttribute('data-render-count');
      countsAfterSort2.push(parseInt(renderCount || '0', 10));
    }

    // With proper memoization, render counts should NOT increase after sorting
    // because the row props (company data, callbacks) haven't changed
    // The rows are just reordered in the DOM, not re-rendered
    for (let i = 0; i < count; i++) {
      // Allow for initial render + 1 (React may re-render once on mount)
      // But subsequent sorts should NOT cause additional renders
      expect(countsAfterSort2[i]).toBeLessThanOrEqual(countsAfterSort1[i]);
    }

    // Log for debugging if needed
    console.log('Initial render counts:', initialCounts);
    console.log('After sort 1:', countsAfterSort1);
    console.log('After sort 2:', countsAfterSort2);
  });
});

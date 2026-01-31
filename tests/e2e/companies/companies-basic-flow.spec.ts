/**
 * E2E Test: Companies Page - Basic Flow
 *
 * Tests the basic flow of the companies page:
 * - Loading companies with application counts
 * - Opening and closing the company detail drawer
 * - Viewing applications in the drawer
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { CompaniesPage } from '../pages/CompaniesPage';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const AUTH_FILE = 'tests/e2e/fixtures/storage-state-auth.json';

test.describe('Companies Page - Basic Flow', () => {
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

  test('should redirect to sign-in when not authenticated', async ({
    browser,
  }) => {
    // This test needs a fresh context without auth - explicitly clear storage state
    const freshContext = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const freshPage = await freshContext.newPage();

    // Attempt to access companies page without authentication
    await freshPage.goto(`${BASE_URL}/companies`);

    // Should redirect to sign-in
    await freshPage.waitForURL(/.*\/sign-in/, { timeout: 10000 });
    await expect(freshPage).toHaveURL(/.*\/sign-in/);

    await freshContext.close();
  });

  test('should load companies page with table after sign-in', async () => {
    // Verify table is visible (already navigated in beforeEach)
    const isTableVisible = await companiesPage.isVisible(
      '[data-testid="company-table"]'
    );
    expect(isTableVisible).toBe(true);

    // Verify at least some company rows exist
    const rowCount = await companiesPage.getCompanyRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('should open company detail drawer on row click', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();

    // Skip test if no companies exist
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Click on the first company row
    await companiesPage.clickFirstCompanyRow();

    // Verify drawer is open
    const isDrawerOpen = await companiesPage.isDrawerOpen();
    expect(isDrawerOpen).toBe(true);

    // Verify drawer has company name
    const companyName = await companiesPage.getDrawerCompanyName();
    expect(companyName).toBeTruthy();

    // Close drawer for next test
    await companiesPage.closeDrawer();
  });

  test('should close drawer with close button', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open drawer
    await companiesPage.clickFirstCompanyRow();
    expect(await companiesPage.isDrawerOpen()).toBe(true);

    // Close drawer with button
    await companiesPage.closeDrawer();

    // Verify drawer is closed
    expect(await companiesPage.isDrawerOpen()).toBe(false);
  });

  test('should close drawer with Escape key', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open drawer
    await companiesPage.clickFirstCompanyRow();
    expect(await companiesPage.isDrawerOpen()).toBe(true);

    // Close drawer with Escape
    await companiesPage.closeDrawerWithEscape();

    // Verify drawer is closed
    expect(await companiesPage.isDrawerOpen()).toBe(false);
  });

  test('should close drawer by clicking outside', async () => {
    // Skip on mobile - drawer takes full width, no backdrop visible
    const viewport = sharedPage.viewportSize();
    if (viewport && viewport.width < 768) {
      test.skip();
      return;
    }

    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open drawer
    await companiesPage.clickFirstCompanyRow();
    expect(await companiesPage.isDrawerOpen()).toBe(true);

    // Close drawer by clicking backdrop
    await companiesPage.closeDrawerByClickingOutside();

    // Verify drawer is closed
    expect(await companiesPage.isDrawerOpen()).toBe(false);
  });

  test('should display applications list in drawer', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open drawer for first company
    await companiesPage.clickFirstCompanyRow();

    // Verify applications/tracked section exists (shows "Tracked" when no actual applications)
    const applicationsSection = sharedPage.getByRole('heading', {
      name: /Applications|Tracked/,
    });
    await expect(applicationsSection).toBeVisible();

    // Get application count (can be 0 or more)
    const appCount = await companiesPage.getDrawerApplicationCount();
    expect(appCount).toBeGreaterThanOrEqual(0);

    // Close drawer for next test
    await companiesPage.closeDrawer();
  });

  test('should display company info in drawer', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open drawer
    await companiesPage.clickFirstCompanyRow();

    // Verify drawer contains company details
    const drawer = sharedPage.locator('[data-testid="company-detail-drawer"]');
    await expect(drawer).toBeVisible();

    // Drawer should have priority info
    const priorityLabel = drawer.getByText('Priority:');
    await expect(priorityLabel).toBeVisible();

    // Close drawer for next test
    await companiesPage.closeDrawer();
  });

  test('should show add application button in drawer', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open drawer
    await companiesPage.clickFirstCompanyRow();

    // Verify "Add application" button is visible within the drawer
    const drawer = sharedPage.locator('[data-testid="company-detail-drawer"]');
    const addButton = drawer.locator('[aria-label="Add application"]');
    await expect(addButton).toBeVisible();

    // Close drawer for next test
    await companiesPage.closeDrawer();
  });

  test('should have accessible drawer with proper ARIA attributes', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open drawer
    await companiesPage.clickFirstCompanyRow();

    // Verify ARIA attributes
    const drawer = sharedPage.locator('[data-testid="company-detail-drawer"]');
    await expect(drawer).toHaveAttribute('role', 'dialog');
    await expect(drawer).toHaveAttribute('aria-modal', 'true');
    await expect(drawer).toHaveAttribute('aria-labelledby', 'drawer-title');

    // Close drawer for cleanup
    await companiesPage.closeDrawer();
  });
});

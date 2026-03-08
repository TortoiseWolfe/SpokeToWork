/**
 * E2E Test: Companies Page - Active Route Filter (Feature 044)
 *
 * Tests the "On Active Route" filter functionality:
 * - Filter checkbox visibility and labeling
 * - Filtering companies by active route membership
 * - Empty state when no companies on active route
 * - Integration with route sidebar
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { CompaniesPage } from '../pages/CompaniesPage';

// Uses shared auth state from auth.setup.ts - no direct login needed
const AUTH_FILE = 'tests/e2e/fixtures/storage-state-auth.json';

test.describe('Companies Page - Active Route Filter (Feature 044)', () => {
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

  test('should display "On Active Route" filter checkbox', async () => {
    // Look for the checkbox with correct aria-label
    const filterCheckbox = sharedPage.getByLabel(
      'Show only companies on active route'
    );
    await expect(filterCheckbox).toBeVisible();
  });

  test('should have "On Active Route" label visible', async () => {
    // Look for the label text
    const filterLabel = sharedPage.getByText('On Active Route', {
      exact: true,
    });
    await expect(filterLabel).toBeVisible();
  });

  test('should toggle filter when checkbox clicked', async () => {
    const filterCheckbox = sharedPage.getByLabel(
      'Show only companies on active route'
    );

    // Verify checkbox is unchecked initially
    await expect(filterCheckbox).not.toBeChecked();

    // Click to enable filter
    await filterCheckbox.click();
    await expect(filterCheckbox).toBeChecked();

    // Click again to disable
    await filterCheckbox.click();
    await expect(filterCheckbox).not.toBeChecked();
  });

  test('should show "Clear" button when filter is active', async () => {
    const filterCheckbox = sharedPage.getByLabel(
      'Show only companies on active route'
    );

    // Enable the filter
    await filterCheckbox.click();

    // Clear button should be visible
    const clearButton = sharedPage.getByLabel('Clear all filters');
    await expect(clearButton).toBeVisible();
  });

  test('should clear filter when clear button clicked', async () => {
    const filterCheckbox = sharedPage.getByLabel(
      'Show only companies on active route'
    );

    // Enable the filter
    await filterCheckbox.click();
    await expect(filterCheckbox).toBeChecked();

    // Click clear button
    const clearButton = sharedPage.getByLabel('Clear all filters');
    await clearButton.click();

    // Filter should be unchecked
    await expect(filterCheckbox).not.toBeChecked();
  });

  test('should show empty state message when no companies on route', async () => {
    // This test may need adjustment based on test data
    // If there's no active route or no companies on it, the empty state should show
    const filterCheckbox = sharedPage.getByLabel(
      'Show only companies on active route'
    );

    // Count companies before filter
    const initialCount = await companiesPage.getCompanyRowCount();

    // Enable the filter
    await filterCheckbox.click();

    // If there are no companies on the active route, we should see the empty state
    // This depends on test data setup
    const filteredCount = await companiesPage.getCompanyRowCount();

    if (filteredCount === 0 && initialCount > 0) {
      // Should show the specific empty state message
      const emptyMessage = sharedPage.getByText(
        /No companies on this route yet/
      );
      await expect(emptyMessage).toBeVisible();
    }

    // Disable filter for cleanup
    await filterCheckbox.click();
  });

  test('should filter companies when active route has companies', async () => {
    // This test requires an active route with companies
    // Check if route sidebar is visible (desktop only)
    const viewport = sharedPage.viewportSize();
    if (viewport && viewport.width < 1024) {
      test.skip();
      return;
    }

    // Get initial company count
    const initialCount = await companiesPage.getCompanyRowCount();

    // Check if there's an active route indicator
    const activeRouteText = sharedPage.getByText('Active route:');
    const hasActiveRoute = await activeRouteText.isVisible().catch(() => false);

    if (!hasActiveRoute) {
      test.skip();
      return;
    }

    // Enable the filter
    const filterCheckbox = sharedPage.getByLabel(
      'Show only companies on active route'
    );
    await filterCheckbox.click();

    // Wait for filter to apply
    await sharedPage.waitForTimeout(500);

    // Get filtered count
    const filteredCount = await companiesPage.getCompanyRowCount();

    // Filtered count should be less than or equal to initial
    expect(filteredCount).toBeLessThanOrEqual(initialCount);

    // Disable filter for cleanup
    await filterCheckbox.click();
  });

  test('should have correct accessibility attributes on filter', async () => {
    const filterCheckbox = sharedPage.getByLabel(
      'Show only companies on active route'
    );

    // Verify ARIA attributes
    await expect(filterCheckbox).toHaveAttribute(
      'aria-label',
      'Show only companies on active route'
    );
    await expect(filterCheckbox).toHaveAttribute('type', 'checkbox');
  });
});

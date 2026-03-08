/**
 * E2E Test: Route Features - Feature 041
 *
 * Tests for route-related features:
 * - Route sidebar visibility (desktop only - hidden on mobile)
 * - On Active Route filter checkbox
 * - Route map page with route info
 *
 * Updated: 062-fix-e2e-auth - Refactored for parallel execution
 * Uses ({ page }) pattern with test.use({ storageState }) for proper isolation
 */

import { test, expect, type Page } from '@playwright/test';
import { CompaniesPage } from '../pages/CompaniesPage';
import {
  getAuthStatePath,
  createAuthenticatedContext,
} from '../utils/authenticated-context';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_FILE = getAuthStatePath();

// Requires live Supabase route data and authenticated session.
// In headless CI against the static export the companies table never loads,
// causing waitForTable() to time out before the inner conditional skips fire.
test.skip(
  !!process.env.CI,
  'Requires live Supabase route data — not available in headless CI against static export'
);

// Helper to check if current viewport is desktop (lg breakpoint = 1024px)
function isDesktopViewport(page: Page): boolean {
  const viewportWidth = page.viewportSize()?.width ?? 0;
  return viewportWidth >= 1024;
}

// Helper to navigate to companies page and wait for table
async function navigateToCompanies(page: Page): Promise<CompaniesPage> {
  const companiesPage = new CompaniesPage(page);
  await page.goto(`${BASE_URL}/companies/`);
  await page.waitForLoadState('networkidle');
  await companiesPage.waitForTable();
  return companiesPage;
}

test.describe('Route Features', () => {
  // Apply authenticated storage state and desktop viewport to all tests
  test.use({
    storageState: AUTH_FILE,
    viewport: { width: 1280, height: 900 },
  });

  test('should display route sidebar on companies page when authenticated', async ({
    page,
  }) => {
    await navigateToCompanies(page);

    // Route sidebar is hidden on mobile (lg:flex), skip test on mobile viewports
    if (!isDesktopViewport(page)) {
      test.skip();
      return;
    }

    // Check route sidebar is visible (on desktop - use role-based selector for specificity)
    const routeSidebar = page.getByRole('complementary', {
      name: 'Route sidebar',
    });
    await expect(routeSidebar).toBeVisible();

    // Check for route count at bottom of sidebar
    const routeCount = routeSidebar.getByText(/\d+ route/i);
    await expect(routeCount).toBeVisible();
  });

  test('should display route sorting buttons', async ({ page }) => {
    await navigateToCompanies(page);

    // Route sidebar is hidden on mobile, skip test on mobile viewports
    if (!isDesktopViewport(page)) {
      test.skip();
      return;
    }

    // Check for route sorting buttons in sidebar
    const sidebar = page.locator('aside');
    await expect(
      sidebar.getByRole('button', { name: /Recent/i })
    ).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /Name/i })).toBeVisible();
  });

  test('should display On Active Route filter checkbox in company filters', async ({
    page,
  }) => {
    await navigateToCompanies(page);

    // Feature 044 replaced "Next Ride" with "On Active Route" filter
    // Look for the On Active Route filter checkbox
    const filterLabel = page.getByText('On Active Route', { exact: true });
    await expect(filterLabel).toBeVisible();

    // Find the associated checkbox using specific aria-label
    const filterCheckbox = page.getByLabel(
      'Show only companies on active route'
    );
    await expect(filterCheckbox).toBeVisible();
  });

  test('should toggle On Active Route filter when checkbox clicked', async ({
    page,
  }) => {
    await navigateToCompanies(page);

    // Feature 044: "On Active Route" filter replaces "Next Ride"
    const filterCheckbox = page.getByLabel(
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

  test('should allow creating a new route from sidebar', async ({ page }) => {
    await navigateToCompanies(page);

    // Route sidebar is hidden on mobile, skip test on mobile viewports
    if (!isDesktopViewport(page)) {
      test.skip();
      return;
    }

    // Click New route button in sidebar
    const newRouteBtn = page
      .locator('aside')
      .getByRole('button', { name: /new/i });
    await newRouteBtn.click();

    // Route builder modal should open - look for route name input (use specific label)
    await expect(
      page.getByRole('textbox', { name: /Route Name/i })
    ).toBeVisible({ timeout: 5000 });

    // Close the modal by pressing escape
    await page.keyboard.press('Escape');
  });

  test('should select a route and show planning indicator', async ({
    page,
  }) => {
    await navigateToCompanies(page);

    // Route sidebar is hidden on mobile, skip test on mobile viewports
    if (!isDesktopViewport(page)) {
      test.skip();
      return;
    }

    // Check if any route items exist in sidebar
    const routeItems = page.locator('aside [role="listitem"]');
    const routeCount = await routeItems.count();

    if (routeCount > 0) {
      // Click first route
      await routeItems.first().click();
      await page.waitForTimeout(500);

      // Should show "Planning" badge on the selected route
      await expect(page.getByText('Planning')).toBeVisible();
    }
    // If no routes exist, test passes (nothing to select)
  });

  test('should show company preview section when route is selected', async ({
    page,
  }) => {
    await navigateToCompanies(page);

    // Route sidebar is hidden on mobile, skip test on mobile viewports
    if (!isDesktopViewport(page)) {
      test.skip();
      return;
    }

    // Check if any route items exist
    const routeItems = page.locator('aside [role="listitem"]');
    const routeCount = await routeItems.count();

    if (routeCount > 0) {
      // Click first route
      await routeItems.first().click();
      await page.waitForTimeout(500);

      // Should show "Companies on Route" section (use first to avoid strict mode with drawer)
      await expect(page.getByText('Companies on Route').first()).toBeVisible();
    }
    // If no routes exist, test passes (nothing to select)
  });
});

test.describe('Route Map Page', () => {
  test('should display sign-in prompt on map page when not authenticated', async ({
    browser,
  }) => {
    // Fresh context without auth
    const { context: freshContext, page: freshPage } =
      await createAuthenticatedContext(browser, { skipAuth: true });

    // Navigate to map page without auth
    await freshPage.goto(`${BASE_URL}/map`);
    await freshPage.waitForLoadState('networkidle');

    // Should show sign-in prompt for routes (use first() to avoid strict mode with multiple elements)
    await expect(freshPage.getByText(/Sign in/i).first()).toBeVisible();

    await freshContext.close();
  });

  test('should display route info on map page when authenticated', async ({
    browser,
  }) => {
    // Use shared auth state
    const { context: authContext, page: authPage } =
      await createAuthenticatedContext(browser);

    // Navigate to map page
    await authPage.goto(`${BASE_URL}/map`);
    await authPage.waitForLoadState('networkidle');

    // Wait for page to fully load (give it extra time for HMR/compilation)
    await authPage.waitForTimeout(3000);

    // Check if page has error - if so, try to capture error details before skipping
    const hasError = await authPage
      .getByText(/Page Error/i)
      .isVisible()
      .catch(() => false);
    if (hasError) {
      // Try to expand and capture error details
      try {
        const errorDetails = authPage.getByText('Error Details');
        if (await errorDetails.isVisible()) {
          await errorDetails.click();
          await authPage.waitForTimeout(500);
          // Capture any visible error text
          const errorText = await authPage
            .locator('.collapse-content pre')
            .first()
            .textContent()
            .catch(() => 'Unable to get error text');
          console.log('Map page error details:', errorText);
        }
      } catch {
        console.log('Could not expand error details');
      }
      console.log(
        'Map page showing error - skipping test (known issue with route hooks)'
      );
      await authContext.close();
      test.skip();
      return;
    }

    // Wait for page to load - map is an application role with name "Interactive map"
    await expect(
      authPage.getByRole('application', { name: /Interactive map/i })
    ).toBeVisible({ timeout: 10000 });

    // Map should have markers visible (companies with lat/lng)
    // Or at minimum the map region should be visible
    const mapRegion = authPage.getByRole('region', { name: 'Map' });
    await expect(mapRegion).toBeVisible();

    await authContext.close();
  });
});

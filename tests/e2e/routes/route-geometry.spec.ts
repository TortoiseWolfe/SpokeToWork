/**
 * E2E Test: Route Geometry Generation via OSRM
 *
 * Tests that adding companies to a route generates actual bicycle route geometry
 * via the OSRM routing service.
 */

import { test, expect } from '@playwright/test';
import { CompaniesPage } from '../pages/CompaniesPage';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test user credentials from env
const testEmail =
  process.env.TEST_USER_EMAIL || process.env.TEST_USER_PRIMARY_EMAIL;
const testPassword =
  process.env.TEST_USER_PASSWORD || process.env.TEST_USER_PRIMARY_PASSWORD;

if (!testEmail || !testPassword) {
  throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env');
}

test.describe('Route Geometry Generation', () => {
  test('should generate route geometry when adding 2+ companies to a route', async ({
    page,
  }) => {
    const companiesPage = new CompaniesPage(page);

    // Step 1: Sign in
    await companiesPage.signIn(testEmail, testPassword);

    // Step 2: Navigate to companies page
    await page.goto(`${BASE_URL}/companies/`);
    await page.waitForLoadState('networkidle');
    await companiesPage.waitForTable();

    // Step 3: Select an existing route (desktop only)
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      // Wait for routes to load in sidebar
      await page.waitForTimeout(1000);

      // Click first available route in the sidebar (there should be existing routes)
      const routeItems = page
        .locator('aside')
        .locator('[class*="cursor-pointer"]');
      const routeCount = await routeItems.count();

      if (routeCount === 0) {
        console.log('No routes available in sidebar - skipping test');
        test.skip();
        return;
      }

      // Click the first route to select it
      await routeItems.first().click();
      await page.waitForTimeout(500);
    } else {
      // Skip on mobile - route sidebar not visible
      test.skip();
      return;
    }

    // Step 4: Find companies with coordinates and add them to route
    // Look for company rows with "Add to route" buttons (aria-label contains "to route")
    const addToRouteButtons = page.getByRole('button', { name: /to route/i });
    const buttonCount = await addToRouteButtons.count();

    if (buttonCount < 2) {
      console.log(
        'Not enough companies with coordinates to test route generation'
      );
      test.skip();
      return;
    }

    // Add first company
    await addToRouteButtons.first().click();
    await page.waitForTimeout(1000);

    // Add second company
    await addToRouteButtons.nth(1).click();
    await page.waitForTimeout(2000); // Wait for OSRM to generate route

    // Step 5: Navigate to map page
    await page.goto(`${BASE_URL}/map`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Wait for map and routes to load

    // Step 6: Take screenshot as proof
    await page.screenshot({
      path: `test-results/route-geometry-test-${Date.now()}.png`,
      fullPage: true,
    });

    // Step 7: Verify route info shows geometry
    // Should show "Showing X route(s) with geometry"
    const routeInfo = page.getByText(/Showing \d+ route.*with geometry/i);
    await expect(routeInfo).toBeVisible({ timeout: 10000 });

    // Step 8: Verify polyline is rendered (check for SVG path elements in the map)
    // The map container should have route polylines rendered
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible();

    // Check that SVG paths exist (Leaflet renders polylines as SVG)
    const svgPaths = page.locator('.leaflet-overlay-pane svg path');
    const pathCount = await svgPaths.count();
    console.log(`Found ${pathCount} SVG path elements in map`);

    // We should have at least one path (route polyline)
    expect(pathCount).toBeGreaterThan(0);

    console.log('Route geometry test completed successfully!');
  });

  test('should display route with geometry on map page', async ({ page }) => {
    const companiesPage = new CompaniesPage(page);

    // Sign in
    await companiesPage.signIn(testEmail, testPassword);

    // Go directly to map
    await page.goto(`${BASE_URL}/map`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: `test-results/map-routes-display-${Date.now()}.png`,
      fullPage: true,
    });

    // Check for route info header
    const heading = page.getByRole('heading', { name: /Interactive Map/i });
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Check for routes with geometry message OR no routes message
    const hasRoutes = await page
      .getByText(/Showing \d+ route/i)
      .isVisible()
      .catch(() => false);
    const noRoutes = await page
      .getByText(/No routes created/i)
      .isVisible()
      .catch(() => false);
    const createRoutes = await page
      .getByText(/Create routes/i)
      .isVisible()
      .catch(() => false);

    // One of these should be true
    expect(hasRoutes || noRoutes || createRoutes).toBe(true);

    if (hasRoutes) {
      // Verify polylines are actually rendered
      const svgPaths = page.locator('.leaflet-overlay-pane svg path');
      const pathCount = await svgPaths.count();
      console.log(`Map shows routes with ${pathCount} polyline paths`);
      expect(pathCount).toBeGreaterThan(0);
    }
  });
});

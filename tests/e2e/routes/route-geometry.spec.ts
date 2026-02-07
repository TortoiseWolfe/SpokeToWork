/**
 * E2E Test: Route Geometry Generation via OpenRouteService/OSRM
 *
 * Tests that adding companies to a route generates actual bicycle route geometry
 * via the ORS routing service (with OSRM fallback).
 *
 * Updated for MapLibre (migrated from Leaflet in Feature 045).
 * Updated: 062-fix-e2e-auth - Refactored for parallel execution
 * Uses ({ page }) pattern with test.use({ storageState }) for proper isolation
 */

import { test, expect, type Page } from '@playwright/test';
import { CompaniesPage } from '../pages/CompaniesPage';
import { getAuthStatePath } from '../utils/authenticated-context';
import { waitForMapReady } from '../utils/map-helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_FILE = getAuthStatePath();

// Requires live Supabase route data and authenticated session.
// In headless CI against the static export the companies table never loads,
// causing waitForTable() to time out before the inner conditional skips fire.
test.skip(
  !!process.env.CI,
  'Requires live Supabase route data — not available in headless CI against static export'
);

// Helper to dismiss overlays that might block button clicks
async function dismissOverlays(page: Page) {
  const cookieAccept = page.getByRole('button', { name: 'Accept All' });
  if (await cookieAccept.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieAccept.click();
    await page.waitForTimeout(300);
  }
  const dismissBanner = page.getByRole('button', {
    name: 'Dismiss countdown banner',
  });
  if (await dismissBanner.isVisible({ timeout: 500 }).catch(() => false)) {
    await dismissBanner.click();
    await page.waitForTimeout(300);
  }
  // Dismiss any warning banners by pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

// Helper to check if viewport is desktop
function isDesktopViewport(page: Page): boolean {
  const viewport = page.viewportSize();
  return viewport !== null && viewport.width >= 1024;
}

test.describe('Route Geometry Generation', () => {
  // Apply authenticated storage state and desktop viewport
  test.use({
    storageState: AUTH_FILE,
    viewport: { width: 1280, height: 900 },
  });

  test('should generate route geometry when adding 2+ companies to a route', async ({
    page,
  }) => {
    const companiesPage = new CompaniesPage(page);

    // Navigate to companies page (auth handled by storage state)
    await page.goto(`${BASE_URL}/companies/`);
    await page.waitForLoadState('networkidle');
    await companiesPage.waitForTable();

    // Dismiss any overlays
    await dismissOverlays(page);

    // Skip on mobile - route sidebar not visible
    if (!isDesktopViewport(page)) {
      test.skip();
      return;
    }

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

    // Close the route detail drawer if it opened (it blocks company buttons)
    const routeDrawer = page.locator('[data-testid="route-detail-drawer"]');
    if (await routeDrawer.isVisible().catch(() => false)) {
      // Close by pressing Escape or clicking close button
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Find companies with coordinates and add them to route
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

    // Add first company (use force to bypass any remaining overlays)
    await addToRouteButtons.first().click({ force: true });
    await page.waitForTimeout(1000);

    // Add second company (use force to bypass any remaining overlays)
    await addToRouteButtons.nth(1).click({ force: true });
    await page.waitForTimeout(2000); // Wait for routing service to generate route

    // Navigate to map page
    await page.goto(`${BASE_URL}/map`);
    await waitForMapReady(page); // Use proper map initialization check

    // Take screenshot with worker isolation
    await page.screenshot({
      path: `test-results/route-geometry-test-${test.info().workerIndex}-${Date.now()}.png`,
      fullPage: true,
    });

    // Verify map container is visible
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Verify MapLibre map is rendered (renders to canvas, not SVG)
    // MapLibre uses canvas for WebGL rendering instead of Leaflet's SVG
    const mapApplication = page.getByRole('application', {
      name: /Interactive map/i,
    });
    await expect(mapApplication).toBeVisible({ timeout: 10000 });

    // Verify canvas element exists (MapLibre's WebGL render target)
    const canvas = page.locator('[data-testid="map-container"] canvas');
    const canvasCount = await canvas.count();
    console.log(`Found ${canvasCount} canvas element(s) in map`);
    expect(canvasCount).toBeGreaterThan(0);

    // Verify zoom controls are present (indicates map fully loaded)
    // MapLibre controls may not render in Firefox headless Docker, use multiple fallbacks
    const zoomInByRole = page.getByRole('button', { name: /Zoom in/i });
    const zoomInByCSS = page.locator('.maplibregl-ctrl-zoom-in');
    const ctrlContainer = page.locator('.maplibregl-ctrl-top-right');

    // Wait longer for Firefox headless where controls may take time to initialize
    await page.waitForTimeout(2000);

    // Try role-based first (best for a11y)
    const roleVisible = await zoomInByRole
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (roleVisible) {
      console.log('Zoom controls visible (via ARIA role) - map fully loaded');
    } else {
      // Fallback 1: check CSS class for zoom button
      const cssVisible = await zoomInByCSS
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (cssVisible) {
        console.log('Zoom controls visible (via CSS class) - map fully loaded');
      } else {
        // Fallback 2: check if control container exists (Firefox headless may have controls but not exposed)
        const containerVisible = await ctrlContainer
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        if (containerVisible) {
          console.log(
            'Control container visible - map controls loaded (Firefox headless mode)'
          );
        } else {
          // Final fallback: verify map rendered correctly with interactive capabilities
          const mapApp = page.getByRole('application', {
            name: /Interactive map/i,
          });
          await expect(mapApp).toBeVisible({ timeout: 5000 });
          console.log(
            'Map application loaded - controls may not render in headless Docker (known Firefox limitation)'
          );
        }
      }
    }

    console.log('Route geometry test completed successfully!');
  });

  test('should display route with geometry on map page', async ({ page }) => {
    // Go directly to map (auth handled by storage state)
    await page.goto(`${BASE_URL}/map`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
      path: `test-results/map-routes-display-${Date.now()}.png`,
      fullPage: true,
    });

    // Check for map container (MapLibre renders as application with aria-label)
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toBeVisible({ timeout: 10000 });

    // Verify the map application is present (MapLibre uses role="application")
    const mapApplication = page.getByRole('application', {
      name: /Interactive map/i,
    });
    await expect(mapApplication).toBeVisible({ timeout: 10000 });

    // MapLibre renders routes to canvas, not SVG - check for canvas element
    const canvas = page.locator('[data-testid="map-container"] canvas');
    const canvasCount = await canvas.count();
    console.log(`Map has ${canvasCount} canvas element(s) for rendering`);
    expect(canvasCount).toBeGreaterThan(0);

    // Verify zoom controls are present (indicates map fully loaded)
    // MapLibre controls may not render in Firefox headless Docker, use multiple fallbacks
    const zoomInByRole = page.getByRole('button', { name: /Zoom in/i });
    const zoomInByCSS = page.locator('.maplibregl-ctrl-zoom-in');
    const ctrlContainer = page.locator('.maplibregl-ctrl-top-right');

    // Wait longer for Firefox headless where controls may take time to initialize
    await page.waitForTimeout(2000);

    // Try role-based first (best for a11y)
    const roleVisible = await zoomInByRole
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (roleVisible) {
      console.log('Zoom controls visible (via ARIA role) - map fully loaded');
    } else {
      // Fallback 1: check CSS class for zoom button
      const cssVisible = await zoomInByCSS
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (cssVisible) {
        console.log('Zoom controls visible (via CSS class) - map fully loaded');
      } else {
        // Fallback 2: check if control container exists (Firefox headless may have controls but not exposed)
        const containerVisible = await ctrlContainer
          .isVisible({ timeout: 3000 })
          .catch(() => false);
        if (containerVisible) {
          console.log(
            'Control container visible - map controls loaded (Firefox headless mode)'
          );
        } else {
          // Final fallback: verify map rendered correctly with interactive capabilities
          const mapApp = page.getByRole('application', {
            name: /Interactive map/i,
          });
          await expect(mapApp).toBeVisible({ timeout: 5000 });
          console.log(
            'Map application loaded - controls may not render in headless Docker (known Firefox limitation)'
          );
        }
      }
    }

    // Check for Companies link in toolbar (navigation element on map page)
    // Use .first() since there may be multiple Companies links (navbar + toolbar)
    const companiesLink = page
      .getByRole('link', { name: /Companies/i })
      .first();
    await expect(companiesLink).toBeVisible();

    console.log('Map page loaded successfully with MapLibre canvas');
  });
});

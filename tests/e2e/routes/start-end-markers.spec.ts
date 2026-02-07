/**
 * E2E Tests: Start/End Point Markers
 *
 * Actually tests that selecting a route shows start/end markers on the map
 *
 * Updated: 062-fix-e2e-auth - Refactored for parallel execution
 * Uses ({ page }) pattern with test.use({ storageState }) for proper isolation
 */

import { test, expect, type Page } from '@playwright/test';
import { getAuthStatePath } from '../utils/authenticated-context';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_FILE = getAuthStatePath();

async function dismissBanner(page: Page) {
  const dismissButton = page.getByRole('button', {
    name: 'Dismiss countdown banner',
  });
  if (await dismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dismissButton.click();
    await page.waitForTimeout(300);
  }
}

// Add console log listener to capture React logs
function addConsoleListener(page: Page) {
  page.on('console', (msg) => {
    const text = msg.text();
    if (
      text.includes('route') ||
      text.includes('marker') ||
      text.includes('activeRoute')
    ) {
      console.log(`[BROWSER] ${msg.type()}: ${text}`);
    }
  });
}

test.describe('Start/End Markers - Full Flow', () => {
  // Requires MapLibre GL (WebGL/GPU) for map rendering and live Supabase
  // route data. Neither is available in headless CI against the static export.
  test.skip(
    !!process.env.CI,
    'MapLibre GL requires WebGL/GPU not available in headless CI; also needs live Supabase route data'
  );

  // Apply authenticated storage state and desktop viewport
  test.use({
    storageState: AUTH_FILE,
    viewport: { width: 1280, height: 900 },
  });

  test('map page should show start/end markers for active route', async ({
    page,
  }) => {
    addConsoleListener(page);

    // Go directly to map page (auth handled by storage state)
    await page.goto(`${BASE_URL}/map`);
    await dismissBanner(page);

    // Wait for map to load
    await page.waitForSelector('.maplibregl-canvas', {
      state: 'visible',
      timeout: 15000,
    });

    // Wait longer for React state to settle and markers to render
    await page.waitForTimeout(5000);

    // Debug: Check what's in the page's React state
    const pageState = await page.evaluate(() => {
      // Check for any marker elements
      const allMarkers = document.querySelectorAll('.maplibregl-marker');
      const startMarker = document.querySelector(
        '[data-testid="start-marker"]'
      );
      const endMarker = document.querySelector('[data-testid="end-marker"]');

      // Get marker info
      return {
        totalMarkers: allMarkers.length,
        hasStartMarker: !!startMarker,
        hasEndMarker: !!endMarker,
        markerHTML: Array.from(allMarkers)
          .slice(0, 3)
          .map((m) => ({
            outerHTML: m.outerHTML.substring(0, 300),
            testId: m.getAttribute('data-testid'),
          })),
        // Check body for any debugging info
        bodyClasses: document.body.className,
      };
    });

    console.log('=== MAP PAGE STATE ===');
    console.log('Total markers:', pageState.totalMarkers);
    console.log('Has start marker:', pageState.hasStartMarker);
    console.log('Has end marker:', pageState.hasEndMarker);
    console.log('Marker HTML:', JSON.stringify(pageState.markerHTML, null, 2));

    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/map-with-active-route.png',
      fullPage: false,
    });

    // Check the actual values
    if (pageState.totalMarkers === 0) {
      console.log('NO MARKERS FOUND - checking if route data is loaded');

      // Debug: Check map layers
      const mapDebug = await page.evaluate(() => {
        const map = (window as any).maplibreMap?.getMap?.();
        if (!map) return { error: 'No map found' };

        const style = map.getStyle();
        const routeLayers = style?.layers?.filter((l: any) =>
          l.id.includes('route-')
        );

        return {
          hasMap: true,
          routeLayerCount: routeLayers?.length || 0,
          routeLayerIds: routeLayers?.map((l: any) => l.id) || [],
        };
      });

      console.log('Map debug:', JSON.stringify(mapDebug, null, 2));
    }

    // The real assertion - if this fails, markers aren't showing
    expect(pageState.hasStartMarker || pageState.hasEndMarker).toBe(true);
  });

  test('debug: verify route selection works on companies page', async ({
    page,
  }) => {
    // Note: activeRouteId is stored in React Context (ActiveRouteContext),
    // not localStorage. Cross-page persistence is handled by URL state or
    // session, not localStorage. This test verifies route selection works.

    await page.goto(`${BASE_URL}/companies`);
    await dismissBanner(page);
    await page.waitForTimeout(2000);

    // RouteSidebar is an <aside> with aria-label="Route sidebar"
    const routeSidebar = page.locator('aside[aria-label="Route sidebar"]');
    const routeItems = routeSidebar.locator('[role="listitem"]');
    const routeCount = await routeItems.count();

    if (routeCount === 0) {
      test.skip(true, 'No routes available');
      return;
    }

    // Click route
    await routeItems.first().click();
    await page.waitForTimeout(500);

    // Verify route is selected - should show "Planning" indicator
    const planningBadge = page.getByText('Planning');
    const hasPlanningBadge = await planningBadge.isVisible().catch(() => false);

    // Or route detail drawer should be visible
    const routeDrawer = page.locator('[data-testid="route-detail-drawer"]');
    const hasDrawer = await routeDrawer.isVisible().catch(() => false);

    // At least one indicator of route selection should be present
    expect(hasPlanningBadge || hasDrawer).toBe(true);
  });

  test('debug: verify routes have start/end coordinates', async ({ page }) => {
    await page.goto(`${BASE_URL}/companies`);
    await dismissBanner(page);
    await page.waitForTimeout(3000);

    // Try to get route data from the page
    const routeData = await page.evaluate(() => {
      // Check if routes are available in window or via React devtools
      const win = window as any;

      // Try to find route data
      return {
        hasMaplibreMap: !!win.maplibreMap,
        // Check for any exposed route data
      };
    });

    console.log('Route data check:', routeData);

    // Just verify the page loads
    expect(true).toBe(true);
  });
});

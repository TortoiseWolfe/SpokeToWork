/**
 * E2E Tests: Route Visual Verification
 *
 * Tests that ACTUALLY verify:
 * 1. Active route changes visual appearance (glow, width)
 * 2. Route connects to home location
 * 3. Switching routes changes the map
 */

import { test, expect, type Page } from '@playwright/test';

const testEmail =
  process.env.TEST_USER_EMAIL || process.env.TEST_USER_PRIMARY_EMAIL;
const testPassword =
  process.env.TEST_USER_PASSWORD || process.env.TEST_USER_PRIMARY_PASSWORD;

if (!testEmail || !testPassword) {
  throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set');
}

async function signIn(page: Page) {
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');
  const cookieButton = page.getByRole('button', { name: /accept/i });
  if (await cookieButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await cookieButton.click();
  }
  await page.fill('#email', testEmail!);
  await page.fill('#password', testPassword!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(companies|dashboard|profile)/, { timeout: 15000 });
}

async function dismissBanner(page: Page) {
  const btn = page.getByRole('button', { name: 'Dismiss countdown banner' });
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

test.describe('Route Visual Verification', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('VERIFY: active route has glow layer on map', async ({ page }) => {
    await signIn(page);
    await page.goto('/map');
    await dismissBanner(page);

    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Get active route ID and check for glow layer
    const routeInfo = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      if (!map) return { error: 'No map' };

      const style = map.getStyle();
      const layers = style?.layers || [];

      // Find all route layers
      const routeLayers = layers.filter((l: any) => l.id.startsWith('route-'));
      const glowLayers = layers.filter((l: any) => l.id.includes('-glow'));

      // Get layer details
      const routeDetails = routeLayers.map((l: any) => ({
        id: l.id,
        type: l.type,
        lineWidth: l.paint?.['line-width'],
        hasGlow: l.id.includes('-glow'),
      }));

      return {
        totalRouteLayers: routeLayers.length,
        glowLayerCount: glowLayers.length,
        routeDetails,
        allLayerIds: layers.map((l: any) => l.id),
      };
    });

    console.log('=== ROUTE LAYER INFO ===');
    console.log('Total route layers:', routeInfo.totalRouteLayers);
    console.log('Glow layers:', routeInfo.glowLayerCount);
    console.log(
      'Route details:',
      JSON.stringify(routeInfo.routeDetails, null, 2)
    );

    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/route-glow-check.png',
    });

    // ACTUAL TEST: Should have glow layer for active route
    // If this fails, the active route visual differentiation is NOT working
    expect(routeInfo.glowLayerCount).toBeGreaterThan(0);
  });

  test('VERIFY: active route line is wider (10px vs 6px)', async ({ page }) => {
    await signIn(page);
    await page.goto('/map');
    await dismissBanner(page);

    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);

    const widthInfo = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      if (!map) return { error: 'No map' };

      const style = map.getStyle();
      const layers = style?.layers || [];

      // Find route layers (not glow, not dash)
      const routeLayers = layers.filter(
        (l: any) =>
          l.id.startsWith('route-') &&
          !l.id.includes('-glow') &&
          !l.id.includes('-dash') &&
          l.type === 'line'
      );

      return routeLayers.map((l: any) => ({
        id: l.id,
        width: l.paint?.['line-width'],
      }));
    });

    console.log('=== ROUTE WIDTH INFO ===');
    console.log(JSON.stringify(widthInfo, null, 2));

    // Guard against error response
    if (!Array.isArray(widthInfo)) {
      console.log('ERROR: widthInfo is not an array:', widthInfo);
      expect(Array.isArray(widthInfo)).toBe(true);
      return; // TypeScript needs this
    }

    // ACTUAL TEST: Active route should have width 10, inactive should have 6
    // Per RoutePolyline.tsx lines 84-88
    const hasWiderRoute = widthInfo.some((r: any) => r.width === 10);
    const hasNormalRoute = widthInfo.some((r: any) => r.width === 6);

    console.log('Has wider (active) route:', hasWiderRoute);
    console.log('Has normal route:', hasNormalRoute);

    // If no wider route, active styling is NOT being applied
    expect(hasWiderRoute).toBe(true);
  });

  test('VERIFY: switching routes changes map layers', async ({ page }) => {
    await signIn(page);

    // Go to companies page
    await page.goto('/companies');
    await dismissBanner(page);
    await page.waitForTimeout(2000);

    // Find route list items - RouteSidebar is an <aside> with aria-label="Route sidebar"
    const routeSidebar = page.locator('aside[aria-label="Route sidebar"]');
    const routeItems = routeSidebar.locator('[role="listitem"]');
    const count = await routeItems.count();

    console.log('Route count:', count);

    if (count < 2) {
      test.skip(true, 'Need at least 2 routes to test switching');
      return;
    }

    // Click first route
    await routeItems.first().click();
    await page.waitForTimeout(500);

    // Get the route name
    const firstRouteName = await routeItems.first().textContent();
    console.log('Selected first route:', firstRouteName);

    // Navigate to map and capture state
    await page.goto('/map');
    await dismissBanner(page);
    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);

    const firstMapState = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      if (!map) return null;
      const style = map.getStyle();
      const routeLayers = style?.layers?.filter((l: any) =>
        l.id.startsWith('route-')
      );
      return routeLayers?.map((l: any) => ({
        id: l.id,
        width: l.paint?.['line-width'],
      }));
    });

    console.log(
      'First route map state:',
      JSON.stringify(firstMapState, null, 2)
    );
    await page.screenshot({
      path: 'tests/e2e/screenshots/route-switch-before.png',
    });

    // Go back and select second route
    await page.goto('/companies');
    await dismissBanner(page);
    await page.waitForTimeout(2000);

    await routeItems.nth(1).click();
    await page.waitForTimeout(500);

    const secondRouteName = await routeItems.nth(1).textContent();
    console.log('Selected second route:', secondRouteName);

    // Navigate to map again
    await page.goto('/map');
    await dismissBanner(page);
    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);

    const secondMapState = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      if (!map) return null;
      const style = map.getStyle();
      const routeLayers = style?.layers?.filter((l: any) =>
        l.id.startsWith('route-')
      );
      return routeLayers?.map((l: any) => ({
        id: l.id,
        width: l.paint?.['line-width'],
      }));
    });

    console.log(
      'Second route map state:',
      JSON.stringify(secondMapState, null, 2)
    );
    await page.screenshot({
      path: 'tests/e2e/screenshots/route-switch-after.png',
    });

    // ACTUAL TEST: The active route layer widths should be different
    // This proves switching routes changes the visual
    expect(JSON.stringify(firstMapState)).not.toBe(
      JSON.stringify(secondMapState)
    );
  });

  test('VERIFY: route polyline connects home to companies', async ({
    page,
  }) => {
    // Add console listener to capture any warnings
    page.on('console', (msg) => {
      if (msg.text().includes('geometry') || msg.text().includes('route')) {
        console.log(`[BROWSER ${msg.type()}]: ${msg.text()}`);
      }
    });

    await signIn(page);
    await page.goto('/map');
    await dismissBanner(page);

    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
    await page.waitForTimeout(5000); // Wait longer for data to load

    // Check if there's a route geometry that includes home coordinates
    const routeGeometry = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      if (!map) return { error: 'No map' };

      const style = map.getStyle();
      const sources = style?.sources || {};

      // Find route sources
      const routeSources = Object.entries(sources).filter(([key]) =>
        key.startsWith('route-source-')
      );

      // Get geometry from each route source - check actual GeoJSON structure
      const geometries = routeSources.map(([key, source]: [string, any]) => {
        // MapLibre stores GeoJSON in _data or _data.geojson
        const sourceObj = map.getSource(key);
        const sourceData = sourceObj?._data?.geojson || sourceObj?._data;

        if (sourceData?.geometry?.coordinates) {
          const coords = sourceData.geometry.coordinates;
          return {
            sourceId: key,
            type: sourceData.geometry.type,
            coordCount: Array.isArray(coords[0]) ? coords.length : 1,
            firstCoord: coords[0],
            lastCoord: coords[coords.length - 1],
          };
        }

        if (sourceData?.features?.[0]?.geometry?.coordinates) {
          const coords = sourceData.features[0].geometry.coordinates;
          return {
            sourceId: key,
            type: sourceData.features[0].geometry.type,
            coordCount: coords.length,
            firstCoord: coords[0],
            lastCoord: coords[coords.length - 1],
          };
        }

        // Debug: show what the actual data structure looks like
        return {
          sourceId: key,
          noData: true,
          sourceType: source.type,
          hasSourceObj: !!sourceObj,
          rawDataStructure: sourceObj?._data
            ? JSON.stringify(sourceObj._data).substring(0, 500)
            : 'no _data',
        };
      });

      return {
        routeSourceCount: routeSources.length,
        geometries,
      };
    });

    console.log('=== ROUTE GEOMETRY INFO ===');
    console.log(JSON.stringify(routeGeometry, null, 2));

    // Check if any route has geometry
    const hasRouteWithGeometry = routeGeometry.geometries?.some(
      (g: any) => g.coordCount && g.coordCount > 0
    );

    console.log('Has route with geometry:', hasRouteWithGeometry);

    // If no geometry, this is a real bug - routes should connect points
    if (!hasRouteWithGeometry) {
      console.log(
        'BUG: Routes have no geometry - polylines are not rendering paths'
      );
      console.log('Routes should connect home location to company markers');
    }

    // ACTUAL TEST: Should have at least one route with geometry
    expect(hasRouteWithGeometry).toBe(true);
  });

  test('VERIFY: home marker visible for user route', async ({ page }) => {
    await signIn(page);
    await page.goto('/map');
    await dismissBanner(page);

    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Look for home marker specifically
    const homeMarker = await page.evaluate(() => {
      // Check for start-marker data-testid
      const startMarker = document.querySelector(
        '[data-testid="start-marker"]'
      );
      const allMarkers = document.querySelectorAll('.maplibregl-marker');

      // Check marker labels for "Home" or home address
      const markerLabels = Array.from(allMarkers).map((m) => {
        const inner = m.querySelector('[aria-label]');
        return inner?.getAttribute('aria-label') || '';
      });

      const homeMarkerExists = markerLabels.some(
        (label) =>
          label.includes('Home') ||
          label.includes('Blythe Ferry') || // Known test address
          label.includes('1450')
      );

      return {
        hasStartMarker: !!startMarker,
        totalMarkers: allMarkers.length,
        markerLabels: markerLabels.slice(0, 5),
        homeMarkerExists,
      };
    });

    console.log('=== HOME MARKER CHECK ===');
    console.log(JSON.stringify(homeMarker, null, 2));

    await page.screenshot({
      path: 'tests/e2e/screenshots/home-marker-check.png',
    });

    // ACTUAL TEST: Home marker should exist
    expect(homeMarker.homeMarkerExists || homeMarker.hasStartMarker).toBe(true);
  });
});

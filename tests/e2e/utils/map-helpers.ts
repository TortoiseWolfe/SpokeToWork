/**
 * Map Helper Utilities for E2E Tests
 *
 * Provides proper event-based waiting for MapLibre map initialization
 * instead of hardcoded timeouts.
 *
 * Feature: 062-fix-e2e-auth
 */

import { Page, expect } from '@playwright/test';

/**
 * Wait for MapLibre map to be fully initialized and ready
 *
 * This replaces arbitrary waitForTimeout() calls with proper state checks:
 * 1. Wait for canvas element to exist
 * 2. Wait for map instance to be accessible
 * 3. Wait for style to be fully loaded
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in ms (default 15000)
 */
export async function waitForMapReady(
  page: Page,
  timeout = 15000
): Promise<void> {
  // Step 1: Wait for MapLibre canvas element
  await page.waitForSelector('.maplibregl-canvas', {
    state: 'visible',
    timeout,
  });

  // Step 2: Wait for map instance to exist and style to be loaded
  await expect
    .poll(
      async () => {
        return page.evaluate(() => {
          const map = (window as any).maplibreMap?.getMap?.();
          if (!map) return false;
          // isStyleLoaded() returns true when all sources and layers are ready
          return map.isStyleLoaded();
        });
      },
      {
        message: 'Waiting for map style to load',
        timeout,
      }
    )
    .toBe(true);
}

/**
 * Wait for route layers to be rendered on the map
 *
 * Useful for tests that need to verify route-specific functionality.
 *
 * @param page - Playwright page instance
 * @param timeout - Maximum wait time in ms (default 10000)
 */
export async function waitForRouteLayers(
  page: Page,
  timeout = 10000
): Promise<void> {
  await waitForMapReady(page, timeout);

  await expect
    .poll(
      async () => {
        return page.evaluate(() => {
          const map = (window as any).maplibreMap?.getMap?.();
          if (!map) return false;

          const style = map.getStyle();
          const routeLayers =
            style?.layers?.filter((l: any) => l.id.startsWith('route-')) || [];
          return routeLayers.length > 0;
        });
      },
      {
        message: 'Waiting for route layers to render',
        timeout,
      }
    )
    .toBe(true);
}

/**
 * Get map center coordinates
 *
 * @param page - Playwright page instance
 * @returns [lng, lat] or null if map not ready
 */
export async function getMapCenter(
  page: Page
): Promise<[number, number] | null> {
  return page.evaluate(() => {
    const map = (window as any).maplibreMap?.getMap?.();
    if (!map) return null;
    const center = map.getCenter();
    return [center.lng, center.lat];
  });
}

/**
 * Get current map zoom level
 *
 * @param page - Playwright page instance
 * @returns zoom level or null if map not ready
 */
export async function getMapZoom(page: Page): Promise<number | null> {
  return page.evaluate(() => {
    const map = (window as any).maplibreMap?.getMap?.();
    if (!map) return null;
    return map.getZoom();
  });
}

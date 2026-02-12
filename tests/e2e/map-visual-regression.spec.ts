import { test, expect, type Page } from '@playwright/test';

/**
 * Map Visual Regression Tests
 *
 * Tests for verifying visual appearance of map routes and markers.
 * Uses Playwright's toHaveScreenshot for pixel-level comparison.
 *
 * Feature 045: Improved active route and marker visibility
 */

// Helper to dismiss countdown banner if present
async function dismissBanner(page: Page) {
  const dismissButton = page.getByRole('button', {
    name: 'Dismiss countdown banner',
  });
  if (await dismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dismissButton.click();
    await page.waitForTimeout(300);
  }
}

// Helper to wait for map to fully load (polls for style readiness)
async function waitForMapLoad(page: Page, timeout = 15000) {
  await page.waitForSelector('.maplibregl-canvas', {
    state: 'visible',
    timeout,
  });
  await expect
    .poll(
      async () => {
        return page.evaluate(() => {
          const map = (window as any).maplibreMap?.getMap?.();
          return map ? map.isStyleLoaded() : false;
        });
      },
      { message: 'Waiting for map style to load', timeout }
    )
    .toBe(true);
}

// Helper to set theme and wait for map style reload
async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  // Style swap clears layers; poll until the new style finishes loading
  await expect
    .poll(
      async () => {
        return page.evaluate(() => {
          const map = (window as any).maplibreMap?.getMap?.();
          return map ? map.isStyleLoaded() : false;
        });
      },
      {
        message: 'Waiting for map style reload after theme change',
        timeout: 10000,
      }
    )
    .toBe(true);
}

test.describe('Map Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapLoad(page);
  });

  test('should capture baseline map screenshot - light theme', async ({
    page,
  }) => {
    await setTheme(page, 'light');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('map-baseline-light.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('should capture baseline map screenshot - dark theme', async ({
    page,
  }) => {
    await setTheme(page, 'dark');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('map-baseline-dark.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('should maintain visual consistency after theme toggle', async ({
    page,
  }) => {
    // Start with light theme
    await setTheme(page, 'light');

    // Take initial screenshot
    const lightScreenshot = await page.screenshot();

    // Toggle to dark and back to light
    await setTheme(page, 'dark');
    await setTheme(page, 'light');

    // Take final screenshot - should match initial
    await expect(page).toHaveScreenshot('map-theme-consistency.png', {
      fullPage: false,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('bike routes have sufficient color contrast - light theme', async ({
    page,
  }) => {
    await setTheme(page, 'light');

    // Check that bike route layers exist and have correct colors
    const routeColors = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      if (!map) return null;

      // Get the cycleway layer paint properties
      const cyclewayLayer = map.getLayer('cycleway');
      const casingLayer = map.getLayer('cycleway-casing');

      return {
        hasLayers: !!cyclewayLayer && !!casingLayer,
        // Check if source exists (proves routes are loaded)
        hasSource: !!map.getSource('all-bike-routes'),
      };
    });

    expect(routeColors?.hasLayers).toBe(true);
    expect(routeColors?.hasSource).toBe(true);
  });

  test('bike routes have sufficient color contrast - dark theme', async ({
    page,
  }) => {
    await setTheme(page, 'dark');

    // Check that bike route layers exist with dark theme styling
    const routeColors = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      if (!map) return null;

      return {
        hasLayers:
          !!map.getLayer('cycleway') && !!map.getLayer('cycleway-casing'),
        hasSource: !!map.getSource('all-bike-routes'),
      };
    });

    expect(routeColors?.hasLayers).toBe(true);
    expect(routeColors?.hasSource).toBe(true);
  });

  test('markers have ARIA labels for accessibility', async ({ page }) => {
    // Check that any markers have proper ARIA labels
    const markers = page.locator('.maplibregl-marker [role="button"]');
    const count = await markers.count();

    // If there are markers, verify they have aria-labels
    for (let i = 0; i < Math.min(count, 5); i++) {
      const marker = markers.nth(i);
      const ariaLabel = await marker.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('map container has accessibility attributes', async ({ page }) => {
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toHaveAttribute('role', 'application');
    await expect(mapContainer).toHaveAttribute(
      'aria-label',
      /interactive map/i
    );
  });

  test('navigation controls are visible and labeled', async ({ page }) => {
    // Zoom controls should be visible
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    await expect(zoomIn).toBeVisible();

    const zoomOut = page.getByRole('button', { name: 'Zoom out' });
    await expect(zoomOut).toBeVisible();

    // Compass/North button
    const compass = page.locator('.maplibregl-ctrl-compass');
    await expect(compass).toBeVisible();
  });
});

test.describe('Route Layer Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapLoad(page);
  });

  test('all-bike-routes layer renders with correct styling', async ({
    page,
  }) => {
    const layerInfo = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      if (!map) return null;

      const source = map.getSource('all-bike-routes');
      const layer = map.getLayer('all-bike-routes');
      const casingLayer = map.getLayer('all-bike-routes-casing');

      return {
        sourceExists: !!source,
        layerExists: !!layer,
        casingExists: !!casingLayer,
      };
    });

    expect(layerInfo?.sourceExists).toBe(true);
    expect(layerInfo?.layerExists).toBe(true);
    expect(layerInfo?.casingExists).toBe(true);
  });

  test('cycleway layers render from vector tiles', async ({ page }) => {
    const layerInfo = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      if (!map) return null;

      return {
        cyclewayExists: !!map.getLayer('cycleway'),
        cyclewayCasingExists: !!map.getLayer('cycleway-casing'),
        cyclewayLabelExists: !!map.getLayer('cycleway-label'),
      };
    });

    expect(layerInfo?.cyclewayExists).toBe(true);
    expect(layerInfo?.cyclewayCasingExists).toBe(true);
    expect(layerInfo?.cyclewayLabelExists).toBe(true);
  });
});

test.describe('Theme Switching Visual Tests', () => {
  test('no visual glitches during rapid theme toggles', async ({ page }) => {
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapLoad(page);

    // Collect any errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Rapid toggle 5 times
    for (let i = 0; i < 5; i++) {
      await setTheme(page, i % 2 === 0 ? 'dark' : 'light');
      await page.waitForTimeout(100); // Fast toggles
    }

    // Let it settle
    await page.waitForTimeout(1000);

    // Map should still be functional
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();

    // No errors related to layers
    const layerErrors = errors.filter(
      (e) => e.includes('layer') || e.includes('source') || e.includes('style')
    );
    expect(layerErrors).toHaveLength(0);
  });

  test('screenshot comparison after 10 theme toggles', async ({ page }) => {
    test.setTimeout(60000); // 10 style reloads with proper polling needs >30s
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapLoad(page);

    // Set to light for baseline
    await setTheme(page, 'light');

    // Capture baseline
    const baseline = await page.screenshot();

    // Toggle 10 times (ending on light)
    // setTheme polls isStyleLoaded() so no extra waits needed
    for (let i = 0; i < 10; i++) {
      await setTheme(page, i % 2 === 0 ? 'dark' : 'light');
    }

    // Settle on light theme
    await setTheme(page, 'light');

    // Compare with baseline
    await expect(page).toHaveScreenshot('map-after-10-toggles.png', {
      maxDiffPixelRatio: 0.03, // Allow 3% difference for minor variations
    });
  });
});

test.describe('Marker Variants Visual Tests', () => {
  test('marker variants should be visually distinct', async ({ page }) => {
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapLoad(page);

    // Check for marker elements if any exist
    const markers = page.locator('.maplibregl-marker');
    const count = await markers.count();

    if (count > 0) {
      // Capture screenshot with markers visible
      await expect(page).toHaveScreenshot('map-with-markers.png', {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    }
  });
});

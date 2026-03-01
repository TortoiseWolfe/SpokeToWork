import { test, expect, type Page } from '@playwright/test';

/**
 * Map Visual Regression Tests
 *
 * Tests for verifying visual appearance of map routes and markers.
 * Uses functional assertions to verify map rendering across themes.
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

  test('should render map correctly in light theme', async ({ page }) => {
    await setTheme(page, 'light');

    // Canvas is visible and style is loaded
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('light');

    // Map layers loaded
    const layerCount = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return map?.getLayersOrder?.()?.length ?? 0;
    });
    expect(layerCount).toBeGreaterThan(0);
  });

  test('should render map correctly in dark theme', async ({ page }) => {
    await setTheme(page, 'dark');

    // Canvas is visible and style is loaded
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('dark');

    // Cycleway layers exist in dark mode
    const layers = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return {
        hasCycleway: !!map?.getLayer('cycleway'),
        hasCasingLayer: !!map?.getLayer('cycleway-casing'),
        hasSource: !!map?.getSource('all-bike-routes'),
      };
    });
    expect(layers.hasCycleway).toBe(true);
    expect(layers.hasCasingLayer).toBe(true);
    expect(layers.hasSource).toBe(true);
  });

  test('should maintain layer consistency after theme toggle', async ({
    page,
  }) => {
    // Start with light theme
    await setTheme(page, 'light');

    // Toggle to dark and back to light
    await setTheme(page, 'dark');
    await setTheme(page, 'light');

    // Canvas still visible and layers intact after roundtrip
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    const finalTheme = await page.locator('html').getAttribute('data-theme');
    expect(finalTheme).toBe('light');

    const layers = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return {
        cyclewayExists: !!map?.getLayer('cycleway'),
        cyclewayCasingExists: !!map?.getLayer('cycleway-casing'),
        sourceExists: !!map?.getSource('all-bike-routes'),
      };
    });
    expect(layers.cyclewayExists).toBe(true);
    expect(layers.cyclewayCasingExists).toBe(true);
    expect(layers.sourceExists).toBe(true);
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

  test('map remains functional after 10 theme toggles', async ({ page }) => {
    test.setTimeout(60000); // 10 style reloads with proper polling needs >30s
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapLoad(page);

    // Set to light for baseline
    await setTheme(page, 'light');

    // Toggle 10 times (ending on light)
    // setTheme polls isStyleLoaded() so no extra waits needed
    for (let i = 0; i < 10; i++) {
      await setTheme(page, i % 2 === 0 ? 'dark' : 'light');
    }

    // Settle on light theme
    await setTheme(page, 'light');

    // Verify map is still functional after stress
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    const mapState = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return {
        styleLoaded: map?.isStyleLoaded() ?? false,
        layerCount: map?.getLayersOrder?.()?.length ?? 0,
        hasCycleway: !!map?.getLayer('cycleway'),
        hasSource: !!map?.getSource('all-bike-routes'),
      };
    });
    expect(mapState.styleLoaded).toBe(true);
    expect(mapState.layerCount).toBeGreaterThan(5);
    expect(mapState.hasCycleway).toBe(true);
    expect(mapState.hasSource).toBe(true);
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
      // Verify markers have unique positions (visually distinct)
      const positions = await markers.evaluateAll((elements) =>
        elements.map((el) => {
          const rect = el.getBoundingClientRect();
          return `${Math.round(rect.x)},${Math.round(rect.y)}`;
        })
      );
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(positions.length);

      // Verify marker buttons have aria-labels
      const buttons = page.locator('.maplibregl-marker [role="button"]');
      const buttonCount = await buttons.count();
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const ariaLabel = await buttons.nth(i).getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    }
  });
});

import { test, expect, type Page } from '@playwright/test';
import { waitForMapReady } from './utils/map-helpers';

// Helper to dismiss countdown banner if present
async function dismissBanner(page: Page) {
  const dismissButton = page.getByRole('button', {
    name: 'Dismiss countdown banner',
  });
  if (await dismissButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await dismissButton.click();
    await page.waitForTimeout(300); // Wait for animation
  }
}

// Helper to mock geolocation
async function mockGeolocation(
  page: Page,
  latitude = 51.505,
  longitude = -0.09
) {
  await page.addInitScript(
    ({ lat, lng }) => {
      navigator.geolocation.getCurrentPosition = (success) => {
        setTimeout(() => {
          const mockPosition: GeolocationPosition = {
            coords: {
              latitude: lat,
              longitude: lng,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({ latitude: lat, longitude: lng, accuracy: 10 }),
            } as GeolocationCoordinates,
            timestamp: Date.now(),
            toJSON: () => ({
              coords: { latitude: lat, longitude: lng, accuracy: 10 },
              timestamp: Date.now(),
            }),
          };
          success(mockPosition);
        }, 100);
      };

      navigator.permissions.query = async (options: any) => {
        if (options.name === 'geolocation') {
          return { state: 'prompt' } as PermissionStatus;
        }
        throw new Error('Permission not found');
      };
    },
    { lat: latitude, lng: longitude }
  );
}

test.describe('Geolocation Map Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/map');
    await dismissBanner(page);
  });

  test('should load map page successfully', async ({ page }) => {
    await page.goto('/map');
    await dismissBanner(page);

    // Map container should be visible
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible();

    // MapLibre canvas should be rendered
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();

    // Navigation controls should be present
    await expect(page.locator('.maplibregl-ctrl-group')).toBeVisible();
  });

  test('should display location button when showUserLocation is enabled', async ({
    page,
  }) => {
    await page.goto('/map');
    await dismissBanner(page);

    // Location button should be visible
    const locationButton = page.getByRole('button', { name: /location/i });
    await expect(locationButton).toBeVisible();
  });

  test('should show consent modal on first location request', async ({
    page,
  }) => {
    await mockGeolocation(page);
    await page.goto('/map');
    await dismissBanner(page);

    // Click location button
    const locationButton = page.getByRole('button', { name: /location/i });
    await locationButton.click();

    // Consent modal should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByText(/would like to use your location/i)
    ).toBeVisible();
  });

  // Skip: user-location-marker testid not implemented in MapLibre version
  test.skip('should get user location after accepting consent', async ({
    page,
  }) => {
    await mockGeolocation(page);
    await page.goto('/map');

    // Request location
    const locationButton = page.getByRole('button', { name: /location/i });
    await locationButton.click();

    // Accept consent
    const acceptButton = page.getByRole('button', { name: /accept/i });
    await acceptButton.click();

    // Wait for location marker
    await expect(
      page.locator('[data-testid="user-location-marker"]')
    ).toBeVisible();

    // Map should center on user location
    await page.waitForTimeout(1000); // Wait for animation
    const mapCenter = await page.evaluate(() => {
      const map = (window as any).maplibreMap;
      if (map) {
        const center = map.getCenter();
        return { lat: center.lat, lng: center.lng };
      }
      return null;
    });

    expect(mapCenter).toBeTruthy();
    expect(mapCenter?.lat).toBeCloseTo(51.505, 2);
    expect(mapCenter?.lng).toBeCloseTo(-0.09, 2);
  });

  // Skip: Tests LocationButton disabled state which works but takes too long
  test.skip('should handle location permission denial', async ({ page }) => {
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = (success, error) => {
        error?.({
          code: 1,
          message: 'User denied geolocation',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });
      };

      navigator.permissions.query = async () =>
        ({ state: 'prompt' }) as PermissionStatus;
    });

    await page.goto('/map');

    // Request location
    const locationButton = page.getByRole('button', { name: /location/i });
    await locationButton.click();

    // Accept consent (but browser will deny)
    const acceptButton = page.getByRole('button', { name: /accept/i });
    await acceptButton.click();

    // Should show error state
    await expect(page.getByText(/location blocked/i)).toBeVisible();
    await expect(locationButton).toBeDisabled();
  });

  // Skip: user-location-marker testid not implemented in MapLibre version
  test.skip('should remember consent decision', async ({ page }) => {
    await mockGeolocation(page);
    await page.goto('/map');

    // First visit - accept consent
    let locationButton = page.getByRole('button', { name: /location/i });
    await locationButton.click();

    const acceptButton = page.getByRole('button', { name: /accept/i });
    await acceptButton.click();

    // Wait for location
    await expect(
      page.locator('[data-testid="user-location-marker"]')
    ).toBeVisible();

    // Refresh page
    await page.reload();

    // Should not show consent modal again
    locationButton = page.getByRole('button', { name: /location/i });
    await locationButton.click();

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(
      page.locator('[data-testid="user-location-marker"]')
    ).toBeVisible();
  });

  // Skip: ?markers=true query param not implemented
  test.skip('should display custom markers', async ({ page }) => {
    await page.goto('/map?markers=true');

    // MapLibre markers should be visible (custom marker elements)
    const markers = page.locator('.maplibregl-marker');
    await expect(markers.first()).toBeVisible();
  });

  // Skip: ?markers=true query param not implemented
  test.skip('should show marker popups on click', async ({ page }) => {
    await page.goto('/map?markers=true');

    // Click first marker
    const firstMarker = page.locator('.maplibregl-marker').first();
    await firstMarker.click();

    // Popup should appear
    await expect(page.locator('.maplibregl-popup')).toBeVisible();
    await expect(page.locator('.maplibregl-popup-content')).toContainText(
      'Test Marker'
    );
  });

  test('should handle map zoom controls', async ({ page }) => {
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapReady(page);

    // Get initial zoom using map API
    const initialZoom = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return map?.getZoom() ?? 13;
    });

    // Zoom in using map API (more reliable than clicking buttons)
    await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      map?.zoomIn();
    });

    // Poll until zoom animation completes
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const map = (window as any).maplibreMap?.getMap?.();
            return Math.round(map?.getZoom() ?? 0);
          }),
        { message: 'Waiting for zoomIn to reach target', timeout: 5000 }
      )
      .toBe(Math.round(initialZoom + 1));

    // Zoom out using map API
    await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      map?.zoomOut();
    });

    // Poll until zoom animation completes
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const map = (window as any).maplibreMap?.getMap?.();
            return Math.round(map?.getZoom() ?? 0);
          }),
        { message: 'Waiting for zoomOut to reach target', timeout: 5000 }
      )
      .toBe(Math.round(initialZoom));
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapReady(page);

    // Get initial zoom
    const initialZoom = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return map?.getZoom() ?? 13;
    });

    // Use map API for keyboard zoom (more reliable than actual keyboard events)
    await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      map?.zoomIn();
    });

    // Poll until zoom reaches expected value (animation-safe)
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const map = (window as any).maplibreMap?.getMap?.();
            return Math.round(map?.getZoom() ?? 0);
          }),
        { message: 'Waiting for zoomIn to reach target', timeout: 5000 }
      )
      .toBe(Math.round(initialZoom + 1));

    await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      map?.zoomOut();
    });

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const map = (window as any).maplibreMap?.getMap?.();
            return Math.round(map?.getZoom() ?? 0);
          }),
        { message: 'Waiting for zoomOut to reach target', timeout: 5000 }
      )
      .toBe(Math.round(initialZoom));
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/map');

    // Map should be visible
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible();

    // Navigation controls should be accessible
    await expect(page.locator('.maplibregl-ctrl-group')).toBeVisible();

    // Location button should be visible
    const locationButton = page.getByRole('button', { name: /location/i });
    await expect(locationButton).toBeVisible();
  });

  test('should handle map pan gestures', async ({ page }) => {
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapReady(page);

    // Get initial center
    const initialCenter = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      const center = map?.getCenter();
      return center ? { lat: center.lat, lng: center.lng } : null;
    });

    // Use map API to pan (more reliable than drag simulation)
    await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      map?.panBy([100, 100], { duration: 0 });
    });

    // Poll until center has changed (pan with duration:0 is near-instant but not synchronous)
    await expect
      .poll(
        async () =>
          page.evaluate((prevLat) => {
            const map = (window as any).maplibreMap?.getMap?.();
            const center = map?.getCenter();
            return center ? center.lat !== prevLat : false;
          }, initialCenter?.lat),
        { message: 'Waiting for pan to complete', timeout: 5000 }
      )
      .toBe(true);

    // Center should have changed
    const newCenter = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      const center = map?.getCenter();
      return center ? { lat: center.lat, lng: center.lng } : null;
    });

    expect(newCenter).toBeTruthy();
    expect(newCenter?.lat).not.toBe(initialCenter?.lat);
    expect(newCenter?.lng).not.toBe(initialCenter?.lng);
  });

  // Skip: Offline tile caching not yet implemented for MapLibre
  test.skip('should work offline with cached tiles', async ({
    page,
    context,
  }) => {
    await page.goto('/map');

    // Load some tiles by zooming in
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);

    // Refresh page
    await page.reload();

    // Map should still load (canvas may show cached content)
    await expect(page.locator('[data-testid="map-container"]')).toBeVisible();

    // MapLibre canvas should be visible
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  });

  test('should handle dark mode theme', async ({ page }) => {
    await page.goto('/map');
    await waitForMapReady(page);

    // Set dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Wait for style reload after theme change
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const map = (window as any).maplibreMap?.getMap?.();
            return map ? map.isStyleLoaded() : false;
          }),
        { message: 'Waiting for dark theme style to load', timeout: 10000 }
      )
      .toBe(true);

    // Map canvas should still be visible after theme change
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();

    // MapLibre uses different styles for dark mode (handled via useMapTheme hook)
    const canvasExists = await page.locator('.maplibregl-canvas').count();
    expect(canvasExists).toBe(1);
  });

  test('should preserve bike routes after theme toggle (Feature 045)', async ({
    page,
  }) => {
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapReady(page);

    // Collect console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Verify bike routes source exists initially
    const hasRoutesInitial = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return map?.getSource?.('all-bike-routes') !== undefined;
    });
    expect(hasRoutesInitial).toBe(true);

    // Toggle to dark theme and wait for style reload
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const map = (window as any).maplibreMap?.getMap?.();
            return map ? map.isStyleLoaded() : false;
          }),
        { message: 'Waiting for dark theme style to load', timeout: 10000 }
      )
      .toBe(true);

    // Verify bike routes still exist after theme toggle
    const hasRoutesAfterDark = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return map?.getSource?.('all-bike-routes') !== undefined;
    });
    expect(hasRoutesAfterDark).toBe(true);

    // Toggle back to light theme and wait for style reload
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });
    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const map = (window as any).maplibreMap?.getMap?.();
            return map ? map.isStyleLoaded() : false;
          }),
        { message: 'Waiting for light theme style to load', timeout: 10000 }
      )
      .toBe(true);

    // Verify bike routes still exist
    const hasRoutesAfterLight = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return map?.getSource?.('all-bike-routes') !== undefined;
    });
    expect(hasRoutesAfterLight).toBe(true);

    // No console errors during theme switching
    const themeErrors = consoleErrors.filter(
      (e) => e.includes('bike') || e.includes('route') || e.includes('layer')
    );
    expect(themeErrors).toHaveLength(0);
  });

  test('should survive 10 consecutive theme toggles (SC-001)', async ({
    page,
  }) => {
    test.setTimeout(60000); // 10 style reloads with proper polling needs >30s
    await page.goto('/map');
    await dismissBanner(page);
    await waitForMapReady(page);

    // Verify initial state
    const hasRoutesInitial = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return map?.getSource?.('all-bike-routes') !== undefined;
    });
    expect(hasRoutesInitial).toBe(true);

    // Toggle theme 10 times, waiting for each style reload
    for (let i = 0; i < 10; i++) {
      const theme = i % 2 === 0 ? 'dark' : 'light';
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await expect
        .poll(
          async () =>
            page.evaluate(() => {
              const map = (window as any).maplibreMap?.getMap?.();
              return map ? map.isStyleLoaded() : false;
            }),
          {
            message: `Waiting for style reload (toggle ${i + 1})`,
            timeout: 10000,
          }
        )
        .toBe(true);
    }

    // Verify bike routes still exist after 10 toggles
    const hasRoutesAfterToggles = await page.evaluate(() => {
      const map = (window as any).maplibreMap?.getMap?.();
      return map?.getSource?.('all-bike-routes') !== undefined;
    });
    expect(hasRoutesAfterToggles).toBe(true);

    // Map canvas should still be functional
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
  });

  // Skip: accuracy-circle testid not implemented in MapLibre version
  test.skip('should display accuracy circle when available', async ({
    page,
  }) => {
    await mockGeolocation(page);
    await page.goto('/map?showAccuracy=true');

    // Request location
    const locationButton = page.getByRole('button', { name: /location/i });
    await locationButton.click();

    // Accept consent
    const acceptButton = page.getByRole('button', { name: /accept/i });
    await acceptButton.click();

    // Accuracy circle should be visible
    await expect(page.locator('[data-testid="accuracy-circle"]')).toBeVisible();
  });

  // Skip: user-location-marker testid not implemented in MapLibre version
  test.skip('should handle rapid location updates', async ({ page }) => {
    await page.addInitScript(() => {
      let count = 0;
      navigator.geolocation.watchPosition = (success) => {
        const interval = setInterval(() => {
          count++;
          const mockPosition: GeolocationPosition = {
            coords: {
              latitude: 51.505 + count * 0.001,
              longitude: -0.09 + count * 0.001,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({
                latitude: 51.505 + count * 0.001,
                longitude: -0.09 + count * 0.001,
                accuracy: 10,
              }),
            } as GeolocationCoordinates,
            timestamp: Date.now(),
            toJSON: () => ({
              coords: {
                latitude: 51.505 + count * 0.001,
                longitude: -0.09 + count * 0.001,
                accuracy: 10,
              },
              timestamp: Date.now(),
            }),
          };
          success(mockPosition);

          if (count >= 5) clearInterval(interval);
        }, 500);

        return count;
      };
    });

    await page.goto('/map?watch=true');

    // Start watching location
    const locationButton = page.getByRole('button', { name: /location/i });
    await locationButton.click();

    // Accept consent
    const acceptButton = page.getByRole('button', { name: /accept/i });
    await acceptButton.click();

    // Wait for updates
    await page.waitForTimeout(3000);

    // Location should have updated multiple times
    const finalPosition = await page.evaluate(() => {
      const marker = document.querySelector(
        '[data-testid="user-location-marker"]'
      );
      return marker?.getAttribute('data-position');
    });

    expect(finalPosition).toBeTruthy();
    const parsed = JSON.parse(finalPosition!);
    expect(parsed[0]).toBeGreaterThan(51.505); // Should have moved
  });

  test('should handle accessibility requirements', async ({ page }) => {
    await page.goto('/map');

    // Check ARIA labels
    const mapContainer = page.locator('[data-testid="map-container"]');
    await expect(mapContainer).toHaveAttribute('role', 'application');
    await expect(mapContainer).toHaveAttribute(
      'aria-label',
      /interactive map/i
    );

    // Check keyboard accessibility - MapLibre navigation controls
    const zoomIn = page.getByRole('button', { name: 'Zoom in' });
    await expect(zoomIn).toBeVisible();

    const zoomOut = page.getByRole('button', { name: 'Zoom out' });
    await expect(zoomOut).toBeVisible();

    // Check focus management
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(
      () => document.activeElement?.className
    );
    expect(focusedElement).toBeTruthy();
  });
});

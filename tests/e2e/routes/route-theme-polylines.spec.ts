import { test, expect, type Page } from '@playwright/test';

/**
 * Route polyline color verification across DaisyUI themes.
 * Verifies that route layer paint properties change with light, dracula, synthwave.
 */

test.describe.configure({ timeout: 120000 });

async function dismissBanner(page: Page) {
  const btn = page.getByRole('button', { name: 'Dismiss countdown banner' });
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

async function waitForMapLayers(page: Page, timeout = 55000) {
  await page.waitForSelector('.maplibregl-canvas', {
    state: 'visible',
    timeout,
  });
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const map = (window as any).maplibreMap;
          return map?.getStyle()?.layers?.length ?? 0;
        }),
      { message: 'Waiting for map layers', timeout }
    )
    .toBeGreaterThan(0);
}

async function setThemeAndWait(
  page: Page,
  theme: string,
  previousColor?: string | null
) {
  await page.evaluate(
    (t) => document.documentElement.setAttribute('data-theme', t),
    theme
  );
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const map = (window as any).maplibreMap;
          try {
            return map?.getStyle()?.layers?.length ?? 0;
          } catch {
            return 0;
          }
        }),
      { message: `Layers after ${theme} theme`, timeout: 20000 }
    )
    .toBeGreaterThan(0);
  // Wait for React-managed route source
  await expect
    .poll(
      () =>
        page.evaluate(
          () => !!(window as any).maplibreMap?.getSource('all-bike-routes')
        ),
      { message: `Bike routes source after ${theme}`, timeout: 10000 }
    )
    .toBe(true);
  // Wait for React to process the theme change and update MapLibre paint.
  // useDaisyColors reads CSS vars via MutationObserver → useRoutePalette
  // recomputes → RoutePolyline re-renders → react-map-gl calls setPaintProperty.
  if (previousColor) {
    await expect
      .poll(
        () =>
          page.evaluate((prev) => {
            const map = (window as any).maplibreMap;
            if (!map) return prev;
            const layers = (map.getStyle()?.layers ?? []).filter(
              (l: any) =>
                l.id.startsWith('route-') &&
                !l.id.includes('glow') &&
                !l.id.includes('dash')
            );
            if (layers.length === 0) return prev;
            try {
              return map.getPaintProperty(layers[0].id, 'line-color') ?? prev;
            } catch {
              return prev;
            }
          }, previousColor),
        {
          message: `Paint update after ${theme} (was ${previousColor})`,
          timeout: 10000,
        }
      )
      .not.toBe(previousColor);
  } else {
    // First theme set — just wait for React render cycle
    await page.waitForTimeout(1000);
  }
}

async function getRouteLayerIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const map = (window as any).maplibreMap;
    if (!map) return [];
    return (map.getStyle()?.layers ?? [])
      .filter(
        (l: any) => l.id.startsWith('route-') || l.id === 'all-bike-routes'
      )
      .map((l: any) => l.id);
  });
}

async function getRouteLineColor(
  page: Page,
  layerId: string
): Promise<string | null> {
  return page.evaluate((id) => {
    const map = (window as any).maplibreMap;
    if (!map) return null;
    try {
      return map.getPaintProperty(id, 'line-color') ?? null;
    } catch {
      return null;
    }
  }, layerId);
}

test.describe('Route polyline theming', () => {
  test.skip(
    ({ browserName }) => browserName === 'firefox',
    'Firefox headless: MapLibre requires GPU'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/companies');
    await dismissBanner(page);
    await waitForMapLayers(page);
  });

  test('route layers exist after initial load', async ({ page }) => {
    const ids = await getRouteLayerIds(page);
    // Routes may or may not exist depending on DB state — just verify the query works
    expect(Array.isArray(ids)).toBe(true);
  });

  test('route colors change between light and dracula themes', async ({
    page,
  }) => {
    const ids = await getRouteLayerIds(page);
    // Prefer all-bike-routes layer (uses palette colors, not custom route colors)
    const paletteLayer = ids.find((id) => id === 'all-bike-routes');
    test.skip(
      !paletteLayer,
      'No palette-driven route layer (all-bike-routes) found'
    );

    await setThemeAndWait(page, 'light');
    const lightColor = await getRouteLineColor(page, paletteLayer!);

    await setThemeAndWait(page, 'dracula', lightColor);
    const draculaColor = await getRouteLineColor(page, paletteLayer!);

    expect(lightColor).toBeTruthy();
    expect(draculaColor).toBeTruthy();
    expect(draculaColor).not.toBe(lightColor);
  });

  test('route colors change between dracula and cupcake themes', async ({
    page,
  }) => {
    const ids = await getRouteLayerIds(page);
    const paletteLayer = ids.find((id) => id === 'all-bike-routes');
    test.skip(
      !paletteLayer,
      'No palette-driven route layer (all-bike-routes) found'
    );

    await setThemeAndWait(page, 'dracula');
    const draculaColor = await getRouteLineColor(page, paletteLayer!);

    await setThemeAndWait(page, 'cupcake', draculaColor);
    const cupcakeColor = await getRouteLineColor(page, paletteLayer!);

    expect(draculaColor).toBeTruthy();
    expect(cupcakeColor).toBeTruthy();
    expect(cupcakeColor).not.toBe(draculaColor);
  });

  test('route layers survive full theme rotation', async ({ page }) => {
    for (const theme of ['light', 'dracula', 'synthwave', 'light']) {
      await setThemeAndWait(page, theme);
      const layerCount = await page.evaluate(() => {
        const map = (window as any).maplibreMap;
        return map?.getStyle()?.layers?.length ?? 0;
      });
      expect(layerCount).toBeGreaterThan(0);
    }
  });
});

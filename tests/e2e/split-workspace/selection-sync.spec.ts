import { test, expect, type Page } from '@playwright/test';
import { waitForMapReady } from '../utils/map-helpers';

/**
 * Bidirectional selection sync between CompanyTable and CompanyMap.
 * Requires at least 2 companies in the database.
 */

test.describe.configure({ timeout: 90000 });

async function dismissBanner(page: Page) {
  const btn = page.getByRole('button', { name: 'Dismiss countdown banner' });
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

async function getCompanyRows(page: Page) {
  return page.locator(
    '[data-testid="split-workspace-table-panel"] [data-company-id]'
  );
}

test.describe('Selection sync — table ↔ map', () => {
  test.skip(
    ({ browserName }) => browserName === 'firefox',
    'Firefox headless: MapLibre requires GPU'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/companies');
    await dismissBanner(page);
    await expect(
      page.locator('[data-testid="split-workspace-desktop"]')
    ).toBeVisible({ timeout: 15000 });
    await waitForMapReady(page, 30000);
  });

  test('table row click pans the map', async ({ page }) => {
    const rows = await getCompanyRows(page);
    const rowCount = await rows.count();
    test.skip(rowCount < 1, 'No companies in database');

    // Capture initial map center
    const initialCenter = await page.evaluate(() => {
      const map = (window as any).maplibreMap;
      if (!map) return null;
      const c = map.getCenter();
      return [c.lng, c.lat];
    });

    // Click first company row
    await rows.first().click();

    // Poll until map center changes (fly-to animation)
    await expect
      .poll(
        async () => {
          const center = await page.evaluate(() => {
            const map = (window as any).maplibreMap;
            if (!map) return null;
            const c = map.getCenter();
            return [c.lng, c.lat];
          });
          if (!center || !initialCenter) return false;
          // Center changed by at least 0.001 degrees in either axis
          return (
            Math.abs(center[0] - initialCenter[0]) > 0.001 ||
            Math.abs(center[1] - initialCenter[1]) > 0.001
          );
        },
        { message: 'Map should pan after table row click', timeout: 10000 }
      )
      .toBe(true);
  });

  test('clicking a second row pans to a different location', async ({
    page,
  }) => {
    const rows = await getCompanyRows(page);
    const rowCount = await rows.count();
    test.skip(rowCount < 2, 'Need at least 2 companies');

    await rows.first().click();
    await page.waitForTimeout(1500); // Let fly-to settle

    // Close the detail drawer that opens on row click (blocks subsequent clicks)
    const drawer = page.locator('[data-testid="company-detail-drawer"]');
    if (await drawer.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.keyboard.press('Escape');
      await drawer.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
    }

    const centerAfterFirst = await page.evaluate(() => {
      const map = (window as any).maplibreMap;
      const c = map?.getCenter();
      return c ? [c.lng, c.lat] : null;
    });

    await rows.nth(1).click();

    await expect
      .poll(
        async () => {
          const center = await page.evaluate(() => {
            const map = (window as any).maplibreMap;
            const c = map?.getCenter();
            return c ? [c.lng, c.lat] : null;
          });
          if (!center || !centerAfterFirst) return false;
          return (
            Math.abs(center[0] - centerAfterFirst[0]) > 0.0005 ||
            Math.abs(center[1] - centerAfterFirst[1]) > 0.0005
          );
        },
        { message: 'Map should pan to second company', timeout: 10000 }
      )
      .toBe(true);
  });

  test('selecting a company opens the detail drawer', async ({ page }) => {
    const rows = await getCompanyRows(page);
    const rowCount = await rows.count();
    test.skip(rowCount < 1, 'No companies in database');

    // Click the first row
    await rows.first().click();

    // Company detail drawer should open
    const drawer = page.locator('[data-testid="company-detail-drawer"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
  });
});

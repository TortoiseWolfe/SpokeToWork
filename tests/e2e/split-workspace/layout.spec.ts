import { test, expect, type Page } from '@playwright/test';

/**
 * SplitWorkspaceLayout E2E — desktop/mobile layout, panel toggle, landmarks.
 */

test.describe.configure({ timeout: 60000 });

async function dismissBanner(page: Page) {
  const btn = page.getByRole('button', { name: 'Dismiss countdown banner' });
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(300);
  }
}

test.describe('SplitWorkspaceLayout — desktop', () => {
  test.skip(
    ({ browserName }) => browserName === 'firefox',
    'Firefox headless: MapLibre requires GPU'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto('/companies');
    await dismissBanner(page);
    // Wait for hydration — skeleton disappears, real layout mounts
    await expect(
      page.locator('[data-testid="split-workspace-desktop"]')
    ).toBeVisible({ timeout: 15000 });
  });

  test('renders map and table panels side by side', async ({ page }) => {
    await expect(
      page.locator('[data-testid="split-workspace-map-panel"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="split-workspace-table-panel"]')
    ).toBeVisible();
  });

  test('toggle hides and shows the table panel', async ({ page }) => {
    const tablePanel = page.locator(
      '[data-testid="split-workspace-table-panel"]'
    );
    const toggleBtn = page.getByRole('button', {
      name: /Hide company list|Hide List/,
    });

    await toggleBtn.click();
    await expect(tablePanel).toHaveClass(/w-0/);

    const showBtn = page.getByRole('button', {
      name: /Show company list|Show List/,
    });
    await showBtn.click();
    await expect(tablePanel).toHaveClass(/w-1\/2/);
  });

  test('map panel has region landmark with "Map view" label', async ({
    page,
  }) => {
    const mapPanel = page.locator('[data-testid="split-workspace-map-panel"]');
    await expect(mapPanel).toHaveAttribute('role', 'region');
    await expect(mapPanel).toHaveAttribute('aria-label', 'Map view');
  });

  test('table panel has region landmark with "List view" label', async ({
    page,
  }) => {
    const tablePanel = page.locator(
      '[data-testid="split-workspace-table-panel"]'
    );
    await expect(tablePanel).toHaveAttribute('role', 'region');
    await expect(tablePanel).toHaveAttribute('aria-label', 'List view');
  });
});

test.describe('SplitWorkspaceLayout — mobile', () => {
  test.skip(
    ({ browserName }) => browserName === 'firefox',
    'Firefox headless: MapLibre requires GPU'
  );

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/companies');
    await dismissBanner(page);
    await expect(
      page.locator('[data-testid="split-workspace-mobile"]')
    ).toBeVisible({ timeout: 15000 });
  });

  test('renders mobile layout with full-screen map', async ({ page }) => {
    const mobileMap = page.locator(
      '[data-testid="split-workspace-mobile-map"]'
    );
    await expect(mobileMap).toBeVisible();
    await expect(mobileMap).toHaveClass(/fixed/);
    await expect(mobileMap).toHaveClass(/inset-0/);
  });

  test('mobile map has region landmark', async ({ page }) => {
    const mobileMap = page.locator(
      '[data-testid="split-workspace-mobile-map"]'
    );
    await expect(mobileMap).toHaveAttribute('role', 'region');
    await expect(mobileMap).toHaveAttribute('aria-label', 'Map view');
  });

  test('BottomSheet is rendered over the map', async ({ page }) => {
    await expect(page.locator('[data-testid="bottom-sheet"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="bottom-sheet-handle"]')
    ).toBeVisible();
  });

  test('desktop layout is not present on mobile', async ({ page }) => {
    await expect(
      page.locator('[data-testid="split-workspace-desktop"]')
    ).not.toBeVisible();
  });
});

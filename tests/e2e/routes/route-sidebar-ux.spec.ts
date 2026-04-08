/**
 * E2E Tests: Route Sidebar UX - Feature 047
 *
 * Tests the Route Sidebar UX improvements:
 * - T033: Auto-open drawer flow (US1+US3)
 * - T034: Independent scrolling (US2)
 * - T035: Tooltip display for long route names (US4)
 * - T036: Resize functionality (US5)
 * - T037: Mobile behavior (no resize, drawer pattern)
 *
 * Updated: 062-fix-e2e-auth - Refactored for parallel execution
 * Uses ({ page }) pattern with test.use({ storageState }) for proper isolation
 */

import { test, expect } from '@playwright/test';
import { CompaniesPage } from '../pages/CompaniesPage';
import { getAuthStatePath } from '../utils/authenticated-context';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const AUTH_FILE = getAuthStatePath();

// Requires live Supabase route data and authenticated session.
// In headless CI against the static export the companies table never loads,
// causing waitForTable() to time out before the inner conditional skips fire.
test.skip(
  !!process.env.CI,
  'Requires live Supabase route data — not available in headless CI against static export'
);

// Helper to navigate to companies page and wait for table
async function navigateToCompanies(
  page: import('@playwright/test').Page
): Promise<CompaniesPage> {
  const companiesPage = new CompaniesPage(page);
  await companiesPage.goto();
  await companiesPage.waitForTable();
  return companiesPage;
}

/**
 * T033: Auto-open drawer flow (US1+US3)
 *
 * Tests that clicking a route immediately opens the detail drawer
 * and that no inline company preview appears in the sidebar.
 */
test.describe('Route Sidebar - Auto-Open Drawer (US1+US3)', () => {
  // Desktop viewport required - sidebar only visible on lg: breakpoint (1024px+)
  test.use({
    storageState: AUTH_FILE,
    viewport: { width: 1280, height: 900 },
  });

  test('should auto-open drawer when clicking a route', async ({ page }) => {
    await navigateToCompanies(page);

    // Find a route in the sidebar (use aria-label selector for reliability)
    const routeSidebar = page.locator('aside[aria-label="Route sidebar"]');
    const isVisible = await routeSidebar.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'Route sidebar not visible (may be mobile or no routes)');
      return;
    }

    // Find any route item in the sidebar
    const routeItems = routeSidebar.locator('[role="listitem"]');
    const routeCount = await routeItems.count();

    if (routeCount === 0) {
      test.skip(true, 'No routes available to test');
      return;
    }

    // Click the first route
    await routeItems.first().click();

    // Wait for drawer to appear
    await page.waitForSelector('[data-testid="route-detail-drawer"]', {
      state: 'visible',
      timeout: 5000,
    });

    // Verify drawer is open
    const drawer = page.locator('[data-testid="route-detail-drawer"]');
    await expect(drawer).toBeVisible();
  });

  test('should not show inline company preview in sidebar', async ({
    page,
  }) => {
    await navigateToCompanies(page);

    // The inline company preview should no longer exist
    // Previously: clicking route showed a preview with "View All" button
    // Now: clicking route goes directly to drawer

    const routeItems = page.locator(
      'aside[aria-label="Route sidebar"] [role="listitem"]'
    );
    const routeCount = await routeItems.count();

    if (routeCount === 0) {
      test.skip(true, 'No routes available to test');
      return;
    }

    // Click a route
    await routeItems.first().click();

    // Wait a moment for any UI to render
    await page.waitForTimeout(500);

    // Verify "View All" button does NOT exist in sidebar
    const viewAllButton = page.locator(
      'aside[aria-label="Route sidebar"] button:has-text("View All")'
    );
    await expect(viewAllButton).not.toBeVisible();

    // Verify inline company list does NOT exist in sidebar
    const inlineCompanyList = page.locator(
      'aside[aria-label="Route sidebar"] [data-testid="inline-company-preview"]'
    );
    await expect(inlineCompanyList).not.toBeVisible();
  });

  test('should show selected route with visual indicator', async ({ page }) => {
    await navigateToCompanies(page);

    const routeItems = page.locator(
      'aside[aria-label="Route sidebar"] [role="listitem"]'
    );
    const routeCount = await routeItems.count();

    if (routeCount === 0) {
      test.skip(true, 'No routes available to test');
      return;
    }

    // Click the first route
    await routeItems.first().click();
    await page.waitForTimeout(300);

    // Verify the selected route has a visual indicator (aria-current="true")
    const selectedRoute = page.locator(
      'aside[aria-label="Route sidebar"] [role="listitem"][aria-current="true"]'
    );
    await expect(selectedRoute).toBeVisible();
  });
});

/**
 * T034: Independent Scrolling (US2)
 *
 * Tests that the route list scrolls independently while header stays fixed.
 */
test.describe('Route Sidebar - Independent Scrolling (US2)', () => {
  test.use({
    storageState: AUTH_FILE,
    viewport: { width: 1280, height: 900 },
  });

  test('route list container has overflow-y-auto', async ({ page }) => {
    await navigateToCompanies(page);

    const scrollContainer = page.locator('[data-testid="route-list-scroll"]');
    const isVisible = await scrollContainer.isVisible().catch(() => false);

    if (!isVisible) {
      // Try alternate selector
      const routeSidebar = page.locator('aside[aria-label="Route sidebar"]');
      if (!(await routeSidebar.isVisible())) {
        test.skip(true, 'Route sidebar not visible');
        return;
      }
    }

    // Verify the scroll container exists and has proper overflow styling
    const overflowStyle = await page.evaluate(() => {
      const container =
        document.querySelector('[data-testid="route-list-scroll"]') ||
        document.querySelector(
          'aside[aria-label="Route sidebar"] .overflow-y-auto'
        );
      if (!container) return null;
      return window.getComputedStyle(container).overflowY;
    });

    expect(['auto', 'scroll']).toContain(overflowStyle);
  });

  test('header stays fixed when route list scrolls', async ({ page }) => {
    await navigateToCompanies(page);

    const routeSidebar = page.locator('aside[aria-label="Route sidebar"]');
    if (!(await routeSidebar.isVisible())) {
      test.skip(true, 'Route sidebar not visible');
      return;
    }

    // Get initial header position
    const headerPositionBefore = await page.evaluate(() => {
      const header =
        document.querySelector('[data-testid="route-sidebar-header"]') ||
        document.querySelector('aside[aria-label="Route sidebar"] h2')
          ?.parentElement;
      if (!header) return null;
      return header.getBoundingClientRect().top;
    });

    // Scroll within the route list (if scrollable)
    await page.evaluate(() => {
      const scrollContainer =
        document.querySelector('[data-testid="route-list-scroll"]') ||
        document.querySelector(
          'aside[aria-label="Route sidebar"] .overflow-y-auto'
        );
      if (scrollContainer) {
        scrollContainer.scrollTop = 200;
      }
    });

    await page.waitForTimeout(100);

    // Get header position after scroll
    const headerPositionAfter = await page.evaluate(() => {
      const header =
        document.querySelector('[data-testid="route-sidebar-header"]') ||
        document.querySelector('aside[aria-label="Route sidebar"] h2')
          ?.parentElement;
      if (!header) return null;
      return header.getBoundingClientRect().top;
    });

    // Header should stay in same position (or within 2px tolerance)
    if (headerPositionBefore !== null && headerPositionAfter !== null) {
      expect(Math.abs(headerPositionAfter - headerPositionBefore)).toBeLessThan(
        2
      );
    }
  });
});

/**
 * T035: Tooltip Display (US4)
 *
 * Tests that truncated route names show full name on hover via tooltip.
 */
test.describe('Route Sidebar - Tooltip Display (US4)', () => {
  test.use({
    storageState: AUTH_FILE,
    viewport: { width: 1280, height: 900 },
  });

  test('route name element has title attribute for tooltip', async ({
    page,
  }) => {
    await navigateToCompanies(page);

    // Find route name elements (h3 inside route list items)
    const routeNames = page.locator(
      'aside[aria-label="Route sidebar"] [role="listitem"] h3'
    );
    const count = await routeNames.count();

    if (count === 0) {
      test.skip(true, 'No routes available to test');
      return;
    }

    // Check that route names have title attribute (for native tooltip)
    const firstRouteName = routeNames.first();
    const title = await firstRouteName.getAttribute('title');

    // Also check parent tooltip wrapper for data-tip (DaisyUI tooltip)
    const tooltipWrapper = page.locator(
      'aside[aria-label="Route sidebar"] [role="listitem"] .tooltip'
    );
    const dataTooltip = await tooltipWrapper.first().getAttribute('data-tip');

    // Either title or data-tip (DaisyUI tooltip) should be present
    const hasTooltip = title !== null || dataTooltip !== null;
    expect(hasTooltip).toBe(true);
  });

  test('route names have text truncation styling', async ({ page }) => {
    await navigateToCompanies(page);

    // Find route name h3 elements inside route list items
    const routeNames = page.locator(
      'aside[aria-label="Route sidebar"] [role="listitem"] h3'
    );
    const count = await routeNames.count();

    if (count === 0) {
      test.skip(true, 'No routes available to test');
      return;
    }

    // Check CSS for text overflow (h3 has .truncate class)
    const hasTruncation = await page.evaluate(() => {
      const routeName = document.querySelector(
        'aside[aria-label="Route sidebar"] [role="listitem"] h3'
      );
      if (!routeName) return false;
      const styles = window.getComputedStyle(routeName);
      return (
        styles.overflow === 'hidden' ||
        styles.textOverflow === 'ellipsis' ||
        routeName.classList.contains('truncate')
      );
    });

    expect(hasTruncation).toBe(true);
  });
});

/**
 * T036: Resize Functionality (US5)
 *
 * Tests that the sidebar can be resized via drag handle.
 */
test.describe('Route Sidebar - Resize Functionality (US5)', () => {
  test.use({
    storageState: AUTH_FILE,
    viewport: { width: 1280, height: 900 },
  });

  test('resize handle is visible on desktop', async ({ page }) => {
    await navigateToCompanies(page);

    // Find the resize handle
    const resizeHandle = page.locator(
      '[data-testid="route-sidebar-panel-handle"], [role="separator"]'
    );
    const isVisible = await resizeHandle.isVisible().catch(() => false);

    expect(isVisible).toBe(true);
  });

  test('resize handle has correct ARIA attributes', async ({ page }) => {
    await navigateToCompanies(page);

    const resizeHandle = page.locator(
      '[data-testid="route-sidebar-panel-handle"], [role="separator"]'
    );
    const isVisible = await resizeHandle.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'Resize handle not visible');
      return;
    }

    // Verify ARIA attributes
    await expect(resizeHandle).toHaveAttribute('role', 'separator');
    await expect(resizeHandle).toHaveAttribute('aria-orientation', 'vertical');

    // Should have value attributes
    const valuenow = await resizeHandle.getAttribute('aria-valuenow');
    const valuemin = await resizeHandle.getAttribute('aria-valuemin');
    const valuemax = await resizeHandle.getAttribute('aria-valuemax');

    expect(valuenow).not.toBeNull();
    expect(valuemin).toBe('200');
    expect(valuemax).toBe('400');
  });

  test('keyboard resize with Arrow keys', async ({ page }) => {
    await navigateToCompanies(page);

    const resizeHandle = page.locator(
      '[data-testid="route-sidebar-panel-handle"], [role="separator"]'
    );
    const isVisible = await resizeHandle.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'Resize handle not visible');
      return;
    }

    // Get initial width
    const initialWidth = await resizeHandle.getAttribute('aria-valuenow');
    expect(initialWidth).not.toBeNull();

    // Focus the resize handle
    await resizeHandle.focus();

    // Press ArrowRight to increase width
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    // Get new width
    const newWidth = await resizeHandle.getAttribute('aria-valuenow');
    expect(parseInt(newWidth || '0')).toBeGreaterThanOrEqual(
      parseInt(initialWidth || '0')
    );
  });

  test('sidebar width persists after page refresh', async ({ page }) => {
    await navigateToCompanies(page);

    const resizeHandle = page.locator(
      '[data-testid="route-sidebar-panel-handle"], [role="separator"]'
    );
    const isVisible = await resizeHandle.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'Resize handle not visible');
      return;
    }

    // Set a specific width via keyboard
    await resizeHandle.focus();
    await page.keyboard.press('End'); // Go to max width (400px)
    await page.waitForTimeout(100);

    // Refresh the page
    await page.reload();
    const companiesPage = new CompaniesPage(page);
    await companiesPage.waitForTable();

    // Check the width was restored
    const restoredHandle = page.locator(
      '[data-testid="route-sidebar-panel-handle"], [role="separator"]'
    );
    const restoredWidth = await restoredHandle.getAttribute('aria-valuenow');

    // Should be close to max width (400)
    expect(parseInt(restoredWidth || '0')).toBeGreaterThanOrEqual(350);
  });
});

/**
 * T037: Mobile Behavior
 *
 * Tests that resize is disabled on mobile and drawer pattern works.
 */
test.describe('Route Sidebar - Mobile Behavior', () => {
  // Mobile viewport
  test.use({
    storageState: AUTH_FILE,
    viewport: { width: 375, height: 667 },
  });

  test('resize handle is not visible on mobile', async ({ page }) => {
    await navigateToCompanies(page);

    // On mobile, the route sidebar is typically hidden or in a different layout
    const resizeHandle = page.locator(
      '[data-testid="route-sidebar-panel-handle"], [role="separator"]'
    );
    const isVisible = await resizeHandle.isVisible().catch(() => false);

    // Resize handle should NOT be visible on mobile
    expect(isVisible).toBe(false);
  });

  test('sidebar uses drawer pattern on mobile', async ({ page }) => {
    await navigateToCompanies(page);

    // On mobile, the route sidebar should be hidden initially (drawer pattern)
    const routeSidebar = page.locator('aside[aria-label="Route sidebar"]');
    const isVisible = await routeSidebar.isVisible().catch(() => false);

    // Sidebar should not be visible by default on mobile (lg:flex hides on mobile)
    // This verifies the drawer pattern is being used
    if (isVisible) {
      // If visible, check it doesn't have a fixed width
      const hasFixedWidth = await page.evaluate(() => {
        const sidebar = document.querySelector(
          '[data-testid="route-sidebar-panel"]'
        );
        if (!sidebar) return false;
        const styles = window.getComputedStyle(sidebar);
        // On mobile, width should be auto or 100%, not a fixed pixel value
        return styles.width.includes('px') && parseInt(styles.width) < 400;
      });

      // On mobile, if sidebar is visible, it should take full width or be in drawer
      expect(hasFixedWidth).toBe(false);
    }
  });

  test('touch scrolling works on route list', async ({ page }) => {
    await navigateToCompanies(page);

    // On mobile, click the "Routes" button to open the sidebar
    const routesButton = page.locator('button:has-text("Routes")');
    if (await routesButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await routesButton.click();
      await page.waitForTimeout(300);
    }

    // Find route list scroll container
    const scrollContainer = page.locator(
      'aside[aria-label="Route sidebar"] .overflow-y-auto'
    );

    await expect(scrollContainer.first()).toBeVisible({ timeout: 5000 });

    // Verify touch-action allows scrolling
    const allowsTouch = await page.evaluate(() => {
      const container = document.querySelector(
        'aside[aria-label="Route sidebar"] .overflow-y-auto'
      );
      if (!container) return false;
      const styles = window.getComputedStyle(container);
      return styles.touchAction !== 'none';
    });

    expect(allowsTouch).toBe(true);
  });
});

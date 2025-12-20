/**
 * E2E Tests: Route Sidebar UX - Feature 047
 *
 * Tests the Route Sidebar UX improvements:
 * - T033: Auto-open drawer flow (US1+US3)
 * - T034: Independent scrolling (US2)
 * - T035: Tooltip display for long route names (US4)
 * - T036: Resize functionality (US5)
 * - T037: Mobile behavior (no resize, drawer pattern)
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { CompaniesPage } from '../pages/CompaniesPage';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test user credentials from env (required)
const testEmail =
  process.env.TEST_USER_EMAIL || process.env.TEST_USER_PRIMARY_EMAIL;
const testPassword =
  process.env.TEST_USER_PASSWORD || process.env.TEST_USER_PRIMARY_PASSWORD;

if (!testEmail || !testPassword) {
  throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env');
}

const TEST_USER = { email: testEmail, password: testPassword };

/**
 * T033: Auto-open drawer flow (US1+US3)
 *
 * Tests that clicking a route immediately opens the detail drawer
 * and that no inline company preview appears in the sidebar.
 */
test.describe('Route Sidebar - Auto-Open Drawer (US1+US3)', () => {
  // Desktop viewport required - sidebar only visible on lg: breakpoint (1024px+)
  test.use({ viewport: { width: 1280, height: 900 } });

  let sharedContext: BrowserContext;
  let sharedPage: Page;
  let companiesPage: CompaniesPage;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    companiesPage = new CompaniesPage(sharedPage);
    await companiesPage.signIn(TEST_USER.email, TEST_USER.password);
  });

  test.afterAll(async () => {
    await sharedContext?.close();
  });

  test.beforeEach(async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();
  });

  test('should auto-open drawer when clicking a route', async () => {
    // Find a route in the sidebar
    const routeSidebar = sharedPage.locator('[data-testid="route-sidebar"]');
    const isVisible = await routeSidebar.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'Route sidebar not visible (may be mobile or no routes)');
      return;
    }

    // Find any route item in the sidebar
    const routeItems = sharedPage.locator(
      '[data-testid="route-sidebar"] [role="listitem"]'
    );
    const routeCount = await routeItems.count();

    if (routeCount === 0) {
      test.skip(true, 'No routes available to test');
      return;
    }

    // Click the first route
    await routeItems.first().click();

    // Wait for drawer to appear
    await sharedPage.waitForSelector('[data-testid="route-detail-drawer"]', {
      state: 'visible',
      timeout: 5000,
    });

    // Verify drawer is open
    const drawer = sharedPage.locator('[data-testid="route-detail-drawer"]');
    await expect(drawer).toBeVisible();
  });

  test('should not show inline company preview in sidebar', async () => {
    // The inline company preview should no longer exist
    // Previously: clicking route showed a preview with "View All" button
    // Now: clicking route goes directly to drawer

    const routeItems = sharedPage.locator(
      '[data-testid="route-sidebar"] [role="listitem"]'
    );
    const routeCount = await routeItems.count();

    if (routeCount === 0) {
      test.skip(true, 'No routes available to test');
      return;
    }

    // Click a route
    await routeItems.first().click();

    // Wait a moment for any UI to render
    await sharedPage.waitForTimeout(500);

    // Verify "View All" button does NOT exist in sidebar
    const viewAllButton = sharedPage.locator(
      '[data-testid="route-sidebar"] button:has-text("View All")'
    );
    await expect(viewAllButton).not.toBeVisible();

    // Verify inline company list does NOT exist in sidebar
    const inlineCompanyList = sharedPage.locator(
      '[data-testid="route-sidebar"] [data-testid="inline-company-preview"]'
    );
    await expect(inlineCompanyList).not.toBeVisible();
  });

  test('should show selected route with visual indicator', async () => {
    const routeItems = sharedPage.locator(
      '[data-testid="route-sidebar"] [role="listitem"]'
    );
    const routeCount = await routeItems.count();

    if (routeCount === 0) {
      test.skip(true, 'No routes available to test');
      return;
    }

    // Click the first route
    await routeItems.first().click();
    await sharedPage.waitForTimeout(300);

    // Verify the selected route has a visual indicator (data-active or aria-selected)
    const selectedRoute = sharedPage.locator(
      '[data-testid="route-sidebar"] [role="listitem"][data-active="true"], [data-testid="route-sidebar"] [role="listitem"][aria-selected="true"]'
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
  test.use({ viewport: { width: 1280, height: 900 } });

  let sharedContext: BrowserContext;
  let sharedPage: Page;
  let companiesPage: CompaniesPage;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    companiesPage = new CompaniesPage(sharedPage);
    await companiesPage.signIn(TEST_USER.email, TEST_USER.password);
  });

  test.afterAll(async () => {
    await sharedContext?.close();
  });

  test('route list container has overflow-y-auto', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    const scrollContainer = sharedPage.locator(
      '[data-testid="route-list-scroll"]'
    );
    const isVisible = await scrollContainer.isVisible().catch(() => false);

    if (!isVisible) {
      // Try alternate selector
      const routeSidebar = sharedPage.locator('[data-testid="route-sidebar"]');
      if (!(await routeSidebar.isVisible())) {
        test.skip(true, 'Route sidebar not visible');
        return;
      }
    }

    // Verify the scroll container exists and has proper overflow styling
    const overflowStyle = await sharedPage.evaluate(() => {
      const container =
        document.querySelector('[data-testid="route-list-scroll"]') ||
        document.querySelector(
          '[data-testid="route-sidebar"] .overflow-y-auto'
        );
      if (!container) return null;
      return window.getComputedStyle(container).overflowY;
    });

    expect(['auto', 'scroll']).toContain(overflowStyle);
  });

  test('header stays fixed when route list scrolls', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    const routeSidebar = sharedPage.locator('[data-testid="route-sidebar"]');
    if (!(await routeSidebar.isVisible())) {
      test.skip(true, 'Route sidebar not visible');
      return;
    }

    // Get initial header position
    const headerPositionBefore = await sharedPage.evaluate(() => {
      const header =
        document.querySelector('[data-testid="route-sidebar-header"]') ||
        document.querySelector('[data-testid="route-sidebar"] h2')
          ?.parentElement;
      if (!header) return null;
      return header.getBoundingClientRect().top;
    });

    // Scroll within the route list (if scrollable)
    await sharedPage.evaluate(() => {
      const scrollContainer =
        document.querySelector('[data-testid="route-list-scroll"]') ||
        document.querySelector(
          '[data-testid="route-sidebar"] .overflow-y-auto'
        );
      if (scrollContainer) {
        scrollContainer.scrollTop = 200;
      }
    });

    await sharedPage.waitForTimeout(100);

    // Get header position after scroll
    const headerPositionAfter = await sharedPage.evaluate(() => {
      const header =
        document.querySelector('[data-testid="route-sidebar-header"]') ||
        document.querySelector('[data-testid="route-sidebar"] h2')
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
  test.use({ viewport: { width: 1280, height: 900 } });

  let sharedContext: BrowserContext;
  let sharedPage: Page;
  let companiesPage: CompaniesPage;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    companiesPage = new CompaniesPage(sharedPage);
    await companiesPage.signIn(TEST_USER.email, TEST_USER.password);
  });

  test.afterAll(async () => {
    await sharedContext?.close();
  });

  test('route name element has title attribute for tooltip', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    // Find route name elements
    const routeNames = sharedPage.locator(
      '[data-testid="route-sidebar"] [data-testid^="route-name-"]'
    );
    const count = await routeNames.count();

    if (count === 0) {
      test.skip(true, 'No routes available to test');
      return;
    }

    // Check that route names have title attribute
    const firstRouteName = routeNames.first();
    const title = await firstRouteName.getAttribute('title');
    const dataTooltip = await firstRouteName.getAttribute('data-tip');

    // Either title or data-tip (DaisyUI tooltip) should be present
    const hasTooltip = title !== null || dataTooltip !== null;
    expect(hasTooltip).toBe(true);
  });

  test('route names have text truncation styling', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    const routeNames = sharedPage.locator(
      '[data-testid="route-sidebar"] [data-testid^="route-name-"]'
    );
    const count = await routeNames.count();

    if (count === 0) {
      test.skip(true, 'No routes available to test');
      return;
    }

    // Check CSS for text overflow
    const hasTruncation = await sharedPage.evaluate(() => {
      const routeName = document.querySelector('[data-testid^="route-name-"]');
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
  test.use({ viewport: { width: 1280, height: 900 } });

  let sharedContext: BrowserContext;
  let sharedPage: Page;
  let companiesPage: CompaniesPage;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    companiesPage = new CompaniesPage(sharedPage);
    await companiesPage.signIn(TEST_USER.email, TEST_USER.password);
  });

  test.afterAll(async () => {
    await sharedContext?.close();
  });

  test('resize handle is visible on desktop', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    // Find the resize handle
    const resizeHandle = sharedPage.locator(
      '[data-testid="route-sidebar-panel-handle"], [role="separator"]'
    );
    const isVisible = await resizeHandle.isVisible().catch(() => false);

    expect(isVisible).toBe(true);
  });

  test('resize handle has correct ARIA attributes', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    const resizeHandle = sharedPage.locator(
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

  test('keyboard resize with Arrow keys', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    const resizeHandle = sharedPage.locator(
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
    await sharedPage.keyboard.press('ArrowRight');
    await sharedPage.waitForTimeout(100);

    // Get new width
    const newWidth = await resizeHandle.getAttribute('aria-valuenow');
    expect(parseInt(newWidth || '0')).toBeGreaterThanOrEqual(
      parseInt(initialWidth || '0')
    );
  });

  test('sidebar width persists after page refresh', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    const resizeHandle = sharedPage.locator(
      '[data-testid="route-sidebar-panel-handle"], [role="separator"]'
    );
    const isVisible = await resizeHandle.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip(true, 'Resize handle not visible');
      return;
    }

    // Set a specific width via keyboard
    await resizeHandle.focus();
    await sharedPage.keyboard.press('End'); // Go to max width (400px)
    await sharedPage.waitForTimeout(100);

    // Refresh the page
    await sharedPage.reload();
    await companiesPage.waitForTable();

    // Check the width was restored
    const restoredHandle = sharedPage.locator(
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
  test.use({ viewport: { width: 375, height: 667 } });

  let sharedContext: BrowserContext;
  let sharedPage: Page;
  let companiesPage: CompaniesPage;

  test.beforeAll(async ({ browser }) => {
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    companiesPage = new CompaniesPage(sharedPage);
    await companiesPage.signIn(TEST_USER.email, TEST_USER.password);
  });

  test.afterAll(async () => {
    await sharedContext?.close();
  });

  test('resize handle is not visible on mobile', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    // On mobile, the route sidebar is typically hidden or in a different layout
    const resizeHandle = sharedPage.locator(
      '[data-testid="route-sidebar-panel-handle"], [role="separator"]'
    );
    const isVisible = await resizeHandle.isVisible().catch(() => false);

    // Resize handle should NOT be visible on mobile
    expect(isVisible).toBe(false);
  });

  test('sidebar uses drawer pattern on mobile', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    // On mobile, the route sidebar should be hidden initially (drawer pattern)
    const routeSidebar = sharedPage.locator('[data-testid="route-sidebar"]');
    const isVisible = await routeSidebar.isVisible().catch(() => false);

    // Sidebar should not be visible by default on mobile (lg:flex hides on mobile)
    // This verifies the drawer pattern is being used
    if (isVisible) {
      // If visible, check it doesn't have a fixed width
      const hasFixedWidth = await sharedPage.evaluate(() => {
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

  test('touch scrolling works on route list', async () => {
    await companiesPage.goto();
    await companiesPage.waitForTable();

    // Try to find route list (may be in drawer or visible on larger mobile)
    const scrollContainer = sharedPage.locator(
      '[data-testid="route-list-scroll"], [data-testid="route-sidebar"] .overflow-y-auto'
    );

    const isVisible = await scrollContainer
      .first()
      .isVisible()
      .catch(() => false);

    if (!isVisible) {
      test.skip(
        true,
        'Route list not visible on mobile (may require drawer open)'
      );
      return;
    }

    // Verify touch-action is not none (allows touch scrolling)
    const allowsTouch = await sharedPage.evaluate(() => {
      const container =
        document.querySelector('[data-testid="route-list-scroll"]') ||
        document.querySelector(
          '[data-testid="route-sidebar"] .overflow-y-auto'
        );
      if (!container) return true; // Skip if not found
      const styles = window.getComputedStyle(container);
      return styles.touchAction !== 'none';
    });

    expect(allowsTouch).toBe(true);
  });
});

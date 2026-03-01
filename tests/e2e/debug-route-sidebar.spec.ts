import { test, expect } from '@playwright/test';

// Only run on chromium desktop - sidebar requires lg: breakpoint (1024px+)
test.describe('Debug Route Sidebar', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('show companies on route', async ({ page, browserName }) => {
    // Skip non-chromium browsers for faster debugging
    test.skip(browserName !== 'chromium', 'Only run on chromium for debugging');

    // Capture console messages
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Go to sign-in first
    await page.goto('/sign-in');
    await page.fill(
      'input[type="email"]',
      process.env.TEST_USER_PRIMARY_EMAIL || 'test@example.com'
    );
    await page.fill(
      'input[type="password"]',
      process.env.TEST_USER_PRIMARY_PASSWORD || 'testpassword'
    );
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Navigate to companies page
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Find the route with the "Planning" badge and click it
    const planningRoute = page
      .locator('[role="listitem"]')
      .filter({ has: page.locator('.badge:has-text("Planning")') });

    // Skip if no Planning route exists in the test user's data
    const planningRouteCount = await planningRoute.count();
    if (planningRouteCount === 0) {
      console.log('No route with Planning badge found — skipping');
      test.skip(true, 'No route with Planning badge exists for test user');
      return;
    }

    const routeText = await planningRoute
      .first()
      .textContent()
      .catch(() => 'not found');
    console.log('Planning route text:', routeText);

    // Click on it to make sure it's selected
    await planningRoute.first().click();
    await page.waitForTimeout(1000);

    // Get the "Companies on Route" section content
    const companiesSection = page
      .locator('text=Companies on Route')
      .locator('..');
    const companiesSectionHTML = await companiesSection
      .innerHTML()
      .catch(() => 'section not found');
    console.log('Companies section HTML:', companiesSectionHTML);

    // Check what's in the inline preview list
    const companyListItems = page.locator('aside ul.menu li');
    const itemCount = await companyListItems.count();
    console.log('Company list items in sidebar:', itemCount);

    // Check for "No companies added yet" message
    const noCompaniesMsg = page.locator('text=No companies added yet');
    const hasNoCompaniesMsg = await noCompaniesMsg
      .isVisible()
      .catch(() => false);
    console.log('Shows "No companies added yet":', hasNoCompaniesMsg);

    // Take screenshot of the sidebar
    await page
      .locator('aside')
      .first()
      .screenshot({ path: 'tests/e2e/screenshots/sidebar-companies.png' });

    // Take full page screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/full-page-companies.png',
      fullPage: true,
    });

    // Now let's try clicking "View All" if it exists (for routes with >3 companies)
    const viewAllBtn = page.locator('button:has-text("View All")');
    const hasViewAll = await viewAllBtn.isVisible().catch(() => false);
    console.log('Has View All button:', hasViewAll);

    if (hasViewAll) {
      await viewAllBtn.click();
      await page.waitForTimeout(1000);

      // Check for drag handles (should have hamburger icon buttons)
      const dragHandles = page.locator(
        '[role="dialog"] button[aria-label*="Drag to reorder"]'
      );
      const dragHandleCount = await dragHandles.count();
      console.log('Drag handles in drawer:', dragHandleCount);

      // Get company names in drawer to check for duplicates
      const companyNames = await page
        .locator('[role="dialog"] ul li .font-medium.truncate')
        .allTextContents();
      console.log('Companies in drawer:', companyNames);

      // Check for duplicates
      const uniqueNames = new Set(companyNames);
      const hasDuplicates = uniqueNames.size !== companyNames.length;
      console.log('Has duplicate companies:', hasDuplicates);

      await page.screenshot({
        path: 'tests/e2e/screenshots/route-detail-drawer.png',
      });
    }

    // Log summary
    console.log('\n=== SUMMARY ===');
    console.log('Route selected:', routeText);
    console.log('Companies in list:', itemCount);
    console.log('Shows empty message:', hasNoCompaniesMsg);

    // Print relevant console logs
    console.log('\n=== BROWSER CONSOLE (DEBUG and errors) ===');
    consoleLogs
      .filter(
        (log) =>
          log.includes('DEBUG') ||
          log.includes('error') ||
          log.includes('Error') ||
          log.includes('failed')
      )
      .forEach((log) => console.log(log));
  });
});

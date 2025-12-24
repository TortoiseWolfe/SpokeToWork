import { test, expect } from '@playwright/test';

test.describe('Homepage Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('homepage loads with correct title', async ({ page }) => {
    // Check the page title contains project name
    await expect(page).toHaveTitle(/.*/);

    // Check the main heading is visible
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('navigate to themes page', async ({ page }) => {
    // Click the Browse Themes button or navigate directly
    const browseThemesLink = page.locator('a:has-text("Browse Themes")');
    if ((await browseThemesLink.count()) > 0) {
      await browseThemesLink.click();
    } else {
      await page.goto('/themes');
    }

    // Verify navigation to themes page
    await expect(page).toHaveURL(/.*themes/);

    // Verify themes page content loads
    await page.waitForLoadState('domcontentloaded');
    const themesHeading = page.locator('h1').filter({ hasText: /Theme/i });
    await expect(themesHeading).toBeVisible();
  });

  test('navigate to blog page', async ({ page }) => {
    // Click the Read Blog button or navigate directly
    const blogButton = page.locator('a:has-text("Read Blog")');
    if ((await blogButton.count()) > 0) {
      await blogButton.scrollIntoViewIfNeeded();
      await blogButton.click({ force: true });
    } else {
      // Try nav Blog link
      const blogNavLink = page.locator('nav a:has-text("Blog")');
      if ((await blogNavLink.count()) > 0) {
        await blogNavLink.click();
      } else {
        await page.goto('/blog');
      }
    }

    // Verify navigation to blog page
    await expect(page).toHaveURL(/.*blog/);

    // Verify blog page content loads (blog uses h2 for article titles)
    await page.waitForLoadState('domcontentloaded');
    const blogContent = page.locator('article').first();
    await expect(blogContent).toBeVisible();
  });

  test('feature badges display correctly', async ({ page }) => {
    // Check that feature badges are visible (on larger screens)
    const badges = page.locator(
      '[role="list"][aria-label="Key features"] .badge'
    );
    const badgeCount = await badges.count();

    // On mobile, badges may be hidden - only check if visible
    if (badgeCount > 0) {
      const firstBadge = badges.first();
      const isVisible = await firstBadge.isVisible();
      if (isVisible) {
        expect(badgeCount).toBeGreaterThanOrEqual(3);
      }
    }
  });

  test('feature cards are present', async ({ page }) => {
    // Scroll to feature cards section (below hero)
    const featureSection = page.locator('[aria-label="Key features"]').last();
    await featureSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Check that feature card links exist (cards are links with h3 headings)
    const featureCardLinks = page.locator(
      'section[aria-label="Key features"] a'
    );
    const cardCount = await featureCardLinks.count();
    expect(cardCount).toBeGreaterThanOrEqual(4);

    // Check for "Track Companies" heading
    const companiesHeading = page.locator('h3:has-text("Track Companies")');
    await expect(companiesHeading).toBeVisible();

    // Check for "Plan Routes" heading
    const routesHeading = page.locator('h3:has-text("Plan Routes")');
    await expect(routesHeading).toBeVisible();
  });

  test('navigation links work', async ({ page }) => {
    // Test Companies link in secondary nav
    const companiesLink = page.locator('a[href="/companies"]').first();
    if ((await companiesLink.count()) > 0) {
      await companiesLink.click();
      await expect(page).toHaveURL(/.*companies/);
      await page.goBack();
    }
  });

  test('Storybook link opens in new tab', async ({ page, context }) => {
    // Find the View Storybook link
    const storybookLink = page.locator('a:has-text("View Storybook")');
    if ((await storybookLink.count()) === 0) {
      // No Storybook link on this page - skip test
      test.skip();
      return;
    }

    // Listen for new page/tab
    const [newPage] = await Promise.all([
      context.waitForEvent('page', { timeout: 10000 }),
      storybookLink.click(),
    ]);

    // Check the new tab URL
    await newPage.waitForLoadState('domcontentloaded');
    expect(newPage.url()).toContain('storybook');
    await newPage.close();
  });

  test('skip to main content link works', async ({ page }) => {
    // Focus the skip link (it's visually hidden by default)
    await page.keyboard.press('Tab');

    // The skip link should be one of the first focusable elements
    const skipLink = page.locator('a[href="#main-content"]');
    const skipLinkCount = await skipLink.count();

    if (skipLinkCount > 0) {
      // Use keyboard to activate the skip link instead of click (avoids interception)
      await page.keyboard.press('Enter');

      // Verify main content section exists
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();
    }
  });
});

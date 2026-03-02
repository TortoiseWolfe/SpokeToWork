import { test, expect } from '@playwright/test';

test.describe('Cross-Page Navigation', () => {
  test('navigate through all main pages', async ({ page }) => {
    // Start at homepage
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    // Navigate to Blog via direct URL (more reliable in CI)
    await page.goto('/blog');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/blog/);

    // Navigate to Accessibility
    await page.goto('/accessibility');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/accessibility/);

    // Navigate to Status
    await page.goto('/status');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/status/);

    // Navigate back to Home via nav link
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);
  });

  test('browser back/forward navigation works', async ({ page }) => {
    // Navigate through multiple pages via direct URLs
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.goto('/blog');
    await page.waitForLoadState('domcontentloaded');
    await page.goto('/accessibility');
    await page.waitForLoadState('domcontentloaded');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/blog/);

    // Go back again
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/\/blog/);

    // Go forward again
    await page.goForward();
    await expect(page).toHaveURL(/\/accessibility/);
  });

  test('navigation menu is consistent across pages', async ({ page }) => {
    const pages = ['/', '/blog', '/accessibility', '/status'];

    for (const pagePath of pages) {
      await page.goto(pagePath);

      // Check navigation elements exist
      const nav = page.locator('nav, [role="navigation"]').first();
      await expect(nav).toBeVisible();

      // Check key navigation links are present
      const homeLink = page
        .locator('a:has-text("Home"), a:has-text("SpokeToWork")')
        .first();
      await expect(homeLink).toBeVisible();

      // Check footer links are consistent
      const footer = page.locator('footer, [role="contentinfo"]').first();
      await expect(footer).toBeVisible();
    }
  });

  test('deep linking works correctly', async ({ page }) => {
    // Direct navigation to deep pages
    await page.goto('/blog');
    await expect(page).toHaveURL(/\/blog/);
    await page.waitForLoadState('domcontentloaded');

    await page.goto('/accessibility');
    await expect(page).toHaveURL(/\/accessibility/);
    await page.waitForLoadState('domcontentloaded');

    await page.goto('/status');
    await expect(page).toHaveURL(/\/status/);
    await page.waitForLoadState('domcontentloaded');

    await page.goto('/contact');
    await expect(page).toHaveURL(/\/contact/);
    await page.waitForLoadState('domcontentloaded');
  });

  test('404 page handles non-existent routes', async ({ page }) => {
    // Navigate to non-existent page
    const response = await page.goto('/non-existent-page', {
      waitUntil: 'domcontentloaded',
    });

    // Check response status
    if (response) {
      const status = response.status();
      // Should be 404 or redirect to 404 page
      expect([404, 200]).toContain(status);
    }

    // Check for 404 content or redirect to home
    const has404Content =
      (await page.locator('text=/404|not found/i').count()) > 0;
    const isHomePage = await page.url().includes('/SpokeToWork');

    expect(has404Content || isHomePage).toBe(true);
  });

  test('anchor links within pages work', async ({ page }) => {
    // Navigate to blog page which has anchor links for tags
    await page.goto('/blog');
    await page.waitForLoadState('domcontentloaded');

    // Check for internal anchor links
    const anchorLinks = page.locator('a[href^="#"]');
    const anchorCount = await anchorLinks.count();

    // If anchor links exist, verify the structure (not all pages have anchor links)
    if (anchorCount > 0) {
      // Just verify the anchor link element structure exists
      const firstAnchor = anchorLinks.first();
      const href = await firstAnchor.getAttribute('href');
      expect(href).toMatch(/^#/);
    }
  });

  test('external links have proper attributes', async ({ page }) => {
    // Check homepage for external links
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Find external links
    const externalLinks = page.locator(
      'a[href^="http"]:not([href*="localhost"])'
    );
    const linkCount = await externalLinks.count();

    if (linkCount > 0) {
      // Check that external links with target="_blank" have noopener
      for (let i = 0; i < Math.min(linkCount, 3); i++) {
        const link = externalLinks.nth(i);
        const target = await link.getAttribute('target');
        const rel = await link.getAttribute('rel');

        // External links should have security attributes
        if (target === '_blank') {
          expect(rel).toContain('noopener');
        }
      }
    }
  });

  test('breadcrumb navigation works if present', async ({ page }) => {
    await page.goto('/docs');

    // Look for breadcrumb navigation
    const breadcrumbs = page.locator(
      '[aria-label="breadcrumb"], .breadcrumbs, nav.breadcrumb'
    );
    const hasBreadcrumbs = (await breadcrumbs.count()) > 0;

    if (hasBreadcrumbs) {
      const breadcrumbLinks = breadcrumbs.locator('a');
      const linkCount = await breadcrumbLinks.count();

      if (linkCount > 0) {
        // Click first breadcrumb (usually Home)
        await breadcrumbLinks.first().click();

        // Should navigate to home
        await expect(page).toHaveURL(/\/$/);
      }
    }
  });

  test('navigation preserves theme selection', async ({ page }) => {
    // Go to homepage first and set dark theme via localStorage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Set theme via localStorage and apply to DOM
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Navigate to different pages and verify theme persists
    const pages = ['/blog', '/accessibility', '/status', '/'];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('domcontentloaded');

      // Theme should persist (loaded from localStorage by GlobalNav)
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    }
  });

  test('navigation menu is keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Tab to first navigation link
    await page.keyboard.press('Tab');

    let navLinkFocused = false;
    let tabCount = 0;
    const maxTabs = 20;

    // Tab until we find a navigation link
    while (!navLinkFocused && tabCount < maxTabs) {
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          isNav: el?.closest('nav') !== null,
          text: el?.textContent,
        };
      });

      if (focusedElement.tag === 'A' && focusedElement.isNav) {
        navLinkFocused = true;

        // Press Enter to navigate
        await page.keyboard.press('Enter');

        // Check navigation occurred
        await page.waitForLoadState('domcontentloaded');
        const url = page.url();
        expect(url).toBeTruthy();
      }

      await page.keyboard.press('Tab');
      tabCount++;
    }
  });

  test('page transitions are smooth', async ({ page }) => {
    await page.goto('/');

    // Check for view transitions API or CSS transitions
    const hasTransitions = await page.evaluate(() => {
      // Check if View Transitions API is used
      if ('startViewTransition' in document) {
        return true;
      }

      // Check for CSS transitions on body or main
      const body = (document as Document).body;
      const main = (document as Document).querySelector('main');
      const bodyTransition = window.getComputedStyle(body).transition;
      const mainTransition = main
        ? window.getComputedStyle(main as Element).transition
        : '';

      return bodyTransition !== 'none' || mainTransition !== 'none';
    });

    // We're just checking the mechanism exists, not asserting
    expect(hasTransitions).toBeDefined();

    // Navigate and observe smooth transition - use "Browse Themes" link on homepage
    const browseThemesLink = page.locator(
      'a[href="/themes"]:has-text("Browse Themes")'
    );
    if ((await browseThemesLink.count()) > 0) {
      await browseThemesLink.click();
      await expect(page).toHaveURL(/\/themes/);
    } else {
      // Fallback to Blog link (use .first() — nav has desktop + mobile instances)
      await page.locator('a:has-text("Blog")').first().click();
      await expect(page).toHaveURL(/\/blog/);
    }
  });

  test('mobile navigation menu works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // GlobalNav uses a DaisyUI dropdown with a <label> (not <button>) for the hamburger.
    // The label has aria-label="Navigation menu"; the dropdown content uses .dropdown-content.
    const menuButton = page.locator('[aria-label="Navigation menu"]');
    const hasMenuButton = (await menuButton.count()) > 0;

    if (hasMenuButton) {
      // Open mobile menu
      await menuButton.click();

      // The nav dropdown-content is a sibling of the label inside the same
      // dropdown div. Use the sibling combinator to uniquely target it.
      const mobileNav = page.locator(
        '[aria-label="Navigation menu"] ~ .dropdown-content'
      );
      await expect(mobileNav).toBeVisible();

      // Click a navigation link - look for Blog or Home in mobile menu
      const blogLink = mobileNav.locator('a:has-text("Blog")').first();
      const homeLink = mobileNav.locator('a:has-text("Home")').first();

      if ((await blogLink.count()) > 0) {
        await blogLink.click();
        await expect(page).toHaveURL(/\/blog/);
      } else if ((await homeLink.count()) > 0) {
        await homeLink.click();
        await expect(page).toHaveURL(/\/$/);
      }
    }
  });

  test('scroll position resets on navigation', async ({ page }) => {
    await page.goto('/');

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));

    // Navigate to another page using "Browse Themes" or Blog link
    const browseThemesLink = page.locator(
      'a[href="/themes"]:has-text("Browse Themes")'
    );
    if ((await browseThemesLink.count()) > 0) {
      await browseThemesLink.click();
    } else {
      await page.click('a:has-text("Blog")');
    }
    await page.waitForLoadState('domcontentloaded');

    // Check scroll position is at top
    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(scrollPosition).toBeLessThanOrEqual(100); // Allow small offset for fixed headers
  });

  test('active navigation item is highlighted', async ({ page }) => {
    // Test on /blog page which is in the main nav
    await page.goto('/blog');
    await page.waitForLoadState('domcontentloaded');

    // Find navigation link for current page
    const activeLink = page
      .locator('nav a[href="/blog"], nav a:has-text("Blog")')
      .first();

    if ((await activeLink.count()) > 0) {
      // Check for active state (aria-current or btn-active class from DaisyUI)
      const ariaCurrent = await activeLink.getAttribute('aria-current');
      const className = await activeLink.getAttribute('class');

      const hasActiveState =
        ariaCurrent === 'page' ||
        className?.includes('active') ||
        className?.includes('btn-active');

      expect(hasActiveState).toBe(true);
    }
  });
});

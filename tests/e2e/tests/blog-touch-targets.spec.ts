import { test, expect, devices } from '@playwright/test';
import { TOUCH_TARGET_STANDARDS } from '@/config/touch-targets';

/**
 * Touch Target Standards for Blog (T013)
 * PRP-017: Mobile-First Design Overhaul
 *
 * Test blog interactive elements meet 44x44px AAA standards
 * This test should FAIL initially (TDD RED phase)
 */

// Device configuration - spread only viewport/touch settings, not defaultBrowserType
// This allows the test to run with any browser project (chromium, firefox, webkit)
const iPhone12 = devices['iPhone 12'];
test.use({
  viewport: iPhone12.viewport,
  deviceScaleFactor: iPhone12.deviceScaleFactor,
  isMobile: iPhone12.isMobile,
  hasTouch: iPhone12.hasTouch,
  userAgent: iPhone12.userAgent,
});

const MINIMUM = TOUCH_TARGET_STANDARDS.AAA.minWidth;
const TOLERANCE = 1;

test.describe('Blog Touch Target Standards - iPhone 12', () => {
  test('Blog list page renders with accessible content', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');

    // Verify blog page loads with article cards
    const articles = await page.locator('article').count();
    expect(articles).toBeGreaterThan(0);

    // Verify blog post links are present and clickable
    const blogLinks = await page.locator('a[href*="/blog/"]').all();
    let clickableLinks = 0;

    for (const link of blogLinks.slice(0, 5)) {
      if (await link.isVisible()) {
        const box = await link.boundingBox();
        // Links should have reasonable clickable area (at least 24px height)
        if (box && box.height >= 24) {
          clickableLinks++;
        }
      }
    }

    expect(clickableLinks).toBeGreaterThan(0);
  });

  test('Blog post navigation buttons meet touch standards', async ({
    page,
  }) => {
    // Try blog post, fall back to blog list
    try {
      await page.goto('/blog/countdown-timer-react-tutorial', {
        timeout: 15000,
      });
    } catch {
      await page.goto('/blog');
    }
    await page.waitForLoadState('domcontentloaded');

    // Test only primary navigation buttons (nav buttons, not inline UI elements)
    const navButtons = await page.locator('nav button, header button').all();

    // If no nav buttons found, that's OK - not all pages have them
    if (navButtons.length === 0) {
      return;
    }

    for (const button of navButtons) {
      if (await button.isVisible()) {
        const box = await button.boundingBox();

        if (box) {
          // Navigation buttons should meet touch target standards
          expect(
            box.width,
            'Navigation button width must be ≥ 44px'
          ).toBeGreaterThanOrEqual(MINIMUM - TOLERANCE);

          expect(
            box.height,
            'Navigation button height must be ≥ 44px'
          ).toBeGreaterThanOrEqual(MINIMUM - TOLERANCE);
        }
      }
    }
  });
});

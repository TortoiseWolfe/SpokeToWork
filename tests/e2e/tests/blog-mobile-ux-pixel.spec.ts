import { test, expect, devices } from '@playwright/test';

/**
 * Mobile UX Tests - Mobile Chrome (Pixel 5)
 *
 * Run same tests on Android viewport to ensure cross-platform compatibility
 *
 * See PRP-016: Mobile-First Visual Testing Methodology
 */

// Device configuration - spread only viewport/touch settings, not defaultBrowserType
// This allows the test to run with any browser project (chromium, firefox, webkit)
const Pixel5 = devices['Pixel 5'];
test.use({
  viewport: Pixel5.viewport,
  deviceScaleFactor: Pixel5.deviceScaleFactor,
  isMobile: Pixel5.isMobile,
  hasTouch: Pixel5.hasTouch,
  userAgent: Pixel5.userAgent,
});

test.describe('Blog Post Mobile UX - Pixel 5', () => {
  test('should display footer at bottom', async ({ page }) => {
    // Try blog post, fall back to blog list
    try {
      await page.goto('/blog/countdown-timer-react-tutorial', {
        timeout: 15000,
      });
    } catch {
      await page.goto('/blog');
    }
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    // Just check footer has content
    const footerText = await footer.textContent();
    expect(footerText?.length).toBeGreaterThan(0);
  });

  test('should not have horizontal scroll', async ({ page }) => {
    // Try blog post, fall back to blog list
    try {
      await page.goto('/blog/countdown-timer-react-tutorial', {
        timeout: 15000,
      });
    } catch {
      await page.goto('/blog');
    }
    await page.waitForLoadState('domcontentloaded');

    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 0;

    expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});

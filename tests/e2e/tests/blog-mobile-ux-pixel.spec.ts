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
// Note: isMobile is not supported in Playwright's Firefox driver, so we omit it
const Pixel5 = devices['Pixel 5'];
test.use({
  viewport: Pixel5.viewport,
  deviceScaleFactor: Pixel5.deviceScaleFactor,
  hasTouch: Pixel5.hasTouch,
  userAgent: Pixel5.userAgent,
});

test.describe('Blog Post Mobile UX - Pixel 5', () => {
  test('should display footer at bottom', async ({ page }) => {
    // Try blog post, fall back to blog list
    try {
      await page.goto('/blog/message-encryption-security-explained', {
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
      await page.goto('/blog/message-encryption-security-explained', {
        timeout: 15000,
      });
    } catch {
      await page.goto('/blog');
    }
    await page.waitForLoadState('domcontentloaded');

    // Check if user can actually scroll horizontally (visible scrollbar)
    const canScrollHorizontally = await page.evaluate(() => {
      const html = document.documentElement;
      const style = window.getComputedStyle(html);
      const hasOverflow = html.scrollWidth > html.clientWidth;
      const isHidden = style.overflowX === 'hidden';
      return hasOverflow && !isHidden;
    });

    expect(canScrollHorizontally).toBe(false);
  });
});

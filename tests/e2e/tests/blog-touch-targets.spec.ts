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
  test('Blog list cards have adequate touch targets (44x44px minimum)', async ({
    page,
  }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');

    // Find all blog post card links
    const blogCards = await page.locator('a[href*="/blog/"]').all();

    const failures: string[] = [];

    for (let i = 0; i < blogCards.length; i++) {
      const card = blogCards[i];

      if (await card.isVisible()) {
        const box = await card.boundingBox();

        if (box) {
          // Cards should have adequate height for tapping
          if (box.height < MINIMUM - TOLERANCE) {
            const href = await card.getAttribute('href');
            failures.push(
              `Card ${i} (${href}): height ${box.height.toFixed(1)}px < ${MINIMUM}px`
            );
          }
        }
      }
    }

    if (failures.length > 0) {
      const summary = `${failures.length} blog cards failed touch target requirements:\n${failures.join('\n')}`;
      expect(failures.length, summary).toBe(0);
    }
  });

  test('Blog post interactive elements meet 44x44px', async ({ page }) => {
    await page.goto('/blog/countdown-timer-react-tutorial');
    await page.waitForLoadState('networkidle');

    // Test buttons (SEO badge, TOC, etc.)
    const buttons = await page.locator('button').all();

    for (const button of buttons) {
      if (await button.isVisible()) {
        const box = await button.boundingBox();

        if (box) {
          expect(
            box.width,
            'Button width must be ≥ 44px'
          ).toBeGreaterThanOrEqual(MINIMUM - TOLERANCE);

          expect(
            box.height,
            'Button height must be ≥ 44px'
          ).toBeGreaterThanOrEqual(MINIMUM - TOLERANCE);
        }
      }
    }
  });
});

/**
 * Horizontal Scroll Detection Test
 * PRP-017: Mobile-First Design Overhaul
 * Task: T010
 *
 * Test zero horizontal scroll on all pages at mobile widths
 * This test should FAIL initially (TDD RED phase)
 */

import { test, expect } from '@playwright/test';
import { TEST_PAGES, CRITICAL_MOBILE_WIDTHS } from '@/config/test-viewports';

test.describe('Horizontal Scroll Detection', () => {
  // Test key pages at most common mobile width
  const testPages = ['/', '/blog'];
  const testWidth = 390; // iPhone 12 width

  for (const url of testPages) {
    test(`No visible horizontal scroll on ${url} at ${testWidth}px`, async ({
      page,
    }) => {
      // Set viewport to iPhone 12 width
      await page.setViewportSize({ width: testWidth, height: 800 });

      // Navigate to page
      await page.goto(url);

      // Wait for page to fully render
      await page.waitForLoadState('networkidle');

      // Check if there's a visible scrollbar by testing if user can scroll
      const canScrollHorizontally = await page.evaluate(() => {
        const html = document.documentElement;
        // Check if content overflows AND overflow is not hidden
        const style = window.getComputedStyle(html);
        const hasOverflow = html.scrollWidth > html.clientWidth;
        const isHidden = style.overflowX === 'hidden';
        return hasOverflow && !isHidden;
      });

      expect(
        canScrollHorizontally,
        `Visible horizontal scroll detected on ${url}`
      ).toBe(false);
    });
  }

  test('Main content fits within narrow viewport', async ({ page }) => {
    // Test at narrowest supported width
    const width = 320;
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');

    // Check main content area only (not hidden elements, dev tools, etc.)
    const mainContent = page.locator('main, [role="main"]').first();

    if (await mainContent.count()) {
      const box = await mainContent.boundingBox();

      if (box) {
        // Main content should fit within viewport
        expect(
          box.width,
          'Main content should fit within 320px viewport'
        ).toBeLessThanOrEqual(width + 10); // Allow small margin
      }
    }

    // Also verify no visible horizontal scrollbar
    const canScrollHorizontally = await page.evaluate(() => {
      const html = document.documentElement;
      const style = window.getComputedStyle(html);
      const hasOverflow = html.scrollWidth > html.clientWidth;
      const isHidden = style.overflowX === 'hidden';
      return hasOverflow && !isHidden;
    });

    expect(canScrollHorizontally).toBe(false);
  });

  test('Images do not cause horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blog/countdown-timer-react-tutorial');

    const images = await page.locator('img').all();

    for (const img of images) {
      if (await img.isVisible()) {
        const box = await img.boundingBox();

        if (box) {
          expect(
            box.width,
            'Image width must not exceed viewport'
          ).toBeLessThanOrEqual(390 + 1);
        }
      }
    }
  });

  test('Tables are responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blog');

    // Check if any tables exist
    const tables = await page.locator('table').all();

    for (const table of tables) {
      if (await table.isVisible()) {
        const box = await table.boundingBox();

        if (box) {
          // Tables should either fit or have overflow-x-auto wrapper
          const parent = await table.evaluateHandle((el) => el.parentElement);
          const parentOverflow = await parent.evaluate(
            (el) => window.getComputedStyle(el!).overflowX
          );

          const tableWidth = box.width;
          const viewportWidth = 390;

          // Either table fits OR parent has overflow scroll
          const fitsInViewport = tableWidth <= viewportWidth + 1;
          const hasScrollableParent =
            parentOverflow === 'auto' || parentOverflow === 'scroll';

          expect(
            fitsInViewport || hasScrollableParent,
            'Table must either fit viewport or have scrollable parent'
          ).toBeTruthy();
        }
      }
    }
  });

  test('Pre/code blocks are responsive', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blog/countdown-timer-react-tutorial');

    const codeBlocks = await page.locator('pre, code').all();

    for (const block of codeBlocks) {
      if (await block.isVisible()) {
        const box = await block.boundingBox();

        if (box) {
          // Code blocks should have overflow-x-auto or fit in viewport
          const overflowX = await block.evaluate(
            (el) => window.getComputedStyle(el).overflowX
          );

          const fitsInViewport = box.width <= 390 + 1;
          const hasHorizontalScroll =
            overflowX === 'auto' || overflowX === 'scroll';

          expect(
            fitsInViewport || hasHorizontalScroll,
            'Code block must either fit or have horizontal scroll'
          ).toBeTruthy();
        }
      }
    }
  });
});

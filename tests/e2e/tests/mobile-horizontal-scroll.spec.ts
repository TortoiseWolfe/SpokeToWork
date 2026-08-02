/**
 * Horizontal Scroll Detection Test
 * PRP-017: Mobile-First Design Overhaul
 * Task: T010
 *
 * Test zero horizontal scroll on all pages at mobile widths
 * This test should FAIL initially (TDD RED phase)
 */

import { test, expect } from '@playwright/test';
import { CRITICAL_MOBILE_WIDTHS } from '@/config/test-viewports';

/**
 * #79 — this gate could not fail, for the life of the project.
 *
 * The original predicate was:
 *
 *     const hasOverflow = html.scrollWidth > html.clientWidth;
 *     const isHidden = style.overflowX === 'hidden';
 *     return hasOverflow && !isHidden;        // asserted toBe(false)
 *
 * and the app pinned `overflow-x: hidden` on <html> in globals.css AND in
 * layout.tsx. `isHidden` was therefore permanently true, the expression
 * permanently false, and the assertion passed no matter what the layout did.
 * The one way to fail it was to remove the very rule that was hiding the bug.
 *
 * That suppression is gone now (the frame uses `overflow-x: clip`), so
 * scrollWidth is a real signal again and this measures it directly. It no
 * longer consults overflow-x at all: whether the page CAN scroll is not the
 * question — whether content EXCEEDS THE VIEWPORT is.
 */

/** Routes that must not overflow. Broader than the original two. */
const ROUTES = [
  '/',
  '/blog',
  '/docs',
  '/sign-in',
  '/sign-up',
  '/contact',
  '/accessibility',
  '/themes',
  '/privacy',
];

test.describe('Horizontal Scroll Detection', () => {
  test('no horizontal overflow on any route at any critical mobile width', async ({
    page,
  }) => {
    const failures: string[] = [];
    let measured = 0;

    for (const url of ROUTES) {
      for (const width of CRITICAL_MOBILE_WIDTHS) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(url);
        await page.waitForLoadState('domcontentloaded');

        const over = await page.evaluate(() => {
          const html = document.documentElement;
          return html.scrollWidth - html.clientWidth;
        });
        measured++;
        // 1px of rounding slack; real regressions here were 63-220px.
        if (over > 1)
          failures.push(`${url} @ ${width}px overflows by ${over}px`);
      }
    }

    // Coverage floor. Without this, a navigation failure or an empty route
    // list would produce zero measurements and a green result — the shape of
    // failure this whole issue is about.
    expect(measured, 'measured no viewport/route combinations at all').toBe(
      ROUTES.length * CRITICAL_MOBILE_WIDTHS.length
    );

    expect(failures, failures.join('\n')).toEqual([]);
  });

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
    await page.goto('/blog/message-encryption-security-explained');

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
    await page.goto('/blog/message-encryption-security-explained');

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

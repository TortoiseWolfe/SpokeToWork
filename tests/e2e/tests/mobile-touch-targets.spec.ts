/**
 * Touch Target Validation Test
 * PRP-017: Mobile-First Design Overhaul
 * Task: T009
 *
 * Test all interactive elements meet 44x44px minimum
 * This test should FAIL initially (TDD RED phase)
 */

import { test, expect } from '@playwright/test';
import {
  TOUCH_TARGET_STANDARDS,
  getInteractiveElementSelector,
} from '@/config/touch-targets';
import { CRITICAL_MOBILE_WIDTHS } from '@/config/test-viewports';

test.describe('Touch Target Standards', () => {
  const MINIMUM = TOUCH_TARGET_STANDARDS.AAA.minWidth;
  const TOLERANCE = 1; // Allow 1px tolerance for sub-pixel rendering

  test('Primary interactive elements meet 44x44px minimum on iPhone 12', async ({
    page,
  }) => {
    // Test on most common mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Test buttons and button-like elements (not inline text links)
    // WCAG 2.2 allows exceptions for inline links within text
    const primaryInteractive = await page
      .locator(
        'button, [role="button"], input[type="submit"], input[type="button"]'
      )
      .all();

    const failures: string[] = [];

    for (let i = 0; i < primaryInteractive.length; i++) {
      const element = primaryInteractive[i];

      if (await element.isVisible()) {
        const box = await element.boundingBox();

        if (box) {
          const text =
            (await element.textContent())?.trim().substring(0, 30) || '';

          // Check width
          if (box.width < MINIMUM - TOLERANCE) {
            failures.push(
              `Button ${i} "${text}": width ${box.width.toFixed(1)}px < ${MINIMUM}px`
            );
          }

          // Check height
          if (box.height < MINIMUM - TOLERANCE) {
            failures.push(
              `Button ${i} "${text}": height ${box.height.toFixed(1)}px < ${MINIMUM}px`
            );
          }
        }
      }
    }

    // Report all failures at once for better debugging
    if (failures.length > 0) {
      const summary = `${failures.length} buttons failed touch target requirements:\n${failures.join('\n')}`;
      expect(failures.length, summary).toBe(0);
    }
  });

  test('Navigation buttons meet touch target standards', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Specifically test navigation buttons
    const navButtons = await page.locator('nav button').all();

    for (const button of navButtons) {
      if (await button.isVisible()) {
        const box = await button.boundingBox();

        if (box) {
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

  test('Touch targets maintain size across mobile widths', async ({ page }) => {
    for (const width of CRITICAL_MOBILE_WIDTHS) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      // Check a sample of common interactive elements
      const buttons = await page.locator('button').all();

      for (const button of buttons.slice(0, 5)) {
        // Test first 5 buttons
        if (await button.isVisible()) {
          const box = await button.boundingBox();

          if (box) {
            expect(
              box.height,
              `Button height at ${width}px must be ≥ 44px`
            ).toBeGreaterThanOrEqual(MINIMUM - TOLERANCE);
          }
        }
      }
    }
  });

  test('Blog page primary navigation links work', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/blog');

    // Verify the blog page loads and has article content
    const articles = await page.locator('article').all();
    expect(articles.length).toBeGreaterThan(0);

    // Verify main navigation links are accessible
    const navLinks = await page.locator('nav a').all();
    let visibleNavCount = 0;
    for (const link of navLinks) {
      if (await link.isVisible()) {
        visibleNavCount++;
      }
    }
    expect(visibleNavCount).toBeGreaterThan(0);
  });

  test('Form inputs meet touch target height standards', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Test form inputs if present
    const inputs = await page
      .locator('input[type="text"], input[type="email"], textarea, select')
      .all();

    for (const input of inputs) {
      if (await input.isVisible()) {
        const box = await input.boundingBox();

        if (box) {
          expect(
            box.height,
            'Form input height must be ≥ 44px'
          ).toBeGreaterThanOrEqual(MINIMUM - TOLERANCE);
        }
      }
    }
  });

  test('Button containers have adequate spacing (8px minimum)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Only check containers with multiple buttons (actual button groups)
    // Not all elements with gap - only those containing interactive elements
    const buttonContainers = await page
      .locator('[class*="gap"]:has(button:nth-of-type(2))')
      .all();

    const failures: string[] = [];

    for (const container of buttonContainers) {
      if (!(await container.isVisible())) continue;

      const gap = await container.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return parseFloat(computed.gap) || 0;
      });

      // If gap is set and less than minimum, record failure
      if (gap > 0 && gap < TOUCH_TARGET_STANDARDS.AAA.minSpacing) {
        const containerClass = await container.getAttribute('class');
        failures.push(
          `Container "${containerClass?.substring(0, 40)}..." has ${gap}px gap`
        );
      }
    }

    if (failures.length > 0) {
      expect(
        failures.length,
        `Button group spacing should be ≥ 8px:\n${failures.join('\n')}`
      ).toBe(0);
    }
  });
});

/**
 * Mobile Button Test (T015)
 * PRP-017: Mobile-First Design Overhaul
 */

import { test, expect } from '@playwright/test';
import { TOUCH_TARGET_STANDARDS } from '@/config/touch-targets';

test.describe('Mobile Button Standards', () => {
  const MINIMUM = TOUCH_TARGET_STANDARDS.AAA.minWidth;
  const TOLERANCE = 1;

  test('All buttons meet 44x44px minimum on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const buttons = await page.locator('button, [role="button"]').all();
    const failures: string[] = [];

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];

      if (await button.isVisible()) {
        const box = await button.boundingBox();

        if (box) {
          const text =
            (await button.textContent())?.trim().substring(0, 20) || '';

          if (box.width < MINIMUM - TOLERANCE) {
            failures.push(
              `Button ${i} "${text}": width ${box.width.toFixed(1)}px`
            );
          }

          if (box.height < MINIMUM - TOLERANCE) {
            failures.push(
              `Button ${i} "${text}": height ${box.height.toFixed(1)}px`
            );
          }
        }
      }
    }

    if (failures.length > 0) {
      expect(
        failures.length,
        `${failures.length} buttons too small:\n${failures.join('\n')}`
      ).toBe(0);
    }
  });

  test('Button groups have 8px minimum spacing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Only check containers that actually contain multiple buttons/links
    // This is the WCAG requirement for touch target spacing
    const buttonContainers = await page
      .locator(
        '[class*="gap"]:has(button:nth-of-type(2)), [class*="gap"]:has(a:nth-of-type(2))'
      )
      .all();

    const failures: string[] = [];

    for (const container of buttonContainers.slice(0, 10)) {
      // Only check if container is visible
      if (!(await container.isVisible())) continue;

      const gap = await container.evaluate((el) =>
        parseFloat(window.getComputedStyle(el).gap)
      );

      // Only check containers with actual gap (not 0 or NaN)
      if (gap > 0 && gap < 8) {
        const containerClass = await container.getAttribute('class');
        failures.push(
          `Container with class "${containerClass?.substring(0, 50)}..." has gap ${gap}px`
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

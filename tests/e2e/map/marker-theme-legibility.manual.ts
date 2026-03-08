/**
 * Map marker legibility — 3-theme screenshot capture
 *
 * Navigates the AllMarkerVariants Storybook story under three DaisyUI
 * themes and saves a full-viewport screenshot for each. These are
 * MANUAL-REVIEW screenshots (no pixel-match assertions) — open the
 * saved PNGs and confirm all six marker variants stand out clearly
 * against the map tile background.
 *
 * Prerequisite: Storybook must be running on port 6006.
 *   docker compose exec -d spoketowork pnpm run storybook
 *
 * Run (uses dedicated no-webServer config):
 *   docker compose exec spoketowork pnpm exec playwright test \
 *     --config=tests/e2e/map/marker-theme-legibility.config.ts
 *
 * Output:
 *   tests/e2e/map/__screenshots__/markers-<theme>.png
 */

import { test } from '@playwright/test';
import * as path from 'path';

const STORYBOOK_URL = process.env.STORYBOOK_URL || 'http://localhost:6006';
const THEMES = ['spoketowork-light', 'spoketowork-dark', 'cupcake'] as const;
const STORY_ID = 'features-map-mapcontainer--all-marker-variants';
const OUT_DIR = path.join(__dirname, '__screenshots__');

test.describe('Map marker legibility across themes', () => {
  for (const theme of THEMES) {
    test(`markers read against tiles — ${theme}`, async ({ page }) => {
      // Storybook's withThemeByDataAttribute decorator reads the
      // `theme` global and sets data-theme on <html>, which cascades
      // DaisyUI's --color-* vars → marker bg-* classes update live.
      await page.goto(
        `${STORYBOOK_URL}/iframe.html?id=${STORY_ID}&globals=theme:${theme}&viewMode=story`
      );

      // Wait for MapLibre canvas to mount & become visible.
      await page.waitForSelector('.maplibregl-canvas', {
        state: 'visible',
        timeout: 30_000,
      });

      // Wait for tile network activity to settle. MapLibre fetches
      // vector tiles asynchronously after the canvas mounts.
      await page.waitForLoadState('networkidle');

      // Brief settle for tile fade-in animation (MapLibre default 300ms).
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: path.join(OUT_DIR, `markers-${theme}.png`),
        fullPage: false,
      });
    });
  }
});

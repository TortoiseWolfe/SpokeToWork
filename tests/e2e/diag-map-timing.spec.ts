/**
 * Throwaway diagnostic (never merge). Logs how many milliseconds after
 * navigation each map signal appears, as TIMING lines, so a run on Playwright
 * 1.57 can be compared with one on 1.65.
 */
import { test } from './fixtures/test';
import type { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function probe(page: Page, label: string) {
  const t0 = Date.now();
  const seen: Record<string, number> = {};
  const marks: string[] = [];
  for (let i = 0; i < 400; i++) {
    const s = await page
      .evaluate(() => {
        const m = (window as any).maplibreMap;
        const map = m?.getMap?.() ?? m;
        if (!map) return null;
        let layers: any[] = [];
        let hasAll = false;
        try {
          layers = map.getStyle()?.layers ?? [];
          hasAll = !!map.getSource('all-bike-routes');
        } catch {
          return null;
        }
        const routeLayers = layers.filter(
          (l: any) =>
            l.id.startsWith('route-') &&
            !l.id.includes('-glow') &&
            !l.id.includes('-dash') &&
            l.type === 'line'
        );
        return {
          canvas: !!document.querySelector('.maplibregl-canvas'),
          layers: layers.length,
          allSource: hasAll,
          allLayer: layers.some((l: any) => l.id === 'all-bike-routes'),
          routeLayers: routeLayers.length,
          wide: routeLayers.some(
            (l: any) => l.paint?.['line-width'] === 10
          ),
        };
      })
      .catch(() => null);
    const el = Date.now() - t0;
    if (s) {
      if (s.canvas && seen.canvas === undefined) seen.canvas = el;
      if (s.layers > 0 && seen.styleLayers === undefined)
        seen.styleLayers = el;
      if (s.allSource && seen.allSource === undefined) seen.allSource = el;
      if (s.allLayer && seen.allLayer === undefined) seen.allLayer = el;
      if (s.routeLayers > 0 && seen.routeLayer === undefined)
        seen.routeLayer = el;
      if (s.wide && seen.wide === undefined) seen.wide = el;
    }
    if (seen.allLayer !== undefined && seen.wide !== undefined) break;
    if (el > 30000) break;
    await page.waitForTimeout(50);
  }
  marks.push(label, JSON.stringify(seen));
  console.log('TIMING', ...marks);
}

test.describe('diag map timing', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('map page', async ({ page }) => {
    await page.goto(`${BASE_URL}/map`);
    await probe(page, 'map');
  });

  test('companies page', async ({ page }) => {
    await page.goto(`${BASE_URL}/companies`);
    await probe(page, 'companies');
  });
});

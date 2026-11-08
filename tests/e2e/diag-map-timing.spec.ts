/**
 * Throwaway diagnostic (never merge). Logs how many milliseconds after
 * navigation each map signal appears, as TIMING lines. When the active route's
 * wide line never shows, logs NOWIDE with the route and sign-in calls and the
 * console messages seen during that load.
 */
import { test } from './fixtures/test';
import type { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WATCH = /active_route_planning|bicycle_routes|auth\/v1/;

function watch(page: Page, t0: number) {
  const net: string[] = [];
  const cons: string[] = [];
  const short = (u: string) => u.split('?')[0].split('/').slice(-2).join('/');
  page.on('response', (r) => {
    if (WATCH.test(r.url())) {
      const idx = net.length;
      net.push(`${Date.now() - t0}ms ${r.status()} ${short(r.url())}`);
      if (/active_route_planning/.test(r.url())) {
        r.text()
          .then((b) => {
            let rid = 'unparsed';
            try {
              const j = JSON.parse(b);
              rid = String(j?.route_id ?? (Array.isArray(j) ? `array${j.length}` : 'none'));
            } catch {
              rid = `body:${b.slice(0, 40)}`;
            }
            net[idx] += ` route_id=${rid}`;
          })
          .catch(() => {
            net[idx] += ' body-unreadable';
          });
      }
    }
  });
  page.on('requestfailed', (r) => {
    if (WATCH.test(r.url()))
      net.push(
        `${Date.now() - t0}ms FAILED ${r.failure()?.errorText} ${short(r.url())}`
      );
  });
  page.on('console', (m) => {
    const t = m.text();
    if (/route|auth|session|token/i.test(t) && m.type() !== 'log')
      cons.push(`${Date.now() - t0}ms ${m.type()} ${t.slice(0, 200)}`);
  });
  return { net, cons };
}

async function probe(
  page: Page,
  label: string,
  t0: number,
  log: { net: string[]; cons: string[] }
) {
  const seen: Record<string, number> = {};
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
          wide: routeLayers.some((l: any) => l.paint?.['line-width'] === 10),
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
    if (el > 20000) break;
    await page.waitForTimeout(50);
  }
  console.log('TIMING', label, JSON.stringify(seen));
  if (seen.wide === undefined) {
    const end = await page
      .evaluate(() => {
        const m = (window as any).maplibreMap;
        const map = m?.getMap?.() ?? m;
        if (!map) return 'nomap';
        const layers = map.getStyle()?.layers ?? [];
        return {
          styleLoaded: map.isStyleLoaded(),
          layers: layers
            .filter((l: any) => l.id.startsWith('route-'))
            .map(
              (l: any) =>
                `${l.id}|style=${l.paint?.['line-width']}|live=${map.getPaintProperty(l.id, 'line-width')}`
            ),
        };
      })
      .catch((e) => `evalfail ${String(e).slice(0, 80)}`);
    console.log('NOWIDE', label, JSON.stringify(log), 'END', JSON.stringify(end));
  }
}

test.describe('diag map timing', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('map page', async ({ page }) => {
    const t0 = Date.now();
    const log = watch(page, t0);
    await page.goto(`${BASE_URL}/map`);
    await probe(page, 'map', t0, log);
  });

  test('companies page', async ({ page }) => {
    const t0 = Date.now();
    const log = watch(page, t0);
    await page.goto(`${BASE_URL}/companies`);
    await probe(page, 'companies', t0, log);
  });
});

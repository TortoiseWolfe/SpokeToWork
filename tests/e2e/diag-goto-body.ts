// THROWAWAY (diag branch only): shared body for the raw-vs-fixture goto comparison.
import { expect, type Page, type Test } from './diag-types';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ID = '4fe9f00a-f1d4-416a-9e23-4f7fb9807ffc';

export function defineCases(test: Test, tag: string, expectWaits: boolean) {
  test.describe(`goto cases (${tag})`, () => {
    test.setTimeout(400000);

    test(`G ${tag}: busy messages page, move on 800 ms after load`, async ({
      page,
    }) => {
      let failures = 0;
      const messages: string[] = [];
      const rounds = 60;
      for (let i = 0; i < rounds; i++) {
        try {
          await page.goto(`${BASE}/messages?conversation=${ID}`, {
            waitUntil: 'load',
            timeout: 20000,
          });
        } catch (e) {
          failures++;
          messages.push(`round ${i}: ${String(e).split('\n')[0]}`);
        }
        await page.waitForTimeout(800);
      }
      console.log(
        `DIAG G ${tag}: ${failures}/${rounds} failed; ${messages.join(' | ')}`
      );
      expect(failures).toBe(0);
    });

    test(`C ${tag}: blog back to back, no gap`, async ({ page }) => {
      let failures = 0;
      const messages: string[] = [];
      const rounds = 80;
      for (let i = 0; i < rounds; i++) {
        try {
          await page.goto(`${BASE}/blog?x=1`, {
            waitUntil: 'load',
            timeout: 20000,
          });
        } catch (e) {
          failures++;
          messages.push(`round ${i}: ${String(e).split('\n')[0]}`);
        }
      }
      console.log(
        `DIAG C ${tag}: ${failures}/${rounds} failed; ${messages.join(' | ')}`
      );
      expect(failures).toBe(0);
    });

    test(`M ${tag}: goto waits for a call still in flight`, async ({
      page,
    }) => {
      await page.route('**/diag-slow-probe*', async (route) => {
        await new Promise((r) => setTimeout(r, 1500));
        await route.fulfill({ status: 200, body: 'ok' });
      });
      await page.goto(`${BASE}/blog/`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(700); // networkidle has fired; page now "quiet" by lifecycle
      let probeEnd = 0;
      let nextNavStart = 0;
      page.on('requestfinished', (r) => {
        if (r.url().includes('diag-slow-probe')) probeEnd = Date.now();
      });
      page.on('request', (r) => {
        if (r.isNavigationRequest() && r.url().includes('/messages'))
          nextNavStart = Date.now();
      });
      await page.evaluate(() => {
        void fetch('/diag-slow-probe?x=1');
      });
      await page.goto(`${BASE}/messages?conversation=${ID}`);
      console.log(
        `DIAG M ${tag}: probeEnd=${probeEnd} navStart=${nextNavStart} probeFinishedBeforeNav=${probeEnd > 0 && probeEnd <= nextNavStart}`
      );
      if (expectWaits) {
        expect(probeEnd).toBeGreaterThan(0);
        expect(probeEnd).toBeLessThanOrEqual(nextNavStart);
      }
    });
  });
}

export type { Page };

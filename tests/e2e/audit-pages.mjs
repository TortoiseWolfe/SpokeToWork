import { chromium } from '/app/node_modules/.pnpm/@playwright+test@1.57.0/node_modules/playwright/index.mjs';
import * as fs from 'fs';

const AXE_SOURCE = fs.readFileSync(
  '/app/node_modules/.pnpm/axe-core@4.10.3/node_modules/axe-core/axe.min.js',
  'utf-8'
);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  colorScheme: 'dark',  // Ensure spoketowork-dark theme is applied via ThemeScript
});

const pages = [
  { name: 'landing', path: '/' },
  { name: 'map', path: '/map' },
  { name: 'messages', path: '/messages' },
  { name: 'signin', path: '/sign-in' },
  { name: 'signup', path: '/sign-up' },
  { name: 'forgot-password', path: '/forgot-password' },
  { name: 'blog', path: '/blog' },
  { name: 'blog-tags', path: '/blog/tags' },
  { name: 'schedule', path: '/schedule' },
  { name: 'status', path: '/status' },
];

for (const p of pages) {
  try {
    await page.goto(`http://localhost:3000${p.path}`, { timeout: 10000, waitUntil: 'load' });
    await page.waitForTimeout(1000);

    // Screenshot desktop
    await page.screenshot({ path: `/app/test-results/page-${p.name}-desktop.png`, fullPage: true });

    // Screenshot mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `/app/test-results/page-${p.name}-mobile.png`, fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });

    // Contrast check
    await page.addScriptTag({ content: AXE_SOURCE });
    const results = await Promise.race([
      page.evaluate(() => {
        return window.axe.run(document, {
          runOnly: { type: 'rule', values: ['color-contrast', 'color-contrast-enhanced'] },
          resultTypes: ['violations'],
        }).then(r => r.violations.map(v => ({
          id: v.id,
          count: v.nodes.length,
          nodes: v.nodes.slice(0, 3).map(n => ({
            html: n.html?.slice(0, 80),
            data: n.any?.[0]?.data || {},
          })),
        })));
      }),
      new Promise(resolve => setTimeout(() => resolve([]), 8000))
    ]);

    console.log(`\n${p.name} (${p.path}):`);
    if (results.length === 0) {
      console.log('  Contrast: PASS');
    } else {
      for (const v of results) {
        console.log(`  ${v.id} (${v.count} elements):`);
        for (const n of v.nodes) {
          console.log(`    ${n.data.fgColor} on ${n.data.bgColor} (${n.data.contrastRatio?.toFixed(2)}:1)`);
          console.log(`      ${n.html}`);
        }
      }
    }
    console.log(`  Screenshots: page-${p.name}-desktop.png, page-${p.name}-mobile.png`);
  } catch (err) {
    console.log(`\n${p.name}: ERROR — ${err.message.slice(0, 80)}`);
  }
}

await browser.close();

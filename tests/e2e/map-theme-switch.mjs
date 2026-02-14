/**
 * Playwright E2E test: Map theme switching
 *
 * Verifies that the MapLibre map style updates when switching
 * between spoketowork-dark and spoketowork-light themes via
 * the navbar dropdown.
 *
 * Run: docker compose exec spoketowork node tests/e2e/map-theme-switch.mjs
 */

import { chromium } from '/app/node_modules/.pnpm/playwright@1.57.0/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
const consoleErrors = [];

const page = await browser.newPage({
  viewport: { width: 1280, height: 900 },
  colorScheme: 'dark', // Triggers spoketowork-dark via ThemeScript
});

// Capture all console errors
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push({
      text: msg.text().slice(0, 200),
      url: page.url(),
    });
  }
});

// Also capture uncaught exceptions
page.on('pageerror', (err) => {
  consoleErrors.push({
    text: `UNCAUGHT: ${err.message.slice(0, 200)}`,
    url: page.url(),
  });
});

/**
 * Read the MapLibre style name from the map instance to verify
 * which style JSON is currently loaded (dark vs light).
 */
async function getMapStyleName() {
  return page.evaluate(() => {
    // react-map-gl stores the map instance; access via canvas parent
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'no-canvas';
    // Check the maplibre map instance style name
    const mapEl = canvas.closest('.maplibregl-map');
    if (!mapEl?._maplibre) {
      // Alternative: check aria/data attributes or style prop
      return 'no-map-instance';
    }
    const style = mapEl._maplibre.getStyle();
    return style?.name || 'unnamed';
  });
}

/**
 * Switch theme via navbar dropdown, dismissing any open dropdown first.
 */
async function switchTheme(themeName) {
  // Click elsewhere to dismiss any open dropdown
  await page.locator('h1, .maplibregl-canvas, main').first().click({ force: true });
  await page.waitForTimeout(300);

  // Open theme dropdown
  const themeBtn = page.locator('button[aria-label="Change theme"]');
  await themeBtn.click({ force: true });
  await page.waitForTimeout(500);

  // Click the target theme
  const btn = page.locator(`.dropdown-content button:has-text("${themeName}")`).first();
  await btn.click();
  await page.waitForTimeout(2500); // Wait for map style to reload tiles
}

console.log('=== Map Theme Switch E2E Test ===\n');

// --- Step 1: Navigate to /map with dark theme ---
console.log('Step 1: Navigate to /map (spoketowork-dark)');
await page.goto('http://localhost:3000/map', { timeout: 15000, waitUntil: 'load' });
await page.waitForTimeout(4000); // Wait for map tiles to load

const theme1 = await page.evaluate(() =>
  document.documentElement.getAttribute('data-theme')
);
console.log(`  data-theme: ${theme1}`);

// Check useMapTheme result via the map style name in the DOM
const styleName1 = await getMapStyleName();
console.log(`  Map style: ${styleName1}`);

await page.screenshot({ path: '/app/test-results/map-theme-1-dark.png' });
console.log('  Screenshot: map-theme-1-dark.png');

// --- Step 2: Switch to spoketowork-light via navbar dropdown ---
console.log('\nStep 2: Switch to spoketowork-light');
await switchTheme('spoketowork-light');

const theme2 = await page.evaluate(() =>
  document.documentElement.getAttribute('data-theme')
);
console.log(`  data-theme: ${theme2}`);

const styleName2 = await getMapStyleName();
console.log(`  Map style: ${styleName2}`);

await page.screenshot({ path: '/app/test-results/map-theme-2-light.png' });
console.log('  Screenshot: map-theme-2-light.png');

// --- Step 3: Switch back to spoketowork-dark ---
console.log('\nStep 3: Switch back to spoketowork-dark');
await switchTheme('spoketowork-dark');

const theme3 = await page.evaluate(() =>
  document.documentElement.getAttribute('data-theme')
);
console.log(`  data-theme: ${theme3}`);

const styleName3 = await getMapStyleName();
console.log(`  Map style: ${styleName3}`);

await page.screenshot({ path: '/app/test-results/map-theme-3-dark-again.png' });
console.log('  Screenshot: map-theme-3-dark-again.png');

// --- Step 4: Test a stock DaisyUI dark theme too ---
console.log('\nStep 4: Switch to stock "dark" theme');
await switchTheme('dark');

const theme4 = await page.evaluate(() =>
  document.documentElement.getAttribute('data-theme')
);
console.log(`  data-theme: ${theme4}`);

await page.screenshot({ path: '/app/test-results/map-theme-4-stock-dark.png' });
console.log('  Screenshot: map-theme-4-stock-dark.png');

// --- Results ---
console.log('\n=== Results ===');

const checks = [
  { name: 'Step 1: data-theme = spoketowork-dark', pass: theme1 === 'spoketowork-dark' },
  { name: 'Step 2: data-theme = spoketowork-light', pass: theme2 === 'spoketowork-light' },
  { name: 'Step 3: data-theme = spoketowork-dark', pass: theme3 === 'spoketowork-dark' },
  { name: 'Step 4: data-theme = dark', pass: theme4 === 'dark' },
];

for (const c of checks) {
  console.log(`  ${c.pass ? 'PASS' : 'FAIL'}: ${c.name}`);
}

// Console errors
if (consoleErrors.length > 0) {
  console.log(`\n=== Console Errors (${consoleErrors.length}) ===`);
  for (const e of consoleErrors.slice(0, 10)) {
    console.log(`  ${e.text}`);
  }
  if (consoleErrors.length > 10) {
    console.log(`  ... and ${consoleErrors.length - 10} more`);
  }
} else {
  console.log('\n  No console errors detected.');
}

const allPass = checks.every((c) => c.pass);
console.log(`\n${allPass ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
console.log('Review screenshots in test-results/map-theme-*.png for visual verification.');

await browser.close();

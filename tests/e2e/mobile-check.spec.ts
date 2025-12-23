import { test, devices, BrowserContextOptions } from '@playwright/test';

// Helper to extract only viewport/touch settings, not defaultBrowserType
function getDeviceConfig(
  device: (typeof devices)[keyof typeof devices]
): BrowserContextOptions {
  return {
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    isMobile: device.isMobile,
    hasTouch: device.hasTouch,
    userAgent: device.userAgent,
  };
}

test('mobile status check', async ({ browser }) => {
  const context = await browser.newContext(
    getDeviceConfig(devices['iPhone 12'])
  );
  const page = await context.newPage();
  await page.goto('http://localhost:3000/status');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: 'mobile-check.png',
    fullPage: true,
  });
  await context.close();
});

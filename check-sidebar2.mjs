import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

// Go to login page
await page.goto('http://localhost:3000/sign-in');
await page.waitForLoadState('networkidle');

// Handle cookie consent if present
try {
  const acceptButton = page.getByRole('button', { name: 'Accept All' });
  if (await acceptButton.isVisible({ timeout: 2000 })) {
    await acceptButton.click();
    await page.waitForTimeout(300);
  }
} catch (e) {}

// Fill in credentials
await page.fill('#email', 'JonPohlner@gmail.com');
await page.fill('#password', 'YOoKoeKHsySKSEtFFBkmAjnQSrNpgvoP');

// Click sign in
await page.getByRole('button', { name: 'Sign In' }).click({ force: true });

// Wait for login redirect
await page.waitForURL(/.*\/profile/, { timeout: 15000 });
console.log('Logged in successfully');

// Navigate to companies page
await page.goto('http://localhost:3000/companies');
await page.waitForTimeout(5000);

// Take screenshot of left 400px (sidebar area)
await page.screenshot({
  path: '/app/debug-sidebar-left.png',
  clip: { x: 0, y: 0, width: 400, height: 800 },
});
console.log('Sidebar screenshot saved');

// Also take full screenshot
await page.screenshot({ path: '/app/debug-full.png' });
console.log('Full screenshot saved');

await browser.close();

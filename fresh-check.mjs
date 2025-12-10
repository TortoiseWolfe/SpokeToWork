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

// Wait and take multiple screenshots to see state over time
await page.waitForTimeout(2000);
await page.screenshot({
  path: '/app/check-2sec.png',
  clip: { x: 0, y: 0, width: 400, height: 800 },
});
console.log('Screenshot at 2 seconds');

await page.waitForTimeout(3000);
await page.screenshot({
  path: '/app/check-5sec.png',
  clip: { x: 0, y: 0, width: 400, height: 800 },
});
console.log('Screenshot at 5 seconds');

await page.waitForTimeout(5000);
await page.screenshot({
  path: '/app/check-10sec.png',
  clip: { x: 0, y: 0, width: 400, height: 800 },
});
console.log('Screenshot at 10 seconds');

// Check for spinner element
const spinner = await page.locator('.loading-spinner, .loading').count();
console.log('Spinner elements found:', spinner);

// Check sidebar content
const sidebarText = await page.locator('aside').first().textContent();
console.log('Sidebar content:', sidebarText?.substring(0, 200));

await browser.close();

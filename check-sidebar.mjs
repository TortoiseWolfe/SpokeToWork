import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage();

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

// Take screenshot
await page.screenshot({ path: '/app/debug-sidebar.png', fullPage: true });
console.log('Screenshot saved to debug-sidebar.png');

await browser.close();

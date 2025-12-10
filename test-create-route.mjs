import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

// Login
await page.goto('http://localhost:3000/sign-in');
await page.waitForLoadState('networkidle');
try {
  const acceptButton = page.getByRole('button', { name: 'Accept All' });
  if (await acceptButton.isVisible({ timeout: 2000 })) {
    await acceptButton.click();
  }
} catch (e) {}
await page.fill('#email', 'JonPohlner@gmail.com');
await page.fill('#password', 'YOoKoeKHsySKSEtFFBkmAjnQSrNpgvoP');
await page.getByRole('button', { name: 'Sign In' }).click({ force: true });
await page.waitForURL(/.*\/profile/, { timeout: 15000 });
console.log('Logged in');

// Go to companies
await page.goto('http://localhost:3000/companies');
await page.waitForTimeout(3000);

// Click New button
const newButton = page.locator('aside button:has-text("New")');
await newButton.click();
await page.waitForTimeout(1000);

// Fill in route name
await page.fill('#name', 'Test Route via E2E');
await page.waitForTimeout(500);

// Click Create Route button
console.log('Clicking Create Route...');
await page.getByRole('button', { name: 'Create Route' }).click();
await page.waitForTimeout(3000);

// Take screenshot to see result
await page.screenshot({ path: '/app/after-create-route.png' });
console.log('Screenshot saved');

// Check console for errors
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    console.log('Console error:', msg.text());
  }
});

await browser.close();

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

// Click the New button in sidebar
console.log('Looking for New button...');
const newButton = page.locator('aside button:has-text("New")');
if (await newButton.isVisible()) {
  console.log('Found New button, clicking...');
  await newButton.click();
  await page.waitForTimeout(2000);

  // Screenshot after clicking
  await page.screenshot({ path: '/app/after-new-click.png' });
  console.log('Screenshot saved after clicking New');
} else {
  console.log('New button not found');
  await page.screenshot({ path: '/app/no-new-button.png' });
}

await browser.close();

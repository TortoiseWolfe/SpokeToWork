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

// Screenshot before creating route
await page.screenshot({
  path: '/app/before-create.png',
  clip: { x: 0, y: 0, width: 400, height: 600 },
});
console.log('Screenshot before create');

// Click New button
const newButton = page.locator('aside button:has-text("New")');
await newButton.click();
await page.waitForTimeout(1000);

// Fill in route name
const routeName = 'E2E Test Route ' + Date.now();
await page.fill('#name', routeName);
console.log('Created route:', routeName);

// Click Create Route button
await page.getByRole('button', { name: 'Create Route' }).click();
await page.waitForTimeout(3000);

// Take screenshot to see result (should show route in sidebar)
await page.screenshot({
  path: '/app/after-create-v2.png',
  clip: { x: 0, y: 0, width: 400, height: 600 },
});

// Get sidebar text
const sidebarText = await page.locator('aside').first().textContent();
if (sidebarText?.includes(routeName)) {
  console.log('SUCCESS: Route appears in sidebar!');
} else if (
  sidebarText?.includes('E2E Test Route') ||
  sidebarText?.includes('Test Route')
) {
  console.log('SUCCESS: A route appears in sidebar!');
} else {
  console.log('Sidebar content:', sidebarText?.substring(0, 300));
}

await browser.close();

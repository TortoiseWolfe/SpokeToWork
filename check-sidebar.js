const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Go to login page
  await page.goto('http://localhost:3000/auth/signin');
  await page.waitForTimeout(2000);

  // Fill in credentials
  await page.fill('input[type="email"]', 'JonPohlner@gmail.com');
  await page.fill('input[type="password"]', 'YOoKoeKHsySKSEtFFBkmAjnQSrNpgvoP');

  // Click sign in
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForTimeout(5000);

  // Navigate to companies page
  await page.goto('http://localhost:3000/companies');
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({ path: '/app/debug-sidebar.png', fullPage: true });
  console.log('Screenshot saved');

  await browser.close();
})();

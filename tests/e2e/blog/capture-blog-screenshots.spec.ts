/**
 * E2E Test: Capture Screenshots for Blog Post
 *
 * This spec captures screenshots demonstrating the "Acme Corporation"
 * demo flow for the job seeker introduction blog post.
 *
 * Uses SECONDARY test user to ensure clean demo data (not personal account).
 * Creates 3 demo companies and 1 application, then cleans up after.
 *
 * Screenshots saved to: public/blog-images/getting-started-job-hunt-companion/
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(
  process.cwd(),
  'public/blog-images/getting-started-job-hunt-companion'
);

// Use SECONDARY test user for clean demo screenshots (not personal account with 83 companies)
const testEmail = process.env.TEST_USER_SECONDARY_EMAIL;
const testPassword = process.env.TEST_USER_SECONDARY_PASSWORD;

if (!testEmail || !testPassword) {
  throw new Error(
    'TEST_USER_SECONDARY_EMAIL and TEST_USER_SECONDARY_PASSWORD must be set in .env'
  );
}

const TEST_USER = { email: testEmail, password: testPassword };

// Acme Corporation demo data (using real geocodable address)
const ACME_COMPANY = {
  name: 'Acme Corporation',
  // Real address that can be geocoded (San Francisco)
  address: '123 Main Street, San Francisco, CA 94105',
  website: 'https://acme-corp.example.com',
  phone: '(555) 123-4567',
  contactName: 'Sarah Johnson',
  contactTitle: 'HR Manager',
  contactEmail: 'sarah.johnson@acme-corp.example.com',
  notes:
    'Spoke with Sarah at job fair on 12/10. She mentioned they are expanding the delivery team in January.',
};

const DELIVERY_APPLICATION = {
  position: 'Delivery Driver',
  dateApplied: '2025-12-14',
  status: 'applied',
};

test.describe('Blog Screenshot Capture', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Ensure screenshot directory exists
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }

    // Create context with desktop viewport for clear screenshots
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    page = await context.newPage();

    // Dismiss CountdownBanner before any navigation (prevents modal in screenshots)
    await page.addInitScript(() => {
      localStorage.setItem('countdown-dismissed', Date.now().toString());
    });

    // Sign in with SECONDARY test user (cleaner than primary account with 83 companies)
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect to profile or companies
    await page.waitForURL(/\/(profile|companies|account)/, { timeout: 15000 });

    console.log(
      '✅ Signed in as SECONDARY test user, CountdownBanner dismissed'
    );
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('1. Capture Add Company Form with Acme data', async () => {
    // Navigate to companies page
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Click Add Company button (toggles inline form, not modal)
    const addButton = page.locator('button:has-text("Add Company")');
    await addButton.click();

    // Wait for form to appear (inline form, not modal)
    await page.waitForTimeout(500);

    // Look for the CompanyForm - it has a card structure
    const formCard = page.locator('.card, form').first();

    // Fill in Acme Corporation data - look for form inputs
    const nameInput = page
      .locator('input[name="name"], #name, input[placeholder*="company"]')
      .first();
    if ((await nameInput.count()) > 0) {
      await nameInput.fill(ACME_COMPANY.name);
    }

    // Try to fill address field
    const addressInput = page.locator(
      'input[name="address"], input[placeholder*="address"], #address, input[placeholder*="Address"]'
    );
    if ((await addressInput.count()) > 0) {
      await addressInput.first().fill(ACME_COMPANY.address);

      // Click Geocode button to resolve address to coordinates
      const geocodeButton = page.locator('button:has-text("Geocode")');
      if (
        (await geocodeButton.count()) > 0 &&
        (await geocodeButton.first().isEnabled())
      ) {
        await geocodeButton.first().click();
        // Wait for geocoding to complete (loading spinner to disappear)
        await page.waitForTimeout(2000);
      }
    }

    // Fill website
    const websiteInput = page.locator(
      'input[name="website"], input[type="url"], #website, input[placeholder*="website"]'
    );
    if ((await websiteInput.count()) > 0) {
      await websiteInput.first().fill(ACME_COMPANY.website);
    }

    // Fill phone
    const phoneInput = page.locator(
      'input[name="phone"], input[type="tel"], #phone, input[placeholder*="phone"]'
    );
    if ((await phoneInput.count()) > 0) {
      await phoneInput.first().fill(ACME_COMPANY.phone);
    }

    // Fill contact info
    const contactNameInput = page.locator(
      'input[name="contactName"], input[name="contact_name"], #contactName, #contact-name, input[placeholder*="contact name"]'
    );
    if ((await contactNameInput.count()) > 0) {
      await contactNameInput.first().fill(ACME_COMPANY.contactName);
    }

    const contactTitleInput = page.locator(
      'input[name="contactTitle"], input[name="contact_title"], #contactTitle, #contact-title, input[placeholder*="title"]'
    );
    if ((await contactTitleInput.count()) > 0) {
      await contactTitleInput.first().fill(ACME_COMPANY.contactTitle);
    }

    const contactEmailInput = page.locator(
      'input[name="contactEmail"], input[name="contact_email"], #contactEmail, #contact-email, input[placeholder*="email"]'
    );
    if ((await contactEmailInput.count()) > 0) {
      await contactEmailInput.first().fill(ACME_COMPANY.contactEmail);
    }

    // Fill notes
    const notesInput = page.locator('textarea[name="notes"], #notes, textarea');
    if ((await notesInput.count()) > 0) {
      await notesInput.first().fill(ACME_COMPANY.notes);
    }

    // Wait a moment for form to settle
    await page.waitForTimeout(500);

    // Capture screenshot of the entire page showing the form
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'add-company-form.png'),
      fullPage: false,
    });

    console.log('✅ Captured: add-company-form.png');

    // Wait for geocoding to complete (address must be geocoded for submit to be enabled)
    // The submit button is disabled until coordinates are obtained
    await page.waitForTimeout(3000); // Allow time for geocoding API call

    // Actually submit the form to create the company for later tests
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Add Company"), button[type="submit"]:has-text("Save")'
    );

    // Check if submit button is enabled (coordinates obtained)
    const isEnabled = await submitButton
      .first()
      .isEnabled()
      .catch(() => false);
    if (isEnabled) {
      await submitButton.first().click();
      // Wait for form to close and company to be created
      await page.waitForTimeout(2000);
      console.log('✅ Created Acme Corporation for demo screenshots');
    } else {
      // Geocoding may have failed - cancel and skip company creation
      console.log(
        '⚠️ Submit button disabled (geocoding may have failed) - skipping company creation'
      );
      const cancelButton = page.locator('button:has-text("Cancel")');
      if ((await cancelButton.count()) > 0) {
        await cancelButton.first().click();
      }
    }

    await page.waitForTimeout(500);
  });

  test('2. Capture Companies List', async () => {
    // Navigate to companies page
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    await page.waitForSelector('[data-testid="company-table"]', {
      timeout: 10000,
    });

    // Wait a moment for any animations
    await page.waitForTimeout(500);

    // Capture the companies table area
    const tableArea = page.locator(
      '[data-testid="company-table"], .overflow-x-auto, main'
    );
    await tableArea.first().screenshot({
      path: path.join(SCREENSHOT_DIR, 'companies-list.png'),
    });

    console.log('✅ Captured: companies-list.png');
  });

  test('3. Capture Add Application Form', async () => {
    // Navigate to companies page
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');

    // Wait for table to load
    await page.waitForSelector('[data-testid="company-table"]', {
      timeout: 10000,
    });

    // Check if any companies exist
    const anyCompanyRow = page.locator('[data-testid^="company-row-"]');
    const companyCount = await anyCompanyRow.count();

    if (companyCount === 0) {
      console.log(
        '⚠️ No companies found - skipping Add Application Form screenshot'
      );
      console.log('   (Company creation may have failed due to geocoding)');
      return;
    }

    // Find and click on Acme Corporation row (or first company)
    const acmeRow = page.locator(
      '[data-testid^="company-row-"]:has-text("Acme")'
    );
    if ((await acmeRow.count()) > 0) {
      await acmeRow.first().click();
    } else {
      // Click first company row if Acme not found
      await anyCompanyRow.first().click();
    }

    // Wait for drawer to open
    await page.waitForSelector('[data-testid="company-detail-drawer"]', {
      timeout: 5000,
    });

    // Click Add Application button
    const addAppButton = page.locator(
      'button:has-text("Add Application"), [aria-label="Add application"]'
    );
    await addAppButton.first().click();

    // Wait for application modal
    await page.waitForSelector('.modal.modal-open', { timeout: 5000 });

    // Fill in application data
    const positionInput = page.locator(
      '#position-title, input[name="position"], input[name="positionTitle"]'
    );
    if ((await positionInput.count()) > 0) {
      await positionInput.first().fill(DELIVERY_APPLICATION.position);
    }

    // Set date applied
    const dateInput = page.locator(
      '#date-applied, input[name="dateApplied"], input[type="date"]'
    );
    if ((await dateInput.count()) > 0) {
      await dateInput.first().fill(DELIVERY_APPLICATION.dateApplied);
    }

    // Set status to Applied
    const statusSelect = page.locator('#status, select[name="status"]');
    if ((await statusSelect.count()) > 0) {
      await statusSelect.first().selectOption(DELIVERY_APPLICATION.status);
    }

    await page.waitForTimeout(500);

    // Capture the application form
    const modal = page.locator('.modal.modal-open');
    await modal.screenshot({
      path: path.join(SCREENSHOT_DIR, 'add-application.png'),
    });

    console.log('✅ Captured: add-application.png');

    // Cancel to avoid creating duplicate applications
    const cancelButton = page.locator('button:has-text("Cancel")');
    if ((await cancelButton.count()) > 0) {
      await cancelButton.first().click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  test('4. Capture Route Sidebar', async () => {
    // Navigate to companies page (routes sidebar should be visible on desktop)
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');

    // Wait for page to fully load
    await page.waitForTimeout(1000);

    // Look for route sidebar or routes section
    const routeSidebar = page.locator(
      '[data-testid="route-sidebar"], .route-sidebar, aside:has-text("Route")'
    );

    if ((await routeSidebar.count()) > 0) {
      await routeSidebar.first().screenshot({
        path: path.join(SCREENSHOT_DIR, 'route-sidebar.png'),
      });
      console.log('✅ Captured: route-sidebar.png');
    } else {
      // Try capturing the left sidebar area
      const sidebar = page.locator('aside, [role="complementary"]').first();
      if ((await sidebar.count()) > 0) {
        await sidebar.screenshot({
          path: path.join(SCREENSHOT_DIR, 'route-sidebar.png'),
        });
        console.log('✅ Captured: route-sidebar.png (sidebar area)');
      } else {
        console.log('⚠️ Route sidebar not found - skipping');
      }
    }
  });

  test('5. Capture Map View', async () => {
    // Navigate to map page
    await page.goto(`${BASE_URL}/map`);
    await page.waitForLoadState('networkidle');

    // Wait for map to load (Leaflet creates this element)
    await page.waitForSelector('.leaflet-container', { timeout: 15000 });

    // Wait for tiles to load
    await page.waitForTimeout(2000);

    // Capture full page map view
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'map-view.png'),
      fullPage: false,
    });

    console.log('✅ Captured: map-view.png');
  });

  test('6. Capture Blog Page Preview', async () => {
    // Navigate to the blog post to verify it renders
    await page.goto(`${BASE_URL}/blog/getting-started-job-hunt-companion`);
    await page.waitForLoadState('networkidle');

    // Wait for content
    await page.waitForTimeout(1000);

    // Check if page loaded (might show 404 if images missing)
    const heading = page.locator('h1');
    if ((await heading.count()) > 0) {
      console.log('✅ Blog post page loads correctly');
    } else {
      console.log('⚠️ Blog post may have issues loading');
    }

    // Also check blog listing
    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    // Capture blog listing
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'blog-listing-preview.png'),
      fullPage: false,
    });

    console.log('✅ Captured: blog-listing-preview.png');
  });

  test('7. Generate OG PNG from SVG', async () => {
    // Load the SVG file directly in browser to render it as PNG
    const svgPath = path.join(SCREENSHOT_DIR, 'featured-og.svg');

    if (!fs.existsSync(svgPath)) {
      console.log('⚠️ SVG not found, skipping PNG generation');
      return;
    }

    // Set viewport to exact OG image dimensions
    await page.setViewportSize({ width: 1200, height: 630 });

    // Load SVG file in browser
    await page.goto(`file://${svgPath}`);
    await page.waitForTimeout(500);

    // Capture as PNG
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'featured-og.png'),
      fullPage: false,
    });

    // Reset viewport for any subsequent tests
    await page.setViewportSize({ width: 1280, height: 800 });

    console.log('✅ Generated: featured-og.png (1200x630)');
  });

  test('8. Cleanup demo data', async () => {
    // Navigate to companies page
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');

    // Find and delete Acme Corporation
    const acmeRow = page.locator(
      '[data-testid^="company-row-"]:has-text("Acme")'
    );
    if ((await acmeRow.count()) > 0) {
      // Click on the row to open details drawer
      await acmeRow.first().click();
      await page.waitForTimeout(500);

      // Look for delete button in drawer
      const deleteButton = page.locator(
        'button:has-text("Delete"), button[aria-label="Delete company"]'
      );
      if ((await deleteButton.count()) > 0) {
        await deleteButton.first().click();
        // Confirm deletion if dialog appears
        const confirmButton = page.locator(
          'button:has-text("Confirm"), button:has-text("Yes"), .modal button:has-text("Delete")'
        );
        if ((await confirmButton.count()) > 0) {
          await confirmButton.first().click();
        }
        await page.waitForTimeout(1000);
        console.log('🧹 Cleaned up Acme Corporation demo company');
      } else {
        console.log(
          '⚠️ Delete button not found - manual cleanup may be needed'
        );
      }
    } else {
      console.log('ℹ️ No Acme company found to clean up');
    }
  });
});

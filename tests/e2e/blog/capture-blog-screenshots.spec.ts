/**
 * E2E Test: Capture Screenshots for Blog Post
 *
 * This spec captures screenshots demonstrating the job seeker flow
 * for the getting started blog post.
 *
 * Uses SECONDARY test user to ensure clean demo data.
 * Flow:
 * 1. Set home location (Community Kitchen - soup kitchen starting point)
 * 2. Add Chattanooga Public Library as a company
 * 3. Capture companies list, application form, route sidebar, map view
 * 4. Clean up demo data
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

// Use SECONDARY test user for clean demo screenshots
const testEmail = process.env.TEST_USER_SECONDARY_EMAIL;
const testPassword = process.env.TEST_USER_SECONDARY_PASSWORD;

if (!testEmail || !testPassword) {
  throw new Error(
    'TEST_USER_SECONDARY_EMAIL and TEST_USER_SECONDARY_PASSWORD must be set in .env'
  );
}

const TEST_USER = { email: testEmail, password: testPassword };

// Community Kitchen - soup kitchen as starting point (home location)
const HOME_LOCATION = {
  address: '727 E 11th St, Chattanooga, TN 37403',
  name: 'Community Kitchen',
};

// Chattanooga Public Library - main demo company
const LIBRARY_COMPANY = {
  name: 'Chattanooga Public Library',
  address: '1001 Broad St, Chattanooga, TN 37402',
  website: 'https://chattlibrary.org',
  phone: '(423) 757-5310',
  contactName: 'Human Resources',
  contactTitle: 'HR Department',
  contactEmail: 'jobs@chattlibrary.org',
  notes:
    'Saw job posting for Library Assistant position. Hours are flexible, good for someone rebuilding.',
};

const LIBRARY_APPLICATION = {
  position: 'Library Assistant',
  dateApplied: '2025-12-14',
  status: 'applied',
};

test.describe.serial('Blog Screenshot Capture', () => {
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

    // Dismiss CountdownBanner before any navigation
    await page.addInitScript(() => {
      localStorage.setItem('countdown-dismissed', Date.now().toString());
    });

    // Sign in with SECONDARY test user
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/(profile|companies|account)/, { timeout: 15000 });

    console.log('✅ Signed in as SECONDARY test user');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('1. Set Home Location (Community Kitchen)', async () => {
    // Navigate to companies page where HomeLocationSettings appears
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Look for the HomeLocationSettings component
    const homeLocationSettings = page.locator(
      '[data-testid="home-location-settings"]'
    );

    if ((await homeLocationSettings.count()) > 0) {
      // Fill in Community Kitchen address
      const addressInput = page.locator('#home-address');
      await addressInput.fill(HOME_LOCATION.address);

      // Click Geocode button
      const geocodeButton = page.locator(
        '[data-testid="home-location-settings"] button:has-text("Geocode")'
      );
      if ((await geocodeButton.count()) > 0) {
        await geocodeButton.click();
        // Wait for geocoding
        await page.waitForTimeout(3000);
      }

      // Click Save Home Location
      const saveButton = page.locator(
        'button:has-text("Save Home Location"), button:has-text("Save")'
      );
      if (
        (await saveButton.count()) > 0 &&
        (await saveButton.first().isEnabled())
      ) {
        await saveButton.first().click();
        await page.waitForTimeout(2000);
        console.log('✅ Set home location to Community Kitchen');
      } else {
        console.log(
          '⚠️ Could not save home location (geocoding may have failed)'
        );
      }
    } else {
      console.log('ℹ️ Home location already set or settings not visible');
    }

    // Reload to see updated state
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('2. Capture Add Company Form with Library data', async () => {
    // Navigate to companies page
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click Add Company button
    const addButton = page.locator('button:has-text("Add Company")');
    await addButton.click();
    await page.waitForTimeout(500);

    // Fill in Chattanooga Public Library data
    const nameInput = page
      .locator('input[name="name"], #name, input[placeholder*="company"]')
      .first();
    if ((await nameInput.count()) > 0) {
      await nameInput.fill(LIBRARY_COMPANY.name);
    }

    // Fill address
    const addressInput = page.locator(
      'input[name="address"], input[placeholder*="address"], #address'
    );
    if ((await addressInput.count()) > 0) {
      await addressInput.first().fill(LIBRARY_COMPANY.address);

      // Click Geocode button
      const geocodeButton = page.locator('button:has-text("Geocode")');
      if (
        (await geocodeButton.count()) > 0 &&
        (await geocodeButton.first().isEnabled())
      ) {
        await geocodeButton.first().click();
        await page.waitForTimeout(3000);
      }
    }

    // Fill website
    const websiteInput = page.locator(
      'input[name="website"], input[type="url"], #website'
    );
    if ((await websiteInput.count()) > 0) {
      await websiteInput.first().fill(LIBRARY_COMPANY.website);
    }

    // Fill phone
    const phoneInput = page.locator(
      'input[name="phone"], input[type="tel"], #phone'
    );
    if ((await phoneInput.count()) > 0) {
      await phoneInput.first().fill(LIBRARY_COMPANY.phone);
    }

    // Fill contact info
    const contactNameInput = page.locator(
      'input[name="contactName"], input[name="contact_name"], #contactName'
    );
    if ((await contactNameInput.count()) > 0) {
      await contactNameInput.first().fill(LIBRARY_COMPANY.contactName);
    }

    const contactTitleInput = page.locator(
      'input[name="contactTitle"], input[name="contact_title"], #contactTitle'
    );
    if ((await contactTitleInput.count()) > 0) {
      await contactTitleInput.first().fill(LIBRARY_COMPANY.contactTitle);
    }

    const contactEmailInput = page.locator(
      'input[name="contactEmail"], input[name="contact_email"], #contactEmail'
    );
    if ((await contactEmailInput.count()) > 0) {
      await contactEmailInput.first().fill(LIBRARY_COMPANY.contactEmail);
    }

    // Fill notes
    const notesInput = page.locator('textarea[name="notes"], #notes, textarea');
    if ((await notesInput.count()) > 0) {
      await notesInput.first().fill(LIBRARY_COMPANY.notes);
    }

    await page.waitForTimeout(500);

    // Capture screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'add-company-form.png'),
      fullPage: false,
    });

    console.log('✅ Captured: add-company-form.png');

    // Submit the form to create the company
    await page.waitForTimeout(2000);
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Add Company"), button[type="submit"]:has-text("Save")'
    );

    const isEnabled = await submitButton
      .first()
      .isEnabled()
      .catch(() => false);
    if (isEnabled) {
      await submitButton.first().click();
      await page.waitForTimeout(2000);
      console.log('✅ Created Chattanooga Public Library');
    } else {
      console.log('⚠️ Submit button disabled - skipping company creation');
      const cancelButton = page.locator('button:has-text("Cancel")');
      if ((await cancelButton.count()) > 0) {
        await cancelButton.first().click();
      }
    }
  });

  test('3. Capture Companies List', async () => {
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');

    // Wait for table
    await page.waitForSelector('[data-testid="company-table"]', {
      timeout: 10000,
    });
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

  test('4. Capture Add Application Form', async () => {
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('[data-testid="company-table"]', {
      timeout: 10000,
    });

    // Find and click on Library row
    const libraryRow = page.locator(
      '[data-testid^="company-row-"]:has-text("Library")'
    );
    const anyRow = page.locator('[data-testid^="company-row-"]');

    if ((await libraryRow.count()) > 0) {
      await libraryRow.first().click();
    } else if ((await anyRow.count()) > 0) {
      await anyRow.first().click();
    } else {
      console.log('⚠️ No companies found - skipping application screenshot');
      return;
    }

    // Wait for drawer
    await page.waitForSelector('[data-testid="company-detail-drawer"]', {
      timeout: 5000,
    });

    // Click Add Application
    const addAppButton = page.locator('button:has-text("Add Application")');
    await addAppButton.first().click();

    // Wait for modal
    await page.waitForSelector('.modal.modal-open', { timeout: 5000 });

    // Fill in application data
    const positionInput = page.locator(
      '#position-title, input[name="position"], input[name="positionTitle"]'
    );
    if ((await positionInput.count()) > 0) {
      await positionInput.first().fill(LIBRARY_APPLICATION.position);
    }

    const dateInput = page.locator(
      '#date-applied, input[name="dateApplied"], input[type="date"]'
    );
    if ((await dateInput.count()) > 0) {
      await dateInput.first().fill(LIBRARY_APPLICATION.dateApplied);
    }

    const statusSelect = page.locator('#status, select[name="status"]');
    if ((await statusSelect.count()) > 0) {
      await statusSelect.first().selectOption(LIBRARY_APPLICATION.status);
    }

    await page.waitForTimeout(500);

    // Capture the modal
    const modal = page.locator('.modal.modal-open');
    await modal.screenshot({
      path: path.join(SCREENSHOT_DIR, 'add-application.png'),
    });

    console.log('✅ Captured: add-application.png');

    // Cancel
    const cancelButton = page.locator('button:has-text("Cancel")');
    if ((await cancelButton.count()) > 0) {
      await cancelButton.first().click();
    } else {
      await page.keyboard.press('Escape');
    }
  });

  test('5. Capture Route Sidebar', async () => {
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const routeSidebar = page.locator(
      '[data-testid="route-sidebar"], .route-sidebar, aside:has-text("Route")'
    );

    if ((await routeSidebar.count()) > 0) {
      await routeSidebar.first().screenshot({
        path: path.join(SCREENSHOT_DIR, 'route-sidebar.png'),
      });
      console.log('✅ Captured: route-sidebar.png');
    } else {
      const sidebar = page.locator('aside, [role="complementary"]').first();
      if ((await sidebar.count()) > 0) {
        await sidebar.screenshot({
          path: path.join(SCREENSHOT_DIR, 'route-sidebar.png'),
        });
        console.log('✅ Captured: route-sidebar.png (sidebar area)');
      } else {
        console.log('⚠️ Route sidebar not found');
      }
    }
  });

  test('6. Capture Map View (Chattanooga)', async () => {
    await page.goto(`${BASE_URL}/map`);
    await page.waitForLoadState('networkidle');

    // Wait for map
    await page.waitForSelector('.leaflet-container', { timeout: 15000 });

    // Wait for tiles to load
    await page.waitForTimeout(3000);

    // The map should now center on Chattanooga based on home location
    // Take the screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'map-view.png'),
      fullPage: false,
    });

    console.log('✅ Captured: map-view.png');
  });

  test('7. Capture Blog Page Preview', async () => {
    await page.goto(`${BASE_URL}/blog/getting-started-job-hunt-companion`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const heading = page.locator('h1');
    if ((await heading.count()) > 0) {
      console.log('✅ Blog post page loads correctly');
    }

    await page.goto(`${BASE_URL}/blog`);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'blog-listing-preview.png'),
      fullPage: false,
    });

    console.log('✅ Captured: blog-listing-preview.png');
  });

  test('8. Generate OG PNG from SVG', async () => {
    const svgPath = path.join(SCREENSHOT_DIR, 'featured-og.svg');

    if (!fs.existsSync(svgPath)) {
      console.log('⚠️ SVG not found, skipping PNG generation');
      return;
    }

    await page.setViewportSize({ width: 1200, height: 630 });
    await page.goto(`file://${svgPath}`);
    await page.waitForTimeout(500);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'featured-og.png'),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1280, height: 800 });

    console.log('✅ Generated: featured-og.png (1200x630)');
  });

  test('9. Cleanup demo data', async () => {
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');

    // Delete Chattanooga Public Library if it exists
    const libraryRow = page.locator(
      '[data-testid^="company-row-"]:has-text("Library")'
    );
    if ((await libraryRow.count()) > 0) {
      await libraryRow.first().click();
      await page.waitForTimeout(500);

      const deleteButton = page.locator(
        'button:has-text("Delete"), button[aria-label="Delete company"]'
      );
      if ((await deleteButton.count()) > 0) {
        await deleteButton.first().click();
        const confirmButton = page.locator(
          'button:has-text("Confirm"), button:has-text("Yes"), .modal button:has-text("Delete")'
        );
        if ((await confirmButton.count()) > 0) {
          await confirmButton.first().click();
        }
        await page.waitForTimeout(1000);
        console.log('🧹 Cleaned up Library demo company');
      }
    } else {
      console.log('ℹ️ No Library company found to clean up');
    }
  });
});

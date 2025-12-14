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

import { test, type BrowserContext, type Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Supabase admin client for data cleanup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '⚠️ Supabase credentials not set - data cleanup will be skipped'
  );
}

let adminClient: SupabaseClient | null = null;
if (supabaseUrl && supabaseServiceKey) {
  adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
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
// Coordinates for Chattanooga, TN (pre-geocoded to avoid API rate limits)
const HOME_LOCATION = {
  address: '727 E 11th St, Chattanooga, TN 37403',
  name: 'Community Kitchen',
  latitude: 35.0456,
  longitude: -85.3097,
};

// Chattanooga Public Library - main demo company
// Pre-geocoded coordinates
const LIBRARY_COMPANY = {
  name: 'Chattanooga Public Library',
  address: '1001 Broad St, Chattanooga, TN 37402',
  latitude: 35.0551,
  longitude: -85.3094,
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

// Cookie consent state to dismiss the banner
// Method must match ConsentMethod enum value: 'banner_accept_all'
const COOKIE_CONSENT = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
  timestamp: Date.now(),
  version: '1.0.0',
  lastUpdated: Date.now(),
  method: 'banner_accept_all',
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

    // Set localStorage values BEFORE any navigation to dismiss modals/banners
    await page.addInitScript((cookieConsent) => {
      // Dismiss cookie consent banner
      localStorage.setItem('cookie-consent', JSON.stringify(cookieConsent));
      // Dismiss countdown banner
      localStorage.setItem('countdown-dismissed', Date.now().toString());
    }, COOKIE_CONSENT);

    // Mock geocoding API to return Chattanooga coordinates for ALL requests
    // This ensures maps show Chattanooga instead of defaulting to NYC
    await page.route('**/nominatim.openstreetmap.org/**', async (route) => {
      const url = route.request().url();
      console.log(
        `🗺️ Geocoding request intercepted: ${url.substring(0, 100)}...`
      );

      // Return Chattanooga Library coords for Library/1001 addresses
      if (url.includes('1001') || url.toLowerCase().includes('library')) {
        console.log('📍 Returning Library coords (35.0551, -85.3094)');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              lat: '35.0551',
              lon: '-85.3094',
              display_name:
                'Chattanooga Public Library, 1001 Broad St, Chattanooga, TN 37402',
            },
          ]),
        });
      } else {
        // Default to Community Kitchen coords for everything else
        console.log(
          '📍 Returning Community Kitchen coords (35.0456, -85.3097)'
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              lat: '35.0456',
              lon: '-85.3097',
              display_name:
                'Community Kitchen, 727 E 11th St, Chattanooga, TN 37403',
            },
          ]),
        });
      }
    });

    // Sign in with SECONDARY test user
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/(profile|companies|account)/, { timeout: 15000 });

    console.log('✅ Signed in as SECONDARY test user');

    // FLUSH ALL DATA for clean screenshots
    if (adminClient) {
      console.log('🧹 Flushing test user data for clean screenshots...');

      // Get user ID from auth.users
      const { data: authData } = await adminClient.auth.admin.listUsers();
      const user = authData?.users?.find((u) => u.email === TEST_USER.email);

      if (user) {
        const userId = user.id;

        // Delete private companies (user's personal companies)
        const { error: privateError, count: privateCount } = await adminClient
          .from('private_companies')
          .delete()
          .eq('user_id', userId);

        if (privateError) {
          console.log(
            `⚠️ Error deleting private companies: ${privateError.message}`
          );
        } else {
          console.log(`✅ Deleted private companies`);
        }

        // Delete user_company_tracking (links to shared companies)
        const { error: trackingError } = await adminClient
          .from('user_company_tracking')
          .delete()
          .eq('user_id', userId);

        if (trackingError) {
          console.log(
            `⚠️ Error deleting company tracking: ${trackingError.message}`
          );
        } else {
          console.log('✅ Deleted company tracking links');
        }

        // Delete from old companies table (legacy data)
        const { error: oldCompanyError } = await adminClient
          .from('companies')
          .delete()
          .eq('user_id', userId);

        if (oldCompanyError) {
          console.log(
            `⚠️ Error deleting old companies: ${oldCompanyError.message}`
          );
        } else {
          console.log('✅ Deleted old companies');
        }

        // Delete job applications
        const { error: appError } = await adminClient
          .from('job_applications')
          .delete()
          .eq('user_id', userId);

        if (appError) {
          console.log(`⚠️ Error deleting applications: ${appError.message}`);
        } else {
          console.log('✅ Deleted job applications');
        }

        // Delete routes and route_companies
        const { error: routeCompanyError } = await adminClient
          .from('route_companies')
          .delete()
          .eq('user_id', userId);

        if (!routeCompanyError) {
          console.log('✅ Deleted route companies');
        }

        const { error: routeError } = await adminClient
          .from('bicycle_routes')
          .delete()
          .eq('user_id', userId);

        if (routeError) {
          console.log(
            `⚠️ Error deleting bicycle routes: ${routeError.message}`
          );
        } else {
          console.log('✅ Deleted bicycle routes');
        }

        // Clear home location from user_profiles
        const { error: profileError } = await adminClient
          .from('user_profiles')
          .update({
            home_address: null,
            home_latitude: null,
            home_longitude: null,
            distance_radius_miles: null,
          })
          .eq('id', userId);

        if (profileError) {
          console.log(
            `⚠️ Error clearing home location: ${profileError.message}`
          );
        } else {
          console.log('✅ Cleared home location');
        }
      } else {
        console.log('⚠️ Could not find user - skipping cleanup');
      }

      console.log('🧹 Test user data flushed - ready for clean screenshots');
    }
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('1. Capture Home Location Settings', async () => {
    // Navigate to companies page
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click "Home Location" button to show the settings panel
    // (HomeLocationSettings is hidden by default, shown when button is clicked)
    const homeLocationButton = page.locator('button:has-text("Home Location")');
    if ((await homeLocationButton.count()) > 0) {
      await homeLocationButton.click();
      await page.waitForTimeout(500);
    }

    // Wait for the HomeLocationSettings component to appear
    const homeLocationSettings = page.locator(
      '[data-testid="home-location-settings"]'
    );
    await homeLocationSettings.waitFor({ state: 'visible', timeout: 5000 });

    // Fill in Community Kitchen address
    const addressInput = page.locator('#home-address');
    await addressInput.fill(HOME_LOCATION.address);

    // Click Geocode button FIRST - this updates the map to show Chattanooga
    const geocodeButton = page.locator(
      '[data-testid="home-location-settings"] button:has-text("Geocode")'
    );
    await geocodeButton.click();

    // Wait for geocoding to complete - the map should update from NYC to Chattanooga
    // The mock API returns Chattanooga coords, component should update map center
    await page.waitForTimeout(3000);

    // Verify coordinates updated (check for Chattanooga-ish coords in the label)
    const coordsLabel = page.locator(
      '[data-testid="home-location-settings"] .label-text-alt:has-text("Coordinates")'
    );
    if ((await coordsLabel.count()) > 0) {
      const coordsText = await coordsLabel.textContent();
      console.log(`📍 Geocoded coordinates: ${coordsText}`);
    }

    // NOW capture the screenshot - map should show Chattanooga, not NYC
    await homeLocationSettings.screenshot({
      path: path.join(SCREENSHOT_DIR, 'home-location-settings.png'),
    });
    console.log('✅ Captured: home-location-settings.png');

    // Save the home location
    const saveButton = page.locator('button:has-text("Save Home Location")');
    const isEnabled = await saveButton
      .first()
      .isEnabled()
      .catch(() => false);
    if (isEnabled) {
      await saveButton.first().click();
      await page.waitForTimeout(2000);
      console.log('✅ Set home location to Community Kitchen');
    } else {
      console.log('⚠️ Save button disabled - geocoding may have failed');
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
    if ((await addButton.count()) === 0) {
      console.log('⚠️ Add Company button not found');
      return;
    }
    await addButton.click();

    // Wait for form to appear - it's rendered as part of the page, not a modal
    await page.waitForTimeout(1000);

    // Wait for the address input to be visible (form is loaded)
    const addressInput = page.locator('#address');
    await addressInput.waitFor({ state: 'visible', timeout: 5000 });

    // Fill in company name first
    const nameInput = page.locator('#name');
    if ((await nameInput.count()) > 0) {
      await nameInput.fill(LIBRARY_COMPANY.name);
      console.log('✏️ Filled company name');
    }

    // Fill address - CRITICAL: must fill before geocode button becomes enabled
    await addressInput.fill(LIBRARY_COMPANY.address);
    console.log('✏️ Filled address');

    // Small delay for React state to update
    await page.waitForTimeout(500);

    // Click Geocode button - CRITICAL: This updates the map from default NYC to Chattanooga
    const geocodeButton = page.locator('button:has-text("Geocode")');
    const buttonCount = await geocodeButton.count();
    console.log(`🔘 Found ${buttonCount} Geocode button(s)`);

    if (buttonCount > 0) {
      const isEnabled = await geocodeButton.first().isEnabled();
      console.log(`🔘 Geocode button enabled: ${isEnabled}`);

      if (isEnabled) {
        await geocodeButton.first().click();
        console.log('🔘 Clicked Geocode button');

        // Wait for geocoding to complete (network request + state update)
        await page.waitForTimeout(3000);

        // Check if geocoding succeeded
        const submitBtn = page.locator(
          'button[type="submit"]:has-text("Add Company")'
        );
        const submitEnabled = await submitBtn.isEnabled().catch(() => false);
        console.log(`📍 Submit button enabled: ${submitEnabled}`);

        // Wait extra time for map tiles to load at new location
        await page.waitForTimeout(2000);
      } else {
        console.log('⚠️ Geocode button found but disabled');
      }
    } else {
      console.log('⚠️ Geocode button not found');
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

    // Capture screenshot - map should now show Chattanooga area, not NYC
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'add-company-form.png'),
      fullPage: false,
    });

    console.log('✅ Captured: add-company-form.png');

    // Try to submit the form
    await page.waitForTimeout(1000);
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Add Company"), button[type="submit"]:has-text("Save")'
    );

    const isEnabled = await submitButton
      .first()
      .isEnabled()
      .catch(() => false);
    if (isEnabled) {
      // Listen for console errors during submission
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Listen for network responses to catch API errors
      page.on('response', async (response) => {
        if (response.url().includes('supabase') && !response.ok()) {
          const text = await response
            .text()
            .catch(() => 'Unable to get response text');
          console.log(`❌ API Error: ${response.status()} - ${response.url()}`);
          console.log(`   Response: ${text.substring(0, 200)}`);
        }
      });

      await submitButton.first().click();
      console.log('🔄 Submitted company form, waiting for save...');

      // Wait for form to close and company to appear in list
      await page.waitForTimeout(3000);

      // Log any console errors
      if (consoleErrors.length > 0) {
        console.log('❌ Console errors during submission:');
        consoleErrors.forEach((err) =>
          console.log(`   ${err.substring(0, 200)}`)
        );
      }

      // Reload and verify the company was created
      await page.goto(`${BASE_URL}/companies`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check if Library appears
      const libraryRow = page.locator(
        '[data-testid^="company-row-"]:has-text("Library")'
      );
      const libraryCount = await libraryRow.count();
      console.log(`📋 Library rows found: ${libraryCount}`);

      if (libraryCount > 0) {
        console.log('✅ Created Chattanooga Public Library');
      } else {
        // Check total companies
        const allRows = page.locator('[data-testid^="company-row-"]');
        const totalCount = await allRows.count();
        console.log(
          `⚠️ Library not found, but ${totalCount} total companies exist`
        );
      }
    } else {
      console.log('⚠️ Submit button disabled - skipping company creation');
      const cancelButton = page.locator('button:has-text("Cancel")');
      if ((await cancelButton.count()) > 0) {
        await cancelButton.first().click();
      }
    }
  });

  test('3. Capture Companies List', async () => {
    // Reload the companies page to get fresh data
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if we have any companies
    const companyRows = page.locator('[data-testid^="company-row-"]');
    const rowCount = await companyRows.count();
    console.log(`📋 Found ${rowCount} companies in list`);

    // Wait for table or empty state
    const hasTable = await page
      .locator('[data-testid="company-table"]')
      .count();
    const hasEmptyState = await page.locator('text=No companies yet').count();

    if (rowCount > 0) {
      // Capture the companies table area
      const tableArea = page.locator('[data-testid="company-table"]');
      await tableArea.first().screenshot({
        path: path.join(SCREENSHOT_DIR, 'companies-list.png'),
      });
    } else {
      // Capture full page showing empty state (still useful for blog)
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'companies-list.png'),
        fullPage: false,
      });
      console.log('ℹ️ Captured empty state (no companies)');
    }

    console.log('✅ Captured: companies-list.png');
  });

  test('4. Capture Add Application Form', async () => {
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Wait for company table
    try {
      await page.waitForSelector('[data-testid="company-table"]', {
        timeout: 10000,
      });
    } catch {
      console.log(
        '⚠️ Company table not found - skipping application screenshot'
      );
      return;
    }

    // Find and click on Library row
    const libraryRow = page.locator(
      '[data-testid^="company-row-"]:has-text("Library")'
    );
    const libraryCount = await libraryRow.count();
    console.log(`📋 Found ${libraryCount} Library row(s)`);

    if (libraryCount > 0) {
      await libraryRow.first().click();
      console.log('✅ Clicked Library row');
    } else {
      // Click first company row as fallback
      const anyRow = page.locator('[data-testid^="company-row-"]');
      const anyCount = await anyRow.count();
      console.log(`📋 Found ${anyCount} total company rows`);
      if (anyCount > 0) {
        await anyRow.first().click();
        console.log('✅ Clicked first company row');
      } else {
        console.log('⚠️ No companies found - skipping application screenshot');
        return;
      }
    }

    // Wait for drawer to appear
    await page.waitForTimeout(1000);
    const drawer = page.locator('[data-testid="company-detail-drawer"]');
    try {
      await drawer.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ Detail drawer visible');
    } catch {
      console.log(
        '⚠️ Detail drawer not visible - skipping application screenshot'
      );
      return;
    }

    // Find Add Application button (might need to scroll)
    const addAppButton = page.locator(
      'button:has-text("Add Application"), button:has-text("Add Job Application")'
    );
    const buttonCount = await addAppButton.count();
    console.log(`📋 Found ${buttonCount} Add Application button(s)`);

    if (buttonCount === 0) {
      console.log('⚠️ Add Application button not found - skipping');
      // Take screenshot of drawer instead
      await drawer.screenshot({
        path: path.join(SCREENSHOT_DIR, 'add-application.png'),
      });
      console.log('✅ Captured drawer as fallback: add-application.png');
      return;
    }

    await addAppButton.first().click();
    console.log('✅ Clicked Add Application button');

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

    // Wait for tiles to fully load
    await page.waitForTimeout(4000);

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

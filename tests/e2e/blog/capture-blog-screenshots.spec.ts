/**
 * E2E Test: Capture Screenshots for Blog Post with Accuracy Audit
 *
 * This spec captures screenshots demonstrating the job seeker flow
 * for the getting started blog post AND validates that the UI matches
 * what's documented in the blog.
 *
 * Uses SECONDARY test user to ensure clean demo data.
 * Flow:
 * 1. Set home location (Community Kitchen - soup kitchen starting point)
 * 2. Add Chattanooga Public Library as a company
 * 3. Capture companies list, application form, route sidebar, map view
 * 4. Clean up demo data
 * 5. Generate audit report of discrepancies
 *
 * Screenshots saved to: public/blog-images/getting-started-job-hunt-companion/
 * Audit report saved to: public/blog-images/getting-started-job-hunt-companion/audit-report.md
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

// ============================================================================
// AUDIT INFRASTRUCTURE
// ============================================================================

interface DiscrepancyReport {
  step: string;
  element: string;
  expected: string;
  actual: string;
  severity: 'critical' | 'warning' | 'info';
}

const auditResults: DiscrepancyReport[] = [];

function addDiscrepancy(report: DiscrepancyReport) {
  auditResults.push(report);
  const emoji =
    report.severity === 'critical'
      ? '❌'
      : report.severity === 'warning'
        ? '⚠️'
        : 'ℹ️';
  console.log(
    `[AUDIT ${report.severity.toUpperCase()}] ${emoji} ${report.step}: ${report.element}`
  );
  console.log(`  Expected: "${report.expected}"`);
  console.log(`  Actual: "${report.actual}"`);
}

// Blog expectations - derived from getting-started-job-hunt-companion.md
const BLOG_EXPECTATIONS = {
  step1: {
    title: 'Step 1: Set Your Home Location',
    buttons: ['Geocode', 'Save Home Location'],
    fields: ['home address'],
  },
  step2: {
    title: 'Step 2: Add Your First Company',
    buttons: ['Add Company', 'Geocode', 'Save'],
    fields: [
      'Company Name',
      'Address',
      'Website',
      'Phone',
      'Contact Name',
      'Contact Title',
      'Email',
      'Notes',
      'Status',
      'Priority',
    ],
    // Blog says these exact status labels
    statuses: [
      'Not Contacted',
      'Contacted',
      'Follow Up',
      'Meeting', // Blog says "Meeting" - actual may differ
      'Positive Outcome',
      'Negative Outcome',
    ],
    priorities: ['1', '2', '3', '4', '5'],
  },
  step4: {
    title: 'Step 4: Track a Job Application',
    buttons: ['Add Application'],
    // Blog says these exact application statuses
    appStatuses: [
      'Not Applied',
      'Applied',
      'Screening',
      'Interviewing',
      'Offer',
      'Closed',
    ],
    // Blog says these exact outcomes
    outcomes: ['Pending', 'Hired', 'Rejected', 'Withdrawn', 'Ghosted'],
  },
  step5: {
    title: 'Step 5: Plan Your Visits with Routes',
    buttons: ['Create Route', 'View Map'],
    features: ['Next', 'Next Ride'],
  },
};

import {
  createTestUser,
  deleteTestUser,
  generateTestEmail,
  DEFAULT_TEST_PASSWORD,
} from '../utils/test-user-factory';

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

// Test user will be created dynamically with email confirmed
let TEST_USER: { id: string; email: string; password: string } | null = null;

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

test.describe.serial('Blog Screenshot Capture with Accuracy Audit', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Create test user with email pre-confirmed via admin API
    const email = generateTestEmail('e2e-blog-screenshots');
    const password = DEFAULT_TEST_PASSWORD || 'ValidPass123!';
    TEST_USER = await createTestUser(email, password);

    if (!TEST_USER) {
      throw new Error('Failed to create test user for blog screenshot tests');
    }

    console.log(`✅ Created test user: ${TEST_USER.email}`);

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

    // Sign in with test user
    await page.goto(`${BASE_URL}/sign-in`);
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for redirect (should go to profile, not verify-email)
    await page.waitForURL(/\/profile/, { timeout: 15000 });

    console.log('✅ Signed in as test user');

    // FLUSH ALL DATA for clean screenshots
    if (adminClient) {
      console.log('🧹 Flushing test user data for clean screenshots...');

      // Get user ID from auth.users
      const { data: authData } = await adminClient.auth.admin.listUsers();
      const user = authData?.users?.find((u) => u.email === TEST_USER?.email);

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

    // Clean up test user
    if (TEST_USER) {
      await deleteTestUser(TEST_USER.id);
      console.log('🧹 Deleted test user');
    }
  });

  test('1. Audit & Capture Home Location Settings', async () => {
    console.log('\n📋 AUDIT: Step 1 - Home Location Settings');

    // Navigate to companies page
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // AUDIT: Check for "Home Location" button
    const homeLocationButton = page.locator('button:has-text("Home Location")');
    const homeLocationButtonCount = await homeLocationButton.count();

    if (homeLocationButtonCount === 0) {
      addDiscrepancy({
        step: 'Step 1',
        element: 'Home Location button',
        expected: 'Button with text "Home Location" on companies page',
        actual: 'Button not found',
        severity: 'critical',
      });
    } else {
      console.log('✅ AUDIT: "Home Location" button found');
      await homeLocationButton.click();
      await page.waitForTimeout(500);
    }

    // Wait for the HomeLocationSettings component to appear
    const homeLocationSettings = page.locator(
      '[data-testid="home-location-settings"]'
    );

    try {
      await homeLocationSettings.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ AUDIT: Home Location Settings panel visible');
    } catch {
      addDiscrepancy({
        step: 'Step 1',
        element: 'Home Location Settings panel',
        expected: 'Settings panel appears after clicking button',
        actual: 'Panel did not appear within 5 seconds',
        severity: 'critical',
      });
      return;
    }

    // AUDIT: Check for address input (blog says "Enter your address")
    const addressInput = page.locator('#home-address');
    if ((await addressInput.count()) === 0) {
      addDiscrepancy({
        step: 'Step 1',
        element: 'Address input field',
        expected: 'Input field for home address',
        actual: 'Input field not found with #home-address',
        severity: 'critical',
      });
    } else {
      console.log('✅ AUDIT: Address input field found');
      await addressInput.fill(HOME_LOCATION.address);
    }

    // AUDIT: Check for "Geocode" button (blog says "click Geocode to set your starting point")
    const geocodeButton = page.locator(
      '[data-testid="home-location-settings"] button:has-text("Geocode")'
    );
    if ((await geocodeButton.count()) === 0) {
      addDiscrepancy({
        step: 'Step 1',
        element: 'Geocode button',
        expected: 'Button with text "Geocode" (per blog)',
        actual: 'Geocode button not found',
        severity: 'critical',
      });
    } else {
      console.log('✅ AUDIT: "Geocode" button found');
      await geocodeButton.click();
      await page.waitForTimeout(3000);
    }

    // Verify coordinates updated
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

    // AUDIT: Check for "Save Home Location" button (blog mentions this)
    const saveButton = page.locator('button:has-text("Save Home Location")');
    if ((await saveButton.count()) === 0) {
      addDiscrepancy({
        step: 'Step 1',
        element: 'Save Home Location button',
        expected: 'Button with text "Save Home Location"',
        actual: 'Button not found',
        severity: 'warning',
      });
    } else {
      console.log('✅ AUDIT: "Save Home Location" button found');
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
    }

    // Reload to see updated state
    await page.reload();
    await page.waitForLoadState('networkidle');

    console.log('📋 Step 1 audit complete\n');
  });

  test('2. Audit & Capture Add Company Form', async () => {
    console.log('\n📋 AUDIT: Step 2 - Add Company Form');

    // Navigate to companies page
    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // AUDIT: Check for "Add Company" button
    const addButton = page.locator('button:has-text("Add Company")');
    if ((await addButton.count()) === 0) {
      addDiscrepancy({
        step: 'Step 2',
        element: 'Add Company button',
        expected: 'Button with text "Add Company"',
        actual: 'Button not found',
        severity: 'critical',
      });
      return;
    }
    console.log('✅ AUDIT: "Add Company" button found');
    await addButton.click();

    // Wait for form to appear
    await page.waitForTimeout(1000);

    // Wait for the address input to be visible (form is loaded)
    const addressInput = page.locator('#address');
    try {
      await addressInput.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ AUDIT: Address input field found');
    } catch {
      addDiscrepancy({
        step: 'Step 2',
        element: 'Address input field',
        expected: 'Input field for company address',
        actual: 'Address input not found with #address',
        severity: 'critical',
      });
    }

    // AUDIT: Check for company name input
    const nameInput = page.locator('#company-name');
    if ((await nameInput.count()) > 0) {
      console.log('✅ AUDIT: Company name input found');
      await nameInput.fill(LIBRARY_COMPANY.name);
    } else {
      addDiscrepancy({
        step: 'Step 2',
        element: 'Company Name input',
        expected: 'Input field for company name',
        actual: 'Input not found with #company-name',
        severity: 'critical',
      });
    }

    // Fill address
    await addressInput.fill(LIBRARY_COMPANY.address);
    await page.waitForTimeout(500);

    // AUDIT: Check for status select and validate options match blog
    const statusSelect = page.locator('#status, select[name="status"]');
    if ((await statusSelect.count()) > 0) {
      console.log('✅ AUDIT: Status dropdown found');
      const statusOptions = await statusSelect
        .locator('option')
        .allTextContents();
      console.log(`   Status options in UI: ${statusOptions.join(', ')}`);

      // Check each blog-expected status
      for (const expectedStatus of BLOG_EXPECTATIONS.step2.statuses) {
        const found = statusOptions.some((opt) =>
          opt.toLowerCase().includes(expectedStatus.toLowerCase())
        );
        if (!found) {
          // Check if "Meeting Scheduled" exists when we expected "Meeting"
          if (
            expectedStatus === 'Meeting' &&
            statusOptions.some((opt) => opt.includes('Meeting Scheduled'))
          ) {
            addDiscrepancy({
              step: 'Step 2',
              element: `Status option "${expectedStatus}"`,
              expected: `"Meeting" (per blog)`,
              actual: '"Meeting Scheduled" (UI has different text)',
              severity: 'warning',
            });
          } else {
            addDiscrepancy({
              step: 'Step 2',
              element: `Status option "${expectedStatus}"`,
              expected: `Status option "${expectedStatus}" in dropdown`,
              actual: 'Not found in status dropdown',
              severity: 'warning',
            });
          }
        }
      }
    } else {
      addDiscrepancy({
        step: 'Step 2',
        element: 'Status dropdown',
        expected: 'Select element for company status',
        actual: 'Status dropdown not found',
        severity: 'warning',
      });
    }

    // Click Geocode button
    const geocodeButton = page.locator('button:has-text("Geocode")');
    const buttonCount = await geocodeButton.count();
    if (buttonCount > 0) {
      const isEnabled = await geocodeButton.first().isEnabled();
      if (isEnabled) {
        await geocodeButton.first().click();
        console.log('✅ AUDIT: Geocode button clicked');
        await page.waitForTimeout(3000);
      }
    }

    // Fill remaining fields
    const websiteInput = page.locator(
      'input[name="website"], input[type="url"], #website'
    );
    if ((await websiteInput.count()) > 0) {
      await websiteInput.first().fill(LIBRARY_COMPANY.website);
    }

    const phoneInput = page.locator(
      'input[name="phone"], input[type="tel"], #phone'
    );
    if ((await phoneInput.count()) > 0) {
      await phoneInput.first().fill(LIBRARY_COMPANY.phone);
    }

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

    // Submit the form
    await page.waitForTimeout(1000);
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Add Company"), button[type="submit"]:has-text("Save")'
    );

    const isEnabled = await submitButton
      .first()
      .isEnabled()
      .catch(() => false);
    if (isEnabled) {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

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
      await page.waitForTimeout(3000);

      if (consoleErrors.length > 0) {
        console.log('❌ Console errors during submission:');
        consoleErrors.forEach((err) =>
          console.log(`   ${err.substring(0, 200)}`)
        );
      }

      // Verify the company was created
      await page.goto(`${BASE_URL}/companies`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const libraryRow = page.locator(
        '[data-testid^="company-row-"]:has-text("Library")'
      );
      const libraryCount = await libraryRow.count();
      console.log(`📋 Library rows found: ${libraryCount}`);

      if (libraryCount > 0) {
        console.log('✅ Created Chattanooga Public Library');
      } else {
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

    console.log('📋 Step 2 audit complete\n');
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

  test('4. Audit & Capture Add Application Form', async () => {
    console.log('\n📋 AUDIT: Step 4 - Add Application Form');

    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Wait for company table
    try {
      await page.waitForSelector('[data-testid="company-table"]', {
        timeout: 10000,
      });
    } catch {
      addDiscrepancy({
        step: 'Step 4',
        element: 'Company table',
        expected: 'Company table visible on /companies page',
        actual: 'Table not found within 10 seconds',
        severity: 'critical',
      });
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
      const anyRow = page.locator('[data-testid^="company-row-"]');
      const anyCount = await anyRow.count();
      console.log(`📋 Found ${anyCount} total company rows`);
      if (anyCount > 0) {
        await anyRow.first().click();
        console.log('✅ Clicked first company row');
      } else {
        addDiscrepancy({
          step: 'Step 4',
          element: 'Company rows',
          expected: 'At least one company in table',
          actual: 'No company rows found',
          severity: 'critical',
        });
        return;
      }
    }

    // Wait for drawer to appear
    await page.waitForTimeout(1000);
    const drawer = page.locator('[data-testid="company-detail-drawer"]');
    try {
      await drawer.waitFor({ state: 'visible', timeout: 5000 });
      console.log('✅ AUDIT: Company detail drawer visible');
    } catch {
      addDiscrepancy({
        step: 'Step 4',
        element: 'Company detail drawer',
        expected: 'Drawer appears when clicking company row',
        actual: 'Drawer did not appear',
        severity: 'critical',
      });
      return;
    }

    // AUDIT: Check for "Add Application" button (blog says "Add Application")
    const addAppButton = page.locator(
      'button:has-text("Add Application"), button:has-text("Add Job Application")'
    );
    const buttonCount = await addAppButton.count();

    if (buttonCount === 0) {
      addDiscrepancy({
        step: 'Step 4',
        element: 'Add Application button',
        expected: 'Button with text "Add Application"',
        actual: 'Button not found in drawer',
        severity: 'critical',
      });
      await drawer.screenshot({
        path: path.join(SCREENSHOT_DIR, 'add-application.png'),
      });
      console.log('✅ Captured drawer as fallback: add-application.png');
      return;
    }
    console.log('✅ AUDIT: "Add Application" button found');
    await addAppButton.first().click();

    // Wait for modal
    try {
      await page.waitForSelector('.modal.modal-open', { timeout: 5000 });
      console.log('✅ AUDIT: Application modal opened');
    } catch {
      addDiscrepancy({
        step: 'Step 4',
        element: 'Application modal',
        expected: 'Modal opens when clicking Add Application',
        actual: 'Modal did not open',
        severity: 'critical',
      });
      return;
    }

    // AUDIT: Check application status options match blog
    const statusSelect = page.locator(
      '.modal select[name="status"], .modal #status'
    );
    if ((await statusSelect.count()) > 0) {
      const statusOptions = await statusSelect
        .locator('option')
        .allTextContents();
      console.log(`   Application status options: ${statusOptions.join(', ')}`);

      // Check each blog-expected status
      for (const expectedStatus of BLOG_EXPECTATIONS.step4.appStatuses) {
        const found = statusOptions.some((opt) =>
          opt.toLowerCase().includes(expectedStatus.toLowerCase())
        );
        if (!found) {
          addDiscrepancy({
            step: 'Step 4',
            element: `Application status "${expectedStatus}"`,
            expected: `Status option "${expectedStatus}" in dropdown`,
            actual: 'Not found in application status dropdown',
            severity: 'warning',
          });
        }
      }
    }

    // AUDIT: Check outcome options match blog
    const outcomeSelect = page.locator(
      '.modal select[name="outcome"], .modal #outcome'
    );
    if ((await outcomeSelect.count()) > 0) {
      const outcomeOptions = await outcomeSelect
        .locator('option')
        .allTextContents();
      console.log(`   Outcome options: ${outcomeOptions.join(', ')}`);

      // Check each blog-expected outcome
      for (const expectedOutcome of BLOG_EXPECTATIONS.step4.outcomes) {
        const found = outcomeOptions.some((opt) =>
          opt.toLowerCase().includes(expectedOutcome.toLowerCase())
        );
        if (!found) {
          addDiscrepancy({
            step: 'Step 4',
            element: `Outcome option "${expectedOutcome}"`,
            expected: `Outcome option "${expectedOutcome}" in dropdown`,
            actual: 'Not found in outcome dropdown',
            severity: 'warning',
          });
        }
      }

      // Check for undocumented options (like "Offer Declined")
      const blogOutcomes = BLOG_EXPECTATIONS.step4.outcomes.map((o) =>
        o.toLowerCase()
      );
      for (const uiOption of outcomeOptions) {
        const normalized = uiOption.toLowerCase().trim();
        if (
          normalized &&
          normalized !== 'select outcome' &&
          normalized !== '' &&
          !blogOutcomes.some((b) => normalized.includes(b))
        ) {
          addDiscrepancy({
            step: 'Step 4',
            element: `Undocumented outcome "${uiOption}"`,
            expected: 'All UI options documented in blog',
            actual: `"${uiOption}" exists in UI but not documented in blog`,
            severity: 'info',
          });
        }
      }
    }

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

    console.log('📋 Step 4 audit complete\n');
  });

  test('5. Audit & Capture Route Sidebar', async () => {
    console.log('\n📋 AUDIT: Step 5 - Route Sidebar');

    await page.goto(`${BASE_URL}/companies`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const routeSidebar = page.locator(
      '[data-testid="route-sidebar"], .route-sidebar, aside:has-text("Route")'
    );

    if ((await routeSidebar.count()) === 0) {
      addDiscrepancy({
        step: 'Step 5',
        element: 'Route sidebar',
        expected: 'Route sidebar visible on companies page',
        actual: 'Route sidebar not found',
        severity: 'warning',
      });

      // Try to find any sidebar as fallback
      const sidebar = page.locator('aside, [role="complementary"]').first();
      if ((await sidebar.count()) > 0) {
        await sidebar.screenshot({
          path: path.join(SCREENSHOT_DIR, 'route-sidebar.png'),
        });
        console.log('✅ Captured fallback sidebar: route-sidebar.png');
      }
      return;
    }

    console.log('✅ AUDIT: Route sidebar found');

    // AUDIT: Check for "Create Route" button (blog says "Create Route")
    const createRouteButton = routeSidebar.locator(
      'button:has-text("Create Route")'
    );
    const newButton = routeSidebar.locator('button:has-text("New")');

    if ((await createRouteButton.count()) === 0) {
      if ((await newButton.count()) > 0) {
        addDiscrepancy({
          step: 'Step 5',
          element: 'Create Route button',
          expected: 'Button labeled "Create Route" (per blog)',
          actual: 'Button labeled "New" (different text)',
          severity: 'warning',
        });
        console.log('⚠️ AUDIT: Blog says "Create Route", UI has "New"');
      } else {
        addDiscrepancy({
          step: 'Step 5',
          element: 'Create Route button',
          expected: 'Button to create a route',
          actual: 'Neither "Create Route" nor "New" button found',
          severity: 'warning',
        });
      }
    } else {
      console.log('✅ AUDIT: "Create Route" button found');
    }

    // AUDIT: Check for "View Map" button (blog mentions this)
    const viewMapButton = routeSidebar.locator('button:has-text("View Map")');
    if ((await viewMapButton.count()) === 0) {
      const mapLink = routeSidebar.locator('a:has-text("Map")');
      if ((await mapLink.count()) === 0) {
        addDiscrepancy({
          step: 'Step 5',
          element: 'View Map button',
          expected: 'Button or link to view map (per blog)',
          actual: 'View Map button/link not found in sidebar',
          severity: 'info',
        });
      }
    } else {
      console.log('✅ AUDIT: "View Map" button found');
    }

    // AUDIT: Check for "Next" or "Next Ride" feature (blog mentions marking companies for "Next" ride)
    const nextFeature = page.locator('text="Next"');
    const nextRideFeature = page.locator('text="Next Ride"');

    if (
      (await nextFeature.count()) === 0 &&
      (await nextRideFeature.count()) === 0
    ) {
      addDiscrepancy({
        step: 'Step 5',
        element: '"Next Ride" feature',
        expected: 'Feature to mark companies for "Next" ride (per blog)',
        actual: '"Next" or "Next Ride" text not found on page',
        severity: 'info',
      });
    } else {
      console.log('✅ AUDIT: "Next" feature found');
    }

    // Capture screenshot
    await routeSidebar.first().screenshot({
      path: path.join(SCREENSHOT_DIR, 'route-sidebar.png'),
    });
    console.log('✅ Captured: route-sidebar.png');

    console.log('📋 Step 5 audit complete\n');
  });

  test('6. Capture Map View (Chattanooga)', async () => {
    await page.goto(`${BASE_URL}/map`);
    await page.waitForLoadState('networkidle');

    // Wait for map (MapLibre GL, not Leaflet)
    await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });

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

  test('10. Generate Audit Report', async () => {
    console.log('\n📋 GENERATING AUDIT REPORT');

    const reportPath = path.join(SCREENSHOT_DIR, 'audit-report.json');
    const markdownReportPath = path.join(SCREENSHOT_DIR, 'audit-report.md');

    // Generate JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      blogPost: 'getting-started-job-hunt-companion',
      totalDiscrepancies: auditResults.length,
      critical: auditResults.filter((d) => d.severity === 'critical').length,
      warnings: auditResults.filter((d) => d.severity === 'warning').length,
      info: auditResults.filter((d) => d.severity === 'info').length,
      discrepancies: auditResults,
    };

    fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
    console.log(`✅ JSON report saved: ${reportPath}`);

    // Generate Markdown report
    let markdown = `# Blog Accuracy Audit Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n`;
    markdown += `**Blog Post:** getting-started-job-hunt-companion.md\n`;
    markdown += `**Test File:** capture-blog-screenshots.spec.ts\n\n`;

    markdown += `## Summary\n\n`;
    markdown += `| Severity | Count |\n`;
    markdown += `|----------|-------|\n`;
    markdown += `| ❌ Critical | ${jsonReport.critical} |\n`;
    markdown += `| ⚠️ Warning | ${jsonReport.warnings} |\n`;
    markdown += `| ℹ️ Info | ${jsonReport.info} |\n`;
    markdown += `| **Total** | **${jsonReport.totalDiscrepancies}** |\n\n`;

    if (auditResults.length > 0) {
      markdown += `## Discrepancies Found\n\n`;

      // Group by step
      const stepGroups = new Map<string, DiscrepancyReport[]>();
      for (const d of auditResults) {
        const existing = stepGroups.get(d.step) || [];
        existing.push(d);
        stepGroups.set(d.step, existing);
      }

      for (const [step, discrepancies] of stepGroups) {
        markdown += `### ${step}\n\n`;
        for (const d of discrepancies) {
          const emoji =
            d.severity === 'critical'
              ? '❌'
              : d.severity === 'warning'
                ? '⚠️'
                : 'ℹ️';
          markdown += `#### ${emoji} ${d.element}\n`;
          markdown += `- **Severity:** ${d.severity}\n`;
          markdown += `- **Expected:** ${d.expected}\n`;
          markdown += `- **Actual:** ${d.actual}\n\n`;
        }
      }

      markdown += `## Recommended Blog Updates\n\n`;
      markdown += `Based on the audit, consider updating the blog post:\n\n`;

      for (const d of auditResults) {
        if (d.severity === 'warning' || d.severity === 'critical') {
          markdown += `- [ ] ${d.step}: Update "${d.element}" - ${d.actual}\n`;
        }
      }

      for (const d of auditResults) {
        if (d.severity === 'info') {
          markdown += `- [ ] ${d.step}: Consider documenting "${d.element}"\n`;
        }
      }
    } else {
      markdown += `## Result\n\n`;
      markdown += `✅ **No discrepancies found!** The blog accurately reflects the current UI.\n`;
    }

    markdown += `\n---\n`;
    markdown += `*Report generated by Playwright accuracy audit test*\n`;

    fs.writeFileSync(markdownReportPath, markdown);
    console.log(`✅ Markdown report saved: ${markdownReportPath}`);

    // Print summary to console
    console.log(`\n${'='.repeat(60)}`);
    console.log('AUDIT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total discrepancies: ${auditResults.length}`);
    console.log(`  Critical: ${jsonReport.critical}`);
    console.log(`  Warnings: ${jsonReport.warnings}`);
    console.log(`  Info: ${jsonReport.info}`);
    console.log('='.repeat(60));

    if (jsonReport.critical > 0) {
      console.log(
        `\n❌ ${jsonReport.critical} CRITICAL discrepancies require immediate attention!`
      );
    }

    if (jsonReport.warnings > 0) {
      console.log(
        `\n⚠️ ${jsonReport.warnings} warnings should be reviewed for blog updates.`
      );
    }

    console.log(`\nFull report: ${markdownReportPath}`);
  });
});

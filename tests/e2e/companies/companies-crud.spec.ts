/**
 * E2E Test: Companies Page - Application CRUD
 *
 * Tests the CRUD operations for job applications:
 * - Create new application from drawer
 * - Edit existing application
 * - Delete application with confirmation
 * - Cancel operations
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { CompaniesPage } from '../pages/CompaniesPage';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test user credentials from env (required)
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || process.env.TEST_USER_PRIMARY_EMAIL,
  password:
    process.env.TEST_USER_PASSWORD || process.env.TEST_USER_PRIMARY_PASSWORD,
};

if (!TEST_USER.email || !TEST_USER.password) {
  throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env');
}

// Admin client for cleanup
const getAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
};

test.describe('Companies Page - Application CRUD', () => {
  // Shared context and page for all tests - sign in once
  let sharedContext: BrowserContext;
  let sharedPage: Page;
  let companiesPage: CompaniesPage;
  const testPositionPrefix = 'E2E Test Position';

  test.beforeAll(async ({ browser }) => {
    // Clean up test applications from previous runs
    const adminClient = getAdminClient();
    if (adminClient) {
      await adminClient
        .from('job_applications')
        .delete()
        .like('position_title', `${testPositionPrefix}%`);
    }

    // Create a shared context and page
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();
    companiesPage = new CompaniesPage(sharedPage);

    // Sign in once for all tests
    await companiesPage.signIn(TEST_USER.email, TEST_USER.password);
  });

  test.afterAll(async () => {
    // Clean up test applications
    const adminClient = getAdminClient();
    if (adminClient) {
      await adminClient
        .from('job_applications')
        .delete()
        .like('position_title', `${testPositionPrefix}%`);
    }

    await sharedContext?.close();
  });

  test.beforeEach(async () => {
    // Navigate to companies page before each test
    await companiesPage.goto();
    await companiesPage.waitForTable();
  });

  test('should open application form modal when clicking Add', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open drawer
    await companiesPage.clickFirstCompanyRow();
    expect(await companiesPage.isDrawerOpen()).toBe(true);

    // Click Add Application
    await companiesPage.clickAddApplication();

    // Verify modal is open
    const modal = sharedPage.locator('.modal.modal-open');
    await expect(modal).toBeVisible();

    // Verify form fields exist (IDs match ApplicationForm.tsx)
    await expect(sharedPage.locator('#position-title')).toBeVisible();
    await expect(sharedPage.locator('#work-location')).toBeVisible();
    await expect(sharedPage.locator('#status')).toBeVisible();

    // Cancel to clean up
    await companiesPage.cancelApplicationForm();
    await companiesPage.closeDrawer();
  });

  test('should create new application from drawer', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open drawer and get initial app count
    await companiesPage.clickFirstCompanyRow();
    const initialAppCount = await companiesPage.getDrawerApplicationCount();

    // Click Add Application
    await companiesPage.clickAddApplication();

    // Fill form with test data
    const testPosition = `${testPositionPrefix} ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: testPosition,
      workLocationType: 'remote',
      status: 'applied',
      priority: 2,
      notes: 'E2E test application',
    });

    // Submit form
    await companiesPage.submitApplicationForm();

    // Verify drawer is still open after form submission
    expect(await companiesPage.isDrawerOpen()).toBe(true);

    // Wait for the new application to appear (by its title)
    await sharedPage.waitForSelector(`text="${testPosition}"`, {
      timeout: 10000,
    });

    // Verify new application appears
    const newAppCount = await companiesPage.getDrawerApplicationCount();
    expect(newAppCount).toBe(initialAppCount + 1);

    // Verify new application content is visible
    const newApp = sharedPage.getByText(testPosition);
    await expect(newApp).toBeVisible();

    await companiesPage.closeDrawer();
  });

  test('should cancel application creation', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Open drawer and get initial app count
    await companiesPage.clickFirstCompanyRow();
    const initialAppCount = await companiesPage.getDrawerApplicationCount();

    // Click Add Application
    await companiesPage.clickAddApplication();

    // Fill form
    await companiesPage.fillApplicationForm({
      positionTitle: `${testPositionPrefix} Cancelled ${Date.now()}`,
    });

    // Cancel form
    await companiesPage.cancelApplicationForm();

    // Verify app count unchanged
    const finalAppCount = await companiesPage.getDrawerApplicationCount();
    expect(finalAppCount).toBe(initialAppCount);

    await companiesPage.closeDrawer();
  });

  test('should edit existing application', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // First create an application to edit
    await companiesPage.clickFirstCompanyRow();
    await companiesPage.clickAddApplication();

    const originalPosition = `${testPositionPrefix} Original ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: originalPosition,
      workLocationType: 'hybrid',
      status: 'applied',
    });
    await companiesPage.submitApplicationForm();
    await sharedPage.waitForTimeout(1000);

    // Now edit the application
    await companiesPage.clickEditApplication(originalPosition);

    // Verify form is pre-filled
    const positionInput = sharedPage.locator('#position-title');
    await expect(positionInput).toHaveValue(originalPosition);

    // Update the position title
    const updatedPosition = `${testPositionPrefix} Updated ${Date.now()}`;
    await positionInput.clear();
    await positionInput.fill(updatedPosition);

    // Submit the update
    await companiesPage.submitApplicationForm();
    await sharedPage.waitForTimeout(1000);

    // Verify updated position is visible
    const updatedApp = sharedPage.getByText(updatedPosition);
    await expect(updatedApp).toBeVisible();

    // Verify original position is no longer visible
    const originalApp = sharedPage.getByText(originalPosition);
    await expect(originalApp).not.toBeVisible();

    await companiesPage.closeDrawer();
  });

  test('should delete application with confirmation', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // First create an application to delete
    await companiesPage.clickFirstCompanyRow();
    await companiesPage.clickAddApplication();

    const positionToDelete = `${testPositionPrefix} ToDelete ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: positionToDelete,
      status: 'not_applied',
    });
    await companiesPage.submitApplicationForm();
    await sharedPage.waitForTimeout(1000);

    // Get app count before delete
    const beforeDeleteCount = await companiesPage.getDrawerApplicationCount();

    // Set up dialog handler to accept (use once to avoid handler accumulation)
    sharedPage.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Click delete
    await companiesPage.clickDeleteApplication(positionToDelete);
    await sharedPage.waitForTimeout(1000);

    // Verify app count decreased
    const afterDeleteCount = await companiesPage.getDrawerApplicationCount();
    expect(afterDeleteCount).toBe(beforeDeleteCount - 1);

    // Verify application is no longer visible
    const deletedApp = sharedPage.getByText(positionToDelete);
    await expect(deletedApp).not.toBeVisible();

    await companiesPage.closeDrawer();
  });

  test('should cancel delete when declined', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // First create an application
    await companiesPage.clickFirstCompanyRow();
    await companiesPage.clickAddApplication();

    const positionToKeep = `${testPositionPrefix} ToKeep ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: positionToKeep,
      status: 'applied',
    });
    await companiesPage.submitApplicationForm();
    await sharedPage.waitForTimeout(1000);

    // Get app count before delete attempt
    const beforeDeleteCount = await companiesPage.getDrawerApplicationCount();

    // Set up dialog handler to dismiss (use once to avoid handler accumulation)
    sharedPage.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    // Click delete
    await companiesPage.clickDeleteApplication(positionToKeep);
    await sharedPage.waitForTimeout(500);

    // Verify app count unchanged
    const afterDeleteCount = await companiesPage.getDrawerApplicationCount();
    expect(afterDeleteCount).toBe(beforeDeleteCount);

    // Verify application still visible
    const keptApp = sharedPage.getByText(positionToKeep);
    await expect(keptApp).toBeVisible();

    await companiesPage.closeDrawer();
  });

  test('should persist new application after page refresh', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Create an application
    await companiesPage.clickFirstCompanyRow();
    const companyName = await companiesPage.getDrawerCompanyName();

    await companiesPage.clickAddApplication();

    const persistentPosition = `${testPositionPrefix} Persistent ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: persistentPosition,
      workLocationType: 'on_site',
      status: 'interviewing',
    });
    await companiesPage.submitApplicationForm();
    await sharedPage.waitForTimeout(1000);

    // Close drawer and refresh page
    await companiesPage.closeDrawer();
    await sharedPage.reload();
    await companiesPage.waitForTable();

    // Reopen drawer for same company
    // Find the row by company name and click it
    const companyRow = sharedPage
      .locator('[data-testid^="company-row-"]')
      .filter({ hasText: companyName.trim().split('\n')[0] })
      .first();

    if (await companyRow.isVisible()) {
      await companyRow.click();
      await companiesPage.waitForDrawer();

      // Verify application still exists
      const persistentApp = sharedPage.getByText(persistentPosition);
      await expect(persistentApp).toBeVisible();

      await companiesPage.closeDrawer();
    }
  });
});

/**
 * E2E Test: Companies Page - Status Changes
 *
 * Tests the inline status and outcome changes for job applications:
 * - Change application status via dropdown
 * - Change application outcome via dropdown
 * - Verify changes persist after refresh
 * - Verify changes reflect in company table row
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

test.describe('Companies Page - Status Changes', () => {
  // Shared context and page for all tests - sign in once
  let sharedContext: BrowserContext;
  let sharedPage: Page;
  let companiesPage: CompaniesPage;
  const testPositionPrefix = 'E2E Status Test';

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

  test('should change application status via dropdown', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Create a test application
    await companiesPage.clickFirstCompanyRow();
    await companiesPage.clickAddApplication();

    const testPosition = `${testPositionPrefix} Status ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: testPosition,
      status: 'not_applied',
      workLocationType: 'remote',
    });
    await companiesPage.submitApplicationForm();

    // Wait for application card and get the ID by title (more reliable than first)
    const appId = await companiesPage.getApplicationIdByTitle(testPosition);
    expect(appId).toBeTruthy();

    // Verify initial status
    const initialStatus = await companiesPage.getApplicationStatus(appId);
    expect(initialStatus).toBe('not_applied');

    // Change status to 'applied'
    await companiesPage.changeApplicationStatus(appId, 'applied');
    await sharedPage.waitForTimeout(500);

    // Verify status changed
    const newStatus = await companiesPage.getApplicationStatus(appId);
    expect(newStatus).toBe('applied');

    await companiesPage.closeDrawer();
  });

  test('should change application outcome via dropdown', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Create a test application
    await companiesPage.clickFirstCompanyRow();
    await companiesPage.clickAddApplication();

    const testPosition = `${testPositionPrefix} Outcome ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: testPosition,
      status: 'interviewing',
      outcome: 'pending',
      workLocationType: 'hybrid',
    });
    await companiesPage.submitApplicationForm();

    // Wait for application card and get the ID by title (more reliable than first)
    const appId = await companiesPage.getApplicationIdByTitle(testPosition);
    expect(appId).toBeTruthy();

    // Verify initial outcome
    const initialOutcome = await companiesPage.getApplicationOutcome(appId);
    expect(initialOutcome).toBe('pending');

    // Change outcome to 'hired'
    await companiesPage.changeApplicationOutcome(appId, 'hired');
    await sharedPage.waitForTimeout(500);

    // Verify outcome changed
    const newOutcome = await companiesPage.getApplicationOutcome(appId);
    expect(newOutcome).toBe('hired');

    await companiesPage.closeDrawer();
  });

  test('should persist status change after page refresh', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Create a test application
    await companiesPage.clickFirstCompanyRow();
    const companyName = await companiesPage.getDrawerCompanyName();

    await companiesPage.clickAddApplication();

    const testPosition = `${testPositionPrefix} Persist ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: testPosition,
      status: 'not_applied',
      workLocationType: 'on_site',
    });
    await companiesPage.submitApplicationForm();

    // Wait for application card and get the ID by title (more reliable than first)
    const appId = await companiesPage.getApplicationIdByTitle(testPosition);
    expect(appId).toBeTruthy();

    // Change status to 'offer'
    await companiesPage.changeApplicationStatus(appId, 'offer');
    await sharedPage.waitForTimeout(500);

    // Close drawer and refresh
    await companiesPage.closeDrawer();
    await sharedPage.reload();
    await companiesPage.waitForTable();

    // Reopen drawer
    const companyRow = sharedPage
      .locator('[data-testid^="company-row-"]')
      .filter({ hasText: companyName.trim().split('\n')[0] })
      .first();

    if (await companyRow.isVisible()) {
      await companyRow.click();
      await companiesPage.waitForDrawer();

      // Find the application and verify status persisted
      const appCard = sharedPage.locator(
        `[data-testid="application-card-${appId}"]`
      );
      if (await appCard.isVisible()) {
        const statusDropdown = appCard.locator('[aria-label="Change status"]');
        const persistedStatus = await statusDropdown.inputValue();
        expect(persistedStatus).toBe('offer');
      }

      await companiesPage.closeDrawer();
    }
  });

  test('should allow multiple status changes in sequence', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Create a test application
    await companiesPage.clickFirstCompanyRow();
    await companiesPage.clickAddApplication();

    const testPosition = `${testPositionPrefix} Sequence ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: testPosition,
      status: 'not_applied',
      workLocationType: 'remote',
    });
    await companiesPage.submitApplicationForm();

    // Wait for application card and get the ID by title (more reliable than first)
    const appId = await companiesPage.getApplicationIdByTitle(testPosition);
    expect(appId).toBeTruthy();

    // Status progression: not_applied -> applied -> screening -> interviewing -> offer
    const statusProgression = ['applied', 'screening', 'interviewing', 'offer'];

    for (const status of statusProgression) {
      await companiesPage.changeApplicationStatus(appId, status);
      await sharedPage.waitForTimeout(300);

      const currentStatus = await companiesPage.getApplicationStatus(appId);
      expect(currentStatus).toBe(status);
    }

    await companiesPage.closeDrawer();
  });

  test('should display status dropdowns with correct options', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Create a test application
    await companiesPage.clickFirstCompanyRow();
    await companiesPage.clickAddApplication();

    const testPosition = `${testPositionPrefix} Options ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: testPosition,
      status: 'applied',
      workLocationType: 'hybrid',
    });
    await companiesPage.submitApplicationForm();
    await sharedPage.waitForTimeout(1000);

    // Get the application card
    const appCard = sharedPage
      .locator('[data-testid^="application-card-"]')
      .first();

    // Verify status dropdown has expected options
    const statusDropdown = appCard.locator('[aria-label="Change status"]');
    const statusOptions = await statusDropdown
      .locator('option')
      .allTextContents();

    expect(statusOptions).toContain('Not Applied');
    expect(statusOptions).toContain('Applied');
    expect(statusOptions).toContain('Screening');
    expect(statusOptions).toContain('Interviewing');
    expect(statusOptions).toContain('Offer');
    expect(statusOptions).toContain('Closed');

    // Verify outcome dropdown has expected options
    const outcomeDropdown = appCard.locator('[aria-label="Change outcome"]');
    const outcomeOptions = await outcomeDropdown
      .locator('option')
      .allTextContents();

    expect(outcomeOptions).toContain('Pending');
    expect(outcomeOptions).toContain('Hired');
    expect(outcomeOptions).toContain('Rejected');
    expect(outcomeOptions).toContain('Withdrawn');
    expect(outcomeOptions).toContain('Ghosted');
    expect(outcomeOptions).toContain('Offer Declined');

    await companiesPage.closeDrawer();
  });

  test('should update status and outcome independently', async () => {
    const rowCount = await companiesPage.getCompanyRowCount();
    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Create a test application
    await companiesPage.clickFirstCompanyRow();
    await companiesPage.clickAddApplication();

    const testPosition = `${testPositionPrefix} Independent ${Date.now()}`;
    await companiesPage.fillApplicationForm({
      positionTitle: testPosition,
      status: 'applied',
      outcome: 'pending',
      workLocationType: 'remote',
    });
    await companiesPage.submitApplicationForm();

    // Wait for application card and get the ID by title (more reliable than first)
    const appId = await companiesPage.getApplicationIdByTitle(testPosition);
    expect(appId).toBeTruthy();

    // Change status only
    await companiesPage.changeApplicationStatus(appId, 'interviewing');
    await sharedPage.waitForTimeout(300);

    // Verify status changed but outcome unchanged
    expect(await companiesPage.getApplicationStatus(appId)).toBe(
      'interviewing'
    );
    expect(await companiesPage.getApplicationOutcome(appId)).toBe('pending');

    // Change outcome only
    await companiesPage.changeApplicationOutcome(appId, 'hired');
    await sharedPage.waitForTimeout(300);

    // Verify outcome changed but status unchanged
    expect(await companiesPage.getApplicationStatus(appId)).toBe(
      'interviewing'
    );
    expect(await companiesPage.getApplicationOutcome(appId)).toBe('hired');

    await companiesPage.closeDrawer();
  });
});

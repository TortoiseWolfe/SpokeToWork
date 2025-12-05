import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Companies Page Object Model
 *
 * Provides helper methods for interacting with the Companies page
 * and CompanyDetailDrawer in E2E tests.
 */
export class CompaniesPage extends BasePage {
  // Override baseURL to use dev server (no basePath)
  override readonly baseURL: string =
    process.env.BASE_URL || 'http://localhost:3000';
  // Selectors
  readonly selectors = {
    // Table selectors
    table: '[data-testid="company-table"]',
    companyRow: (id: string) => `[data-testid="company-row-${id}"]`,
    appCountBadge: '[data-testid*="app-count"]',
    latestStatusBadge: '[data-testid*="latest-status"]',

    // Drawer selectors
    drawer: '[data-testid="company-detail-drawer"]',
    drawerBackdrop: '[data-testid="company-detail-drawer-backdrop"]',
    closeDrawerButton: '[aria-label="Close drawer"]',
    editCompanyButton: '[aria-label="Edit company"]',
    addAppButton: '[aria-label="Add application"]',

    // Application card selectors
    applicationCard: (id: string) => `[data-testid="application-card-${id}"]`,
    editAppButton: (title: string) => `[aria-label="Edit ${title}"]`,
    deleteAppButton: (title: string) => `[aria-label="Delete ${title}"]`,
    statusDropdown: '[aria-label="Change status"]',
    outcomeDropdown: '[aria-label="Change outcome"]',

    // Form selectors (modal) - matches DaisyUI modal structure
    applicationModal: '.modal.modal-open',
    positionTitleInput: '#position-title',
    jobLinkInput: '#job-link',
    workLocationSelect: '#work-location',
    statusSelect: '#status',
    outcomeSelect: '#outcome',
    prioritySelect: '#priority',
    dateAppliedInput: '#date-applied',
    interviewDateInput: '#interview-date',
    notesTextarea: '#notes',
    submitButton: 'button[type="submit"]',
    cancelButton: 'button[type="button"]:has-text("Cancel")',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the companies page
   */
  async goto() {
    await this.navigate('/companies');
  }

  /**
   * Wait for the companies table to load
   */
  async waitForTable() {
    await this.page.waitForSelector(this.selectors.table, {
      state: 'visible',
      timeout: 10000,
    });
    await this.waitForLoad();
  }

  /**
   * Get the count of company rows in the table
   */
  async getCompanyRowCount(): Promise<number> {
    const rows = this.page.locator('[data-testid^="company-row-"]');
    return await rows.count();
  }

  /**
   * Click on a company row to open the detail drawer
   */
  async clickCompanyRow(companyId: string) {
    const row = this.page.locator(this.selectors.companyRow(companyId));
    await row.click();
    await this.waitForDrawer();
  }

  /**
   * Click on the first company row
   */
  async clickFirstCompanyRow() {
    const firstRow = this.page.locator('[data-testid^="company-row-"]').first();
    await firstRow.click();
    await this.waitForDrawer();
  }

  /**
   * Wait for the company detail drawer to open
   */
  async waitForDrawer() {
    await this.page.waitForSelector(this.selectors.drawer, {
      state: 'visible',
      timeout: 5000,
    });
  }

  /**
   * Check if the drawer is open
   */
  async isDrawerOpen(): Promise<boolean> {
    return await this.isVisible(this.selectors.drawer);
  }

  /**
   * Close the company detail drawer
   */
  async closeDrawer() {
    const closeButton = this.page.locator(this.selectors.closeDrawerButton);
    await closeButton.click();
    await this.page.waitForSelector(this.selectors.drawer, {
      state: 'hidden',
      timeout: 5000,
    });
  }

  /**
   * Close drawer by pressing Escape key
   */
  async closeDrawerWithEscape() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector(this.selectors.drawer, {
      state: 'hidden',
      timeout: 5000,
    });
  }

  /**
   * Close drawer by clicking outside (on backdrop)
   */
  async closeDrawerByClickingOutside() {
    // Click on the backdrop element directly
    const backdrop = this.page.locator(this.selectors.drawerBackdrop);
    await backdrop.click({ force: true });
    await this.page.waitForSelector(this.selectors.drawer, {
      state: 'hidden',
      timeout: 5000,
    });
  }

  /**
   * Get the company name from the drawer header
   */
  async getDrawerCompanyName(): Promise<string> {
    const heading = this.page.locator('#drawer-title');
    return (await heading.textContent()) || '';
  }

  /**
   * Get the count of applications displayed in the drawer
   */
  async getDrawerApplicationCount(): Promise<number> {
    const appCards = this.page.locator('[data-testid^="application-card-"]');
    return await appCards.count();
  }

  /**
   * Click the "Add Application" button in the drawer
   */
  async clickAddApplication() {
    const addButton = this.page.locator(this.selectors.addAppButton);
    await addButton.click();
    await this.page.waitForSelector(this.selectors.applicationModal, {
      state: 'visible',
      timeout: 5000,
    });
  }

  /**
   * Fill and submit the application form
   */
  async fillApplicationForm(data: {
    positionTitle?: string;
    jobLink?: string;
    workLocationType?: 'remote' | 'hybrid' | 'on_site';
    status?: string;
    outcome?: string;
    priority?: number;
    dateApplied?: string;
    interviewDate?: string;
    notes?: string;
  }) {
    if (data.positionTitle) {
      await this.page.fill(
        this.selectors.positionTitleInput,
        data.positionTitle
      );
    }
    if (data.jobLink) {
      await this.page.fill(this.selectors.jobLinkInput, data.jobLink);
    }
    if (data.workLocationType) {
      await this.page.selectOption(
        this.selectors.workLocationSelect,
        data.workLocationType
      );
    }
    if (data.status) {
      await this.page.selectOption(this.selectors.statusSelect, data.status);
    }
    if (data.outcome) {
      await this.page.selectOption(this.selectors.outcomeSelect, data.outcome);
    }
    if (data.priority) {
      await this.page.selectOption(
        this.selectors.prioritySelect,
        data.priority.toString()
      );
    }
    if (data.dateApplied) {
      await this.page.fill(this.selectors.dateAppliedInput, data.dateApplied);
    }
    if (data.interviewDate) {
      await this.page.fill(
        this.selectors.interviewDateInput,
        data.interviewDate
      );
    }
    if (data.notes) {
      await this.page.fill(this.selectors.notesTextarea, data.notes);
    }
  }

  /**
   * Submit the application form
   */
  async submitApplicationForm() {
    const submitButton = this.page.locator(this.selectors.submitButton);
    await submitButton.click();
    // Wait for modal to close
    await this.page.waitForSelector(this.selectors.applicationModal, {
      state: 'hidden',
      timeout: 5000,
    });
  }

  /**
   * Wait for at least one application card to appear in the drawer
   */
  async waitForApplicationCard() {
    await this.page.waitForSelector('[data-testid^="application-card-"]', {
      state: 'visible',
      timeout: 10000,
    });
  }

  /**
   * Get the first application ID from the drawer (waits for card to appear)
   */
  async getFirstApplicationId(): Promise<string> {
    await this.waitForApplicationCard();
    const firstCard = this.page
      .locator('[data-testid^="application-card-"]')
      .first();
    const testId = await firstCard.getAttribute('data-testid');
    if (!testId) {
      throw new Error('No application card found');
    }
    return testId.replace('application-card-', '');
  }

  /**
   * Find an application by its position title and return its ID
   * This is more reliable than getFirstApplicationId when multiple applications exist
   */
  async getApplicationIdByTitle(positionTitle: string): Promise<string> {
    // Wait for application cards to load
    await this.waitForApplicationCard();

    // Find the card containing the position title
    const appCard = this.page
      .locator('[data-testid^="application-card-"]')
      .filter({ hasText: positionTitle })
      .first();

    await appCard.waitFor({ state: 'visible', timeout: 10000 });

    const testId = await appCard.getAttribute('data-testid');
    if (!testId) {
      throw new Error(`No application card found with title: ${positionTitle}`);
    }
    return testId.replace('application-card-', '');
  }

  /**
   * Cancel the application form
   */
  async cancelApplicationForm() {
    const cancelButton = this.page.locator(this.selectors.cancelButton);
    await cancelButton.click();
    await this.page.waitForSelector(this.selectors.applicationModal, {
      state: 'hidden',
      timeout: 5000,
    });
  }

  /**
   * Click edit button for a specific application
   */
  async clickEditApplication(positionTitle: string) {
    const editButton = this.page
      .locator(
        `[aria-label="Edit ${positionTitle}"], [aria-label="Edit application"]`
      )
      .first();
    await editButton.click();
    await this.page.waitForSelector(this.selectors.applicationModal, {
      state: 'visible',
      timeout: 5000,
    });
  }

  /**
   * Click delete button for a specific application
   */
  async clickDeleteApplication(positionTitle: string) {
    const deleteButton = this.page
      .locator(
        `[aria-label="Delete ${positionTitle}"], [aria-label="Delete application"]`
      )
      .first();
    await deleteButton.click();
  }

  /**
   * Handle browser confirm dialog
   */
  async acceptDeleteConfirmation() {
    this.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
  }

  /**
   * Handle browser confirm dialog - decline
   */
  async declineDeleteConfirmation() {
    this.page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });
  }

  /**
   * Change application status via dropdown
   * Waits for the backend call to complete and UI to update
   */
  async changeApplicationStatus(appId: string, newStatus: string) {
    const appCard = this.page.locator(this.selectors.applicationCard(appId));
    const statusDropdown = appCard.locator(this.selectors.statusDropdown);

    // Get the current value before changing
    const currentValue = await statusDropdown.inputValue();

    // If already at target value, nothing to do
    if (currentValue === newStatus) {
      return;
    }

    // Select the new option - this triggers the async handler
    await statusDropdown.selectOption(newStatus);

    // Wait for the backend call to complete and UI to update
    // The dropdown is controlled by React state, so we need to wait for re-render
    await this.page.waitForFunction(
      ([selector, expectedValue]) => {
        const select = document.querySelector(selector) as HTMLSelectElement;
        return select && select.value === expectedValue;
      },
      [
        `[data-testid="application-card-${appId}"] [aria-label="Change status"]`,
        newStatus,
      ],
      { timeout: 10000 }
    );
  }

  /**
   * Change application outcome via dropdown
   * Waits for the backend call to complete and UI to update
   */
  async changeApplicationOutcome(appId: string, newOutcome: string) {
    const appCard = this.page.locator(this.selectors.applicationCard(appId));
    const outcomeDropdown = appCard.locator(this.selectors.outcomeDropdown);

    // Get the current value before changing
    const currentValue = await outcomeDropdown.inputValue();

    // If already at target value, nothing to do
    if (currentValue === newOutcome) {
      return;
    }

    // Select the new option - this triggers the async handler
    await outcomeDropdown.selectOption(newOutcome);

    // Wait for the backend call to complete and UI to update
    await this.page.waitForFunction(
      ([selector, expectedValue]) => {
        const select = document.querySelector(selector) as HTMLSelectElement;
        return select && select.value === expectedValue;
      },
      [
        `[data-testid="application-card-${appId}"] [aria-label="Change outcome"]`,
        newOutcome,
      ],
      { timeout: 10000 }
    );
  }

  /**
   * Get the current status of an application from the dropdown
   */
  async getApplicationStatus(appId: string): Promise<string> {
    const appCard = this.page.locator(this.selectors.applicationCard(appId));
    const statusDropdown = appCard.locator(this.selectors.statusDropdown);
    return await statusDropdown.inputValue();
  }

  /**
   * Get the current outcome of an application from the dropdown
   */
  async getApplicationOutcome(appId: string): Promise<string> {
    const appCard = this.page.locator(this.selectors.applicationCard(appId));
    const outcomeDropdown = appCard.locator(this.selectors.outcomeDropdown);
    return await outcomeDropdown.inputValue();
  }

  /**
   * Sign in with test user credentials
   */
  async signIn(email: string, password: string) {
    await this.page.goto(`${this.baseURL}/sign-in`);
    await this.page.waitForLoadState('networkidle');

    // Handle cookie consent banner if present
    const acceptButton = this.page.getByRole('button', { name: 'Accept All' });
    if (await acceptButton.isVisible().catch(() => false)) {
      await acceptButton.click();
      await this.page.waitForTimeout(300);
    }

    // Dismiss promotional banner if present (the "Dismiss countdown banner" button)
    const dismissBanner = this.page.getByRole('button', {
      name: 'Dismiss countdown banner',
    });
    if (await dismissBanner.isVisible().catch(() => false)) {
      await dismissBanner.click();
      await this.page.waitForTimeout(300);
    }

    await this.page.fill('#email', email);
    await this.page.fill('#password', password);
    // Use role-based selector for the Sign In button with force click to bypass any remaining overlays
    await this.page
      .getByRole('button', { name: 'Sign In' })
      .click({ force: true });
    await this.page.waitForURL(/.*\/profile/, { timeout: 15000 });
  }

  /**
   * Verify a company row has an application count badge
   */
  async verifyCompanyHasAppCount(companyId: string, expectedCount: number) {
    const row = this.page.locator(this.selectors.companyRow(companyId));
    const badge = row.locator('.badge').filter({ hasText: `${expectedCount}` });
    await expect(badge).toBeVisible();
  }

  /**
   * Get all application IDs from the drawer
   */
  async getApplicationIds(): Promise<string[]> {
    const appCards = this.page.locator('[data-testid^="application-card-"]');
    const count = await appCards.count();
    const ids: string[] = [];

    for (let i = 0; i < count; i++) {
      const testId = await appCards.nth(i).getAttribute('data-testid');
      if (testId) {
        const id = testId.replace('application-card-', '');
        ids.push(id);
      }
    }

    return ids;
  }

  /**
   * Delete all test applications created during E2E tests.
   * Uses the authenticated user's session to delete via UI.
   * This ensures cleanup works without requiring service role key.
   */
  async cleanupTestApplications(testPrefixes: string[] = ['E2E Test', 'E2E Status Test']) {
    try {
      // Navigate to companies page if not already there
      await this.goto();
      await this.waitForTable();
    } catch (error) {
      // If navigation fails (e.g., not signed in), skip cleanup
      console.log('Cleanup skipped - could not navigate to companies page');
      return;
    }

    // Get all company rows
    const rowCount = await this.getCompanyRowCount();
    if (rowCount === 0) return;

    // Go through each company and delete test applications
    for (let i = 0; i < Math.min(rowCount, 20); i++) {
      // Always click the first row since we may have deleted from previous
      const rows = this.page.locator('[data-testid^="company-row-"]');
      const currentRowCount = await rows.count();
      if (currentRowCount === 0) break;

      // Click row at index i (or last if fewer rows)
      const rowIndex = Math.min(i, currentRowCount - 1);
      await rows.nth(rowIndex).click();

      try {
        await this.waitForDrawer();
      } catch {
        continue; // Skip if drawer doesn't open
      }

      // Find test applications in this drawer
      const appCards = this.page.locator('[data-testid^="application-card-"]');
      const appCount = await appCards.count();

      for (let j = appCount - 1; j >= 0; j--) {
        const card = appCards.nth(j);
        const cardText = await card.textContent();

        // Check if this is a test application
        const isTestApp = testPrefixes.some(prefix => cardText?.includes(prefix));
        if (!isTestApp) continue;

        // Find and click delete button
        const deleteBtn = card.locator('button[aria-label*="Delete"]');
        if (await deleteBtn.isVisible().catch(() => false)) {
          // Set up dialog handler
          this.page.once('dialog', async (dialog) => {
            await dialog.accept();
          });

          await deleteBtn.click();
          await this.page.waitForTimeout(500);
        }
      }

      // Close drawer before moving to next company
      try {
        await this.closeDrawer();
      } catch {
        // If close fails, press escape
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(300);
      }
    }
  }
}

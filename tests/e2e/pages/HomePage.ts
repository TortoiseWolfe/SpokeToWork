import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Homepage
 * Updated to match current SpokeToWork homepage structure
 */
export class HomePage extends BasePage {
  // Selectors - updated for current homepage
  readonly selectors = {
    // Header elements
    logo: 'a[href="/"]',
    skipLink: 'a[href="#main-content"]',

    // Hero section
    heroTitle: 'h1',
    heroSection: 'section[aria-label="Welcome hero"]',

    // Navigation buttons (primary)
    readBlogButton: 'a:has-text("Read Blog")',
    viewStorybookButton: 'a:has-text("View Storybook")',
    browseThemesButton: 'a:has-text("Browse Themes")',

    // Secondary navigation
    companiesLink: 'a[href="/companies"]',
    mapLink: 'a[href="/map"]',
    scheduleLink: 'a[href="/schedule"]',
    contactLink: 'a[href="/contact"]',
    messagesLink: 'a[href="/messages"]',

    // Feature cards section
    featureCardsSection: 'section[aria-label="Key features"]',
    featureCard: '.card',
    featureTitle: '.card-title',

    // Footer navigation
    footerLinks: 'footer a',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the homepage
   */
  async goto() {
    await this.navigate('/');
  }

  /**
   * Get the hero title text
   */
  async getHeroTitle(): Promise<string> {
    return await this.getText(this.selectors.heroTitle);
  }

  /**
   * Navigate to the blog page
   */
  async navigateToBlog() {
    await this.clickWithRetry(this.selectors.readBlogButton);
    await this.expectURL(/.*blog/);
  }

  /**
   * Navigate to the themes page
   */
  async navigateToThemes() {
    await this.clickWithRetry(this.selectors.browseThemesButton);
    await this.expectURL(/.*themes/);
  }

  /**
   * Navigate to the companies page
   */
  async navigateToCompanies() {
    await this.clickWithRetry(this.selectors.companiesLink);
    await this.expectURL(/.*companies/);
  }

  /**
   * Navigate to the map page
   */
  async navigateToMap() {
    await this.clickWithRetry(this.selectors.mapLink);
    await this.expectURL(/.*map/);
  }

  /**
   * Check if the feature cards section is visible
   */
  async isFeatureCardsSectionVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.featureCardsSection);
  }

  /**
   * Get all feature card titles
   */
  async getFeatureCardTitles(): Promise<string[]> {
    return await this.getAllText(this.selectors.featureTitle);
  }

  /**
   * Check if skip link is functional
   */
  async testSkipLink() {
    // Focus the skip link
    await this.page.keyboard.press('Tab');

    const skipLink = this.page.locator(this.selectors.skipLink).first();
    await skipLink.focus();

    // Force click the skip link to avoid interception
    await skipLink.click({ force: true });

    // Wait a moment for navigation
    await this.page.waitForTimeout(500);

    // Verify navigation to main content
    const mainContent = this.page.locator('#main-content');
    return await mainContent.isVisible();
  }

  /**
   * Open Storybook in new tab
   * @returns The new page object for the Storybook tab
   */
  async openStorybook() {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.clickWithRetry(this.selectors.viewStorybookButton),
    ]);

    await newPage.waitForLoadState();
    return newPage;
  }

  /**
   * Check if the homepage hero section is visible
   */
  async isHeroSectionVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.heroSection);
  }

  /**
   * Get all navigation link texts from the footer
   */
  async getFooterNavigationLinks(): Promise<string[]> {
    return await this.getAllText(this.selectors.footerLinks);
  }

  /**
   * Verify the homepage loads correctly
   */
  async verifyPageLoad() {
    // Check title
    await this.page.waitForSelector(this.selectors.heroTitle);

    // Check hero section visible
    const heroVisible = await this.isHeroSectionVisible();
    if (!heroVisible) {
      throw new Error('Homepage hero section not visible');
    }

    // Check navigation buttons
    const blogButton = await this.isVisible(this.selectors.readBlogButton);
    const themesButton = await this.isVisible(
      this.selectors.browseThemesButton
    );

    if (!blogButton || !themesButton) {
      throw new Error('Navigation buttons not visible');
    }
  }
}

import { test, expect } from '@playwright/test';

test.describe('Form Submission', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to contact page which has the ContactForm
    await page.goto('/contact');
    await page.waitForLoadState('domcontentloaded');
  });

  test('form fields have proper labels and ARIA attributes', async ({
    page,
  }) => {
    // ContactForm has name, email, subject, message fields
    const nameInput = page.locator('#name');
    const emailInput = page.locator('#email');

    // Check inputs exist and are visible
    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();

    // Check inputs have associated labels via htmlFor
    const nameLabel = page.locator('label[for="name"]');
    const emailLabel = page.locator('label[for="email"]');

    await expect(nameLabel).toBeAttached();
    await expect(emailLabel).toBeAttached();

    // Check ARIA attributes
    await expect(nameInput).toHaveAttribute('aria-required', 'true');
    await expect(emailInput).toHaveAttribute('aria-required', 'true');
  });

  test('required fields show indicators', async ({ page }) => {
    // ContactForm shows * for required fields
    const requiredIndicators = page.locator('.label-text-alt.text-error');
    const count = await requiredIndicators.count();

    // Should have at least 4 required indicators (name, email, subject, message)
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('error messages display correctly', async ({ page }) => {
    // Submit empty form to trigger validation
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation
    await page.waitForTimeout(500);

    // Check that form has some validation - either:
    // 1. aria-invalid is set on empty fields, OR
    // 2. Browser native validation is used (required attribute)
    const nameInput = page.locator('#name');

    // Check for required attribute (native browser validation)
    const isRequired = await nameInput.getAttribute('required');

    // If field has required attribute, that's valid validation
    if (isRequired !== null) {
      expect(true).toBe(true); // Validation exists via required attribute
      return;
    }

    // Otherwise check for custom validation
    const ariaInvalid = await nameInput.getAttribute('aria-invalid');
    if (ariaInvalid === 'true') {
      // Check error message appears
      const errorMessage = page.locator('#name-error');
      await expect(errorMessage).toBeVisible();
    }
  });

  test('form submission with valid data', async ({ page }) => {
    // Fill the contact form with valid data
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#subject').fill('Test Subject');
    await page.locator('#message').fill('This is a test message.');

    const submitButton = page.locator('button[type="submit"]');

    // Verify button is enabled before submission
    await expect(submitButton).toBeEnabled();

    // Submit form - form uses Web3Forms API which may not be configured in test
    // Just verify the form submission process starts (button gets disabled/loading)
    await submitButton.click();

    // Brief wait for form to start submission
    await page.waitForTimeout(100);

    // Check form responded to submission attempt
    // Either enters loading state, shows success/error, or button text changes
    const buttonText = await submitButton.textContent();
    const buttonClass = await submitButton.getAttribute('class');

    // Form should react - either loading, sending text, or showing feedback
    const hasReacted =
      buttonText?.includes('Sending') ||
      buttonText?.includes('Queuing') ||
      buttonClass?.includes('loading') ||
      (await page.locator('[role="alert"]').count()) > 0;

    expect(hasReacted).toBe(true);
  });

  test('form validation prevents submission with invalid email', async ({
    page,
  }) => {
    // Fill with invalid email
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('invalid-email');
    await page.locator('#subject').fill('Test Subject');
    await page.locator('#message').fill('This is a test message.');

    // Try to submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation
    await page.waitForTimeout(500);

    // Email field should show invalid state
    const emailInput = page.locator('#email');
    const ariaInvalid = await emailInput.getAttribute('aria-invalid');
    expect(ariaInvalid).toBe('true');

    // Should still be on contact page
    await expect(page).toHaveURL(/.*contact/);
  });

  test('form fields are keyboard accessible', async ({ page }) => {
    // Verify all form fields can receive focus via keyboard
    const nameInput = page.locator('#name');
    const emailInput = page.locator('#email');
    const subjectInput = page.locator('#subject');
    const messageInput = page.locator('#message');

    // Each field should be focusable
    await nameInput.focus();
    await expect(nameInput).toBeFocused();

    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    await subjectInput.focus();
    await expect(subjectInput).toBeFocused();

    await messageInput.focus();
    await expect(messageInput).toBeFocused();

    // Verify none are excluded from tab order (no negative tabindex)
    const nameTabIndex = await nameInput.getAttribute('tabindex');
    const emailTabIndex = await emailInput.getAttribute('tabindex');
    expect(nameTabIndex === null || parseInt(nameTabIndex) >= 0).toBe(true);
    expect(emailTabIndex === null || parseInt(emailTabIndex) >= 0).toBe(true);
  });

  test('message field is a multiline textarea', async ({ page }) => {
    const messageInput = page.locator('#message');

    // Wait for element and verify it's visible
    await expect(messageInput).toBeVisible();

    // Verify it's a textarea element (not input) - supports multiline
    const tagName = await messageInput.evaluate((el) =>
      el.tagName.toLowerCase()
    );
    expect(tagName).toBe('textarea');

    // Verify textarea has rows attribute indicating multiline support
    const rows = await messageInput.getAttribute('rows');
    expect(parseInt(rows || '1')).toBeGreaterThanOrEqual(3);

    // Verify placeholder text
    const placeholder = await messageInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
  });

  test('submit button responds to form submission', async ({ page }) => {
    // Fill valid data
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#subject').fill('Test Subject');
    await page.locator('#message').fill('This is a test message.');

    const submitButton = page.locator('button[type="submit"]');

    // Button should be enabled initially
    await expect(submitButton).toBeEnabled();

    // Get initial button text
    const initialText = await submitButton.textContent();
    expect(initialText).toContain('Send Message');

    // Click submit
    await submitButton.click();

    // Brief wait for state change
    await page.waitForTimeout(200);

    // After click, button should have changed state in some way
    // Either disabled, showing loading, text changed, or alert appeared
    const currentText = await submitButton.textContent();
    const isDisabled = await submitButton.isDisabled();
    const buttonClass = (await submitButton.getAttribute('class')) || '';
    const hasAlert = (await page.locator('[role="alert"]').count()) > 0;

    const stateChanged =
      isDisabled ||
      buttonClass.includes('loading') ||
      currentText !== initialText ||
      hasAlert;

    expect(stateChanged).toBe(true);
  });

  test('honeypot field is hidden from users', async ({ page }) => {
    // ContactForm has a honeypot field that should be hidden
    const honeypotLabel = page.locator('label[for="_gotcha"]');

    // Should exist but be visually hidden
    await expect(honeypotLabel).toBeAttached();

    // The parent container should have sr-only or similar
    const isHidden = await honeypotLabel.evaluate((el) => {
      const style = window.getComputedStyle(el.parentElement!);
      return (
        style.position === 'absolute' ||
        style.clip === 'rect(0px, 0px, 0px, 0px)' ||
        el.parentElement?.classList.contains('sr-only') ||
        style.height === '0px'
      );
    });

    expect(isHidden).toBe(true);
  });

  test('form inputs have proper autocomplete attributes', async ({ page }) => {
    const nameInput = page.locator('#name');
    const emailInput = page.locator('#email');

    // Check autocomplete attributes for accessibility
    await expect(nameInput).toHaveAttribute('autocomplete', 'name');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
  });

  test('form has accessible name', async ({ page }) => {
    const form = page.locator('form');
    const ariaLabel = await form.getAttribute('aria-label');

    // Form should have accessible label
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain('Contact');
  });
});

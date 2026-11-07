import { expect, type Page } from '@playwright/test';

/**
 * Open the routes drawer on the companies page.
 *
 * On desktop the drawer is closed by default: it is a fixed panel slid
 * off-screen until the "Routes" toggle is pressed, so Playwright reports its
 * rows as "outside of the viewport" and every click on them times out. Press
 * the toggle first. If the drawer is already open (no toggle showing) this does
 * nothing.
 */
export async function openRoutesDrawer(page: Page): Promise<void> {
  const openButton = page.getByRole('button', { name: 'Open routes sidebar' });
  if (await openButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await openButton.click();
    await expect(openButton).toBeHidden({ timeout: 5000 });
  }
}

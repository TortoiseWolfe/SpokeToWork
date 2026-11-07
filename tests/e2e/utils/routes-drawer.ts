import { expect, type Page } from '@playwright/test';

/**
 * Open the routes drawer on the companies page.
 *
 * On desktop the drawer is closed by default: it is a fixed panel slid
 * off-screen until the "Routes" toggle is pressed, so Playwright reports its
 * rows as "outside of the viewport" and every click on them times out. Press
 * the toggle first. If the drawer is already open (no toggle showing) this does
 * nothing.
 *
 * The page settles into one of two states: the toggle is showing (drawer
 * closed) or the drawer itself is showing (already open). Wait for either
 * before deciding. Locator.isVisible() does not wait at all (its timeout
 * option is ignored), so a toggle that renders a moment after the table made
 * this return early and leave the drawer shut.
 */
export async function openRoutesDrawer(page: Page): Promise<void> {
  const openButton = page.getByRole('button', { name: 'Open routes sidebar' });
  const drawer = page.locator('aside[aria-label="Route sidebar"]');

  await expect(openButton.or(drawer).first()).toBeVisible({ timeout: 15000 });

  if (await openButton.isVisible()) {
    await openButton.click();
    await expect(openButton).toBeHidden({ timeout: 5000 });
  }
  await expect(drawer).toBeVisible({ timeout: 5000 });
}

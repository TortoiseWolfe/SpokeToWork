/**
 * Cookie Consent Helpers for E2E Tests
 * Feature: 062-fix-e2e-auth
 *
 * Pre-seeds localStorage with accepted cookie consent to prevent
 * the cookie banner from blocking test interactions.
 */

import type { BrowserContext, Page } from '@playwright/test';

/**
 * Consent state format matching src/utils/consent-types.ts
 */
export interface ConsentState {
  necessary: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
  version: string;
  lastUpdated: number;
  method: 'explicit' | 'default' | 'implicit';
}

/**
 * Storage key used by the app for consent state
 */
export const CONSENT_STORAGE_KEY = 'cookie-consent';

/**
 * Generate a consent state object with all permissions accepted
 */
export function generateAcceptedConsentState(): ConsentState {
  const now = Date.now();
  return {
    necessary: true,
    functional: true,
    analytics: true,
    marketing: false, // Marketing typically stays off
    timestamp: now,
    version: '1.0.0',
    lastUpdated: now,
    method: 'explicit',
  };
}

/**
 * Pre-seed cookie consent in a page's localStorage
 * Use this for tests that need consent pre-seeded after page load
 *
 * @example
 * await preSeedCookieConsent(page);
 */
export async function preSeedCookieConsent(page: Page): Promise<void> {
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    { key: CONSENT_STORAGE_KEY, value: generateAcceptedConsentState() }
  );
}

/**
 * Clear cookie consent from localStorage
 * Use this for tests that need to verify banner behavior
 *
 * @example
 * await clearCookieConsent(page);
 */
export async function clearCookieConsent(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.removeItem(key);
  }, CONSENT_STORAGE_KEY);
}

/**
 * Get the current cookie consent state from localStorage
 */
export async function getCookieConsentState(
  page: Page
): Promise<ConsentState | null> {
  return page.evaluate((key) => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }, CONSENT_STORAGE_KEY);
}

/**
 * Generate storage state JSON for Playwright config
 * This can be used to create a fresh storage-state.json file
 */
export function generateStorageStateJSON(
  baseURL = 'http://localhost:3000'
): object {
  return {
    cookies: [],
    origins: [
      {
        origin: baseURL,
        localStorage: [
          {
            name: CONSENT_STORAGE_KEY,
            value: JSON.stringify(generateAcceptedConsentState()),
          },
        ],
      },
    ],
  };
}

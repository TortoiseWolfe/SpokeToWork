/**
 * Centralized validation patterns for consistent validation across the codebase.
 * All validation regexes should be defined here and imported where needed.
 *
 * Feature 050 - Code Consolidation: Email validation uses canonical auth validator
 *
 * @see specs/013-code-quality-cleanup/research.md - Pattern standardization
 */

import { isValidEmail as authIsValidEmail } from '@/lib/auth/email-validator';

/**
 * Email validation regex (RFC 5322 simplified)
 * Validates basic email format: local@domain.tld
 *
 * @deprecated Use isValidEmail() function instead for more comprehensive validation
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * UUID v4 validation regex (case-insensitive)
 * Validates format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate email format using the canonical auth email validator
 * Includes TLD validation and disposable email detection
 *
 * @param email - Email address to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  return authIsValidEmail(email);
}

/**
 * Validate UUID v4 format
 * @param uuid - UUID string to validate
 * @returns true if valid UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

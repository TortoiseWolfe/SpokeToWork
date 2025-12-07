/**
 * Centralized validation patterns for consistent validation across the codebase.
 * All validation regexes should be defined here and imported where needed.
 *
 * @see specs/013-code-quality-cleanup/research.md - Pattern standardization
 */

/**
 * Email validation regex (RFC 5322 simplified)
 * Validates basic email format: local@domain.tld
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * UUID v4 validation regex (case-insensitive)
 * Validates format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validate UUID v4 format
 * @param uuid - UUID string to validate
 * @returns true if valid UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

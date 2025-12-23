/**
 * Password Breach Checker
 * Uses Have I Been Pwned API with k-anonymity to check if passwords
 * have been exposed in known data breaches.
 *
 * How it works:
 * 1. Hash password with SHA-1
 * 2. Send only first 5 chars of hash to API (k-anonymity)
 * 3. API returns all matching hash suffixes
 * 4. Check locally if full hash is in returned list
 *
 * Privacy: The actual password never leaves the client.
 *
 * @see https://haveibeenpwned.com/API/v3#PwnedPasswords
 */

import { createLogger } from '@/lib/logger/logger';

const logger = createLogger('lib:auth:password-breach');

const HIBP_API_URL = 'https://api.pwnedpasswords.com/range';

export interface BreachCheckResult {
  /** Whether the password was found in breaches */
  breached: boolean;
  /** Number of times password appeared in breaches (0 if not breached) */
  count: number;
  /** Error message if check failed */
  error?: string;
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Hash password using SHA-1 (required by HIBP API)
 */
async function sha1Hash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  return bufferToHex(hashBuffer);
}

/**
 * Check if a password has been exposed in known data breaches.
 *
 * Uses k-anonymity model - only the first 5 characters of the SHA-1 hash
 * are sent to the API. The actual password never leaves the client.
 *
 * @param password - The password to check
 * @returns Promise with breach check result
 *
 * @example
 * ```ts
 * const result = await checkPasswordBreach('mypassword123');
 * if (result.breached) {
 *   console.log(`Password found in ${result.count} breaches!`);
 * }
 * ```
 */
export async function checkPasswordBreach(
  password: string
): Promise<BreachCheckResult> {
  if (!password) {
    return { breached: false, count: 0 };
  }

  try {
    // Hash the password with SHA-1
    const hash = await sha1Hash(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Query HIBP API with hash prefix (k-anonymity)
    const response = await fetch(`${HIBP_API_URL}/${prefix}`, {
      headers: {
        'Add-Padding': 'true', // Prevent response length analysis
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        logger.warn('HIBP rate limited');
        return { breached: false, count: 0, error: 'Rate limited' };
      }
      throw new Error(`HIBP API error: ${response.status}`);
    }

    const text = await response.text();

    // Parse response - each line is "SUFFIX:COUNT"
    const lines = text.split('\n');
    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':');
      if (hashSuffix?.trim() === suffix) {
        const count = parseInt(countStr?.trim() || '0', 10);
        logger.info('Password found in breach database', { count });
        return { breached: true, count };
      }
    }

    return { breached: false, count: 0 };
  } catch (error) {
    logger.error('Password breach check failed', { error });
    // Don't block user on API errors - fail open
    return {
      breached: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Check failed',
    };
  }
}

/**
 * Format breach warning message for display
 */
export function formatBreachWarning(count: number): string {
  if (count === 0) return '';

  if (count === 1) {
    return 'This password has appeared in a data breach. Consider using a different password.';
  }

  if (count < 100) {
    return `This password has appeared in ${count} data breaches. Consider using a different password.`;
  }

  if (count < 10000) {
    return `This password has appeared in ${count.toLocaleString()} data breaches. Please choose a stronger password.`;
  }

  return `This password has appeared in ${count.toLocaleString()} data breaches! Please choose a different password.`;
}

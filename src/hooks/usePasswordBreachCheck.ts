/**
 * Hook for checking passwords against breach databases
 *
 * Features:
 * - Debounced checking (waits for user to stop typing)
 * - Caches results to avoid duplicate API calls
 * - Non-blocking (warnings only, doesn't prevent form submission)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  checkPasswordBreach,
  formatBreachWarning,
  type BreachCheckResult,
} from '@/lib/auth/password-breach';

export interface UsePasswordBreachCheckOptions {
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
  /** Minimum password length before checking (default: 8) */
  minLength?: number;
  /** Whether the check is enabled (default: true) */
  enabled?: boolean;
}

export interface UsePasswordBreachCheckResult {
  /** Whether the password was found in breaches */
  isBreached: boolean;
  /** Number of times found in breaches */
  breachCount: number;
  /** Human-readable warning message */
  warning: string;
  /** Whether check is currently running */
  isChecking: boolean;
  /** Error message if check failed */
  error: string | null;
  /** Manually trigger a check */
  checkPassword: (password: string) => Promise<BreachCheckResult>;
}

/**
 * Hook to check if a password has been exposed in data breaches.
 *
 * Uses debouncing to avoid excessive API calls while typing.
 * Results are cached to prevent duplicate checks.
 *
 * @param password - The password to check
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function PasswordField() {
 *   const [password, setPassword] = useState('');
 *   const { isBreached, warning, isChecking } = usePasswordBreachCheck(password);
 *
 *   return (
 *     <div>
 *       <input
 *         type="password"
 *         value={password}
 *         onChange={(e) => setPassword(e.target.value)}
 *       />
 *       {isChecking && <span>Checking...</span>}
 *       {isBreached && <span className="text-warning">{warning}</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePasswordBreachCheck(
  password: string,
  options: UsePasswordBreachCheckOptions = {}
): UsePasswordBreachCheckResult {
  const { debounceMs = 500, minLength = 8, enabled = true } = options;

  const [isBreached, setIsBreached] = useState(false);
  const [breachCount, setBreachCount] = useState(0);
  const [warning, setWarning] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache to avoid rechecking the same password
  const cacheRef = useRef<Map<string, BreachCheckResult>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkPassword = useCallback(
    async (pwd: string): Promise<BreachCheckResult> => {
      // Check cache first
      const cached = cacheRef.current.get(pwd);
      if (cached) {
        return cached;
      }

      const result = await checkPasswordBreach(pwd);

      // Cache the result
      cacheRef.current.set(pwd, result);

      // Limit cache size
      if (cacheRef.current.size > 50) {
        const firstKey = cacheRef.current.keys().next().value;
        if (firstKey) {
          cacheRef.current.delete(firstKey);
        }
      }

      return result;
    },
    []
  );

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset state if password is too short or feature disabled
    if (!enabled || !password || password.length < minLength) {
      setIsBreached(false);
      setBreachCount(0);
      setWarning('');
      setIsChecking(false);
      setError(null);
      return;
    }

    // Check cache immediately
    const cached = cacheRef.current.get(password);
    if (cached) {
      setIsBreached(cached.breached);
      setBreachCount(cached.count);
      setWarning(formatBreachWarning(cached.count));
      setError(cached.error || null);
      return;
    }

    // Debounce the API call
    setIsChecking(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await checkPassword(password);
        setIsBreached(result.breached);
        setBreachCount(result.count);
        setWarning(formatBreachWarning(result.count));
        setError(result.error || null);
      } finally {
        setIsChecking(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [password, debounceMs, minLength, enabled, checkPassword]);

  return {
    isBreached,
    breachCount,
    warning,
    isChecking,
    error,
    checkPassword,
  };
}

export default usePasswordBreachCheck;

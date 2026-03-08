'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  checkRateLimit,
  recordFailedAttempt,
  formatLockoutTime,
} from '@/lib/auth/rate-limit-check';
import { validateEmail } from '@/lib/auth/email-validator';
import { logAuthEvent } from '@/lib/auth/audit-logger';
import PasswordStrengthIndicator from '@/components/atomic/PasswordStrengthIndicator';
import { createLogger } from '@/lib/logger/logger';
import { usePasswordBreachCheck } from '@/hooks/usePasswordBreachCheck';

const logger = createLogger('components:auth:SignUpForm');

export interface SignUpFormProps {
  /** Callback on successful sign up */
  onSuccess?: () => void;
  /** Role requested at signup (worker or employer) */
  requestedRole?: 'worker' | 'employer';
  /** Additional CSS classes */
  className?: string;
}

/**
 * SignUpForm component
 * Email/password sign-up with server-side rate limiting
 *
 * @category molecular
 */
export default function SignUpForm({
  onSuccess,
  requestedRole,
  className = '',
}: SignUpFormProps) {
  const { signUp, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check password against breach databases (HIBP)
  const {
    isBreached,
    warning: breachWarning,
    isChecking: isCheckingBreach,
  } = usePasswordBreachCheck(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Enhanced email validation (REQ-SEC-004)
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.errors[0] || 'Invalid email address');
      return;
    }

    // Show warning for disposable emails
    if (emailValidation.warnings.length > 0) {
      logger.warn('Email validation warnings', {
        warnings: emailValidation.warnings,
      });
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    // Confirm password match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Check server-side rate limit for sign-up attempts (REQ-SEC-003)
    const rateLimit = await checkRateLimit(email, 'sign_up');

    if (!rateLimit.allowed) {
      const timeUntilReset = rateLimit.locked_until
        ? formatLockoutTime(rateLimit.locked_until)
        : '15 minutes';
      setError(
        `Too many sign-up attempts. Please try again in ${timeUntilReset}.`
      );
      return;
    }

    setLoading(true);

    // Record every sign-up attempt before calling Supabase — Supabase returns
    // success for existing emails to prevent enumeration, so the counter must
    // be incremented unconditionally rather than only on error.
    await recordFailedAttempt(email, 'sign_up');

    const { error: signUpError } = await signUp(email, password, {
      rememberMe,
      requestedRole,
    });

    setLoading(false);

    if (signUpError) {
      // Log failed sign-up attempt (T034)
      await logAuthEvent({
        event_type: 'sign_up',
        event_data: { email, provider: 'email' },
        success: false,
        error_message: signUpError.message,
      });

      setError(signUpError.message);
    } else {
      // Log successful sign-up (T034)
      if (user) {
        await logAuthEvent({
          user_id: user.id,
          event_type: 'sign_up',
          event_data: { email, provider: 'email' },
        });
      }

      // Redirect immediately — key derivation runs in background
      onSuccess?.();

      // Initialize encryption keys and send welcome message (Feature 004) — fire-and-forget
      import('@/services/messaging/key-service')
        .then(({ keyManagementService }) => {
          logger.info('New user - initializing encryption keys');
          return keyManagementService.initializeKeys(password);
        })
        .then((keyPair) => {
          import('@/services/messaging/welcome-service')
            .then(({ welcomeService }) => {
              const { createClient } = require('@/lib/supabase/client');
              const supabase = createClient();
              supabase.auth
                .getUser()
                .then(({ data }: { data: { user: { id: string } | null } }) => {
                  if (
                    data?.user?.id &&
                    keyPair.privateKey &&
                    keyPair.publicKeyJwk
                  ) {
                    welcomeService
                      .sendWelcomeMessage(
                        data.user.id,
                        keyPair.privateKey,
                        keyPair.publicKeyJwk
                      )
                      .catch((err: Error) => {
                        logger.error('Welcome message failed', { error: err });
                      });
                  }
                });
            })
            .catch((err: Error) => {
              logger.error('Failed to load welcome service', { error: err });
            });
        })
        .catch((err: Error) => {
          logger.error('Failed to initialize encryption keys', { error: err });
        });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4${className ? ` ${className}` : ''}`}
    >
      <div className="form-control">
        <label className="label" htmlFor="email">
          <span className="label-text">Email</span>
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input input-bordered min-h-11"
          placeholder="you@example.com"
          required
          disabled={loading}
        />
      </div>

      <div className="form-control">
        <label className="label" htmlFor="password">
          <span className="label-text">Password</span>
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input input-bordered min-h-11"
          placeholder="••••••••"
          required
          disabled={loading}
        />
        {/* Password strength indicator (T042) */}
        <div className="mt-2">
          <PasswordStrengthIndicator password={password} />
        </div>
        {/* Password breach warning (HIBP) */}
        {isCheckingBreach && password.length >= 8 && (
          <div className="text-base-content/80 mt-1 text-sm">
            <span className="loading loading-spinner loading-xs mr-1"></span>
            Checking password security...
          </div>
        )}
        {isBreached && !isCheckingBreach && (
          <div className="alert alert-warning mt-2 py-2 text-sm" role="alert">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{breachWarning}</span>
          </div>
        )}
      </div>

      <div className="form-control">
        <label className="label" htmlFor="confirm-password">
          <span className="label-text">Confirm Password</span>
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input input-bordered min-h-11"
          placeholder="••••••••"
          required
          disabled={loading}
        />
      </div>

      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-2">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="checkbox min-h-11 min-w-11"
            disabled={loading}
          />
          <span className="label-text">Remember me</span>
        </label>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" aria-live="assertive">
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary min-h-11 w-full"
        disabled={loading}
      >
        {loading ? (
          <span className="loading loading-spinner loading-md"></span>
        ) : (
          'Sign Up'
        )}
      </button>
    </form>
  );
}

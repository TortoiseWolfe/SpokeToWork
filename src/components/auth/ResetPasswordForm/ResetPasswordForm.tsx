'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { validatePassword } from '@/lib/auth/password-validator';
import { usePasswordBreachCheck } from '@/hooks/usePasswordBreachCheck';
import PasswordStrengthIndicator from '@/components/atomic/PasswordStrengthIndicator';

export interface ResetPasswordFormProps {
  /** Callback on success */
  onSuccess?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ResetPasswordForm component
 * Reset password with token validation
 *
 * @category molecular
 */
export default function ResetPasswordForm({
  onSuccess,
  className = '',
}: ResetPasswordFormProps) {
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      onSuccess?.();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4${className ? ` ${className}` : ''}`}
    >
      <div className="form-control">
        <label className="label" htmlFor="password">
          <span className="label-text">New Password</span>
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
        {/* Password strength indicator */}
        <div className="mt-2">
          <PasswordStrengthIndicator password={password} />
        </div>
        {/* Password breach warning (HIBP) */}
        {isCheckingBreach && password.length >= 8 && (
          <div className="text-base-content/60 mt-1 text-sm">
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

      {error && (
        <div className="alert alert-error">
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
          'Reset Password'
        )}
      </button>
    </form>
  );
}

'use client';

import React, { useEffect } from 'react';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

export interface ApplicationToastProps {
  application: EmployerApplication | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

/**
 * ApplicationToast - Toast notification for new job applications
 *
 * Auto-dismisses after a configurable duration. Shows applicant name,
 * position, and company.
 *
 * @category atomic
 * @see specs/063-employer-dashboard/spec.md
 */
export default function ApplicationToast({
  application,
  onDismiss,
  autoDismissMs = 8000,
}: ApplicationToastProps) {
  useEffect(() => {
    if (!application) return;
    const timer = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(timer);
  }, [application, onDismiss, autoDismissMs]);

  if (!application) return null;

  return (
    <div
      className="toast toast-top toast-center z-50"
      role="status"
      aria-live="polite"
    >
      <div className="alert alert-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 shrink-0 stroke-current"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <span className="font-semibold">New Application</span>
          <p className="text-sm">
            {application.applicant_name} applied for{' '}
            {application.position_title || 'a position'} at{' '}
            {application.company_name}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="btn btn-ghost btn-sm min-h-11 min-w-11"
          aria-label="Dismiss notification"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

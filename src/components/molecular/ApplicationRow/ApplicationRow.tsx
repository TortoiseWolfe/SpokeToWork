'use client';

import React from 'react';
import type {
  JobApplication,
  JobApplicationStatus,
  ApplicationOutcome,
} from '@/types/company';
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  OUTCOME_LABELS,
  OUTCOME_COLORS,
  WORK_LOCATION_LABELS,
} from '@/types/company';

export interface ApplicationRowProps {
  /** Job application data to display */
  application: JobApplication;
  /** Company name for display */
  companyName?: string;
  /** Callback when row is clicked */
  onClick?: (application: JobApplication) => void;
  /** Callback when edit is requested */
  onEdit?: (application: JobApplication) => void;
  /** Callback when delete is requested */
  onDelete?: (application: JobApplication) => void;
  /** Callback when status is changed */
  onStatusChange?: (
    application: JobApplication,
    status: JobApplicationStatus
  ) => void;
  /** Callback when outcome is changed */
  onOutcomeChange?: (
    application: JobApplication,
    outcome: ApplicationOutcome
  ) => void;
  /** Whether this row is selected */
  isSelected?: boolean;
  /** Show company name column */
  showCompany?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

const PRIORITY_LABELS: Record<number, string> = {
  1: '!!',
  2: '!',
  3: '',
  4: '',
  5: '',
};

/**
 * ApplicationRow component
 *
 * Displays a single job application in a table with:
 * - Position title and work location
 * - Status and outcome badges
 * - Date applied and interview date
 * - Quick action buttons
 *
 * @category molecular
 */
export default function ApplicationRow({
  application,
  companyName,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
  onOutcomeChange,
  isSelected = false,
  showCompany = false,
  className = '',
  testId = 'application-row',
}: ApplicationRowProps) {
  const handleRowClick = () => {
    if (onClick) onClick(application);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(application);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(application);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(application, e.target.value as JobApplicationStatus);
    }
  };

  const handleOutcomeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (onOutcomeChange) {
      onOutcomeChange(application, e.target.value as ApplicationOutcome);
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    try {
      // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone shift
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString();
    } catch {
      return '-';
    }
  };

  return (
    <tr
      data-testid={testId}
      className={`hover cursor-pointer ${isSelected ? 'active' : ''} ${!application.is_active ? 'opacity-60' : ''} ${className}`}
      onClick={handleRowClick}
    >
      {/* Position & Work Location */}
      <td>
        <div className="flex items-center gap-2">
          {application.priority <= 2 && (
            <span
              className="text-warning font-bold"
              title={`Priority ${application.priority}`}
            >
              {PRIORITY_LABELS[application.priority]}
            </span>
          )}
          <div>
            <div className="flex items-center gap-2 font-bold">
              {application.position_title || 'Untitled Position'}
              {!application.is_active && (
                <span className="badge badge-ghost badge-xs">Inactive</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm opacity-70">
              <span>
                {WORK_LOCATION_LABELS[application.work_location_type]}
              </span>
              {/* Job links: Careers | Apply | Status */}
              {(application.job_link ||
                application.position_url ||
                application.status_url) && (
                <span className="flex gap-1 text-xs">
                  {application.job_link && (
                    <a
                      href={application.job_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-secondary"
                      onClick={(e) => e.stopPropagation()}
                      title="Careers page"
                    >
                      Careers
                    </a>
                  )}
                  {application.position_url && (
                    <>
                      {application.job_link && <span>|</span>}
                      <a
                        href={application.position_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-primary"
                        onClick={(e) => e.stopPropagation()}
                        title="Apply to position"
                      >
                        Apply
                      </a>
                    </>
                  )}
                  {application.status_url && (
                    <>
                      {(application.job_link || application.position_url) && (
                        <span>|</span>
                      )}
                      <a
                        href={application.status_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="link link-accent"
                        onClick={(e) => e.stopPropagation()}
                        title="Check application status"
                      >
                        Status
                      </a>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Company (optional) */}
      {showCompany && (
        <td className="hidden md:table-cell">
          <span className="text-sm">{companyName || '-'}</span>
        </td>
      )}

      {/* Status */}
      <td>
        {onStatusChange ? (
          <select
            className={`select select-ghost select-xs ${JOB_STATUS_COLORS[application.status]}`}
            value={application.status}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            aria-label="Change status"
          >
            {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`badge ${JOB_STATUS_COLORS[application.status]} badge-sm`}
          >
            {JOB_STATUS_LABELS[application.status]}
          </span>
        )}
      </td>

      {/* Outcome */}
      <td className="hidden sm:table-cell">
        {onOutcomeChange ? (
          <select
            className={`select select-ghost select-xs ${OUTCOME_COLORS[application.outcome]}`}
            value={application.outcome}
            onChange={handleOutcomeChange}
            onClick={(e) => e.stopPropagation()}
            aria-label="Change outcome"
          >
            {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`badge ${OUTCOME_COLORS[application.outcome]} badge-sm`}
          >
            {OUTCOME_LABELS[application.outcome]}
          </span>
        )}
      </td>

      {/* Date Applied */}
      <td className="hidden lg:table-cell">
        <span className="text-sm">{formatDate(application.date_applied)}</span>
      </td>

      {/* Interview Date */}
      <td className="hidden lg:table-cell">
        <span className="text-sm">
          {formatDate(application.interview_date)}
        </span>
      </td>

      {/* Actions */}
      <td>
        <div className="flex gap-1">
          {onEdit && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={handleEdit}
              aria-label={`Edit ${application.position_title || 'application'}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="btn btn-ghost btn-xs text-error"
              onClick={handleDelete}
              aria-label={`Delete ${application.position_title || 'application'}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

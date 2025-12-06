'use client';

import React from 'react';
import type {
  Company,
  CompanyWithApplications,
  ApplicationStatus,
} from '@/types/company';
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  OUTCOME_LABELS,
  OUTCOME_COLORS,
} from '@/types/company';

export interface CompanyRowProps {
  /** Company data to display (with or without applications) */
  company: Company | CompanyWithApplications;
  /** Callback when row is clicked */
  onClick?: (company: Company | CompanyWithApplications) => void;
  /** Callback when edit is requested */
  onEdit?: (company: Company | CompanyWithApplications) => void;
  /** Callback when delete is requested */
  onDelete?: (company: Company | CompanyWithApplications) => void;
  /** Callback when status is changed (legacy - for companies without applications) */
  onStatusChange?: (company: Company, status: ApplicationStatus) => void;
  /** Whether this row is selected */
  isSelected?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

// Legacy company status colors (for backward compatibility)
const STATUS_COLORS: Record<ApplicationStatus, string> = {
  not_contacted: 'badge-ghost',
  contacted: 'badge-info',
  follow_up: 'badge-warning',
  meeting: 'badge-primary',
  outcome_positive: 'badge-success',
  outcome_negative: 'badge-error',
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  meeting: 'Meeting',
  outcome_positive: 'Positive',
  outcome_negative: 'Negative',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: '!!',
  2: '!',
  3: '',
  4: '',
  5: '',
};

/**
 * Type guard to check if company has applications data
 */
function hasApplications(
  company: Company | CompanyWithApplications
): company is CompanyWithApplications {
  return 'applications' in company && 'total_applications' in company;
}

/**
 * CompanyRow component
 *
 * Displays a single company in the company table with:
 * - Company name and status badge
 * - Contact information
 * - Priority indicator
 * - Quick action buttons
 *
 * @category molecular
 */
export default function CompanyRow({
  company,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
  isSelected = false,
  className = '',
  testId = 'company-row',
}: CompanyRowProps) {
  const handleRowClick = () => {
    if (onClick) onClick(company);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(company);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(company);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    if (onStatusChange) {
      onStatusChange(company, e.target.value as ApplicationStatus);
    }
  };

  return (
    <tr
      data-testid={testId}
      className={`hover cursor-pointer ${isSelected ? 'active' : ''} ${!company.is_active ? 'opacity-60' : ''} ${className}`}
      onClick={handleRowClick}
    >
      {/* Name & Status */}
      <td>
        <div className="flex items-center gap-2">
          {company.priority <= 2 && (
            <span
              className="text-warning font-bold"
              title={`Priority ${company.priority}`}
            >
              {PRIORITY_LABELS[company.priority]}
            </span>
          )}
          <div>
            <div className="flex items-center gap-2 font-bold">
              {company.name}
              {company.extended_range && (
                <span
                  className="badge badge-warning badge-xs"
                  title="Extended range"
                >
                  Far
                </span>
              )}
              {!company.is_active && (
                <span className="badge badge-ghost badge-xs">Inactive</span>
              )}
            </div>
            <div className="text-sm opacity-70">{company.address}</div>
          </div>
        </div>
      </td>

      {/* Contact */}
      <td className="hidden md:table-cell">
        {company.contact_name && (
          <div className="text-sm">
            <div>{company.contact_name}</div>
            {company.contact_title && (
              <div className="text-xs opacity-70">{company.contact_title}</div>
            )}
          </div>
        )}
      </td>

      {/* Applications / Status */}
      <td>
        {hasApplications(company) ? (
          // Show job application status when available
          <div className="flex flex-col gap-1">
            {company.latest_application ? (
              <div className="flex items-center gap-1">
                {company.latest_application.status === 'not_applied' ? (
                  // Show "Tracking" for not_applied since they haven't actually applied
                  <span className="badge badge-ghost badge-sm">Tracking</span>
                ) : (
                  <>
                    <span
                      className={`badge ${JOB_STATUS_COLORS[company.latest_application.status]} badge-sm`}
                    >
                      {JOB_STATUS_LABELS[company.latest_application.status]}
                    </span>
                    {company.latest_application.outcome !== 'pending' && (
                      <span
                        className={`badge ${OUTCOME_COLORS[company.latest_application.outcome]} badge-sm`}
                      >
                        {OUTCOME_LABELS[company.latest_application.outcome]}
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <span className="badge badge-ghost badge-sm">
                No applications
              </span>
            )}
          </div>
        ) : onStatusChange ? (
          // Legacy: show company status dropdown
          <select
            className={`select select-ghost select-xs ${STATUS_COLORS[company.status]}`}
            value={company.status}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            aria-label="Change status"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : (
          // Legacy: show company status badge
          <span className={`badge ${STATUS_COLORS[company.status]} badge-sm`}>
            {STATUS_LABELS[company.status]}
          </span>
        )}
      </td>

      {/* Priority */}
      <td className="hidden text-center sm:table-cell">
        <span
          className={`badge ${company.priority <= 2 ? 'badge-warning' : company.priority >= 4 ? 'badge-ghost' : 'badge-outline'} badge-sm`}
          title={`Priority ${company.priority} (1=highest, 5=lowest)`}
        >
          {company.priority}
        </span>
      </td>

      {/* Applications Count */}
      <td className="hidden text-center md:table-cell">
        {hasApplications(company) ? (
          (() => {
            const appliedCount = company.applications.filter(
              (a) => a.status !== 'not_applied'
            ).length;
            return appliedCount > 0 ? (
              <span className="badge badge-info badge-sm">{appliedCount}</span>
            ) : (
              <span className="text-base-content/50">-</span>
            );
          })()
        ) : (
          <span className="text-base-content/50">-</span>
        )}
      </td>

      {/* Website */}
      <td className="hidden lg:table-cell">
        {company.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary inline-block max-w-[150px] truncate text-sm"
            onClick={(e) => e.stopPropagation()}
            title={company.website}
          >
            {(() => {
              try {
                return new URL(company.website).hostname.replace(/^www\./, '');
              } catch {
                return company.website;
              }
            })()}
          </a>
        )}
      </td>

      {/* Actions */}
      <td>
        <div className="flex gap-1">
          {onEdit && (
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={handleEdit}
              aria-label={`Edit ${company.name}`}
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
              aria-label={`Delete ${company.name}`}
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

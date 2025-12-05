'use client';

import React, { useEffect, useRef } from 'react';
import type {
  CompanyWithApplications,
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

export interface CompanyDetailDrawerProps {
  /** Company to display (with applications) */
  company: CompanyWithApplications | null;
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Callback when drawer is closed */
  onClose: () => void;
  /** Callback when edit company is requested */
  onEditCompany?: (company: CompanyWithApplications) => void;
  /** Callback when add application is requested */
  onAddApplication?: (company: CompanyWithApplications) => void;
  /** Callback when edit application is requested */
  onEditApplication?: (application: JobApplication) => void;
  /** Callback when delete application is requested */
  onDeleteApplication?: (application: JobApplication) => void;
  /** Callback when application status is changed */
  onStatusChange?: (
    application: JobApplication,
    status: JobApplicationStatus
  ) => void;
  /** Callback when application outcome is changed */
  onOutcomeChange?: (
    application: JobApplication,
    outcome: ApplicationOutcome
  ) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * CompanyDetailDrawer component
 *
 * Slide-out drawer that displays company details and job applications.
 * Features:
 * - Company header with name, address, contact info
 * - List of all applications for this company
 * - Add/edit/delete application actions
 * - Click outside or X to close
 *
 * @category organisms
 */
export default function CompanyDetailDrawer({
  company,
  isOpen,
  onClose,
  onEditCompany,
  onAddApplication,
  onEditApplication,
  onDeleteApplication,
  onStatusChange,
  onOutcomeChange,
  className = '',
  testId = 'company-detail-drawer',
}: CompanyDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        drawerRef.current &&
        !drawerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  if (!company) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid={`${testId}-backdrop`}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        data-testid={testId}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={`bg-base-100 fixed top-0 right-0 z-50 h-full w-full max-w-md transform shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${className}`}
      >
        {/* Header */}
        <div className="bg-base-200 flex items-start justify-between border-b p-4">
          <div className="flex-1">
            <h2
              id="drawer-title"
              className="flex items-center gap-2 text-xl font-bold"
            >
              {company.name}
              {!company.is_active && (
                <span className="badge badge-ghost badge-sm">Inactive</span>
              )}
            </h2>
            <p className="text-base-content/70 text-sm">{company.address}</p>
            {company.contact_name && (
              <p className="text-base-content/70 mt-1 text-sm">
                Contact: {company.contact_name}
                {company.contact_title && ` (${company.contact_title})`}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {onEditCompany && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onEditCompany(company)}
                aria-label="Edit company"
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
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Close drawer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Company Info */}
        <div className="border-b p-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {company.website && (
              <div>
                <span className="text-base-content/70">Website:</span>{' '}
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary"
                >
                  Visit
                </a>
              </div>
            )}
            {company.email && (
              <div>
                <span className="text-base-content/70">Email:</span>{' '}
                <a
                  href={`mailto:${company.email}`}
                  className="link link-primary"
                >
                  {company.email}
                </a>
              </div>
            )}
            {company.phone && (
              <div>
                <span className="text-base-content/70">Phone:</span>{' '}
                <a href={`tel:${company.phone}`} className="link link-primary">
                  {company.phone}
                </a>
              </div>
            )}
            <div>
              <span className="text-base-content/70">Priority:</span>{' '}
              <span
                className={
                  company.priority <= 2 ? 'text-warning font-bold' : ''
                }
              >
                {company.priority}
              </span>
            </div>
          </div>
          {company.notes && (
            <div className="mt-2">
              <span className="text-base-content/70 text-sm">Notes:</span>
              <p className="bg-base-200 mt-1 rounded p-2 text-sm">
                {company.notes}
              </p>
            </div>
          )}
        </div>

        {/* Applications Section */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ height: 'calc(100% - 200px)' }}
        >
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-semibold">
              Applications ({company.total_applications})
            </h3>
            {onAddApplication && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onAddApplication(company)}
                aria-label="Add application"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add
              </button>
            )}
          </div>

          {/* Applications List */}
          <div className="flex-1 overflow-y-auto p-4">
            {company.applications.length === 0 ? (
              <div className="text-base-content/50 py-8 text-center">
                <p>No applications yet.</p>
                {onAddApplication && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm mt-2"
                    onClick={() => onAddApplication(company)}
                  >
                    Add your first application
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {company.applications.map((app) => (
                  <div
                    key={app.id}
                    data-testid={`application-card-${app.id}`}
                    className={`card bg-base-200 ${!app.is_active ? 'opacity-60' : ''}`}
                  >
                    <div className="card-body p-3">
                      {/* Position Title */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="flex items-center gap-2 font-semibold">
                            {app.priority <= 2 && (
                              <span className="text-warning">
                                {app.priority === 1 ? '!!' : '!'}
                              </span>
                            )}
                            {app.position_title || 'Untitled Position'}
                            {!app.is_active && (
                              <span className="badge badge-ghost badge-xs">
                                Inactive
                              </span>
                            )}
                          </h4>
                          <p className="text-base-content/70 text-sm">
                            {WORK_LOCATION_LABELS[app.work_location_type]}
                            {app.job_link && (
                              <>
                                {' '}
                                <a
                                  href={app.job_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="link link-primary text-xs"
                                >
                                  View Job
                                </a>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {onEditApplication && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => onEditApplication(app)}
                              aria-label={`Edit ${app.position_title || 'application'}`}
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
                          {onDeleteApplication && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => onDeleteApplication(app)}
                              aria-label={`Delete ${app.position_title || 'application'}`}
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
                      </div>

                      {/* Status & Outcome */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {onStatusChange ? (
                          <select
                            className={`select select-bordered select-xs ${JOB_STATUS_COLORS[app.status]}`}
                            value={app.status}
                            onChange={(e) =>
                              onStatusChange(
                                app,
                                e.target.value as JobApplicationStatus
                              )
                            }
                            aria-label="Change status"
                          >
                            {Object.entries(JOB_STATUS_LABELS).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        ) : (
                          <span
                            className={`badge ${JOB_STATUS_COLORS[app.status]} badge-sm`}
                          >
                            {JOB_STATUS_LABELS[app.status]}
                          </span>
                        )}

                        {onOutcomeChange ? (
                          <select
                            className={`select select-bordered select-xs ${OUTCOME_COLORS[app.outcome]}`}
                            value={app.outcome}
                            onChange={(e) =>
                              onOutcomeChange(
                                app,
                                e.target.value as ApplicationOutcome
                              )
                            }
                            aria-label="Change outcome"
                          >
                            {Object.entries(OUTCOME_LABELS).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              )
                            )}
                          </select>
                        ) : (
                          <span
                            className={`badge ${OUTCOME_COLORS[app.outcome]} badge-sm`}
                          >
                            {OUTCOME_LABELS[app.outcome]}
                          </span>
                        )}
                      </div>

                      {/* Dates */}
                      <div className="text-base-content/70 mt-2 text-xs">
                        {app.date_applied && (
                          <span className="mr-3">
                            Applied: {formatDate(app.date_applied)}
                          </span>
                        )}
                        {app.interview_date && (
                          <span>
                            Interview: {formatDate(app.interview_date)}
                          </span>
                        )}
                      </div>

                      {/* Notes */}
                      {app.notes && (
                        <p className="text-base-content/70 mt-1 text-xs">
                          {app.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

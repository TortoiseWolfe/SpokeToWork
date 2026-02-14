'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import type {
  CompanyWithApplications,
  UnifiedCompany,
  JobApplication,
  JobApplicationStatus,
  ApplicationOutcome,
  CompanySource,
} from '@/types/company';
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  OUTCOME_LABELS,
  OUTCOME_COLORS,
  WORK_LOCATION_LABELS,
  COMPANY_SOURCE_LABELS,
  COMPANY_SOURCE_COLORS,
} from '@/types/company';

/** All company types supported by drawer */
type CompanyType = CompanyWithApplications | UnifiedCompany;

/** Type guard to check if company is from unified view (Feature 012) */
function isUnifiedCompany(company: CompanyType): company is UnifiedCompany {
  return (
    'source' in company &&
    ('tracking_id' in company || 'private_company_id' in company)
  );
}

/** Company tracking status for unified companies */
type CompanyTrackingStatus =
  | 'not_contacted'
  | 'contacted'
  | 'follow_up'
  | 'applied'
  | 'not_interested';

/** Labels for tracking status badges */
const TRACKING_STATUS_LABELS: Record<CompanyTrackingStatus, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  applied: 'Applied',
  not_interested: 'Not Interested',
};

/** Colors for tracking status badges */
const TRACKING_STATUS_COLORS: Record<CompanyTrackingStatus, string> = {
  not_contacted: 'badge-ghost',
  contacted: 'badge-info',
  follow_up: 'badge-warning',
  applied: 'badge-success',
  not_interested: 'badge-error',
};

export interface CompanyDetailDrawerProps {
  /** Company to display (with applications or unified) */
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
  /** Callback when tracking status is changed (for unified companies - T085) */
  onTrackingStatusChange?: (
    company: UnifiedCompany,
    status: CompanyTrackingStatus
  ) => void;
  /** Callback when tracking priority is changed (for unified companies - T085) */
  onTrackingPriorityChange?: (
    company: UnifiedCompany,
    priority: number
  ) => void;
  /** Callback when submit to community is requested (T099) */
  onSubmitToCommunity?: (company: UnifiedCompany) => Promise<void>;
  /** Callback when suggest edit is requested (T106) */
  onSuggestEdit?: (
    company: UnifiedCompany,
    field: string,
    oldValue: string | null,
    newValue: string
  ) => Promise<void>;
  /** Callback when add to route is requested (Feature 041) */
  onAddToRoute?: (company: CompanyWithApplications | UnifiedCompany) => void;
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
function CompanyDetailDrawer({
  company,
  isOpen,
  onClose,
  onEditCompany,
  onAddApplication,
  onEditApplication,
  onDeleteApplication,
  onStatusChange,
  onOutcomeChange,
  onTrackingStatusChange,
  onTrackingPriorityChange,
  onSubmitToCommunity,
  onSuggestEdit,
  onAddToRoute,
  className = '',
  testId = 'company-detail-drawer',
}: CompanyDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // T086: Optimistic UI state for tracking updates
  const [optimisticStatus, setOptimisticStatus] =
    useState<CompanyTrackingStatus | null>(null);
  const [optimisticPriority, setOptimisticPriority] = useState<number | null>(
    null
  );
  const [isUpdating, setIsUpdating] = useState(false);
  // T099: Submit to community state
  const [isSubmitting, setIsSubmitting] = useState(false);
  // T106/T107: Edit suggestion state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Reset optimistic state when company changes
  useEffect(() => {
    setOptimisticStatus(null);
    setOptimisticPriority(null);
    setIsUpdating(false);
    setIsSubmitting(false);
    setEditingField(null);
    setEditValue('');
    setIsSubmittingEdit(false);
  }, [company?.id]);

  // Handle optimistic status change
  const handleTrackingStatusChange = async (
    comp: UnifiedCompany,
    newStatus: CompanyTrackingStatus
  ) => {
    if (!onTrackingStatusChange) return;

    // Optimistic update
    setOptimisticStatus(newStatus);
    setIsUpdating(true);

    try {
      await onTrackingStatusChange(comp, newStatus);
      // Success - clear optimistic state (real data will come from prop)
      setOptimisticStatus(null);
    } catch {
      // Revert optimistic update on error
      setOptimisticStatus(null);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle optimistic priority change
  const handleTrackingPriorityChange = async (
    comp: UnifiedCompany,
    newPriority: number
  ) => {
    if (!onTrackingPriorityChange) return;

    // Optimistic update
    setOptimisticPriority(newPriority);
    setIsUpdating(true);

    try {
      await onTrackingPriorityChange(comp, newPriority);
      // Success - clear optimistic state
      setOptimisticPriority(null);
    } catch {
      // Revert optimistic update on error
      setOptimisticPriority(null);
    } finally {
      setIsUpdating(false);
    }
  };

  // T099: Handle submit to community
  const handleSubmitToCommunity = async (comp: UnifiedCompany) => {
    if (!onSubmitToCommunity) return;

    setIsSubmitting(true);
    try {
      await onSubmitToCommunity(comp);
    } finally {
      setIsSubmitting(false);
    }
  };

  // T106/T107: Handle suggest edit
  const handleStartEdit = (field: string, currentValue: string | null) => {
    setEditingField(field);
    setEditValue(currentValue ?? '');
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSubmitEdit = async (
    comp: UnifiedCompany,
    field: string,
    oldValue: string | null
  ) => {
    if (!onSuggestEdit || !editValue.trim()) return;

    setIsSubmittingEdit(true);
    try {
      await onSuggestEdit(comp, field, oldValue, editValue.trim());
      setEditingField(null);
      setEditValue('');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Don't close if clicking inside the drawer
      if (drawerRef.current?.contains(target)) {
        return;
      }

      // Don't close if clicking inside a modal (e.g., ApplicationForm modal)
      const modal = document.querySelector('.modal.modal-open');
      if (modal?.contains(target)) {
        return;
      }

      onClose();
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
      // Parse YYYY-MM-DD as local date (not UTC) to avoid timezone shift
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString();
    } catch {
      return '-';
    }
  };

  if (!company) return null;

  // Check if this is a unified company (no applications array)
  const hasApplications =
    'applications' in company && Array.isArray(company.applications);
  const applications = hasApplications
    ? (company as CompanyWithApplications).applications
    : [];

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
        className={`bg-base-100 fixed top-0 right-0 z-50 flex h-full w-full max-w-md transform flex-col shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${className}`}
      >
        {/* Header */}
        <div className="bg-base-200 flex flex-shrink-0 items-start justify-between border-b p-4">
          <div className="flex-1">
            <h2
              id="drawer-title"
              className="flex items-center gap-2 text-xl font-bold"
            >
              {company.name}
              {/* Source badge for unified companies (Feature 012) */}
              {isUnifiedCompany(company) && (
                <span
                  className={`badge ${COMPANY_SOURCE_COLORS[company.source]} badge-sm`}
                  title={
                    company.source === 'shared'
                      ? 'Community company'
                      : 'Your private company'
                  }
                >
                  {COMPANY_SOURCE_LABELS[company.source]}
                </span>
              )}
              {!company.is_active && (
                <span className="badge badge-ghost badge-sm">Inactive</span>
              )}
            </h2>
            <p className="text-base-content/85 text-sm">{company.address}</p>
            {company.contact_name && (
              <p className="text-base-content/85 mt-1 text-sm">
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
        <div className="max-h-[40%] flex-shrink-0 overflow-y-auto border-b p-4">
          {/* Phone - full width, click to copy */}
          {company.phone && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-base-content/85 text-sm">Phone:</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm font-mono"
                onClick={() => {
                  navigator.clipboard.writeText(company.phone!);
                  // Visual feedback - button text changes briefly
                  const btn = document.activeElement as HTMLButtonElement;
                  const original = btn.textContent;
                  btn.textContent = 'Copied!';
                  setTimeout(() => {
                    btn.textContent = original;
                  }, 1500);
                }}
                title="Click to copy"
              >
                {company.phone}
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2 text-sm">
            {company.website && (
              <div className="truncate">
                <span className="text-base-content/85">Website:</span>{' '}
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary"
                >
                  {(() => {
                    try {
                      return new URL(company.website).hostname.replace(
                        /^www\./,
                        ''
                      );
                    } catch {
                      return company.website;
                    }
                  })()}
                </a>
              </div>
            )}
            {company.careers_url && (
              <div className="truncate">
                <span className="text-base-content/85">Careers:</span>{' '}
                <a
                  href={company.careers_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-secondary"
                >
                  View Openings
                </a>
              </div>
            )}
            {company.email && (
              <div className="min-w-0 truncate">
                <span className="text-base-content/85">Email:</span>{' '}
                <a
                  href={`mailto:${company.email}`}
                  className="link link-primary"
                >
                  {company.email}
                </a>
              </div>
            )}
            <div>
              <span className="text-base-content/85">Priority:</span>{' '}
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
              <span className="text-base-content/85 text-sm">Notes:</span>
              <p className="bg-base-200 mt-1 rounded p-2 text-sm">
                {company.notes}
              </p>
            </div>
          )}

          {/* Tracking Status Section for Unified Companies (T085/T086) */}
          {isUnifiedCompany(company) &&
            (() => {
              // T086: Use optimistic values when available
              const displayStatus = (optimisticStatus ??
                company.status) as CompanyTrackingStatus;
              const displayPriority = optimisticPriority ?? company.priority;

              return (
                <div className="mt-3 border-t pt-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Tracking Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-base-content/85 text-sm">
                        Status:
                      </span>
                      {onTrackingStatusChange ? (
                        <select
                          className={`select select-bordered select-sm ${TRACKING_STATUS_COLORS[displayStatus] || 'badge-ghost'} ${isUpdating ? 'opacity-70' : ''}`}
                          value={displayStatus}
                          onChange={(e) =>
                            handleTrackingStatusChange(
                              company,
                              e.target.value as CompanyTrackingStatus
                            )
                          }
                          disabled={isUpdating}
                          aria-label="Change tracking status"
                          data-testid="tracking-status-select"
                        >
                          {Object.entries(TRACKING_STATUS_LABELS).map(
                            ([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            )
                          )}
                        </select>
                      ) : (
                        <span
                          className={`badge ${TRACKING_STATUS_COLORS[displayStatus] || 'badge-ghost'} badge-sm`}
                          data-testid="tracking-status-badge"
                        >
                          {TRACKING_STATUS_LABELS[displayStatus] ||
                            displayStatus}
                        </span>
                      )}
                    </div>

                    {/* Priority */}
                    <div className="flex items-center gap-2">
                      <span className="text-base-content/85 text-sm">
                        Priority:
                      </span>
                      {onTrackingPriorityChange ? (
                        <select
                          className={`select select-bordered select-sm ${isUpdating ? 'opacity-70' : ''}`}
                          value={displayPriority}
                          onChange={(e) =>
                            handleTrackingPriorityChange(
                              company,
                              parseInt(e.target.value, 10)
                            )
                          }
                          disabled={isUpdating}
                          aria-label="Change priority"
                          data-testid="tracking-priority-select"
                        >
                          <option value={1}>1 (High)</option>
                          <option value={2}>2</option>
                          <option value={3}>3 (Normal)</option>
                          <option value={4}>4</option>
                          <option value={5}>5 (Low)</option>
                        </select>
                      ) : (
                        <span
                          className={
                            displayPriority <= 2 ? 'text-warning font-bold' : ''
                          }
                          data-testid="tracking-priority-badge"
                        >
                          {displayPriority}
                        </span>
                      )}
                    </div>

                    {/* Loading indicator */}
                    {isUpdating && (
                      <span
                        className="loading loading-spinner loading-xs"
                        aria-label="Saving..."
                      />
                    )}
                  </div>
                </div>
              );
            })()}

          {/* T099/T100/T101: Submit to Community Section for Private Companies */}
          {isUnifiedCompany(company) && company.source === 'private' && (
            <div className="mt-3 border-t pt-3">
              {company.submit_to_shared ? (
                <div className="flex items-center gap-2">
                  <span
                    className="badge badge-warning badge-sm"
                    data-testid="pending-review-badge"
                  >
                    Pending Review
                  </span>
                  <span className="text-base-content/85 text-xs">
                    Submitted for community review
                  </span>
                </div>
              ) : (
                onSubmitToCommunity && (
                  <button
                    type="button"
                    className="btn btn-outline btn-secondary btn-sm"
                    onClick={() => handleSubmitToCommunity(company)}
                    disabled={isSubmitting}
                    data-testid="submit-to-community-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="loading loading-spinner loading-xs" />
                        Submitting...
                      </>
                    ) : (
                      <>
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
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        Submit to Community
                      </>
                    )}
                  </button>
                )
              )}
            </div>
          )}

          {/* T106/T107: Suggest Edit Section for Shared Companies */}
          {isUnifiedCompany(company) &&
            company.source === 'shared' &&
            onSuggestEdit && (
              <div className="mt-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base-content/85 text-sm">
                    Data Correction
                  </span>
                  {!editingField && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() =>
                        handleStartEdit('website', company.website)
                      }
                      data-testid="suggest-edit-btn"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="mr-1 h-3 w-3"
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
                      Suggest Edit
                    </button>
                  )}
                </div>

                {/* Inline Edit Form (T107) */}
                {editingField && (
                  <div
                    className="mt-2 space-y-2"
                    data-testid="edit-suggestion-form"
                  >
                    <div className="flex items-center gap-2">
                      <select
                        className="select select-bordered select-sm"
                        value={editingField}
                        onChange={(e) => {
                          const newField = e.target.value;
                          const fieldValue =
                            company[newField as keyof typeof company];
                          setEditingField(newField);
                          setEditValue(
                            typeof fieldValue === 'string' ? fieldValue : ''
                          );
                        }}
                        aria-label="Select field to edit"
                        data-testid="edit-field-select"
                      >
                        <option value="website">Website</option>
                        <option value="careers_url">Careers URL</option>
                        <option value="phone">Phone</option>
                        <option value="email">Email</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      className="input input-bordered input-sm w-full"
                      placeholder={`New ${editingField}`}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      data-testid="edit-value-input"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm flex-1"
                        onClick={() => {
                          const oldValue =
                            company[editingField as keyof typeof company];
                          handleSubmitEdit(
                            company,
                            editingField,
                            typeof oldValue === 'string' ? oldValue : null
                          );
                        }}
                        disabled={isSubmittingEdit || !editValue.trim()}
                        data-testid="submit-edit-btn"
                      >
                        {isSubmittingEdit ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          'Submit'
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleCancelEdit}
                        disabled={isSubmittingEdit}
                        data-testid="cancel-edit-btn"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Routes Section (Feature 041) */}
          {onAddToRoute && (
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base-content/85 text-sm">Routes</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-primary"
                  onClick={() => onAddToRoute(company)}
                  aria-label={`Add ${company.name} to a route`}
                  data-testid="add-to-route-btn"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-1 h-3 w-3"
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
                  Add to Route
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Applications Section */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <h3 className="font-semibold">
              {(() => {
                const appliedCount = applications.filter(
                  (a) => a.status !== 'not_applied'
                ).length;
                const watchingCount = applications.length - appliedCount;
                if (appliedCount === 0 && watchingCount > 0) {
                  return `Watching ${watchingCount} job${watchingCount > 1 ? 's' : ''}`;
                }
                return `Applications (${appliedCount})`;
              })()}
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
            {applications.length === 0 ? (
              <div className="text-base-content/75 py-8 text-center">
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
                {applications.map((app) => (
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
                          <p className="text-base-content/85 text-sm">
                            {WORK_LOCATION_LABELS[app.work_location_type]}
                            {/* Job links: Careers | Apply | Status */}
                            {(app.job_link ||
                              app.position_url ||
                              app.status_url) && (
                              <span className="ml-2 text-xs">
                                {app.job_link && (
                                  <a
                                    href={app.job_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link link-secondary"
                                    title="Careers page"
                                  >
                                    Careers
                                  </a>
                                )}
                                {app.position_url && (
                                  <>
                                    {app.job_link && ' | '}
                                    <a
                                      href={app.position_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="link link-primary"
                                      title="Apply to position"
                                    >
                                      Apply
                                    </a>
                                  </>
                                )}
                                {app.status_url && (
                                  <>
                                    {(app.job_link || app.position_url) &&
                                      ' | '}
                                    <a
                                      href={app.status_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="link link-accent"
                                      title="Check application status"
                                    >
                                      Status
                                    </a>
                                  </>
                                )}
                              </span>
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
                      <div className="text-base-content/85 mt-2 text-xs">
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
                        <p className="text-base-content/85 mt-1 text-xs">
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

export default memo(CompanyDetailDrawer);

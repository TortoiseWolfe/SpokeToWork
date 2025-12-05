'use client';

import React from 'react';
import type {
  CompanyFilters as CompanyFiltersType,
  ApplicationStatus,
  Priority,
} from '@/types/company';

export interface CompanyFiltersProps {
  /** Current filter values */
  filters: CompanyFiltersType;
  /** Callback when filters change */
  onFiltersChange: (filters: CompanyFiltersType) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'not_contacted', label: 'Not Contacted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'outcome_positive', label: 'Positive' },
  { value: 'outcome_negative', label: 'Negative' },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 1, label: '1 - Highest' },
  { value: 2, label: '2 - High' },
  { value: 3, label: '3 - Medium' },
  { value: 4, label: '4 - Low' },
  { value: 5, label: '5 - Lowest' },
];

/**
 * CompanyFilters component
 *
 * Provides filter controls for the company list including:
 * - Text search
 * - Status filter
 * - Priority filter
 * - Active/inactive toggle
 * - Extended range filter
 *
 * @category molecular
 */
export default function CompanyFilters({
  filters,
  onFiltersChange,
  className = '',
  testId = 'company-filters',
}: CompanyFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value || undefined });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFiltersChange({
      ...filters,
      status: value ? (value as ApplicationStatus) : undefined,
    });
  };

  const handlePriorityToggle = (priority: Priority) => {
    const currentPriorities = Array.isArray(filters.priority)
      ? filters.priority
      : filters.priority
        ? [filters.priority]
        : [];

    const newPriorities = currentPriorities.includes(priority)
      ? currentPriorities.filter((p) => p !== priority)
      : [...currentPriorities, priority].sort((a, b) => a - b);

    onFiltersChange({
      ...filters,
      priority: newPriorities.length > 0 ? newPriorities : undefined,
    });
  };

  const isPrioritySelected = (priority: Priority): boolean => {
    if (!filters.priority) return false;
    return Array.isArray(filters.priority)
      ? filters.priority.includes(priority)
      : filters.priority === priority;
  };

  const handleActiveChange = () => {
    // Three states: true (active only), false (inactive only), undefined (show all)
    if (filters.is_active === undefined) {
      onFiltersChange({ ...filters, is_active: true });
    } else if (filters.is_active === true) {
      onFiltersChange({ ...filters, is_active: false });
    } else {
      onFiltersChange({ ...filters, is_active: undefined });
    }
  };

  const handleExtendedRangeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    onFiltersChange({
      ...filters,
      extended_range: e.target.checked || undefined,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = !!(
    filters.search ||
    filters.status ||
    filters.priority ||
    filters.is_active !== undefined ||
    filters.extended_range
  );

  return (
    <div
      data-testid={testId}
      className={`flex flex-wrap items-center gap-3 ${className}`}
    >
      {/* Search */}
      <div className="form-control">
        <input
          type="text"
          placeholder="Search companies..."
          className="input input-bordered input-sm w-48"
          value={filters.search || ''}
          onChange={handleSearchChange}
          aria-label="Search companies"
        />
      </div>

      {/* Status Filter */}
      <div className="form-control">
        <select
          className="select select-bordered select-sm"
          value={filters.status || ''}
          onChange={handleStatusChange}
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Filter - Multi-select checkboxes */}
      <div className="form-control">
        <div className="dropdown dropdown-end">
          <label
            tabIndex={0}
            className="btn btn-sm btn-outline"
            aria-label="Filter by priority"
          >
            Priority
            {filters.priority && (
              <span className="badge badge-sm badge-primary ml-1">
                {Array.isArray(filters.priority) ? filters.priority.length : 1}
              </span>
            )}
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content menu bg-base-100 rounded-box z-[1] w-40 p-2 shadow"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <li key={opt.value}>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={isPrioritySelected(opt.value)}
                    onChange={() => handlePriorityToggle(opt.value)}
                  />
                  <span className="label-text">{opt.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Active Toggle */}
      <div className="form-control">
        <label className="label cursor-pointer gap-2">
          <span className="label-text text-sm">Active</span>
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={filters.is_active === true}
            ref={(el) => {
              if (el) el.indeterminate = filters.is_active === undefined;
            }}
            onChange={handleActiveChange}
            aria-label="Filter by active status"
          />
        </label>
      </div>

      {/* Extended Range Filter */}
      <div className="form-control">
        <label className="label cursor-pointer gap-2">
          <span className="label-text text-sm">Extended Range</span>
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={filters.extended_range || false}
            onChange={handleExtendedRangeChange}
            aria-label="Show only extended range companies"
          />
        </label>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handleClearFilters}
          aria-label="Clear all filters"
        >
          Clear
        </button>
      )}
    </div>
  );
}

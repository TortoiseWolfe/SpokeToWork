'use client';

import React, { useState, useMemo } from 'react';
import CompanyRow from '@/components/molecular/CompanyRow';
import CompanyFilters from '@/components/molecular/CompanyFilters';
import type {
  Company,
  CompanyFilters as CompanyFiltersType,
  CompanySort,
  ApplicationStatus,
} from '@/types/company';

export interface CompanyTableProps {
  /** List of companies to display */
  companies: Company[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when a company is clicked */
  onCompanyClick?: (company: Company) => void;
  /** Callback when edit is requested */
  onEdit?: (company: Company) => void;
  /** Callback when delete is requested */
  onDelete?: (company: Company) => void;
  /** Callback when status is changed */
  onStatusChange?: (company: Company, status: ApplicationStatus) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * CompanyTable component
 *
 * Displays a list of companies in a sortable, filterable table.
 * Features:
 * - Column sorting
 * - Filtering (search, status, priority)
 * - Responsive design
 * - Loading state
 *
 * @category organisms
 */
export default function CompanyTable({
  companies,
  isLoading = false,
  onCompanyClick,
  onEdit,
  onDelete,
  onStatusChange,
  className = '',
  testId = 'company-table',
}: CompanyTableProps) {
  const [filters, setFilters] = useState<CompanyFiltersType>({});
  const [sort, setSort] = useState<CompanySort>({
    field: 'name',
    direction: 'asc',
  });

  // Apply filters
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          company.name.toLowerCase().includes(searchLower) ||
          company.address.toLowerCase().includes(searchLower) ||
          company.contact_name?.toLowerCase().includes(searchLower) ||
          company.email?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        if (!statuses.includes(company.status)) return false;
      }

      // Priority filter
      if (filters.priority !== undefined) {
        const priorities = Array.isArray(filters.priority)
          ? filters.priority
          : [filters.priority];
        if (!priorities.includes(company.priority)) return false;
      }

      // Active filter
      if (filters.is_active !== undefined) {
        if (company.is_active !== filters.is_active) return false;
      }

      // Extended range filter
      if (filters.extended_range !== undefined) {
        if (company.extended_range !== filters.extended_range) return false;
      }

      return true;
    });
  }, [companies, filters]);

  // Apply sorting
  const sortedCompanies = useMemo(() => {
    const sorted = [...filteredCompanies];
    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'priority':
          comparison = a.priority - b.priority;
          break;
        case 'created_at':
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'follow_up_date':
          const aDate = a.follow_up_date
            ? new Date(a.follow_up_date).getTime()
            : Infinity;
          const bDate = b.follow_up_date
            ? new Date(b.follow_up_date).getTime()
            : Infinity;
          comparison = aDate - bDate;
          break;
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredCompanies, sort]);

  const handleSort = (field: CompanySort['field']) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ field }: { field: CompanySort['field'] }) => {
    if (sort.field !== field) return null;
    return <span className="ml-1">{sort.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  if (isLoading) {
    return (
      <div
        data-testid={testId}
        className={`flex items-center justify-center py-12 ${className}`}
      >
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div data-testid={testId} className={className}>
      {/* Filters */}
      <div className="mb-4">
        <CompanyFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Results Count */}
      <div className="text-base-content/70 mb-2 text-sm">
        {sortedCompanies.length === companies.length ? (
          <span>{companies.length} companies</span>
        ) : (
          <span>
            {sortedCompanies.length} of {companies.length} companies
          </span>
        )}
      </div>

      {/* Table */}
      {sortedCompanies.length === 0 ? (
        <div className="card bg-base-100 p-8 text-center">
          <p className="text-base-content/70">
            {companies.length === 0
              ? 'No companies yet. Add your first company to get started.'
              : 'No companies match your filters.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-zebra table w-full">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleSort('name')}
                  >
                    Company
                    <SortIcon field="name" />
                  </button>
                </th>
                <th className="hidden md:table-cell">Contact</th>
                <th>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </th>
                <th className="hidden text-center sm:table-cell">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleSort('priority')}
                  >
                    Priority
                    <SortIcon field="priority" />
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCompanies.map((company) => (
                <CompanyRow
                  key={company.id}
                  company={company}
                  onClick={onCompanyClick}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  testId={`company-row-${company.id}`}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import CompanyRow from '@/components/molecular/CompanyRow';
import CompanyFilters from '@/components/molecular/CompanyFilters';
import type {
  Company,
  CompanyWithApplications,
  UnifiedCompany,
  CompanyFilters as CompanyFiltersType,
  CompanySort,
  CompanyStatus,
} from '@/types/company';

/** Type alias for all company types supported */
type CompanyType = Company | CompanyWithApplications | UnifiedCompany;

/**
 * Type guard to check if company is from unified view (Feature 012)
 */
function isUnifiedCompany(company: CompanyType): company is UnifiedCompany {
  return (
    'source' in company &&
    ('tracking_id' in company || 'private_company_id' in company)
  );
}

/**
 * Get the unique ID for a company (supports legacy, unified, or applications)
 */
function getCompanyId(company: CompanyType): string {
  if (isUnifiedCompany(company)) {
    return company.tracking_id ?? company.private_company_id ?? 'unknown';
  }
  return company.id;
}

/** Extract zip code from address string (e.g., "123 Main St, Cleveland, TN 37311" -> "37311") */
function extractZipCode(address: string): string {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : '';
}

export interface CompanyTableProps {
  /** List of companies to display (legacy, with applications, or unified) */
  companies: CompanyType[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when a company is clicked */
  onCompanyClick?: (company: CompanyType) => void;
  /** Callback when edit is requested */
  onEdit?: (company: CompanyType) => void;
  /** Callback when delete is requested */
  onDelete?: (company: CompanyType) => void;
  /** Callback when status is changed (legacy - for companies without applications) */
  onStatusChange?: (company: Company, status: CompanyStatus) => void;
  /** Callback when add to route is requested (Feature 041) */
  onAddToRoute?: (company: CompanyType) => void;
  /** Set of company IDs on the active route (Feature 044) */
  activeRouteCompanyIds?: Set<string>;
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
  onAddToRoute,
  activeRouteCompanyIds,
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

      // Extended range filter (legacy companies only)
      if (filters.extended_range !== undefined) {
        if (
          'extended_range' in company &&
          company.extended_range !== filters.extended_range
        )
          return false;
      }

      // Active Route filter (Feature 044)
      if (filters.on_active_route && activeRouteCompanyIds) {
        const companyId = getCompanyId(company);
        // For unified companies, check both tracking_id/private_company_id and company_id
        let isOnActiveRoute = activeRouteCompanyIds.has(companyId);
        if (!isOnActiveRoute && isUnifiedCompany(company)) {
          // Also check against company_id for shared companies
          if (company.company_id) {
            isOnActiveRoute = activeRouteCompanyIds.has(company.company_id);
          }
          // And private_company_id
          if (!isOnActiveRoute && company.private_company_id) {
            isOnActiveRoute = activeRouteCompanyIds.has(
              company.private_company_id
            );
          }
        }
        if (!isOnActiveRoute) return false;
      }

      return true;
    });
  }, [companies, filters, activeRouteCompanyIds]);

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
        case 'zip_code':
          const aZip = extractZipCode(a.address);
          const bZip = extractZipCode(b.address);
          comparison = aZip.localeCompare(bZip);
          break;
        case 'applications':
          const aCount =
            (a as CompanyWithApplications).total_applications ??
            (a as CompanyWithApplications).applications?.length ??
            0;
          const bCount =
            (b as CompanyWithApplications).total_applications ??
            (b as CompanyWithApplications).applications?.length ??
            0;
          comparison = aCount - bCount;
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
        <span
          className="loading loading-spinner loading-lg"
          role="status"
          aria-label="Loading companies"
        ></span>
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
          {companies.length === 0 ? (
            <>
              <p className="text-base-content/70 mb-4">
                No companies yet. Start tracking companies you&apos;re
                interested in.
              </p>
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Dispatch custom event to open add form
                    window.dispatchEvent(new CustomEvent('open-add-company'));
                  }}
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
                  Add Your First Company
                </button>
              </div>
            </>
          ) : filters.on_active_route ? (
            <p className="text-base-content/70">
              No companies on this route yet. Add companies to your active route
              to see them here.
            </p>
          ) : (
            <p className="text-base-content/70">
              No companies match your filters.
            </p>
          )}
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
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs ml-1"
                    onClick={() => handleSort('zip_code')}
                    title="Sort by zip code to cluster nearby companies"
                  >
                    Zip
                    <SortIcon field="zip_code" />
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
                    title="Sort by priority (1=highest)"
                  >
                    Priority
                    <SortIcon field="priority" />
                  </button>
                </th>
                <th className="hidden text-center md:table-cell">
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => handleSort('applications')}
                  >
                    Apps
                    <SortIcon field="applications" />
                  </button>
                </th>
                <th className="hidden lg:table-cell">Website</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCompanies.map((company) => {
                const companyId = getCompanyId(company);
                // Feature 044: Check if company is on active route
                let isOnActiveRoute = false;
                if (activeRouteCompanyIds) {
                  isOnActiveRoute = activeRouteCompanyIds.has(companyId);
                  // Also check company_id and private_company_id for unified companies
                  if (!isOnActiveRoute && isUnifiedCompany(company)) {
                    if (company.company_id) {
                      isOnActiveRoute = activeRouteCompanyIds.has(
                        company.company_id
                      );
                    }
                    if (!isOnActiveRoute && company.private_company_id) {
                      isOnActiveRoute = activeRouteCompanyIds.has(
                        company.private_company_id
                      );
                    }
                  }
                }
                return (
                  <CompanyRow
                    key={companyId}
                    company={company}
                    onClick={onCompanyClick}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    onAddToRoute={onAddToRoute}
                    isOnActiveRoute={isOnActiveRoute}
                    testId={`company-row-${companyId}`}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

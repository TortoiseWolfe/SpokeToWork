'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import CompanyRow from '@/components/molecular/CompanyRow';
import CompanyFilters from '@/components/molecular/CompanyFilters';
import { useCompanyTable } from '@/hooks/useCompanyTable';
import {
  getCompanyRowId,
  isCompanyOnActiveRoute,
  type AnyCompany,
} from '@/lib/companies/table-filter-sort';
import { TableHead } from './TableHead';
import { EmptyState } from './EmptyState';
import type { Company, CompanyStatus } from '@/types/company';

export interface CompanyTableProps {
  companies: AnyCompany[];
  isLoading?: boolean;
  onCompanyClick?: (company: AnyCompany) => void;
  onEdit?: (company: AnyCompany) => void;
  onDelete?: (company: AnyCompany) => void;
  onStatusChange?: (company: Company, status: CompanyStatus) => void;
  onAddToRoute?: (company: AnyCompany) => void;
  activeRouteCompanyIds?: Set<string>;
  /** Selected row (drives scroll-into-view for map→table sync). */
  selectedCompanyId?: string | null;
  className?: string;
  testId?: string;
}

/**
 * CompanyTable — sortable, filterable company list.
 *
 * Filter/sort state lives in useCompanyTable; head/empty presentation in
 * sibling files. Scrolls the selected row into view when
 * `selectedCompanyId` changes (two-way sync with the map).
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
  selectedCompanyId,
  className = '',
  testId = 'company-table',
}: CompanyTableProps) {
  const { filters, setFilters, sort, handleSort, rows } = useCompanyTable(
    companies,
    activeRouteCompanyIds
  );

  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  // Map→table sync: scroll selected row into view when selection changes.
  useEffect(() => {
    if (!selectedCompanyId || !tbodyRef.current) return;
    const row = tbodyRef.current.querySelector<HTMLElement>(
      `[data-company-id="${selectedCompanyId}"]`
    );
    row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedCompanyId]);

  // FR-2: stabilise callbacks so memo'd CompanyRow skips re-render
  const click = useCallback(
    (c: AnyCompany) => onCompanyClick?.(c),
    [onCompanyClick]
  );
  const edit = useCallback((c: AnyCompany) => onEdit?.(c), [onEdit]);
  const del = useCallback((c: AnyCompany) => onDelete?.(c), [onDelete]);
  const status = useCallback(
    (c: Company, s: CompanyStatus) => onStatusChange?.(c, s),
    [onStatusChange]
  );
  const addRoute = useCallback(
    (c: AnyCompany) => onAddToRoute?.(c),
    [onAddToRoute]
  );

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
        />
      </div>
    );
  }

  return (
    <div data-testid={testId} className={className}>
      <div className="mb-4">
        <CompanyFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      <div className="text-base-content/85 mb-2 text-sm">
        {rows.length === companies.length
          ? `${companies.length} companies`
          : `${rows.length} of ${companies.length} companies`}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          totalCompanies={companies.length}
          onRouteFilterActive={!!filters.on_active_route}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-zebra table w-full">
            <TableHead sort={sort} onSort={handleSort} />
            <tbody ref={tbodyRef}>
              {rows.map((company) => {
                const id = getCompanyRowId(company);
                return (
                  <CompanyRow
                    key={id}
                    company={company}
                    onClick={click}
                    onEdit={edit}
                    onDelete={del}
                    onStatusChange={status}
                    onAddToRoute={addRoute}
                    isOnActiveRoute={isCompanyOnActiveRoute(
                      company,
                      activeRouteCompanyIds
                    )}
                    isSelected={id === selectedCompanyId}
                    testId={`company-row-${id}`}
                    data-company-id={id}
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

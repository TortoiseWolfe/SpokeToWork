'use client';

import React, { memo, useRef } from 'react';
import type { Company, CompanyStatus } from '@/types/company';
import {
  NameCell,
  ContactCell,
  StatusCell,
  PriorityCell,
  ApplicationsCell,
  WebsiteCell,
  ActionsCell,
  type CompanyType,
  hasApplications,
  isUnifiedCompany,
} from './cells';

export interface CompanyRowProps {
  /** Company data to display (legacy, with applications, or unified) */
  company: CompanyType;
  /** Callback when row is clicked */
  onClick?: (company: CompanyType) => void;
  /** Callback when edit is requested */
  onEdit?: (company: CompanyType) => void;
  /** Callback when delete is requested */
  onDelete?: (company: CompanyType) => void;
  /** Callback when status is changed (legacy - for companies without applications) */
  onStatusChange?: (company: Company, status: CompanyStatus) => void;
  /** Callback when add to route is requested (Feature 041) */
  onAddToRoute?: (company: CompanyType) => void;
  /** Whether this company is on the active route (Feature 044) */
  isOnActiveRoute?: boolean;
  /** Whether this row is selected */
  isSelected?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
  /** Stable row key — CompanyTable queries this for scroll-into-view sync. */
  'data-company-id'?: string;
}

/**
 * CompanyRow — single table row. Cell bodies live in ./cells.
 *
 * FR-3: wrapped with React.memo to avoid re-render when props are
 * referentially stable (works with useCallback in CompanyTable).
 *
 * @category molecular
 */
function CompanyRowComponent({
  company,
  onClick,
  onEdit,
  onDelete,
  onStatusChange,
  onAddToRoute,
  isOnActiveRoute = false,
  isSelected = false,
  className = '',
  testId = 'company-row',
  'data-company-id': dataCompanyId,
}: CompanyRowProps) {
  // Feature 051: render counter for E2E memoization assertions
  const renderCount = useRef(0);
  if (process.env.NODE_ENV !== 'production') {
    renderCount.current += 1;
  }

  const stop = (
    fn: ((c: CompanyType) => void) | undefined
  ): ((e: React.MouseEvent) => void) | undefined =>
    fn &&
    ((e) => {
      e.stopPropagation();
      fn(company);
    });

  const statusChange =
    onStatusChange && !isUnifiedCompany(company) && !hasApplications(company)
      ? (e: React.ChangeEvent<HTMLSelectElement>) => {
          e.stopPropagation();
          onStatusChange(company as Company, e.target.value as CompanyStatus);
        }
      : undefined;

  return (
    <tr
      data-testid={testId}
      data-company-id={dataCompanyId}
      data-render-count={
        process.env.NODE_ENV !== 'production' ? renderCount.current : undefined
      }
      className={`hover cursor-pointer ${isSelected ? 'active' : ''} ${
        !company.is_active ? 'opacity-60' : ''
      } ${className}`}
      onClick={() => onClick?.(company)}
    >
      <NameCell company={company} isOnActiveRoute={isOnActiveRoute} />
      <ContactCell company={company} />
      <StatusCell company={company} onStatusChange={statusChange} />
      <PriorityCell priority={company.priority} />
      <ApplicationsCell company={company} />
      <WebsiteCell website={company.website ?? null} />
      <ActionsCell
        name={company.name}
        onAddToRoute={stop(onAddToRoute)}
        onEdit={stop(onEdit)}
        onDelete={stop(onDelete)}
      />
    </tr>
  );
}

const CompanyRow = memo(CompanyRowComponent);
CompanyRow.displayName = 'CompanyRow';

export default CompanyRow;

'use client';

/**
 * useCompanyTable — owns filter + sort state and returns the
 * filtered+sorted company list.
 *
 * Extracted from CompanyTable.tsx (filter/sort useMemos + handleSort).
 */

import { useCallback, useMemo, useState } from 'react';
import {
  filterCompanies,
  sortCompanies,
  type AnyCompany,
} from '@/lib/companies/table-filter-sort';
import type {
  CompanyFilters as CompanyFiltersType,
  CompanySort,
} from '@/types/company';

export interface UseCompanyTableReturn {
  filters: CompanyFiltersType;
  setFilters: (f: CompanyFiltersType) => void;
  sort: CompanySort;
  handleSort: (field: CompanySort['field']) => void;
  rows: AnyCompany[];
}

export function useCompanyTable(
  companies: AnyCompany[],
  activeRouteCompanyIds?: Set<string>
): UseCompanyTableReturn {
  const [filters, setFilters] = useState<CompanyFiltersType>({});
  const [sort, setSort] = useState<CompanySort>({
    field: 'name',
    direction: 'asc',
  });

  const filtered = useMemo(
    () => filterCompanies(companies, filters, activeRouteCompanyIds),
    [companies, filters, activeRouteCompanyIds]
  );

  const rows = useMemo(() => sortCompanies(filtered, sort), [filtered, sort]);

  const handleSort = useCallback((field: CompanySort['field']) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  return { filters, setFilters, sort, handleSort, rows };
}

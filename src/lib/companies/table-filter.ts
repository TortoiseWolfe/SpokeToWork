/**
 * Pure filter functions for the company table.
 *
 * Extracted from table-filter-sort.ts so filter and sort are independent.
 */

import type {
  Company,
  CompanyWithApplications,
  UnifiedCompany,
  CompanyFilters,
} from '@/types/company';

export type AnyCompany = Company | CompanyWithApplications | UnifiedCompany;

export function isUnifiedCompany(c: AnyCompany): c is UnifiedCompany {
  return 'source' in c && ('tracking_id' in c || 'private_company_id' in c);
}

export function getCompanyRowId(c: AnyCompany): string {
  if (isUnifiedCompany(c)) {
    return c.tracking_id ?? c.private_company_id ?? 'unknown';
  }
  return c.id;
}

/**
 * Is this company on the active route?
 *
 * Checks the row id first, then — for unified companies — falls back to
 * the underlying company_id/private_company_id, since the route-company
 * set may be keyed on either.
 */
export function isCompanyOnActiveRoute(
  c: AnyCompany,
  activeIds: Set<string> | undefined
): boolean {
  if (!activeIds) return false;
  if (activeIds.has(getCompanyRowId(c))) return true;
  if (isUnifiedCompany(c)) {
    if (c.company_id && activeIds.has(c.company_id)) return true;
    if (c.private_company_id && activeIds.has(c.private_company_id))
      return true;
  }
  return false;
}

function matchesSearch(c: AnyCompany, q: string): boolean {
  const s = q.toLowerCase();
  return (
    c.name.toLowerCase().includes(s) ||
    c.address.toLowerCase().includes(s) ||
    !!c.contact_name?.toLowerCase().includes(s) ||
    !!c.email?.toLowerCase().includes(s)
  );
}

export function filterCompanies(
  companies: AnyCompany[],
  filters: CompanyFilters,
  activeRouteCompanyIds?: Set<string>
): AnyCompany[] {
  return companies.filter((c) => {
    if (filters.search && !matchesSearch(c, filters.search)) return false;

    if (filters.status) {
      const s = Array.isArray(filters.status)
        ? filters.status
        : [filters.status];
      if (!s.includes(c.status)) return false;
    }

    if (filters.priority !== undefined) {
      const p = Array.isArray(filters.priority)
        ? filters.priority
        : [filters.priority];
      if (!p.includes(c.priority)) return false;
    }

    if (filters.is_active !== undefined && c.is_active !== filters.is_active)
      return false;

    if (
      filters.extended_range !== undefined &&
      'extended_range' in c &&
      c.extended_range !== filters.extended_range
    )
      return false;

    if (
      filters.on_active_route &&
      !isCompanyOnActiveRoute(c, activeRouteCompanyIds)
    )
      return false;

    return true;
  });
}

/**
 * Pure sort functions for the company table.
 *
 * Extracted from table-filter-sort.ts so filter and sort are independent.
 */

import type { CompanyWithApplications, CompanySort } from '@/types/company';
import type { AnyCompany } from './table-filter';

function extractZip(address: string): string {
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : '';
}

function appCount(c: AnyCompany): number {
  const cw = c as CompanyWithApplications;
  return cw.total_applications ?? cw.applications?.length ?? 0;
}

function compareByField(
  a: AnyCompany,
  b: AnyCompany,
  field: CompanySort['field']
): number {
  switch (field) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'status': {
      const aApp = (a as CompanyWithApplications).latest_application;
      const bApp = (b as CompanyWithApplications).latest_application;
      const as = aApp ? aApp.status : a.status;
      const bs = bApp ? bApp.status : b.status;
      return as.localeCompare(bs);
    }
    case 'priority':
      return a.priority - b.priority;
    case 'created_at':
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case 'follow_up_date': {
      const ad = a.follow_up_date
        ? new Date(a.follow_up_date).getTime()
        : Infinity;
      const bd = b.follow_up_date
        ? new Date(b.follow_up_date).getTime()
        : Infinity;
      return ad - bd;
    }
    case 'zip_code':
      return extractZip(a.address).localeCompare(extractZip(b.address));
    case 'applications':
      return appCount(a) - appCount(b);
    case 'website':
      return (a.website || '').localeCompare(b.website || '');
    default:
      return 0;
  }
}

export function sortCompanies(
  companies: AnyCompany[],
  sort: CompanySort
): AnyCompany[] {
  const out = [...companies];
  out.sort((a, b) => {
    const cmp = compareByField(a, b, sort.field);
    return sort.direction === 'asc' ? cmp : -cmp;
  });
  return out;
}

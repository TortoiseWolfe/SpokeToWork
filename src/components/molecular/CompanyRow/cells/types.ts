/**
 * Shared types and type guards for CompanyRow cells.
 */

import type {
  Company,
  CompanyWithApplications,
  UnifiedCompany,
} from '@/types/company';

export type CompanyType = Company | CompanyWithApplications | UnifiedCompany;

export function hasApplications(
  company: CompanyType
): company is CompanyWithApplications {
  return 'applications' in company && 'total_applications' in company;
}

export function isUnifiedCompany(
  company: CompanyType
): company is UnifiedCompany {
  return (
    'source' in company &&
    ('tracking_id' in company || 'private_company_id' in company)
  );
}

export function getCompanyId(company: CompanyType): string {
  if (isUnifiedCompany(company)) {
    return company.tracking_id ?? company.private_company_id ?? 'unknown';
  }
  return company.id;
}

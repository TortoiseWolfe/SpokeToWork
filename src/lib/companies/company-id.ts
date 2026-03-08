import type { UnifiedCompany } from '@/types/company';

/**
 * Stable identifier for a UnifiedCompany.
 * - shared → tracking_id (the user's tracking row for this shared company)
 * - private → private_company_id
 *
 * Throws if the company is malformed. Use this when you need a guaranteed
 * key (context selection, map lookups). Component-local copies in
 * CompanyTable/CompanyRow return 'unknown' instead — those handle a
 * wider CompanyType union and tolerate bad data for render safety.
 */
export function getUnifiedCompanyId(company: UnifiedCompany): string {
  if (company.source === 'shared' && company.tracking_id) {
    return company.tracking_id;
  }
  if (company.source === 'private' && company.private_company_id) {
    return company.private_company_id;
  }
  throw new Error('Invalid company: missing identifier');
}

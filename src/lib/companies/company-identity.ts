/**
 * Company Identity Helpers
 *
 * Pure utility functions for working with the UnifiedCompany discriminated
 * union: type guard, ID resolution, and shape conversion to legacy format.
 *
 * Extracted from src/app/companies/page.tsx (Feature 012 companies-page
 * decomposition, Phase 1).
 */

import type {
  Company,
  CompanyWithApplications,
  UnifiedCompany,
} from '@/types/company';

/**
 * Union of company shapes encountered in the companies workspace.
 * Use with isUnifiedCompany to narrow at callsites.
 */
export type CompanyLike = Company | CompanyWithApplications | UnifiedCompany;

/**
 * Type guard to check if company is from unified view (Feature 012)
 */
export function isUnifiedCompany(
  company: CompanyLike
): company is UnifiedCompany {
  return (
    'source' in company &&
    ('tracking_id' in company || 'private_company_id' in company)
  );
}

/**
 * Get the unique identifier for a unified company
 * Returns tracking_id for shared companies, private_company_id for private
 */
export function getCompanyId(company: UnifiedCompany): string {
  if (company.source === 'shared' && company.tracking_id) {
    return company.tracking_id;
  }
  if (company.source === 'private' && company.private_company_id) {
    return company.private_company_id;
  }
  throw new Error('Invalid company: missing identifier');
}

/**
 * Convert UnifiedCompany to legacy format for components that haven't been updated yet
 */
export function toCompanyWithApplications(
  company: UnifiedCompany
): CompanyWithApplications {
  const id = getCompanyId(company);
  return {
    id,
    user_id: company.user_id,
    name: company.name,
    address: company.address,
    latitude: company.latitude ?? 0,
    longitude: company.longitude ?? 0,
    website: company.website,
    careers_url: company.careers_url,
    email: company.email,
    phone: company.phone,
    contact_name: company.contact_name,
    contact_title: company.contact_title,
    notes: company.notes,
    status: company.status,
    priority: company.priority,
    follow_up_date: company.follow_up_date,
    is_active: company.is_active,
    extended_range: false, // Not in unified view
    route_id: null, // Not in unified view
    created_at: company.created_at,
    updated_at: company.updated_at,
    applications: [],
    latest_application: null,
    total_applications: 0,
  };
}

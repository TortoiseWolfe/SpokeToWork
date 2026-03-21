/**
 * Company adapter helpers.
 *
 * Bridges UnifiedCompany (Feature-012 multi-tenant view) to the legacy
 * CompanyWithApplications shape that CompanyForm/CompanyTable/Drawer expect.
 */

import { getUnifiedCompanyId } from '@/lib/companies/company-id';
import type {
  Company,
  CompanyWithApplications,
  JobApplication,
  UnifiedCompany,
} from '@/types/company';

export type AnyCompany = Company | CompanyWithApplications | UnifiedCompany;

export function isUnifiedCompany(c: AnyCompany): c is UnifiedCompany {
  return 'source' in c && ('tracking_id' in c || 'private_company_id' in c);
}

/** Resolve any company shape back to the UnifiedCompany it came from. */
export function resolveUnified(
  company: AnyCompany,
  pool: UnifiedCompany[]
): UnifiedCompany | undefined {
  const id = isUnifiedCompany(company)
    ? getUnifiedCompanyId(company)
    : company.id;
  return pool.find((c) => getUnifiedCompanyId(c) === id);
}

/** Convert UnifiedCompany to legacy format for components that haven't migrated. */
export function toCompanyWithApplications(
  c: UnifiedCompany
): CompanyWithApplications {
  return {
    id: getUnifiedCompanyId(c),
    user_id: c.user_id,
    name: c.name,
    address: c.address,
    latitude: c.latitude ?? 0,
    longitude: c.longitude ?? 0,
    website: c.website,
    careers_url: c.careers_url,
    email: c.email,
    phone: c.phone,
    contact_name: c.contact_name,
    contact_title: c.contact_title,
    notes: c.notes,
    status: c.status,
    priority: c.priority,
    follow_up_date: c.follow_up_date,
    is_active: c.is_active,
    extended_range: false,
    route_id: null,
    created_at: c.created_at,
    updated_at: c.updated_at,
    applications: [],
    latest_application: null,
    total_applications: 0,
  };
}

export interface AppSummary {
  count: number;
  latest: JobApplication | null;
}

/** Merge per-company application summaries into the legacy table rows. */
export function mergeApplicationSummaries(
  companies: UnifiedCompany[],
  summaries: Record<string, AppSummary>
): CompanyWithApplications[] {
  return companies.map((c) => {
    const base = toCompanyWithApplications(c);
    const key = c.source === 'shared' ? c.company_id : c.private_company_id;
    const s = key ? summaries[key] : undefined;
    return {
      ...base,
      total_applications: s?.count ?? 0,
      latest_application: s?.latest ?? null,
    };
  });
}

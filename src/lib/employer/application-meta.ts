/**
 * Employer Application Meta — pure data helpers
 *
 * Constants, types, and stateless functions extracted from
 * useEmployerApplications to keep the hook under 400 lines.
 */

import type { JobApplication, JobApplicationStatus } from '@/types/company';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Rows per page for paginated application queries. */
export const PAGE_SIZE = 25;

/** Hard cap on in-memory applications to prevent unbounded growth. */
export const MAX_LOADED = 500;

/** Shared select string with applicant profile + company name joins. */
export const APP_SELECT = `
  *,
  user_profiles!job_applications_user_id_profile_fkey(display_name, username),
  shared_companies!job_applications_shared_company_id_fkey(name)
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmployerApplication extends JobApplication {
  applicant_name: string;
  company_name: string;
}

export interface ApplicationMeta {
  statusCounts: Partial<Record<JobApplicationStatus, number>>;
  totalCount: number;
  repeatUserIds: Set<string>;
  uidCounts: Map<string, number>;
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

/** Map a raw joined row → EmployerApplication. */
export function toEmployerApplication(
  app: Record<string, unknown>
): EmployerApplication {
  const profile = app.user_profiles as {
    display_name?: string;
    username?: string;
  } | null;
  const company = app.shared_companies as { name?: string } | null;
  return {
    ...app,
    applicant_name: profile?.display_name || profile?.username || 'Unknown',
    company_name: company?.name || 'Unknown',
  } as EmployerApplication;
}

// ---------------------------------------------------------------------------
// Meta computation
// ---------------------------------------------------------------------------

/** Compute statusCounts, totalCount, repeatUserIds from lightweight meta rows. */
export function computeMeta(
  metaRows: { status: JobApplicationStatus; user_id: string }[]
): ApplicationMeta {
  const statusCounts: Partial<Record<JobApplicationStatus, number>> = {};
  const uidCounts = new Map<string, number>();

  for (const r of metaRows) {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    uidCounts.set(r.user_id, (uidCounts.get(r.user_id) ?? 0) + 1);
  }

  const repeatUserIds = new Set(
    [...uidCounts.entries()].filter(([, n]) => n > 1).map(([uid]) => uid)
  );

  return { statusCounts, totalCount: metaRows.length, repeatUserIds, uidCounts };
}

/** Return updated status counts after a single row changes status. */
export function adjustCountsForStatusChange(
  counts: Partial<Record<JobApplicationStatus, number>>,
  oldStatus: JobApplicationStatus,
  newStatus: JobApplicationStatus
): Partial<Record<JobApplicationStatus, number>> {
  return {
    ...counts,
    [oldStatus]: Math.max(0, (counts[oldStatus] ?? 1) - 1),
    [newStatus]: (counts[newStatus] ?? 0) + 1,
  };
}

/** Prepend an application and enforce the MAX_LOADED cap. */
export function prependAndCap(
  current: EmployerApplication[],
  incoming: EmployerApplication
): EmployerApplication[] {
  const next = [incoming, ...current];
  return next.length > MAX_LOADED ? next.slice(0, MAX_LOADED) : next;
}

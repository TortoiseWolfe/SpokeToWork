import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { JobApplication, JobApplicationStatus } from '@/types/company';

// Tables not yet in generated Database types — cast to untyped client
const getClient = () => createClient() as unknown as SupabaseClient;

/**
 * Rows per page. Funnel counts use a separate unpaginated meta query so the
 * stats bar reflects the full dataset even when only page 1 is loaded.
 */
const PAGE_SIZE = 25;

/** Hard cap on in-memory applications to prevent unbounded growth. */
const MAX_LOADED = 500;

/** Shared select string with applicant profile + company name joins. */
const APP_SELECT = `
  *,
  user_profiles!job_applications_user_id_profile_fkey(display_name, username),
  shared_companies!job_applications_shared_company_id_fkey(name)
`;

export interface EmployerApplication extends JobApplication {
  applicant_name: string;
  company_name: string;
}

export interface UseEmployerApplicationsReturn {
  applications: EmployerApplication[];
  loading: boolean;
  error: string | null;
  companyIds: string[];
  newApplicationAlert: EmployerApplication | null;
  dismissAlert: () => void;
  updateStatus: (
    applicationId: string,
    status: JobApplicationStatus
  ) => Promise<void>;
  refresh: () => Promise<void>;
  // --- Pagination + full-dataset meta -------------------------------------
  /** Per-status counts across ALL applications (not just the loaded page). */
  statusCounts: Partial<Record<JobApplicationStatus, number>>;
  /** Total applications across all linked companies. */
  totalCount: number;
  /** user_ids that appear more than once in the full dataset. */
  repeatUserIds: Set<string>;
  /** True if more rows exist beyond the currently loaded page(s). */
  hasMore: boolean;
  loadingMore: boolean;
  /** Fetch the next PAGE_SIZE rows and append to `applications`. */
  loadMore: () => Promise<void>;
  /** Hire an applicant: set outcome=hired, create connection, add to team. */
  hireApplicant: (applicationId: string) => Promise<void>;
}

/** Map a raw joined row → EmployerApplication. */
function toEmployerApplication(
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

/**
 * useEmployerApplications — paginated fetch of applications for the
 * employer's linked companies, plus a lightweight meta query that keeps
 * funnel counts accurate across the full dataset.
 *
 * Two queries:
 *   1. META — select('status, user_id') on full dataset → statusCounts,
 *      totalCount, repeatUserIds. Cheap (~2 cols), scales to thousands.
 *   2. PAGE — select('*, joins') with .range() → visible rows. loadMore()
 *      appends the next page.
 *
 * Realtime INSERT subscription prepends new applications and keeps meta
 * (totalCount, statusCounts, repeatUserIds, offset) in sync so subsequent
 * loadMore() calls don't duplicate rows.
 */
export function useEmployerApplications(): UseEmployerApplicationsReturn {
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newApplicationAlert, setNewApplicationAlert] =
    useState<EmployerApplication | null>(null);
  const [companyIds, setCompanyIds] = useState<string[]>([]);

  // Full-dataset meta state (unpaginated)
  const [statusCounts, setStatusCounts] = useState<
    Partial<Record<JobApplicationStatus, number>>
  >({});
  const [totalCount, setTotalCount] = useState(0);
  const [repeatUserIds, setRepeatUserIds] = useState<Set<string>>(new Set());

  const channelRef = useRef<ReturnType<
    ReturnType<typeof getClient>['channel']
  > | null>(null);
  const companyIdsRef = useRef<string[]>([]);
  /** Fresh mirror so empty-dep callbacks can read current rows. */
  const applicationsRef = useRef<EmployerApplication[]>([]);
  /** Next page offset. Bumped on loadMore AND realtime prepend. */
  const offsetRef = useRef(0);
  /** Full-dataset user_id → count, for O(1) repeat detection on INSERT. */
  const userIdCountsRef = useRef<Map<string, number>>(new Map());
  /** Re-entry guard — state updates batch, ref flips immediately. */
  const loadingMoreRef = useRef(false);

  // Derived: more rows exist beyond what's currently loaded.
  const hasMore = applications.length < totalCount;

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = getClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Get employer's linked company IDs
      const { data: links, error: linksError } = await supabase
        .from('employer_company_links')
        .select('shared_company_id')
        .eq('user_id', user.id);

      if (linksError) {
        setError(linksError.message);
        return;
      }

      const ids = (links || []).map(
        (l: { shared_company_id: string }) => l.shared_company_id
      );
      companyIdsRef.current = ids;
      setCompanyIds(ids);

      if (ids.length === 0) {
        applicationsRef.current = [];
        setApplications([]);
        setStatusCounts({});
        setTotalCount(0);
        setRepeatUserIds(new Set());
        userIdCountsRef.current = new Map();
        offsetRef.current = 0;
        return;
      }

      // --- Meta query: full dataset, lightweight columns only -------------
      // Drives funnel counts + repeat-applicant detection. NOT paginated so
      // the stats bar reflects all applications regardless of loaded page(s).
      const { data: meta, error: metaError } = await supabase
        .from('job_applications')
        .select('status, user_id')
        .in('shared_company_id', ids);

      if (metaError) {
        setError(metaError.message);
        return;
      }

      const metaRows = (meta ?? []) as {
        status: JobApplicationStatus;
        user_id: string;
      }[];
      const counts: Partial<Record<JobApplicationStatus, number>> = {};
      const uidCounts = new Map<string, number>();
      for (const r of metaRows) {
        counts[r.status] = (counts[r.status] ?? 0) + 1;
        uidCounts.set(r.user_id, (uidCounts.get(r.user_id) ?? 0) + 1);
      }
      const repeats = new Set(
        [...uidCounts.entries()].filter(([, n]) => n > 1).map(([uid]) => uid)
      );

      userIdCountsRef.current = uidCounts;
      setStatusCounts(counts);
      setTotalCount(metaRows.length);
      setRepeatUserIds(repeats);

      // --- Page query: first PAGE_SIZE rows with joins --------------------
      offsetRef.current = 0;
      const { data: apps, error: appsError } = await supabase
        .from('job_applications')
        .select(APP_SELECT)
        .in('shared_company_id', ids)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (appsError) {
        setError(appsError.message);
        return;
      }

      const mapped = (apps || []).map(toEmployerApplication);
      applicationsRef.current = mapped;
      setApplications(mapped);
      offsetRef.current = mapped.length;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const ids = companyIdsRef.current;
    if (ids.length === 0 || loadingMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const from = offsetRef.current;
      const { data: apps, error: appsError } = await getClient()
        .from('job_applications')
        .select(APP_SELECT)
        .in('shared_company_id', ids)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (appsError) {
        setError(appsError.message);
        return;
      }

      const mapped = (apps || []).map(toEmployerApplication);
      const next = [...applicationsRef.current, ...mapped];
      const capped =
        next.length > MAX_LOADED ? next.slice(0, MAX_LOADED) : next;
      applicationsRef.current = capped;
      setApplications(capped);
      offsetRef.current += mapped.length;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const updateStatus = useCallback(
    async (applicationId: string, status: JobApplicationStatus) => {
      const supabase = getClient();
      const { error: updateError } = await supabase
        .from('job_applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Optimistic update — row + funnel counts. Read old status from the
      // ref so we can adjust counts even with empty deps (no stale closure).
      const old = applicationsRef.current.find(
        (a) => a.id === applicationId
      )?.status;
      const next = applicationsRef.current.map((a) =>
        a.id === applicationId ? { ...a, status } : a
      );
      applicationsRef.current = next;
      setApplications(next);

      if (old && old !== status) {
        setStatusCounts((c) => ({
          ...c,
          [old]: Math.max(0, (c[old] ?? 1) - 1),
          [status]: (c[status] ?? 0) + 1,
        }));
      }
    },
    []
  );

  const dismissAlert = useCallback(() => {
    setNewApplicationAlert(null);
  }, []);

  // Subscribe to realtime new applications
  useEffect(() => {
    if (companyIdsRef.current.length === 0) return;

    const supabase = getClient();
    const channel = supabase
      .channel('employer-new-applications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'job_applications',
        },
        async (payload) => {
          const newApp = payload.new as Record<string, unknown>;
          const companyId = newApp.shared_company_id as string | null;

          // Only process if the application is for one of our companies
          if (!companyId || !companyIdsRef.current.includes(companyId)) return;

          // Fetch applicant info
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('display_name, username')
            .eq('id', newApp.user_id as string)
            .maybeSingle();

          const { data: company } = await supabase
            .from('shared_companies')
            .select('name')
            .eq('id', companyId)
            .maybeSingle();

          const enriched: EmployerApplication = {
            ...newApp,
            applicant_name:
              profile?.display_name || profile?.username || 'Unknown',
            company_name: company?.name || 'Unknown',
          } as EmployerApplication;

          // Prepend + keep meta in sync. Offset bumps so the next loadMore()
          // fetches from the correct DB position (new row at 0 shifts all
          // others down by 1 — without the offset bump we'd re-fetch one
          // row we already have).
          const next = [enriched, ...applicationsRef.current];
          const capped =
            next.length > MAX_LOADED ? next.slice(0, MAX_LOADED) : next;
          applicationsRef.current = capped;
          setApplications(capped);
          offsetRef.current += 1;

          setTotalCount((n) => n + 1);
          const st = enriched.status;
          setStatusCounts((c) => ({ ...c, [st]: (c[st] ?? 0) + 1 }));

          const uid = enriched.user_id;
          const prevUidCount = userIdCountsRef.current.get(uid) ?? 0;
          userIdCountsRef.current.set(uid, prevUidCount + 1);
          if (prevUidCount + 1 > 1) {
            setRepeatUserIds((s) => new Set(s).add(uid));
          }

          setNewApplicationAlert(enriched);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Re-subscribe when we first get company data
  }, [applications.length > 0]);

  const hireApplicant = useCallback(async (applicationId: string) => {
    const supabase = getClient();
    const { error: rpcError } = await supabase.rpc('hire_applicant', {
      p_application_id: applicationId,
    });
    if (rpcError) throw new Error(rpcError.message);

    // Optimistic update: mark as hired + closed
    const next = applicationsRef.current.map((a) =>
      a.id === applicationId
        ? { ...a, outcome: 'hired' as const, status: 'closed' as const }
        : a
    );
    const old = applicationsRef.current.find((a) => a.id === applicationId);
    applicationsRef.current = next;
    setApplications(next);

    if (old && old.status !== 'closed') {
      setStatusCounts((c) => ({
        ...c,
        [old.status]: Math.max(0, (c[old.status] ?? 1) - 1),
        closed: (c.closed ?? 0) + 1,
      }));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    loading,
    error,
    companyIds,
    newApplicationAlert,
    dismissAlert,
    updateStatus,
    refresh: fetchApplications,
    statusCounts,
    totalCount,
    repeatUserIds,
    hasMore,
    loadingMore,
    loadMore,
    hireApplicant,
  };
}

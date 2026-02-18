import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { JobApplication, JobApplicationStatus } from '@/types/company';

// Tables not yet in generated Database types — cast to untyped client
const getClient = () => createClient() as unknown as SupabaseClient;

export interface EmployerApplication extends JobApplication {
  applicant_name: string;
  company_name: string;
}

export interface UseEmployerApplicationsReturn {
  applications: EmployerApplication[];
  loading: boolean;
  error: string | null;
  newApplicationAlert: EmployerApplication | null;
  dismissAlert: () => void;
  updateStatus: (
    applicationId: string,
    status: JobApplicationStatus
  ) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * useEmployerApplications - Fetches applications for employer's linked companies
 * with realtime subscription for new applications.
 *
 * Subscribes to postgres_changes INSERT on job_applications filtered by
 * the employer's linked company IDs. Shows a toast notification for new
 * applications and cleans up subscriptions on unmount.
 */
export function useEmployerApplications(): UseEmployerApplicationsReturn {
  const [applications, setApplications] = useState<EmployerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newApplicationAlert, setNewApplicationAlert] =
    useState<EmployerApplication | null>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof getClient>['channel']
  > | null>(null);
  const companyIdsRef = useRef<string[]>([]);

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

      const companyIds = (links || []).map(
        (l: { shared_company_id: string }) => l.shared_company_id
      );
      companyIdsRef.current = companyIds;

      if (companyIds.length === 0) {
        setApplications([]);
        return;
      }

      // Fetch applications for those companies with applicant info
      const { data: apps, error: appsError } = await supabase
        .from('job_applications')
        .select(
          `
          *,
          user_profiles!job_applications_user_id_fkey(display_name, username),
          shared_companies!job_applications_shared_company_id_fkey(name)
        `
        )
        .in('shared_company_id', companyIds)
        .order('created_at', { ascending: false });

      if (appsError) {
        setError(appsError.message);
        return;
      }

      const mapped: EmployerApplication[] = (apps || []).map(
        (app: Record<string, unknown>) => {
          const profile = app.user_profiles as {
            display_name?: string;
            username?: string;
          } | null;
          const company = app.shared_companies as { name?: string } | null;
          return {
            ...app,
            applicant_name:
              profile?.display_name || profile?.username || 'Unknown',
            company_name: company?.name || 'Unknown',
          } as EmployerApplication;
        }
      );

      setApplications(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
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

      // Optimistic update
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status } : app))
      );
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

          setApplications((prev) => [enriched, ...prev]);
          setNewApplicationAlert(enriched);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Re-subscribe when we first get company data
  }, [applications.length > 0]);

  // Initial fetch
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    loading,
    error,
    newApplicationAlert,
    dismissAlert,
    updateStatus,
    refresh: fetchApplications,
  };
}

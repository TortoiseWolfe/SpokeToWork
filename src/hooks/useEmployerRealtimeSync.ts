/**
 * useEmployerRealtimeSync — realtime INSERT subscription for employer applications.
 *
 * Extracted from useEmployerApplications to keep each hook focused.
 * Manages the Supabase Realtime channel lifecycle: subscribes when
 * companyIds is non-empty, tears down on unmount or when IDs change.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { JobApplicationStatus } from '@/types/company';
import {
  type EmployerApplication,
  prependAndCap,
} from '@/lib/employer/application-meta';

// Tables not yet in generated Database types — cast to untyped client
const getClient = () => createClient() as unknown as SupabaseClient;

export interface RealtimeSyncCallbacks {
  /** Current applications ref for prepend. */
  applicationsRef: React.MutableRefObject<EmployerApplication[]>;
  /** Setter to push new applications list into React state. */
  setApplications: React.Dispatch<React.SetStateAction<EmployerApplication[]>>;
  /** Bump the pagination offset so loadMore doesn't re-fetch. */
  offsetRef: React.MutableRefObject<number>;
  /** Full-dataset uid→count map for O(1) repeat detection. */
  userIdCountsRef: React.MutableRefObject<Map<string, number>>;
  /** React state setters for meta counters. */
  setTotalCount: React.Dispatch<React.SetStateAction<number>>;
  setStatusCounts: React.Dispatch<
    React.SetStateAction<Partial<Record<JobApplicationStatus, number>>>
  >;
  setRepeatUserIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export interface UseEmployerRealtimeSyncReturn {
  newApplicationAlert: EmployerApplication | null;
  dismissAlert: () => void;
}

/**
 * Subscribe to realtime INSERT events on `job_applications` scoped to the
 * given companyIds. Enriches the row with profile + company name, prepends
 * it to the local list, and keeps meta counters in sync.
 */
export function useEmployerRealtimeSync(
  companyIds: string[],
  callbacks: RealtimeSyncCallbacks
): UseEmployerRealtimeSyncReturn {
  const [newApplicationAlert, setNewApplicationAlert] =
    useState<EmployerApplication | null>(null);

  const companyIdsRef = useRef<string[]>(companyIds);
  companyIdsRef.current = companyIds;

  const dismissAlert = useCallback(() => {
    setNewApplicationAlert(null);
  }, []);

  useEffect(() => {
    if (companyIds.length === 0) return;

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

          if (!companyId || !companyIdsRef.current.includes(companyId)) return;

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

          const capped = prependAndCap(
            callbacks.applicationsRef.current,
            enriched
          );
          callbacks.applicationsRef.current = capped;
          callbacks.setApplications(capped);
          callbacks.offsetRef.current += 1;

          callbacks.setTotalCount((n) => n + 1);
          const st = enriched.status;
          callbacks.setStatusCounts((c) => ({
            ...c,
            [st]: (c[st] ?? 0) + 1,
          }));

          const uid = enriched.user_id;
          const prevUidCount =
            callbacks.userIdCountsRef.current.get(uid) ?? 0;
          callbacks.userIdCountsRef.current.set(uid, prevUidCount + 1);
          if (prevUidCount + 1 > 1) {
            callbacks.setRepeatUserIds((s) => new Set(s).add(uid));
          }

          setNewApplicationAlert(enriched);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Re-subscribe when company IDs change
  }, [companyIds]);

  return { newApplicationAlert, dismissAlert };
}

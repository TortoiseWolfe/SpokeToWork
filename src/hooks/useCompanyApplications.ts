'use client';

/**
 * useCompanyApplications — ApplicationService lifecycle + Feature-014
 * effects/callbacks: load-all (per-company summaries), fetch-for-selected,
 * and CRUD. Extracted from CompaniesPageInner.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { ApplicationService } from '@/lib/companies/application-service';
import type {
  ApplicationOutcome,
  JobApplication,
  JobApplicationCreate,
  JobApplicationStatus,
  JobApplicationUpdate,
  UnifiedCompany,
} from '@/types/company';

type Ref = { id: string; type: 'shared' | 'private' };
const companyRef = (c: UnifiedCompany): Ref | null =>
  c.source === 'shared' && c.company_id
    ? { id: c.company_id, type: 'shared' }
    : c.source === 'private' && c.private_company_id
      ? { id: c.private_company_id, type: 'private' }
      : null;

export interface ApplicationSummary {
  count: number;
  latest: JobApplication | null;
}

export interface UseCompanyApplicationsReturn {
  applications: JobApplication[];
  summaries: Record<string, ApplicationSummary>;
  isLoading: boolean;
  create: (data: JobApplicationCreate) => Promise<void>;
  update: (
    id: string,
    patch: Omit<JobApplicationUpdate, 'id'>
  ) => Promise<void>;
  remove: (application: JobApplication) => Promise<void>;
  setStatus: (id: string, status: JobApplicationStatus) => Promise<void>;
  setOutcome: (id: string, outcome: ApplicationOutcome) => Promise<void>;
  refreshSummaries: () => Promise<void>;
}

export function useCompanyApplications(
  user: User | null,
  selected: UnifiedCompany | null,
  onError: (message: string) => void
): UseCompanyApplicationsReturn {
  const svc = useMemo(() => new ApplicationService(supabase), []);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [summaries, setSummaries] = useState<
    Record<string, ApplicationSummary>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) svc.initialize(user.id);
  }, [user, svc]);

  const refreshSummaries = useCallback(async () => {
    if (!user) return setSummaries({});
    try {
      const all = await svc.getAll();
      const map: Record<string, ApplicationSummary> = {};
      for (const a of all) {
        const k = a.shared_company_id || a.private_company_id;
        if (!k) continue;
        (map[k] ??= { count: 0, latest: a }).count++; // DESC-sorted → first wins
      }
      setSummaries(map);
    } catch (err) {
      console.error('Error loading application summaries:', err);
    }
  }, [user, svc]);

  useEffect(() => void refreshSummaries(), [refreshSummaries]);

  const refetchSelected = useCallback(async () => {
    const ref = user && selected ? companyRef(selected) : null;
    if (!ref) return setApplications([]);
    setIsLoading(true);
    try {
      setApplications(await svc.getByCompanyId(ref.id, ref.type));
    } catch {
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, selected, svc]);

  useEffect(() => void refetchSelected(), [refetchSelected]);

  /** try/await/onError. `rethrow` for form submits (caller needs to know). */
  const run = useCallback(
    async (fn: () => Promise<void>, msg: string, rethrow = false) => {
      try {
        await fn();
      } catch (err) {
        onError(err instanceof Error ? err.message : msg);
        if (rethrow) throw err;
      }
    },
    [onError]
  );

  const patch = useCallback(
    (id: string, p: Partial<JobApplication>) =>
      setApplications((xs) =>
        xs.map((a) => (a.id === id ? { ...a, ...p } : a))
      ),
    []
  );

  // prettier-ignore
  return {
    applications, summaries, isLoading, refreshSummaries,
    create: useCallback((d: JobApplicationCreate) => run(async () => {
      const ref = user && selected ? companyRef(selected) : null;
      if (!ref) return;
      await svc.create({ ...d,
        shared_company_id: ref.type === 'shared' ? ref.id : null,
        private_company_id: ref.type === 'private' ? ref.id : null,
      });
      await refetchSelected();
      await refreshSummaries();
    }, 'Failed to create application', true), [user, selected, svc, refetchSelected, refreshSummaries, run]),
    update: useCallback((id: string, p: Omit<JobApplicationUpdate, 'id'>) => run(async () => {
      await svc.update({ id, ...p });
      await refetchSelected();
    }, 'Failed to update application', true), [svc, refetchSelected, run]),
    remove: useCallback((a: JobApplication) => run(async () => {
      if (!window.confirm('Are you sure you want to delete this application?')) return;
      await svc.delete(a.id);
      await refetchSelected();
      await refreshSummaries();
    }, 'Failed to delete application'), [svc, refetchSelected, refreshSummaries, run]),
    setStatus: useCallback((id: string, status: JobApplicationStatus) => run(async () => {
      await svc.update({ id, status });
      patch(id, { status });
    }, 'Failed to update status'), [svc, patch, run]),
    setOutcome: useCallback((id: string, outcome: ApplicationOutcome) => run(async () => {
      await svc.update({ id, outcome });
      patch(id, { outcome });
    }, 'Failed to update outcome'), [svc, patch, run]),
  };
}

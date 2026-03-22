'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { VisibilityService } from '@/lib/resumes/visibility-service';
import type { WorkerVisibility } from '@/lib/resumes/types';

export interface UseWorkerVisibilityReturn {
  visibility: WorkerVisibility | null;
  isLoading: boolean;
  error: Error | null;
  update: (changes: Partial<Pick<WorkerVisibility, 'profile_public' | 'resume_visible_to'>>) => Promise<void>;
}

export function useWorkerVisibility(userId: string | undefined): UseWorkerVisibilityReturn {
  const [visibility, setVisibility] = useState<WorkerVisibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const service = new VisibilityService(supabase);
        const row = await service.getVisibility(userId!);

        if (cancelled) return;
        setVisibility(row);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  const update = useCallback(async (
    changes: Partial<Pick<WorkerVisibility, 'profile_public' | 'resume_visible_to'>>
  ) => {
    if (!userId) return;

    // Optimistic update: apply changes immediately
    const oldVisibility = visibility;
    setVisibility((prev) => prev ? { ...prev, ...changes } : prev);

    try {
      const supabase = createClient();
      const service = new VisibilityService(supabase);
      await service.updateVisibility(userId, changes);
    } catch (err) {
      // Revert on error
      setVisibility(oldVisibility);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [userId, visibility]);

  return { visibility, isLoading, error, update };
}

'use client';

/**
 * useModerationQueue — admin moderation domain hook. Memoized service,
 * admin check, queue + nearby-location state, five mutations. Mutations
 * drop the item from local state (optimistic) instead of refetching, so
 * usePendingMarkers re-derives immediately and the marker vanishes
 * without a round-trip. Approve/merge refresh nearbyLocations in the
 * background since a new shared_company_location may now exist.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import {
  AdminModerationService,
  type ModerationQueueItem,
} from '@/lib/companies/admin-moderation-service';
import {
  getNearbyCompanyLocations,
  type NearbyLocation,
} from '@/lib/companies/nearby-locations';

const NEARBY_RADIUS_KM = 5;

export interface UseModerationQueueReturn {
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  success: string | null;
  items: ModerationQueueItem[];
  nearbyLocations: NearbyLocation[];
  approveContribution: (id: string, notes?: string) => Promise<void>;
  rejectContribution: (id: string, notes: string) => Promise<void>;
  mergeContribution: (id: string, existingCompanyId: string) => Promise<void>;
  approveEdit: (id: string, notes?: string) => Promise<void>;
  rejectEdit: (id: string, notes: string) => Promise<void>;
}

export function useModerationQueue(
  user: User | null
): UseModerationQueueReturn {
  const svc = useMemo(() => new AdminModerationService(supabase), []);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [nearbyLocations, setNearby] = useState<NearbyLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadNearby = useCallback(async (queue: ModerationQueueItem[]) => {
    const points = queue
      .filter((i) => i.type === 'contribution')
      .map((i) => ({
        latitude: i.latitude ?? null,
        longitude: i.longitude ?? null,
      }));
    try {
      setNearby(
        await getNearbyCompanyLocations(supabase, points, NEARBY_RADIUS_KM)
      );
    } catch {
      setNearby([]);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let live = true;
    (async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        const admin =
          (data as { is_admin?: boolean } | null)?.is_admin ?? false;
        if (!live) return;
        setIsAdmin(admin);
        if (!admin) return setIsLoading(false);
        await svc.initialize(user.id);
        const queue = await svc.getPendingQueue();
        if (!live) return;
        setItems(queue);
        await loadNearby(queue);
      } catch {
        if (live) setError('Failed to load moderation queue');
      } finally {
        if (live) setIsLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [user, svc, loadNearby]);

  const flash = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  }, []);

  const drop = useCallback((id: string) => {
    setItems((xs) => xs.filter((i) => i.id !== id));
  }, []);

  /** svc call → optimistic drop → optional nearby refresh → flash. */
  const mutate = useCallback(
    async (
      fn: () => Promise<unknown>,
      id: string,
      ok: string,
      fail: string,
      refresh = false
    ) => {
      try {
        setError(null);
        await fn();
        drop(id);
        if (refresh) {
          // Re-derive from post-drop items so the removed point is excluded.
          setItems((xs) => {
            void loadNearby(xs);
            return xs;
          });
        }
        flash(ok);
      } catch {
        setError(fail);
      }
    },
    [drop, flash, loadNearby]
  );

  // prettier-ignore
  return {
    isAdmin, isLoading, error, success, items, nearbyLocations,
    clearError: useCallback(() => setError(null), []),
    approveContribution: useCallback((id, notes) =>
      mutate(() => svc.approveContribution(id, notes), id,
        'Contribution approved', 'Failed to approve contribution', true),
    [svc, mutate]),
    rejectContribution: useCallback((id, notes) =>
      mutate(() => svc.rejectContribution(id, notes), id,
        'Contribution rejected', 'Failed to reject contribution'),
    [svc, mutate]),
    mergeContribution: useCallback((id, into) =>
      mutate(() => svc.mergeContribution(id, into), id,
        'Contribution merged', 'Failed to merge contribution', true),
    [svc, mutate]),
    approveEdit: useCallback((id, notes) =>
      mutate(() => svc.approveEditSuggestion(id, notes), id,
        'Edit applied', 'Failed to approve edit'),
    [svc, mutate]),
    rejectEdit: useCallback((id, notes) =>
      mutate(() => svc.rejectEditSuggestion(id, notes), id,
        'Edit rejected', 'Failed to reject edit'),
    [svc, mutate]),
  };
}

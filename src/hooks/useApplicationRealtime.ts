import { useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { JobApplication } from '@/types/company';

const getClient = () => createClient() as unknown as SupabaseClient;

/**
 * Subscribes to realtime UPDATE events on job_applications for a specific user.
 * When an employer changes status or outcome, the callback fires with the updated row.
 */
export function useApplicationRealtime(
  userId: string | undefined,
  onUpdate: (updated: JobApplication) => void
): void {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!userId) return;

    const supabase = getClient();
    const channel = supabase
      .channel(`worker-application-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'job_applications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onUpdateRef.current(payload.new as JobApplication);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

import { useState, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { TimeEntry } from '@/types/schedule';

const getClient = () => createClient() as unknown as SupabaseClient;

export interface ClockResult {
  ok: boolean;
  entry?: TimeEntry;
  /** 'early_window' | 'open_entry' from RPC HINT, or 'rpc' for anything else. */
  reason?: 'early_window' | 'open_entry' | 'rpc';
  message?: string;
}

export interface UseTimeEntryReturn {
  clockIn: (shiftId: string) => Promise<ClockResult>;
  clockOut: (timeEntryId: string) => Promise<ClockResult>;
  pending: boolean;
  lastError: string | null;
}

/**
 * useTimeEntry — clock in/out RPC wrappers (Feature 067, online path).
 *
 * Approach C: client_event_id + client_timestamp are sent now so the
 * IndexedDB sync queue can replay the same call shape later. Idempotency
 * lives server-side on (user_id, client_event_id) — a network retry that
 * lands twice returns the existing row.
 *
 * Validation is server-authoritative. The client doesn't pre-check the
 * 15-min window or open-entry state; it just calls and surfaces the
 * structured rejection (HINT → reason).
 */
export function useTimeEntry(): UseTimeEntryReturn {
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const clockIn = useCallback(async (shiftId: string): Promise<ClockResult> => {
    setPending(true);
    setLastError(null);
    const supabase = getClient();

    const clientEventId = crypto.randomUUID();
    const clientTimestamp = new Date().toISOString();

    const { data, error } = await supabase.rpc('clock_in', {
      p_client_event_id: clientEventId,
      p_shift_id: shiftId,
      p_client_timestamp: clientTimestamp,
    });

    setPending(false);
    if (error) {
      const hint = (error as { hint?: string }).hint;
      const reason: ClockResult['reason'] =
        hint === 'early_window' || hint === 'open_entry' ? hint : 'rpc';
      setLastError(error.message);
      return { ok: false, reason, message: error.message };
    }
    return { ok: true, entry: data as TimeEntry };
  }, []);

  const clockOut = useCallback(
    async (timeEntryId: string): Promise<ClockResult> => {
      setPending(true);
      setLastError(null);
      const supabase = getClient();

      const { data, error } = await supabase.rpc('clock_out', {
        p_time_entry_id: timeEntryId,
        p_client_timestamp: new Date().toISOString(),
      });

      setPending(false);
      if (error) {
        setLastError(error.message);
        return { ok: false, reason: 'rpc', message: error.message };
      }
      return { ok: true, entry: data as TimeEntry };
    },
    []
  );

  return { clockIn, clockOut, pending, lastError };
}

import { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { TeamShift, ShiftUpsert, BusinessHours } from '@/types/schedule';

const getClient = () => createClient() as unknown as SupabaseClient;

/** Get Monday of the week containing the given date. */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export interface UseTeamScheduleReturn {
  shifts: TeamShift[];
  loading: boolean;
  error: string | null;
  weekStart: string;
  prevWeek: () => void;
  nextWeek: () => void;
  goToDate: (date: string) => void;
  businessHours: BusinessHours;
  upsertShift: (data: ShiftUpsert) => Promise<void>;
  deleteShift: (shiftId: string) => Promise<void>;
  updateBusinessHours: (hours: BusinessHours) => Promise<void>;
  copyWeekShifts: (sourceWeekStart: string) => Promise<number>;
  batchCreateShifts: (
    userId: string | null,
    entries: ShiftUpsert[]
  ) => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * useTeamSchedule — week-scoped shift CRUD for a company.
 *
 * Fetches shifts via `get_team_shifts` RPC for a Monday–Sunday window.
 * Provides week navigation and optimistic CRUD with rollback on error.
 */
export function useTeamSchedule(
  companyId: string | null
): UseTeamScheduleReturn {
  const [shifts, setShifts] = useState<TeamShift[]>([]);
  const [loading, setLoading] = useState(companyId !== null);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() =>
    toDateString(getMonday(new Date()))
  );
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    open: '08:00',
    close: '18:00',
  });

  const fetchShifts = useCallback(async () => {
    if (!companyId) {
      setShifts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = getClient();

    const weekEnd = addDays(weekStart, 6);
    const { data, error: rpcError } = await supabase.rpc('get_team_shifts', {
      p_company_id: companyId,
      p_start_date: weekStart,
      p_end_date: weekEnd,
    });

    if (rpcError) {
      setError(rpcError.message);
      setShifts([]);
    } else {
      setShifts((data as TeamShift[]) ?? []);
    }
    setLoading(false);
  }, [companyId, weekStart]);

  // Fetch business hours from shared_companies
  const fetchBusinessHours = useCallback(async () => {
    if (!companyId) return;
    const supabase = getClient();
    const { data } = await supabase
      .from('shared_companies')
      .select('business_open_time, business_close_time')
      .eq('id', companyId)
      .maybeSingle();
    if (data) {
      setBusinessHours({
        open: (data.business_open_time as string)?.slice(0, 5) ?? '08:00',
        close: (data.business_close_time as string)?.slice(0, 5) ?? '18:00',
      });
    }
  }, [companyId]);

  useEffect(() => {
    void fetchShifts();
  }, [fetchShifts]);

  useEffect(() => {
    void fetchBusinessHours();
  }, [fetchBusinessHours]);

  const prevWeek = useCallback(() => {
    setWeekStart((ws) => addDays(ws, -7));
  }, []);

  const nextWeek = useCallback(() => {
    setWeekStart((ws) => addDays(ws, 7));
  }, []);

  const goToDate = useCallback((date: string) => {
    const monday = getMonday(new Date(date + 'T00:00:00'));
    setWeekStart(toDateString(monday));
  }, []);

  const upsertShift = useCallback(
    async (data: ShiftUpsert) => {
      if (!companyId) throw new Error('No company selected');

      const prev = shifts;
      const supabase = getClient();
      const { data: returnedId, error: rpcError } = await supabase.rpc(
        'upsert_shift',
        {
          p_company_id: companyId,
          p_shift_id: data.shift_id ?? null,
          p_user_id: data.user_id ?? null,
          p_shift_date: data.shift_date,
          p_start_time: data.start_time,
          p_end_time: data.end_time,
          p_shift_type: data.shift_type ?? 'regular',
          p_notes: data.notes ?? null,
        }
      );

      if (rpcError) {
        setShifts(prev);
        throw new Error(rpcError.message);
      }

      // Refetch to get joined profile data
      void fetchShifts();
      void returnedId;
    },
    [companyId, shifts, fetchShifts]
  );

  const deleteShift = useCallback(
    async (shiftId: string) => {
      if (!companyId) throw new Error('No company selected');

      const prev = shifts;
      // Optimistic removal
      setShifts(prev.filter((s) => s.id !== shiftId));

      const supabase = getClient();
      const { error: rpcError } = await supabase.rpc('delete_shift', {
        p_company_id: companyId,
        p_shift_id: shiftId,
      });

      if (rpcError) {
        setShifts(prev);
        throw new Error(rpcError.message);
      }
    },
    [companyId, shifts]
  );

  const updateBusinessHours = useCallback(
    async (hours: BusinessHours) => {
      if (!companyId) throw new Error('No company selected');

      const prev = businessHours;
      // Optimistic update
      setBusinessHours(hours);

      const supabase = getClient();
      const { error: rpcError } = await supabase.rpc('update_business_hours', {
        p_company_id: companyId,
        p_open_time: hours.open,
        p_close_time: hours.close,
      });

      if (rpcError) {
        setBusinessHours(prev);
        throw new Error(rpcError.message);
      }
    },
    [companyId, businessHours]
  );

  const copyWeekShifts = useCallback(
    async (sourceWeekStart: string): Promise<number> => {
      if (!companyId) throw new Error('No company selected');

      const supabase = getClient();
      const { data: count, error: rpcError } = await supabase.rpc(
        'copy_week_shifts',
        {
          p_company_id: companyId,
          p_source_start: sourceWeekStart,
          p_target_start: weekStart,
        }
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // Refetch to show the copied shifts
      await fetchShifts();
      return (count as number) ?? 0;
    },
    [companyId, weekStart, fetchShifts]
  );

  const batchCreateShifts = useCallback(
    async (userId: string | null, entries: ShiftUpsert[]) => {
      if (!companyId) throw new Error('No company selected');
      if (entries.length === 0) return;

      const supabase = getClient();
      const jsonEntries = entries.map((e) => ({
        shift_date: e.shift_date,
        start_time: e.start_time,
        end_time: e.end_time,
        shift_type: e.shift_type ?? 'regular',
        notes: e.notes ?? null,
      }));

      const { error: rpcError } = await supabase.rpc('batch_create_shifts', {
        p_company_id: companyId,
        p_user_id: userId,
        p_entries: jsonEntries,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      await fetchShifts();
    },
    [companyId, fetchShifts]
  );

  return {
    shifts,
    loading,
    error,
    weekStart,
    prevWeek,
    nextWeek,
    goToDate,
    businessHours,
    upsertShift,
    deleteShift,
    updateBusinessHours,
    copyWeekShifts,
    batchCreateShifts,
    refetch: fetchShifts,
  };
}

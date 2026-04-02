import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { WorkerShift, WeekSummary } from '@/types/schedule';

/**
 * One auto-closed entry, enriched with the shift it belongs to so the banner
 * can say which job. Only entries whose shift is in the current week window
 * make it here — older auto-closes naturally fall off when you nav away.
 */
export interface AutoClosedNotice {
  shift_id: string;
  company_name: string;
  shift_date: string;
  clock_in_at: string;
  clock_out_at: string;
}

interface AutoClosedRow {
  shift_id: string;
  clock_in_at: string;
  clock_out_at: string;
}

/** How often to refetch summary while an entry is open. Matches WorkerShiftCard's tick. */
const OPEN_ENTRY_POLL_MS = 60_000;
/** How far back to look for auto-closed entries. "Yesterday" per the next-morning UX. */
const AUTO_CLOSED_LOOKBACK_MS = 24 * 60 * 60_000;

const getClient = () => createClient() as unknown as SupabaseClient;

/** Monday of the week containing d. */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

export interface UseWorkerScheduleReturn {
  shifts: WorkerShift[];
  /** Shifts grouped by shift_date, in date order. Each day's shifts sorted by start_time. */
  shiftsByDay: Map<string, WorkerShift[]>;
  /** Mon→Sun date strings for the current window — empty days included so the timeline shows gaps. */
  weekDates: string[];
  /** Server-aggregated scheduled vs worked hours over the same date window. */
  summary: WeekSummary | null;
  /** Entries the lazy sweep auto-closed in the last 24h, enriched with shift metadata. */
  autoClosed: AutoClosedNotice[];
  loading: boolean;
  error: string | null;
  weekStart: string;
  prevWeek: () => void;
  nextWeek: () => void;
  refetch: () => Promise<void>;
}

/**
 * useWorkerSchedule — cross-company shift list for the current user.
 *
 * Calls get_worker_shifts RPC (no company_id — server filters on auth.uid()).
 * The RPC also lazily auto-closes any forgotten clock-outs before returning,
 * so active_entry_id is trustworthy on every fetch.
 */
export function useWorkerSchedule(): UseWorkerScheduleReturn {
  const [shifts, setShifts] = useState<WorkerShift[]>([]);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [autoClosed, setAutoClosed] = useState<AutoClosedNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() =>
    toDateString(getMonday(new Date()))
  );

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = getClient();
    const weekEnd = addDays(weekStart, 6);

    // Both RPCs filter on the same (auth.uid(), date range), and both call
    // close_stale_time_entries first — running them in parallel just means
    // the second sweep is a no-op.
    const [shiftsRes, summaryRes] = await Promise.all([
      supabase.rpc('get_worker_shifts', {
        p_start_date: weekStart,
        p_end_date: weekEnd,
      }),
      supabase.rpc('get_worker_week_summary', {
        p_start_date: weekStart,
        p_end_date: weekEnd,
      }),
    ]);

    if (shiftsRes.error || summaryRes.error) {
      setError((shiftsRes.error ?? summaryRes.error)?.message ?? 'fetch failed');
      setShifts([]);
      setSummary(null);
      setAutoClosed([]);
      setLoading(false);
      return;
    }

    const fetchedShifts = (shiftsRes.data as WorkerShift[]) ?? [];
    setShifts(fetchedShifts);
    // RETURNS TABLE → PostgREST wraps single row in an array
    const rows = summaryRes.data as WeekSummary[] | null;
    setSummary(rows?.[0] ?? null);

    // Auto-close detection runs *after* the RPCs resolve: get_worker_shifts
    // calls close_stale_time_entries() at its top, so by the time we get here
    // the sweep has committed. A concurrent third request inside Promise.all
    // could race ahead of the sweep and miss the entry it just closed.
    //
    // RLS scopes time_entries to the worker's own rows; no user_id filter
    // needed. The shift_id list bounds it to the visible week — auto-closes
    // on shifts outside the window naturally don't surface.
    const shiftIds = fetchedShifts.map((s) => s.id);
    if (shiftIds.length > 0) {
      const cutoff = new Date(Date.now() - AUTO_CLOSED_LOOKBACK_MS).toISOString();
      const { data: closedRows } = await supabase
        .from('time_entries')
        .select('shift_id,clock_in_at,clock_out_at')
        .eq('status', 'auto_closed')
        .gte('updated_at', cutoff)
        .in('shift_id', shiftIds);

      const byId = new Map(fetchedShifts.map((s) => [s.id, s]));
      setAutoClosed(
        ((closedRows as AutoClosedRow[] | null) ?? []).flatMap((r) => {
          const s = byId.get(r.shift_id);
          return s
            ? [{
                shift_id: r.shift_id,
                company_name: s.company_name,
                shift_date: s.shift_date,
                clock_in_at: r.clock_in_at,
                clock_out_at: r.clock_out_at,
              }]
            : [];
        })
      );
    } else {
      setAutoClosed([]);
    }
    setLoading(false);
  }, [weekStart]);

  useEffect(() => {
    void fetchShifts();
  }, [fetchShifts]);

  // Live worked-hours: poll while any shift has an open entry. The summary
  // RPC's worked CTE already counts open entries via COALESCE(clock_out_at,
  // NOW()), but the rendered value is frozen at fetch time without this.
  // The ref keeps the interval pointed at the latest fetchShifts identity
  // (it changes when weekStart changes) without restarting the timer.
  const fetchRef = useRef(fetchShifts);
  fetchRef.current = fetchShifts;

  const hasOpenEntry = useMemo(
    () => shifts.some((s) => s.active_entry_id !== null),
    [shifts]
  );

  useEffect(() => {
    if (!hasOpenEntry) return;
    const id = setInterval(() => void fetchRef.current(), OPEN_ENTRY_POLL_MS);
    return () => clearInterval(id);
  }, [hasOpenEntry]);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, WorkerShift[]>();
    for (const date of weekDates) map.set(date, []);
    // RPC returns sorted by (shift_date, start_time); preserve that.
    for (const shift of shifts) {
      const bucket = map.get(shift.shift_date);
      if (bucket) bucket.push(shift);
    }
    return map;
  }, [shifts, weekDates]);

  const prevWeek = useCallback(
    () => setWeekStart((ws) => addDays(ws, -7)),
    []
  );
  const nextWeek = useCallback(() => setWeekStart((ws) => addDays(ws, 7)), []);

  return {
    shifts,
    shiftsByDay,
    weekDates,
    summary,
    autoClosed,
    loading,
    error,
    weekStart,
    prevWeek,
    nextWeek,
    refetch: fetchShifts,
  };
}

/**
 * Workforce Scheduling Types - Feature 066
 *
 * Type definitions for team shift scheduling.
 */

export type ShiftType =
  | 'regular'
  | 'on_call'
  | 'interview'
  | 'training'
  | 'meeting';

export interface TeamShift {
  id: string;
  company_id: string;
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  shift_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  shift_type: ShiftType;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftUpsert {
  shift_id?: string | null;
  user_id?: string | null;
  shift_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  shift_type?: ShiftType;
  notes?: string | null;
}

export interface BusinessHours {
  open: string; // HH:MM
  close: string; // HH:MM
}

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  regular: 'Regular',
  on_call: 'On-Call',
  interview: 'Interview',
  training: 'Training',
  meeting: 'Meeting',
};

export const SHIFT_TYPE_COLORS: Record<ShiftType, string> = {
  regular: 'badge-primary',
  on_call: 'badge-warning',
  interview: 'badge-info',
  training: 'badge-success',
  meeting: 'badge-secondary',
};

export const SHIFT_TYPE_BG: Record<ShiftType, string> = {
  regular: 'bg-primary/20 border-primary/40',
  on_call: 'bg-warning/20 border-warning/40',
  interview: 'bg-info/20 border-info/40',
  training: 'bg-success/20 border-success/40',
  meeting: 'bg-secondary/20 border-secondary/40',
};

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayHour}:${String(m).padStart(2, '0')} ${period}`;
}

export function getShiftDuration(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

// ─── Feature 067: Worker Schedule View + Time Tracking ──────────────────────

export type TimeEntryStatus = 'confirmed' | 'auto_closed';

/**
 * Row shape from get_worker_shifts RPC. Differs from TeamShift: no
 * display_name/avatar (the worker IS the row), but adds company_name and
 * server-precomputed timestamptz boundaries so the client compares against
 * Date.now() with no tz library.
 */
export interface WorkerShift {
  id: string;
  company_id: string;
  company_name: string;
  shift_date: string; // YYYY-MM-DD (local to metro tz)
  start_time: string; // HH:MM:SS (local to metro tz)
  end_time: string; // HH:MM:SS
  shift_type: ShiftType;
  notes: string | null;
  metro_timezone: string; // IANA, e.g. "America/New_York"
  /** ISO timestamptz. Clock-in button enables when Date.now() >= this. */
  clock_in_opens_at: string;
  /** ISO timestamptz. Scheduled end as a UTC instant. */
  shift_end_at: string;
  /** Joined from time_entries — non-null iff this shift has an open entry. */
  active_entry_id: string | null;
  active_clock_in_at: string | null;
  active_entry_status: TimeEntryStatus | null;
}

/**
 * Row shape from get_worker_week_summary RPC. Server-aggregated;
 * the client doesn't sum anything.
 */
export interface WeekSummary {
  scheduled_hours: number;
  worked_hours: number;
}

/** Row shape from clock_in / clock_out RPCs (mirrors time_entries table). */
export interface TimeEntry {
  id: string;
  client_event_id: string;
  shift_id: string;
  user_id: string;
  clock_in_at: string;
  clock_in_synced_at: string;
  clock_out_at: string | null;
  clock_out_synced_at: string | null;
  status: TimeEntryStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Detect paper-schedule overlaps within a single day. Two shifts overlap
 * if A.start < B.end AND B.start < A.end. start_time/end_time are HH:MM:SS
 * strings; lex comparison works for same-format time strings.
 *
 * This is advisory only — overlap is enforced at clock-in (one open
 * time_entry per user), not here. The flag exists so the worker can call
 * an employer ahead of time.
 */
export function getOverlapShiftIds(dayShifts: WorkerShift[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < dayShifts.length; i++) {
    for (let j = i + 1; j < dayShifts.length; j++) {
      const a = dayShifts[i];
      const b = dayShifts[j];
      if (a.start_time < b.end_time && b.start_time < a.end_time) {
        ids.add(a.id);
        ids.add(b.id);
      }
    }
  }
  return ids;
}

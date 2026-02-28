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

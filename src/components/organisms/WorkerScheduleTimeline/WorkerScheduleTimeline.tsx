'use client';

import React, { useMemo } from 'react';
import type { WorkerShift, WeekSummary } from '@/types/schedule';
import { getOverlapShiftIds } from '@/types/schedule';
import WorkerShiftCard from '@/components/molecular/WorkerShiftCard';

export interface WorkerScheduleTimelineProps {
  shiftsByDay: Map<string, WorkerShift[]>;
  weekDates: string[];
  weekStart: string;
  /** Server-aggregated totals (get_worker_week_summary RPC). Optional so Storybook stories that don't care can skip it. */
  summary?: WeekSummary | null;
  loading: boolean;
  error: string | null;
  pending?: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onClockIn: (shiftId: string) => void;
  onClockOut: (entryId: string) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getWeekLabel(weekStart: string): string {
  const start = new Date(weekStart + 'T00:00:00');
  const end = new Date(weekStart + 'T00:00:00');
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const endStr = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

function fmtHours(h: number): string {
  return h.toFixed(1);
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * WorkerScheduleTimeline — vertical day-grouped list of shifts across all
 * companies the worker is assigned to.
 *
 * Cross-company open-entry rule is mirrored client-side: if any shift in the
 * whole week has an open time entry, every other clock-in button is `blocked`.
 * (The server enforces this for real; the client mirror just avoids a
 * confusing enabled→error round-trip.)
 *
 * Paper-schedule overlap detection runs per-day via `getOverlapShiftIds`.
 *
 * @category organisms
 */
export default function WorkerScheduleTimeline({
  shiftsByDay,
  weekDates,
  weekStart,
  summary = null,
  loading,
  error,
  pending = false,
  onPrevWeek,
  onNextWeek,
  onClockIn,
  onClockOut,
}: WorkerScheduleTimelineProps) {
  // Find the one shift (anywhere in the week, any company) with an open entry.
  // Every *other* card gets blocked.
  const openEntryShiftId = useMemo(() => {
    for (const dayShifts of shiftsByDay.values()) {
      for (const s of dayShifts) {
        if (s.active_entry_id !== null) return s.id;
      }
    }
    return null;
  }, [shiftsByDay]);

  // Per-day overlap sets — paper schedule conflicts (advisory only).
  const overlapsByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [date, dayShifts] of shiftsByDay) {
      map.set(date, getOverlapShiftIds(dayShifts));
    }
    return map;
  }, [shiftsByDay]);

  const today = todayLocal();
  const totalShifts = useMemo(() => {
    let n = 0;
    for (const s of shiftsByDay.values()) n += s.length;
    return n;
  }, [shiftsByDay]);

  return (
    <div className="space-y-4" data-testid="worker-schedule-timeline">
      {/* Print-only header — replaces the interactive nav row on paper */}
      <div className="hidden print:mb-4 print:block print:text-center">
        <h1 className="text-xl font-bold">My Schedule</h1>
        <p className="text-sm">{getWeekLabel(weekStart)}</p>
      </div>

      <div className="flex items-center justify-between gap-2 print:hidden">
        <button
          type="button"
          onClick={onPrevWeek}
          className="btn btn-sm btn-ghost min-h-11 min-w-11"
          aria-label="Previous week"
        >
          ←
        </button>
        <h2 className="text-center text-base font-semibold sm:text-lg">
          {getWeekLabel(weekStart)}
        </h2>
        <button
          type="button"
          onClick={onNextWeek}
          className="btn btn-sm btn-ghost min-h-11 min-w-11"
          aria-label="Next week"
        >
          →
        </button>
      </div>

      {summary && (
        <div
          className="bg-base-200 grid grid-cols-2 gap-4 rounded p-3"
          data-testid="week-summary"
        >
          <div>
            <div className="text-base-content/60 text-xs">Scheduled</div>
            <div className="text-lg font-semibold">
              {fmtHours(summary.scheduled_hours)} h
            </div>
          </div>
          <div>
            <div className="text-base-content/60 text-xs">Worked</div>
            <div className="text-lg font-semibold">
              {fmtHours(summary.worked_hours)} h
            </div>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {!loading && !error && totalShifts === 0 && (
        <div className="text-base-content/60 py-12 text-center">
          No shifts scheduled this week.
        </div>
      )}

      {!loading && !error && totalShifts > 0 && (
        <div className="space-y-6">
          {weekDates.map((date, i) => {
            const dayShifts = shiftsByDay.get(date) ?? [];
            if (dayShifts.length === 0) return null;
            const overlaps = overlapsByDay.get(date) ?? new Set<string>();
            const isToday = date === today;

            return (
              <section key={date} data-testid={`day-${date}`}>
                <h3
                  className={`mb-2 text-sm font-semibold ${
                    isToday ? 'text-primary' : 'text-base-content/70'
                  }`}
                >
                  {DAY_LABELS[i]} · {formatDateShort(date)}
                  {isToday && ' · Today'}
                </h3>
                <div className="space-y-2">
                  {dayShifts.map((shift) => (
                    <WorkerShiftCard
                      key={shift.id}
                      shift={shift}
                      blocked={
                        openEntryShiftId !== null &&
                        openEntryShiftId !== shift.id
                      }
                      hasOverlap={overlaps.has(shift.id)}
                      pending={pending}
                      onClockIn={onClockIn}
                      onClockOut={onClockOut}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

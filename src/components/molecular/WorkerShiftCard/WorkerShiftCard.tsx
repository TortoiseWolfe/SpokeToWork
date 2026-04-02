'use client';

import React, { useEffect, useState } from 'react';
import type { WorkerShift } from '@/types/schedule';
import {
  SHIFT_TYPE_LABELS,
  SHIFT_TYPE_BG,
  formatTime,
} from '@/types/schedule';

export interface WorkerShiftCardProps {
  shift: WorkerShift;
  /** Disable clock-in even if the window is open (e.g., another shift has an open entry). */
  blocked?: boolean;
  /** Advisory only — paper-schedule overlap with another shift today. */
  hasOverlap?: boolean;
  pending?: boolean;
  onClockIn?: (shiftId: string) => void;
  onClockOut?: (entryId: string) => void;
}

/**
 * WorkerShiftCard — one shift in the worker's cross-company timeline.
 *
 * Clock-in window is decided by `Date.now() >= shift.clock_in_opens_at`
 * (server-precomputed timestamptz). No tz library needed. Re-evaluates
 * once a minute so the button enables itself when the window opens.
 *
 * @category molecular
 */
export default function WorkerShiftCard({
  shift,
  blocked = false,
  hasOverlap = false,
  pending = false,
  onClockIn,
  onClockOut,
}: WorkerShiftCardProps) {
  const opensAtMs = Date.parse(shift.clock_in_opens_at);
  const endsAtMs = Date.parse(shift.shift_end_at);

  // Tick that flips when the window state changes; not used for display,
  // just forces a re-render so the button enables.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const windowOpen = now >= opensAtMs;
  const isOver = now > endsAtMs;
  const isClockedIn = shift.active_entry_id !== null;
  const canClockIn = windowOpen && !isOver && !isClockedIn && !blocked;

  const bg = SHIFT_TYPE_BG[shift.shift_type] ?? SHIFT_TYPE_BG.regular;
  const label = SHIFT_TYPE_LABELS[shift.shift_type] ?? shift.shift_type;

  return (
    <div
      className={`rounded border p-3 ${bg}`}
      data-testid="worker-shift-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="leading-tight font-medium">
            {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
          </div>
          <div className="truncate text-sm font-medium">
            {shift.company_name}
          </div>
          <div className="text-base-content/60 text-xs">{label}</div>
        </div>
        <div className="shrink-0">
          {isClockedIn ? (
            <button
              type="button"
              onClick={() =>
                shift.active_entry_id && onClockOut?.(shift.active_entry_id)
              }
              disabled={pending}
              className="btn btn-sm btn-outline min-h-11"
              aria-label={`Clock out of ${shift.company_name}`}
            >
              {pending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                'Clock Out'
              )}
            </button>
          ) : isOver ? (
            <span className="badge badge-ghost">Ended</span>
          ) : (
            <button
              type="button"
              onClick={() => onClockIn?.(shift.id)}
              disabled={!canClockIn || pending}
              className="btn btn-primary btn-sm min-h-11"
              aria-label={`Clock in to ${shift.company_name}`}
            >
              {pending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                'Clock In'
              )}
            </button>
          )}
        </div>
      </div>

      {hasOverlap && !isClockedIn && (
        <div
          role="status"
          className="text-warning mt-2 flex items-center gap-1 text-xs"
        >
          <span aria-hidden="true">⚠</span> Overlaps another shift today
        </div>
      )}

      {!windowOpen && !isClockedIn && !isOver && (
        <div className="text-base-content/60 mt-2 text-xs">
          Opens 15 min before start
        </div>
      )}

      {blocked && !isClockedIn && windowOpen && !isOver && (
        <div className="text-base-content/60 mt-2 text-xs">
          Clock out of your other shift first
        </div>
      )}

      {isClockedIn && shift.active_clock_in_at && (
        <div className="text-success mt-2 text-xs font-medium">
          On the clock since{' '}
          {new Date(shift.active_clock_in_at).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </div>
      )}
    </div>
  );
}

'use client';

/**
 * /my-schedule — Feature 067
 *
 * Worker's cross-company shift list with clock in/out. Server-authoritative
 * validation: clock_in RPC rejects early-window and open-entry violations
 * with structured HINTs that we surface here. After every successful clock
 * action we refetch — get_worker_shifts also lazily auto-closes any stale
 * forgotten entries before returning.
 */
import { useState, useCallback } from 'react';
import {
  useWorkerSchedule,
  type AutoClosedNotice,
} from '@/hooks/useWorkerSchedule';
import { useTimeEntry } from '@/hooks/useTimeEntry';
import WorkerScheduleTimeline from '@/components/organisms/WorkerScheduleTimeline';

function fmtNotice(n: AutoClosedNotice): string {
  const date = new Date(n.shift_date + 'T00:00:00').toLocaleDateString(
    undefined,
    { weekday: 'short', month: 'short', day: 'numeric' }
  );
  const out = new Date(n.clock_out_at).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${n.company_name} · ${date} (closed at ${out})`;
}

export default function MySchedulePage() {
  const {
    shiftsByDay,
    weekDates,
    weekStart,
    summary,
    autoClosed,
    loading,
    error,
    prevWeek,
    nextWeek,
    refetch,
  } = useWorkerSchedule();

  const { clockIn, clockOut, pending } = useTimeEntry();

  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [dismissedAutoClose, setDismissedAutoClose] = useState(false);

  const handleClockIn = useCallback(
    async (shiftId: string) => {
      setActionMsg(null);
      const res = await clockIn(shiftId);
      if (!res.ok) {
        setActionMsg(res.message ?? 'Could not clock in.');
        return;
      }
      await refetch();
    },
    [clockIn, refetch]
  );

  const handleClockOut = useCallback(
    async (entryId: string) => {
      setActionMsg(null);
      const res = await clockOut(entryId);
      if (!res.ok) {
        setActionMsg(res.message ?? 'Could not clock out.');
        return;
      }
      await refetch();
    },
    [clockOut, refetch]
  );

  return (
    <div className="container mx-auto max-w-md px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">My Schedule</h1>
        <p className="text-base-content/60 text-sm">
          Shifts across all your jobs
        </p>
      </header>

      {autoClosed.length > 0 && !dismissedAutoClose && (
        <div role="alert" className="alert alert-info mb-4 items-start">
          <div className="flex-1">
            <p className="font-semibold">We clocked you out automatically</p>
            <ul className="mt-1 text-sm">
              {autoClosed.map((n) => (
                <li key={n.shift_id}>{fmtNotice(n)}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={() => setDismissedAutoClose(true)}
            className="btn btn-sm btn-ghost min-h-11 min-w-11"
            aria-label="Dismiss auto-close notice"
          >
            ✕
          </button>
        </div>
      )}

      {actionMsg && (
        <div role="alert" className="alert alert-warning mb-4">
          <span>{actionMsg}</span>
        </div>
      )}

      <WorkerScheduleTimeline
        shiftsByDay={shiftsByDay}
        weekDates={weekDates}
        weekStart={weekStart}
        summary={summary}
        loading={loading}
        error={error}
        pending={pending}
        onPrevWeek={prevWeek}
        onNextWeek={nextWeek}
        onClockIn={handleClockIn}
        onClockOut={handleClockOut}
      />
    </div>
  );
}

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import type { TeamShift } from '@/types/schedule';
import type { BusinessHours } from '@/types/schedule';
import { formatTime } from '@/types/schedule';
import type { TeamMember } from '@/hooks/useEmployerTeam';
import ShiftBlock from '@/components/atomic/ShiftBlock';

export interface WeekScheduleGridProps {
  shifts: TeamShift[];
  members: TeamMember[];
  weekStart: string;
  loading: boolean;
  error: string | null;
  businessHours: BusinessHours;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onAddShift: (date: string, userId?: string) => void;
  onEditShift: (shift: TeamShift) => void;
  onRefresh?: () => void;
  onUpdateBusinessHours?: (hours: BusinessHours) => Promise<void>;
  onCopyLastWeek?: () => Promise<number>;
  onSetSchedule?: (member: TeamMember) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getWeekLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const startD = new Date(weekStart + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  const startStr = startD.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const endStr = endD.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

/**
 * WeekScheduleGrid — week-view schedule with team members on rows, days on columns.
 *
 * Desktop: full 7-column grid. Mobile: day-by-day list.
 *
 * @category organisms
 */
export default function WeekScheduleGrid({
  shifts,
  members,
  weekStart,
  loading,
  error,
  businessHours,
  onPrevWeek,
  onNextWeek,
  onToday,
  onAddShift,
  onEditShift,
  onRefresh,
  onUpdateBusinessHours,
  onCopyLastWeek,
  onSetSchedule,
}: WeekScheduleGridProps) {
  // Editable business hours state
  const [editOpen, setEditOpen] = useState(businessHours.open);
  const [editClose, setEditClose] = useState(businessHours.close);
  const [hoursSaving, setHoursSaving] = useState(false);
  const hoursDirty =
    editOpen !== businessHours.open || editClose !== businessHours.close;

  // Sync local edit state when prop changes (e.g. after save)
  React.useEffect(() => {
    setEditOpen(businessHours.open);
    setEditClose(businessHours.close);
  }, [businessHours.open, businessHours.close]);

  const handleSaveHours = useCallback(async () => {
    if (!onUpdateBusinessHours || !hoursDirty) return;
    setHoursSaving(true);
    try {
      await onUpdateBusinessHours({ open: editOpen, close: editClose });
    } finally {
      setHoursSaving(false);
    }
  }, [onUpdateBusinessHours, hoursDirty, editOpen, editClose]);

  // Copy Last Week state
  const [copyConfirm, setCopyConfirm] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyResult, setCopyResult] = useState<number | null>(null);

  const handleCopyLastWeek = useCallback(async () => {
    if (!onCopyLastWeek) return;
    if (!copyConfirm) {
      setCopyConfirm(true);
      return;
    }
    setCopying(true);
    setCopyConfirm(false);
    try {
      const count = await onCopyLastWeek();
      setCopyResult(count);
      setTimeout(() => setCopyResult(null), 4000);
    } finally {
      setCopying(false);
    }
  }, [onCopyLastWeek, copyConfirm]);

  // Reset copy confirm when week changes
  React.useEffect(() => {
    setCopyConfirm(false);
    setCopyResult(null);
  }, [weekStart]);

  // Build day strings for the week
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Get unique user rows: named members + open shifts row
  const memberRows = useMemo(() => {
    const assignedIds = new Set(
      shifts.filter((s) => s.user_id).map((s) => s.user_id!)
    );
    // Members from team + any assigned users not in team
    const rows = [...members];
    for (const uid of assignedIds) {
      if (!rows.some((m) => m.user_id === uid)) {
        const shift = shifts.find((s) => s.user_id === uid);
        rows.push({
          user_id: uid,
          display_name: shift?.display_name ?? uid,
          avatar_url: shift?.avatar_url ?? null,
          joined_at: '',
        });
      }
    }
    return rows;
  }, [members, shifts]);

  const hasOpenShifts = shifts.some((s) => !s.user_id);

  // Group shifts by (user_id || 'open') + date
  const shiftMap = useMemo(() => {
    const map = new Map<string, TeamShift[]>();
    for (const s of shifts) {
      const key = `${s.user_id ?? 'open'}:${s.shift_date}`;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [shifts]);

  const getShiftsFor = (userId: string | null, date: string) =>
    shiftMap.get(`${userId ?? 'open'}:${date}`) ?? [];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span
          className="loading loading-spinner loading-lg"
          role="status"
          aria-label="Loading schedule"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" role="alert">
        <span>{error}</span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn btn-sm btn-ghost min-h-11 min-w-11"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-testid="week-schedule-grid">
      {/* Print-only header (hidden on screen) */}
      <div className="hidden print:mb-4 print:block print:text-center">
        <h1 className="text-xl font-bold">Weekly Schedule</h1>
        <p className="text-sm">{getWeekLabel(weekStart)}</p>
      </div>

      {/* Week navigation (hidden in print) */}
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <button
          onClick={onPrevWeek}
          className="btn btn-ghost btn-sm min-h-11 min-w-11"
          aria-label="Previous week"
        >
          &#x2190;
        </button>
        <h2 className="text-lg font-semibold">{getWeekLabel(weekStart)}</h2>
        <button
          onClick={onNextWeek}
          className="btn btn-ghost btn-sm min-h-11 min-w-11"
          aria-label="Next week"
        >
          &#x2192;
        </button>
        <button onClick={onToday} className="btn btn-ghost btn-sm min-h-11">
          Today
        </button>
        <div className="flex-1" />
        {onCopyLastWeek && (
          <div className="flex items-center gap-1">
            {copyResult !== null && (
              <span className="text-success text-sm">
                Copied {copyResult} shift{copyResult !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={handleCopyLastWeek}
              disabled={copying}
              className={`btn btn-ghost btn-sm min-h-11 ${copyConfirm ? 'btn-warning' : ''}`}
              aria-label={
                copyConfirm ? 'Confirm copy last week' : 'Copy last week'
              }
            >
              {copying ? (
                <span className="loading loading-spinner loading-xs" />
              ) : copyConfirm ? (
                'Confirm Copy?'
              ) : (
                'Copy Last Week'
              )}
            </button>
            {copyConfirm && (
              <button
                onClick={() => setCopyConfirm(false)}
                className="btn btn-ghost btn-sm min-h-11"
                aria-label="Cancel copy"
              >
                Cancel
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => onAddShift(days[0])}
          className="btn btn-primary btn-sm min-h-11"
        >
          + Add Shift
        </button>
      </div>

      {/* Desktop grid (hidden on mobile) */}
      <div className="hidden overflow-x-auto md:block">
        <table className="table-sm table w-full" aria-label="Weekly schedule">
          <thead>
            <tr>
              <th className="w-32">Team Member</th>
              {days.map((d, i) => {
                const isToday = d === new Date().toISOString().slice(0, 10);
                return (
                  <th
                    key={d}
                    className={`text-center ${isToday ? 'bg-primary/10' : ''}`}
                  >
                    <div>{DAY_LABELS[i]}</div>
                    <div className="text-xs font-normal">
                      {formatDateShort(d)}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {memberRows.map((member) => (
              <tr key={member.user_id}>
                <td className="font-medium">
                  {onSetSchedule ? (
                    <button
                      type="button"
                      onClick={() => onSetSchedule(member)}
                      className="hover:bg-base-200 flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition-colors"
                      aria-label={`Set schedule for ${member.display_name}`}
                    >
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt=""
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <div className="bg-base-300 flex h-6 w-6 items-center justify-center rounded-full text-xs">
                          {(member.display_name ?? '?')[0]}
                        </div>
                      )}
                      <span className="max-w-[100px] truncate">
                        {member.display_name ?? 'Unknown'}
                      </span>
                      <svg
                        className="h-3 w-3 opacity-40"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt=""
                          className="h-6 w-6 rounded-full"
                        />
                      ) : (
                        <div className="bg-base-300 flex h-6 w-6 items-center justify-center rounded-full text-xs">
                          {(member.display_name ?? '?')[0]}
                        </div>
                      )}
                      <span className="max-w-[100px] truncate">
                        {member.display_name ?? 'Unknown'}
                      </span>
                    </div>
                  )}
                </td>
                {days.map((d) => {
                  const cellShifts = getShiftsFor(member.user_id, d);
                  const isToday = d === new Date().toISOString().slice(0, 10);
                  return (
                    <td
                      key={d}
                      className={`align-top ${isToday ? 'bg-primary/5' : ''}`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onAddShift(d, member.user_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onAddShift(d, member.user_id);
                        }}
                        className="hover:bg-base-200 min-h-[60px] w-full cursor-pointer rounded p-1 transition-colors"
                        aria-label={`Add shift for ${member.display_name} on ${formatDateShort(d)}`}
                      >
                        <div className="space-y-1">
                          {cellShifts.map((s) => (
                            <div
                              key={s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditShift(s);
                              }}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.stopPropagation();
                                  onEditShift(s);
                                }
                              }}
                            >
                              <ShiftBlock shift={s} compact />
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Open shifts row */}
            {hasOpenShifts && (
              <tr>
                <td className="text-base-content/50 font-medium italic">
                  Open Shifts
                </td>
                {days.map((d) => {
                  const cellShifts = getShiftsFor(null, d);
                  return (
                    <td key={d} className="align-top">
                      <div className="min-h-[60px] space-y-1 p-1">
                        {cellShifts.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => onEditShift(s)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onEditShift(s);
                            }}
                          >
                            <ShiftBlock shift={s} compact />
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Empty state row */}
            {memberRows.length === 0 && !hasOpenShifts && (
              <tr>
                <td
                  colSpan={8}
                  className="text-base-content/60 py-12 text-center"
                >
                  No team members yet. Add members in the Team tab first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile day-by-day list (visible on mobile only) */}
      <div className="space-y-4 md:hidden">
        {days.map((d, i) => {
          const dayShifts = shifts.filter((s) => s.shift_date === d);
          const isToday = d === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={d}
              className={`rounded-lg border p-3 ${
                isToday ? 'border-primary/40 bg-primary/5' : 'border-base-300'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">
                  {DAY_LABELS[i]}, {formatDateShort(d)}
                  {isToday && (
                    <span className="badge badge-primary badge-sm ml-2">
                      Today
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => onAddShift(d)}
                  className="btn btn-ghost btn-xs min-h-11"
                  aria-label={`Add shift on ${formatDateShort(d)}`}
                >
                  + Add
                </button>
              </div>
              {dayShifts.length === 0 ? (
                <p className="text-base-content/40 text-sm">No shifts</p>
              ) : (
                <div className="space-y-2">
                  {dayShifts.map((s) => (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onEditShift(s)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onEditShift(s);
                      }}
                      className="bg-base-200 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {s.display_name ?? 'Open Shift'}
                        </div>
                        <div className="text-base-content/60 text-xs">
                          {formatTime(s.start_time)} – {formatTime(s.end_time)}
                        </div>
                      </div>
                      <ShiftBlock shift={s} compact />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Business hours footer (hidden in print) */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm print:hidden">
        {onUpdateBusinessHours ? (
          <>
            <label htmlFor="bh-open" className="text-base-content/60">
              Business hours:
            </label>
            <input
              id="bh-open"
              type="time"
              value={editOpen}
              onChange={(e) => setEditOpen(e.target.value)}
              className="input input-bordered input-sm min-h-11 w-28"
              aria-label="Opening time"
            />
            <span className="text-base-content/60">–</span>
            <input
              id="bh-close"
              type="time"
              value={editClose}
              onChange={(e) => setEditClose(e.target.value)}
              className="input input-bordered input-sm min-h-11 w-28"
              aria-label="Closing time"
            />
            {hoursDirty && (
              <button
                onClick={handleSaveHours}
                disabled={hoursSaving || editClose <= editOpen}
                className="btn btn-primary btn-sm min-h-11"
              >
                {hoursSaving ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  'Save Hours'
                )}
              </button>
            )}
            {editClose <= editOpen && hoursDirty && (
              <span className="text-error text-xs">
                Close must be after open
              </span>
            )}
          </>
        ) : (
          <span className="text-base-content/50">
            Business hours: {formatTime(businessHours.open)} –{' '}
            {formatTime(businessHours.close)}
          </span>
        )}
      </div>
    </div>
  );
}

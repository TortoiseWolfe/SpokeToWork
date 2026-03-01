'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { TeamMember } from '@/hooks/useEmployerTeam';
import type {
  TeamShift,
  ShiftUpsert,
  ShiftType,
  BusinessHours,
} from '@/types/schedule';
import { SHIFT_TYPE_LABELS } from '@/types/schedule';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

type ApplyMode = 'this_week' | 'next_4_weeks' | 'custom';

interface DayRow {
  enabled: boolean;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
}

export interface MemberScheduleDrawerProps {
  member: TeamMember | null;
  existingShifts: TeamShift[];
  weekStart: string;
  businessHours: BusinessHours;
  onSave: (entries: ShiftUpsert[]) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayIndex(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 ? 6 : day - 1; // Mon=0 ... Sun=6
}

function buildDefaultRows(
  existingShifts: TeamShift[],
  businessHours: BusinessHours
): DayRow[] {
  const rows: DayRow[] = DAY_LABELS.map(() => ({
    enabled: false,
    startTime: businessHours.open,
    endTime: businessHours.close,
    shiftType: 'regular' as ShiftType,
  }));

  for (const s of existingShifts) {
    const idx = getDayIndex(s.shift_date);
    if (idx >= 0 && idx < 7) {
      rows[idx] = {
        enabled: true,
        startTime: s.start_time.slice(0, 5),
        endTime: s.end_time.slice(0, 5),
        shiftType: s.shift_type,
      };
    }
  }

  return rows;
}

/**
 * MemberScheduleDrawer — set a weekly pattern for a team member.
 *
 * Shows Mon-Sun rows with checkboxes, time inputs, and shift type.
 * "Apply to" controls how many weeks to generate shifts for.
 */
export default function MemberScheduleDrawer({
  member,
  existingShifts,
  weekStart,
  businessHours,
  onSave,
  onClose,
  saving = false,
}: MemberScheduleDrawerProps) {
  const [days, setDays] = useState<DayRow[]>(() =>
    buildDefaultRows(existingShifts, businessHours)
  );
  const [applyMode, setApplyMode] = useState<ApplyMode>('this_week');
  const [weekCount, setWeekCount] = useState(4);

  // Re-initialize when member or shifts change
  useEffect(() => {
    if (member) {
      setDays(buildDefaultRows(existingShifts, businessHours));
      setApplyMode('this_week');
    }
  }, [member, existingShifts, businessHours]);

  const updateDay = useCallback((index: number, updates: Partial<DayRow>) => {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
  }, []);

  const enabledCount = days.filter((d) => d.enabled).length;

  const totalWeeks = applyMode === 'this_week' ? 1 : weekCount;
  const totalShifts = enabledCount * totalWeeks;

  const weekRangeLabel = useMemo(() => {
    const end = addDays(weekStart, 6 + (totalWeeks - 1) * 7);
    const startD = new Date(weekStart + 'T00:00:00');
    const endD = new Date(end + 'T00:00:00');
    return `${startD.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${endD.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [weekStart, totalWeeks]);

  const handleSave = useCallback(async () => {
    const entries: ShiftUpsert[] = [];

    for (let w = 0; w < totalWeeks; w++) {
      for (let d = 0; d < 7; d++) {
        if (!days[d].enabled) continue;
        entries.push({
          shift_date: addDays(weekStart, d + w * 7),
          start_time: days[d].startTime,
          end_time: days[d].endTime,
          shift_type: days[d].shiftType,
        });
      }
    }

    await onSave(entries);
  }, [days, weekStart, totalWeeks, onSave]);

  // Set all weekdays at once
  const handleSetWeekdays = useCallback(() => {
    setDays((prev) =>
      prev.map((d, i) => ({
        ...d,
        enabled: i < 5, // Mon-Fri
      }))
    );
  }, []);

  if (!member) return null;

  return (
    <div
      className="bg-base-100 border-base-300 fixed inset-y-0 right-0 z-50 w-full max-w-md border-l shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-label={`${member.display_name}'s weekly schedule`}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-base-300 flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-lg font-bold">
              {member.display_name}&apos;s Schedule
            </h2>
            <p className="text-base-content/60 text-sm">Set weekly pattern</p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm min-h-11 min-w-11"
            aria-label="Close drawer"
          >
            &#x2715;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Quick actions */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={handleSetWeekdays}
              className="btn btn-ghost btn-xs min-h-11"
              type="button"
            >
              Mon–Fri
            </button>
            <button
              onClick={() =>
                setDays((prev) => prev.map((d) => ({ ...d, enabled: true })))
              }
              className="btn btn-ghost btn-xs min-h-11"
              type="button"
            >
              All days
            </button>
            <button
              onClick={() =>
                setDays((prev) => prev.map((d) => ({ ...d, enabled: false })))
              }
              className="btn btn-ghost btn-xs min-h-11"
              type="button"
            >
              Clear all
            </button>
          </div>

          {/* Day rows */}
          <div className="space-y-2">
            {DAY_LABELS.map((label, i) => (
              <div
                key={label}
                className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${
                  days[i].enabled
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-base-300 opacity-50'
                }`}
              >
                <label className="flex min-w-[70px] cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={days[i].enabled}
                    onChange={(e) =>
                      updateDay(i, { enabled: e.target.checked })
                    }
                    aria-label={`Enable ${label}`}
                  />
                  <span className="text-sm font-medium">{label}</span>
                </label>

                {days[i].enabled && (
                  <>
                    <input
                      type="time"
                      value={days[i].startTime}
                      onChange={(e) =>
                        updateDay(i, { startTime: e.target.value })
                      }
                      className="input input-bordered input-sm min-h-11 w-24"
                      aria-label={`${label} start time`}
                    />
                    <span className="text-base-content/40">–</span>
                    <input
                      type="time"
                      value={days[i].endTime}
                      onChange={(e) =>
                        updateDay(i, { endTime: e.target.value })
                      }
                      className="input input-bordered input-sm min-h-11 w-24"
                      aria-label={`${label} end time`}
                    />
                    <select
                      value={days[i].shiftType}
                      onChange={(e) =>
                        updateDay(i, { shiftType: e.target.value as ShiftType })
                      }
                      className="select select-bordered select-sm min-h-11 w-24"
                      aria-label={`${label} shift type`}
                    >
                      {Object.entries(SHIFT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Apply to range */}
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold">Apply to</h3>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="applyMode"
                  className="radio radio-sm radio-primary"
                  checked={applyMode === 'this_week'}
                  onChange={() => setApplyMode('this_week')}
                />
                <span className="text-sm">This week only</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="applyMode"
                  className="radio radio-sm radio-primary"
                  checked={applyMode === 'next_4_weeks'}
                  onChange={() => setApplyMode('next_4_weeks')}
                />
                <span className="text-sm">
                  Next{' '}
                  <select
                    value={weekCount}
                    onChange={(e) => {
                      setWeekCount(Number(e.target.value));
                      setApplyMode('next_4_weeks');
                    }}
                    className="select select-bordered select-xs mx-1 inline min-h-8"
                    aria-label="Number of weeks"
                  >
                    {[2, 3, 4, 6, 8, 12].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>{' '}
                  weeks
                </span>
              </label>
            </div>
          </div>

          {/* Summary */}
          {enabledCount > 0 && (
            <div className="bg-base-200 mt-4 rounded-lg p-3 text-sm">
              <p>
                <strong>{totalShifts}</strong> shift
                {totalShifts !== 1 ? 's' : ''} will be created for{' '}
                <strong>{member.display_name}</strong>
              </p>
              <p className="text-base-content/60 mt-1">{weekRangeLabel}</p>
              <p className="text-warning mt-1 text-xs">
                Existing shifts in this date range will be replaced.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-base-300 flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm min-h-11"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || enabledCount === 0}
            className="btn btn-primary btn-sm min-h-11"
          >
            {saving ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              `Save ${totalShifts} Shift${totalShifts !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

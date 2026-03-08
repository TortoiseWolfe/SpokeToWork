'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { TeamShift, ShiftType, ShiftUpsert } from '@/types/schedule';
import {
  SHIFT_TYPE_LABELS,
  formatTime,
  getShiftDuration,
} from '@/types/schedule';
import type { TeamMember } from '@/hooks/useEmployerTeam';

export interface ShiftEditorDrawerProps {
  shift: TeamShift | null;
  defaultDate?: string;
  defaultUserId?: string;
  members: TeamMember[];
  onSave: (data: ShiftUpsert) => Promise<void>;
  onDelete?: (shiftId: string) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

const SHIFT_TYPES: ShiftType[] = [
  'regular',
  'on_call',
  'interview',
  'training',
  'meeting',
];

/**
 * ShiftEditorDrawer — slide-out panel for creating/editing shifts.
 *
 * Follows the ApplicationDetailDrawer pattern.
 *
 * @category molecular
 */
export default function ShiftEditorDrawer({
  shift,
  defaultDate,
  defaultUserId,
  members,
  onSave,
  onDelete,
  onClose,
  saving = false,
}: ShiftEditorDrawerProps) {
  const isEdit = !!shift;
  const [userId, setUserId] = useState<string>('');
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [shiftType, setShiftType] = useState<ShiftType>('regular');
  const [notes, setNotes] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Initialize form when opening
  useEffect(() => {
    if (shift) {
      setUserId(shift.user_id ?? '');
      setShiftDate(shift.shift_date);
      setStartTime(shift.start_time.slice(0, 5));
      setEndTime(shift.end_time.slice(0, 5));
      setShiftType(shift.shift_type as ShiftType);
      setNotes(shift.notes ?? '');
    } else {
      setUserId(defaultUserId ?? '');
      setShiftDate(
        defaultDate ??
          (() => {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const dy = String(now.getDate()).padStart(2, '0');
            return `${y}-${m}-${dy}`;
          })()
      );
      setStartTime('09:00');
      setEndTime('17:00');
      setShiftType('regular');
      setNotes('');
    }
    setDeleteConfirm(false);
  }, [shift, defaultDate, defaultUserId]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const isOpen = !!shift || !!defaultDate;
  if (!isOpen) return null;

  const duration = getShiftDuration(startTime, endTime);
  const isValid = shiftDate && startTime && endTime && duration > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || saving) return;
    await onSave({
      shift_id: shift?.id ?? null,
      user_id: userId || null,
      shift_date: shiftDate,
      start_time: startTime,
      end_time: endTime,
      shift_type: shiftType,
      notes: notes || null,
    });
  };

  const handleDelete = async () => {
    if (!shift || !onDelete) return;
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    await onDelete(shift.id);
    onClose();
  };

  return (
    <>
      <div
        className="bg-base-300/60 fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-label={isEdit ? 'Edit shift' : 'Add shift'}
        aria-modal="true"
        className="bg-base-100 fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col shadow-xl"
      >
        {/* Header */}
        <div className="border-base-300 flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold">
            {isEdit ? 'Edit Shift' : 'Add Shift'}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle min-h-11 min-w-11"
            aria-label="Close drawer"
          >
            &#x2715;
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="space-y-4 px-6 py-4">
            {/* Assignee */}
            <div className="form-control">
              <label htmlFor="shift-user" className="label">
                <span className="label-text">Assign to</span>
              </label>
              <select
                id="shift-user"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="select select-bordered min-h-11 w-full"
              >
                <option value="">Open Shift (unassigned)</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name ?? m.user_id}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="form-control">
              <label htmlFor="shift-date" className="label">
                <span className="label-text">Date</span>
              </label>
              <input
                id="shift-date"
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="input input-bordered min-h-11 w-full"
                required
              />
            </div>

            {/* Time range */}
            <div className="flex gap-3">
              <div className="form-control flex-1">
                <label htmlFor="shift-start" className="label">
                  <span className="label-text">Start</span>
                </label>
                <input
                  id="shift-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="input input-bordered min-h-11 w-full"
                  required
                />
              </div>
              <div className="form-control flex-1">
                <label htmlFor="shift-end" className="label">
                  <span className="label-text">End</span>
                </label>
                <input
                  id="shift-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="input input-bordered min-h-11 w-full"
                  required
                />
              </div>
            </div>

            {/* Duration display */}
            {duration > 0 && (
              <p className="text-base-content/60 text-sm">
                Duration: {duration.toFixed(1)} hours
              </p>
            )}
            {duration <= 0 && startTime && endTime && (
              <p className="text-error text-sm">
                End time must be after start time
              </p>
            )}

            {/* Shift type */}
            <div className="form-control">
              <label htmlFor="shift-type" className="label">
                <span className="label-text">Type</span>
              </label>
              <select
                id="shift-type"
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value as ShiftType)}
                className="select select-bordered min-h-11 w-full"
              >
                {SHIFT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SHIFT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="form-control">
              <label htmlFor="shift-notes" className="label">
                <span className="label-text">Notes</span>
              </label>
              <textarea
                id="shift-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="textarea textarea-bordered min-h-11 w-full"
                rows={2}
                placeholder="Optional notes..."
              />
            </div>

            {/* Summary */}
            {isValid && userId && (
              <div className="bg-base-200 rounded-lg p-3 text-sm">
                <strong>
                  {members.find((m) => m.user_id === userId)?.display_name ??
                    'Team member'}
                </strong>{' '}
                — {formatTime(startTime)} to {formatTime(endTime)} (
                {duration.toFixed(1)}h {SHIFT_TYPE_LABELS[shiftType]})
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-base-300 mt-auto flex gap-2 border-t px-6 py-4">
            <button
              type="submit"
              disabled={!isValid || saving}
              className="btn btn-primary min-h-11 flex-1"
            >
              {saving ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Saving...
                </>
              ) : isEdit ? (
                'Update Shift'
              ) : (
                'Add Shift'
              )}
            </button>
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className={`btn min-h-11 ${
                  deleteConfirm ? 'btn-error' : 'btn-ghost text-error'
                }`}
              >
                {deleteConfirm ? 'Confirm Delete' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost min-h-11"
            >
              Cancel
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

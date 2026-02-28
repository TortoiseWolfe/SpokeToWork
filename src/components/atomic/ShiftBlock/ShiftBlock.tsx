'use client';

import React from 'react';
import type { TeamShift, ShiftType } from '@/types/schedule';
import { SHIFT_TYPE_LABELS, SHIFT_TYPE_BG, formatTime } from '@/types/schedule';

export interface ShiftBlockProps {
  shift: TeamShift;
  onClick?: (shift: TeamShift) => void;
  compact?: boolean;
}

/**
 * ShiftBlock — colored block representing a single shift.
 *
 * Shows time range and shift type. Clickable to open editor.
 *
 * @category atomic
 */
export default function ShiftBlock({
  shift,
  onClick,
  compact = false,
}: ShiftBlockProps) {
  const bg =
    SHIFT_TYPE_BG[shift.shift_type as ShiftType] ?? SHIFT_TYPE_BG.regular;
  const label =
    SHIFT_TYPE_LABELS[shift.shift_type as ShiftType] ?? shift.shift_type;

  return (
    <button
      type="button"
      onClick={() => onClick?.(shift)}
      className={`w-full rounded border text-left transition-opacity hover:opacity-80 ${bg} ${
        compact ? 'px-1 py-0.5 text-xs' : 'px-2 py-1 text-sm'
      }`}
      aria-label={`${shift.display_name ?? 'Open'} shift: ${formatTime(shift.start_time)} to ${formatTime(shift.end_time)}, ${label}`}
    >
      <div className="leading-tight font-medium">
        {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
      </div>
      {!compact && (
        <div className="text-base-content/60 text-xs leading-tight">
          {label}
        </div>
      )}
    </button>
  );
}

'use client';

import React from 'react';
import {
  JOB_STATUS_ORDER,
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  type JobApplicationStatus,
} from '@/types/company';

export interface StatusFunnelProps {
  /** Per-status counts. */
  statusCounts: Partial<Record<JobApplicationStatus, number>>;
  /** Total applications. */
  totalCount: number;
  /** Currently active filter (null or 'all' = show all). */
  activeFilter: JobApplicationStatus | 'all';
  /** Fired when user clicks a stage or the "All" control. */
  onFilterChange: (filter: JobApplicationStatus | 'all') => void;
  className?: string;
}

/**
 * StatusFunnel - Horizontal pipeline visualization for the hiring funnel.
 *
 * Each stage is a connected bar with count overlay. Click to filter.
 * Industrial command-center aesthetic: high contrast, monospaced counters.
 *
 * @category molecular
 */
export default function StatusFunnel({
  statusCounts,
  totalCount,
  activeFilter,
  onFilterChange,
  className = '',
}: StatusFunnelProps) {
  const maxCount = Math.max(
    1,
    ...JOB_STATUS_ORDER.map((s) => statusCounts[s] ?? 0)
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* All toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onFilterChange('all')}
          className={`btn btn-sm min-h-11 ${
            activeFilter === 'all' ? 'btn-primary' : 'btn-ghost'
          }`}
          aria-pressed={activeFilter === 'all'}
        >
          All Applications
          <span className="font-mono font-bold">{totalCount}</span>
        </button>
      </div>

      {/* Pipeline bars */}
      <div
        className="flex gap-1 overflow-x-auto pb-2"
        role="group"
        aria-label="Application pipeline stages"
      >
        {JOB_STATUS_ORDER.map((status) => {
          const count = statusCounts[status] ?? 0;
          const isActive = activeFilter === status;
          const widthPct = Math.max(15, (count / maxCount) * 100);
          const badgeClass = JOB_STATUS_COLORS[status] ?? 'badge-neutral';

          return (
            <button
              key={status}
              onClick={() => onFilterChange(isActive ? 'all' : status)}
              className={`relative flex min-w-[100px] flex-1 flex-col items-center rounded-md border-2 px-3 py-2 transition-all ${
                isActive
                  ? 'border-primary bg-primary/10'
                  : 'border-base-content/10 bg-base-200 hover:border-base-content/30'
              }`}
              aria-pressed={isActive}
              aria-label={`${JOB_STATUS_LABELS[status]}: ${count} applications`}
            >
              <span className="text-base-content/70 mb-1 text-xs font-medium">
                {JOB_STATUS_LABELS[status]}
              </span>
              <span className="font-mono text-lg font-bold">{count}</span>
              {/* Fill bar */}
              <div className="bg-base-content/10 mt-1 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full transition-all ${
                    isActive
                      ? 'bg-primary'
                      : badgeClass.replace('badge-', 'bg-')
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

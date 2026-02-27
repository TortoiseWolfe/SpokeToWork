'use client';

import React, { useState, useMemo } from 'react';
import {
  getStatusStyle,
  JOB_STATUS_ORDER,
  type JobApplicationStatus,
} from '@/types/company';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';
import ApplicationRow from '@/components/molecular/ApplicationRow';

export interface EmployerDashboardProps {
  applications: EmployerApplication[];
  loading: boolean;
  error: string | null;
  onUpdateStatus: (
    applicationId: string,
    status: JobApplicationStatus
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
  // --- Optional full-dataset meta (from paginated hook) --------------------
  // When omitted (stories, unit tests), counts are derived locally from
  // `applications`. When supplied, these reflect the FULL dataset so the
  // funnel stays accurate even if only the first page is loaded.
  /** Per-status counts across all applications (not just loaded page). */
  statusCounts?: Partial<Record<JobApplicationStatus, number>>;
  /** Total count across all applications. Drives the "All" badge. */
  totalCount?: number;
  /** user_ids appearing more than once in the full dataset. */
  repeatUserIds?: Set<string>;
  // --- Load-more pagination -----------------------------------------------
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => Promise<void>;
}

/**
 * EmployerDashboard - Displays job applications with filtering and status management
 *
 * Stats bar counts are driven by `statusCounts`/`totalCount` when provided
 * (paginated mode — hook runs a separate meta query over the full dataset).
 * When not provided, counts fall back to local derivation from `applications`,
 * keeping stories/tests zero-config.
 *
 * @category organisms
 * @see specs/063-employer-dashboard/spec.md
 */
export default function EmployerDashboard({
  applications,
  loading,
  error,
  onUpdateStatus,
  onRefresh,
  statusCounts,
  totalCount,
  repeatUserIds,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: EmployerDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<
    JobApplicationStatus | 'all'
  >('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered =
    statusFilter === 'all'
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  // Local-derivation fallbacks — used when full-dataset meta props aren't
  // supplied (i.e. the component is being used standalone, not behind the
  // paginated hook). Keeps existing stories/tests passing unchanged.
  const localCounts = useMemo(() => {
    if (statusCounts) return null; // prop wins, skip the work
    return applications.reduce<Partial<Record<JobApplicationStatus, number>>>(
      (acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1;
        return acc;
      },
      {}
    );
  }, [applications, statusCounts]);

  const localRepeats = useMemo(() => {
    if (repeatUserIds) return null;
    const counts = applications.reduce<Record<string, number>>((acc, a) => {
      acc[a.user_id] = (acc[a.user_id] ?? 0) + 1;
      return acc;
    }, {});
    return new Set(
      Object.entries(counts)
        .filter(([, n]) => n > 1)
        .map(([uid]) => uid)
    );
  }, [applications, repeatUserIds]);

  const countFor = (s: JobApplicationStatus) =>
    (statusCounts ?? localCounts!)[s] ?? 0;
  const total = totalCount ?? applications.length;
  const isRepeat = (uid: string) => (repeatUserIds ?? localRepeats!).has(uid);

  const handleAdvanceStatus = async (app: EmployerApplication) => {
    const next = JOB_STATUS_ORDER[JOB_STATUS_ORDER.indexOf(app.status) + 1];
    if (!next) return;
    setUpdatingId(app.id);
    try {
      await onUpdateStatus(app.id, next);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <span
          className="loading loading-spinner loading-lg"
          role="status"
          aria-label="Loading applications"
        />
      </div>
    );

  if (error)
    return (
      <div className="alert alert-error" role="alert">
        <span>{error}</span>
        <button
          onClick={onRefresh}
          className="btn btn-sm btn-ghost min-h-11 min-w-11"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div data-testid="employer-dashboard">
      {/* Stats Bar */}
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Application status counts"
      >
        {JOB_STATUS_ORDER.map((status) => {
          const { label, className } = getStatusStyle(status);
          const count = countFor(status);
          const active = statusFilter === status;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(active ? 'all' : status)}
              className={`badge min-h-11 cursor-pointer gap-1 px-3 ${active ? 'badge-primary' : className}`}
              aria-pressed={active}
            >
              {label}
              <span className="font-bold">{count}</span>
            </button>
          );
        })}
        <button
          onClick={() => setStatusFilter('all')}
          className={`badge min-h-11 cursor-pointer gap-1 px-3 ${statusFilter === 'all' ? 'badge-primary' : 'badge-outline'}`}
          aria-pressed={statusFilter === 'all'}
        >
          All
          <span className="font-bold">{total}</span>
        </button>
      </div>

      {/* Applications Table */}
      {filtered.length === 0 ? (
        <div className="text-base-content/85 py-12 text-center">
          <p>
            {total === 0
              ? 'No applications yet'
              : `No ${statusFilter} applications`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table" aria-label="Job applications">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Position</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <ApplicationRow
                  key={app.id}
                  application={app}
                  onAdvance={handleAdvanceStatus}
                  updating={updatingId === app.id}
                  isRepeat={isRepeat(app.user_id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Load-more — only when the hook reports more rows exist. */}
      {hasMore && onLoadMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="btn btn-outline min-h-11"
            aria-label="Load more applications"
          >
            {loadingMore ? (
              <>
                <span className="loading loading-spinner loading-sm" />
                Loading…
              </>
            ) : (
              `Load more (${applications.length} of ${total})`
            )}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useMemo } from 'react';
import {
  JOB_STATUS_ORDER,
  JOB_STATUS_LABELS,
  type JobApplicationStatus,
} from '@/types/company';
import type { JobApplicationSort } from '@/types/company';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';
import ApplicationRow from '@/components/molecular/ApplicationRow';
import StatusFunnel from '@/components/molecular/StatusFunnel';
import StatusColumn from '@/components/molecular/StatusColumn';
import ViewModeToggle, {
  type ViewMode,
} from '@/components/atomic/ViewModeToggle';

type SortField = JobApplicationSort['field'];
type SortDirection = JobApplicationSort['direction'];

export interface EmployerDashboardProps {
  applications: EmployerApplication[];
  loading: boolean;
  error: string | null;
  onUpdateStatus: (
    applicationId: string,
    status: JobApplicationStatus
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
  /** Per-status counts across all applications (not just loaded page). */
  statusCounts?: Partial<Record<JobApplicationStatus, number>>;
  /** Total count across all applications. Drives the "All" badge. */
  totalCount?: number;
  /** user_ids appearing more than once in the full dataset. */
  repeatUserIds?: Set<string>;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => Promise<void>;
  /** Called when user clicks a row. */
  onSelectApplication?: (app: EmployerApplication) => void;
}

/** Sortable column definitions. */
const SORT_COLUMNS: { field: SortField; label: string }[] = [
  { field: 'priority', label: 'P' },
  { field: 'status', label: 'Status' },
  { field: 'interview_date', label: 'Interview' },
  { field: 'date_applied', label: 'Applied' },
];

/**
 * EmployerDashboard - Application pipeline with funnel, sortable table,
 * kanban board, and search.
 *
 * @category organisms
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
  onSelectApplication,
}: EmployerDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<
    JobApplicationStatus | 'all'
  >('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sort, setSort] = useState<{
    field: SortField;
    direction: SortDirection;
  }>({
    field: 'created_at',
    direction: 'desc',
  });

  // Local-derivation fallbacks for standalone usage (stories/tests)
  const localCounts = useMemo(() => {
    if (statusCounts) return null;
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

  const resolvedCounts = statusCounts ?? localCounts!;
  const total = totalCount ?? applications.length;
  const isRepeat = (uid: string) => (repeatUserIds ?? localRepeats!).has(uid);

  // Filter by status
  const statusFiltered =
    statusFilter === 'all'
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  // Filter by search query
  const searched = useMemo(() => {
    if (!searchQuery.trim()) return statusFiltered;
    const q = searchQuery.toLowerCase();
    return statusFiltered.filter(
      (a) =>
        a.applicant_name.toLowerCase().includes(q) ||
        a.company_name.toLowerCase().includes(q) ||
        (a.position_title?.toLowerCase().includes(q) ?? false)
    );
  }, [statusFiltered, searchQuery]);

  // Sort (table view only)
  const sorted = useMemo(() => {
    const arr = [...searched];
    const { field, direction } = sort;
    const mult = direction === 'asc' ? 1 : -1;

    arr.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'priority':
          cmp = a.priority - b.priority;
          break;
        case 'status':
          cmp =
            JOB_STATUS_ORDER.indexOf(a.status) -
            JOB_STATUS_ORDER.indexOf(b.status);
          break;
        case 'interview_date':
          cmp = (a.interview_date ?? '').localeCompare(b.interview_date ?? '');
          break;
        case 'date_applied':
          cmp = (a.date_applied ?? '').localeCompare(b.date_applied ?? '');
          break;
        case 'position_title':
          cmp = (a.position_title ?? '').localeCompare(b.position_title ?? '');
          break;
        default:
          cmp = a.created_at.localeCompare(b.created_at);
      }
      return cmp * mult;
    });
    return arr;
  }, [searched, sort]);

  // Kanban: group by status
  const kanbanGroups = useMemo(() => {
    const groups: Record<string, EmployerApplication[]> = {};
    for (const s of JOB_STATUS_ORDER) {
      groups[s] = [];
    }
    for (const app of searched) {
      if (groups[app.status]) {
        groups[app.status].push(app);
      }
    }
    return groups;
  }, [searched]);

  const handleSort = (field: SortField) => {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' }
    );
  };

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

  // Kanban card handlers — adapt to StatusColumn/ApplicationCard interface
  const handleKanbanAdvance = async (
    applicationId: string,
    interviewDate?: string
  ) => {
    const app = applications.find((a) => a.id === applicationId);
    if (!app) return;
    const next = JOB_STATUS_ORDER[JOB_STATUS_ORDER.indexOf(app.status) + 1];
    if (!next) return;
    setUpdatingId(applicationId);
    try {
      await onUpdateStatus(applicationId, next);
      // If interview date was provided, we'd update it here in the future
      void interviewDate;
    } finally {
      setUpdatingId(null);
    }
  };

  const handleKanbanReject = async (applicationId: string) => {
    setUpdatingId(applicationId);
    try {
      await onUpdateStatus(applicationId, 'closed');
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
      {/* Pipeline Funnel */}
      <StatusFunnel
        statusCounts={resolvedCounts}
        totalCount={total}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        className="mb-6"
      />

      {/* Toolbar: Search + View Toggle */}
      <div className="mb-4 flex items-center gap-4">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, company, or position..."
          className="input input-bordered min-h-11 max-w-md flex-1"
          aria-label="Search applications"
        />
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* Content area */}
      {searched.length === 0 ? (
        <div className="text-base-content/85 py-12 text-center">
          <p>
            {total === 0
              ? 'No applications yet'
              : searchQuery
                ? 'No matching applications'
                : `No ${statusFilter} applications`}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="table" aria-label="Job applications">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>
                  <button
                    onClick={() => handleSort('position_title')}
                    className="btn btn-ghost btn-xs gap-1"
                    aria-label="Sort by position"
                  >
                    Position
                    <SortArrow
                      active={sort.field === 'position_title'}
                      direction={sort.direction}
                    />
                  </button>
                </th>
                {SORT_COLUMNS.map(({ field, label }) => (
                  <th key={field}>
                    <button
                      onClick={() => handleSort(field)}
                      className="btn btn-ghost btn-xs gap-1"
                      aria-label={`Sort by ${label.toLowerCase()}`}
                    >
                      {label}
                      <SortArrow
                        active={sort.field === field}
                        direction={sort.direction}
                      />
                    </button>
                  </th>
                ))}
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((app) => (
                <ApplicationRow
                  key={app.id}
                  application={app}
                  onAdvance={handleAdvanceStatus}
                  updating={updatingId === app.id}
                  isRepeat={isRepeat(app.user_id)}
                  onClick={
                    onSelectApplication
                      ? () => onSelectApplication(app)
                      : undefined
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban View */
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          role="region"
          aria-label="Kanban board"
        >
          {JOB_STATUS_ORDER.map((status) => (
            <StatusColumn
              key={status}
              status={status}
              label={JOB_STATUS_LABELS[status]}
              applications={kanbanGroups[status].map((a) => ({
                id: a.id,
                applicant_name: a.applicant_name,
                company_name: a.company_name,
                position_title: a.position_title,
                status: a.status,
                outcome: a.outcome,
                date_applied: a.date_applied,
                interview_date: a.interview_date,
              }))}
              onAdvance={handleKanbanAdvance}
              onReject={handleKanbanReject}
              updatingId={updatingId}
              className="min-h-[300px]"
            />
          ))}
        </div>
      )}

      {/* Load-more (table view only) */}
      {viewMode === 'table' && hasMore && onLoadMore && (
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
                Loading...
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

/** Tiny sort direction arrow indicator. */
function SortArrow({
  active,
  direction,
}: {
  active: boolean;
  direction: SortDirection;
}) {
  if (!active) return <span className="text-base-content/20">&#x2195;</span>;
  return (
    <span className="text-primary">
      {direction === 'asc' ? '\u2191' : '\u2193'}
    </span>
  );
}

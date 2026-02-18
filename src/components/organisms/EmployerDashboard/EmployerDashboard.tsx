'use client';

import React, { useState } from 'react';
import type { JobApplicationStatus } from '@/types/company';
import { JOB_STATUS_LABELS, JOB_STATUS_COLORS } from '@/types/company';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

export interface EmployerDashboardProps {
  applications: EmployerApplication[];
  loading: boolean;
  error: string | null;
  onUpdateStatus: (
    applicationId: string,
    status: JobApplicationStatus
  ) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const STATUS_ORDER: JobApplicationStatus[] = [
  'not_applied',
  'applied',
  'screening',
  'interviewing',
  'offer',
  'closed',
];

/**
 * EmployerDashboard - Displays job applications with filtering and status management
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
}: EmployerDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<
    JobApplicationStatus | 'all'
  >('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered =
    statusFilter === 'all'
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  // Stats
  const statusCounts = STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = applications.filter((a) => a.status === status).length;
      return acc;
    },
    {} as Record<JobApplicationStatus, number>
  );

  const handleAdvanceStatus = async (app: EmployerApplication) => {
    const currentIdx = STATUS_ORDER.indexOf(app.status);
    if (currentIdx < STATUS_ORDER.length - 1) {
      setUpdatingId(app.id);
      try {
        await onUpdateStatus(app.id, STATUS_ORDER[currentIdx + 1]);
      } finally {
        setUpdatingId(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <span
          className="loading loading-spinner loading-lg"
          role="status"
          aria-label="Loading applications"
        ></span>
      </div>
    );
  }

  if (error) {
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
  }

  return (
    <div data-testid="employer-dashboard">
      {/* Stats Bar */}
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="group"
        aria-label="Application status counts"
      >
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            onClick={() =>
              setStatusFilter(statusFilter === status ? 'all' : status)
            }
            className={`badge min-h-11 cursor-pointer gap-1 px-3 ${
              statusFilter === status
                ? 'badge-primary'
                : JOB_STATUS_COLORS[status]
            }`}
            aria-pressed={statusFilter === status}
          >
            {JOB_STATUS_LABELS[status]}
            <span className="font-bold">{statusCounts[status]}</span>
          </button>
        ))}
        <button
          onClick={() => setStatusFilter('all')}
          className={`badge min-h-11 cursor-pointer gap-1 px-3 ${
            statusFilter === 'all' ? 'badge-primary' : 'badge-outline'
          }`}
          aria-pressed={statusFilter === 'all'}
        >
          All
          <span className="font-bold">{applications.length}</span>
        </button>
      </div>

      {/* Applications Table */}
      {filtered.length === 0 ? (
        <div className="text-base-content/85 py-12 text-center">
          <p>
            {applications.length === 0
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
                <tr key={app.id} data-testid="application-row">
                  <td>
                    <div className="font-medium">{app.applicant_name}</div>
                    <div className="text-base-content/75 text-sm">
                      {app.company_name}
                    </div>
                  </td>
                  <td>{app.position_title || 'Not specified'}</td>
                  <td>
                    <span className={`badge ${JOB_STATUS_COLORS[app.status]}`}>
                      {JOB_STATUS_LABELS[app.status]}
                    </span>
                  </td>
                  <td className="text-sm">
                    {app.date_applied
                      ? new Date(app.date_applied).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td>
                    {STATUS_ORDER.indexOf(app.status) <
                      STATUS_ORDER.length - 1 && (
                      <button
                        onClick={() => handleAdvanceStatus(app)}
                        disabled={updatingId === app.id}
                        className="btn btn-sm btn-ghost min-h-11 min-w-11"
                        aria-label={`Advance ${app.applicant_name} to ${
                          JOB_STATUS_LABELS[
                            STATUS_ORDER[STATUS_ORDER.indexOf(app.status) + 1]
                          ]
                        }`}
                      >
                        {updatingId === app.id
                          ? '...'
                          : `→ ${
                              JOB_STATUS_LABELS[
                                STATUS_ORDER[
                                  STATUS_ORDER.indexOf(app.status) + 1
                                ]
                              ]
                            }`}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import StatusBadge from '@/components/atomic/StatusBadge';
import PriorityIndicator from '@/components/atomic/PriorityIndicator';
import DateChip from '@/components/atomic/DateChip';
import {
  getStatusStyle,
  JOB_STATUS_ORDER,
  WORK_LOCATION_LABELS,
  OUTCOME_LABELS,
  type JobApplicationStatus,
  type Priority,
  type WorkLocationType,
  type ApplicationOutcome,
} from '@/types/company';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

export interface ApplicationDetailDrawerProps {
  /** The application to display, or null to close. */
  application: EmployerApplication | null;
  /** Called when drawer should close. */
  onClose: () => void;
  /** Advance to next pipeline status. */
  onAdvance: (applicationId: string, status: JobApplicationStatus) => void;
  /** True while an advance is in flight for this application. */
  updating?: boolean;
  /** Hire the applicant (creates connection + adds to team). */
  onHire?: (applicationId: string) => void;
  /** True while a hire action is in flight. */
  hiring?: boolean;
}

/**
 * ApplicationDetailDrawer - Slide-out panel with full application context.
 *
 * Shows applicant details, timeline, status actions, notes, and links.
 *
 * @category molecular
 */
export default function ApplicationDetailDrawer({
  application: app,
  onClose,
  onAdvance,
  updating = false,
  onHire,
  hiring = false,
}: ApplicationDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!app) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [app, handleKeyDown]);

  if (!app) return null;

  const currentIdx = JOB_STATUS_ORDER.indexOf(app.status);
  const nextStatus =
    currentIdx >= 0 && currentIdx < JOB_STATUS_ORDER.length - 1
      ? JOB_STATUS_ORDER[currentIdx + 1]
      : null;
  const nextLabel = nextStatus ? getStatusStyle(nextStatus).label : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="bg-base-300/60 fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-label={`Application details: ${app.applicant_name}`}
        aria-modal="true"
        className="bg-base-100 fixed top-0 right-0 z-50 flex h-full w-full max-w-lg flex-col shadow-xl"
      >
        {/* Header */}
        <div className="border-base-300 flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">{app.applicant_name}</h2>
            <p className="text-base-content/70 text-sm">{app.company_name}</p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle min-h-11 min-w-11"
            aria-label="Close drawer"
          >
            &#x2715;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {/* Status + Priority row */}
          <div className="flex items-center gap-4">
            <StatusBadge status={app.status} />
            <PriorityIndicator priority={app.priority as Priority} />
            <span className="badge badge-sm badge-ghost">
              {WORK_LOCATION_LABELS[
                app.work_location_type as WorkLocationType
              ] ?? app.work_location_type}
            </span>
          </div>

          {/* Position */}
          <div>
            <label className="text-base-content/50 text-xs font-medium uppercase">
              Position
            </label>
            <p className="font-medium">
              {app.position_title || 'Not specified'}
            </p>
          </div>

          {/* Outcome */}
          {app.outcome && app.outcome !== 'pending' && (
            <div>
              <label className="text-base-content/50 text-xs font-medium uppercase">
                Outcome
              </label>
              <p>
                {OUTCOME_LABELS[app.outcome as ApplicationOutcome] ??
                  app.outcome}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <label className="text-base-content/50 mb-2 block text-xs font-medium uppercase">
              Timeline
            </label>
            <div className="space-y-2">
              {app.date_applied && (
                <div className="flex items-center gap-2">
                  <DateChip date={app.date_applied} label="Applied" />
                </div>
              )}
              {app.interview_date && (
                <div className="flex items-center gap-2">
                  <DateChip date={app.interview_date} label="Interview" />
                </div>
              )}
              {app.follow_up_date && (
                <div className="flex items-center gap-2">
                  <DateChip date={app.follow_up_date} label="Follow-up" />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {app.notes && (
            <div>
              <label className="text-base-content/50 text-xs font-medium uppercase">
                Notes
              </label>
              <p className="text-base-content/85 mt-1 text-sm whitespace-pre-wrap">
                {app.notes}
              </p>
            </div>
          )}

          {/* Links */}
          {(app.job_link || app.position_url || app.status_url) && (
            <div>
              <label className="text-base-content/50 mb-1 block text-xs font-medium uppercase">
                Links
              </label>
              <div className="flex flex-col gap-1">
                {app.job_link && (
                  <a
                    href={app.job_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary text-sm"
                  >
                    Job Posting
                  </a>
                )}
                {app.position_url && (
                  <a
                    href={app.position_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary text-sm"
                  >
                    Position Details
                  </a>
                )}
                {app.status_url && (
                  <a
                    href={app.status_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary text-sm"
                  >
                    Application Status Portal
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-base-300 flex gap-2 border-t px-6 py-4">
          {onHire &&
            app.outcome !== 'hired' &&
            ['interviewing', 'offer'].includes(app.status) && (
              <button
                onClick={() => onHire(app.id)}
                disabled={hiring || updating}
                className="btn btn-success min-h-11 flex-1"
              >
                {hiring ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Hiring...
                  </>
                ) : (
                  'Hire & Add to Team'
                )}
              </button>
            )}
          {nextStatus && nextLabel && (
            <button
              onClick={() => onAdvance(app.id, nextStatus)}
              disabled={updating || hiring}
              className="btn btn-primary min-h-11 flex-1"
            >
              {updating ? (
                <>
                  <span className="loading loading-spinner loading-sm" />
                  Advancing...
                </>
              ) : (
                `Advance to ${nextLabel}`
              )}
            </button>
          )}
          <button onClick={onClose} className="btn btn-ghost min-h-11">
            Close
          </button>
        </div>
      </aside>
    </>
  );
}

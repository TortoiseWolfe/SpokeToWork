'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type {
  JobApplication,
  JobApplicationCreate,
  JobApplicationUpdate,
  JobApplicationStatus,
  ApplicationOutcome,
  WorkLocationType,
  Priority,
} from '@/types/company';
import {
  JOB_STATUS_LABELS,
  OUTCOME_LABELS,
  WORK_LOCATION_LABELS,
} from '@/types/company';

export interface ApplicationFormProps {
  /** Company ID for new applications */
  companyId: string;
  /** Company name for display */
  companyName?: string;
  /** Existing application data for edit mode */
  application?: JobApplication | null;
  /** Callback when form is submitted */
  onSubmit?: (
    data: JobApplicationCreate | JobApplicationUpdate
  ) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

const STATUS_OPTIONS: { value: JobApplicationStatus; label: string }[] = [
  { value: 'not_applied', label: JOB_STATUS_LABELS.not_applied },
  { value: 'applied', label: JOB_STATUS_LABELS.applied },
  { value: 'screening', label: JOB_STATUS_LABELS.screening },
  { value: 'interviewing', label: JOB_STATUS_LABELS.interviewing },
  { value: 'offer', label: JOB_STATUS_LABELS.offer },
  { value: 'closed', label: JOB_STATUS_LABELS.closed },
];

const OUTCOME_OPTIONS: { value: ApplicationOutcome; label: string }[] = [
  { value: 'pending', label: OUTCOME_LABELS.pending },
  { value: 'hired', label: OUTCOME_LABELS.hired },
  { value: 'rejected', label: OUTCOME_LABELS.rejected },
  { value: 'withdrawn', label: OUTCOME_LABELS.withdrawn },
  { value: 'ghosted', label: OUTCOME_LABELS.ghosted },
  { value: 'offer_declined', label: OUTCOME_LABELS.offer_declined },
];

const WORK_LOCATION_OPTIONS: { value: WorkLocationType; label: string }[] = [
  { value: 'on_site', label: WORK_LOCATION_LABELS.on_site },
  { value: 'hybrid', label: WORK_LOCATION_LABELS.hybrid },
  { value: 'remote', label: WORK_LOCATION_LABELS.remote },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 1, label: '1 - Highest' },
  { value: 2, label: '2 - High' },
  { value: 3, label: '3 - Medium' },
  { value: 4, label: '4 - Low' },
  { value: 5, label: '5 - Lowest' },
];

/**
 * ApplicationForm component for adding and editing job applications
 *
 * Features:
 * - All job application fields with DaisyUI styling
 * - Status and outcome tracking
 * - Work location type selection
 * - Date tracking for applications and interviews
 * - Create and edit modes
 *
 * @category organisms
 */
export default function ApplicationForm({
  companyId,
  companyName,
  application,
  onSubmit,
  onCancel,
  className = '',
  testId = 'application-form',
}: ApplicationFormProps) {
  const isEditMode = !!application;

  // Form state
  const [positionTitle, setPositionTitle] = useState(
    application?.position_title || ''
  );
  const [jobLink, setJobLink] = useState(application?.job_link || '');
  const [workLocationType, setWorkLocationType] = useState<WorkLocationType>(
    application?.work_location_type || 'on_site'
  );
  const [status, setStatus] = useState<JobApplicationStatus>(
    application?.status || 'not_applied'
  );
  const [outcome, setOutcome] = useState<ApplicationOutcome>(
    application?.outcome || 'pending'
  );
  const [dateApplied, setDateApplied] = useState(
    application?.date_applied || ''
  );
  const [interviewDate, setInterviewDate] = useState(
    application?.interview_date?.split('T')[0] || ''
  );
  const [followUpDate, setFollowUpDate] = useState(
    application?.follow_up_date || ''
  );
  const [priority, setPriority] = useState<Priority>(
    application?.priority || 3
  );
  const [notes, setNotes] = useState(application?.notes || '');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Update form when application prop changes (edit mode)
  useEffect(() => {
    if (application) {
      setPositionTitle(application.position_title || '');
      setJobLink(application.job_link || '');
      setWorkLocationType(application.work_location_type);
      setStatus(application.status);
      setOutcome(application.outcome);
      setDateApplied(application.date_applied || '');
      setInterviewDate(application.interview_date?.split('T')[0] || '');
      setFollowUpDate(application.follow_up_date || '');
      setPriority(application.priority);
      setNotes(application.notes || '');
    }
  }, [application]);

  // Validate URL when job link changes
  useEffect(() => {
    if (jobLink.trim()) {
      try {
        new URL(jobLink);
        setUrlError(null);
      } catch {
        setUrlError('Please enter a valid URL');
      }
    } else {
      setUrlError(null);
    }
  }, [jobLink]);

  // Auto-set date_applied when status changes to 'applied'
  useEffect(() => {
    if (status === 'applied' && !dateApplied) {
      setDateApplied(new Date().toISOString().split('T')[0]);
    }
  }, [status, dateApplied]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate URL if provided
      if (jobLink.trim() && urlError) {
        setSubmitError('Please fix the job link URL');
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const baseData = {
          position_title: positionTitle.trim() || undefined,
          job_link: jobLink.trim() || undefined,
          work_location_type: workLocationType,
          status,
          outcome,
          date_applied: dateApplied || undefined,
          interview_date: interviewDate
            ? `${interviewDate}T00:00:00.000Z`
            : undefined,
          follow_up_date: followUpDate || undefined,
          priority,
          notes: notes.trim() || undefined,
        };

        const data: JobApplicationCreate | JobApplicationUpdate = isEditMode
          ? { id: application!.id, ...baseData }
          : { company_id: companyId, ...baseData };

        if (onSubmit) {
          await onSubmit(data);
        }
      } catch (error) {
        setSubmitError(
          error instanceof Error ? error.message : 'Failed to save application'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      companyId,
      positionTitle,
      jobLink,
      workLocationType,
      status,
      outcome,
      dateApplied,
      interviewDate,
      followUpDate,
      priority,
      notes,
      urlError,
      isEditMode,
      application,
      onSubmit,
    ]
  );

  return (
    <form
      data-testid={testId}
      className={`card bg-base-100 shadow-xl ${className}`}
      onSubmit={handleSubmit}
    >
      <div className="card-body">
        <h2 className="card-title">
          {isEditMode ? 'Edit Application' : 'Add Job Application'}
        </h2>
        {companyName && (
          <p className="text-base-content/70 text-sm">for {companyName}</p>
        )}

        {/* Position Title */}
        <div className="form-control">
          <label className="label" htmlFor="position-title">
            <span className="label-text">Position Title</span>
          </label>
          <input
            id="position-title"
            type="text"
            placeholder="e.g., Senior Software Engineer"
            className="input input-bordered"
            value={positionTitle}
            onChange={(e) => setPositionTitle(e.target.value)}
          />
        </div>

        {/* Job Link */}
        <div className="form-control">
          <label className="label" htmlFor="job-link">
            <span className="label-text">Job Posting Link</span>
          </label>
          <input
            id="job-link"
            type="url"
            placeholder="https://careers.example.com/jobs/123"
            className={`input input-bordered ${urlError ? 'input-error' : ''}`}
            value={jobLink}
            onChange={(e) => setJobLink(e.target.value)}
          />
          {urlError && (
            <label className="label">
              <span className="label-text-alt text-error">{urlError}</span>
            </label>
          )}
        </div>

        {/* Work Location Type */}
        <div className="form-control">
          <label className="label" htmlFor="work-location">
            <span className="label-text">Work Location</span>
          </label>
          <select
            id="work-location"
            className="select select-bordered"
            value={workLocationType}
            onChange={(e) =>
              setWorkLocationType(e.target.value as WorkLocationType)
            }
          >
            {WORK_LOCATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status and Outcome */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="form-control">
            <label className="label" htmlFor="status">
              <span className="label-text">Status</span>
            </label>
            <select
              id="status"
              className="select select-bordered"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as JobApplicationStatus)
              }
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control">
            <label className="label" htmlFor="outcome">
              <span className="label-text">Outcome</span>
            </label>
            <select
              id="outcome"
              className="select select-bordered"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as ApplicationOutcome)}
            >
              {OUTCOME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority */}
        <div className="form-control">
          <label className="label" htmlFor="priority">
            <span className="label-text">Priority</span>
          </label>
          <select
            id="priority"
            className="select select-bordered"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value) as Priority)}
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="form-control">
            <label className="label" htmlFor="date-applied">
              <span className="label-text">Date Applied</span>
            </label>
            <input
              id="date-applied"
              type="date"
              className="input input-bordered"
              value={dateApplied}
              onChange={(e) => setDateApplied(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="interview-date">
              <span className="label-text">Interview Date</span>
            </label>
            <input
              id="interview-date"
              type="date"
              className="input input-bordered"
              value={interviewDate}
              onChange={(e) => setInterviewDate(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label className="label" htmlFor="follow-up-date">
              <span className="label-text">Follow-up Date</span>
            </label>
            <input
              id="follow-up-date"
              type="date"
              className="input input-bordered"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="form-control">
          <label className="label" htmlFor="notes">
            <span className="label-text">Notes</span>
          </label>
          <textarea
            id="notes"
            placeholder="Application notes, follow-up actions, interview feedback..."
            className="textarea textarea-bordered h-24"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="alert alert-error">
            <span>{submitError}</span>
          </div>
        )}

        {/* Form Actions */}
        <div className="card-actions mt-6 justify-end">
          {onCancel && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !!urlError}
          >
            {isSubmitting ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                {isEditMode ? 'Saving...' : 'Adding...'}
              </>
            ) : isEditMode ? (
              'Save Changes'
            ) : (
              'Add Application'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

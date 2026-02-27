import React, { useState } from 'react';
import { getStatusBadgeClass, getStatusLabel } from '@/types/company';
import type { JobApplicationStatus } from '@/types/company';

const STATUS_ORDER: JobApplicationStatus[] = [
  'not_applied',
  'applied',
  'screening',
  'interviewing',
  'offer',
  'closed',
];

export interface ApplicationCardApp {
  id: string;
  applicant_name: string;
  company_name: string;
  position_title: string | null;
  status: string;
  outcome?: string;
  date_applied: string | null;
  interview_date?: string | null;
}

export interface ApplicationCardProps {
  application: ApplicationCardApp;
  onAdvance: (applicationId: string, interviewDate?: string) => void;
  onReject: (applicationId: string) => void;
  updating?: boolean;
  className?: string;
}

export default function ApplicationCard({
  application,
  onAdvance,
  onReject,
  updating = false,
  className = '',
}: ApplicationCardProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState('');

  const statusIdx = STATUS_ORDER.indexOf(
    application.status as JobApplicationStatus
  );
  const nextStatus =
    statusIdx >= 0 && statusIdx < STATUS_ORDER.length - 1
      ? STATUS_ORDER[statusIdx + 1]
      : null;
  const isClosed = application.status === 'closed';

  const handleAdvanceClick = () => {
    if (nextStatus === 'interviewing') {
      setShowDatePicker(true);
    } else {
      onAdvance(application.id);
    }
  };

  const handleConfirm = () => {
    const isoDate = pickerDate ? new Date(pickerDate).toISOString() : undefined;
    onAdvance(application.id, isoDate);
    setShowDatePicker(false);
    setPickerDate('');
  };

  const handleSkip = () => {
    onAdvance(application.id);
    setShowDatePicker(false);
    setPickerDate('');
  };

  return (
    <div className={`card bg-base-100 shadow-sm ${className}`}>
      <div className="card-body p-4">
        <p className="text-base-content font-semibold">
          {application.applicant_name}
        </p>
        <p className="text-base-content/70 text-sm">
          {application.position_title || 'Not specified'}
        </p>
        <p className="text-base-content/50 text-xs">
          {application.company_name}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className={`badge ${getStatusBadgeClass(application.status)}`}>
            {getStatusLabel(application.status)}
          </span>
          <span className="text-base-content/50 text-xs">
            {application.date_applied
              ? new Date(application.date_applied).toLocaleDateString()
              : 'N/A'}
          </span>
        </div>
        {application.interview_date && (
          <p className="text-base-content/70 mt-1 text-xs">
            Interview: {new Date(application.interview_date).toLocaleString()}
          </p>
        )}
        {application.outcome === 'rejected' && (
          <span className="badge badge-error badge-sm mt-1">Rejected</span>
        )}
        {!isClosed && !showDatePicker && (
          <div className="mt-2 flex gap-1">
            {nextStatus && (
              <button
                onClick={handleAdvanceClick}
                disabled={updating}
                className="btn btn-ghost btn-sm min-h-11 flex-1"
                aria-label={`Advance ${application.applicant_name} to ${getStatusLabel(nextStatus)}`}
              >
                {updating ? '...' : `→ ${getStatusLabel(nextStatus)}`}
              </button>
            )}
            <button
              onClick={() => onReject(application.id)}
              disabled={updating}
              className="btn btn-error btn-outline btn-sm min-h-11"
              aria-label={`Reject ${application.applicant_name}`}
            >
              {updating ? '...' : 'Reject'}
            </button>
          </div>
        )}
        {showDatePicker && (
          <div className="mt-2 flex flex-col gap-2">
            <input
              type="datetime-local"
              value={pickerDate}
              onChange={(e) => setPickerDate(e.target.value)}
              aria-label="Interview date"
              className="input input-bordered input-sm w-full"
            />
            <div className="flex gap-1">
              <button
                onClick={handleConfirm}
                disabled={updating}
                className="btn btn-primary btn-sm min-h-11 flex-1"
              >
                {updating ? '...' : 'Confirm'}
              </button>
              <button
                onClick={handleSkip}
                disabled={updating}
                className="btn btn-ghost btn-sm min-h-11"
              >
                Skip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

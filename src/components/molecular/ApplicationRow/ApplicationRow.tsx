import StatusBadge from '@/components/atomic/StatusBadge';
import PriorityIndicator from '@/components/atomic/PriorityIndicator';
import DateChip from '@/components/atomic/DateChip';
import {
  getStatusStyle,
  JOB_STATUS_ORDER,
  WORK_LOCATION_LABELS,
} from '@/types/company';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';
import type { Priority, WorkLocationType } from '@/types/company';

export interface ApplicationRowProps {
  application: EmployerApplication;
  onAdvance: (app: EmployerApplication) => void;
  /** True while this row's advance request is in flight. */
  updating: boolean;
  /** True if this applicant appears in more than one application. */
  isRepeat: boolean;
  /** Optional click handler for row selection (detail drawer). */
  onClick?: () => void;
}

/**
 * ApplicationRow - Enhanced table row for the employer dashboard.
 *
 * Shows: Applicant, Position, Priority, Status, Interview Date,
 * Applied Date, Work Location, and Actions.
 *
 * @category molecular
 */
export default function ApplicationRow({
  application: app,
  onAdvance,
  updating,
  isRepeat,
  onClick,
}: ApplicationRowProps) {
  const currentIdx = JOB_STATUS_ORDER.indexOf(app.status);
  const nextStatus =
    currentIdx >= 0 && currentIdx < JOB_STATUS_ORDER.length - 1
      ? JOB_STATUS_ORDER[currentIdx + 1]
      : null;
  const nextLabel = nextStatus ? getStatusStyle(nextStatus).label : null;

  return (
    <tr
      data-testid="application-row"
      className={onClick ? 'hover cursor-pointer' : ''}
      onClick={onClick}
    >
      {/* Applicant */}
      <td>
        <div className="flex items-center gap-2">
          <span className="font-medium">{app.applicant_name}</span>
          {isRepeat && (
            <span className="badge badge-sm badge-outline">repeat</span>
          )}
        </div>
        <div className="text-base-content/75 text-sm">{app.company_name}</div>
      </td>

      {/* Position */}
      <td>{app.position_title || 'Not specified'}</td>

      {/* Priority */}
      <td>
        <PriorityIndicator priority={app.priority as Priority} />
      </td>

      {/* Status */}
      <td>
        <StatusBadge status={app.status} />
      </td>

      {/* Interview Date */}
      <td>
        {app.interview_date ? (
          <DateChip date={app.interview_date} />
        ) : (
          <span className="text-base-content/30 text-sm">--</span>
        )}
      </td>

      {/* Applied Date */}
      <td className="text-sm">
        {app.date_applied
          ? new Date(app.date_applied).toLocaleDateString()
          : 'N/A'}
      </td>

      {/* Work Location */}
      <td>
        <span className="badge badge-sm badge-ghost">
          {WORK_LOCATION_LABELS[app.work_location_type as WorkLocationType] ??
            app.work_location_type}
        </span>
      </td>

      {/* Actions */}
      <td>
        {nextStatus && nextLabel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(app);
            }}
            disabled={updating}
            className="btn btn-sm btn-ghost min-h-11 min-w-11"
            aria-label={`Advance ${app.applicant_name} to ${nextLabel}`}
          >
            {updating ? '...' : `\u2192 ${nextLabel}`}
          </button>
        )}
      </td>
    </tr>
  );
}

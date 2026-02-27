import StatusBadge from '@/components/atomic/StatusBadge';
import { getStatusStyle, JOB_STATUS_ORDER } from '@/types/company';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';

export interface ApplicationRowProps {
  application: EmployerApplication;
  onAdvance: (app: EmployerApplication) => void;
  /** True while this row's advance request is in flight. */
  updating: boolean;
  /** True if this applicant appears in more than one application. */
  isRepeat: boolean;
}

/**
 * ApplicationRow — single `<tr>` for the employer dashboard table.
 *
 * Renders applicant name (with optional repeat badge), company, position,
 * status badge, applied date, and a single "advance to next stage" button.
 * Must be rendered inside `<table><tbody>`.
 *
 * @category molecular
 */
export default function ApplicationRow({
  application: app,
  onAdvance,
  updating,
  isRepeat,
}: ApplicationRowProps) {
  const currentIdx = JOB_STATUS_ORDER.indexOf(app.status);
  const nextStatus =
    currentIdx >= 0 && currentIdx < JOB_STATUS_ORDER.length - 1
      ? JOB_STATUS_ORDER[currentIdx + 1]
      : null;
  const nextLabel = nextStatus ? getStatusStyle(nextStatus).label : null;

  return (
    <tr data-testid="application-row">
      <td>
        <div className="flex items-center gap-2">
          <span className="font-medium">{app.applicant_name}</span>
          {isRepeat && (
            <span className="badge badge-sm badge-outline">↻ repeat</span>
          )}
        </div>
        <div className="text-base-content/75 text-sm">{app.company_name}</div>
      </td>
      <td>{app.position_title || 'Not specified'}</td>
      <td>
        <StatusBadge status={app.status} />
      </td>
      <td className="text-sm">
        {app.date_applied
          ? new Date(app.date_applied).toLocaleDateString()
          : 'N/A'}
      </td>
      <td>
        {nextStatus && nextLabel && (
          <button
            type="button"
            onClick={() => onAdvance(app)}
            disabled={updating}
            className="btn btn-sm btn-ghost min-h-11 min-w-11"
            aria-label={`Advance ${app.applicant_name} to ${nextLabel}`}
          >
            {updating ? '...' : `→ ${nextLabel}`}
          </button>
        )}
      </td>
    </tr>
  );
}

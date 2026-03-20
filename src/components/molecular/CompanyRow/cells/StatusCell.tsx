import type { CompanyStatus } from '@/types/company';
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  OUTCOME_LABELS,
  OUTCOME_COLORS,
} from '@/types/company';
import { hasApplications, type CompanyType } from './types';

const STATUS_COLORS: Record<CompanyStatus, string> = {
  not_contacted: 'badge-ghost',
  contacted: 'badge-info',
  follow_up: 'badge-warning',
  meeting: 'badge-primary',
  outcome_positive: 'badge-success',
  outcome_negative: 'badge-error',
};

const STATUS_LABELS: Record<CompanyStatus, string> = {
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  meeting: 'Meeting',
  outcome_positive: 'Positive',
  outcome_negative: 'Negative',
};

/** Application badges or legacy company-status dropdown */
export function StatusCell({
  company,
  onStatusChange,
}: {
  company: CompanyType;
  onStatusChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  if (hasApplications(company)) {
    const latest = company.latest_application;
    return (
      <td>
        <div className="flex flex-col gap-1">
          {latest ? (
            <div className="flex items-center gap-1">
              {latest.status === 'not_applied' ? (
                <span className="badge badge-ghost badge-sm">Tracking</span>
              ) : (
                <>
                  <span
                    className={`badge ${JOB_STATUS_COLORS[latest.status]} badge-sm`}
                  >
                    {JOB_STATUS_LABELS[latest.status]}
                  </span>
                  {latest.outcome !== 'pending' && (
                    <span
                      className={`badge ${OUTCOME_COLORS[latest.outcome]} badge-sm`}
                    >
                      {OUTCOME_LABELS[latest.outcome]}
                    </span>
                  )}
                </>
              )}
            </div>
          ) : (
            <span className="badge badge-ghost badge-sm">No applications</span>
          )}
        </div>
      </td>
    );
  }

  if (onStatusChange) {
    return (
      <td>
        <select
          className={`select select-ghost select-xs ${STATUS_COLORS[company.status]}`}
          value={company.status}
          onChange={onStatusChange}
          onClick={(e) => e.stopPropagation()}
          aria-label="Change status"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
    );
  }

  return (
    <td>
      <span className={`badge ${STATUS_COLORS[company.status]} badge-sm`}>
        {STATUS_LABELS[company.status]}
      </span>
    </td>
  );
}

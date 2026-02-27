import { getStatusStyle } from '@/types/company';
import type { JobApplicationStatus } from '@/types/company';

export interface StatusBadgeProps {
  /** A known JobApplicationStatus or any string — unknown values fall back to badge-neutral. */
  status: JobApplicationStatus | string;
  className?: string;
}

export default function StatusBadge({
  status,
  className = '',
}: StatusBadgeProps) {
  const { label, className: statusClass } = getStatusStyle(status);
  return (
    <span
      className={['badge', statusClass, className].filter(Boolean).join(' ')}
    >
      {label}
    </span>
  );
}

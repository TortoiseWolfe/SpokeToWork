export interface DateChipProps {
  /** ISO date/datetime string. */
  date: string;
  /** Optional label shown before the date. */
  label?: string;
  className?: string;
}

/**
 * DateChip - Compact date display with temporal color coding.
 *
 * Past dates = error (red), today = warning (amber), future = success (green).
 *
 * @category atomic
 */
export default function DateChip({
  date,
  label,
  className = '',
}: DateChipProps) {
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diff = target.getTime() - today.getTime();
  const colorClass =
    diff < 0 ? 'badge-error' : diff === 0 ? 'badge-warning' : 'badge-success';

  const formatted = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <span
      className={`badge badge-sm gap-1 ${colorClass} ${className}`}
      title={d.toLocaleString()}
    >
      {label && <span className="opacity-70">{label}</span>}
      {formatted}
    </span>
  );
}

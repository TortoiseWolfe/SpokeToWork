import type { Priority } from '@/types/company';

export interface PriorityIndicatorProps {
  /** Priority level 1-5 (1 = highest). */
  priority: Priority;
  className?: string;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  1: 'bg-error',
  2: 'bg-warning',
  3: 'bg-info',
  4: 'bg-base-content/30',
  5: 'bg-base-content/15',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  1: 'Critical',
  2: 'High',
  3: 'Medium',
  4: 'Low',
  5: 'Minimal',
};

/**
 * PriorityIndicator - Displays priority as filled pips (1-5).
 *
 * Filled pips = priority level. Higher priority = more filled pips
 * displayed left-to-right with decreasing intensity.
 *
 * @category atomic
 */
export default function PriorityIndicator({
  priority,
  className = '',
}: PriorityIndicatorProps) {
  const filled = 6 - priority; // P1 = 5 pips, P5 = 1 pip
  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`Priority ${priority}: ${PRIORITY_LABELS[priority]}`}
      title={`P${priority} — ${PRIORITY_LABELS[priority]}`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 rounded-full ${
            i < filled ? PRIORITY_COLORS[priority] : 'bg-base-content/10'
          }`}
        />
      ))}
    </div>
  );
}

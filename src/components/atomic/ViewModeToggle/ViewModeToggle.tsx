export type ViewMode = 'table' | 'kanban';

export interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

/**
 * ViewModeToggle - Switch between table and kanban board views.
 *
 * @category atomic
 */
export default function ViewModeToggle({
  value,
  onChange,
  className = '',
}: ViewModeToggleProps) {
  return (
    <div
      className={`join ${className}`}
      role="radiogroup"
      aria-label="View mode"
    >
      <button
        className={`btn join-item btn-sm min-h-11 ${
          value === 'table' ? 'btn-active' : ''
        }`}
        onClick={() => onChange('table')}
        role="radio"
        aria-checked={value === 'table'}
        aria-label="Table view"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <button
        className={`btn join-item btn-sm min-h-11 ${
          value === 'kanban' ? 'btn-active' : ''
        }`}
        onClick={() => onChange('kanban')}
        role="radio"
        aria-checked={value === 'kanban'}
        aria-label="Kanban view"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17V7m0 10h6m-6 0H3m12 0V7m0 10h6M9 7H3v10h6V7zm6 0h6v10h-6V7z"
          />
        </svg>
      </button>
    </div>
  );
}

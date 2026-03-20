/**
 * Row action buttons — add-to-route / edit / delete.
 */

const MAP_ICON =
  'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7';
const EDIT_ICON =
  'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
const DELETE_ICON =
  'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16';

function IconButton({
  onClick,
  d,
  label,
  tone,
  title,
}: {
  onClick: (e: React.MouseEvent) => void;
  d: string;
  label: string;
  tone?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-xs ${tone ?? ''}`}
      onClick={onClick}
      aria-label={label}
      title={title}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={d}
        />
      </svg>
    </button>
  );
}

export interface ActionsCellProps {
  name: string;
  onAddToRoute?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export function ActionsCell({
  name,
  onAddToRoute,
  onEdit,
  onDelete,
}: ActionsCellProps) {
  return (
    <td>
      <div className="flex gap-1">
        {onAddToRoute && (
          <IconButton
            onClick={onAddToRoute}
            d={MAP_ICON}
            tone="text-primary"
            label={`Add ${name} to route`}
            title="Add to route"
          />
        )}
        {onEdit && (
          <IconButton onClick={onEdit} d={EDIT_ICON} label={`Edit ${name}`} />
        )}
        {onDelete && (
          <IconButton
            onClick={onDelete}
            d={DELETE_ICON}
            tone="text-error"
            label={`Delete ${name}`}
          />
        )}
      </div>
    </td>
  );
}

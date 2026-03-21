import type { CompanySort } from '@/types/company';

/**
 * Sortable `<thead>` for CompanyTable. Pure presentational — state lives
 * in useCompanyTable.
 */

interface SortButtonProps {
  field: CompanySort['field'];
  label: string;
  title?: string;
  sort: CompanySort;
  onSort: (field: CompanySort['field']) => void;
  className?: string;
}

function SortButton({
  field,
  label,
  title,
  sort,
  onSort,
  className,
}: SortButtonProps) {
  const active = sort.field === field;
  return (
    <button
      type="button"
      className={`btn btn-ghost btn-xs ${className ?? ''}`}
      onClick={() => onSort(field)}
      title={title}
    >
      {label}
      {active && (
        <span className="ml-1">{sort.direction === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );
}

export interface TableHeadProps {
  sort: CompanySort;
  onSort: (field: CompanySort['field']) => void;
}

export function TableHead({ sort, onSort }: TableHeadProps) {
  return (
    <thead>
      <tr>
        <th>
          <SortButton
            field="name"
            label="Company"
            sort={sort}
            onSort={onSort}
          />
          <SortButton
            field="zip_code"
            label="Zip"
            className="ml-1"
            title="Sort by zip code to cluster nearby companies"
            sort={sort}
            onSort={onSort}
          />
        </th>
        <th className="hidden md:table-cell">Contact</th>
        <th>
          <SortButton
            field="status"
            label="Status"
            sort={sort}
            onSort={onSort}
          />
        </th>
        <th className="hidden text-center sm:table-cell">
          <SortButton
            field="priority"
            label="Priority"
            title="Sort by priority (1=highest)"
            sort={sort}
            onSort={onSort}
          />
        </th>
        <th className="hidden text-center md:table-cell">
          <SortButton
            field="applications"
            label="Apps"
            sort={sort}
            onSort={onSort}
          />
        </th>
        <th className="hidden lg:table-cell">
          <SortButton
            field="website"
            label="Website"
            sort={sort}
            onSort={onSort}
          />
        </th>
        <th>Actions</th>
      </tr>
    </thead>
  );
}

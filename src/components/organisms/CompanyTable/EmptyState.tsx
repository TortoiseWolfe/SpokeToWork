/**
 * Empty-state card for CompanyTable — three variants:
 *   - no companies at all → "Add Your First Company" CTA
 *   - on-route filter active but route has no companies
 *   - filters active but no matches
 */

export interface EmptyStateProps {
  totalCompanies: number;
  onRouteFilterActive: boolean;
}

export function EmptyState({
  totalCompanies,
  onRouteFilterActive,
}: EmptyStateProps) {
  if (totalCompanies === 0) {
    return (
      <div className="card bg-base-100 p-8 text-center">
        <p className="text-base-content/85 mb-4">
          No companies yet. Start tracking companies you&apos;re interested in.
        </p>
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              window.dispatchEvent(new CustomEvent('open-add-company'))
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Your First Company
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 p-8 text-center">
      <p className="text-base-content/85">
        {onRouteFilterActive
          ? 'No companies on this route yet. Add companies to your active route to see them here.'
          : 'No companies match your filters.'}
      </p>
    </div>
  );
}

'use client';

/**
 * RouteFilter - Feature 041: Bicycle Route Planning
 *
 * Dropdown filter for selecting a route to filter companies by.
 * Shows routes with company count and allows clearing the filter.
 */

import { useRoutes } from '@/hooks/useRoutes';
import type { BicycleRoute } from '@/types/route';

export interface RouteFilterProps {
  /** Currently selected route ID */
  selectedRouteId: string | null;
  /** Callback when route selection changes */
  onRouteChange: (routeId: string | null) => void;
  /** Whether to show system routes in the filter */
  showSystemRoutes?: boolean;
  /** Custom class name */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
}

export default function RouteFilter({
  selectedRouteId,
  onRouteChange,
  showSystemRoutes = false,
  className = '',
  placeholder = 'Filter by route',
}: RouteFilterProps) {
  const { routes, isLoading } = useRoutes();

  // Filter out system routes if not showing them
  const displayRoutes = showSystemRoutes
    ? routes
    : routes.filter((r: BicycleRoute) => !r.is_system_route);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onRouteChange(value === '' ? null : value);
  };

  return (
    <div className={`form-control ${className}`}>
      <select
        className="select select-bordered select-sm w-full"
        value={selectedRouteId ?? ''}
        onChange={handleChange}
        disabled={isLoading}
        aria-label="Filter companies by route"
      >
        <option value="">{placeholder}</option>
        {displayRoutes.map((route: BicycleRoute) => (
          <option key={route.id} value={route.id}>
            {route.name}
            {route.is_system_route && ' (Trail)'}
          </option>
        ))}
      </select>

      {/* Clear button when a route is selected */}
      {selectedRouteId && (
        <button
          type="button"
          onClick={() => onRouteChange(null)}
          className="btn btn-ghost btn-xs mt-1"
          aria-label="Clear route filter"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mr-1 h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Clear filter
        </button>
      )}
    </div>
  );
}

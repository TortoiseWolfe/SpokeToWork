'use client';

/**
 * RouteSidebar - Feature 041: Bicycle Route Planning
 *
 * Displays list of user routes with create button, active route indicator,
 * sorting, and filtering controls.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRoutes } from '@/hooks/useRoutes';
import type { BicycleRoute, RouteSort, RouteSummary } from '@/types/route';
import { ROUTE_COLORS } from '@/types/route';

export interface RouteSidebarProps {
  /** Routes to display (passed from parent to share state) */
  routes?: BicycleRoute[];
  /** Currently active route ID */
  activeRouteId?: string | null;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callback when a route is selected */
  onRouteSelect?: (route: BicycleRoute) => void;
  /** Callback to open route builder for creating/editing */
  onCreateRoute?: () => void;
  onEditRoute?: (route: BicycleRoute) => void;
  onDeleteRoute?: (route: BicycleRoute) => void;
  /** Additional CSS classes */
  className?: string;
}

type SortOption = 'updated_at' | 'name' | 'distance_miles';

export default function RouteSidebar({
  routes: propRoutes,
  activeRouteId: propActiveRouteId,
  isLoading: propIsLoading,
  error: propError,
  onRouteSelect,
  onCreateRoute,
  onEditRoute,
  onDeleteRoute,
  className = '',
}: RouteSidebarProps) {
  const { user, isLoading: authLoading } = useAuth();

  // Use internal hook only if props aren't provided (backward compat)
  const internalHook = useRoutes({
    skip: !user || authLoading || propRoutes !== undefined,
  });

  // Use props if provided, otherwise fall back to internal hook
  const routes = propRoutes ?? internalHook.routes;
  const activeRouteId = propActiveRouteId ?? internalHook.activeRouteId;
  const isLoading = propIsLoading ?? internalHook.isLoading;
  const error = propError ?? internalHook.error;
  const checkRouteLimits = internalHook.checkRouteLimits;

  const [sortBy, setSortBy] = useState<SortOption>('updated_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterActive, setFilterActive] = useState(false);
  // DEPRECATED: System trails hidden - Feature 048 cancelled
  const [showSystemRoutes] = useState(false);

  // Sort and filter routes
  const displayedRoutes = useMemo(() => {
    let filtered = routes;

    // Filter out inactive if requested
    if (filterActive) {
      filtered = filtered.filter((r) => r.is_active);
    }

    // Filter system routes if requested
    if (!showSystemRoutes) {
      filtered = filtered.filter((r) => !r.is_system_route);
    }

    // Sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'distance_miles':
          comparison = (a.distance_miles ?? 0) - (b.distance_miles ?? 0);
          break;
        case 'updated_at':
        default:
          comparison =
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [routes, sortBy, sortDirection, filterActive, showSystemRoutes]);

  // Check limits for warning
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  useEffect(() => {
    checkRouteLimits().then((result) => {
      if (result.message) {
        setLimitWarning(result.message);
      }
    });
  }, [checkRouteLimits]);

  // Fetch company counts for each route
  const [companyCounts, setCompanyCounts] = useState<Record<string, number>>(
    {}
  );
  const getRouteSummaries = internalHook.getRouteSummaries;

  useEffect(() => {
    if (routes.length === 0) return;

    getRouteSummaries()
      .then((summaries: RouteSummary[]) => {
        const counts: Record<string, number> = {};
        summaries.forEach((s) => {
          counts[s.id] = s.company_count;
        });
        setCompanyCounts(counts);
      })
      .catch((err: Error) => {
        console.error('Failed to fetch route summaries:', err);
      });
    // Use routes (not routes.length) so this re-runs when routes array is refreshed after mutations
  }, [routes, getRouteSummaries]);

  const handleSortChange = (field: SortOption) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  if (error) {
    return (
      <aside
        className={`bg-base-200 w-72 p-4 ${className}`}
        role="complementary"
        aria-label="Route sidebar"
      >
        <div className="alert alert-error" role="alert">
          <span>Failed to load routes</span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`bg-base-200 flex min-h-0 w-72 flex-1 flex-col ${className}`}
      role="complementary"
      aria-label="Route sidebar"
    >
      {/* Feature 047 US2: Fixed header (FR-011) - stays in place while route list scrolls */}
      <div className="border-base-300 flex-shrink-0 border-b p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Routes</h2>
          <button
            onClick={onCreateRoute}
            className="btn btn-primary btn-sm"
            aria-label="Create new route"
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
            New
          </button>
        </div>

        {/* Limit warning */}
        {limitWarning && (
          <div className="alert alert-warning mb-3 py-2 text-sm" role="status">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{limitWarning}</span>
          </div>
        )}

        {/* Sort controls */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => handleSortChange('updated_at')}
            className={`btn btn-xs ${sortBy === 'updated_at' ? 'btn-primary' : 'btn-ghost'}`}
            aria-pressed={sortBy === 'updated_at'}
          >
            Recent{' '}
            {sortBy === 'updated_at' && (sortDirection === 'desc' ? '↓' : '↑')}
          </button>
          <button
            onClick={() => handleSortChange('name')}
            className={`btn btn-xs ${sortBy === 'name' ? 'btn-primary' : 'btn-ghost'}`}
            aria-pressed={sortBy === 'name'}
          >
            Name {sortBy === 'name' && (sortDirection === 'desc' ? '↓' : '↑')}
          </button>
          {/* DEPRECATED: System trails toggle - Feature 048 cancelled
          <button
            onClick={() => setShowSystemRoutes((prev) => !prev)}
            className={`btn btn-xs ${showSystemRoutes ? 'btn-ghost' : 'btn-secondary'}`}
            aria-pressed={!showSystemRoutes}
          >
            {showSystemRoutes ? 'Hide Trails' : 'Show Trails'}
          </button>
          */}
        </div>
      </div>

      {/* Feature 047 US2: Route list with independent scrolling (FR-003, FR-012) */}
      {/* Header/footer are fixed; route list uses flex-1 to fill remaining space */}
      {/* will-change-transform enables GPU acceleration for smooth 60fps scrolling */}
      <div
        className="flex-1 overflow-y-auto scroll-smooth will-change-transform"
        role="list"
        aria-label="Route list"
        tabIndex={0}
      >
        {isLoading ? (
          <div className="flex justify-center p-4">
            <span
              className="loading loading-spinner loading-md"
              aria-label="Loading routes"
            ></span>
          </div>
        ) : displayedRoutes.length === 0 ? (
          <div className="text-base-content/60 p-4 text-center">
            <p>No routes yet</p>
            <p className="mt-1 text-sm">
              Create your first route to get started
            </p>
          </div>
        ) : (
          displayedRoutes.map((route) => (
            <RouteListItem
              key={route.id}
              route={route}
              isActive={route.id === activeRouteId}
              companyCount={companyCounts[route.id] ?? 0}
              onSelect={() => onRouteSelect?.(route)}
              onEdit={() => onEditRoute?.(route)}
              onDelete={() => onDeleteRoute?.(route)}
            />
          ))
        )}
      </div>

      {/* Feature 047 US2: Fixed footer - stays in place while route list scrolls */}
      <div className="border-base-300 text-base-content/60 flex-shrink-0 border-t p-3 text-sm">
        {displayedRoutes.length} route{displayedRoutes.length !== 1 ? 's' : ''}
        {/* DEPRECATED: System trails count - Feature 048 cancelled */}
      </div>
    </aside>
  );
}

/**
 * Individual route list item
 */
interface RouteListItemProps {
  route: BicycleRoute;
  isActive: boolean;
  companyCount: number;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function RouteListItem({
  route,
  isActive,
  companyCount,
  onSelect,
  onEdit,
  onDelete,
}: RouteListItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Feature 047 FR-013: Selected route indicator with 20% primary opacity, 3px left border
  return (
    <div
      role="listitem"
      className={`border-base-300 hover:bg-base-300 cursor-pointer border-b p-3 transition-colors duration-150 ${isActive ? 'bg-primary/20 border-l-primary border-l-[3px]' : ''} `}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      aria-label={`${route.name}${isActive ? ', currently active' : ''}${route.is_system_route ? ', trail' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Color indicator */}
        <div
          className="mt-1 h-3 w-3 flex-shrink-0 rounded-full"
          style={{ backgroundColor: route.color }}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {/* Feature 047 US4: Tooltip shows full route name on hover (FR-005, NFR-003) */}
            {/* DaisyUI tooltip with 300ms delay via CSS, auto-flip positioning */}
            <div
              className="tooltip tooltip-top min-w-0 flex-1 before:transition-opacity before:delay-300"
              data-tip={route.name}
            >
              <h3 className="truncate text-left font-medium" title={route.name}>
                {route.name}
              </h3>
            </div>
            {isActive && (
              <span
                className="badge badge-primary badge-xs"
                aria-label="Active planning route"
              >
                Planning
              </span>
            )}
            {route.is_system_route && (
              <span
                className="badge badge-secondary badge-xs"
                aria-label="System trail"
              >
                Trail
              </span>
            )}
            {companyCount > 0 && (
              <span
                className="badge badge-ghost badge-xs"
                aria-label={`${companyCount} ${companyCount === 1 ? 'company' : 'companies'} on route`}
              >
                {companyCount}
              </span>
            )}
          </div>

          {route.distance_miles && (
            <p className="text-base-content/60 text-sm">
              {route.distance_miles.toFixed(1)} mi
            </p>
          )}

          {route.description && (
            <p className="text-base-content/50 mt-1 truncate text-xs">
              {route.description}
            </p>
          )}
        </div>

        {/* Actions menu (only for user routes) */}
        {!route.is_system_route && (
          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              className="btn btn-ghost btn-xs"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              aria-label={`Actions for ${route.name}`}
              aria-haspopup="menu"
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
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
            <ul
              tabIndex={0}
              className="dropdown-content menu bg-base-100 rounded-box z-[1] w-32 p-2 shadow"
              role="menu"
            >
              <li role="none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  role="menuitem"
                >
                  Edit
                </button>
              </li>
              <li role="none">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-error"
                  role="menuitem"
                >
                  Delete
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

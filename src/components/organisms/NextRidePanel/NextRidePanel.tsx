'use client';

/**
 * NextRidePanel - Feature 041: Bicycle Route Planning
 *
 * Displays an aggregated list of companies marked "visit on next ride"
 * across all routes. Provides quick clear all functionality.
 *
 * @deprecated Feature 044 simplified "Next Ride" to use active route filter.
 * This component is no longer rendered. Will be removed in future cleanup.
 * Use the "On Active Route" filter in CompanyFilters instead.
 */

import { useMemo } from 'react';
import type { RouteCompanyWithDetails, BicycleRoute } from '@/types/route';

export interface NextRideCompany {
  routeCompanyId: string;
  routeId: string;
  routeName: string;
  routeColor: string;
  company: {
    id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    source: 'shared' | 'private';
  };
  sequenceOrder: number;
}

export interface NextRidePanelProps {
  /** All routes with their companies */
  routes: BicycleRoute[];
  /** Route companies data keyed by route ID */
  routeCompanies: Map<string, RouteCompanyWithDetails[]>;
  /** Loading state */
  isLoading?: boolean;
  /** Callback to toggle next ride status */
  onToggleNextRide?: (
    routeCompanyId: string,
    routeId: string,
    value: boolean
  ) => void;
  /** Callback to clear all next ride markers */
  onClearAll?: () => void;
  /** Callback when a company is selected */
  onCompanySelect?: (company: NextRideCompany) => void;
  /** Whether panel is collapsed */
  isCollapsed?: boolean;
  /** Callback to toggle collapsed state */
  onToggleCollapsed?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export default function NextRidePanel({
  routes,
  routeCompanies,
  isLoading = false,
  onToggleNextRide,
  onClearAll,
  onCompanySelect,
  isCollapsed = false,
  onToggleCollapsed,
  className = '',
}: NextRidePanelProps) {
  // Aggregate all next-ride companies across all routes
  const nextRideCompanies = useMemo(() => {
    const companies: NextRideCompany[] = [];

    routes.forEach((route) => {
      const routeComps = routeCompanies.get(route.id) ?? [];
      routeComps
        .filter((rc) => rc.visit_on_next_ride)
        .forEach((rc) => {
          companies.push({
            routeCompanyId: rc.id,
            routeId: route.id,
            routeName: route.name,
            routeColor: route.color,
            company: rc.company,
            sequenceOrder: rc.sequence_order,
          });
        });
    });

    // Sort by route name, then sequence order
    return companies.sort((a, b) => {
      const routeCompare = a.routeName.localeCompare(b.routeName);
      if (routeCompare !== 0) return routeCompare;
      return a.sequenceOrder - b.sequenceOrder;
    });
  }, [routes, routeCompanies]);

  const totalCount = nextRideCompanies.length;

  if (isCollapsed) {
    return (
      <div
        className={`bg-base-200 rounded-lg ${className}`}
        role="region"
        aria-label="Next ride panel"
      >
        <button
          onClick={onToggleCollapsed}
          className="hover:bg-base-300 flex w-full items-center justify-between rounded-lg p-3 transition-colors"
          aria-expanded={false}
          aria-controls="next-ride-list"
        >
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="font-medium">Next Ride</span>
            {totalCount > 0 && (
              <span className="badge badge-primary badge-sm">{totalCount}</span>
            )}
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-base-200 rounded-lg ${className}`}
      role="region"
      aria-label="Next ride panel"
    >
      {/* Header */}
      <div className="border-base-300 border-b p-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggleCollapsed}
            className="hover:text-primary flex items-center gap-2 transition-colors"
            aria-expanded={true}
            aria-controls="next-ride-list"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <h3 className="font-semibold">Next Ride</h3>
            {totalCount > 0 && (
              <span className="badge badge-primary badge-sm">{totalCount}</span>
            )}
          </button>

          {totalCount > 0 && onClearAll && (
            <button
              onClick={onClearAll}
              className="btn btn-ghost btn-xs text-error"
              aria-label="Clear all next ride markers"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div id="next-ride-list" className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <div
            className="flex justify-center p-4"
            role="status"
            aria-label="Loading"
          >
            <span
              className="loading loading-spinner loading-sm"
              aria-hidden="true"
            ></span>
          </div>
        ) : totalCount === 0 ? (
          <div className="text-base-content/80 p-4 text-center">
            <p className="text-sm">No companies marked for next ride</p>
            <p className="mt-1 text-xs">
              Mark companies in a route to plan your next cycling trip
            </p>
          </div>
        ) : (
          <ul role="list" aria-label="Companies for next ride">
            {nextRideCompanies.map((item) => (
              <li key={item.routeCompanyId}>
                <NextRideItem
                  item={item}
                  onToggle={() =>
                    onToggleNextRide?.(item.routeCompanyId, item.routeId, false)
                  }
                  onSelect={() => onCompanySelect?.(item)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {totalCount > 0 && (
        <div className="border-base-300 text-base-content/80 border-t p-2 text-center text-xs">
          {totalCount} {totalCount === 1 ? 'stop' : 'stops'} planned
        </div>
      )}
    </div>
  );
}

/**
 * Individual next ride item
 */
interface NextRideItemProps {
  item: NextRideCompany;
  onToggle: () => void;
  onSelect: () => void;
}

function NextRideItem({ item, onToggle, onSelect }: NextRideItemProps) {
  return (
    <div
      className="hover:bg-base-300 flex items-center gap-2 p-2 transition-colors"
      role="group"
      aria-label={`${item.company.name} on ${item.routeName}`}
    >
      {/* Route color indicator */}
      <div
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: item.routeColor }}
        aria-hidden="true"
      />

      {/* Company info - clickable */}
      <button
        className="hover:text-primary min-w-0 flex-1 text-left transition-colors"
        onClick={onSelect}
        aria-label={`View ${item.company.name} details`}
      >
        <p className="truncate text-sm font-medium">{item.company.name}</p>
        <p className="text-base-content/80 truncate text-xs">
          {item.routeName}
        </p>
      </button>

      {/* Remove button */}
      <button
        onClick={onToggle}
        className="btn btn-ghost btn-xs"
        aria-label={`Remove ${item.company.name} from next ride`}
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

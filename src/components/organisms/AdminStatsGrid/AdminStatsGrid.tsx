'use client';

import type { MetroRouteCount } from '@/hooks/useRouteAnalytics';

export interface AdminStatsGridProps {
  totalRoutes: number;
  activeRoutes: number;
  inactiveRoutes: number;
  avgStopsPerRoute: number;
  avgDistanceMiles: number;
  routesPerMetro: MetroRouteCount[];
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
  testId?: string;
}

export default function AdminStatsGrid({
  totalRoutes,
  activeRoutes,
  inactiveRoutes,
  avgStopsPerRoute,
  avgDistanceMiles,
  routesPerMetro,
  isLoading = false,
  error = null,
  className = '',
  testId = 'admin-stats-grid',
}: AdminStatsGridProps) {
  if (isLoading) {
    return (
      <div className={`flex justify-center p-8 ${className}`} role="status" data-testid={testId}>
        <span className="loading loading-spinner loading-lg" aria-label="Loading analytics" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`alert alert-error ${className}`} role="alert" data-testid={testId}>
        <span>Failed to load analytics: {error.message}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid={testId}>
      <div className="stats stats-vertical shadow lg:stats-horizontal w-full">
        <div className="stat">
          <div className="stat-title">Total Routes</div>
          <div className="stat-value" data-testid="stat-total">{totalRoutes}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Active</div>
          <div className="stat-value text-success" data-testid="stat-active">{activeRoutes}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Inactive</div>
          <div className="stat-value text-base-content/60" data-testid="stat-inactive">{inactiveRoutes}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Avg Stops</div>
          <div className="stat-value text-primary" data-testid="stat-avg-stops">
            {avgStopsPerRoute.toFixed(1)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Avg Distance</div>
          <div className="stat-value text-secondary" data-testid="stat-avg-distance">
            {avgDistanceMiles > 0 ? `${avgDistanceMiles.toFixed(1)} mi` : '—'}
          </div>
        </div>
      </div>

      {routesPerMetro.length > 0 && (
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <caption className="text-left font-semibold pb-2">Routes per metro</caption>
            <thead>
              <tr>
                <th>Metro</th>
                <th className="text-right">Routes</th>
              </tr>
            </thead>
            <tbody>
              {routesPerMetro.map((m) => (
                <tr key={m.metroId ?? 'unassigned'}>
                  <td>{m.metroName}</td>
                  <td className="text-right tabular-nums">{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

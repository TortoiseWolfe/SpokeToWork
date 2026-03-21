import type { BicycleRoute } from '@/types/route';

/**
 * Popup content for a route — name, description, distance/time, and a
 * "System Trail" badge. Pure presentational; owns no state.
 */
export function RoutePopupBody({ route }: { route: BicycleRoute }) {
  return (
    <div className="min-w-48" data-testid="route-popup">
      <h3 className="mb-1 text-base font-semibold">{route.name}</h3>

      {route.description && (
        <p className="text-base-content/85 mb-2 text-sm">{route.description}</p>
      )}

      <div className="space-y-1 text-sm">
        {route.distance_miles && (
          <p>
            <span className="font-medium">Distance:</span>{' '}
            {route.distance_miles.toFixed(1)} mi
          </p>
        )}

        {route.estimated_time_minutes && (
          <p>
            <span className="font-medium">Est. Time:</span>{' '}
            {route.estimated_time_minutes} min
          </p>
        )}

        {route.is_system_route && route.source_name && (
          <p>
            <span className="font-medium">Trail:</span> {route.source_name}
          </p>
        )}
      </div>

      {route.is_system_route && (
        <div className="mt-2">
          <span className="badge badge-secondary badge-sm">System Trail</span>
        </div>
      )}
    </div>
  );
}

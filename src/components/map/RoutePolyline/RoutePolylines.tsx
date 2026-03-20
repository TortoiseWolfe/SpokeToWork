'use client';

/**
 * RoutePolylines — collection renderer.
 *
 * Filters a route list by system/user toggle and geometry validity, then
 * renders each as a RoutePolyline. Split from RoutePolyline.tsx so the
 * dynamic import on the map page can target this file directly.
 */

import { useMemo } from 'react';
import type { BicycleRoute } from '@/types/route';
import RoutePolyline from './RoutePolyline';

export interface RoutePolylinesProps {
  routes: BicycleRoute[];
  activeRouteId?: string | null;
  onRouteClick?: (route: BicycleRoute) => void;
  showSystemRoutes?: boolean;
  showUserRoutes?: boolean;
}

function hasValidGeometry(route: BicycleRoute): boolean {
  return (
    route.route_geometry != null &&
    typeof route.route_geometry === 'object' &&
    Array.isArray(route.route_geometry.coordinates) &&
    route.route_geometry.coordinates.length >= 2
  );
}

export function RoutePolylines({
  routes,
  activeRouteId,
  onRouteClick,
  showSystemRoutes = true,
  showUserRoutes = true,
}: RoutePolylinesProps) {
  const filtered = useMemo(
    () =>
      routes.filter((route) => {
        if (route.is_system_route && !showSystemRoutes) return false;
        if (!route.is_system_route && !showUserRoutes) return false;
        return hasValidGeometry(route);
      }),
    [routes, showSystemRoutes, showUserRoutes]
  );

  return (
    <>
      {filtered.map((route) => (
        <RoutePolyline
          key={route.id}
          route={route}
          isActive={route.id === activeRouteId}
          onClick={onRouteClick}
        />
      ))}
    </>
  );
}

export default RoutePolylines;

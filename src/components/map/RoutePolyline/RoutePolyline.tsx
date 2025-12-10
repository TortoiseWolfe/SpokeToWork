'use client';

/**
 * RoutePolyline - Feature 041: Bicycle Route Planning
 *
 * Renders a route path as a Leaflet polyline on the map.
 * Supports GeoJSON LineString geometry with configurable styling.
 */

import { useMemo, useState, useEffect } from 'react';
import { Polyline, Popup, useMap } from 'react-leaflet';
import type { LatLngTuple, PathOptions } from 'leaflet';
import type { RouteGeometry, BicycleRoute } from '@/types/route';

/**
 * Hook to check if map is ready for rendering children
 * Uses the map's container to verify initialization
 */
function useMapReady(): boolean {
  const map = useMap();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (map && map.getContainer()) {
      // Small delay to ensure Leaflet is fully initialized
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [map]);

  return isReady;
}

export interface RoutePolylineProps {
  /** Route data including geometry */
  route: BicycleRoute;
  /** Whether this is a system route (trail/greenway) */
  isSystemRoute?: boolean;
  /** Whether the route is currently active/selected */
  isActive?: boolean;
  /** Custom color override */
  color?: string;
  /** Custom weight override */
  weight?: number;
  /** Whether to show popup on click */
  showPopup?: boolean;
  /** Callback when route is clicked */
  onClick?: (route: BicycleRoute) => void;
  /** Additional CSS class for popup content */
  popupClassName?: string;
}

/**
 * Convert GeoJSON coordinates to Leaflet LatLngTuple array
 * GeoJSON uses [longitude, latitude], Leaflet uses [latitude, longitude]
 */
function geoJsonToLatLng(geometry: RouteGeometry): LatLngTuple[] {
  return geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLngTuple);
}

/**
 * Get default styling based on route type
 */
function getRouteStyle(
  isSystemRoute: boolean,
  isActive: boolean,
  customColor?: string,
  customWeight?: number
): PathOptions {
  // Use bright, high-contrast colors that stand out on CyclOSM tiles
  // System routes: bright emerald green, User routes: bright cyan blue
  const systemColor = '#00FF88'; // Bright neon green
  const userColor = '#00BFFF'; // Deep sky blue (high contrast)

  const baseStyle: PathOptions = {
    color: customColor ?? (isSystemRoute ? systemColor : userColor),
    weight: customWeight ?? (isActive ? 8 : 6), // Thicker lines for visibility
    opacity: 1, // Full opacity for maximum visibility
    lineCap: 'round',
    lineJoin: 'round',
  };

  if (isSystemRoute) {
    // System routes (trails) have dashed pattern - very visible
    return {
      ...baseStyle,
      dashArray: '20, 10',
    };
  }

  return baseStyle;
}

export default function RoutePolyline({
  route,
  isSystemRoute = false,
  isActive = false,
  color,
  weight,
  showPopup = true,
  onClick,
  popupClassName = '',
}: RoutePolylineProps) {
  // Wait for map to be fully ready before rendering Polyline
  const mapReady = useMapReady();

  // Convert geometry to positions
  const positions = useMemo(() => {
    if (!route.route_geometry) return null;
    try {
      return geoJsonToLatLng(route.route_geometry);
    } catch {
      console.warn('Invalid route geometry for route:', route.id);
      return null;
    }
  }, [route.route_geometry, route.id]);

  // Get styling
  const pathOptions = useMemo(
    () =>
      getRouteStyle(
        isSystemRoute || route.is_system_route,
        isActive,
        color ?? route.color,
        weight
      ),
    [isSystemRoute, route.is_system_route, isActive, color, route.color, weight]
  );

  // Don't render if map not ready or no valid geometry
  if (!mapReady || !positions || positions.length < 2) {
    return null;
  }

  const handleClick = () => {
    onClick?.(route);
  };

  return (
    <Polyline
      positions={positions}
      pathOptions={pathOptions}
      eventHandlers={{
        click: handleClick,
      }}
    >
      {showPopup && (
        <Popup className={popupClassName}>
          <div className="min-w-48" data-testid="route-popup">
            <h3 className="mb-1 text-base font-semibold">{route.name}</h3>

            {route.description && (
              <p className="text-base-content/70 mb-2 text-sm">
                {route.description}
              </p>
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
                  <span className="font-medium">Trail:</span>{' '}
                  {route.source_name}
                </p>
              )}
            </div>

            {route.is_system_route && (
              <div className="mt-2">
                <span className="badge badge-secondary badge-sm">
                  System Trail
                </span>
              </div>
            )}
          </div>
        </Popup>
      )}
    </Polyline>
  );
}

/**
 * Helper component to render multiple routes
 */
export interface RoutePolylinesProps {
  routes: BicycleRoute[];
  activeRouteId?: string | null;
  onRouteClick?: (route: BicycleRoute) => void;
  showSystemRoutes?: boolean;
  showUserRoutes?: boolean;
}

export function RoutePolylines({
  routes,
  activeRouteId,
  onRouteClick,
  showSystemRoutes = true,
  showUserRoutes = true,
}: RoutePolylinesProps) {
  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      if (route.is_system_route && !showSystemRoutes) return false;
      if (!route.is_system_route && !showUserRoutes) return false;
      // Only include routes with valid geometry (not null/undefined and has coordinates)
      return (
        route.route_geometry != null &&
        typeof route.route_geometry === 'object' &&
        Array.isArray(route.route_geometry.coordinates) &&
        route.route_geometry.coordinates.length >= 2
      );
    });
  }, [routes, showSystemRoutes, showUserRoutes]);

  return (
    <>
      {filteredRoutes.map((route) => (
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

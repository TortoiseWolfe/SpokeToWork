'use client';

/**
 * RoutePolyline - Feature 041: Bicycle Route Planning
 *
 * Renders a route path as a MapLibre line layer on the map.
 * Supports GeoJSON LineString geometry with configurable styling.
 * Migrated from Leaflet to MapLibre GL for Feature 045.
 */

import { useMemo, useState, useCallback } from 'react';
import { Source, Layer, Popup, useMap } from 'react-map-gl/maplibre';
import type { LineLayerSpecification } from 'maplibre-gl';
import type { RouteGeometry, BicycleRoute } from '@/types/route';

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
 * Convert route geometry to GeoJSON Feature for MapLibre Source
 */
function routeToGeoJSON(
  geometry: RouteGeometry
): GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString> {
  // Handle both LineString and MultiLineString geometries
  if (geometry.type === 'MultiLineString') {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiLineString',
        coordinates: geometry.coordinates as number[][][],
      },
    };
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: geometry.coordinates as number[][],
    },
  };
}

/**
 * Get line layer paint properties based on route type
 */
function getLayerPaint(
  isSystemRoute: boolean,
  isActive: boolean,
  customColor?: string,
  customWeight?: number
): LineLayerSpecification['paint'] {
  // Use bright, high-contrast colors
  const systemColor = '#00FF88'; // Bright neon green
  const userColor = '#00BFFF'; // Deep sky blue

  return {
    'line-color': customColor ?? (isSystemRoute ? systemColor : userColor),
    'line-width': customWeight ?? (isActive ? 8 : 6),
    'line-opacity': 1,
  };
}

/**
 * Get line layer layout properties
 */
function getLayerLayout(
  isSystemRoute: boolean
): LineLayerSpecification['layout'] {
  return {
    'line-cap': 'round',
    'line-join': 'round',
  };
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
  const { current: map } = useMap();
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);

  // Convert geometry to GeoJSON
  const geoJsonData = useMemo(() => {
    if (!route.route_geometry) return null;
    try {
      return routeToGeoJSON(route.route_geometry);
    } catch {
      console.warn('Invalid route geometry for route:', route.id);
      return null;
    }
  }, [route.route_geometry, route.id]);

  // Get styling
  const paint = useMemo(
    () =>
      getLayerPaint(
        isSystemRoute || route.is_system_route,
        isActive,
        color ?? route.color,
        weight
      ),
    [isSystemRoute, route.is_system_route, isActive, color, route.color, weight]
  );

  const layout = useMemo(
    () => getLayerLayout(isSystemRoute || route.is_system_route),
    [isSystemRoute, route.is_system_route]
  );

  // Handle click on layer
  const handleLayerClick = useCallback(
    (e: maplibregl.MapLayerMouseEvent) => {
      if (e.lngLat) {
        setPopupInfo({
          longitude: e.lngLat.lng,
          latitude: e.lngLat.lat,
        });
      }
      onClick?.(route);
    },
    [onClick, route]
  );

  // Set up click handler on the layer
  useMemo(() => {
    if (!map) return;

    const layerId = `route-${route.id}`;

    // Add click handler
    const clickHandler = (e: maplibregl.MapLayerMouseEvent) => {
      handleLayerClick(e);
    };

    // Add cursor change on hover
    const mouseEnterHandler = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const mouseLeaveHandler = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', layerId, clickHandler);
    map.on('mouseenter', layerId, mouseEnterHandler);
    map.on('mouseleave', layerId, mouseLeaveHandler);

    return () => {
      map.off('click', layerId, clickHandler);
      map.off('mouseenter', layerId, mouseEnterHandler);
      map.off('mouseleave', layerId, mouseLeaveHandler);
    };
  }, [map, route.id, handleLayerClick]);

  // Don't render if no valid geometry
  if (!geoJsonData) {
    return null;
  }

  const sourceId = `route-source-${route.id}`;
  const layerId = `route-${route.id}`;

  return (
    <>
      <Source id={sourceId} type="geojson" data={geoJsonData}>
        <Layer id={layerId} type="line" paint={paint} layout={layout} />
        {/* Dashed overlay for system routes */}
        {(isSystemRoute || route.is_system_route) && (
          <Layer
            id={`${layerId}-dash`}
            type="line"
            paint={{
              ...paint,
              'line-dasharray': [2, 1],
            }}
            layout={layout}
          />
        )}
      </Source>

      {showPopup && popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          closeOnClick={false}
          className={popupClassName}
        >
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
    </>
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
      // Only include routes with valid geometry
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

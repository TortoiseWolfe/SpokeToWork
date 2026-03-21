'use client';

/**
 * RoutePolyline - Feature 041: Bicycle Route Planning
 *
 * Renders a route path as a MapLibre line layer on the map.
 * Supports GeoJSON LineString geometry with configurable styling.
 * Colors follow the active DaisyUI theme (success/info/primary).
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Source, Layer, Popup, useMap } from 'react-map-gl/maplibre';
import type { BicycleRoute } from '@/types/route';
import { useRoutePalette } from '@/hooks/useRoutePalette';
import {
  routeToGeoJSON,
  getRoutePaint,
  getRouteGlowPaint,
  ROUTE_LAYOUT,
} from '@/lib/map/route-paint';
import { RoutePopupBody } from './RoutePopupBody';

export interface RoutePolylineProps {
  route: BicycleRoute;
  isSystemRoute?: boolean;
  isActive?: boolean;
  color?: string;
  weight?: number;
  showPopup?: boolean;
  onClick?: (route: BicycleRoute) => void;
  popupClassName?: string;
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
  const palette = useRoutePalette();
  const [popupInfo, setPopupInfo] = useState<{
    longitude: number;
    latitude: number;
  } | null>(null);

  const system = isSystemRoute || route.is_system_route;

  const geoJsonData = useMemo(() => {
    if (!route.route_geometry) return null;
    try {
      return routeToGeoJSON(route.route_geometry);
    } catch {
      console.warn('Invalid route geometry for route:', route.id);
      return null;
    }
  }, [route.route_geometry, route.id]);

  const paint = useMemo(
    () =>
      getRoutePaint(palette, system, isActive, color ?? route.color, weight),
    [palette, system, isActive, color, route.color, weight]
  );

  const glowPaint = useMemo(
    () => getRouteGlowPaint(palette, system, color ?? route.color),
    [palette, system, color, route.color]
  );

  const handleLayerClick = useCallback(
    (e: maplibregl.MapLayerMouseEvent) => {
      if (e.lngLat) {
        setPopupInfo({ longitude: e.lngLat.lng, latitude: e.lngLat.lat });
      }
      onClick?.(route);
    },
    [onClick, route]
  );

  const layerId = `route-${route.id}`;

  // Bind click/hover to the layer. Needs useEffect (not useMemo) so the
  // cleanup actually runs on unmount.
  useEffect(() => {
    if (!map) return;
    const mouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const mouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };
    map.on('click', layerId, handleLayerClick);
    map.on('mouseenter', layerId, mouseEnter);
    map.on('mouseleave', layerId, mouseLeave);
    return () => {
      map.off('click', layerId, handleLayerClick);
      map.off('mouseenter', layerId, mouseEnter);
      map.off('mouseleave', layerId, mouseLeave);
    };
  }, [map, layerId, handleLayerClick]);

  if (!geoJsonData) return null;

  return (
    <>
      <Source id={`route-source-${route.id}`} type="geojson" data={geoJsonData}>
        {isActive && (
          <Layer
            id={`${layerId}-glow`}
            type="line"
            paint={glowPaint}
            layout={ROUTE_LAYOUT}
          />
        )}
        <Layer id={layerId} type="line" paint={paint} layout={ROUTE_LAYOUT} />
        {system && (
          <Layer
            id={`${layerId}-dash`}
            type="line"
            paint={{ ...paint, 'line-dasharray': [2, 1] }}
            layout={ROUTE_LAYOUT}
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
          <RoutePopupBody route={route} />
        </Popup>
      )}
    </>
  );
}

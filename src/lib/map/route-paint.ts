/**
 * Route Polyline Paint & Geometry Helpers
 *
 * Pure style-spec builders for MapLibre line layers representing bicycle
 * routes. Extracted from RoutePolyline.tsx.
 */

import type { LineLayerSpecification } from 'maplibre-gl';
import type { RouteGeometry } from '@/types/route';

/** Resolved theme palette — already MapLibre-safe (rgb/hex). */
export interface RoutePalette {
  /** System trail color (DaisyUI `success`) */
  system: string;
  /** User route color (DaisyUI `info`) */
  user: string;
  /** Active/highlight overlay (DaisyUI `primary`) */
  active: string;
}

export const FALLBACK_PALETTE: RoutePalette = {
  system: '#22c55e',
  user: '#0ea5e9',
  active: '#3b82f6',
};

/** Convert stored route geometry to a GeoJSON Feature for a MapLibre Source. */
export function routeToGeoJSON(
  geometry: RouteGeometry
): GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString> {
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
 * Main line paint. Active routes are wider and fully opaque; inactive
 * routes fade back so the active one pops.
 */
export function getRoutePaint(
  palette: RoutePalette,
  isSystemRoute: boolean,
  isActive: boolean,
  customColor?: string,
  customWeight?: number
): LineLayerSpecification['paint'] {
  const baseColor = isSystemRoute ? palette.system : palette.user;
  const activeColor = palette.active;
  return {
    'line-color': customColor ?? (isActive ? activeColor : baseColor),
    'line-width': customWeight ?? (isActive ? 10 : 4),
    'line-opacity': isActive ? 1 : 0.25,
  };
}

/** Blurred glow underlay drawn below the main line when active. */
export function getRouteGlowPaint(
  palette: RoutePalette,
  isSystemRoute: boolean,
  customColor?: string
): LineLayerSpecification['paint'] {
  return {
    'line-color':
      customColor ?? (isSystemRoute ? palette.system : palette.user),
    'line-width': 18,
    'line-opacity': 0.3,
    'line-blur': 4,
  };
}

export const ROUTE_LAYOUT: LineLayerSpecification['layout'] = {
  'line-cap': 'round',
  'line-join': 'round',
};

/** The few map calls syncLayerPaint needs (a MapLibre map or react-map-gl MapRef fits). */
export interface PaintSyncMap {
  getLayer(id: string): unknown;
  getPaintProperty(id: string, name: string): unknown;
  setPaintProperty(id: string, name: string, value: unknown): void;
}

/**
 * Make a drawn layer's paint match the wanted paint.
 *
 * react-map-gl applies a paint change inside a try/catch and then remembers
 * the new props as applied even when the map threw (for example "Style is not
 * done loading"). The change is then lost for good and the layer keeps its old
 * look: an active route drawn thin with no highlight. Calling this after each
 * render, and again on every `styledata` event, repairs that.
 *
 * Returns true when the layer exists and every property matches afterwards.
 */
export function syncLayerPaint(
  map: PaintSyncMap,
  layerId: string,
  paint: Record<string, unknown> | undefined
): boolean {
  if (!paint) return true;
  try {
    if (!map.getLayer(layerId)) return false;
    let allMatch = true;
    for (const [name, wanted] of Object.entries(paint)) {
      if (
        JSON.stringify(map.getPaintProperty(layerId, name)) !==
        JSON.stringify(wanted)
      ) {
        map.setPaintProperty(layerId, name, wanted);
        if (
          JSON.stringify(map.getPaintProperty(layerId, name)) !==
          JSON.stringify(wanted)
        ) {
          allMatch = false;
        }
      }
    }
    return allMatch;
  } catch {
    // Style not ready yet; the next styledata event tries again.
    return false;
  }
}

'use client';

/**
 * BikeRoutesLayer - Feature 045: Fix Bike Route Map Display
 *
 * Renders OSM bike routes as MapLibre line layers on the map.
 * Uses declarative Source/Layer components for automatic theme persistence.
 * Colors are driven by DaisyUI semantic tokens (--color-success,
 * --color-base-100) read at runtime so all 32 themes adapt automatically.
 */

import { useEffect, useState, useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayerSpecification } from 'maplibre-gl';
import { useDaisyColors } from '@/hooks/useDaisyColors';

/**
 * Convert any CSS color (including oklch) to rgb() format that MapLibre
 * can parse. MapLibre's style-spec only supports hex/rgb/rgba/hsl/hsla,
 * not oklch(). Renders a 1px canvas and reads back the pixel to force
 * the browser to convert from oklch to sRGB.
 */
function toMapLibreColor(cssColor: string): string {
  if (typeof document === 'undefined' || !cssColor) return cssColor;
  if (/^(#|rgb|hsl)/.test(cssColor)) return cssColor;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return cssColor;
  ctx.fillStyle = cssColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  if (a < 255) return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
  return `rgb(${r},${g},${b})`;
}

export interface BikeRoutesLayerProps {
  /** Whether the layer is visible */
  visible?: boolean;
  /** Pre-fetched GeoJSON data (avoids re-fetch on remount) */
  initialData?: GeoJSON.FeatureCollection | null;
}

/**
 * BikeRoutesLayer displays all OSM bike routes from a GeoJSON file.
 * Automatically persists across MapLibre style changes (theme toggles).
 */
export function BikeRoutesLayer({
  visible = true,
  initialData,
}: BikeRoutesLayerProps) {
  const [geojsonData, setGeojsonData] =
    useState<GeoJSON.FeatureCollection | null>(initialData ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!initialData);

  // Theme-driven colors: route fill uses the `success` token (green-family
  // in most themes); casing uses `base-100` so the outline matches the map
  // background surface. DaisyUI v5 returns oklch() which MapLibre can't
  // parse, so toMapLibreColor() converts to rgb() via the browser engine.
  const { success: rawRouteColor, 'base-100': rawCasingColor } = useDaisyColors(
    ['success', 'base-100'] as const
  );
  const routeColor = toMapLibreColor(rawRouteColor) || '#22c55e';
  const casingColor = toMapLibreColor(rawCasingColor) || '#ffffff';

  // Use parent-provided data if available; otherwise fetch on mount
  useEffect(() => {
    if (initialData) {
      setGeojsonData(initialData);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadBikeRoutes() {
      try {
        const response = await fetch('/data/all-bike-routes.geojson');
        if (!response.ok) {
          throw new Error(`Failed to fetch bike routes: ${response.status}`);
        }
        const data = await response.json();

        if (isMounted) {
          setGeojsonData(data);
          setIsLoading(false);
          console.log('Loaded', data.features?.length ?? 0, 'bike routes');
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setIsLoading(false);
          console.error('Failed to load bike routes:', err);
        }
      }
    }

    loadBikeRoutes();

    return () => {
      isMounted = false;
    };
  }, [initialData]);

  // Casing layer paint (outline for visibility)
  const casingPaint: LineLayerSpecification['paint'] = useMemo(
    () => ({
      'line-color': casingColor,
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5,
        6,
        8,
        7,
        12,
        9,
        16,
        12,
      ],
      'line-opacity': 0.9,
    }),
    [casingColor]
  );

  // Route layer paint (success-token fill)
  const routePaint: LineLayerSpecification['paint'] = useMemo(
    () => ({
      'line-color': routeColor,
      'line-width': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5,
        4,
        8,
        5,
        12,
        7,
        16,
        10,
      ],
      'line-opacity': 1,
    }),
    [routeColor]
  );

  // Layout for both layers
  const layout: LineLayerSpecification['layout'] = useMemo(
    () => ({
      'line-cap': 'round',
      'line-join': 'round',
      visibility: visible ? 'visible' : 'none',
    }),
    [visible]
  );

  // Don't render until data is ready. Color fallbacks above ensure
  // routeColor/casingColor are never empty, so no color guard needed.
  if (isLoading || error || !geojsonData) {
    return null;
  }

  return (
    <Source id="all-bike-routes" type="geojson" data={geojsonData}>
      {/* Render BELOW labels by inserting before road-label layer (if it exists) */}
      <Layer
        id="all-bike-routes-casing"
        type="line"
        paint={casingPaint}
        layout={layout}
      />
      <Layer
        id="all-bike-routes"
        type="line"
        paint={routePaint}
        layout={layout}
      />
    </Source>
  );
}

export default BikeRoutesLayer;

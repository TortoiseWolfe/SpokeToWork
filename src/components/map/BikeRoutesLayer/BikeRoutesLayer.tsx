'use client';

/**
 * BikeRoutesLayer — OSM bike routes as MapLibre line layers.
 *
 * Declarative Source/Layer so the layer survives style changes (theme
 * toggle). Colors come from DaisyUI semantic tokens at runtime.
 */

import { useEffect, useState, useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayerSpecification } from 'maplibre-gl';
import { useDaisyColors } from '@/hooks/useDaisyColors';
import { toMapLibreColor } from '@/lib/map/maplibre-color';

export interface BikeRoutesLayerProps {
  /** Whether the layer is visible */
  visible?: boolean;
  /** Pre-fetched GeoJSON data (avoids re-fetch on remount) */
  initialData?: GeoJSON.FeatureCollection | null;
}

// Zoom-responsive line widths — constant, no runtime deps.
// prettier-ignore
const CASING_WIDTH: LineLayerSpecification['paint'] = {
  'line-width': ['interpolate', ['linear'], ['zoom'], 5, 6, 8, 7, 12, 9, 16, 12],
  'line-opacity': 0.9,
};
// prettier-ignore
const ROUTE_WIDTH: LineLayerSpecification['paint'] = {
  'line-width': ['interpolate', ['linear'], ['zoom'], 5, 4, 8, 5, 12, 7, 16, 10],
  'line-opacity': 1,
};

export function BikeRoutesLayer({
  visible = true,
  initialData,
}: BikeRoutesLayerProps) {
  const [geojsonData, setGeojsonData] =
    useState<GeoJSON.FeatureCollection | null>(initialData ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!initialData);

  // DaisyUI v5 returns oklch() which MapLibre can't parse — convert to rgb().
  const { success: rawRoute, 'base-100': rawCasing } = useDaisyColors([
    'success',
    'base-100',
  ] as const);
  const routeColor = toMapLibreColor(rawRoute) || '#22c55e';
  const casingColor = toMapLibreColor(rawCasing) || '#ffffff';

  // Use parent-provided data if available; otherwise fetch on mount.
  useEffect(() => {
    if (initialData) {
      setGeojsonData(initialData);
      setIsLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/data/all-bike-routes.geojson');
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        setGeojsonData(data);
        console.log('Loaded', data.features?.length ?? 0, 'bike routes');
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err : new Error('Unknown error'));
        console.error('Failed to load bike routes:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [initialData]);

  const casingPaint = useMemo<LineLayerSpecification['paint']>(
    () => ({ ...CASING_WIDTH, 'line-color': casingColor }),
    [casingColor]
  );
  const routePaint = useMemo<LineLayerSpecification['paint']>(
    () => ({ ...ROUTE_WIDTH, 'line-color': routeColor }),
    [routeColor]
  );
  const layout = useMemo<LineLayerSpecification['layout']>(
    () => ({
      'line-cap': 'round',
      'line-join': 'round',
      visibility: visible ? 'visible' : 'none',
    }),
    [visible]
  );

  if (isLoading || error || !geojsonData) return null;

  return (
    <Source id="all-bike-routes" type="geojson" data={geojsonData}>
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

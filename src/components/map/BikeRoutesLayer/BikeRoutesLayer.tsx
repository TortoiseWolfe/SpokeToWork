'use client';

/**
 * BikeRoutesLayer - Feature 045: Fix Bike Route Map Display
 *
 * Renders OSM bike routes as MapLibre line layers on the map.
 * Uses declarative Source/Layer components for automatic theme persistence.
 * Theme-adaptive colors for visibility in light and dark modes.
 */

import { useEffect, useState, useMemo } from 'react';
import { Source, Layer } from 'react-map-gl/maplibre';
import type { LineLayerSpecification } from 'maplibre-gl';

export interface BikeRoutesLayerProps {
  /** Whether the current theme is dark mode */
  isDarkMode: boolean;
  /** Whether the layer is visible */
  visible?: boolean;
}

/**
 * BikeRoutesLayer displays all OSM bike routes from a GeoJSON file.
 * Automatically persists across MapLibre style changes (theme toggles).
 */
export function BikeRoutesLayer({
  isDarkMode,
  visible = true,
}: BikeRoutesLayerProps) {
  const [geojsonData, setGeojsonData] =
    useState<GeoJSON.FeatureCollection | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch GeoJSON once on mount
  useEffect(() => {
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
  }, []);

  // Theme-adaptive colors
  const routeColor = isDarkMode ? '#4ade80' : '#22c55e'; // green-400 / green-500
  const casingColor = isDarkMode ? '#1a1a2e' : '#ffffff'; // Dark bg / White

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

  // Route layer paint (green fill)
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

  // Don't render if loading, error, or no data
  if (isLoading || error || !geojsonData) {
    return null;
  }

  return (
    <Source id="all-bike-routes" type="geojson" data={geojsonData}>
      {/* Render BELOW labels by inserting before road-label layer */}
      <Layer
        id="all-bike-routes-casing"
        type="line"
        paint={casingPaint}
        layout={layout}
        beforeId="road-label"
      />
      <Layer
        id="all-bike-routes"
        type="line"
        paint={routePaint}
        layout={layout}
        beforeId="road-label"
      />
    </Source>
  );
}

export default BikeRoutesLayer;

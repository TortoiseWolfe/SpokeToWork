'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import Map, {
  Marker,
  Popup,
  NavigationControl,
  GeolocateControl,
  type MapRef,
} from 'react-map-gl/maplibre';
import type { LngLatLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapTheme, type MapTheme } from '@/hooks/useMapTheme';
import { DEFAULT_MAP_CONFIG } from '@/utils/map-utils';
import { BikeRoutesLayer } from '@/components/map/BikeRoutesLayer';

/**
 * Marker variant for different display styles
 * - default: Plain dot
 * - next-ride: Ping animation + eye icon
 * - active-route: Pulse animation + building icon
 * - start-point: Home/start marker (green flag)
 * - end-point: Destination marker (checkered flag)
 */
export type MarkerVariant =
  | 'default'
  | 'next-ride'
  | 'active-route'
  | 'start-point'
  | 'end-point';

export interface MapMarker {
  position: [number, number]; // [lat, lng]
  popup?: string;
  id: string;
  variant?: MarkerVariant;
}

interface MapContainerInnerProps {
  center: [number, number]; // [lat, lng]
  zoom: number;
  showUserLocation?: boolean;
  markers?: MapMarker[];
  onLocationFound?: (position: GeolocationPosition) => void;
  onLocationError?: (error: GeolocationPositionError) => void;
  onMapReady?: (map: MapRef) => void;
  onError?: (error: Error) => void;
  scrollWheelZoom?: boolean;
  zoomControl?: boolean;
  keyboardNavigation?: boolean;
  theme?: MapTheme;
  children?: React.ReactNode;
}

/**
 * Get marker color based on variant
 * Uses fixed high-contrast colors that work on both light (#f8f9fa) and dark (#1a1a2e) map backgrounds
 */
const getMarkerColor = (variant: MarkerVariant = 'default'): string => {
  switch (variant) {
    case 'next-ride':
      return '#FF6B35'; // Bright orange - high visibility on both backgrounds
    case 'active-route':
      return '#E63946'; // Bright red - stands out on light and dark maps
    case 'start-point':
      return '#22C55E'; // Green - indicates starting point/home
    case 'end-point':
      return '#8B5CF6'; // Purple - indicates destination/finish
    default:
      return '#3b82f6'; // Default blue
  }
};

/**
 * Custom marker component for different variants
 * - next-ride: Ping animation + eye icon (24px)
 * - active-route: Pulse animation + building icon (28px)
 * - start-point: Home/flag icon (32px) - green
 * - end-point: Checkered flag icon (32px) - purple
 * - default: Plain dot (20px)
 */
const CustomMarker: React.FC<{
  marker: MapMarker;
  onClick?: () => void;
}> = ({ marker, onClick }) => {
  const color = getMarkerColor(marker.variant);
  const isNextRide = marker.variant === 'next-ride';
  const isActiveRoute = marker.variant === 'active-route';
  const isStartPoint = marker.variant === 'start-point';
  const isEndPoint = marker.variant === 'end-point';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={marker.popup || 'Map marker'}
      data-testid={
        isStartPoint ? 'start-marker' : isEndPoint ? 'end-marker' : undefined
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      {isStartPoint ? (
        <div className="relative" data-testid="start-marker-inner">
          {/* Glow effect for start point */}
          <div
            className="absolute -inset-1 animate-pulse rounded-full opacity-40"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 8px 4px ${color}`,
            }}
          />
          <div
            className="relative flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white"
            style={{
              backgroundColor: color,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px rgba(0,0,0,0.2)',
            }}
          >
            {/* Home/flag icon for start point */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white drop-shadow-sm"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </div>
        </div>
      ) : isEndPoint ? (
        <div className="relative" data-testid="end-marker-inner">
          {/* Glow effect for end point */}
          <div
            className="absolute -inset-1 animate-pulse rounded-full opacity-40"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 8px 4px ${color}`,
            }}
          />
          <div
            className="relative flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white"
            style={{
              backgroundColor: color,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px rgba(0,0,0,0.2)',
            }}
          >
            {/* Flag icon for end/destination point */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white drop-shadow-sm"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      ) : isNextRide ? (
        <div className="relative">
          <div
            className="absolute inset-0 animate-ping rounded-full opacity-50"
            style={{ backgroundColor: color }}
          />
          <div
            className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: color }}
          >
            {/* Eye icon for next-ride */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      ) : isActiveRoute ? (
        <div className="relative">
          {/* Pulse ring animation for active-route */}
          <div
            className="absolute -inset-2 animate-pulse rounded-full opacity-50"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 12px 6px ${color}`,
            }}
          />
          <div
            className="relative flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white"
            style={{
              backgroundColor: color,
              boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px rgba(0,0,0,0.2)',
            }}
          >
            {/* Building icon for business stops */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-white drop-shadow-sm"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      ) : (
        <div
          className="h-6 w-6 rounded-full border-2 border-white"
          style={{
            backgroundColor: color,
            boxShadow: '0 2px 6px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.15)',
          }}
        />
      )}
    </div>
  );
};

// List of known dark themes in DaisyUI
const DARK_THEMES = [
  'dark',
  'synthwave',
  'halloween',
  'forest',
  'black',
  'luxury',
  'dracula',
  'business',
  'night',
  'coffee',
  'dim',
  'sunset',
];

const MapContainerInner: React.FC<MapContainerInnerProps> = ({
  center,
  zoom,
  showUserLocation = false,
  markers = [],
  onLocationFound,
  onLocationError,
  onMapReady,
  onError,
  scrollWheelZoom = DEFAULT_MAP_CONFIG.scrollWheelZoom,
  zoomControl = DEFAULT_MAP_CONFIG.zoomControl,
  keyboardNavigation = DEFAULT_MAP_CONFIG.keyboardNavigation,
  theme = 'auto',
  children,
}) => {
  const mapRef = useRef<MapRef>(null);
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const mapStyle = useMapTheme(theme);

  // Detect dark mode for BikeRoutesLayer theme-adaptive colors
  useEffect(() => {
    const detectDarkMode = (): boolean => {
      const dataTheme = document.documentElement.getAttribute('data-theme');
      if (dataTheme && DARK_THEMES.includes(dataTheme)) {
        return true;
      }
      if (!dataTheme || dataTheme === 'system' || dataTheme === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
    };

    setIsDarkMode(detectDarkMode());

    const observer = new MutationObserver(() => {
      setIsDarkMode(detectDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => setIsDarkMode(detectDarkMode());
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  // Convert [lat, lng] to MapLibre's [lng, lat] format
  const mapCenter: LngLatLike = [center[1], center[0]];

  // Handle map load - bike routes now handled by BikeRoutesLayer component
  const handleLoad = useCallback(() => {
    if (mapRef.current && onMapReady) {
      onMapReady(mapRef.current);
    }
  }, [onMapReady]);

  // Handle map error
  const handleError = useCallback(
    (event: { error: Error }) => {
      if (onError) {
        onError(event.error);
      }
    },
    [onError]
  );

  // Handle geolocate events
  const handleGeolocate = useCallback(
    (event: GeolocationPosition) => {
      if (onLocationFound) {
        onLocationFound(event);
      }
    },
    [onLocationFound]
  );

  const handleGeolocateError = useCallback(
    (event: GeolocationPositionError) => {
      if (onLocationError) {
        onLocationError(event);
      }
    },
    [onLocationError]
  );

  // Expose map instance globally for testing
  useEffect(() => {
    if (typeof window !== 'undefined' && mapRef.current) {
      (window as Window & { maplibreMap?: MapRef }).maplibreMap =
        mapRef.current;
    }
  }, []);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: mapCenter[0] as number,
        latitude: mapCenter[1] as number,
        zoom: zoom,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={mapStyle}
      scrollZoom={scrollWheelZoom}
      keyboard={keyboardNavigation}
      onLoad={handleLoad}
      onError={handleError}
      reuseMaps
    >
      {/* OSM Bike Routes - uses declarative components for theme persistence */}
      <BikeRoutesLayer isDarkMode={isDarkMode} />

      {/* Navigation controls */}
      {zoomControl && <NavigationControl position="top-right" />}

      {/* Geolocation control */}
      {showUserLocation && (
        <GeolocateControl
          ref={(ref) => {
            geolocateRef.current =
              ref as unknown as maplibregl.GeolocateControl;
          }}
          position="top-right"
          trackUserLocation
          onGeolocate={handleGeolocate}
          onError={handleGeolocateError}
        />
      )}

      {/* Markers */}
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          longitude={marker.position[1]}
          latitude={marker.position[0]}
          anchor="center"
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            setSelectedMarker(marker);
          }}
        >
          <CustomMarker
            marker={marker}
            onClick={() => setSelectedMarker(marker)}
          />
        </Marker>
      ))}

      {/* Selected marker popup */}
      {selectedMarker && selectedMarker.popup && (
        <Popup
          longitude={selectedMarker.position[1]}
          latitude={selectedMarker.position[0]}
          anchor="bottom"
          onClose={() => setSelectedMarker(null)}
          closeOnClick={false}
          className="map-popup"
        >
          <div className="rounded bg-white px-2 py-1 text-sm font-medium text-gray-900 shadow-lg">
            {selectedMarker.popup}
          </div>
        </Popup>
      )}

      {/* Children (route overlays, etc.) */}
      {children}
    </Map>
  );
};

export default MapContainerInner;

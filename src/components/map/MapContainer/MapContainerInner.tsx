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

/**
 * Marker variant for different display styles
 */
export type MarkerVariant = 'default' | 'next-ride' | 'active-route';

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
 */
const getMarkerColor = (variant: MarkerVariant = 'default'): string => {
  switch (variant) {
    case 'next-ride':
      return 'oklch(var(--p))'; // DaisyUI primary
    case 'active-route':
      return 'oklch(var(--s))'; // DaisyUI secondary
    default:
      return '#3b82f6'; // Default blue
  }
};

/**
 * Custom marker component for different variants
 */
const CustomMarker: React.FC<{
  marker: MapMarker;
  onClick?: () => void;
}> = ({ marker, onClick }) => {
  const color = getMarkerColor(marker.variant);
  const isNextRide = marker.variant === 'next-ride';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={marker.popup || 'Map marker'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      {isNextRide ? (
        <div className="relative">
          <div
            className="absolute inset-0 animate-ping rounded-full opacity-50"
            style={{ backgroundColor: color }}
          />
          <div
            className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: color }}
          >
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
      ) : (
        <div
          className="h-5 w-5 rounded-full border-2 border-white shadow-lg"
          style={{ backgroundColor: color }}
        />
      )}
    </div>
  );
};

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
  const mapStyle = useMapTheme(theme);

  // Convert [lat, lng] to MapLibre's [lng, lat] format
  const mapCenter: LngLatLike = [center[1], center[0]];

  // Handle map load
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
        >
          <div className="text-sm">{selectedMarker.popup}</div>
        </Popup>
      )}

      {/* Children (route overlays, etc.) */}
      {children}
    </Map>
  );
};

export default MapContainerInner;

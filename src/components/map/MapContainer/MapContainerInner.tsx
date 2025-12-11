import React, { useEffect } from 'react';
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import type { Map as LeafletMap, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import {
  OSM_TILE_URL,
  OSM_ATTRIBUTION,
  DEFAULT_MAP_CONFIG,
} from '@/utils/map-utils';

/**
 * Marker variant for different display styles
 */
export type MarkerVariant = 'default' | 'next-ride' | 'active-route';

export interface MapMarker {
  position: LatLngTuple;
  popup?: string;
  id: string;
  variant?: MarkerVariant;
}

interface MapContainerInnerProps {
  center: LatLngTuple;
  zoom: number;
  showUserLocation?: boolean;
  markers?: MapMarker[];
  onLocationFound?: (position: GeolocationPosition) => void;
  onLocationError?: (error: GeolocationPositionError) => void;
  onMapReady?: (map: LeafletMap) => void;
  tileUrl?: string;
  attribution?: string;
  scrollWheelZoom?: boolean;
  zoomControl?: boolean;
  keyboardNavigation?: boolean;
  children?: React.ReactNode;
}

// Custom marker icons for different variants
const createMarkerIcon = (
  variant: MarkerVariant
): L.Icon | L.DivIcon | undefined => {
  if (typeof window === 'undefined') return undefined;

  switch (variant) {
    case 'next-ride':
      // Highlighted marker for next-ride companies - larger, primary color with pulse
      return L.divIcon({
        className: 'next-ride-marker',
        html: `
          <div class="relative">
            <div class="absolute inset-0 bg-primary rounded-full animate-ping opacity-50"></div>
            <div class="relative bg-primary rounded-full w-6 h-6 border-2 border-white shadow-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

    case 'active-route':
      // Marker for companies on active route - secondary color
      return L.divIcon({
        className: 'active-route-marker',
        html: `
          <div class="relative bg-secondary rounded-full w-5 h-5 border-2 border-white shadow-lg"></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

    case 'default':
    default:
      // Default marker - use Leaflet's default
      return undefined;
  }
};

// Component to handle center updates - only when coordinates actually change
const MapCenterUpdater: React.FC<{ center: LatLngTuple }> = ({ center }) => {
  const map = useMap();
  const prevCoordsRef = React.useRef<LatLngTuple | null>(null);
  const lat = center[0];
  const lng = center[1];

  useEffect(() => {
    // Only re-center if coordinates actually changed
    // Not on every render (which would fight with user panning)
    const prev = prevCoordsRef.current;
    if (!prev || prev[0] !== lat || prev[1] !== lng) {
      map.setView(center);
      prevCoordsRef.current = center;
    }
  }, [map, center, lat, lng]);

  return null;
};

const MapEventHandler: React.FC<{
  onMapReady?: (map: LeafletMap) => void;
  showUserLocation?: boolean;
  onLocationFound?: (position: GeolocationPosition) => void;
  onLocationError?: (error: GeolocationPositionError) => void;
}> = ({ onMapReady, showUserLocation, onLocationFound, onLocationError }) => {
  const map = useMap();

  // Handle container resize - fixes zoom glitches and tile redraw issues
  useEffect(() => {
    let isMounted = true;
    const container = map.getContainer();
    if (!container) return;

    // Safe wrapper to prevent calling invalidateSize on destroyed container
    const safeInvalidateSize = () => {
      if (isMounted && map.getContainer()) {
        try {
          map.invalidateSize();
        } catch {
          // Container may have been destroyed during unmount
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      // Delay to ensure DOM has settled after resize
      setTimeout(safeInvalidateSize, 100);
    });

    resizeObserver.observe(container);

    // Also handle window resize as backup
    const handleWindowResize = () => {
      setTimeout(safeInvalidateSize, 100);
    };
    window.addEventListener('resize', handleWindowResize);

    // Initial invalidateSize after mount to ensure proper sizing
    setTimeout(safeInvalidateSize, 200);

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [map]);

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }

    if (showUserLocation && navigator.geolocation) {
      map.locate({ setView: true, maxZoom: 16 });
    }

    const handleLocationFound = (e: L.LocationEvent) => {
      if (onLocationFound) {
        const position: GeolocationPosition = {
          coords: {
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
            accuracy: e.accuracy,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({
              latitude: e.latlng.lat,
              longitude: e.latlng.lng,
              accuracy: e.accuracy,
            }),
          } as GeolocationCoordinates,
          timestamp: Date.now(),
          toJSON: () => ({
            coords: {
              latitude: e.latlng.lat,
              longitude: e.latlng.lng,
              accuracy: e.accuracy,
            },
            timestamp: Date.now(),
          }),
        };
        onLocationFound(position);
      }
    };

    const handleLocationError = (e: L.ErrorEvent) => {
      if (onLocationError) {
        let code = 0;
        const message = e.message;

        if (message.includes('denied')) {
          code = 1; // PERMISSION_DENIED
        } else if (message.includes('unavailable')) {
          code = 2; // POSITION_UNAVAILABLE
        } else if (message.includes('timeout')) {
          code = 3; // TIMEOUT
        }

        const error: GeolocationPositionError = {
          code,
          message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        };
        onLocationError(error);
      }
    };

    map.on('locationfound', handleLocationFound);
    map.on('locationerror', handleLocationError);

    return () => {
      map.off('locationfound', handleLocationFound);
      map.off('locationerror', handleLocationError);
    };
  }, [map, onMapReady, showUserLocation, onLocationFound, onLocationError]);

  return null;
};

const MapContainerInner: React.FC<MapContainerInnerProps> = ({
  center,
  zoom,
  showUserLocation = false,
  markers = [],
  onLocationFound,
  onLocationError,
  onMapReady,
  tileUrl = OSM_TILE_URL,
  attribution = OSM_ATTRIBUTION,
  scrollWheelZoom = DEFAULT_MAP_CONFIG.scrollWheelZoom,
  zoomControl = DEFAULT_MAP_CONFIG.zoomControl,
  keyboardNavigation = DEFAULT_MAP_CONFIG.keyboardNavigation,
  children,
}) => {
  return (
    <LeafletMapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={scrollWheelZoom}
      className="h-full w-full"
      zoomControl={zoomControl}
      keyboard={keyboardNavigation}
    >
      <TileLayer attribution={attribution} url={tileUrl} />

      <MapEventHandler
        onMapReady={onMapReady}
        showUserLocation={showUserLocation}
        onLocationFound={onLocationFound}
        onLocationError={onLocationError}
      />

      <MapCenterUpdater center={center} />

      {markers.map((marker) => {
        const icon = marker.variant
          ? createMarkerIcon(marker.variant)
          : undefined;
        return (
          <Marker key={marker.id} position={marker.position} icon={icon}>
            {marker.popup && <Popup>{marker.popup}</Popup>}
          </Marker>
        );
      })}

      {children}
    </LeafletMapContainer>
  );
};

export default MapContainerInner;

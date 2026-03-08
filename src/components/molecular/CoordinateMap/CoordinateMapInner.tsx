import React, { useEffect } from 'react';
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import type { LatLngTuple } from 'leaflet';
import L from 'leaflet';
import { OSM_TILE_URL, OSM_ATTRIBUTION } from '@/utils/map-utils';

interface CoordinateMapInnerProps {
  latitude: number;
  longitude: number;
  onCoordinateChange?: (lat: number, lng: number) => void;
  homeLocation?: { latitude: number; longitude: number };
  interactive?: boolean;
  zoom?: number;
  isLocked?: boolean;
}

// Custom blue marker for the main location
const blueIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom green marker for home location
const greenIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to handle resize and invalidate map size
const MapResizeHandler: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    // ResizeObserver to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    });

    resizeObserver.observe(container);

    // Window resize as backup
    const handleWindowResize = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };
    window.addEventListener('resize', handleWindowResize);

    // Initial invalidateSize after mount
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [map]);

  return null;
};

// Component to handle map center updates - only when coordinates actually change
const MapCenterUpdater: React.FC<{ lat: number; lng: number }> = ({
  lat,
  lng,
}) => {
  const map = useMap();
  const prevCoordsRef = React.useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Only re-center if coordinates actually changed (user clicked new location)
    // Not on every render (which would fight with user panning)
    const prev = prevCoordsRef.current;
    if (!prev || prev.lat !== lat || prev.lng !== lng) {
      map.setView([lat, lng]);
      prevCoordsRef.current = { lat, lng };
    }
  }, [map, lat, lng]);

  return null;
};

const CoordinateMapInner: React.FC<CoordinateMapInnerProps> = ({
  latitude,
  longitude,
  onCoordinateChange,
  homeLocation,
  interactive = true,
  zoom = 14,
  isLocked = true,
}) => {
  const center: LatLngTuple = [latitude, longitude];

  return (
    <LeafletMapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      wheelPxPerZoomLevel={120}
      wheelDebounceTime={100}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />

      <MapResizeHandler />
      <MapCenterUpdater lat={latitude} lng={longitude} />

      {/* Main marker at current coordinates - draggable when unlocked */}
      <Marker
        position={center}
        icon={blueIcon}
        draggable={interactive && !isLocked}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const position = marker.getLatLng();
            if (onCoordinateChange) {
              onCoordinateChange(position.lat, position.lng);
            }
          },
        }}
      >
        <Popup>
          <div className="text-sm">
            <strong>Selected Location</strong>
            <br />
            Lat: {latitude.toFixed(6)}
            <br />
            Lng: {longitude.toFixed(6)}
            {interactive && (
              <>
                <br />
                <em>
                  {isLocked ? 'Unlock to move marker' : 'Drag to reposition'}
                </em>
              </>
            )}
          </div>
        </Popup>
      </Marker>

      {/* Home location marker (if provided) */}
      {homeLocation && (
        <Marker
          position={[homeLocation.latitude, homeLocation.longitude]}
          icon={greenIcon}
        >
          <Popup>
            <div className="text-sm">
              <strong>Home Location</strong>
              <br />
              Lat: {homeLocation.latitude.toFixed(6)}
              <br />
              Lng: {homeLocation.longitude.toFixed(6)}
            </div>
          </Popup>
        </Marker>
      )}
    </LeafletMapContainer>
  );
};

export default CoordinateMapInner;

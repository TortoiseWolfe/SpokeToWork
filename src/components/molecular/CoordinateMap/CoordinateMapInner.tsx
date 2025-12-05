import React, { useEffect } from 'react';
import {
  MapContainer as LeafletMapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
  Circle,
} from 'react-leaflet';
import type { LatLngTuple, LeafletMouseEvent } from 'leaflet';
import L from 'leaflet';
import { OSM_TILE_URL, OSM_ATTRIBUTION } from '@/utils/map-utils';

interface CoordinateMapInnerProps {
  latitude: number;
  longitude: number;
  onCoordinateChange?: (lat: number, lng: number) => void;
  homeLocation?: { latitude: number; longitude: number };
  interactive?: boolean;
  zoom?: number;
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

// Component to handle map center updates
const MapCenterUpdater: React.FC<{ center: LatLngTuple }> = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [map, center]);

  return null;
};

// Component to handle map click events
const MapClickHandler: React.FC<{
  onCoordinateChange?: (lat: number, lng: number) => void;
  interactive?: boolean;
}> = ({ onCoordinateChange, interactive }) => {
  useMapEvents({
    click: (e: LeafletMouseEvent) => {
      if (interactive && onCoordinateChange) {
        onCoordinateChange(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
};

const CoordinateMapInner: React.FC<CoordinateMapInnerProps> = ({
  latitude,
  longitude,
  onCoordinateChange,
  homeLocation,
  interactive = true,
  zoom = 14,
}) => {
  const center: LatLngTuple = [latitude, longitude];

  return (
    <LeafletMapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={true}
      className="h-full w-full"
      zoomControl={true}
      style={{ cursor: interactive ? 'crosshair' : 'default' }}
    >
      <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_TILE_URL} />

      <MapCenterUpdater center={center} />
      <MapClickHandler
        onCoordinateChange={onCoordinateChange}
        interactive={interactive}
      />

      {/* Main marker at current coordinates */}
      <Marker position={center} icon={blueIcon}>
        <Popup>
          <div className="text-sm">
            <strong>Selected Location</strong>
            <br />
            Lat: {latitude.toFixed(6)}
            <br />
            Lng: {longitude.toFixed(6)}
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

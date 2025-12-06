'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Map as LeafletMap } from 'leaflet';
import { fixLeafletIconPaths } from '@/utils/map-utils';
import 'leaflet/dist/leaflet.css';

export interface CoordinateMapProps {
  /** Latitude of the marker */
  latitude: number;
  /** Longitude of the marker */
  longitude: number;
  /** Callback when coordinates are changed by clicking the map */
  onCoordinateChange?: (lat: number, lng: number) => void;
  /** Optional home location to show as secondary marker */
  homeLocation?: { latitude: number; longitude: number };
  /** Map height */
  height?: string;
  /** Map width */
  width?: string;
  /** Whether the marker can be moved by clicking */
  interactive?: boolean;
  /** Zoom level */
  zoom?: number;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

interface CoordinateMapInnerProps {
  latitude: number;
  longitude: number;
  onCoordinateChange?: (lat: number, lng: number) => void;
  homeLocation?: { latitude: number; longitude: number };
  interactive?: boolean;
  zoom?: number;
  onMapReady?: (map: LeafletMap) => void;
  isLocked?: boolean;
}

const CoordinateMapInner = dynamic<CoordinateMapInnerProps>(
  () => import('./CoordinateMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="bg-base-200 flex h-full w-full items-center justify-center">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    ),
  }
);

/**
 * CoordinateMap component for displaying and selecting coordinates
 *
 * Features:
 * - Displays a marker at the specified coordinates
 * - Click-to-update coordinates (when interactive)
 * - Optional home location marker
 * - OpenStreetMap tiles with attribution
 *
 * @category molecular
 */
export default function CoordinateMap({
  latitude,
  longitude,
  onCoordinateChange,
  homeLocation,
  height = '500px',
  width = '100%',
  interactive = true,
  zoom = 14,
  className = '',
  testId = 'coordinate-map',
}: CoordinateMapProps) {
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    fixLeafletIconPaths();
  }, []);

  return (
    <div
      data-testid={testId}
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={{ height, width }}
      role="application"
      aria-label={`Map showing coordinates ${latitude.toFixed(4)}, ${longitude.toFixed(4)}${interactive && !isLocked ? '. Drag marker to update location.' : ''}`}
    >
      {interactive && (
        <button
          type="button"
          className={`btn btn-sm absolute top-2 right-2 z-[1000] ${isLocked ? 'btn-outline' : 'btn-warning'}`}
          onClick={() => setIsLocked(!isLocked)}
        >
          {isLocked ? 'Unlock to Move' : 'Lock Position'}
        </button>
      )}
      <CoordinateMapInner
        latitude={latitude}
        longitude={longitude}
        onCoordinateChange={onCoordinateChange}
        homeLocation={homeLocation}
        interactive={interactive}
        zoom={zoom}
        isLocked={isLocked}
      />
    </div>
  );
}

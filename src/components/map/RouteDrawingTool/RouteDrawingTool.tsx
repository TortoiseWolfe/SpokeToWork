'use client';

/**
 * RouteDrawingTool - Feature 041: Bicycle Route Planning
 *
 * Interactive tool for drawing route paths by clicking waypoints on the map.
 * Supports live polyline preview, waypoint editing, undo, and distance calculation.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useMapEvents, Marker, Polyline } from 'react-leaflet';
import type { LatLngTuple, LeafletMouseEvent } from 'leaflet';
import L from 'leaflet';
import type { RouteGeometry } from '@/types/route';

export interface RouteDrawingToolProps {
  /** Whether drawing mode is active */
  isDrawing: boolean;
  /** Initial waypoints to load (for editing existing route) */
  initialWaypoints?: LatLngTuple[];
  /** Callback when waypoints change */
  onWaypointsChange?: (waypoints: LatLngTuple[]) => void;
  /** Callback when drawing is complete */
  onComplete?: (geometry: RouteGeometry, distanceMiles: number) => void;
  /** Color for the route line */
  lineColor?: string;
  /** Weight for the route line */
  lineWeight?: number;
  /** Custom waypoint icon */
  waypointIcon?: L.Icon;
}

/**
 * Calculate distance between two points in miles using Haversine formula
 */
function calculateDistance(point1: LatLngTuple, point2: LatLngTuple): number {
  const R = 3959; // Earth's radius in miles
  const lat1 = (point1[0] * Math.PI) / 180;
  const lat2 = (point2[0] * Math.PI) / 180;
  const deltaLat = ((point2[0] - point1[0]) * Math.PI) / 180;
  const deltaLng = ((point2[1] - point1[1]) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate total route distance from waypoints
 */
function calculateTotalDistance(waypoints: LatLngTuple[]): number {
  if (waypoints.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += calculateDistance(waypoints[i - 1], waypoints[i]);
  }
  return total;
}

/**
 * Convert waypoints to GeoJSON LineString geometry
 */
function waypointsToGeoJSON(waypoints: LatLngTuple[]): RouteGeometry {
  return {
    type: 'LineString',
    // GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
    coordinates: waypoints.map(([lat, lng]) => [lng, lat]),
  };
}

/**
 * Create default waypoint marker icon
 */
function createWaypointIcon(index: number, total: number): L.DivIcon {
  const isStart = index === 0;
  const isEnd = index === total - 1 && total > 1;

  let bgColor = '#3B82F6'; // Blue for middle points
  let label = `${index + 1}`;

  if (isStart) {
    bgColor = '#10B981'; // Green for start
    label = 'S';
  } else if (isEnd) {
    bgColor = '#EF4444'; // Red for end
    label = 'E';
  }

  return L.divIcon({
    className: 'custom-waypoint-icon',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background-color: ${bgColor};
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        cursor: ${index === 0 || index === total - 1 ? 'default' : 'grab'};
      ">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

/**
 * Map click handler component
 */
function MapClickHandler({
  onMapClick,
  isDrawing,
}: {
  onMapClick: (e: LeafletMouseEvent) => void;
  isDrawing: boolean;
}) {
  useMapEvents({
    click: (e) => {
      if (isDrawing) {
        onMapClick(e);
      }
    },
  });
  return null;
}

export default function RouteDrawingTool({
  isDrawing,
  initialWaypoints = [],
  onWaypointsChange,
  onComplete,
  lineColor = '#3B82F6',
  lineWeight = 4,
}: RouteDrawingToolProps) {
  const [waypoints, setWaypoints] = useState<LatLngTuple[]>(initialWaypoints);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Sync with initial waypoints when they change
  useEffect(() => {
    if (initialWaypoints.length > 0) {
      setWaypoints(initialWaypoints);
    }
  }, [initialWaypoints]);

  // Calculate total distance
  const totalDistance = useMemo(
    () => calculateTotalDistance(waypoints),
    [waypoints]
  );

  // Notify parent of waypoint changes
  useEffect(() => {
    onWaypointsChange?.(waypoints);
  }, [waypoints, onWaypointsChange]);

  // Handle map click to add waypoint
  const handleMapClick = useCallback(
    (e: LeafletMouseEvent) => {
      if (!isDrawing) return;

      const newPoint: LatLngTuple = [e.latlng.lat, e.latlng.lng];
      setWaypoints((prev) => [...prev, newPoint]);
    },
    [isDrawing]
  );

  // Handle waypoint drag
  const handleWaypointDrag = useCallback(
    (index: number, newPosition: LatLngTuple) => {
      setWaypoints((prev) => {
        const updated = [...prev];
        updated[index] = newPosition;
        return updated;
      });
    },
    []
  );

  // Handle waypoint click to remove (except start/end in completed routes)
  const handleWaypointClick = useCallback(
    (index: number) => {
      if (!isDrawing) return;
      if (waypoints.length <= 2) return; // Keep at least 2 points

      setWaypoints((prev) => prev.filter((_, i) => i !== index));
    },
    [isDrawing, waypoints.length]
  );

  // Undo last waypoint
  const undoLastWaypoint = useCallback(() => {
    if (waypoints.length === 0) return;
    setWaypoints((prev) => prev.slice(0, -1));
  }, [waypoints.length]);

  // Clear all waypoints
  const clearWaypoints = useCallback(() => {
    setWaypoints([]);
  }, []);

  // Complete drawing and generate geometry
  const completeDrawing = useCallback(() => {
    if (waypoints.length < 2) return;

    const geometry = waypointsToGeoJSON(waypoints);
    onComplete?.(geometry, totalDistance);
  }, [waypoints, totalDistance, onComplete]);

  // Don't render anything if not drawing and no waypoints
  if (!isDrawing && waypoints.length === 0) {
    return null;
  }

  return (
    <>
      {/* Map click handler */}
      <MapClickHandler onMapClick={handleMapClick} isDrawing={isDrawing} />

      {/* Polyline connecting waypoints */}
      {waypoints.length >= 2 && (
        <Polyline
          positions={waypoints}
          pathOptions={{
            color: lineColor,
            weight: lineWeight,
            opacity: 0.8,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
      )}

      {/* Waypoint markers */}
      {waypoints.map((position, index) => (
        <Marker
          key={`waypoint-${index}`}
          position={position}
          icon={createWaypointIcon(index, waypoints.length)}
          draggable={isDrawing && index !== 0 && index !== waypoints.length - 1}
          eventHandlers={{
            click: () => handleWaypointClick(index),
            dragstart: () => setDraggedIndex(index),
            drag: (e) => {
              const marker = e.target as L.Marker;
              const newPos = marker.getLatLng();
              handleWaypointDrag(index, [newPos.lat, newPos.lng]);
            },
            dragend: () => setDraggedIndex(null),
          }}
        />
      ))}

      {/* Drawing controls (rendered outside map via portal or separate component) */}
      {isDrawing && (
        <DrawingControls
          waypointCount={waypoints.length}
          totalDistance={totalDistance}
          onUndo={undoLastWaypoint}
          onClear={clearWaypoints}
          onComplete={completeDrawing}
          canComplete={waypoints.length >= 2}
        />
      )}
    </>
  );
}

/**
 * Drawing controls panel
 */
interface DrawingControlsProps {
  waypointCount: number;
  totalDistance: number;
  onUndo: () => void;
  onClear: () => void;
  onComplete: () => void;
  canComplete: boolean;
}

function DrawingControls({
  waypointCount,
  totalDistance,
  onUndo,
  onClear,
  onComplete,
  canComplete,
}: DrawingControlsProps) {
  return (
    <div
      className="bg-base-100 absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-lg p-3 shadow-lg"
      role="toolbar"
      aria-label="Route drawing controls"
    >
      {/* Stats */}
      <div className="flex flex-col text-sm" aria-live="polite">
        <span>
          <strong>{waypointCount}</strong> points
        </span>
        <span>
          <strong>{totalDistance.toFixed(2)}</strong> mi
        </span>
      </div>

      <div className="divider divider-horizontal mx-0" />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={onUndo}
          disabled={waypointCount === 0}
          aria-label="Undo last point"
        >
          Undo
        </button>
        <button
          type="button"
          className="btn btn-sm btn-ghost text-error"
          onClick={onClear}
          disabled={waypointCount === 0}
          aria-label="Clear all points"
        >
          Clear
        </button>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={onComplete}
          disabled={!canComplete}
          aria-label="Save route path"
        >
          Done
        </button>
      </div>
    </div>
  );
}

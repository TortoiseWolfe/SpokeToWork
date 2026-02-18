'use client';

/**
 * RouteStartEndEditor - Feature 046: Route Optimization
 *
 * Allows users to configure start/end points for a route with:
 * - Home/Custom toggle for each endpoint
 * - Address input when Custom is selected
 * - Round-trip toggle to sync end with start
 *
 * @category molecular
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRovingTabIndex } from '@/hooks/useRovingTabIndex';

export type LocationType = 'home' | 'custom';

export interface LocationPoint {
  type: LocationType;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface HomeLocation {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface RouteStartEndEditorProps {
  /** Initial start point configuration */
  startPoint?: LocationPoint;
  /** Initial end point configuration */
  endPoint?: LocationPoint;
  /** User's home location (from profile) */
  homeLocation?: HomeLocation | null;
  /** Whether route is round-trip (end syncs with start) */
  isRoundTrip?: boolean;
  /** Callback when start point changes */
  onStartChange?: (point: LocationPoint) => void;
  /** Callback when end point changes */
  onEndChange?: (point: LocationPoint) => void;
  /** Callback when round-trip mode changes */
  onRoundTripChange?: (isRoundTrip: boolean) => void;
  /** Disable editing */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const defaultPoint: LocationPoint = {
  type: 'home',
  address: null,
  latitude: null,
  longitude: null,
};

/**
 * RouteStartEndEditor component
 *
 * Provides UI for configuring route start/end points with home/custom toggle.
 */
export default function RouteStartEndEditor({
  startPoint = defaultPoint,
  endPoint = defaultPoint,
  homeLocation,
  isRoundTrip = true,
  onStartChange,
  onEndChange,
  onRoundTripChange,
  disabled = false,
  className = '',
}: RouteStartEndEditorProps) {
  const [start, setStart] = useState<LocationPoint>(startPoint);
  const [end, setEnd] = useState<LocationPoint>(endPoint);
  const [roundTrip, setRoundTrip] = useState(isRoundTrip);

  useEffect(() => {
    setStart(startPoint);
    setEnd(endPoint);
    setRoundTrip(isRoundTrip);
  }, [startPoint, endPoint, isRoundTrip]);

  const hasHomeLocation = !!(homeLocation?.latitude && homeLocation?.longitude);

  const startDisabledIndices = useMemo(
    () => (!hasHomeLocation ? [0] : []),
    [hasHomeLocation]
  );
  const endDisabledIndices = useMemo(
    () => (!hasHomeLocation ? [0] : []),
    [hasHomeLocation]
  );

  const startTypeRef = useRef<((type: LocationType) => void) | undefined>(
    undefined
  );
  const endTypeRef = useRef<((type: LocationType) => void) | undefined>(
    undefined
  );

  const { getItemProps: getStartTypeProps } = useRovingTabIndex({
    itemCount: 2,
    initialIndex: start.type === 'home' ? 0 : 1,
    disabledIndices: startDisabledIndices,
    onActiveIndexChange: (index) => {
      startTypeRef.current?.(index === 0 ? 'home' : 'custom');
    },
  });

  const { getItemProps: getEndTypeProps } = useRovingTabIndex({
    itemCount: 2,
    initialIndex: end.type === 'home' ? 0 : 1,
    disabledIndices: endDisabledIndices,
    onActiveIndexChange: (index) => {
      endTypeRef.current?.(index === 0 ? 'home' : 'custom');
    },
  });

  const getEffectiveLocation = useCallback(
    (point: LocationPoint): LocationPoint => {
      if (point.type === 'home' && hasHomeLocation) {
        return {
          type: 'home',
          address: homeLocation!.address,
          latitude: homeLocation!.latitude,
          longitude: homeLocation!.longitude,
        };
      }
      return point;
    },
    [homeLocation, hasHomeLocation]
  );

  const handleStartTypeChange = (type: LocationType) => {
    const newStart: LocationPoint =
      type === 'home'
        ? {
            type: 'home',
            address: homeLocation?.address ?? null,
            latitude: homeLocation?.latitude ?? null,
            longitude: homeLocation?.longitude ?? null,
          }
        : {
            type: 'custom',
            address: start.type === 'custom' ? start.address : '',
            latitude: start.type === 'custom' ? start.latitude : null,
            longitude: start.type === 'custom' ? start.longitude : null,
          };

    setStart(newStart);
    onStartChange?.(newStart);

    if (roundTrip) {
      setEnd(newStart);
      onEndChange?.(newStart);
    }
  };

  const handleEndTypeChange = (type: LocationType) => {
    const newEnd: LocationPoint =
      type === 'home'
        ? {
            type: 'home',
            address: homeLocation?.address ?? null,
            latitude: homeLocation?.latitude ?? null,
            longitude: homeLocation?.longitude ?? null,
          }
        : {
            type: 'custom',
            address: end.type === 'custom' ? end.address : '',
            latitude: end.type === 'custom' ? end.latitude : null,
            longitude: end.type === 'custom' ? end.longitude : null,
          };

    setEnd(newEnd);
    onEndChange?.(newEnd);
  };

  // Assign refs for roving tabindex callbacks (hooks defined above handlers)
  startTypeRef.current = handleStartTypeChange;
  endTypeRef.current = handleEndTypeChange;

  const handleStartAddressChange = (address: string) => {
    const newStart: LocationPoint = { ...start, address };
    setStart(newStart);
    onStartChange?.(newStart);
    if (roundTrip) {
      setEnd(newStart);
      onEndChange?.(newStart);
    }
  };

  const handleStartCoordsChange = (lat: string, lng: string) => {
    const newStart: LocationPoint = {
      ...start,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
    };
    setStart(newStart);
    onStartChange?.(newStart);
    if (roundTrip) {
      setEnd(newStart);
      onEndChange?.(newStart);
    }
  };

  const handleEndAddressChange = (address: string) => {
    const newEnd: LocationPoint = { ...end, address };
    setEnd(newEnd);
    onEndChange?.(newEnd);
  };

  const handleEndCoordsChange = (lat: string, lng: string) => {
    const newEnd: LocationPoint = {
      ...end,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null,
    };
    setEnd(newEnd);
    onEndChange?.(newEnd);
  };

  const handleRoundTripToggle = () => {
    const newRoundTrip = !roundTrip;
    setRoundTrip(newRoundTrip);
    onRoundTripChange?.(newRoundTrip);
    if (newRoundTrip) {
      setEnd(start);
      onEndChange?.(start);
    }
  };

  const effectiveStart = getEffectiveLocation(start);
  const effectiveEnd = getEffectiveLocation(end);

  return (
    <div
      className={`route-start-end-editor space-y-4${className ? ` ${className}` : ''}`}
    >
      {/* Round Trip Toggle */}
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input
            type="checkbox"
            checked={roundTrip}
            onChange={handleRoundTripToggle}
            className="checkbox checkbox-primary checkbox-sm"
            disabled={disabled}
            aria-label="Round trip route"
          />
          <span className="label-text">Round Trip (end at start location)</span>
        </label>
      </div>

      {/* No Home Location Warning */}
      {!hasHomeLocation && (
        <div className="alert alert-warning text-sm" role="alert">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>
            No home address set.{' '}
            <a href="/settings" className="link link-primary">
              Set in settings
            </a>
          </span>
        </div>
      )}

      {/* Start Point */}
      <fieldset
        className="border-base-300 rounded-lg border p-3"
        disabled={disabled}
      >
        <legend className="flex items-center gap-2 px-2 text-sm font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="text-success h-4 w-4"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="8" />
          </svg>
          Start Point
        </legend>

        <div
          className="btn-group mb-3 w-full"
          role="radiogroup"
          aria-label="Start point type"
        >
          <button
            type="button"
            className={`btn btn-sm flex-1 ${start.type === 'home' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleStartTypeChange('home')}
            disabled={disabled || !hasHomeLocation}
            role="radio"
            aria-checked={start.type === 'home'}
            {...getStartTypeProps(0)}
          >
            Home
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-1 ${start.type === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => handleStartTypeChange('custom')}
            disabled={disabled}
            role="radio"
            aria-checked={start.type === 'custom'}
            {...getStartTypeProps(1)}
          >
            Custom
          </button>
        </div>

        {start.type === 'home' && hasHomeLocation ? (
          <div className="bg-base-200 rounded p-2 text-sm">
            <div className="font-medium">{homeLocation!.address || 'Home'}</div>
            <div className="text-base-content/80 text-xs">
              {homeLocation!.latitude?.toFixed(4)},{' '}
              {homeLocation!.longitude?.toFixed(4)}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={start.address ?? ''}
              onChange={(e) => handleStartAddressChange(e.target.value)}
              placeholder="Address"
              className="input input-bordered input-sm w-full"
              disabled={disabled}
              aria-label="Start address"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={start.latitude ?? ''}
                onChange={(e) =>
                  handleStartCoordsChange(
                    e.target.value,
                    start.longitude?.toString() ?? ''
                  )
                }
                placeholder="Latitude"
                className="input input-bordered input-sm"
                disabled={disabled}
                step="any"
                aria-label="Start latitude"
              />
              <input
                type="number"
                value={start.longitude ?? ''}
                onChange={(e) =>
                  handleStartCoordsChange(
                    start.latitude?.toString() ?? '',
                    e.target.value
                  )
                }
                placeholder="Longitude"
                className="input input-bordered input-sm"
                disabled={disabled}
                step="any"
                aria-label="Start longitude"
              />
            </div>
          </div>
        )}
      </fieldset>

      {/* End Point (hidden if round trip) */}
      {!roundTrip && (
        <fieldset
          className="border-base-300 rounded-lg border p-3"
          disabled={disabled}
        >
          <legend className="flex items-center gap-2 px-2 text-sm font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="text-error h-4 w-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="8" />
            </svg>
            End Point
          </legend>

          <div
            className="btn-group mb-3 w-full"
            role="radiogroup"
            aria-label="End point type"
          >
            <button
              type="button"
              className={`btn btn-sm flex-1 ${end.type === 'home' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => handleEndTypeChange('home')}
              disabled={disabled || !hasHomeLocation}
              role="radio"
              aria-checked={end.type === 'home'}
              {...getEndTypeProps(0)}
            >
              Home
            </button>
            <button
              type="button"
              className={`btn btn-sm flex-1 ${end.type === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => handleEndTypeChange('custom')}
              disabled={disabled}
              role="radio"
              aria-checked={end.type === 'custom'}
              {...getEndTypeProps(1)}
            >
              Custom
            </button>
          </div>

          {end.type === 'home' && hasHomeLocation ? (
            <div className="bg-base-200 rounded p-2 text-sm">
              <div className="font-medium">
                {homeLocation!.address || 'Home'}
              </div>
              <div className="text-base-content/80 text-xs">
                {homeLocation!.latitude?.toFixed(4)},{' '}
                {homeLocation!.longitude?.toFixed(4)}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={end.address ?? ''}
                onChange={(e) => handleEndAddressChange(e.target.value)}
                placeholder="Address"
                className="input input-bordered input-sm w-full"
                disabled={disabled}
                aria-label="End address"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={end.latitude ?? ''}
                  onChange={(e) =>
                    handleEndCoordsChange(
                      e.target.value,
                      end.longitude?.toString() ?? ''
                    )
                  }
                  placeholder="Latitude"
                  className="input input-bordered input-sm"
                  disabled={disabled}
                  step="any"
                  aria-label="End latitude"
                />
                <input
                  type="number"
                  value={end.longitude ?? ''}
                  onChange={(e) =>
                    handleEndCoordsChange(
                      end.latitude?.toString() ?? '',
                      e.target.value
                    )
                  }
                  placeholder="Longitude"
                  className="input input-bordered input-sm"
                  disabled={disabled}
                  step="any"
                  aria-label="End longitude"
                />
              </div>
            </div>
          )}
        </fieldset>
      )}

      {/* Summary */}
      <div className="bg-base-200 rounded-lg p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-base-content/85">Route Type:</span>
          <span className="font-medium">
            {roundTrip ? 'Round Trip' : 'One-Way'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-base-content/85">Start:</span>
          <span className="font-medium">
            {effectiveStart.address ||
              (effectiveStart.latitude && effectiveStart.longitude
                ? `${effectiveStart.latitude.toFixed(4)}, ${effectiveStart.longitude.toFixed(4)}`
                : 'Not set')}
          </span>
        </div>
        {!roundTrip && (
          <div className="flex items-center justify-between">
            <span className="text-base-content/85">End:</span>
            <span className="font-medium">
              {effectiveEnd.address ||
                (effectiveEnd.latitude && effectiveEnd.longitude
                  ? `${effectiveEnd.latitude.toFixed(4)}, ${effectiveEnd.longitude.toFixed(4)}`
                  : 'Not set')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

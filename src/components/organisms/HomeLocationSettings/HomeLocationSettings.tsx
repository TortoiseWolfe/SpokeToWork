'use client';

import React, { useState, useCallback, useEffect } from 'react';
import CoordinateMap from '@/components/molecular/CoordinateMap';
import { geocode } from '@/lib/companies/geocoding';
import type { HomeLocation } from '@/types/company';

export interface HomeLocationSettingsProps {
  /** Initial home location (if already set) */
  initialLocation?: HomeLocation | null;
  /** Callback when location is saved */
  onSave?: (location: HomeLocation) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * HomeLocationSettings component
 *
 * Allows users to configure their home location for distance calculations.
 * Features:
 * - Address input with geocoding
 * - Map preview showing location
 * - Distance radius slider (1-100 miles)
 * - Save button to persist settings
 *
 * @category organisms
 */
export default function HomeLocationSettings({
  initialLocation,
  onSave,
  className = '',
  testId = 'home-location-settings',
}: HomeLocationSettingsProps) {
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [latitude, setLatitude] = useState(
    initialLocation?.latitude || 40.7128
  );
  const [longitude, setLongitude] = useState(
    initialLocation?.longitude || -74.006
  );
  const [radiusMiles, setRadiusMiles] = useState(
    initialLocation?.radius_miles || 20
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasCoordinates, setHasCoordinates] = useState(!!initialLocation);

  // Update state when initialLocation changes
  useEffect(() => {
    if (initialLocation) {
      setAddress(initialLocation.address);
      setLatitude(initialLocation.latitude);
      setLongitude(initialLocation.longitude);
      setRadiusMiles(initialLocation.radius_miles ?? 20);
      setHasCoordinates(true);
    }
  }, [initialLocation]);

  const handleGeocode = useCallback(async () => {
    if (!address.trim()) {
      setGeocodeError('Please enter an address');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const result = await geocode(address);
      if (
        !result.success ||
        result.latitude === undefined ||
        result.longitude === undefined
      ) {
        setGeocodeError(result.error || 'Failed to geocode address');
        return;
      }
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      setHasCoordinates(true);
      setGeocodeError(null);
    } catch (error) {
      setGeocodeError(
        error instanceof Error ? error.message : 'Failed to geocode address'
      );
    } finally {
      setIsGeocoding(false);
    }
  }, [address]);

  const handleCoordinateChange = useCallback((lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setHasCoordinates(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasCoordinates) {
      setSaveError('Please geocode an address or click on the map first');
      return;
    }

    if (!address.trim()) {
      setSaveError('Please enter an address');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const location: HomeLocation = {
        address: address.trim(),
        latitude,
        longitude,
        radius_miles: radiusMiles,
      };

      if (onSave) {
        await onSave(location);
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Failed to save location'
      );
    } finally {
      setIsSaving(false);
    }
  }, [address, latitude, longitude, radiusMiles, hasCoordinates, onSave]);

  return (
    <div
      data-testid={testId}
      className={`card bg-base-100 shadow-xl ${className}`}
    >
      <div className="card-body">
        <h2 className="card-title">Home Location Settings</h2>
        <p className="text-base-content/85 text-sm">
          Set your home location to calculate distances to companies. Companies
          outside your radius will be flagged as &quot;extended range&quot;.
        </p>

        <div className="form-control mt-4">
          <label className="label" htmlFor="home-address">
            <span className="label-text">Home Address</span>
          </label>
          <div className="flex gap-2">
            <input
              id="home-address"
              type="text"
              placeholder="Enter your home address"
              className="input input-bordered flex-1"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => address.trim() && handleGeocode()}
              aria-describedby={geocodeError ? 'geocode-error' : undefined}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGeocode}
              disabled={isGeocoding || !address.trim()}
            >
              {isGeocoding ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                'Geocode'
              )}
            </button>
          </div>
          {geocodeError && (
            <label className="label" id="geocode-error">
              <span className="label-text-alt text-error">{geocodeError}</span>
            </label>
          )}
        </div>

        <div className="form-control mt-4">
          <label className="label">
            <span className="label-text">Location Preview</span>
            <span className="label-text-alt">Click map to adjust</span>
          </label>
          <CoordinateMap
            latitude={latitude}
            longitude={longitude}
            onCoordinateChange={handleCoordinateChange}
            height="450px"
            interactive={true}
            testId="home-location-map"
          />
          {hasCoordinates && (
            <label className="label">
              <span className="label-text-alt">
                Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </span>
            </label>
          )}
        </div>

        <div className="form-control mt-4">
          <label className="label" htmlFor="radius-slider">
            <span className="label-text">Distance Radius</span>
            <span className="label-text-alt">{radiusMiles} miles</span>
          </label>
          <input
            id="radius-slider"
            type="range"
            min="1"
            max="100"
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(Number(e.target.value))}
            className="range range-primary"
            aria-valuemin={1}
            aria-valuemax={100}
            aria-valuenow={radiusMiles}
            aria-valuetext={`${radiusMiles} miles`}
          />
          <div className="flex w-full justify-between px-2 text-xs">
            <span>1 mi</span>
            <span>25 mi</span>
            <span>50 mi</span>
            <span>75 mi</span>
            <span>100 mi</span>
          </div>
        </div>

        {saveError && (
          <div className="alert alert-error mt-4">
            <span>{saveError}</span>
          </div>
        )}

        <div className="card-actions mt-6 justify-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || !hasCoordinates}
          >
            {isSaving ? (
              <>
                <span className="loading loading-spinner loading-sm"></span>
                Saving...
              </>
            ) : (
              'Save Home Location'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

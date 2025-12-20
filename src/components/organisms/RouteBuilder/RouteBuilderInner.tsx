'use client';

/**
 * RouteBuilderInner - Feature 041: Bicycle Route Planning
 *
 * Internal component with heavy dependencies (useRoutes, useUserProfile).
 * Loaded dynamically by RouteBuilder wrapper to prevent OOM during Vite transformation.
 *
 * @see RouteBuilder.tsx - Lightweight wrapper
 * @see docs/specs/051-ci-test-memory/spec.md - OOM investigation
 */

import { useState, useEffect, useCallback } from 'react';
import { useRoutes } from '@/hooks/useRoutes';
import { useUserProfile } from '@/hooks/useUserProfile';
import RouteStartEndEditor, {
  type LocationPoint,
} from '@/components/molecular/RouteStartEndEditor';
import type {
  BicycleRoute,
  BicycleRouteCreate,
  BicycleRouteUpdate,
} from '@/types/route';
import { ROUTE_COLORS, ROUTE_LIMITS } from '@/types/route';

export interface RouteBuilderProps {
  /** Route to edit (null for create mode) */
  route?: BicycleRoute | null;
  /** Callback when route is saved */
  onSave?: (route: BicycleRoute) => void;
  /** Callback when builder is closed */
  onClose?: () => void;
  /** Whether the builder is open */
  isOpen?: boolean;
}

interface FormState {
  name: string;
  description: string;
  color: string;
  startType: 'home' | 'custom';
  startAddress: string;
  startLatitude: number | null;
  startLongitude: number | null;
  endType: 'home' | 'custom';
  endAddress: string;
  endLatitude: number | null;
  endLongitude: number | null;
  isRoundTrip: boolean;
}

interface FormErrors {
  name?: string;
  startLatitude?: string;
  endLatitude?: string;
}

export default function RouteBuilderInner({
  route,
  onSave,
  onClose,
  isOpen = true,
}: RouteBuilderProps) {
  const { createRoute, updateRoute, deleteRoute } = useRoutes();
  const { profile, loading: profileLoading } = useUserProfile();

  const isEditMode = !!route;

  // Check if user has home location
  const hasHomeLocation = !!(profile?.home_latitude && profile?.home_longitude);

  // Home location object for RouteStartEndEditor
  const homeLocation = hasHomeLocation
    ? {
        address: profile!.home_address,
        latitude: profile!.home_latitude,
        longitude: profile!.home_longitude,
      }
    : null;

  // Form state
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    color: ROUTE_COLORS[0],
    startType: 'home',
    startAddress: '',
    startLatitude: null,
    startLongitude: null,
    endType: 'home',
    endAddress: '',
    endLatitude: null,
    endLongitude: null,
    isRoundTrip: true,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form with route data or home location defaults
  useEffect(() => {
    if (route) {
      // Edit mode - load route data
      setForm({
        name: route.name,
        description: route.description ?? '',
        color: route.color,
        startType: route.start_type ?? 'home',
        startAddress: route.start_address ?? '',
        startLatitude: route.start_latitude,
        startLongitude: route.start_longitude,
        endType: route.end_type ?? 'home',
        endAddress: route.end_address ?? '',
        endLatitude: route.end_latitude,
        endLongitude: route.end_longitude,
        isRoundTrip: route.is_round_trip ?? true,
      });
    } else if (profile && hasHomeLocation) {
      // Create mode with home location defaults (T018)
      setForm((prev) => ({
        ...prev,
        startType: 'home',
        startAddress: profile.home_address ?? '',
        startLatitude: profile.home_latitude,
        startLongitude: profile.home_longitude,
        endType: 'home',
        endAddress: profile.home_address ?? '',
        endLatitude: profile.home_latitude,
        endLongitude: profile.home_longitude,
        isRoundTrip: true,
      }));
    }
  }, [route, profile, hasHomeLocation, profileLoading]);

  // Validate form
  const validate = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!form.name.trim()) {
      newErrors.name = 'Route name is required';
    } else if (form.name.length > ROUTE_LIMITS.NAME_MAX_LENGTH) {
      newErrors.name = `Name must be ${ROUTE_LIMITS.NAME_MAX_LENGTH} characters or less`;
    }

    // Start location validation
    if (form.startLatitude === null || form.startLongitude === null) {
      newErrors.startLatitude = 'Start location is required';
    }

    // End location validation (only if not round trip)
    if (!form.isRoundTrip) {
      if (form.endLatitude === null || form.endLongitude === null) {
        newErrors.endLatitude = 'End location is required';
      }
    }

    return newErrors;
  }, [form]);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle color selection
  const handleColorChange = (color: string) => {
    setForm((prev) => ({ ...prev, color }));
  };

  // Handle start point change from RouteStartEndEditor
  const handleStartChange = (point: LocationPoint) => {
    setForm((prev) => ({
      ...prev,
      startType: point.type,
      startAddress: point.address ?? '',
      startLatitude: point.latitude,
      startLongitude: point.longitude,
    }));
    setErrors((prev) => ({ ...prev, startLatitude: undefined }));
  };

  // Handle end point change from RouteStartEndEditor
  const handleEndChange = (point: LocationPoint) => {
    setForm((prev) => ({
      ...prev,
      endType: point.type,
      endAddress: point.address ?? '',
      endLatitude: point.latitude,
      endLongitude: point.longitude,
    }));
    setErrors((prev) => ({ ...prev, endLatitude: undefined }));
  };

  // Handle round trip toggle
  const handleRoundTripChange = (isRoundTrip: boolean) => {
    setForm((prev) => {
      if (isRoundTrip) {
        // Sync end with start
        return {
          ...prev,
          isRoundTrip,
          endType: prev.startType,
          endAddress: prev.startAddress,
          endLatitude: prev.startLatitude,
          endLongitude: prev.startLongitude,
        };
      }
      return { ...prev, isRoundTrip };
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    // For round trip, use start as end
    const endLat = form.isRoundTrip ? form.startLatitude : form.endLatitude;
    const endLng = form.isRoundTrip ? form.startLongitude : form.endLongitude;
    const endAddr = form.isRoundTrip ? form.startAddress : form.endAddress;
    const endType = form.isRoundTrip ? form.startType : form.endType;

    try {
      if (isEditMode && route) {
        // Update existing route
        const updateData: BicycleRouteUpdate = {
          id: route.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          color: form.color,
          start_address: form.startAddress.trim() || null,
          start_latitude: form.startLatitude!,
          start_longitude: form.startLongitude!,
          end_address: endAddr.trim() || null,
          end_latitude: endLat!,
          end_longitude: endLng!,
          start_type: form.startType,
          end_type: endType,
          is_round_trip: form.isRoundTrip,
        };

        const updated = await updateRoute(updateData);
        onSave?.(updated);
      } else {
        // Create new route
        const createData: BicycleRouteCreate = {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          color: form.color,
          start_address: form.startAddress.trim() || undefined,
          start_latitude: form.startLatitude!,
          start_longitude: form.startLongitude!,
          end_address: endAddr.trim() || undefined,
          end_latitude: endLat!,
          end_longitude: endLng!,
          start_type: form.startType,
          end_type: endType,
          is_round_trip: form.isRoundTrip,
        };

        const created = await createRoute(createData);
        onSave?.(created);
      }

      onClose?.();
    } catch (err) {
      console.error('Failed to save route:', err);
      setErrors({
        name: err instanceof Error ? err.message : 'Failed to save route',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!route) return;

    setIsSubmitting(true);
    try {
      await deleteRoute(route.id);
      onClose?.();
    } catch (err) {
      console.error('Failed to delete route:', err);
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!isOpen) return null;

  // Build start/end point objects for RouteStartEndEditor
  const startPoint: LocationPoint = {
    type: form.startType,
    address: form.startAddress || null,
    latitude: form.startLatitude,
    longitude: form.startLongitude,
  };

  const endPoint: LocationPoint = {
    type: form.endType,
    address: form.endAddress || null,
    latitude: form.endLatitude,
    longitude: form.endLongitude,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-builder-title"
    >
      <div className="bg-base-100 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg shadow-xl">
        {/* Header */}
        <div className="border-base-300 flex items-center justify-between border-b p-4">
          <h2 id="route-builder-title" className="text-xl font-semibold">
            {isEditMode ? 'Edit Route' : 'Create Route'}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          {/* Route Name */}
          <div className="form-control">
            <label htmlFor="name" className="label">
              <span className="label-text">Route Name *</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g., Morning Loop"
              className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
              maxLength={ROUTE_LIMITS.NAME_MAX_LENGTH}
              aria-describedby={errors.name ? 'name-error' : undefined}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <label id="name-error" className="label">
                <span className="label-text-alt text-error">{errors.name}</span>
              </label>
            )}
          </div>

          {/* Description */}
          <div className="form-control">
            <label htmlFor="description" className="label">
              <span className="label-text">Description</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Optional description..."
              className="textarea textarea-bordered w-full"
              maxLength={ROUTE_LIMITS.DESCRIPTION_MAX_LENGTH}
              rows={2}
            />
          </div>

          {/* Color Picker */}
          <div className="form-control">
            <label className="label">
              <span className="label-text">Route Color</span>
            </label>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Select route color"
            >
              {ROUTE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorChange(color)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    form.color === color
                      ? 'border-base-content scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  role="radio"
                  aria-checked={form.color === color}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Start/End Point Editor (Feature 046) */}
          <RouteStartEndEditor
            startPoint={startPoint}
            endPoint={endPoint}
            homeLocation={homeLocation}
            isRoundTrip={form.isRoundTrip}
            onStartChange={handleStartChange}
            onEndChange={handleEndChange}
            onRoundTripChange={handleRoundTripChange}
            disabled={isSubmitting}
          />

          {/* Location validation errors */}
          {(errors.startLatitude || errors.endLatitude) && (
            <div className="alert alert-error text-sm">
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
              <span>{errors.startLatitude || errors.endLatitude}</span>
            </div>
          )}

          {/* Actions */}
          <div className="border-base-300 flex items-center justify-between border-t pt-4">
            {isEditMode ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-error btn-outline btn-sm"
                disabled={isSubmitting}
              >
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : isEditMode ? (
                  'Save Changes'
                ) : (
                  'Create Route'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
            <div
              className="bg-base-100 max-w-sm rounded-lg p-6"
              role="alertdialog"
              aria-labelledby="delete-title"
            >
              <h3 id="delete-title" className="text-lg font-bold">
                Delete Route?
              </h3>
              <p className="py-4">
                Are you sure you want to delete &ldquo;{route?.name}&rdquo;?
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="btn btn-error"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  startAddress: string;
  startLatitude: string;
  startLongitude: string;
  endAddress: string;
  endLatitude: string;
  endLongitude: string;
}

interface FormErrors {
  name?: string;
  startLatitude?: string;
  startLongitude?: string;
  endLatitude?: string;
  endLongitude?: string;
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

  // Form state
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    color: ROUTE_COLORS[0],
    startAddress: '',
    startLatitude: '',
    startLongitude: '',
    endAddress: '',
    endLatitude: '',
    endLongitude: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHomePrompt, setShowHomePrompt] = useState(false);

  // Initialize form with route data or home location defaults
  useEffect(() => {
    if (route) {
      // Edit mode - load route data
      setForm({
        name: route.name,
        description: route.description ?? '',
        color: route.color,
        startAddress: route.start_address ?? '',
        startLatitude: route.start_latitude?.toString() ?? '',
        startLongitude: route.start_longitude?.toString() ?? '',
        endAddress: route.end_address ?? '',
        endLatitude: route.end_latitude?.toString() ?? '',
        endLongitude: route.end_longitude?.toString() ?? '',
      });
    } else if (profile && hasHomeLocation) {
      // Create mode with home location defaults
      setForm((prev) => ({
        ...prev,
        startAddress: profile.home_address ?? '',
        startLatitude: profile.home_latitude?.toString() ?? '',
        startLongitude: profile.home_longitude?.toString() ?? '',
        endAddress: profile.home_address ?? '',
        endLatitude: profile.home_latitude?.toString() ?? '',
        endLongitude: profile.home_longitude?.toString() ?? '',
      }));
    } else if (!profileLoading && !hasHomeLocation) {
      // No home location - show prompt
      setShowHomePrompt(true);
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

    // Coordinate validation
    const lat = parseFloat(form.startLatitude);
    const lng = parseFloat(form.startLongitude);
    const endLat = parseFloat(form.endLatitude);
    const endLng = parseFloat(form.endLongitude);

    if (form.startLatitude && (isNaN(lat) || lat < -90 || lat > 90)) {
      newErrors.startLatitude = 'Invalid latitude (-90 to 90)';
    }
    if (form.startLongitude && (isNaN(lng) || lng < -180 || lng > 180)) {
      newErrors.startLongitude = 'Invalid longitude (-180 to 180)';
    }
    if (form.endLatitude && (isNaN(endLat) || endLat < -90 || endLat > 90)) {
      newErrors.endLatitude = 'Invalid latitude (-90 to 90)';
    }
    if (form.endLongitude && (isNaN(endLng) || endLng < -180 || endLng > 180)) {
      newErrors.endLongitude = 'Invalid longitude (-180 to 180)';
    }

    // Require start coordinates
    if (!form.startLatitude || !form.startLongitude) {
      newErrors.startLatitude =
        newErrors.startLatitude ?? 'Start location is required';
    }
    if (!form.endLatitude || !form.endLongitude) {
      newErrors.endLatitude =
        newErrors.endLatitude ?? 'End location is required';
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEditMode && route) {
        // Update existing route
        const updateData: BicycleRouteUpdate = {
          id: route.id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          color: form.color,
          start_address: form.startAddress.trim() || null,
          start_latitude: parseFloat(form.startLatitude),
          start_longitude: parseFloat(form.startLongitude),
          end_address: form.endAddress.trim() || null,
          end_latitude: parseFloat(form.endLatitude),
          end_longitude: parseFloat(form.endLongitude),
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
          start_latitude: parseFloat(form.startLatitude),
          start_longitude: parseFloat(form.startLongitude),
          end_address: form.endAddress.trim() || undefined,
          end_latitude: parseFloat(form.endLatitude),
          end_longitude: parseFloat(form.endLongitude),
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

  // Copy start to end (for round trips)
  const copyStartToEnd = () => {
    setForm((prev) => ({
      ...prev,
      endAddress: prev.startAddress,
      endLatitude: prev.startLatitude,
      endLongitude: prev.startLongitude,
    }));
  };

  if (!isOpen) return null;

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

        {/* Home location prompt */}
        {showHomePrompt && !isEditMode && (
          <div className="alert alert-warning m-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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
            <div>
              <h3 className="font-bold">No home address set</h3>
              <p className="text-sm">
                Set your home address in settings to auto-fill route start/end
                points.
              </p>
              <a href="/settings" className="btn btn-sm btn-link">
                Go to Settings
              </a>
            </div>
          </div>
        )}

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

          {/* Start Point */}
          <fieldset className="border-base-300 rounded-lg border p-3">
            <legend className="px-2 text-sm font-medium">Start Point</legend>
            <div className="space-y-2">
              <input
                type="text"
                name="startAddress"
                value={form.startAddress}
                onChange={handleChange}
                placeholder="Address (optional)"
                className="input input-bordered input-sm w-full"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  name="startLatitude"
                  value={form.startLatitude}
                  onChange={handleChange}
                  placeholder="Latitude *"
                  className={`input input-bordered input-sm ${errors.startLatitude ? 'input-error' : ''}`}
                  aria-invalid={!!errors.startLatitude}
                />
                <input
                  type="text"
                  name="startLongitude"
                  value={form.startLongitude}
                  onChange={handleChange}
                  placeholder="Longitude *"
                  className={`input input-bordered input-sm ${errors.startLongitude ? 'input-error' : ''}`}
                  aria-invalid={!!errors.startLongitude}
                />
              </div>
              {(errors.startLatitude || errors.startLongitude) && (
                <p className="text-error text-xs">
                  {errors.startLatitude || errors.startLongitude}
                </p>
              )}
            </div>
          </fieldset>

          {/* Copy start to end button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={copyStartToEnd}
              className="btn btn-ghost btn-xs"
              aria-label="Copy start point to end point (round trip)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-1 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              Round Trip (copy start to end)
            </button>
          </div>

          {/* End Point */}
          <fieldset className="border-base-300 rounded-lg border p-3">
            <legend className="px-2 text-sm font-medium">End Point</legend>
            <div className="space-y-2">
              <input
                type="text"
                name="endAddress"
                value={form.endAddress}
                onChange={handleChange}
                placeholder="Address (optional)"
                className="input input-bordered input-sm w-full"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  name="endLatitude"
                  value={form.endLatitude}
                  onChange={handleChange}
                  placeholder="Latitude *"
                  className={`input input-bordered input-sm ${errors.endLatitude ? 'input-error' : ''}`}
                  aria-invalid={!!errors.endLatitude}
                />
                <input
                  type="text"
                  name="endLongitude"
                  value={form.endLongitude}
                  onChange={handleChange}
                  placeholder="Longitude *"
                  className={`input input-bordered input-sm ${errors.endLongitude ? 'input-error' : ''}`}
                  aria-invalid={!!errors.endLongitude}
                />
              </div>
              {(errors.endLatitude || errors.endLongitude) && (
                <p className="text-error text-xs">
                  {errors.endLatitude || errors.endLongitude}
                </p>
              )}
            </div>
          </fieldset>

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

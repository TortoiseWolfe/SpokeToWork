'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type {
  BicycleRoute,
  RouteCompanyWithDetails,
  RouteCompanyReorder,
} from '@/types/route';
import { useRouteOptimization } from '@/hooks/useRouteOptimization';
import RouteOptimizationModal from '@/components/molecular/RouteOptimizationModal';

// Sortable item component for drag-and-drop
interface SortableCompanyItemProps {
  rc: RouteCompanyWithDetails;
  index: number;
  onToggleNextRide?: (id: string) => void;
  onRemoveCompany?: (id: string) => void;
}

function SortableCompanyItem({
  rc,
  index,
  onToggleNextRide,
  onRemoveCompany,
}: SortableCompanyItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-base-200 flex items-center gap-3 rounded-lg p-3 ${
        isDragging ? 'z-50 shadow-lg' : ''
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="text-base-content/50 hover:text-base-content cursor-grab touch-none p-1 active:cursor-grabbing"
        aria-label={`Drag to reorder ${rc.company.name}. Press Ctrl+Arrow to move.`}
        {...attributes}
        {...listeners}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
      </button>
      <span className="text-base-content/50 w-6 text-center text-sm font-medium">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{rc.company.name}</p>
        {rc.company.address && (
          <p className="text-base-content/60 truncate text-sm">
            {rc.company.address}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onToggleNextRide && (
          <button
            type="button"
            className={`btn btn-xs ${
              rc.visit_on_next_ride ? 'btn-primary' : 'btn-ghost'
            }`}
            onClick={() => onToggleNextRide(rc.id)}
            aria-label={
              rc.visit_on_next_ride
                ? 'Remove from next ride'
                : 'Add to next ride'
            }
            title={
              rc.visit_on_next_ride
                ? 'Remove from next ride'
                : 'Add to next ride'
            }
          >
            {rc.visit_on_next_ride ? 'Next' : '+Next'}
          </button>
        )}
        {onRemoveCompany && (
          <button
            type="button"
            className="btn btn-ghost btn-xs text-error"
            onClick={() => onRemoveCompany(rc.id)}
            aria-label={`Remove ${rc.company.name} from route`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
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
        )}
      </div>
    </li>
  );
}

export interface RouteDetailDrawerProps {
  /** Route to display */
  route: BicycleRoute | null;
  /** Companies on the route */
  companies: RouteCompanyWithDetails[];
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Loading state for companies */
  isLoading?: boolean;
  /** Callback when drawer is closed */
  onClose: () => void;
  /** Callback when edit route is requested */
  onEditRoute?: (route: BicycleRoute) => void;
  /** Callback when delete route is requested */
  onDeleteRoute?: (route: BicycleRoute) => void;
  /** Callback when company is removed from route */
  onRemoveCompany?: (routeCompanyId: string) => void;
  /** Callback when next ride is toggled */
  onToggleNextRide?: (routeCompanyId: string) => void;
  /** Callback when companies are reordered */
  onReorder?: (data: RouteCompanyReorder) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * RouteDetailDrawer - Slide-out drawer showing full route details and company list
 *
 * @category organisms
 */
export default function RouteDetailDrawer({
  route,
  companies,
  isOpen,
  isLoading = false,
  onClose,
  onEditRoute,
  onDeleteRoute,
  onRemoveCompany,
  onToggleNextRide,
  onReorder,
  className = '',
  testId = 'route-detail-drawer',
}: RouteDetailDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [localCompanies, setLocalCompanies] = useState(companies);

  // Route optimization hook
  const optimization = useRouteOptimization({
    onSuccess: () => {
      // Trigger parent to refetch companies by calling onReorder
      if (route && onReorder) {
        onReorder({
          route_id: route.id,
          ordered_ids: localCompanies.map((c) => c.id),
        });
      }
    },
  });

  // Sync local state when companies prop changes
  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  // Set up drag sensors (pointer + keyboard for accessibility)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - reorder companies
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localCompanies.findIndex((c) => c.id === active.id);
      const newIndex = localCompanies.findIndex((c) => c.id === over.id);

      const newOrder = arrayMove(localCompanies, oldIndex, newIndex);
      setLocalCompanies(newOrder);

      // Call the onReorder callback with new order
      if (onReorder && route) {
        onReorder({
          route_id: route.id,
          ordered_ids: newOrder.map((c) => c.id),
        });
      }
    }
  };

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Don't close if clicking inside the drawer
      if (drawerRef.current?.contains(target)) {
        return;
      }

      onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!route) return null;

  const nextRideCount = localCompanies.filter(
    (c) => c.visit_on_next_ride
  ).length;

  return (
    <>
      {/* Backdrop */}
      <div
        data-testid={`${testId}-backdrop`}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        data-testid={testId}
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-drawer-title"
        className={`bg-base-100 fixed top-0 right-0 z-50 flex h-full w-full max-w-md transform flex-col shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${className}`}
      >
        {/* Header */}
        <div className="bg-base-200 flex flex-shrink-0 items-start justify-between border-b p-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {/* Color indicator */}
              <div
                className="h-4 w-4 flex-shrink-0 rounded-full"
                style={{ backgroundColor: route.color }}
                aria-hidden="true"
              />
              <h2
                id="route-drawer-title"
                className="truncate text-xl font-bold"
              >
                {route.name}
              </h2>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {route.distance_miles && (
                <span className="text-base-content/70 text-sm">
                  {route.distance_miles.toFixed(1)} mi
                </span>
              )}
              {route.is_system_route && (
                <span className="badge badge-secondary badge-xs">Trail</span>
              )}
              {localCompanies.length > 0 && (
                <span className="badge badge-ghost badge-xs">
                  {localCompanies.length}{' '}
                  {localCompanies.length === 1 ? 'company' : 'companies'}
                </span>
              )}
              {nextRideCount > 0 && (
                <span className="badge badge-primary badge-xs">
                  {nextRideCount} on next ride
                </span>
              )}
            </div>
            {route.description && (
              <p className="text-base-content/60 mt-2 line-clamp-2 text-sm">
                {route.description}
              </p>
            )}
          </div>
          <div className="ml-2 flex gap-1">
            {onEditRoute && !route.is_system_route && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onEditRoute(route)}
                aria-label="Edit route"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Close drawer"
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="mb-3 flex items-center justify-between font-semibold">
            <span>Companies on Route</span>
            <div className="flex items-center gap-2">
              {!isLoading && localCompanies.length >= 2 && route && (
                <button
                  type="button"
                  className="btn btn-primary btn-xs gap-1"
                  onClick={() => optimization.optimize(route.id)}
                  disabled={optimization.isLoading}
                  aria-label="Optimize route order"
                  title="Optimize company visit order for shortest distance"
                >
                  {optimization.isLoading ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  )}
                  Optimize
                </button>
              )}
              {!isLoading && localCompanies.length > 0 && (
                <span className="text-base-content/60 text-sm font-normal">
                  Drag to reorder
                </span>
              )}
            </div>
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <span
                className="loading loading-spinner loading-md"
                aria-label="Loading companies"
              ></span>
            </div>
          ) : localCompanies.length === 0 ? (
            <div className="text-base-content/60 py-8 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto mb-3 h-12 w-12 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <p>No companies on this route yet</p>
              <p className="mt-1 text-sm">
                Click on map markers to add companies
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localCompanies.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {localCompanies.map((rc, index) => (
                    <SortableCompanyItem
                      key={rc.id}
                      rc={rc}
                      index={index}
                      onToggleNextRide={onToggleNextRide}
                      onRemoveCompany={onRemoveCompany}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t p-4">
          {onDeleteRoute && !route.is_system_route ? (
            <button
              type="button"
              className="btn btn-error btn-sm btn-outline"
              onClick={() => {
                if (window.confirm(`Delete route "${route.name}"?`)) {
                  onDeleteRoute(route);
                  onClose();
                }
              }}
            >
              Delete Route
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      {/* Route Optimization Modal */}
      <RouteOptimizationModal
        isOpen={optimization.isOpen}
        result={optimization.result}
        companies={optimization.companies.map((c) => ({
          id: c.id,
          name: c.company.name,
        }))}
        originalOrder={optimization.originalOrder}
        isLoading={optimization.isLoading || optimization.isApplying}
        error={optimization.error}
        onApply={optimization.apply}
        onClose={optimization.close}
      />
    </>
  );
}

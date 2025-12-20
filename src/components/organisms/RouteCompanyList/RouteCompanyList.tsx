'use client';

/**
 * RouteCompanyList - Feature 041: Bicycle Route Planning
 *
 * Displays an ordered list of companies on a route with drag-and-drop reordering,
 * "next ride" toggle, and remove functionality.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRoutes } from '@/hooks/useRoutes';
import type { RouteCompany, BicycleRoute } from '@/types/route';

export interface RouteCompanyListProps {
  /** The route whose companies to display */
  route: BicycleRoute;
  /** List of company associations for the route */
  companies: RouteCompany[];
  /** Whether drag-and-drop is enabled */
  isDraggable?: boolean;
  /** Callback when a company is removed */
  onRemove?: (companyId: string) => void;
  /** Callback when next ride is toggled */
  onToggleNextRide?: (companyId: string, nextRide: boolean) => void;
  /** Callback when order changes */
  onReorder?: (companies: RouteCompany[]) => void;
  /** Optional loading state */
  isLoading?: boolean;
}

interface SortableCompanyItemProps {
  company: RouteCompany;
  isDraggable: boolean;
  onRemove?: (routeCompanyId: string) => void;
  onToggleNextRide?: (routeCompanyId: string) => void;
}

function SortableCompanyItem({
  company,
  isDraggable,
  onRemove,
  onToggleNextRide,
}: SortableCompanyItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: company.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Get company name - prefer shared, fallback to private, or show ID
  const companyName =
    company.shared_company_id ||
    company.private_company_id ||
    'Unknown Company';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-base-100 border-base-300 flex items-center gap-2 rounded-lg border p-2 ${
        isDragging ? 'z-10 shadow-lg' : ''
      }`}
      role="listitem"
      aria-label={`Company: ${companyName}`}
    >
      {/* Drag handle */}
      {isDraggable && (
        <button
          {...attributes}
          {...listeners}
          className="hover:bg-base-200 cursor-grab rounded p-1 active:cursor-grabbing"
          aria-label={`Drag ${companyName}. Press Ctrl+Up or Ctrl+Down to move.`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="text-base-content/50 h-4 w-4"
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
      )}

      {/* Sequence number */}
      <span className="bg-base-200 flex h-6 w-6 items-center justify-center rounded-full text-xs">
        {company.sequence_order + 1}
      </span>

      {/* Company info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{companyName}</p>
      </div>

      {/* Next ride checkbox */}
      <label className="flex cursor-pointer items-center gap-1">
        <input
          type="checkbox"
          className="checkbox checkbox-sm checkbox-primary"
          checked={company.visit_on_next_ride}
          onChange={() => onToggleNextRide?.(company.id)}
          aria-label={`Mark ${companyName} for next ride`}
        />
        <span className="text-base-content/70 text-xs">Next</span>
      </label>

      {/* Remove button */}
      <button
        onClick={() => onRemove?.(company.id)}
        className="btn btn-ghost btn-xs btn-circle text-error hover:bg-error/10"
        aria-label={`Remove ${companyName} from route`}
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
    </div>
  );
}

export default function RouteCompanyList({
  route,
  companies,
  isDraggable = true,
  onRemove,
  onToggleNextRide,
  onReorder,
  isLoading = false,
}: RouteCompanyListProps) {
  const { reorderCompanies, toggleNextRide, removeCompanyFromRoute } =
    useRoutes();
  const [localCompanies, setLocalCompanies] =
    useState<RouteCompany[]>(companies);

  // Keep local state in sync with props
  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = localCompanies.findIndex((c) => c.id === active.id);
      const newIndex = localCompanies.findIndex((c) => c.id === over.id);

      const newCompanies = arrayMove(localCompanies, oldIndex, newIndex);

      // Update sequence_order
      const reorderedCompanies = newCompanies.map(
        (c: RouteCompany, index: number) => ({
          ...c,
          sequence_order: index,
        })
      );

      // Optimistic update
      setLocalCompanies(reorderedCompanies);
      onReorder?.(reorderedCompanies);

      // Persist to server
      try {
        const orderedIds = reorderedCompanies.map((c: RouteCompany) => c.id);
        await reorderCompanies({ route_id: route.id, ordered_ids: orderedIds });
      } catch (error) {
        // Rollback on error
        setLocalCompanies(companies);
        console.error('Failed to reorder companies:', error);
      }
    },
    [localCompanies, companies, route.id, reorderCompanies, onReorder]
  );

  const handleRemove = useCallback(
    async (routeCompanyId: string) => {
      try {
        await removeCompanyFromRoute(routeCompanyId);
        setLocalCompanies((prev) =>
          prev.filter((c) => c.id !== routeCompanyId)
        );
        onRemove?.(routeCompanyId);
      } catch (error) {
        console.error('Failed to remove company:', error);
      }
    },
    [removeCompanyFromRoute, onRemove]
  );

  const handleToggleNextRide = useCallback(
    async (routeCompanyId: string) => {
      try {
        const updated = await toggleNextRide(routeCompanyId);
        setLocalCompanies((prev) =>
          prev.map((c) =>
            c.id === routeCompanyId
              ? { ...c, visit_on_next_ride: updated.visit_on_next_ride }
              : c
          )
        );
        onToggleNextRide?.(routeCompanyId, updated.visit_on_next_ride);
      } catch (error) {
        console.error('Failed to toggle next ride:', error);
      }
    },
    [toggleNextRide, onToggleNextRide]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <span
          className="loading loading-spinner loading-md"
          aria-label="Loading companies"
        />
      </div>
    );
  }

  if (localCompanies.length === 0) {
    return (
      <div className="text-base-content/60 p-4 text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto mb-2 h-12 w-12 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <p className="font-medium">No companies on this route</p>
        <p className="text-sm">Add companies from the map or company list</p>
      </div>
    );
  }

  const nextRideCount = localCompanies.filter(
    (c) => c.visit_on_next_ride
  ).length;

  return (
    <div className="space-y-2">
      {/* Header with stats */}
      <div className="text-base-content/70 flex items-center gap-2 px-2 text-sm">
        <span>{localCompanies.length} companies</span>
        {nextRideCount > 0 && (
          <span className="badge badge-primary badge-sm">
            {nextRideCount} next ride
          </span>
        )}
      </div>

      {/* Drag and drop list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localCompanies.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div
            role="list"
            aria-label="Companies on route"
            className="space-y-1"
          >
            {localCompanies.map((company) => (
              <SortableCompanyItem
                key={company.id}
                company={company}
                isDraggable={isDraggable}
                onRemove={handleRemove}
                onToggleNextRide={handleToggleNextRide}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Keyboard navigation hint */}
      {isDraggable && (
        <p className="text-base-content/50 text-center text-xs">
          Drag to reorder, or use Ctrl+Arrow keys
        </p>
      )}
    </div>
  );
}

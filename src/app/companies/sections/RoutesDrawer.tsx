'use client';

/**
 * RoutesDrawer — left slide-in sidebar + backdrop.
 * Page-scoped.
 */

import { useEffect } from 'react';
import RouteSidebar from '@/components/organisms/RouteSidebar';
import type { UseRouteActionsReturn } from '@/hooks/useRouteActions';
import type { BicycleRoute } from '@/types/route';

export interface RoutesDrawerProps {
  open: boolean;
  onClose: () => void;
  routes: BicycleRoute[];
  activeRouteId: string | null;
  isLoading: boolean;
  routeActions: UseRouteActionsReturn;
}

export function RoutesDrawer({
  open,
  onClose,
  routes,
  activeRouteId,
  isLoading,
  routeActions,
}: RoutesDrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`bg-base-200 border-base-300 fixed top-0 left-0 z-50 h-full w-80 border-r shadow-xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-end p-2">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            aria-label="Close routes sidebar"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <RouteSidebar
          routes={routes}
          activeRouteId={activeRouteId}
          isLoading={isLoading}
          onCreateRoute={routeActions.openBuilder}
          onRouteSelect={routeActions.select}
          onEditRoute={routeActions.edit}
          onDeleteRoute={routeActions.remove}
        />
      </div>
    </>
  );
}

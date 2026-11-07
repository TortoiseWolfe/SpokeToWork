'use client';

/**
 * RoutesDrawer — left slide-in sidebar + backdrop.
 * Page-scoped.
 */

import { useEffect } from 'react';
import RouteSidebar from '@/components/organisms/RouteSidebar';
import ResizablePanel from '@/components/molecular/ResizablePanel';
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
        className={`bg-base-200 border-base-300 fixed top-0 left-0 z-50 h-full max-w-full border-r shadow-xl transition-[transform,visibility] duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        {/* A closed drawer is invisible as well as slid off-screen, so its
            buttons and links are out of reach of the keyboard and screen
            readers. On desktop the width is adjustable (200-400px) and
            remembered between visits; below 768px the drawer is full width. */}
        <ResizablePanel
          className="h-full w-screen max-w-full md:w-80"
          data-testid="route-sidebar-panel"
          resizeHandleLabel="Resize routes sidebar"
        >
          <div className="flex items-center justify-end p-2">
            <button
              type="button"
              className="btn btn-sm btn-ghost min-h-11 min-w-11"
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
        </ResizablePanel>
      </div>
    </>
  );
}

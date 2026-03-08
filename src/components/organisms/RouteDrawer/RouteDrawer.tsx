'use client';

/**
 * RouteDrawer — slide-in-from-left shell around RouteSidebar.
 *
 * Mirrors CompanyDetailDrawer's backdrop+slide pattern but pinned left.
 * Gives routes zero permanent footprint on desktop (no ResizablePanel
 * column) and actually works on mobile (SplitMapViewTemplate's mobile
 * branch drops sidebarSlot entirely, so the old column never rendered
 * there).
 *
 * @see docs/plans/2026-03-06-map-latch-and-route-drawer-design.md
 * @see src/components/organisms/CompanyDetailDrawer/CompanyDetailDrawer.tsx:325-343
 */

import RouteSidebar, {
  type RouteSidebarProps,
} from '@/components/organisms/RouteSidebar/RouteSidebar';

export interface RouteDrawerProps extends RouteSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  'data-testid'?: string;
}

export default function RouteDrawer({
  isOpen,
  onClose,
  className = '',
  'data-testid': testId = 'route-drawer',
  ...sidebarProps
}: RouteDrawerProps) {
  return (
    <>
      {/* Backdrop — click anywhere to close. */}
      <div
        data-testid={`${testId}-backdrop`}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel — slides from left. Uses <div> not <aside>: the dialog
          role is not allowed on <aside> per ARIA (aria-allowed-role). */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-drawer-title"
        data-testid={testId}
        className={`bg-base-100 fixed top-0 left-0 z-50 flex h-full w-full max-w-sm transform flex-col shadow-xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${className}`}
      >
        <header className="border-base-300 flex items-center justify-between border-b p-4">
          <h2 id="route-drawer-title" className="text-lg font-semibold">
            Routes
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close routes"
            className="btn btn-ghost btn-sm btn-circle min-h-11 min-w-11"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          <RouteSidebar {...sidebarProps} />
        </div>
      </div>
    </>
  );
}

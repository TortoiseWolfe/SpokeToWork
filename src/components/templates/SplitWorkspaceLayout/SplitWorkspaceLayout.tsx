'use client';

/**
 * SplitWorkspaceLayout — collapsible panels around a persistent map.
 *
 * Desktop/tablet: up to three columns — route sidebar (left, via drawer),
 * map (center, always visible), company table (right, collapsible).
 * Floating toggle buttons on the map let users open/close each panel.
 *
 * Mobile: map is fixed full-screen, mobileSheet slot renders over it.
 */

import React, { useEffect, useState } from 'react';
import { useDeviceType } from '@/hooks/useDeviceType';

export interface SplitWorkspaceLayoutProps {
  /** Right panel on desktop. Typically CompanyTable + header chrome. */
  table: React.ReactNode;
  /** Center panel on desktop, full-screen on mobile. Typically CompanyMap. */
  map: React.ReactNode;
  /**
   * Mobile-only. Rendered over the full-screen map. Caller wraps in
   * BottomSheet.
   */
  mobileSheet: React.ReactNode;
  /** Optional callback to toggle the routes drawer (left side). */
  onToggleRoutes?: () => void;
  /** Whether the routes drawer is currently open. Hides the Routes button when true. */
  routesOpen?: boolean;
  className?: string;
}

export function SplitWorkspaceLayout({
  table,
  map,
  mobileSheet,
  onToggleRoutes,
  routesOpen = false,
  className = '',
}: SplitWorkspaceLayoutProps) {
  const { category } = useDeviceType();
  const [mounted, setMounted] = useState(false);
  const [showTable, setShowTable] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        data-testid="split-workspace-skeleton"
        className={`h-full w-full ${className}`}
      >
        <div className="skeleton h-full w-full" />
      </div>
    );
  }

  if (category === 'mobile') {
    return (
      <div
        data-testid="split-workspace-mobile"
        className={`relative h-full w-full ${className}`}
      >
        <div data-testid="split-workspace-mobile-map" className="fixed inset-0">
          {map}
        </div>
        {mobileSheet}
      </div>
    );
  }

  // desktop + tablet: map always visible, table panel collapsible via width transition
  return (
    <div
      data-testid="split-workspace-desktop"
      className={`relative flex h-full overflow-hidden ${className}`}
    >
      <div
        data-testid="split-workspace-map-panel"
        className="relative min-w-0 flex-1 overflow-hidden"
      >
        {/* Map fills panel via absolute positioning — percentage heights
            can fail inside flex layouts, so we pin to edges instead */}
        <div className="absolute inset-0">{map}</div>
        {/* Panel toggles — same row, routes on left, list on right (left of map controls) */}
        <div className="absolute left-3 right-14 top-3 z-[1000] flex justify-between">
          {onToggleRoutes && !routesOpen ? (
            <button
              type="button"
              className="btn btn-sm btn-neutral shadow-lg"
              onClick={onToggleRoutes}
              aria-label="Open routes sidebar"
            >
              Routes
            </button>
          ) : <div />}
          <button
            type="button"
            className="btn btn-sm btn-neutral shadow-lg"
            onClick={() => setShowTable(!showTable)}
            aria-label={showTable ? 'Hide company list' : 'Show company list'}
          >
            {showTable ? 'Hide List' : 'Show List'}
          </button>
        </div>
      </div>
      <div
        data-testid="split-workspace-table-panel"
        className={`border-base-300 h-full min-h-0 overflow-y-auto border-l transition-[width] duration-300 ${
          showTable ? 'w-1/2' : 'w-0 overflow-hidden border-0'
        }`}
      >
        {table}
      </div>
    </div>
  );
}

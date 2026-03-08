'use client';

/**
 * SplitWorkspaceLayout — device-category-gated dual layout.
 *
 * Desktop/tablet: two-column grid, table left, map right. Table panel
 * scrolls; map panel pins (MapContainer owns its own height via height="100%").
 *
 * Mobile: map is fixed full-screen, mobileSheet slot renders over it.
 * The caller wraps mobileSheet content in BottomSheet (Task 8) — this
 * template doesn't know about sheet mechanics.
 *
 * Branch is on useDeviceType().category, NOT a CSS breakpoint. Category keys
 * on touch + Math.max(width, height): iPhone in landscape stays mobile,
 * tablet rotation doesn't flip category. Only a non-touch desktop window
 * crossing 768px flips — a developer action. We accept the map remount on
 * that flip rather than keeping both DOMs mounted (two MapContainers = two
 * tile loads).
 *
 * Hydration gate: useDeviceType SSR-defaults to desktop. Without a `mounted`
 * check, a mobile user sees a one-frame flash of the desktop grid before
 * useEffect corrects the category. Skeleton until first client render.
 *
 * Design: docs/plans/2026-03-06-split-workspace-layout-design.md
 */

import React, { useEffect, useState } from 'react';
import { useDeviceType } from '@/hooks/useDeviceType';

export interface SplitWorkspaceLayoutProps {
  /** Left panel on desktop. Typically CompanyTable + header chrome. */
  table: React.ReactNode;
  /** Right panel on desktop, full-screen on mobile. Typically CompanyMap. */
  map: React.ReactNode;
  /**
   * Mobile-only. Rendered over the full-screen map. Caller wraps in
   * BottomSheet. Unmounted on desktop/tablet.
   */
  mobileSheet: React.ReactNode;
  className?: string;
}

export function SplitWorkspaceLayout({
  table,
  map,
  mobileSheet,
  className = '',
}: SplitWorkspaceLayoutProps) {
  const { category } = useDeviceType();
  const [mounted, setMounted] = useState(false);

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

  // desktop + tablet share the side-by-side grid
  return (
    <div
      data-testid="split-workspace-desktop"
      className={`grid h-full grid-cols-[1fr_1fr] ${className}`}
    >
      <div
        data-testid="split-workspace-table-panel"
        className="border-base-300 h-full overflow-y-auto border-r"
      >
        {table}
      </div>
      <div
        data-testid="split-workspace-map-panel"
        className="h-full overflow-hidden"
      >
        {map}
      </div>
    </div>
  );
}

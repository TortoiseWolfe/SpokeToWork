'use client';

/**
 * RouteBuilder - Feature 041: Bicycle Route Planning
 *
 * Lightweight wrapper that dynamically loads RouteBuilderInner.
 * This prevents Vite from loading heavy dependencies (useRoutes, Supabase, OSRM)
 * during module transformation, solving the 6GB+ OOM issue in tests.
 *
 * @see RouteBuilderInner.tsx - Full implementation with heavy dependencies
 * @see docs/specs/051-ci-test-memory/spec.md - OOM investigation and solution
 */

import dynamic from 'next/dynamic';
import type { RouteBuilderProps } from './RouteBuilderInner';

/**
 * Dynamically load RouteBuilderInner to defer heavy dependency loading.
 * This pattern is also used by MapContainer and CoordinateMap.
 */
const RouteBuilderInner = dynamic(() => import('./RouteBuilderInner'), {
  ssr: false,
  loading: () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Loading route builder"
    >
      <div className="bg-base-100 rounded-lg p-8 shadow-xl">
        <span
          className="loading loading-spinner loading-lg"
          aria-label="Loading"
        />
      </div>
    </div>
  ),
});

export type { RouteBuilderProps };

export default function RouteBuilder(props: RouteBuilderProps) {
  // Early return if not open - prevents loading inner component unnecessarily
  if (!props.isOpen) return null;

  return <RouteBuilderInner {...props} />;
}

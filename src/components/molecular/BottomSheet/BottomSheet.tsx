'use client';

/**
 * BottomSheet — three-snap-point sheet for mobile overlay.
 *
 * Geometry: the sheet is always viewport-height tall. Position is controlled
 * by translateY. translateY = vh - (snapFraction * vh) means snapFraction of
 * the sheet is visible above the fold.
 *
 * Gesture: pointerdown on the handle captures the pointer. During drag,
 * translateY follows the finger (rAF-batched). On release, velocity decides:
 * |v| >= 0.5px/ms flicks one snap step in the throw direction; otherwise
 * snap to nearest. See computeNextSnap.
 *
 * Scroll handoff is NOT implemented — only the handle drags. The content
 * area scrolls normally. Handoff (list-at-top + drag-down = sheet moves) is
 * a follow-up if the interaction feels wrong in practice.
 *
 * Precedent for the pointer-capture pattern: ResizablePanel.tsx.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  computeNextSnap,
  snapPointToOffset,
  type SnapPoint,
} from './computeNextSnap';

export interface BottomSheetProps {
  children: React.ReactNode;
  /** Snap point on mount. Default: 'peek'. */
  initialSnap?: SnapPoint;
  /** Fires when the sheet settles at a new snap point after a drag. */
  onSnapChange?: (snap: SnapPoint) => void;
  ariaLabel?: string;
  className?: string;
}

export function BottomSheet({
  children,
  initialSnap = 'peek',
  onSnapChange,
  ariaLabel = 'Bottom sheet',
  className = '',
}: BottomSheetProps) {
  // viewportHeight is state so resize/rotate recomputes offsets.
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );
  const [offset, setOffset] = useState(() =>
    snapPointToOffset(initialSnap, viewportHeight),
  );
  const [isDragging, setIsDragging] = useState(false);

  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Rotate/resize: re-snap to nearest at the new geometry.
  useEffect(() => {
    setOffset((prev) => computeNextSnap(prev, 0, viewportHeight));
  }, [viewportHeight]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      startYRef.current = e.clientY;
      startOffsetRef.current = offset;
      lastYRef.current = e.clientY;
      lastTRef.current = e.timeStamp;
      setIsDragging(true);
    },
    [offset],
  );

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const deltaY = e.clientY - startYRef.current;
      const nextOffset = startOffsetRef.current + deltaY;
      lastYRef.current = e.clientY;
      lastTRef.current = e.timeStamp;

      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        // Clamp: can't drag above full or below peek.
        const min = snapPointToOffset('full', viewportHeight);
        const max = snapPointToOffset('peek', viewportHeight);
        setOffset(Math.max(min, Math.min(max, nextOffset)));
      });
    },
    [isDragging, viewportHeight],
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);

      // Cancel any pending move-rAF so it can't overwrite the snap.
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const dt = e.timeStamp - lastTRef.current;
      const dy = e.clientY - lastYRef.current;
      // If pointerup lands in the same frame as the last move, dt≈0 and we
      // fall back to snap-to-nearest. A flick has usually moved the sheet far
      // enough that nearest is the intended target anyway.
      const velocity = dt > 0 ? dy / dt : 0;

      // Derive release position from the event, not from state — state is
      // stale if the last move's rAF/re-render hasn't committed yet.
      const releaseOffset =
        startOffsetRef.current + (e.clientY - startYRef.current);
      const settled = computeNextSnap(releaseOffset, velocity, viewportHeight);
      setOffset(settled);

      if (onSnapChange) {
        // Reverse-map offset → snap name. Exact equality is safe here
        // because settled comes from computeNextSnap's discrete output.
        const full = snapPointToOffset('full', viewportHeight);
        const half = snapPointToOffset('half', viewportHeight);
        onSnapChange(
          settled === full ? 'full' : settled === half ? 'half' : 'peek',
        );
      }
    },
    [isDragging, viewportHeight, onSnapChange],
  );

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-label={ariaLabel}
      aria-modal="false"
      data-testid="bottom-sheet"
      className={`fixed inset-x-0 top-0 z-30 flex flex-col rounded-t-2xl bg-base-100 shadow-2xl will-change-transform ${
        isDragging ? '' : 'transition-transform duration-200 ease-out'
      } ${className}`}
      style={{
        height: viewportHeight,
        transform: `translateY(${offset}px)`,
        touchAction: 'none',
      }}
    >
      <div
        data-testid="bottom-sheet-handle"
        className="flex min-h-11 w-full cursor-grab items-center justify-center active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="h-1 w-10 rounded-full bg-base-content/30" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}

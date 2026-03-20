'use client';

/**
 * BottomSheet — three-snap mobile overlay. Always mounted; translateY
 * controls visibility. Only the handle drags (pointer-capture, rAF-batched
 * moves, velocity-aware settle via computeNextSnap).
 *
 * Focus trap activates when snap !== 'peek'. On open: save
 * document.activeElement, move focus into the sheet. On close: restore.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  computeNextSnap,
  offsetToSnap,
  snapPointToOffset,
  type SnapPoint,
} from './computeNextSnap';
import { useBottomSheetGesture } from './useBottomSheetGesture';

export interface BottomSheetProps {
  children: React.ReactNode;
  initialSnap?: SnapPoint;
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
  const [viewportHeight, setViewportHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800
  );
  const [offset, setOffset] = useState(() =>
    snapPointToOffset(initialSnap, viewportHeight)
  );
  const [snap, setSnap] = useState<SnapPoint>(initialSnap);

  const sheetRef = useRef<HTMLDivElement>(null);
  const open = snap !== 'peek';
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    const onResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setOffset((prev) => {
      const settled = computeNextSnap(prev, 0, viewportHeight);
      setSnap(offsetToSnap(settled, viewportHeight));
      return settled;
    });
  }, [viewportHeight]);

  const handleSettle = useCallback(
    (settledOffset: number, next: SnapPoint) => {
      setOffset(settledOffset);
      setSnap(next);
      onSnapChange?.(next);
    },
    [onSnapChange]
  );

  const {
    isDragging,
    rafRef,
    setOffsetRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useBottomSheetGesture({ offset, viewportHeight, onSettle: handleSettle });

  // Wire the gesture hook's rAF setter to our offset state
  setOffsetRef.current = setOffset;

  useEffect(() => {
    const ref = rafRef;
    return () => {
      if (ref.current != null) cancelAnimationFrame(ref.current);
    };
  }, [rafRef]);

  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-label={ariaLabel}
      aria-modal={open}
      tabIndex={-1}
      data-testid="bottom-sheet"
      className={`bg-base-100 fixed inset-x-0 top-0 z-30 flex flex-col rounded-t-2xl shadow-2xl will-change-transform ${
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
        <div className="bg-base-content/30 h-1 w-10 rounded-full" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}

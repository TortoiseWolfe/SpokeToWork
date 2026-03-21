/**
 * useBottomSheetGesture — pointer-capture drag handlers for BottomSheet.
 *
 * Manages pointerdown/move/up with rAF batching and velocity-aware settle.
 * Returns handlers to attach to the drag handle element.
 */

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  computeNextSnap,
  offsetToSnap,
  snapPointToOffset,
  type SnapPoint,
} from './computeNextSnap';

interface UseBottomSheetGestureOptions {
  offset: number;
  viewportHeight: number;
  onSettle: (offset: number, snap: SnapPoint) => void;
}

export function useBottomSheetGesture({
  offset,
  viewportHeight,
  onSettle,
}: UseBottomSheetGestureOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      startYRef.current = e.clientY;
      startOffsetRef.current = offset;
      lastYRef.current = e.clientY;
      lastTRef.current = e.timeStamp;
      setIsDragging(true);
    },
    [offset]
  );

  const setOffset = useRef<((v: number) => void) | null>(null);

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const deltaY = e.clientY - startYRef.current;
      const nextOffset = startOffsetRef.current + deltaY;
      lastYRef.current = e.clientY;
      lastTRef.current = e.timeStamp;

      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const min = snapPointToOffset('full', viewportHeight);
        const max = snapPointToOffset('peek', viewportHeight);
        setOffset.current?.(Math.max(min, Math.min(max, nextOffset)));
      });
    },
    [isDragging, viewportHeight]
  );

  const handlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.currentTarget.releasePointerCapture(e.pointerId);
      setIsDragging(false);

      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const dt = e.timeStamp - lastTRef.current;
      const dy = e.clientY - lastYRef.current;
      const velocity = dt > 0 ? dy / dt : 0;

      const releaseOffset =
        startOffsetRef.current + (e.clientY - startYRef.current);
      const settled = computeNextSnap(releaseOffset, velocity, viewportHeight);
      const next = offsetToSnap(settled, viewportHeight);
      onSettle(settled, next);
    },
    [isDragging, viewportHeight, onSettle]
  );

  return {
    isDragging,
    rafRef,
    setOffsetRef: setOffset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}

'use client';

/**
 * useEscapeKey Hook
 * FR-010: Consolidated hook for Escape key handling
 *
 * Replaces duplicate event listeners in:
 * - CompanyDetailDrawer.tsx
 * - RouteDetailDrawer.tsx
 * - TileLayerSelector.tsx
 * - ReAuthModal.tsx
 * - ConsentModal.tsx
 */

import { useEffect, useCallback } from 'react';

/**
 * Hook for handling Escape key press
 *
 * @param handler - Callback function when Escape key is pressed
 * @param enabled - Whether the listener is active (default: true)
 *
 * @example
 * ```typescript
 * function Modal({ isOpen, onClose }) {
 *   useEscapeKey(onClose, isOpen);
 *
 *   if (!isOpen) return null;
 *
 *   return (
 *     <div className="modal">
 *       <p>Press Escape to close</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useEscapeKey(
  handler: () => void,
  enabled: boolean = true
): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handler();
      }
    },
    [handler]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

export default useEscapeKey;

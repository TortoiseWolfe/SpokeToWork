'use client';

/**
 * useVisibilityChange Hook
 * FR-008: Consolidated hook for document visibility tracking
 *
 * Replaces duplicate event listeners in:
 * - useUnreadCount.ts
 * - useReadReceipts.ts
 * - connection-listener.ts
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for tracking document visibility state
 *
 * @param onVisible - Optional callback when document becomes visible
 * @param onHidden - Optional callback when document becomes hidden
 * @returns boolean - true if document is visible, false if hidden
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const isVisible = useVisibilityChange(
 *     () => console.log('Tab is active'),
 *     () => console.log('Tab is hidden')
 *   );
 *
 *   return <div>{isVisible ? 'Active' : 'Hidden'}</div>;
 * }
 * ```
 */
export function useVisibilityChange(
  onVisible?: () => void,
  onHidden?: () => void
): boolean {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  // Memoize callbacks to prevent unnecessary effect reruns
  const handleVisible = useCallback(() => {
    onVisible?.();
  }, [onVisible]);

  const handleHidden = useCallback(() => {
    onHidden?.();
  }, [onHidden]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible) {
        handleVisible();
      } else {
        handleHidden();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleVisible, handleHidden]);

  return isVisible;
}

export default useVisibilityChange;

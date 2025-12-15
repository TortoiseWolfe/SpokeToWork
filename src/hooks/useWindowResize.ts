'use client';

/**
 * useWindowResize Hook
 * FR-009: Consolidated hook for window resize handling
 *
 * Replaces duplicate event listeners in:
 * - MapContainerInner.tsx
 */

import { useState, useEffect, useCallback } from 'react';

export interface WindowSize {
  width: number;
  height: number;
}

/**
 * Hook for tracking window dimensions with optional debounce
 *
 * @param debounceMs - Optional debounce delay in milliseconds (default: 100)
 * @returns WindowSize - Current window width and height
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { width, height } = useWindowResize();
 *
 *   return (
 *     <div>
 *       Window: {width}x{height}
 *     </div>
 *   );
 * }
 * ```
 */
export function useWindowResize(debounceMs: number = 100): WindowSize {
  const [size, setSize] = useState<WindowSize>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const handleResize = useCallback(() => {
    setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    // Debounced resize handler
    let timeoutId: NodeJS.Timeout | null = null;

    const debouncedResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(handleResize, debounceMs);
    };

    window.addEventListener('resize', debouncedResize);

    // Initial size (in case SSR value was 0)
    handleResize();

    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [debounceMs, handleResize]);

  return size;
}

export default useWindowResize;

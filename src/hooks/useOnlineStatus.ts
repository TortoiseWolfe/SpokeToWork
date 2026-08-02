'use client';

/**
 * useOnlineStatus Hook
 * FR-006: Consolidated hook for network online/offline status
 *
 * Replaces duplicate event listeners in:
 * - useOfflineStatus.ts
 * - useNetworkStatus.ts
 * - useOfflineQueue.ts
 * - connection-listener.ts
 */

import { useState, useEffect } from 'react';

/**
 * Hook for tracking browser online/offline status
 *
 * @returns boolean - true if browser reports online, false if offline
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const isOnline = useOnlineStatus();
 *
 *   return (
 *     <div>
 *       {isOnline ? 'Connected' : 'Offline'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  // Always `true` for the first render, on BOTH sides.
  //
  // This used to read `navigator.onLine` during initial render, guarded by
  // `typeof navigator !== 'undefined'`. That guard makes it SSR-safe but not
  // hydration-safe: the static export renders `true` (no navigator in Node)
  // while the client's first render reads the real value, so any browser
  // reporting offline at load produced a hydration mismatch — React error #418.
  //
  // The consequence was not cosmetic. React recovers from #418 by re-rendering
  // the tree client-side, which rebuilds <html> from JSX and therefore DISCARDS
  // the `data-theme` attribute ThemeScript sets imperatively — so the page
  // silently lost its theme. Found by the AAA contrast sweep, whose theme
  // assertion failed on /contact with `data-theme: undefined`.
  //
  // Reading it in the effect below keeps both first renders identical and
  // corrects to the real value immediately after mount.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync to the real value once mounted, after hydration has matched.
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default useOnlineStatus;

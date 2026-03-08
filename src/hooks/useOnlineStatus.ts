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
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
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

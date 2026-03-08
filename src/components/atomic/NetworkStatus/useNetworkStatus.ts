import { useState, useEffect, useRef } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export interface NetworkStatusHookReturn {
  isOnline: boolean;
  wasOffline: boolean;
}

/**
 * useNetworkStatus Hook
 * Task: T119
 * FR-006: Refactored to use useOnlineStatus for core online/offline state
 *
 * Monitors browser online/offline status using consolidated hook.
 * Tracks whether user was recently offline to show reconnection feedback.
 */
export function useNetworkStatus(): NetworkStatusHookReturn {
  // FR-006: Use consolidated hook for online/offline status
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const prevIsOnlineRef = useRef(isOnline);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    // Detect transition from offline to online
    if (!prevIsOnlineRef.current && isOnline) {
      setWasOffline(true);
      // Clear "was offline" flag after 3 seconds
      timeoutId = setTimeout(() => setWasOffline(false), 3000);
    }

    // Reset wasOffline when going offline
    if (!isOnline) {
      setWasOffline(false);
    }

    prevIsOnlineRef.current = isOnline;

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isOnline]);

  return { isOnline, wasOffline };
}

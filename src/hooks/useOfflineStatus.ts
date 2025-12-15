'use client';

/**
 * useOfflineStatus Hook
 * Extended offline status with connection speed tracking
 *
 * FR-006: Refactored to use useOnlineStatus for core online/offline state
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useOnlineStatus } from './useOnlineStatus';

export interface OfflineStatus {
  isOffline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
  connectionSpeed: 'slow' | 'fast' | 'unknown';
}

export function useOfflineStatus() {
  // FR-006: Use consolidated hook for online/offline status
  const isOnline = useOnlineStatus();
  const prevIsOnlineRef = useRef(isOnline);

  const [status, setStatus] = useState<OfflineStatus>({
    isOffline: !isOnline,
    wasOffline: false,
    lastOnline: isOnline ? new Date() : null,
    connectionSpeed: 'unknown',
  });

  const checkConnectionSpeed = useCallback(() => {
    if ('connection' in navigator) {
      const conn = (
        navigator as unknown as { connection: { effectiveType?: string } }
      ).connection;
      if (conn?.effectiveType) {
        switch (conn.effectiveType) {
          case 'slow-2g':
          case '2g':
            return 'slow';
          case '3g':
          case '4g':
            return 'fast';
          default:
            return 'unknown';
        }
      }
    }
    return 'unknown';
  }, []);

  // Update status when isOnline changes
  useEffect(() => {
    const wasOffline = !prevIsOnlineRef.current && isOnline;
    prevIsOnlineRef.current = isOnline;

    setStatus((prev) => ({
      isOffline: !isOnline,
      wasOffline,
      lastOnline: isOnline ? new Date() : prev.lastOnline,
      connectionSpeed: checkConnectionSpeed(),
    }));
  }, [isOnline, checkConnectionSpeed]);

  // Track connection speed changes
  useEffect(() => {
    if (!('connection' in navigator)) {
      return;
    }

    const conn = (
      navigator as unknown as {
        connection: {
          addEventListener?: (event: string, handler: () => void) => void;
          removeEventListener?: (event: string, handler: () => void) => void;
        };
      }
    ).connection;

    const handleChange = () => {
      setStatus((prev) => ({
        ...prev,
        connectionSpeed: checkConnectionSpeed(),
      }));
    };

    conn?.addEventListener?.('change', handleChange);

    return () => {
      conn?.removeEventListener?.('change', handleChange);
    };
  }, [checkConnectionSpeed]);

  return status;
}

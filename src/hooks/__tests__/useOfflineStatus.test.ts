/**
 * Unit Tests for useOfflineStatus
 * Feature 052 - Test Coverage Expansion (T026)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock useOnlineStatus
const mockIsOnline = vi.fn();
vi.mock('../useOnlineStatus', () => ({
  useOnlineStatus: () => mockIsOnline(),
}));

import { useOfflineStatus } from '../useOfflineStatus';

describe('useOfflineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOnline.mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return isOffline as false when online', () => {
      mockIsOnline.mockReturnValue(true);

      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.isOffline).toBe(false);
    });

    it('should return isOffline as true when offline', () => {
      mockIsOnline.mockReturnValue(false);

      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.isOffline).toBe(true);
    });

    it('should set lastOnline when online', () => {
      mockIsOnline.mockReturnValue(true);

      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.lastOnline).toBeInstanceOf(Date);
    });

    it('should set lastOnline to null when offline initially', () => {
      mockIsOnline.mockReturnValue(false);

      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.lastOnline).toBeNull();
    });

    it('should return connectionSpeed as unknown by default', () => {
      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.connectionSpeed).toBe('unknown');
    });
  });

  describe('status transitions', () => {
    it('should set wasOffline to true when coming back online', async () => {
      // Start offline
      mockIsOnline.mockReturnValue(false);
      const { result, rerender } = renderHook(() => useOfflineStatus());

      expect(result.current.isOffline).toBe(true);
      expect(result.current.wasOffline).toBe(false);

      // Go online
      mockIsOnline.mockReturnValue(true);
      rerender();

      await waitFor(() => {
        expect(result.current.wasOffline).toBe(true);
      });
    });

    it('should update lastOnline when going online', async () => {
      // Start offline
      mockIsOnline.mockReturnValue(false);
      const { result, rerender } = renderHook(() => useOfflineStatus());

      expect(result.current.lastOnline).toBeNull();

      // Go online
      mockIsOnline.mockReturnValue(true);
      rerender();

      await waitFor(() => {
        expect(result.current.lastOnline).toBeInstanceOf(Date);
      });
    });
  });

  describe('connection speed', () => {
    it('should return slow for 2g connection', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '2g' },
        configurable: true,
      });

      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.connectionSpeed).toBe('slow');
    });

    it('should return slow for slow-2g connection', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: 'slow-2g' },
        configurable: true,
      });

      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.connectionSpeed).toBe('slow');
    });

    it('should return fast for 4g connection', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '4g' },
        configurable: true,
      });

      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.connectionSpeed).toBe('fast');
    });

    it('should return fast for 3g connection', () => {
      Object.defineProperty(navigator, 'connection', {
        value: { effectiveType: '3g' },
        configurable: true,
      });

      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.connectionSpeed).toBe('fast');
    });

    it('should return unknown when connection API not available', () => {
      // Remove connection from navigator
      const originalConnection = (navigator as any).connection;
      delete (navigator as any).connection;

      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current.connectionSpeed).toBe('unknown');

      // Restore
      if (originalConnection) {
        Object.defineProperty(navigator, 'connection', {
          value: originalConnection,
          configurable: true,
        });
      }
    });
  });

  describe('OfflineStatus interface', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useOfflineStatus());

      expect(result.current).toHaveProperty('isOffline');
      expect(result.current).toHaveProperty('wasOffline');
      expect(result.current).toHaveProperty('lastOnline');
      expect(result.current).toHaveProperty('connectionSpeed');
    });
  });
});

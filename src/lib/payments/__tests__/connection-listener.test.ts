/**
 * Unit Tests for connection-listener.ts
 * Feature 052 - Test Coverage Expansion
 *
 * Tests connection monitoring and offline queue sync
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startConnectionListener,
  stopConnectionListener,
  isConnectionListenerActive,
} from '../connection-listener';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  isSupabaseOnline: vi.fn(),
}));

vi.mock('@/lib/offline-queue', () => ({
  processPendingOperations: vi.fn(),
  getPendingCount: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('connection-listener', () => {
  let mockIsSupabaseOnline: ReturnType<typeof vi.fn>;
  let mockGetPendingCount: ReturnType<typeof vi.fn>;
  let mockProcessPendingOperations: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset module state
    stopConnectionListener();

    // Get mock references
    const supabaseClient = await import('@/lib/supabase/client');
    const offlineQueue = await import('@/lib/offline-queue');

    mockIsSupabaseOnline = supabaseClient.isSupabaseOnline as ReturnType<
      typeof vi.fn
    >;
    mockGetPendingCount = offlineQueue.getPendingCount as ReturnType<
      typeof vi.fn
    >;
    mockProcessPendingOperations =
      offlineQueue.processPendingOperations as ReturnType<typeof vi.fn>;

    // Default mocks
    mockIsSupabaseOnline.mockResolvedValue(false);
    mockGetPendingCount.mockResolvedValue(0);
    mockProcessPendingOperations.mockResolvedValue(undefined);

    vi.clearAllMocks();
  });

  afterEach(() => {
    stopConnectionListener();
  });

  describe('startConnectionListener()', () => {
    it('should start listener and return cleanup function', () => {
      const cleanup = startConnectionListener();

      expect(typeof cleanup).toBe('function');
      expect(isConnectionListenerActive()).toBe(true);
    });

    it('should not start duplicate listeners', () => {
      startConnectionListener();
      const cleanup2 = startConnectionListener();

      expect(isConnectionListenerActive()).toBe(true);
      expect(typeof cleanup2).toBe('function');
    });

    it('should check connection on start', async () => {
      mockIsSupabaseOnline.mockResolvedValue(true);
      mockGetPendingCount.mockResolvedValue(0);

      startConnectionListener();

      // Wait for async check
      await vi.waitFor(() => {
        expect(mockIsSupabaseOnline).toHaveBeenCalled();
      });
    });

    it('should process queue when online with pending items', async () => {
      mockIsSupabaseOnline.mockResolvedValue(true);
      mockGetPendingCount.mockResolvedValue(5);
      mockProcessPendingOperations.mockResolvedValue(undefined);

      startConnectionListener();

      await vi.waitFor(() => {
        expect(mockProcessPendingOperations).toHaveBeenCalled();
      });
    });

    it('should not process queue when online but no pending items', async () => {
      mockIsSupabaseOnline.mockResolvedValue(true);
      mockGetPendingCount.mockResolvedValue(0);

      startConnectionListener();

      await vi.waitFor(() => {
        expect(mockGetPendingCount).toHaveBeenCalled();
      });

      expect(mockProcessPendingOperations).not.toHaveBeenCalled();
    });

    it('should not process queue when offline', async () => {
      mockIsSupabaseOnline.mockResolvedValue(false);

      startConnectionListener();

      await vi.waitFor(() => {
        expect(mockIsSupabaseOnline).toHaveBeenCalled();
      });

      expect(mockGetPendingCount).not.toHaveBeenCalled();
      expect(mockProcessPendingOperations).not.toHaveBeenCalled();
    });

    it('should handle queue processing errors gracefully', async () => {
      mockIsSupabaseOnline.mockResolvedValue(true);
      mockGetPendingCount.mockResolvedValue(3);
      mockProcessPendingOperations.mockRejectedValue(new Error('Sync failed'));

      // Should not throw
      startConnectionListener();

      await vi.waitFor(() => {
        expect(mockProcessPendingOperations).toHaveBeenCalled();
      });

      // Listener should still be active
      expect(isConnectionListenerActive()).toBe(true);
    });
  });

  describe('stopConnectionListener()', () => {
    it('should stop the listener', () => {
      startConnectionListener();
      expect(isConnectionListenerActive()).toBe(true);

      stopConnectionListener();
      expect(isConnectionListenerActive()).toBe(false);
    });

    it('should be safe to call when not listening', () => {
      expect(() => stopConnectionListener()).not.toThrow();
      expect(isConnectionListenerActive()).toBe(false);
    });

    it('should remove event listeners', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      const removeDocEventListenerSpy = vi.spyOn(
        document,
        'removeEventListener'
      );

      startConnectionListener();
      stopConnectionListener();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      );
      expect(removeDocEventListenerSpy).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
      removeDocEventListenerSpy.mockRestore();
    });
  });

  describe('isConnectionListenerActive()', () => {
    it('should return false initially', () => {
      expect(isConnectionListenerActive()).toBe(false);
    });

    it('should return true when listening', () => {
      startConnectionListener();
      expect(isConnectionListenerActive()).toBe(true);
    });

    it('should return false after stopping', () => {
      startConnectionListener();
      stopConnectionListener();
      expect(isConnectionListenerActive()).toBe(false);
    });
  });

  describe('event handlers', () => {
    it('should check connection on browser online event', async () => {
      mockIsSupabaseOnline.mockResolvedValue(true);
      mockGetPendingCount.mockResolvedValue(2);

      startConnectionListener();

      // Clear initial check calls
      mockIsSupabaseOnline.mockClear();
      mockGetPendingCount.mockClear();

      // Simulate online event
      window.dispatchEvent(new Event('online'));

      await vi.waitFor(() => {
        expect(mockIsSupabaseOnline).toHaveBeenCalled();
      });
    });

    it('should check connection on page visibility change', async () => {
      mockIsSupabaseOnline.mockResolvedValue(true);
      mockGetPendingCount.mockResolvedValue(0);

      startConnectionListener();

      // Clear initial check calls
      mockIsSupabaseOnline.mockClear();

      // Simulate visibility change (page becomes visible)
      Object.defineProperty(document, 'hidden', {
        value: false,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      await vi.waitFor(() => {
        expect(mockIsSupabaseOnline).toHaveBeenCalled();
      });
    });

    it('should not check connection when page becomes hidden', async () => {
      mockIsSupabaseOnline.mockResolvedValue(true);

      startConnectionListener();

      // Clear initial check calls
      mockIsSupabaseOnline.mockClear();

      // Simulate visibility change (page becomes hidden)
      Object.defineProperty(document, 'hidden', {
        value: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));

      // Give time for potential async call
      await new Promise((r) => setTimeout(r, 10));

      expect(mockIsSupabaseOnline).not.toHaveBeenCalled();
    });
  });

  describe('cleanup function', () => {
    it('should stop listener when cleanup is called', () => {
      const cleanup = startConnectionListener();

      expect(isConnectionListenerActive()).toBe(true);

      cleanup();

      expect(isConnectionListenerActive()).toBe(false);
    });
  });
});

/**
 * Unit Tests for useIdleTimeout
 * Feature 052 - Test Coverage Expansion (T024)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdleTimeout } from '../useIdleTimeout';

describe('useIdleTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return isIdle as false initially', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({ timeoutMinutes: 5 })
      );

      expect(result.current.isIdle).toBe(false);
    });

    it('should return timeRemaining as timeout in seconds', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({ timeoutMinutes: 5 })
      );

      expect(result.current.timeRemaining).toBe(300); // 5 * 60
    });

    it('should provide resetTimer function', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({ timeoutMinutes: 5 })
      );

      expect(typeof result.current.resetTimer).toBe('function');
    });
  });

  describe('timeout behavior', () => {
    it('should call onTimeout when timeout expires', () => {
      const onTimeout = vi.fn();

      renderHook(() =>
        useIdleTimeout({
          timeoutMinutes: 1,
          onTimeout,
        })
      );

      // Advance 61 seconds (just past timeout)
      act(() => {
        vi.advanceTimersByTime(61000);
      });

      expect(onTimeout).toHaveBeenCalled();
    });

    it('should set isIdle to true when timeout expires', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({ timeoutMinutes: 1 })
      );

      act(() => {
        vi.advanceTimersByTime(61000);
      });

      expect(result.current.isIdle).toBe(true);
    });

    it('should decrease timeRemaining over time', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({ timeoutMinutes: 1 })
      );

      act(() => {
        vi.advanceTimersByTime(10000); // 10 seconds
      });

      expect(result.current.timeRemaining).toBeLessThan(60);
    });
  });

  describe('warning behavior', () => {
    it('should call onWarning when warning threshold reached', () => {
      const onWarning = vi.fn();

      renderHook(() =>
        useIdleTimeout({
          timeoutMinutes: 2,
          warningMinutes: 1,
          onWarning,
        })
      );

      // Advance to warning threshold (1 minute before timeout = 60 seconds elapsed)
      act(() => {
        vi.advanceTimersByTime(61000);
      });

      expect(onWarning).toHaveBeenCalled();
    });

    it('should only call onWarning once', () => {
      const onWarning = vi.fn();

      renderHook(() =>
        useIdleTimeout({
          timeoutMinutes: 2,
          warningMinutes: 1,
          onWarning,
        })
      );

      act(() => {
        vi.advanceTimersByTime(65000);
      });

      expect(onWarning).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetTimer', () => {
    it('should reset timeRemaining to full timeout', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({ timeoutMinutes: 1 })
      );

      act(() => {
        vi.advanceTimersByTime(30000); // 30 seconds
      });

      expect(result.current.timeRemaining).toBeLessThan(60);

      act(() => {
        result.current.resetTimer();
      });

      expect(result.current.timeRemaining).toBe(60);
    });

    it('should reset isIdle to false', () => {
      const { result } = renderHook(() =>
        useIdleTimeout({ timeoutMinutes: 1 })
      );

      act(() => {
        vi.advanceTimersByTime(61000);
      });

      expect(result.current.isIdle).toBe(true);

      act(() => {
        result.current.resetTimer();
      });

      expect(result.current.isIdle).toBe(false);
    });

    it('should allow onWarning to fire again after reset', () => {
      const onWarning = vi.fn();

      const { result } = renderHook(() =>
        useIdleTimeout({
          timeoutMinutes: 1,
          warningMinutes: 0.5, // 30 seconds
          onWarning,
        })
      );

      // First warning
      act(() => {
        vi.advanceTimersByTime(31000);
      });

      expect(onWarning).toHaveBeenCalledTimes(1);

      // Reset
      act(() => {
        result.current.resetTimer();
      });

      // Second warning after reset
      act(() => {
        vi.advanceTimersByTime(31000);
      });

      expect(onWarning).toHaveBeenCalledTimes(2);
    });
  });

  describe('activity events', () => {
    it('should register event listeners on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      renderHook(() => useIdleTimeout({ timeoutMinutes: 5 }));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function)
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should remove event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() =>
        useIdleTimeout({ timeoutMinutes: 5 })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'mousedown',
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});

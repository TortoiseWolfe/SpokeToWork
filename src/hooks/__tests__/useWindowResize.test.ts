/**
 * useWindowResize Hook Tests
 * FR-009: Test consolidated window resize hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWindowResize } from '../useWindowResize';

describe('useWindowResize', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    // Reset window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    vi.useRealTimers();
  });

  it('should return initial window size', () => {
    const { result } = renderHook(() => useWindowResize());

    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
  });

  it('should update size on window resize with debounce', async () => {
    const { result } = renderHook(() => useWindowResize(100));

    // Change window size
    Object.defineProperty(window, 'innerWidth', { value: 1920 });
    Object.defineProperty(window, 'innerHeight', { value: 1080 });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // Size should not update immediately (debounced)
    expect(result.current.width).toBe(1024);

    // Advance timers past debounce delay
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.width).toBe(1920);
    expect(result.current.height).toBe(1080);
  });

  it('should respect custom debounce delay', () => {
    const { result } = renderHook(() => useWindowResize(500));

    Object.defineProperty(window, 'innerWidth', { value: 800 });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // Not enough time
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.width).toBe(1024);

    // Now enough time
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current.width).toBe(800);
  });

  it('should cleanup event listener on unmount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useWindowResize());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should debounce multiple rapid resize events', () => {
    const { result } = renderHook(() => useWindowResize(100));

    // Rapid resizes
    for (let i = 0; i < 10; i++) {
      Object.defineProperty(window, 'innerWidth', { value: 500 + i * 100 });
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      act(() => {
        vi.advanceTimersByTime(50);
      });
    }

    // Should still be initial value (debounce resets on each event)
    expect(result.current.width).toBe(1024);

    // Wait for final debounce
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Should be last value
    expect(result.current.width).toBe(1400); // 500 + 9*100
  });
});

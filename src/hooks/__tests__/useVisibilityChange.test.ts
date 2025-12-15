/**
 * useVisibilityChange Hook Tests
 * FR-008: Test consolidated visibility change hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisibilityChange } from '../useVisibilityChange';

describe('useVisibilityChange', () => {
  // Store original document.hidden
  const originalHidden = document.hidden;

  beforeEach(() => {
    // Reset to visible state
    Object.defineProperty(document, 'hidden', {
      writable: true,
      configurable: true,
      value: false,
    });
  });

  afterEach(() => {
    // Restore original value
    Object.defineProperty(document, 'hidden', {
      writable: true,
      configurable: true,
      value: originalHidden,
    });
  });

  it('should return initial visible state', () => {
    const { result } = renderHook(() => useVisibilityChange());
    expect(result.current).toBe(true);
  });

  it('should return false when document.hidden is true', () => {
    Object.defineProperty(document, 'hidden', {
      writable: true,
      configurable: true,
      value: true,
    });

    const { result } = renderHook(() => useVisibilityChange());
    expect(result.current).toBe(false);
  });

  it('should update when visibility changes to hidden', () => {
    const { result } = renderHook(() => useVisibilityChange());
    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe(false);
  });

  it('should update when visibility changes to visible', () => {
    Object.defineProperty(document, 'hidden', {
      writable: true,
      configurable: true,
      value: true,
    });

    const { result } = renderHook(() => useVisibilityChange());
    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current).toBe(true);
  });

  it('should call onVisible callback when becoming visible', () => {
    Object.defineProperty(document, 'hidden', {
      writable: true,
      configurable: true,
      value: true,
    });

    const onVisible = vi.fn();
    renderHook(() => useVisibilityChange(onVisible));

    act(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it('should call onHidden callback when becoming hidden', () => {
    const onHidden = vi.fn();
    renderHook(() => useVisibilityChange(undefined, onHidden));

    act(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(onHidden).toHaveBeenCalledTimes(1);
  });

  it('should cleanup event listener on unmount', () => {
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useVisibilityChange());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });
});

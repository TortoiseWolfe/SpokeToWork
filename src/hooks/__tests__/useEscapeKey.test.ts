/**
 * useEscapeKey Hook Tests
 * FR-010: Test consolidated Escape key handling hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEscapeKey } from '../useEscapeKey';

describe('useEscapeKey', () => {
  it('should call handler when Escape key is pressed', () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should not call handler for other keys', () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should not call handler when enabled is false', () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler, false));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const handler = vi.fn();
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = renderHook(() => useEscapeKey(handler));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it('should handle enabling/disabling dynamically', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useEscapeKey(handler, enabled),
      { initialProps: { enabled: true } }
    );

    // Enabled - should work
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(handler).toHaveBeenCalledTimes(1);

    // Disable
    rerender({ enabled: false });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again

    // Re-enable
    rerender({ enabled: true });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('should handle handler updates without adding multiple listeners', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const { rerender } = renderHook(({ handler }) => useEscapeKey(handler), {
      initialProps: { handler: handler1 },
    });

    // Update handler
    rerender({ handler: handler2 });

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});

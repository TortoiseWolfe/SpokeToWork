/**
 * useClickOutside Hook Tests
 * FR-007: Test consolidated click-outside detection hook
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useClickOutside } from '../useClickOutside';

// Helper to create a ref with a mock element
function createMockRef() {
  const element = document.createElement('div');
  document.body.appendChild(element);
  return { current: element, cleanup: () => element.remove() };
}

describe('useClickOutside', () => {
  it('should call handler when clicking outside the element', () => {
    const handler = vi.fn();
    const { current: element, cleanup } = createMockRef();

    const ref = { current: element };
    renderHook(() => useClickOutside(ref, handler));

    // Click outside the element
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    const event = new MouseEvent('mousedown', { bubbles: true });
    outsideElement.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);

    cleanup();
    outsideElement.remove();
  });

  it('should not call handler when clicking inside the element', () => {
    const handler = vi.fn();
    const { current: element, cleanup } = createMockRef();

    const ref = { current: element };
    renderHook(() => useClickOutside(ref, handler));

    // Click inside the element
    const event = new MouseEvent('mousedown', { bubbles: true });
    element.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    cleanup();
  });

  it('should not call handler when enabled is false', () => {
    const handler = vi.fn();
    const { current: element, cleanup } = createMockRef();

    const ref = { current: element };
    renderHook(() => useClickOutside(ref, handler, false));

    // Click outside
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);

    const event = new MouseEvent('mousedown', { bubbles: true });
    outsideElement.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();

    cleanup();
    outsideElement.remove();
  });

  it('should cleanup event listener on unmount', () => {
    const handler = vi.fn();
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { current: element, cleanup } = createMockRef();
    const ref = { current: element };

    const { unmount } = renderHook(() => useClickOutside(ref, handler));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function)
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'mousedown',
      expect.any(Function)
    );

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    cleanup();
  });

  it('should handle null ref gracefully', () => {
    const handler = vi.fn();
    const ref = { current: null };

    // Should not throw
    expect(() => {
      renderHook(() => useClickOutside(ref, handler));
    }).not.toThrow();

    // Click anywhere - handler should not be called since ref is null
    const event = new MouseEvent('mousedown', { bubbles: true });
    document.body.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
  });
});

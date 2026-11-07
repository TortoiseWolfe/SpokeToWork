/**
 * #88: a hook must return the same value on its first client render as the
 * server did. The server has no window or document, so the first render has to
 * use a fixed default, and the real browser value is read in an effect.
 *
 * `renders` records every value the hook returned, in order. The first entry is
 * what the page would hydrate with.
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWindowResize } from '../useWindowResize';
import { useVisibilityChange } from '../useVisibilityChange';

describe('hydration-safe first render (#88)', () => {
  it('useWindowResize starts at 0x0 even when the window has a size', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1234,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 567,
    });

    const renders: { width: number; height: number }[] = [];
    const { result } = renderHook(() => {
      const size = useWindowResize();
      renders.push(size);
      return size;
    });

    // What the server would have rendered
    expect(renders[0]).toEqual({ width: 0, height: 0 });
    // The real size arrives from the effect
    expect(result.current).toEqual({ width: 1234, height: 567 });
  });

  it('useVisibilityChange starts visible even when the tab is hidden', () => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });

    const renders: boolean[] = [];
    const { result } = renderHook(() => {
      const visible = useVisibilityChange();
      renders.push(visible);
      return visible;
    });

    expect(renders[0]).toBe(true);
    expect(result.current).toBe(false);

    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
  });
});

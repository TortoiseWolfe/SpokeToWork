import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// happy-dom's getComputedStyle doesn't read CSS files, so we mock it.
// In a real browser, DaisyUI's @plugin directive sets these on :root.
const cssVarFixture: Record<string, string> = {
  '--color-primary': 'oklch(65% 0.2 275)',
  '--color-secondary': 'oklch(81.6% 0.145 216.5)',
  '--color-accent': 'oklch(72.3% 0.192 149.6)',
  '--color-success': 'oklch(72.3% 0.192 149.6)',
  '--color-warning': 'oklch(84.7% 0.199 83.9)',
  '--color-error': 'oklch(71.8% 0.202 349.8)',
  '--color-info': 'oklch(62.3% 0.188 259.8)',
};

let getComputedStyleSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation(
    () =>
      ({
        getPropertyValue: (prop: string) => cssVarFixture[prop] ?? '',
      }) as CSSStyleDeclaration
  );
});

afterEach(() => {
  getComputedStyleSpy.mockRestore();
  document.documentElement.removeAttribute('data-theme');
  // Restore fixture mutated by the MutationObserver test so that test
  // ordering (or retry) never sees leaked state.
  cssVarFixture['--color-primary'] = 'oklch(65% 0.2 275)';
});

import { useThemeColors } from '../useThemeColors';

describe('useThemeColors', () => {
  it('reads all seven semantic tokens from CSS vars', () => {
    const { result } = renderHook(() => useThemeColors());
    expect(result.current.primary).toBe('oklch(65% 0.2 275)');
    expect(result.current.secondary).toBe('oklch(81.6% 0.145 216.5)');
    expect(result.current.accent).toBe('oklch(72.3% 0.192 149.6)');
    expect(result.current.success).toBe('oklch(72.3% 0.192 149.6)');
    expect(result.current.warning).toBe('oklch(84.7% 0.199 83.9)');
    expect(result.current.error).toBe('oklch(71.8% 0.202 349.8)');
    expect(result.current.info).toBe('oklch(62.3% 0.188 259.8)');
  });

  it('re-reads when data-theme attribute changes', async () => {
    const { result } = renderHook(() => useThemeColors());
    const firstPrimary = result.current.primary;

    // Swap the fixture, then mutate the attribute. The hook's
    // MutationObserver should fire and re-read.
    cssVarFixture['--color-primary'] = 'oklch(50% 0.1 100)';
    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'cupcake');
      // happy-dom's MutationObserver callbacks fire on the macrotask queue,
      // not the microtask queue — setTimeout(0) is required to flush them.
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.primary).toBe('oklch(50% 0.1 100)');
    expect(result.current.primary).not.toBe(firstPrimary);
  });

  it('returns a stable reference when theme does not change', () => {
    const { result, rerender } = renderHook(() => useThemeColors());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('does not cause an extra render on mount when CSS vars already resolve', () => {
    let renderCount = 0;
    renderHook(() => {
      renderCount++;
      return useThemeColors();
    });
    // Lazy init reads the same values the effect would; the shallow-equal
    // bailout should return prev, so React's Object.is bails. One render only.
    expect(renderCount).toBe(1);
  });
});

/**
 * useDaisyColors Hook Tests
 *
 * Verifies the hook reads DaisyUI CSS custom properties from :root
 * and re-reads them when the `data-theme` attribute changes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDaisyColors } from './useDaisyColors';

/**
 * happy-dom does NOT load globals.css, so we inject known CSS custom
 * properties on :root (scoped by [data-theme]) for each test.
 */
const STYLE_ID = 'useDaisyColors-test-style';

function injectThemeStyles() {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root {
      --color-success: oklch(50% 0.1 150);
      --color-info: oklch(60% 0.15 260);
      --color-base-100: oklch(98% 0.01 90);
    }
    [data-theme="test-dark"] {
      --color-success: oklch(70% 0.19 150);
      --color-info: oklch(62% 0.19 260);
      --color-base-100: oklch(28% 0.07 259);
    }
  `;
  document.head.appendChild(style);
}

function removeThemeStyles() {
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();
  document.documentElement.removeAttribute('data-theme');
}

describe('useDaisyColors', () => {
  beforeEach(() => {
    injectThemeStyles();
  });

  afterEach(() => {
    removeThemeStyles();
  });

  it('reads requested tokens from CSS custom properties on mount', async () => {
    const { result } = renderHook(() =>
      useDaisyColors(['success', 'info'] as const)
    );

    // Post-hydration effect re-reads the values.
    await waitFor(() => {
      expect(result.current.success).toBe('oklch(50% 0.1 150)');
    });
    expect(result.current.info).toBe('oklch(60% 0.15 260)');
  });

  it('supports multi-segment token names like base-100', async () => {
    const { result } = renderHook(() =>
      useDaisyColors(['base-100'] as const)
    );

    await waitFor(() => {
      expect(result.current['base-100']).toBe('oklch(98% 0.01 90)');
    });
  });

  it('re-reads tokens when data-theme attribute changes', async () => {
    const { result } = renderHook(() =>
      useDaisyColors(['success', 'base-100'] as const)
    );

    // Initial (default/light) values
    await waitFor(() => {
      expect(result.current.success).toBe('oklch(50% 0.1 150)');
    });

    // Switch theme via data-theme attribute — MutationObserver should fire
    act(() => {
      document.documentElement.setAttribute('data-theme', 'test-dark');
    });

    await waitFor(() => {
      expect(result.current.success).toBe('oklch(70% 0.19 150)');
    });
    expect(result.current['base-100']).toBe('oklch(28% 0.07 259)');
  });

  it('returns empty strings for tokens with no matching CSS var', async () => {
    const { result } = renderHook(() =>
      useDaisyColors(['warning'] as const)
    );

    // No --color-warning defined in our test style — should be ''
    await waitFor(() => {
      expect(result.current.warning).toBe('');
    });
  });

  it('returns a stable keyed object matching requested tokens', async () => {
    const { result } = renderHook(() =>
      useDaisyColors(['success', 'info', 'base-100'] as const)
    );

    await waitFor(() => {
      expect(Object.keys(result.current).sort()).toEqual(
        ['base-100', 'info', 'success']
      );
    });
  });
});

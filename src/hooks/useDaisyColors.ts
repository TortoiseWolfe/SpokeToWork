'use client';

import { useEffect, useState } from 'react';

/**
 * DaisyUI semantic color tokens exposed as CSS custom properties on :root.
 * Each maps to `--color-<token>` (e.g. `success` → `--color-success`).
 */
export type DaisyColorToken =
  | 'primary'
  | 'primary-content'
  | 'secondary'
  | 'secondary-content'
  | 'accent'
  | 'accent-content'
  | 'neutral'
  | 'neutral-content'
  | 'base-100'
  | 'base-200'
  | 'base-300'
  | 'base-content'
  | 'info'
  | 'info-content'
  | 'success'
  | 'success-content'
  | 'warning'
  | 'warning-content'
  | 'error'
  | 'error-content';

/**
 * Reads DaisyUI theme color tokens from CSS custom properties and
 * re-reads them automatically when the `data-theme` attribute on
 * `<html>` changes.
 *
 * DaisyUI exposes each semantic color as a CSS var on `:root` scoped by
 * `[data-theme=...]`. Reading `getComputedStyle(document.documentElement)`
 * returns the currently-active theme's value as a color string
 * (typically `oklch(...)` in DaisyUI 5). MapLibre GL accepts these
 * strings directly in `line-color` paint properties.
 *
 * SSR: returns empty strings until the first client-side effect runs.
 * Callers rendering GL layers should guard on non-empty values before
 * passing to MapLibre paint specs.
 *
 * @example
 *   const { success, 'base-100': base100 } = useDaisyColors(['success', 'base-100']);
 *   // success → "oklch(72.3% 0.192 149.6)"
 */
export function useDaisyColors<T extends DaisyColorToken>(
  tokens: readonly T[]
): Record<T, string> {
  // Build an SSR-safe initial record (empty strings if no DOM).
  const [colors, setColors] = useState<Record<T, string>>(() => {
    const initial = {} as Record<T, string>;
    for (const token of tokens) {
      initial[token] = readToken(token);
    }
    return initial;
  });

  // Cheap stable key so the effect only re-subscribes when the set of
  // tokens actually changes — not on every render when callers pass a
  // fresh inline array. Avoids the stale-closure footgun of an empty
  // deps array (which would pin `tokens` to the first-mount reference
  // even if a caller later passed a different list).
  const tokenKey = tokens.join(',');

  useEffect(() => {
    // Re-read on mount to handle SSR→CSR hydration (initial state was
    // computed server-side with no DOM, so values were empty strings).
    const refresh = () => {
      const next = {} as Record<T, string>;
      for (const token of tokens) {
        next[token] = readToken(token);
      }
      setColors(next);
    };

    refresh();

    // Watch for theme changes. DaisyUI theme switching sets
    // data-theme on <html>, which cascades new --color-* values.
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
    // tokenKey derived from tokens — when the token set changes, the
    // effect re-runs with a fresh closure over the new `tokens` array.
    // The `tokens` reference itself is excluded (unstable array
    // identity would re-subscribe every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenKey]);

  return colors;
}

/**
 * Read a single DaisyUI color token from the active theme's CSS vars.
 * Returns empty string during SSR or if the var is undefined.
 */
function readToken(token: DaisyColorToken): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${token}`)
    .trim();
}

export default useDaisyColors;

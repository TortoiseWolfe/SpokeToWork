'use client';

import { useState, useEffect } from 'react';

/**
 * Resolved DaisyUI semantic color tokens for places Tailwind classes can't
 * reach — MapLibre paint properties, inline-style boxShadow interpolation,
 * canvas/SVG fills.
 *
 * Under DaisyUI v5 + Tailwind 4 these are full oklch() strings on
 * document.documentElement, set by the @plugin "daisyui" directive when a
 * theme is active. Theme switches via [data-theme] attribute, which this
 * hook watches.
 *
 * Relies on ThemeScript (src/components/ThemeScript.tsx) to translate
 * prefers-color-scheme changes into data-theme writes — the MutationObserver
 * here watches the attribute, not matchMedia directly.
 *
 * Fallbacks are the pre-migration hardcoded marker colors (getMarkerColor,
 * RoutePolyline paint) — if the theme system fails, map visuals revert to
 * their pre-Task-3 look rather than theme-correct-but-possibly-wrong. Only
 * hit during SSR or if the stylesheet hasn't loaded yet. All client renders
 * on a correctly-configured page should get real oklch.
 */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
}

const FALLBACK: ThemeColors = {
  primary: '#3b82f6',
  secondary: '#E63946',
  accent: '#8B5CF6',
  success: '#22C55E',
  warning: '#FF6B35',
  error: '#ef4444',
  info: '#00BFFF',
};

function colorsEqual(a: ThemeColors, b: ThemeColors): boolean {
  return (
    a.primary === b.primary &&
    a.secondary === b.secondary &&
    a.accent === b.accent &&
    a.success === b.success &&
    a.warning === b.warning &&
    a.error === b.error &&
    a.info === b.info
  );
}

function readColors(): ThemeColors {
  if (typeof document === 'undefined') return FALLBACK;
  const s = getComputedStyle(document.documentElement);
  const read = (name: keyof ThemeColors, cssVar: string): string => {
    const v = s.getPropertyValue(cssVar).trim();
    return v || FALLBACK[name];
  };
  return {
    primary: read('primary', '--color-primary'),
    secondary: read('secondary', '--color-secondary'),
    accent: read('accent', '--color-accent'),
    success: read('success', '--color-success'),
    warning: read('warning', '--color-warning'),
    error: read('error', '--color-error'),
    info: read('info', '--color-info'),
  };
}

export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(readColors);

  useEffect(() => {
    // Shared updater: readColors() always returns a fresh object, so an
    // unconditional setColors would fail React's Object.is bailout and
    // force a re-render even when values are identical. With N markers
    // each calling this hook, that's N wasted renders per mount. Return
    // prev when shallow-equal so React bails cleanly.
    const sync = () =>
      setColors((prev) => {
        const next = readColors();
        return colorsEqual(prev, next) ? prev : next;
      });

    // Initial sync — useState's lazy init may have run during SSR and
    // returned FALLBACK; re-read now that we're definitely client-side.
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return colors;
}

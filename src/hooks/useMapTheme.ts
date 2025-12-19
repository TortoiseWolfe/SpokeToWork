'use client';

import { useEffect, useState } from 'react';
import type { StyleSpecification } from 'maplibre-gl';
import lightStyle from '@/styles/map-style-light.json';
import darkStyle from '@/styles/map-style-dark.json';

export type MapTheme = 'light' | 'dark' | 'auto';

/**
 * Hook to get the appropriate MapLibre style based on the current theme.
 * Automatically detects DaisyUI theme changes and returns the matching map style.
 *
 * @param preferredTheme - Optional override: 'light', 'dark', or 'auto' (default)
 * @returns The MapLibre style specification for the current theme
 */
export function useMapTheme(
  preferredTheme: MapTheme = 'auto'
): StyleSpecification {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Function to detect if current theme is dark
    const detectDarkMode = (): boolean => {
      // Check DaisyUI theme attribute on html element
      const htmlElement = document.documentElement;
      const dataTheme = htmlElement.getAttribute('data-theme');

      // List of known dark themes in DaisyUI
      const darkThemes = [
        'dark',
        'synthwave',
        'halloween',
        'forest',
        'black',
        'luxury',
        'dracula',
        'business',
        'night',
        'coffee',
        'dim',
        'sunset',
      ];

      if (dataTheme && darkThemes.includes(dataTheme)) {
        return true;
      }

      // Fallback: check CSS media query
      if (dataTheme === 'system' || dataTheme === 'auto' || !dataTheme) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      return false;
    };

    // Initial detection
    setIsDarkMode(detectDarkMode());

    // Observer for theme changes via data-theme attribute
    const observer = new MutationObserver(() => {
      setIsDarkMode(detectDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Also listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      setIsDarkMode(detectDarkMode());
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  // Determine which style to use
  if (preferredTheme === 'light') {
    return lightStyle as StyleSpecification;
  }

  if (preferredTheme === 'dark') {
    return darkStyle as StyleSpecification;
  }

  // Auto mode: use detected theme
  return (isDarkMode ? darkStyle : lightStyle) as StyleSpecification;
}

export default useMapTheme;

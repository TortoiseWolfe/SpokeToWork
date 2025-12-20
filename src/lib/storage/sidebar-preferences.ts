/**
 * Sidebar Preferences Storage Helper
 *
 * Manages user's sidebar width preference in localStorage.
 * Provides graceful fallback when localStorage is unavailable.
 *
 * @see specs/047-route-sidebar-ux/data-model.md
 */

export interface SidebarPreferences {
  width: number;
}

const STORAGE_KEY = 'spoketowork:sidebar-preferences';
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

/**
 * Clamps a value between min and max bounds.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Gets the saved sidebar width from localStorage.
 * Returns DEFAULT_WIDTH if:
 * - localStorage is unavailable
 * - No saved preference exists
 * - Saved value is invalid
 *
 * @returns Sidebar width in pixels (200-400)
 */
export function getSidebarWidth(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_WIDTH;

    const prefs = JSON.parse(stored) as SidebarPreferences;

    if (typeof prefs.width !== 'number' || isNaN(prefs.width)) {
      return DEFAULT_WIDTH;
    }

    return clamp(prefs.width, MIN_WIDTH, MAX_WIDTH);
  } catch {
    // localStorage unavailable or parse error
    return DEFAULT_WIDTH;
  }
}

/**
 * Saves the sidebar width to localStorage.
 * Silently fails if localStorage is unavailable.
 * Clamps value to valid range before saving.
 *
 * @param width - Desired width in pixels
 */
export function setSidebarWidth(width: number): void {
  try {
    const clamped = clamp(width, MIN_WIDTH, MAX_WIDTH);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ width: clamped }));
  } catch {
    // localStorage unavailable, silently fail (per FR-008)
  }
}

/**
 * Constants exported for use in components
 */
export const SIDEBAR_DEFAULTS = {
  WIDTH: DEFAULT_WIDTH,
  MIN_WIDTH,
  MAX_WIDTH,
  STORAGE_KEY,
} as const;

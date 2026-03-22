import type { ThemeColors } from '@/hooks/useThemeColors';

/**
 * Static DaisyUI badge class lookup. Tailwind 4 scanner needs to see literal
 * class names — `badge-${color}` template strings are invisible to it.
 * This object puts every class name in the source as a literal.
 */
export const BADGE_CLASS: Record<keyof ThemeColors, string> = {
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  info: 'badge-info',
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
};

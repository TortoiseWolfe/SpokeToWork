import { describe, it, expect } from 'vitest';
import type { ThemeColors } from '@/hooks/useThemeColors';
import type { ResolvedIndustry } from '@/types/company';
import { BADGE_CLASS } from '@/lib/industries/badge-class';

// Compile-time guard: ResolvedIndustry.color must be keyof ThemeColors.
// If this file typechecks, the constraint holds.
const _check: ResolvedIndustry['color'] extends keyof ThemeColors ? true : never = true;

describe('industry color token constraint', () => {
  it('ResolvedIndustry.color is assignable to keyof ThemeColors', () => {
    expect(_check).toBe(true);
  });
});

describe('BADGE_CLASS', () => {
  it('covers every ThemeColors key', () => {
    const keys: (keyof ThemeColors)[] = ['primary', 'secondary', 'accent', 'success', 'warning', 'error', 'info'];
    for (const k of keys) {
      expect(BADGE_CLASS[k]).toMatch(/^badge-/);
    }
  });
});

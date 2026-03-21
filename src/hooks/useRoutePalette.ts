'use client';

/**
 * useRoutePalette
 *
 * Resolves DaisyUI semantic tokens → MapLibre-safe rgb() strings for
 * route polylines. Centralizes the token-to-rgb conversion so every
 * RoutePolyline doesn't duplicate the same useDaisyColors + toMapLibreColor
 * dance. Re-reads when data-theme changes.
 */

import { useMemo } from 'react';
import { useDaisyColors } from '@/hooks/useDaisyColors';
import { toMapLibreColor } from '@/lib/map/maplibre-color';
import { FALLBACK_PALETTE, type RoutePalette } from '@/lib/map/route-paint';

const TOKENS = ['success', 'info', 'primary'] as const;

export function useRoutePalette(): RoutePalette {
  const { success, info, primary } = useDaisyColors(TOKENS);

  return useMemo(
    () => ({
      system: toMapLibreColor(success) || FALLBACK_PALETTE.system,
      user: toMapLibreColor(info) || FALLBACK_PALETTE.user,
      active: toMapLibreColor(primary) || FALLBACK_PALETTE.active,
    }),
    [success, info, primary]
  );
}

export default useRoutePalette;

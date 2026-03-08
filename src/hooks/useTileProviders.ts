'use client';

/**
 * useTileProviders Hook - Feature 041: Bicycle Route Planning
 *
 * React hook for managing map tile providers with persistence.
 *
 * @see src/lib/map/tile-provider-service.ts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  TileProviderService,
  createTileProviderService,
  DEFAULT_TILE_URL,
  DEFAULT_ATTRIBUTION,
} from '@/lib/map/tile-provider-service';
import type { MapTileProvider } from '@/types/route';

export interface UseTileProvidersReturn {
  // Data
  providers: MapTileProvider[];
  selected: MapTileProvider | null;
  isLoading: boolean;
  error: Error | null;

  // Current tile config
  tileUrl: string;
  attribution: string;
  maxZoom: number;
  isCyclingOptimized: boolean;

  // Actions
  selectProvider: (providerName: string) => void;
  setApiKey: (apiKey: string | null) => void;
  hasApiKey: boolean;
  isProviderAvailable: (providerName: string) => boolean;
  resetToDefault: () => void;

  // Utilities
  refetch: () => Promise<void>;
}

export function useTileProviders(): UseTileProvidersReturn {
  const [providers, setProviders] = useState<MapTileProvider[]>([]);
  const [selected, setSelected] = useState<MapTileProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  const serviceRef = useRef<TileProviderService | null>(null);

  // Get or create service
  const getService = useCallback(() => {
    if (!serviceRef.current) {
      const supabase = createClient();
      serviceRef.current = createTileProviderService(supabase);
    }
    return serviceRef.current;
  }, []);

  // Initialize and load providers
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const service = getService();
      await service.initialize();

      setProviders(service.getProviders());
      setSelected(service.getSelectedProvider());
      setHasApiKey(service.hasApiKey());
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error('Failed to load tile providers')
      );
    } finally {
      setIsLoading(false);
    }
  }, [getService]);

  // Initial load
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Select a provider
  const selectProvider = useCallback(
    (providerName: string) => {
      const service = getService();
      service.selectProvider(providerName);
      setSelected(service.getSelectedProvider());
    },
    [getService]
  );

  // Set API key
  const setApiKey = useCallback(
    (apiKey: string | null) => {
      const service = getService();
      service.setApiKey(apiKey);
      setHasApiKey(service.hasApiKey());
      // Re-select current provider to apply key
      if (selected) {
        service.selectProvider(selected.name);
        setSelected(service.getSelectedProvider());
      }
    },
    [getService, selected]
  );

  // Check if provider is available
  const isProviderAvailable = useCallback(
    (providerName: string): boolean => {
      const service = getService();
      return service.isProviderAvailable(providerName);
    },
    [getService]
  );

  // Reset to default
  const resetToDefault = useCallback(() => {
    const service = getService();
    service.resetToDefault();
    setSelected(service.getSelectedProvider());
  }, [getService]);

  // Refetch providers
  const refetch = useCallback(async () => {
    await initialize();
  }, [initialize]);

  // Computed values
  const tileUrl = selected ? getService().getTileUrl() : DEFAULT_TILE_URL;

  const attribution = selected?.attribution ?? DEFAULT_ATTRIBUTION;
  const maxZoom = selected?.max_zoom ?? 18;
  const isCyclingOptimized = selected?.is_cycling_optimized ?? false;

  return {
    providers,
    selected,
    isLoading,
    error,
    tileUrl,
    attribution,
    maxZoom,
    isCyclingOptimized,
    selectProvider,
    setApiKey,
    hasApiKey,
    isProviderAvailable,
    resetToDefault,
    refetch,
  };
}

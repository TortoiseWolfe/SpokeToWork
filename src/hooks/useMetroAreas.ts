'use client';

/**
 * useMetroAreas Hook
 * Feature 012 - Performance Optimization
 *
 * Provides metro area data with long-term caching.
 * Metro areas rarely change, so cache is valid for 1 hour.
 *
 * @see src/lib/companies/multi-tenant-service.ts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MultiTenantCompanyService } from '@/lib/companies/multi-tenant-service';
import type { MetroArea } from '@/types/company';

// Cache configuration - metro areas rarely change
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Module-level cache for cross-component sharing
interface MetroAreaCacheEntry {
  data: MetroArea[];
  timestamp: number;
}

let metroAreasCache: MetroAreaCacheEntry | null = null;

/**
 * Check if cache is valid
 */
function isCacheValid(): boolean {
  if (!metroAreasCache) return false;
  return Date.now() - metroAreasCache.timestamp < CACHE_TTL_MS;
}

export interface UseMetroAreasReturn {
  /** List of metro areas */
  metroAreas: MetroArea[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether data is from cache */
  isFromCache: boolean;
  /** Refetch metro areas */
  refetch: () => Promise<void>;
  /** Get metro area by ID */
  getById: (id: string) => MetroArea | undefined;
  /** Invalidate cache */
  invalidateCache: () => void;
}

/**
 * Hook for managing metro area data with caching
 *
 * Metro areas are geographic regions that rarely change,
 * so aggressive caching (1 hour) improves performance.
 */
export function useMetroAreas(): UseMetroAreasReturn {
  const [metroAreas, setMetroAreas] = useState<MetroArea[]>(() => {
    if (isCacheValid()) {
      return metroAreasCache!.data;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(!isCacheValid());
  const [isFromCache, setIsFromCache] = useState(isCacheValid());
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef<MultiTenantCompanyService | null>(null);
  const isMountedRef = useRef(true);

  // Initialize service (doesn't require user auth for metro areas)
  const getService = useCallback((): MultiTenantCompanyService => {
    if (serviceRef.current) {
      return serviceRef.current;
    }

    const supabase = createClient();
    const service = new MultiTenantCompanyService(supabase);
    serviceRef.current = service;

    return service;
  }, []);

  // Fetch metro areas
  const fetchMetroAreas = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const service = getService();
      const data = await service.getMetroAreas();

      if (!isMountedRef.current) return;

      // Update cache
      metroAreasCache = {
        data,
        timestamp: Date.now(),
      };

      setMetroAreas(data);
      setIsFromCache(false);
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(
        err instanceof Error ? err : new Error('Failed to fetch metro areas')
      );
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [getService]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;

    if (isCacheValid()) {
      setMetroAreas(metroAreasCache!.data);
      setIsFromCache(true);
      setIsLoading(false);
    } else {
      fetchMetroAreas();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchMetroAreas]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    metroAreasCache = null;
  }, []);

  // Refetch
  const refetch = useCallback(async () => {
    invalidateCache();
    await fetchMetroAreas();
  }, [fetchMetroAreas, invalidateCache]);

  // Get by ID helper
  const getById = useCallback(
    (id: string): MetroArea | undefined => {
      return metroAreas.find((area) => area.id === id);
    },
    [metroAreas]
  );

  return {
    metroAreas,
    isLoading,
    error,
    isFromCache,
    refetch,
    getById,
    invalidateCache,
  };
}

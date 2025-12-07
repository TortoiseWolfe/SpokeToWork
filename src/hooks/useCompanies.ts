'use client';

/**
 * useCompanies Hook
 * Feature 012 - Performance Optimization
 *
 * Provides unified company data with caching, optimistic updates,
 * and automatic refresh on window focus.
 *
 * @see src/lib/companies/multi-tenant-service.ts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MultiTenantCompanyService } from '@/lib/companies/multi-tenant-service';
import type {
  UnifiedCompany,
  UnifiedCompanyFilters,
  UnifiedCompanySort,
  PrivateCompanyCreate,
  PrivateCompanyUpdate,
  TrackSharedCompanyCreate,
  UserCompanyTrackingUpdate,
} from '@/types/company';

// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_TTL_MS = 30 * 1000; // 30 seconds before background refresh

// Module-level cache for cross-component sharing
interface CacheEntry {
  data: UnifiedCompany[];
  timestamp: number;
  filters: string;
  sort: string;
}

let companiesCache: CacheEntry | null = null;

/**
 * Serialize filters and sort for cache key
 */
function serializeCacheKey(
  filters?: UnifiedCompanyFilters,
  sort?: UnifiedCompanySort
): { filters: string; sort: string } {
  return {
    filters: JSON.stringify(filters ?? {}),
    sort: JSON.stringify(sort ?? {}),
  };
}

/**
 * Check if cache is valid
 */
function isCacheValid(
  filters?: UnifiedCompanyFilters,
  sort?: UnifiedCompanySort
): boolean {
  if (!companiesCache) return false;

  const key = serializeCacheKey(filters, sort);
  if (
    companiesCache.filters !== key.filters ||
    companiesCache.sort !== key.sort
  ) {
    return false;
  }

  return Date.now() - companiesCache.timestamp < CACHE_TTL_MS;
}

/**
 * Check if cache is stale (valid but should refresh in background)
 */
function isCacheStale(
  filters?: UnifiedCompanyFilters,
  sort?: UnifiedCompanySort
): boolean {
  if (!companiesCache) return true;

  const key = serializeCacheKey(filters, sort);
  if (
    companiesCache.filters !== key.filters ||
    companiesCache.sort !== key.sort
  ) {
    return true;
  }

  return Date.now() - companiesCache.timestamp > STALE_TTL_MS;
}

export interface UseCompaniesOptions {
  filters?: UnifiedCompanyFilters;
  sort?: UnifiedCompanySort;
  /** Skip initial fetch (for SSR hydration) */
  skip?: boolean;
  /** Refresh on window focus */
  refetchOnFocus?: boolean;
}

export interface UseCompaniesReturn {
  /** Unified company list */
  companies: UnifiedCompany[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether data is from cache */
  isFromCache: boolean;
  /** Whether background refresh is in progress */
  isRefreshing: boolean;
  /** Refetch companies */
  refetch: () => Promise<void>;
  /** Create a private company */
  createPrivate: (data: PrivateCompanyCreate) => Promise<UnifiedCompany>;
  /** Update a private company */
  updatePrivate: (data: PrivateCompanyUpdate) => Promise<UnifiedCompany>;
  /** Delete a private company */
  deletePrivate: (id: string) => Promise<void>;
  /** Track a shared company */
  trackShared: (data: TrackSharedCompanyCreate) => Promise<void>;
  /** Update tracking */
  updateTracking: (data: UserCompanyTrackingUpdate) => Promise<void>;
  /** Stop tracking */
  stopTracking: (trackingId: string) => Promise<void>;
  /** Invalidate cache (for use after mutations) */
  invalidateCache: () => void;
}

/**
 * Hook for managing unified company data with caching
 */
export function useCompanies(
  options: UseCompaniesOptions = {}
): UseCompaniesReturn {
  const { filters, sort, skip = false, refetchOnFocus = true } = options;

  const [companies, setCompanies] = useState<UnifiedCompany[]>(() => {
    // Initialize from cache if valid
    if (isCacheValid(filters, sort)) {
      return companiesCache!.data;
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(!isCacheValid(filters, sort));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFromCache, setIsFromCache] = useState(isCacheValid(filters, sort));
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef<MultiTenantCompanyService | null>(null);
  const userIdRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  // Initialize service
  const getService =
    useCallback(async (): Promise<MultiTenantCompanyService | null> => {
      if (serviceRef.current && userIdRef.current) {
        return serviceRef.current;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const service = new MultiTenantCompanyService(supabase);
      await service.initialize(user.id);
      serviceRef.current = service;
      userIdRef.current = user.id;

      return service;
    }, []);

  // Fetch companies
  const fetchCompanies = useCallback(
    async (background = false): Promise<void> => {
      if (!isMountedRef.current) return;

      if (background) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const service = await getService();
        if (!service) {
          throw new Error('Not authenticated');
        }

        const data = await service.getUnifiedCompanies(filters, sort);

        if (!isMountedRef.current) return;

        // Update cache
        const key = serializeCacheKey(filters, sort);
        companiesCache = {
          data,
          timestamp: Date.now(),
          filters: key.filters,
          sort: key.sort,
        };

        setCompanies(data);
        setIsFromCache(false);
      } catch (err) {
        if (!isMountedRef.current) return;
        setError(
          err instanceof Error ? err : new Error('Failed to fetch companies')
        );
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [filters, sort, getService]
  );

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;

    if (skip) return;

    // If cache is valid, use it but check if stale
    if (isCacheValid(filters, sort)) {
      setCompanies(companiesCache!.data);
      setIsFromCache(true);
      setIsLoading(false);

      // Background refresh if stale
      if (isCacheStale(filters, sort)) {
        fetchCompanies(true);
      }
    } else {
      fetchCompanies(false);
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [filters, sort, skip, fetchCompanies]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnFocus || skip) return;

    const handleFocus = () => {
      if (isCacheStale(filters, sort)) {
        fetchCompanies(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnFocus, skip, filters, sort, fetchCompanies]);

  // Invalidate cache
  const invalidateCache = useCallback(() => {
    companiesCache = null;
  }, []);

  // Refetch
  const refetch = useCallback(async () => {
    invalidateCache();
    await fetchCompanies(false);
  }, [fetchCompanies, invalidateCache]);

  // Create private company with optimistic update
  const createPrivate = useCallback(
    async (data: PrivateCompanyCreate): Promise<UnifiedCompany> => {
      const service = await getService();
      if (!service) throw new Error('Not authenticated');

      const created = await service.createPrivateCompany(data);

      // Create unified representation
      const unified: UnifiedCompany = {
        source: 'private',
        tracking_id: null,
        company_id: null,
        private_company_id: created.id,
        user_id: created.user_id,
        metro_area_id: created.metro_area_id,
        name: created.name,
        website: created.website,
        careers_url: created.careers_url,
        address: created.address ?? '',
        latitude: created.latitude,
        longitude: created.longitude,
        phone: created.phone,
        email: created.email,
        contact_name: created.contact_name,
        contact_title: created.contact_title,
        notes: created.notes,
        status: created.status,
        priority: created.priority,
        follow_up_date: created.follow_up_date,
        is_active: created.is_active,
        is_verified: false,
        submit_to_shared: created.submit_to_shared,
        created_at: created.created_at,
        updated_at: created.updated_at,
      };

      // Optimistic update
      setCompanies((prev) => [...prev, unified]);
      invalidateCache();

      return unified;
    },
    [getService, invalidateCache]
  );

  // Update private company with optimistic update
  const updatePrivate = useCallback(
    async (data: PrivateCompanyUpdate): Promise<UnifiedCompany> => {
      const service = await getService();
      if (!service) throw new Error('Not authenticated');

      // Optimistic update
      setCompanies((prev) =>
        prev.map((c) => {
          if (c.private_company_id === data.id) {
            return {
              ...c,
              name: data.name ?? c.name,
              address: data.address ?? c.address,
              latitude: data.latitude ?? c.latitude,
              longitude: data.longitude ?? c.longitude,
              website: data.website ?? c.website,
              careers_url: data.careers_url ?? c.careers_url,
              phone: data.phone ?? c.phone,
              email: data.email ?? c.email,
              status: data.status ?? c.status,
              priority: data.priority ?? c.priority,
              notes: data.notes ?? c.notes,
              contact_name: data.contact_name ?? c.contact_name,
              contact_title: data.contact_title ?? c.contact_title,
              follow_up_date: data.follow_up_date ?? c.follow_up_date,
              is_active: data.is_active ?? c.is_active,
              submit_to_shared: data.submit_to_shared ?? c.submit_to_shared,
            };
          }
          return c;
        })
      );

      const updated = await service.updatePrivateCompany(data);
      invalidateCache();

      // Return unified representation
      const company = companies.find((c) => c.private_company_id === data.id);
      return {
        ...company!,
        name: updated.name,
        address: updated.address ?? '',
        latitude: updated.latitude,
        longitude: updated.longitude,
        website: updated.website,
        careers_url: updated.careers_url,
        phone: updated.phone,
        email: updated.email,
        status: updated.status,
        priority: updated.priority,
        notes: updated.notes,
        contact_name: updated.contact_name,
        contact_title: updated.contact_title,
        follow_up_date: updated.follow_up_date,
        is_active: updated.is_active,
        submit_to_shared: updated.submit_to_shared,
        updated_at: updated.updated_at,
      };
    },
    [companies, getService, invalidateCache]
  );

  // Delete private company with optimistic update
  const deletePrivate = useCallback(
    async (id: string): Promise<void> => {
      const service = await getService();
      if (!service) throw new Error('Not authenticated');

      // Optimistic update
      setCompanies((prev) => prev.filter((c) => c.private_company_id !== id));

      await service.deletePrivateCompany(id);
      invalidateCache();
    },
    [getService, invalidateCache]
  );

  // Track shared company
  const trackShared = useCallback(
    async (data: TrackSharedCompanyCreate): Promise<void> => {
      const service = await getService();
      if (!service) throw new Error('Not authenticated');

      await service.trackSharedCompany(data);
      invalidateCache();
      await fetchCompanies(false);
    },
    [getService, invalidateCache, fetchCompanies]
  );

  // Update tracking with optimistic update
  const updateTracking = useCallback(
    async (data: UserCompanyTrackingUpdate): Promise<void> => {
      const service = await getService();
      if (!service) throw new Error('Not authenticated');

      // Optimistic update
      setCompanies((prev) =>
        prev.map((c) => {
          if (c.tracking_id === data.id) {
            return {
              ...c,
              status: data.status ?? c.status,
              priority: data.priority ?? c.priority,
              notes: data.notes ?? c.notes,
              contact_name: data.contact_name ?? c.contact_name,
              contact_title: data.contact_title ?? c.contact_title,
              follow_up_date: data.follow_up_date ?? c.follow_up_date,
              is_active: data.is_active ?? c.is_active,
            };
          }
          return c;
        })
      );

      await service.updateTracking(data);
      invalidateCache();
    },
    [getService, invalidateCache]
  );

  // Stop tracking with optimistic update
  const stopTracking = useCallback(
    async (trackingId: string): Promise<void> => {
      const service = await getService();
      if (!service) throw new Error('Not authenticated');

      // Optimistic update - remove from list
      setCompanies((prev) => prev.filter((c) => c.tracking_id !== trackingId));

      await service.stopTrackingCompany(trackingId);
      invalidateCache();
    },
    [getService, invalidateCache]
  );

  return {
    companies,
    isLoading,
    error,
    isFromCache,
    isRefreshing,
    refetch,
    createPrivate,
    updatePrivate,
    deletePrivate,
    trackShared,
    updateTracking,
    stopTracking,
    invalidateCache,
  };
}

'use client';

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
/** Viewport bounding box for spatial queries. */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * One row per company_locations entry that falls inside the viewport box.
 * A shared company with two offices in view will appear twice — that's
 * what we want: one marker per physical location.
 */
export interface SharedCompanyInBounds {
  /** company_locations.id — unique per marker */
  id: string;
  shared_company_id: string;
  /** Joined from shared_companies */
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
}

export interface UseSharedCompaniesInBoundsReturn {
  companies: SharedCompanyInBounds[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Loads approved-company locations whose coordinates fall inside the
 * viewport box. Disabled while `bounds === null` (before the first map
 * moveend). Re-queries whenever bounds change.
 *
 * Uses a simple `.gte/.lte` box filter against `company_locations` —
 * the PostGIS GIST index on that table makes it cheap. No RPC, no
 * migration.
 */
export function useSharedCompaniesInBounds(
  bounds: MapBounds | null
): UseSharedCompaniesInBoundsReturn {
  const [companies, setCompanies] = useState<SharedCompanyInBounds[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Destructure so the effect's dependency array is primitives, not an
  // object identity that changes on every parent render. NaN is a safe
  // sentinel: NaN !== NaN so the dep-array check still catches null→null
  // transitions, and we never pass it to the query (early return first).
  const north = bounds?.north ?? NaN;
  const south = bounds?.south ?? NaN;
  const east = bounds?.east ?? NaN;
  const west = bounds?.west ?? NaN;
  const enabled = bounds !== null;

  useEffect(() => {
    if (!enabled) {
      setCompanies([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      // The generated Database type (src/lib/supabase/types) doesn't yet
      // include feature-012 tables (company_locations, shared_companies).
      // Same situation as the moderation service — query through the
      // generic SupabaseClient interface.
      const supabase = createClient() as SupabaseClient;
      const { data, error: qErr } = await supabase
        .from('company_locations')
        .select(
          'id, shared_company_id, latitude, longitude, address, shared_companies(name)'
        )
        .gte('latitude', south)
        .lte('latitude', north)
        .gte('longitude', west)
        .lte('longitude', east);

      if (cancelled) return;

      if (qErr) {
        setError(new Error(qErr.message));
        setCompanies([]);
        setIsLoading(false);
        return;
      }

      type Row = {
        id: string;
        shared_company_id: string;
        latitude: number;
        longitude: number;
        address: string | null;
        shared_companies: { name: string } | { name: string }[] | null;
      };

      // Generated Supabase types for select-with-join come out as a union
      // of per-table SelectQueryError shapes — cast through unknown.
      const rows = (data ?? []) as unknown as Row[];
      const mapped = rows.map((r) => {
        const joined = Array.isArray(r.shared_companies)
          ? r.shared_companies[0]
          : r.shared_companies;
        return {
          id: r.id,
          shared_company_id: r.shared_company_id,
          name: joined?.name ?? '',
          latitude: r.latitude,
          longitude: r.longitude,
          address: r.address,
        };
      });

      setCompanies(mapped);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, north, south, east, west]);

  return { companies, isLoading, error };
}

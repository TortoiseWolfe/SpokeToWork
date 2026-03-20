'use client';

/**
 * useHomeLocation
 *
 * Loads the user's home location from user_profiles and exposes a
 * persisting `save`. Extracted from CompaniesPageInner profile-load
 * effect + handleSaveHomeLocation.
 */

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { HomeLocation } from '@/types/company';

export interface UseHomeLocationReturn {
  homeLocation: HomeLocation | null;
  isLoading: boolean;
  save: (location: HomeLocation) => Promise<void>;
}

export function useHomeLocation(
  user: User | null,
  /** Called after a successful save — e.g. to refetch companies for the new metro. */
  onSaved?: () => Promise<void>
): UseHomeLocationReturn {
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select(
            'home_address, home_latitude, home_longitude, distance_radius_miles'
          )
          .eq('id', user.id)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        if (
          !cancelled &&
          data?.home_address &&
          data?.home_latitude &&
          data?.home_longitude
        ) {
          setHomeLocation({
            address: data.home_address,
            latitude: data.home_latitude,
            longitude: data.home_longitude,
            radius_miles: data.distance_radius_miles || 20,
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const save = useCallback(
    async (location: HomeLocation) => {
      if (!user) return;
      const { error } = await supabase.from('user_profiles').upsert({
        id: user.id,
        home_address: location.address,
        home_latitude: location.latitude,
        home_longitude: location.longitude,
        distance_radius_miles: location.radius_miles,
      });
      if (error) {
        console.error('Supabase error saving home location:', error);
        throw new Error(error.message || 'Failed to save home location');
      }
      setHomeLocation(location);
      if (onSaved) await onSaved();
    },
    [user, onSaved]
  );

  return { homeLocation, isLoading, save };
}

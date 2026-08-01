/**
 * useUserProfile Hook
 * Feature: 034-fix-broken-user
 *
 * Fetches current user's profile from user_profiles, merged with their private
 * home location from user_home_locations.
 *
 * The two live in separate tables on purpose: user_profiles is readable by any
 * authenticated user (friend search / worker discovery) and RLS cannot restrict
 * columns, so a home address stored there would be world-readable. The merge
 * here is for the CURRENT user only — both queries are scoped to their own id.
 */

import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

const logger = createLogger('hooks:userProfile');

export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  // Home location (Feature 041 - Route Planning). Sourced from
  // user_home_locations, not user_profiles — see the file header.
  home_address: string | null;
  home_latitude: number | null;
  home_longitude: number | null;
  distance_radius_miles: number | null;
  created_at: string;
  updated_at: string;
}

interface UseUserProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUserProfile(): UseUserProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        // PGRST116 means no rows found - not an error for new users
        if (fetchError.code === 'PGRST116') {
          setProfile(null);
        } else {
          logger.error('Error fetching user profile', { error: fetchError });
          setError('Failed to load profile');
        }
      } else {
        // Own home location, from its own table. A missing row is normal
        // (the user simply has not set one), so PGRST116 is not an error.
        const { data: home, error: homeError } = await supabase
          .from('user_home_locations')
          .select(
            'home_address, home_latitude, home_longitude, distance_radius_miles'
          )
          .eq('user_id', user.id)
          .maybeSingle();

        if (homeError) {
          logger.error('Error fetching home location', { error: homeError });
        }

        setProfile({
          ...(data as unknown as Omit<
            UserProfile,
            | 'home_address'
            | 'home_latitude'
            | 'home_longitude'
            | 'distance_radius_miles'
          >),
          home_address: home?.home_address ?? null,
          home_latitude: home?.home_latitude ?? null,
          home_longitude: home?.home_longitude ?? null,
          distance_radius_miles: home?.distance_radius_miles ?? null,
        });
      }
    } catch (err) {
      logger.error('Error in useUserProfile', { error: err });
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
  };
}

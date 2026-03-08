'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';

export interface AdminGate {
  /** True until auth has settled AND the profile lookup has resolved. */
  isLoading: boolean;
  /** True iff user_profiles.is_admin is true for the current user. */
  isAdmin: boolean;
}

/**
 * Gates admin pages. Redirects to /sign-in if unauthenticated.
 * Does NOT load domain data — that's the caller's job, gated on isAdmin.
 *
 * Consumer pattern:
 *   const gate = useAdminGate();
 *   if (gate.isLoading) return <Spinner />;
 *   if (!gate.isAdmin) return <AccessDenied />;
 *   // admin-only render
 *
 * Stays loading during redirect — prevents a flash of access-denied
 * before navigation completes.
 */
export function useAdminGate(): AdminGate {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/sign-in');
      return;
    }

    // Reset on identity change — don't leak the previous user's isAdmin
    // across the re-fetch window.
    setChecked(false);
    setIsAdmin(false);

    let cancelled = false;
    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        // PGRST116 = no row. Any other error falls through to isAdmin=false.
        if (error && error.code !== 'PGRST116') {
          console.error('Admin gate profile lookup failed:', error);
        }
        setIsAdmin((data as { is_admin?: boolean } | null)?.is_admin ?? false);
        setChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  return { isLoading: authLoading || !checked, isAdmin };
}

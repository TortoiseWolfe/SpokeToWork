'use client';

/**
 * useAdminUsers — calls admin_list_users RPC (Feature 067). Gated
 * server-side by jwt_is_admin() so non-admins get a 42501 error even if
 * they reach this hook. Shape mirrors useRouteAnalytics: single state
 * object, cancellation flag, untyped SupabaseClient cast.
 */

import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

// admin_list_users RPC not in generated Database type — cast to untyped.
const db = supabase as SupabaseClient;

export interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  role: 'worker' | 'employer' | 'admin';
  is_admin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  company_names: string[];
}

export interface AdminUsers {
  users: AdminUser[];
  isLoading: boolean;
  error: Error | null;
}

export function useAdminUsers(): AdminUsers {
  const [state, setState] = useState<AdminUsers>({
    users: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    db.rpc('admin_list_users').then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setState({
          users: [],
          isLoading: false,
          error: new Error(error.message),
        });
        return;
      }
      setState({
        users: (data as AdminUser[]) ?? [],
        isLoading: false,
        error: null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

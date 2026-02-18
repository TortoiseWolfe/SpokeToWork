'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import EmployerDashboard from '@/components/organisms/EmployerDashboard';
import ApplicationToast from '@/components/atomic/ApplicationToast';
import { useEmployerApplications } from '@/hooks/useEmployerApplications';

/**
 * Employer Dashboard Page
 *
 * Protected route gated by user role. Shows applications
 * to the employer's linked companies with realtime notifications.
 *
 * @see specs/063-employer-dashboard/spec.md
 */
export default function EmployerPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);

  const {
    applications,
    loading,
    error,
    newApplicationAlert,
    dismissAlert,
    updateStatus,
    refresh,
  } = useEmployerApplications();

  // Check user role
  useEffect(() => {
    async function checkRole() {
      if (!user) {
        router.push('/sign-in');
        return;
      }

      const { createClient } = await import('@/lib/supabase/client');
      // Cast to untyped — 'role' column not yet in generated Database types
      const supabase =
        createClient() as unknown as import('@supabase/supabase-js').SupabaseClient;
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'employer') {
        router.push('/');
        return;
      }

      setRole(profile.role);
      setCheckingRole(false);
    }
    checkRole();
  }, [user, router]);

  if (checkingRole || !role) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <>
      <ApplicationToast
        application={newApplicationAlert}
        onDismiss={dismissAlert}
      />
      <div className="container mx-auto px-4 py-6">
        <h1 className="mb-6 text-2xl font-bold">Employer Dashboard</h1>
        <EmployerDashboard
          applications={applications}
          loading={loading}
          error={error}
          onUpdateStatus={updateStatus}
          onRefresh={refresh}
        />
      </div>
    </>
  );
}

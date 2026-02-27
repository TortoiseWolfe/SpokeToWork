'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import EmployerDashboard from '@/components/organisms/EmployerDashboard';
import ApplicationToast from '@/components/atomic/ApplicationToast';
import TeamPanel, {
  type TeamPanelConnection,
} from '@/components/molecular/TeamPanel';
import { useEmployerApplications } from '@/hooks/useEmployerApplications';
import { useEmployerTeam } from '@/hooks/useEmployerTeam';
import { createClient } from '@/lib/supabase/client';

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
    companyIds,
    newApplicationAlert,
    dismissAlert,
    updateStatus,
    refresh,
    statusCounts,
    totalCount,
    repeatUserIds,
    hasMore,
    loadingMore,
    loadMore,
  } = useEmployerApplications();

  // Team management — use first linked company (multi-company selector is YAGNI).
  const companyId = companyIds[0] ?? null;
  const { members, addMember, removeMember } = useEmployerTeam(companyId);

  // Fetch accepted connections inline (MVP — no dedicated hook).
  const [connections, setConnections] = useState<TeamPanelConnection[]>([]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient() as unknown as SupabaseClient;
    (async () => {
      const { data } = await supabase
        .from('user_connections')
        .select(
          `
          requester_id,
          addressee_id,
          requester:user_profiles!user_connections_requester_id_fkey(id, display_name, avatar_url),
          addressee:user_profiles!user_connections_addressee_id_fkey(id, display_name, avatar_url)
        `
        )
        .eq('status', 'accepted');

      type JoinedProfile = {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
      };
      const mapped: TeamPanelConnection[] = (data ?? []).map((c) => {
        const isRequester = c.requester_id === user.id;
        // Cast to unknown first — Supabase's fkey join types are complex.
        // Same pattern as useGroupMembers.ts:110.
        const p = (isRequester
          ? c.addressee
          : c.requester) as unknown as JoinedProfile;
        return {
          user_id: p.id,
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        };
      });
      setConnections(mapped);
    })();
  }, [user]);

  // Connections eligible to add = not already on the team.
  const availableConnections = useMemo(
    () =>
      connections.filter((c) => !members.some((m) => m.user_id === c.user_id)),
    [connections, members]
  );

  // Check user role
  useEffect(() => {
    async function checkRole() {
      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Cast to untyped — 'role' column not yet in generated Database types
      const supabase = createClient() as unknown as SupabaseClient;
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
        {companyId && user && (
          <div className="mb-6">
            <TeamPanel
              members={members}
              availableConnections={availableConnections}
              currentUserId={user.id}
              onRemove={removeMember}
              onAdd={addMember}
            />
          </div>
        )}
        <EmployerDashboard
          applications={applications}
          loading={loading}
          error={error}
          onUpdateStatus={updateStatus}
          onRefresh={refresh}
          statusCounts={statusCounts}
          totalCount={totalCount}
          repeatUserIds={repeatUserIds}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      </div>
    </>
  );
}

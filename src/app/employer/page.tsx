'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import EmployerDashboard from '@/components/organisms/EmployerDashboard';
import ApplicationDetailDrawer from '@/components/molecular/ApplicationDetailDrawer';
import ApplicationToast from '@/components/atomic/ApplicationToast';
import TeamPanel, {
  type TeamPanelConnection,
} from '@/components/molecular/TeamPanel';
import ConnectionManager from '@/components/organisms/ConnectionManager';
import WeekScheduleGrid from '@/components/organisms/WeekScheduleGrid';
import ShiftEditorDrawer from '@/components/molecular/ShiftEditorDrawer';
import MemberScheduleDrawer from '@/components/molecular/MemberScheduleDrawer';
import { useEmployerApplications } from '@/hooks/useEmployerApplications';
import type { EmployerApplication } from '@/hooks/useEmployerApplications';
import { useEmployerTeam } from '@/hooks/useEmployerTeam';
import type { TeamMember } from '@/hooks/useEmployerTeam';
import { useTeamSchedule } from '@/hooks/useTeamSchedule';
import type { TeamShift, ShiftUpsert } from '@/types/schedule';
import { createClient } from '@/lib/supabase/client';
import type { JobApplicationStatus } from '@/types/company';

type Tab = 'applications' | 'team' | 'schedule';

/**
 * Employer Dashboard Page
 *
 * Protected route gated by user role. Tabbed layout:
 * Schedule | Team | Applications (HR priority order)
 *
 * @see specs/063-employer-dashboard/spec.md
 */
export default function EmployerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [checkingRole, setCheckingRole] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('schedule');
  const [selectedApp, setSelectedApp] = useState<EmployerApplication | null>(
    null
  );
  const [drawerUpdating, setDrawerUpdating] = useState(false);

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
    hireApplicant,
  } = useEmployerApplications();

  const companyId = companyIds[0] ?? null;
  const {
    members,
    loading: teamLoading,
    error: teamError,
    addMember,
    removeMember,
    refetch: refreshTeam,
  } = useEmployerTeam(companyId);

  // Fetch accepted connections for TeamPanel
  const [connections, setConnections] = useState<TeamPanelConnection[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchAcceptedConnections = useCallback(async () => {
    if (!user) return;
    const supabase = createClient() as unknown as SupabaseClient;
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
  }, [user]);

  useEffect(() => {
    void fetchAcceptedConnections();
  }, [fetchAcceptedConnections]);

  // Refresh accepted connections whenever pending count changes
  // (fires when a connection is accepted/declined/removed)
  const handlePendingCountChange = useCallback(
    (count: number) => {
      setPendingCount((prev) => {
        if (prev !== count) {
          // Connection state changed — refresh accepted list for TeamPanel
          void fetchAcceptedConnections();
        }
        return count;
      });
    },
    [fetchAcceptedConnections]
  );

  const availableConnections = useMemo(
    () =>
      connections.filter((c) => !members.some((m) => m.user_id === c.user_id)),
    [connections, members]
  );

  // Drawer: advance status from detail view
  const handleDrawerAdvance = useCallback(
    async (applicationId: string, status: JobApplicationStatus) => {
      setDrawerUpdating(true);
      try {
        await updateStatus(applicationId, status);
        setSelectedApp((prev) =>
          prev && prev.id === applicationId ? { ...prev, status } : prev
        );
      } finally {
        setDrawerUpdating(false);
      }
    },
    [updateStatus]
  );

  const [drawerHiring, setDrawerHiring] = useState(false);

  const handleHire = useCallback(
    async (applicationId: string) => {
      setDrawerHiring(true);
      try {
        await hireApplicant(applicationId);
        setSelectedApp((prev) =>
          prev && prev.id === applicationId
            ? { ...prev, outcome: 'hired' as const, status: 'closed' as const }
            : prev
        );
        // Refresh team + connections so TeamPanel shows the new member
        await Promise.all([refreshTeam(), fetchAcceptedConnections()]);
      } finally {
        setDrawerHiring(false);
      }
    },
    [hireApplicant, refreshTeam, fetchAcceptedConnections]
  );

  const handleTableAdvance = useCallback(
    async (applicationId: string, status: JobApplicationStatus) => {
      await updateStatus(applicationId, status);
    },
    [updateStatus]
  );

  // Schedule: workforce shift management
  const {
    shifts,
    loading: scheduleLoading,
    error: scheduleError,
    weekStart,
    prevWeek,
    nextWeek,
    goToDate,
    businessHours,
    upsertShift,
    deleteShift,
    updateBusinessHours,
    copyWeekShifts,
    batchCreateShifts,
    refetch: refreshSchedule,
  } = useTeamSchedule(companyId);

  // Shift editor state
  const [editingShift, setEditingShift] = useState<TeamShift | null>(null);
  const [newShiftDefaults, setNewShiftDefaults] = useState<{
    date?: string;
    userId?: string;
  } | null>(null);
  const [shiftSaving, setShiftSaving] = useState(false);

  const handleAddShift = useCallback((date: string, userId?: string) => {
    setEditingShift(null);
    setNewShiftDefaults({ date, userId });
  }, []);

  const handleEditShift = useCallback((shift: TeamShift) => {
    setNewShiftDefaults(null);
    setEditingShift(shift);
  }, []);

  const handleSaveShift = useCallback(
    async (data: ShiftUpsert) => {
      setShiftSaving(true);
      try {
        await upsertShift(data);
        setEditingShift(null);
        setNewShiftDefaults(null);
      } finally {
        setShiftSaving(false);
      }
    },
    [upsertShift]
  );

  const handleDeleteShift = useCallback(
    async (shiftId: string) => {
      await deleteShift(shiftId);
      setEditingShift(null);
      setNewShiftDefaults(null);
    },
    [deleteShift]
  );

  const handleCloseShiftEditor = useCallback(() => {
    setEditingShift(null);
    setNewShiftDefaults(null);
  }, []);

  const handleCopyLastWeek = useCallback(async () => {
    const prevWeekStart = (() => {
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      return d.toISOString().slice(0, 10);
    })();
    return copyWeekShifts(prevWeekStart);
  }, [weekStart, copyWeekShifts]);

  // Member schedule drawer state
  const [scheduleMember, setScheduleMember] = useState<TeamMember | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const handleSetSchedule = useCallback((member: TeamMember) => {
    // Close other drawers first
    setEditingShift(null);
    setNewShiftDefaults(null);
    setScheduleMember(member);
  }, []);

  const memberShiftsForDrawer = useMemo(
    () =>
      scheduleMember
        ? shifts.filter((s) => s.user_id === scheduleMember.user_id)
        : [],
    [scheduleMember, shifts]
  );

  const handleBatchSave = useCallback(
    async (entries: ShiftUpsert[]) => {
      if (!scheduleMember) return;
      setScheduleSaving(true);
      try {
        await batchCreateShifts(scheduleMember.user_id, entries);
        setScheduleMember(null);
      } finally {
        setScheduleSaving(false);
      }
    },
    [scheduleMember, batchCreateShifts]
  );

  // Check user role
  useEffect(() => {
    async function checkRole() {
      if (authLoading) return;
      if (!user) {
        router.push('/sign-in');
        return;
      }

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
  }, [user, authLoading, router]);

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
      <ApplicationDetailDrawer
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        onAdvance={handleDrawerAdvance}
        updating={drawerUpdating}
        onHire={handleHire}
        hiring={drawerHiring}
      />
      <div className="container mx-auto px-4 py-6" data-print-schedule>
        <h1 className="mb-6 text-2xl font-bold">Employer Dashboard</h1>

        {/* Tab Navigation — HR priority order: Schedule | Team | Applications */}
        <div
          role="tablist"
          className="tabs tabs-bordered mb-6"
          aria-label="Dashboard sections"
        >
          <button
            role="tab"
            className={`tab min-h-11 ${activeTab === 'schedule' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('schedule')}
            aria-selected={activeTab === 'schedule'}
          >
            Schedule
            {shifts.length > 0 && (
              <span className="badge badge-sm ml-2">{shifts.length}</span>
            )}
          </button>
          <button
            role="tab"
            className={`tab min-h-11 ${activeTab === 'team' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('team')}
            aria-selected={activeTab === 'team'}
          >
            Team
            {(members.length > 0 || pendingCount > 0) && (
              <span className="badge badge-sm ml-2">
                {members.length}
                {pendingCount > 0 && (
                  <span className="text-warning ml-1">+{pendingCount}</span>
                )}
              </span>
            )}
          </button>
          <button
            role="tab"
            className={`tab min-h-11 ${activeTab === 'applications' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('applications')}
            aria-selected={activeTab === 'applications'}
          >
            Applications
            {totalCount !== undefined && totalCount > 0 && (
              <span className="badge badge-sm ml-2">{totalCount}</span>
            )}
          </button>
        </div>

        {/* Tab Content — order matches tab buttons */}
        {activeTab === 'schedule' && (
          <>
            <MemberScheduleDrawer
              member={scheduleMember}
              existingShifts={memberShiftsForDrawer}
              weekStart={weekStart}
              businessHours={businessHours}
              onSave={handleBatchSave}
              onClose={() => setScheduleMember(null)}
              saving={scheduleSaving}
            />
            <ShiftEditorDrawer
              shift={editingShift}
              defaultDate={newShiftDefaults?.date}
              defaultUserId={newShiftDefaults?.userId}
              members={members}
              onSave={handleSaveShift}
              onDelete={handleDeleteShift}
              onClose={handleCloseShiftEditor}
              saving={shiftSaving}
            />
            <WeekScheduleGrid
              shifts={shifts}
              members={members}
              weekStart={weekStart}
              loading={scheduleLoading}
              error={scheduleError}
              businessHours={businessHours}
              onPrevWeek={prevWeek}
              onNextWeek={nextWeek}
              onToday={() => goToDate(new Date().toISOString().slice(0, 10))}
              onAddShift={handleAddShift}
              onEditShift={handleEditShift}
              onRefresh={refreshSchedule}
              onUpdateBusinessHours={updateBusinessHours}
              onCopyLastWeek={handleCopyLastWeek}
              onSetSchedule={handleSetSchedule}
            />
          </>
        )}

        {activeTab === 'team' && (
          <div className="space-y-6">
            {companyId && user && (
              <TeamPanel
                members={members}
                availableConnections={availableConnections}
                currentUserId={user.id}
                onRemove={removeMember}
                onAdd={addMember}
              />
            )}

            {companyId && teamLoading && (
              <div className="flex justify-center py-8">
                <span
                  className="loading loading-spinner loading-md"
                  role="status"
                  aria-label="Loading team"
                />
              </div>
            )}
            {companyId && teamError && (
              <div className="alert alert-error" role="alert">
                <span>{teamError}</span>
                <button
                  onClick={refreshTeam}
                  className="btn btn-sm btn-ghost min-h-11 min-w-11"
                >
                  Retry
                </button>
              </div>
            )}

            <ConnectionManager
              onPendingConnectionCountChange={handlePendingCountChange}
            />

            {!companyId && (
              <div className="text-base-content/60 py-12 text-center">
                No company linked. Contact support to set up your company.
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <EmployerDashboard
            applications={applications}
            loading={loading}
            error={error}
            onUpdateStatus={handleTableAdvance}
            onRefresh={refresh}
            statusCounts={statusCounts}
            totalCount={totalCount}
            repeatUserIds={repeatUserIds}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            onSelectApplication={setSelectedApp}
          />
        )}
      </div>
    </>
  );
}

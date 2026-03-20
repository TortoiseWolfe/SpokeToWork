'use client';

/**
 * Admin moderation — split workspace. ModerationMap + AdminModerationQueue
 * in SplitWorkspaceLayout. Clicking a pending marker opens
 * ModerationDetailPanel. Mutations go through useModerationQueue, which
 * drops items from local state so markers vanish without a refetch.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useModerationQueue } from '@/hooks/useModerationQueue';
import { usePendingMarkers } from '@/hooks/usePendingMarkers';
import { useApprovedMarkers } from '@/hooks/useApprovedMarkers';
import { useFullscreenWorkspace } from '@/hooks/useFullscreenWorkspace';
import { SplitWorkspaceLayout } from '@/components/templates/SplitWorkspaceLayout';
import { ModerationMap } from '@/components/organisms/ModerationMap';
import { ModerationDetailPanel } from '@/components/organisms/ModerationDetailPanel';
import AdminModerationQueue from '@/components/organisms/AdminModerationQueue';
import { BottomSheet } from '@/components/molecular/BottomSheet';

export default function AdminModerationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const q = useModerationQueue(user);
  const pendingMarkers = usePendingMarkers(q.items);
  const approvedMarkers = useApprovedMarkers(q.nearbyLocations);

  const selected = useMemo(
    () =>
      q.items.find((i) => i.id === selectedId && i.type === 'contribution') ??
      null,
    [q.items, selectedId]
  );

  const ready = !authLoading && !q.isLoading && q.isAdmin;
  useFullscreenWorkspace(containerRef, ready);
  useEffect(() => {
    if (!authLoading && !user) router.push('/sign-in');
  }, [user, authLoading, router]);
  useEffect(() => {
    // Auto-close panel when the item leaves the queue (optimistic drop).
    if (selectedId && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  if (authLoading || q.isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  if (!user) return null;
  if (!q.isAdmin)
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-error">
          <span>Access denied. Admin privileges required.</span>
        </div>
      </div>
    );

  const edits = q.items.filter((i) => i.type === 'edit_suggestion').length;
  const contribs = q.items.length - edits;

  const queue = (
    <div className="container mx-auto space-y-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">Moderation Queue</h1>
        <p className="text-base-content/85 text-sm">
          Review company contributions and edit suggestions.
        </p>
      </header>
      {q.success && (
        <div className="alert alert-success">
          <span>{q.success}</span>
        </div>
      )}
      {q.error && (
        <div className="alert alert-error">
          <span>{q.error}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={q.clearError}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="stats w-full shadow">
        <div className="stat">
          <div className="stat-title">Pending</div>
          <div className="stat-value">{q.items.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Contributions</div>
          <div className="stat-value text-primary">{contribs}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Edits</div>
          <div className="stat-value text-secondary">{edits}</div>
        </div>
      </div>
      <AdminModerationQueue
        items={q.items}
        onApproveContribution={q.approveContribution}
        onRejectContribution={q.rejectContribution}
        onMergeContribution={q.mergeContribution}
        onApproveEdit={q.approveEdit}
        onRejectEdit={q.rejectEdit}
      />
    </div>
  );

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      <SplitWorkspaceLayout
        table={queue}
        map={
          <ModerationMap
            pendingMarkers={pendingMarkers}
            approvedMarkers={approvedMarkers}
            selectedContributionId={selectedId}
            onSelectPending={setSelectedId}
          />
        }
        mobileSheet={
          <BottomSheet initialSnap="half" ariaLabel="Moderation queue">
            {queue}
          </BottomSheet>
        }
      />
      {selected && (
        <ModerationDetailPanel
          contribution={selected}
          nearbyLocations={q.nearbyLocations}
          onApprove={q.approveContribution}
          onReject={q.rejectContribution}
          onMerge={q.mergeContribution}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

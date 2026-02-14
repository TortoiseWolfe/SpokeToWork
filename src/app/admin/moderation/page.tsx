'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import AdminModerationQueue from '@/components/organisms/AdminModerationQueue';
import { AdminModerationService } from '@/lib/companies/admin-moderation-service';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';
import { supabase } from '@/lib/supabase/client';

export default function AdminModerationPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check admin status and load queue
  useEffect(() => {
    async function checkAdminAndLoad() {
      if (!user) return;

      try {
        // Check if user is admin
        // Note: is_admin column added in Feature 012 migration
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        // Cast to access is_admin field (added in Feature 012 migration)
        const isAdminUser =
          (profile as { is_admin?: boolean } | null)?.is_admin ?? false;
        if (!isAdminUser) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        setIsAdmin(true);

        // Initialize service and load queue
        const service = new AdminModerationService(supabase);
        await service.initialize(user.id);
        const items = await service.getPendingQueue();
        setQueueItems(items);
      } catch (err) {
        console.error('Error loading moderation queue:', err);
        setError('Failed to load moderation queue');
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      if (!user) {
        router.push('/sign-in');
      } else {
        checkAdminAndLoad();
      }
    }
  }, [user, authLoading, router]);

  // Refresh queue
  const refreshQueue = useCallback(async () => {
    if (!user) return;

    try {
      const service = new AdminModerationService(supabase);
      await service.initialize(user.id);
      const items = await service.getPendingQueue();
      setQueueItems(items);
    } catch (err) {
      console.error('Error refreshing queue:', err);
    }
  }, [user]);

  // Handle approve contribution
  const handleApproveContribution = useCallback(
    async (contributionId: string, notes?: string) => {
      if (!user) return;

      try {
        setError(null);
        const service = new AdminModerationService(supabase);
        await service.initialize(user.id);
        await service.approveContribution(contributionId, notes);
        setSuccessMessage('Contribution approved successfully');
        await refreshQueue();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error('Error approving contribution:', err);
        setError('Failed to approve contribution');
      }
    },
    [user, refreshQueue]
  );

  // Handle reject contribution
  const handleRejectContribution = useCallback(
    async (contributionId: string, notes: string) => {
      if (!user) return;

      try {
        setError(null);
        const service = new AdminModerationService(supabase);
        await service.initialize(user.id);
        await service.rejectContribution(contributionId, notes);
        setSuccessMessage('Contribution rejected');
        await refreshQueue();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error('Error rejecting contribution:', err);
        setError('Failed to reject contribution');
      }
    },
    [user, refreshQueue]
  );

  // Handle merge contribution
  const handleMergeContribution = useCallback(
    async (contributionId: string, existingCompanyId: string) => {
      if (!user) return;

      try {
        setError(null);
        const service = new AdminModerationService(supabase);
        await service.initialize(user.id);
        await service.mergeContribution(contributionId, existingCompanyId);
        setSuccessMessage('Contribution merged successfully');
        await refreshQueue();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error('Error merging contribution:', err);
        setError('Failed to merge contribution');
      }
    },
    [user, refreshQueue]
  );

  // Handle approve edit suggestion
  const handleApproveEdit = useCallback(
    async (suggestionId: string, notes?: string) => {
      if (!user) return;

      try {
        setError(null);
        const service = new AdminModerationService(supabase);
        await service.initialize(user.id);
        await service.approveEditSuggestion(suggestionId, notes);
        setSuccessMessage('Edit approved and applied');
        await refreshQueue();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error('Error approving edit:', err);
        setError('Failed to approve edit');
      }
    },
    [user, refreshQueue]
  );

  // Handle reject edit suggestion
  const handleRejectEdit = useCallback(
    async (suggestionId: string, notes: string) => {
      if (!user) return;

      try {
        setError(null);
        const service = new AdminModerationService(supabase);
        await service.initialize(user.id);
        await service.rejectEditSuggestion(suggestionId, notes);
        setSuccessMessage('Edit suggestion rejected');
        await refreshQueue();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        console.error('Error rejecting edit:', err);
        setError('Failed to reject edit');
      }
    },
    [user, refreshQueue]
  );

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex min-h-[50vh] items-center justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </div>
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-error">
          <span>Access denied. Admin privileges required.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Moderation Queue</h1>
        <p className="text-base-content/85 mt-2">
          Review and approve company contributions and edit suggestions.
        </p>
      </header>

      {/* Success message */}
      {successMessage && (
        <div className="alert alert-success mb-4">
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Queue stats */}
      <div className="stats mb-6 shadow">
        <div className="stat">
          <div className="stat-title">Pending Items</div>
          <div className="stat-value">{queueItems.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Contributions</div>
          <div className="stat-value text-primary">
            {queueItems.filter((item) => item.type === 'contribution').length}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Edit Suggestions</div>
          <div className="stat-value text-secondary">
            {
              queueItems.filter((item) => item.type === 'edit_suggestion')
                .length
            }
          </div>
        </div>
      </div>

      {/* Moderation queue */}
      <AdminModerationQueue
        items={queueItems}
        isLoading={isLoading}
        onApproveContribution={handleApproveContribution}
        onRejectContribution={handleRejectContribution}
        onMergeContribution={handleMergeContribution}
        onApproveEdit={handleApproveEdit}
        onRejectEdit={handleRejectEdit}
      />
    </div>
  );
}

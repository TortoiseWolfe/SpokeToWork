'use client';

import React, { useState } from 'react';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';

export interface AdminModerationQueueProps {
  /** Pending moderation queue items */
  items: ModerationQueueItem[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when contribution is approved */
  onApproveContribution?: (id: string, notes?: string) => Promise<void>;
  /** Callback when contribution is rejected */
  onRejectContribution?: (id: string, notes: string) => Promise<void>;
  /** Callback when contribution is merged with existing */
  onMergeContribution?: (
    id: string,
    existingCompanyId: string
  ) => Promise<void>;
  /** Callback when edit suggestion is approved */
  onApproveEdit?: (id: string, notes?: string) => Promise<void>;
  /** Callback when edit suggestion is rejected */
  onRejectEdit?: (id: string, notes: string) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  testId?: string;
}

/**
 * AdminModerationQueue component
 *
 * Displays pending company contributions and edit suggestions for admin review.
 * Admins can approve, reject, or merge contributions with existing companies.
 *
 * @category organisms
 */
export default function AdminModerationQueue({
  items,
  isLoading = false,
  onApproveContribution,
  onRejectContribution,
  onMergeContribution,
  onApproveEdit,
  onRejectEdit,
  className = '',
  testId = 'admin-moderation-queue',
}: AdminModerationQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (item: ModerationQueueItem) => {
    setProcessingId(item.id);
    try {
      if (item.type === 'contribution') {
        await onApproveContribution?.(item.id);
      } else {
        await onApproveEdit?.(item.id);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (item: ModerationQueueItem) => {
    if (!rejectNotes.trim()) {
      return;
    }
    setProcessingId(item.id);
    try {
      if (item.type === 'contribution') {
        await onRejectContribution?.(item.id, rejectNotes);
      } else {
        await onRejectEdit?.(item.id, rejectNotes);
      }
      setRejectNotes('');
      setExpandedId(null);
    } finally {
      setProcessingId(null);
    }
  };

  const contributions = items.filter((item) => item.type === 'contribution');
  const editSuggestions = items.filter(
    (item) => item.type === 'edit_suggestion'
  );

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center p-8 ${className}`}
        data-testid={testId}
      >
        <span
          className="loading loading-spinner loading-lg"
          role="status"
          aria-label="Loading moderation queue"
        />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className={`card bg-base-200 p-8 text-center ${className}`}
        data-testid={testId}
      >
        <p className="text-base-content/85">No pending items to review.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid={testId}>
      {/* Contributions Section */}
      {contributions.length > 0 && (
        <section aria-labelledby="contributions-heading">
          <h2 id="contributions-heading" className="mb-4 text-xl font-bold">
            Company Contributions ({contributions.length})
          </h2>
          <div className="space-y-3">
            {contributions.map((item) => (
              <div
                key={item.id}
                className="card bg-base-100 border-base-300 border shadow-sm"
                data-testid={`contribution-${item.id}`}
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {item.private_company_name}
                      </h3>
                      <p className="text-base-content/85 text-sm">
                        Submitted{' '}
                        {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprove(item)}
                        disabled={processingId === item.id}
                        aria-label={`Approve ${item.private_company_name}`}
                      >
                        {processingId === item.id ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          'Approve'
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-error btn-sm"
                        onClick={() =>
                          setExpandedId(expandedId === item.id ? null : item.id)
                        }
                        disabled={processingId === item.id}
                        aria-label={`Reject ${item.private_company_name}`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  {expandedId === item.id && (
                    <div className="mt-4 space-y-2">
                      <textarea
                        className="textarea textarea-bordered w-full"
                        placeholder="Reason for rejection (required)"
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        rows={2}
                        aria-label="Rejection reason"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setExpandedId(null);
                            setRejectNotes('');
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-error btn-sm"
                          onClick={() => handleReject(item)}
                          disabled={
                            !rejectNotes.trim() || processingId === item.id
                          }
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit Suggestions Section */}
      {editSuggestions.length > 0 && (
        <section aria-labelledby="edits-heading">
          <h2 id="edits-heading" className="mb-4 text-xl font-bold">
            Edit Suggestions ({editSuggestions.length})
          </h2>
          <div className="space-y-3">
            {editSuggestions.map((item) => (
              <div
                key={item.id}
                className="card bg-base-100 border-base-300 border shadow-sm"
                data-testid={`edit-${item.id}`}
              >
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {item.shared_company_name}
                      </h3>
                      <p className="text-base-content/85 text-sm">
                        Field:{' '}
                        <span className="font-medium">{item.field_name}</span>
                      </p>
                      <div className="mt-1 text-sm">
                        <span className="text-error line-through">
                          {item.old_value || '(empty)'}
                        </span>
                        {' → '}
                        <span className="text-success">{item.new_value}</span>
                      </div>
                      {item.reason && (
                        <p className="text-base-content/85 mt-1 text-sm">
                          Reason: {item.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={() => handleApprove(item)}
                        disabled={processingId === item.id}
                        aria-label={`Approve edit for ${item.shared_company_name}`}
                      >
                        {processingId === item.id ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          'Approve'
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-error btn-sm"
                        onClick={() =>
                          setExpandedId(expandedId === item.id ? null : item.id)
                        }
                        disabled={processingId === item.id}
                        aria-label={`Reject edit for ${item.shared_company_name}`}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                  {expandedId === item.id && (
                    <div className="mt-4 space-y-2">
                      <textarea
                        className="textarea textarea-bordered w-full"
                        placeholder="Reason for rejection (required)"
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        rows={2}
                        aria-label="Rejection reason"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setExpandedId(null);
                            setRejectNotes('');
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-error btn-sm"
                          onClick={() => handleReject(item)}
                          disabled={
                            !rejectNotes.trim() || processingId === item.id
                          }
                        >
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

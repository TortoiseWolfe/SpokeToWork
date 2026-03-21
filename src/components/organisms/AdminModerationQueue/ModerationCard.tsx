import React from 'react';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';

interface ModerationCardProps {
  item: ModerationQueueItem;
  isSelected: boolean;
  isExpanded: boolean;
  isProcessing: boolean;
  isClickable: boolean;
  rejectNotes: string;
  onItemClick: () => void;
  onApprove: () => void;
  onToggleExpand: () => void;
  onRejectNotesChange: (value: string) => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
}

export function ModerationCard({
  item,
  isSelected,
  isExpanded,
  isProcessing,
  isClickable,
  rejectNotes,
  onItemClick,
  onApprove,
  onToggleExpand,
  onRejectNotesChange,
  onConfirmReject,
  onCancelReject,
}: ModerationCardProps) {
  const testIdPrefix = item.type === 'contribution' ? 'contribution' : 'edit';
  const approveLabel =
    item.type === 'contribution'
      ? `Approve ${item.private_company_name}`
      : `Approve edit for ${item.shared_company_name}`;
  const rejectLabel =
    item.type === 'contribution'
      ? `Reject ${item.private_company_name}`
      : `Reject edit for ${item.shared_company_name}`;

  return (
    <div
      data-item-id={item.id}
      className={`card bg-base-100 border-base-300 border shadow-sm${isSelected ? 'ring-primary ring-2' : ''}${isClickable ? 'cursor-pointer' : ''}`}
      data-testid={`${testIdPrefix}-${item.id}`}
      onClick={onItemClick}
    >
      <div className="card-body p-4">
        <div className="flex items-center justify-between">
          <ModerationCardHeader item={item} />
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={onApprove}
              disabled={isProcessing}
              aria-label={approveLabel}
            >
              {isProcessing ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                'Approve'
              )}
            </button>
            <button
              type="button"
              className="btn btn-error btn-sm"
              onClick={onToggleExpand}
              disabled={isProcessing}
              aria-label={rejectLabel}
            >
              Reject
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="Reason for rejection (required)"
              value={rejectNotes}
              onChange={(e) => onRejectNotesChange(e.target.value)}
              rows={2}
              aria-label="Rejection reason"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onCancelReject}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-error btn-sm"
                onClick={onConfirmReject}
                disabled={!rejectNotes.trim() || isProcessing}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModerationCardHeader({ item }: { item: ModerationQueueItem }) {
  if (item.type === 'contribution') {
    return (
      <div>
        <h3 className="font-semibold">{item.private_company_name}</h3>
        <p className="text-base-content/85 text-sm">
          Submitted {new Date(item.created_at).toLocaleDateString()}
        </p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="font-semibold">{item.shared_company_name}</h3>
      <p className="text-base-content/85 text-sm">
        Field: <span className="font-medium">{item.field_name}</span>
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
  );
}

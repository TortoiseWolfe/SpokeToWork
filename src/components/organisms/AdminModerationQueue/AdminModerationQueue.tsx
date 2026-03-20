'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';
import { ModerationCard } from './ModerationCard';

export interface AdminModerationQueueProps {
  items: ModerationQueueItem[];
  isLoading?: boolean;
  onApproveContribution?: (id: string, notes?: string) => Promise<void>;
  onRejectContribution?: (id: string, notes: string) => Promise<void>;
  onMergeContribution?: (
    id: string,
    existingCompanyId: string
  ) => Promise<void>;
  onApproveEdit?: (id: string, notes?: string) => Promise<void>;
  onRejectEdit?: (id: string, notes: string) => Promise<void>;
  selectedItemId?: string | null;
  onItemClick?: (item: ModerationQueueItem) => void;
  className?: string;
  testId?: string;
}

export default function AdminModerationQueue({
  items,
  isLoading = false,
  onApproveContribution,
  onRejectContribution,
  onApproveEdit,
  onRejectEdit,
  selectedItemId,
  onItemClick,
  className = '',
  testId = 'admin-moderation-queue',
}: AdminModerationQueueProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedItemId) return;
    const el = containerRef.current?.querySelector(
      `[data-item-id="${selectedItemId}"]`
    );
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedItemId]);

  const handleApprove = async (item: ModerationQueueItem) => {
    setProcessingId(item.id);
    try {
      if (item.type === 'contribution') await onApproveContribution?.(item.id);
      else await onApproveEdit?.(item.id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (item: ModerationQueueItem) => {
    if (!rejectNotes.trim()) return;
    setProcessingId(item.id);
    try {
      if (item.type === 'contribution')
        await onRejectContribution?.(item.id, rejectNotes);
      else await onRejectEdit?.(item.id, rejectNotes);
      setRejectNotes('');
      setExpandedId(null);
    } finally {
      setProcessingId(null);
    }
  };

  const contributions = items.filter((i) => i.type === 'contribution');
  const editSuggestions = items.filter((i) => i.type === 'edit_suggestion');

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

  const renderSection = (
    heading: string,
    headingId: string,
    sectionItems: ModerationQueueItem[]
  ) =>
    sectionItems.length > 0 && (
      <section aria-labelledby={headingId}>
        <h2 id={headingId} className="mb-4 text-xl font-bold">
          {heading} ({sectionItems.length})
        </h2>
        <div className="space-y-3">
          {sectionItems.map((item) => (
            <ModerationCard
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              isExpanded={expandedId === item.id}
              isProcessing={processingId === item.id}
              isClickable={!!onItemClick}
              rejectNotes={expandedId === item.id ? rejectNotes : ''}
              onItemClick={() => onItemClick?.(item)}
              onApprove={() => handleApprove(item)}
              onToggleExpand={() =>
                setExpandedId(expandedId === item.id ? null : item.id)
              }
              onRejectNotesChange={setRejectNotes}
              onConfirmReject={() => handleReject(item)}
              onCancelReject={() => {
                setExpandedId(null);
                setRejectNotes('');
              }}
            />
          ))}
        </div>
      </section>
    );

  return (
    <div
      ref={containerRef}
      className={`space-y-6 ${className}`}
      data-testid={testId}
    >
      {renderSection(
        'Company Contributions',
        'contributions-heading',
        contributions
      )}
      {renderSection('Edit Suggestions', 'edits-heading', editSuggestions)}
    </div>
  );
}

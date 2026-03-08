'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';
import type { NearbyLocation } from '@/lib/companies/nearby-locations';
import { calculateDistance } from '@/utils/map-utils';

export interface ModerationDetailPanelProps {
  /** Must be type: 'contribution'. Page filters before passing. */
  contribution: ModerationQueueItem;
  /**
   * ALL fetched nearby locations (union box around every pending).
   * Panel filters to 5km of THIS contribution client-side.
   */
  nearbyLocations: NearbyLocation[];
  onApprove: (contributionId: string) => Promise<void>;
  onReject: (contributionId: string, notes: string) => Promise<void>;
  onMerge: (contributionId: string, sharedCompanyId: string) => Promise<void>;
  onClose: () => void;
}

interface MergeCandidate {
  shared_company_id: string;
  shared_company_name: string;
  /** Nearest location's address. */
  address: string | null;
  /** Meters to nearest location. */
  distance: number;
  /** How many of this company's locations landed in range. */
  locationCount: number;
}

const RADIUS_M = 5000;

export function ModerationDetailPanel({
  contribution,
  nearbyLocations,
  onApprove,
  onReject,
  onMerge,
  onClose,
}: ModerationDetailPanelProps) {
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Armed merge target must not survive a contribution switch — admin
  // arms a merge for contribution A, clicks contribution B in the queue,
  // panel re-renders with B but the Confirm button is still armed for A's
  // target. That's the footgun we're here to prevent.
  useEffect(() => {
    setMergeTargetId(null);
    setRejectNotes('');
    setBusy(false);
  }, [contribution.id]);

  const candidates = useMemo<MergeCandidate[]>(() => {
    const { latitude, longitude } = contribution;
    if (latitude == null || longitude == null) return [];
    const here: [number, number] = [latitude, longitude];

    const inRange = nearbyLocations
      .map((l) => ({
        loc: l,
        d: calculateDistance(here, [l.latitude, l.longitude]),
      }))
      .filter(({ d }) => d <= RADIUS_M);

    // Group by company, keep nearest.
    const byCompany = new Map<string, MergeCandidate>();
    for (const { loc, d } of inRange) {
      const prev = byCompany.get(loc.shared_company_id);
      if (!prev || d < prev.distance) {
        byCompany.set(loc.shared_company_id, {
          shared_company_id: loc.shared_company_id,
          shared_company_name: loc.shared_company_name,
          address: loc.address,
          distance: d,
          locationCount: (prev?.locationCount ?? 0) + 1,
        });
      } else {
        prev.locationCount += 1;
      }
    }

    return Array.from(byCompany.values()).sort(
      (a, b) => a.distance - b.distance
    );
  }, [contribution, nearbyLocations]);

  const toggleTarget = (id: string) =>
    setMergeTargetId((cur) => (cur === id ? null : id));

  const wrap = (fn: () => Promise<void>) => async () => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside
      className="border-base-300 bg-base-100 fixed top-0 right-0 z-20 flex h-full w-full max-w-md flex-col border-l shadow-xl"
      data-testid="moderation-detail-panel"
      aria-label="Contribution details"
    >
      <header className="border-base-300 flex items-start justify-between border-b p-4">
        <div>
          <h2 className="text-lg font-bold">
            {contribution.private_company_name ?? '(unnamed)'}
          </h2>
          <p className="text-base-content/70 text-sm">
            Submitted {new Date(contribution.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-circle"
          onClick={onClose}
          aria-label="Close panel"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <dl className="space-y-2 text-sm">
          {contribution.address && (
            <div>
              <dt className="text-base-content/70 font-semibold">Address</dt>
              <dd>{contribution.address}</dd>
            </div>
          )}
          {contribution.phone && (
            <div>
              <dt className="text-base-content/70 font-semibold">Phone</dt>
              <dd>{contribution.phone}</dd>
            </div>
          )}
          {contribution.email && (
            <div>
              <dt className="text-base-content/70 font-semibold">Email</dt>
              <dd>{contribution.email}</dd>
            </div>
          )}
          {contribution.website && (
            <div>
              <dt className="text-base-content/70 font-semibold">Website</dt>
              <dd>
                <a
                  href={contribution.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary"
                >
                  {contribution.website}
                </a>
              </dd>
            </div>
          )}
          {contribution.notes && (
            <div>
              <dt className="text-base-content/70 font-semibold">Notes</dt>
              <dd className="whitespace-pre-wrap">{contribution.notes}</dd>
            </div>
          )}
        </dl>

        <section>
          <h3 className="mb-2 font-semibold">Nearby approved companies</h3>
          {candidates.length === 0 ? (
            <p className="text-base-content/70 text-sm">
              No approved companies nearby.
            </p>
          ) : (
            <ul className="space-y-1">
              {candidates.map((c) => (
                <li key={c.shared_company_id}>
                  <button
                    type="button"
                    data-testid={`merge-candidate-${c.shared_company_id}`}
                    onClick={() => toggleTarget(c.shared_company_id)}
                    className={`w-full rounded border p-2 text-left transition ${
                      mergeTargetId === c.shared_company_id
                        ? 'border-info bg-info/10'
                        : 'border-base-300 hover:border-base-content/30'
                    }`}
                    aria-pressed={mergeTargetId === c.shared_company_id}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {c.shared_company_name}
                      </span>
                      <span className="text-base-content/70 text-xs">
                        {(c.distance / 1000).toFixed(1)} km
                      </span>
                    </div>
                    {c.address && (
                      <div className="text-base-content/70 text-xs">
                        {c.address}
                      </div>
                    )}
                    {c.locationCount > 1 && (
                      <span className="badge badge-sm badge-ghost mt-1">
                        {c.locationCount} locations
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <label htmlFor="reject-notes" className="label">
            <span className="label-text">Rejection reason</span>
          </label>
          <textarea
            id="reject-notes"
            className="textarea textarea-bordered w-full"
            rows={2}
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            aria-label="Rejection reason"
          />
        </section>
      </div>

      <footer className="border-base-300 space-y-2 border-t p-4">
        <button
          type="button"
          className="btn btn-success btn-block"
          disabled={busy}
          onClick={wrap(() => onApprove(contribution.id))}
        >
          Approve
        </button>
        <button
          type="button"
          className="btn btn-info btn-block"
          disabled={busy || !mergeTargetId}
          onClick={wrap(() => onMerge(contribution.id, mergeTargetId!))}
        >
          Confirm Merge
        </button>
        <button
          type="button"
          className="btn btn-error btn-block"
          disabled={busy || !rejectNotes.trim()}
          onClick={wrap(() => onReject(contribution.id, rejectNotes))}
        >
          Reject
        </button>
      </footer>
    </aside>
  );
}

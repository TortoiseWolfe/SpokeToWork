'use client';

import { useState } from 'react';
import type { TeamMember } from '@/hooks/useEmployerTeam';

export interface TeamPanelConnection {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface TeamPanelProps {
  members: TeamMember[];
  /**
   * Connections eligible to be added — caller should have already
   * filtered out anyone who's already in `members`.
   */
  availableConnections: TeamPanelConnection[];
  /** Current user's id — their chip won't show a remove button. */
  currentUserId: string;
  onRemove: (userId: string) => Promise<void>;
  onAdd: (
    userId: string,
    profile: Pick<TeamMember, 'display_name' | 'avatar_url'>
  ) => Promise<void>;
}

/**
 * TeamPanel — company team roster with add/remove.
 *
 * Renders a chip per team member with an inline "×" remove (hidden for
 * the current user — RPC rejects self-removal anyway). "Add teammate"
 * opens an inline list of eligible connections; selecting one calls
 * `onAdd` with the connection's id and profile for optimistic display.
 *
 * @category molecular
 */
export default function TeamPanel({
  members,
  availableConnections,
  currentUserId,
  onRemove,
  onAdd,
}: TeamPanelProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const others = members.filter((m) => m.user_id !== currentUserId);
  const justMe = others.length === 0;

  const handleAdd = async (conn: TeamPanelConnection) => {
    setBusy(conn.user_id);
    try {
      await onAdd(conn.user_id, {
        display_name: conn.display_name,
        avatar_url: conn.avatar_url,
      });
      setPickerOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (userId: string) => {
    setBusy(userId);
    try {
      await onRemove(userId);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card bg-base-200 border-base-300 border">
      <div className="card-body gap-4">
        <h2 className="card-title text-lg">Team ({members.length})</h2>

        {justMe && (
          <p className="text-base-content/70 text-sm">Just you so far</p>
        )}

        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const name = m.display_name ?? 'Unnamed';
            const isSelf = m.user_id === currentUserId;
            return (
              <div
                key={m.user_id}
                className="badge badge-lg bg-base-100 gap-2 p-3"
              >
                {m.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatar_url}
                    alt=""
                    className="h-5 w-5 rounded-full"
                  />
                )}
                <span>{name}</span>
                {!isSelf && (
                  <button
                    type="button"
                    onClick={() => void handleRemove(m.user_id)}
                    disabled={busy === m.user_id}
                    aria-label={`Remove ${name}`}
                    className="btn btn-ghost btn-xs h-5 min-h-0 px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="card-actions">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="btn btn-outline btn-sm min-h-11"
          >
            {pickerOpen ? 'Cancel' : 'Add teammate'}
          </button>
        </div>

        {pickerOpen && (
          <div className="rounded-box bg-base-100 border-base-300 border p-3">
            {availableConnections.length === 0 ? (
              <p className="text-base-content/70 text-sm">
                No connections to add
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {availableConnections.map((c) => {
                  const name = c.display_name ?? 'Unnamed';
                  return (
                    <li key={c.user_id}>
                      <button
                        type="button"
                        onClick={() => void handleAdd(c)}
                        disabled={busy === c.user_id}
                        className="btn btn-ghost btn-sm min-h-11 w-full justify-start"
                      >
                        {c.avatar_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.avatar_url}
                            alt=""
                            className="h-6 w-6 rounded-full"
                          />
                        )}
                        {name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

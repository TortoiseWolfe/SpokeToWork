'use client';

import type { AdminUser } from '@/hooks/useAdminUsers';

export interface AdminUserTableProps {
  users: AdminUser[];
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
  testId?: string;
}

const roleBadge: Record<AdminUser['role'], string> = {
  admin: 'badge-error',
  employer: 'badge-secondary',
  worker: 'badge-ghost',
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString() : '—';

export default function AdminUserTable({
  users,
  isLoading = false,
  error = null,
  className = '',
  testId = 'admin-user-table',
}: AdminUserTableProps) {
  if (isLoading) {
    return (
      <div
        className={`flex justify-center p-8 ${className}`}
        role="status"
        data-testid={testId}
      >
        <span
          className="loading loading-spinner loading-lg"
          aria-label="Loading users"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`alert alert-error ${className}`}
        role="alert"
        data-testid={testId}
      >
        <span>Failed to load users: {error.message}</span>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className={`alert ${className}`} role="status" data-testid={testId}>
        <span>No users found.</span>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`} data-testid={testId}>
      <table className="table-sm table">
        <caption className="pb-2 text-left font-semibold">
          All users ({users.length})
        </caption>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Employer Of</th>
            <th>Joined</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} data-testid={`user-row-${u.id}`}>
              <td>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {u.display_name || u.username || '—'}
                  </span>
                  <span className="text-base-content/60 text-xs">
                    {u.email ?? '—'}
                  </span>
                </div>
              </td>
              <td>
                <span className={`badge badge-sm ${roleBadge[u.role]}`}>
                  {u.role}
                </span>
                {u.is_admin && (
                  <span
                    className="badge badge-sm badge-error badge-outline ml-1"
                    aria-label="Admin flag"
                  >
                    admin
                  </span>
                )}
              </td>
              <td>
                {u.company_names.length === 0 ? (
                  <span className="text-base-content/50">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {u.company_names.map((c) => (
                      <span key={c} className="badge badge-outline badge-xs">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="tabular-nums">{fmt(u.created_at)}</td>
              <td className="tabular-nums">{fmt(u.last_sign_in_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

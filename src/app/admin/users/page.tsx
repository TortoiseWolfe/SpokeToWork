'use client';

/**
 * Admin user management — everyone across all employers. Read-only list
 * backed by admin_list_users RPC (gated server-side by jwt_is_admin()).
 * useAdminGate handles the client-side redirect/deny.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAdminGate } from '@/hooks/useAdminGate';
import { useAdminUsers, type AdminUser } from '@/hooks/useAdminUsers';
import AdminUserTable from '@/components/organisms/AdminUserTable';

type RoleFilter = 'all' | AdminUser['role'];

export default function AdminUsersPage() {
  const gate = useAdminGate();
  const { users, isLoading, error } = useAdminUsers();
  const [q, setQ] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (role !== 'all' && u.role !== role) return false;
      if (!needle) return true;
      const hay = [u.display_name, u.username, u.email];
      return hay.some((h) => h?.toLowerCase().includes(needle));
    });
  }, [users, q, role]);

  if (gate.isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex min-h-[50vh] items-center justify-center">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </div>
    );
  }

  if (!gate.isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-error">
          <span>Access denied. Admin privileges required.</span>
        </div>
      </div>
    );
  }

  const workers = users.filter((u) => u.role === 'worker').length;
  const employers = users.filter((u) => u.role === 'employer').length;
  const admins = users.filter((u) => u.is_admin).length;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-base-content/70">
            All users across all employers.
          </p>
        </div>
        <Link href="/admin" className="btn btn-ghost">
          ← Admin
        </Link>
      </header>

      <div className="stats stats-vertical sm:stats-horizontal w-full shadow">
        <div className="stat">
          <div className="stat-title">Total</div>
          <div className="stat-value">{users.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Workers</div>
          <div className="stat-value text-base-content/60">{workers}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Employers</div>
          <div className="stat-value text-secondary">{employers}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Admins</div>
          <div className="stat-value text-error">{admins}</div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="input input-bordered flex min-h-11 flex-1 items-center gap-2">
          <span className="sr-only">Search users</span>
          <input
            type="search"
            className="grow"
            placeholder="Search name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <select
          className="select select-bordered min-h-11"
          value={role}
          onChange={(e) => setRole(e.target.value as RoleFilter)}
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="worker">Workers</option>
          <option value="employer">Employers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <AdminUserTable users={filtered} isLoading={isLoading} error={error} />
    </div>
  );
}

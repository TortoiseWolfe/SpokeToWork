'use client';

import Link from 'next/link';
import { useAdminGate } from '@/hooks/useAdminGate';
import { useRouteAnalytics } from '@/hooks/useRouteAnalytics';
import AdminStatsGrid from '@/components/organisms/AdminStatsGrid';

export default function AdminPage() {
  const gate = useAdminGate();
  // Fires unconditionally, but admin RLS gates the rows. Non-admins see
  // only their own routes — but they never get past gate.isAdmin anyway.
  const analytics = useRouteAnalytics();

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

  return (
    <div className="container mx-auto space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-base-content/70">
            Route analytics across all users.
          </p>
        </div>
        <Link href="/admin/moderation" className="btn btn-primary">
          Moderation Queue
        </Link>
      </header>

      <AdminStatsGrid {...analytics} />
    </div>
  );
}

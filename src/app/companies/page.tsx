'use client';

/**
 * Companies Page — thin wrapper that provides CompanyWorkspaceContext
 * and renders the split-view inner component.
 *
 * Auth guard is here (not in CompaniesPageInner) so the redirect fires
 * before useCompanies() makes a blocking getUser() call on Supabase Cloud.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/hooks/useCompanies';
import { CompanyWorkspaceProvider } from '@/contexts/CompanyWorkspaceContext';
import { CompaniesPageInner } from './CompaniesPageInner';

export default function CompaniesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/sign-in');
  }, [user, authLoading, router]);

  const { companies } = useCompanies();

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <CompanyWorkspaceProvider companies={companies}>
      <CompaniesPageInner />
    </CompanyWorkspaceProvider>
  );
}

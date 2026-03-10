'use client';

/**
 * Companies Page — thin wrapper that provides CompanyWorkspaceContext
 * and renders the split-view inner component.
 */

import { useCompanies } from '@/hooks/useCompanies';
import { CompanyWorkspaceProvider } from '@/contexts/CompanyWorkspaceContext';
import { CompaniesPageInner } from './CompaniesPageInner';

export default function CompaniesPage() {
  const { companies } = useCompanies();

  return (
    <CompanyWorkspaceProvider companies={companies}>
      <CompaniesPageInner />
    </CompanyWorkspaceProvider>
  );
}

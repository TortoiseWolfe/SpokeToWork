'use client';

/**
 * CompaniesPanel — the exclusive-panel slot.
 *
 * Renders whichever form panel is open (settings / add / edit / import),
 * or the export+table view when none is. Page-scoped.
 */

import type { ModalsApi } from '@/hooks/useCompaniesPageModals';
import type { UseCompanyCrudReturn } from '@/hooks/useCompanyCrud';
import CompanyForm from '@/components/organisms/CompanyForm';
import CompanyTable from '@/components/organisms/CompanyTable';
import HomeLocationSettings from '@/components/organisms/HomeLocationSettings';
import CompanyImport from '@/components/organisms/CompanyImport';
import CompanyExport from '@/components/molecular/CompanyExport';
import type { ExportFormat } from '@/components/molecular/CompanyExport';
import { toCompanyWithApplications } from '@/lib/companies/company-adapter';
import type { AnyCompany } from '@/lib/companies/table-filter-sort';
import type {
  Company,
  CompanyStatus,
  CompanyWithApplications,
  HomeLocation,
  ImportResult,
} from '@/types/company';

export interface CompaniesPanelProps {
  modals: ModalsApi;
  crud: UseCompanyCrudReturn;
  homeLocation: HomeLocation | null;
  onSaveHome: (loc: HomeLocation) => Promise<void>;
  onAdd: (data: Parameters<UseCompanyCrudReturn['add']>[0]) => Promise<void>;
  onSave: (data: Parameters<UseCompanyCrudReturn['save']>[0]) => Promise<void>;
  companies: CompanyWithApplications[];
  isLoading: boolean;
  activeRouteCompanyIds: Set<string>;
  /** Drives scroll-into-view (map→table sync). */
  selectedCompanyId: string | null;
  onCompanyClick: (c: AnyCompany) => void;
  onEdit: (c: AnyCompany) => void;
  onDelete: (c: AnyCompany) => void;
  onStatusChange: (c: Company, s: CompanyStatus) => void;
  onAddToRoute: (c: AnyCompany) => void;
  onExport: (fmt: ExportFormat) => Promise<Blob>;
  onImport: (file: File) => Promise<ImportResult>;
}

export function CompaniesPanel(p: CompaniesPanelProps) {
  const { modals, crud } = p;

  if (modals.showSettings) {
    return (
      <div className="mb-8">
        <HomeLocationSettings
          initialLocation={p.homeLocation}
          onSave={p.onSaveHome}
        />
      </div>
    );
  }

  if (modals.showAddForm) {
    return (
      <div className="mb-8">
        <CompanyForm
          homeLocation={p.homeLocation}
          onSubmit={p.onAdd}
          onCancel={modals.close}
        />
      </div>
    );
  }

  if (crud.editingCompany) {
    return (
      <div className="mb-8">
        <CompanyForm
          company={toCompanyWithApplications(crud.editingCompany)}
          homeLocation={p.homeLocation}
          onSubmit={p.onSave}
          onCancel={crud.cancelEdit}
        />
      </div>
    );
  }

  if (modals.showImport) {
    return (
      <div className="mb-8">
        <CompanyImport
          onImport={p.onImport}
          onCancel={modals.close}
          onComplete={() => {
            // Keep dialog open to show results
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <CompanyExport
          onExport={p.onExport}
          companyCount={p.companies.length}
          disabled={p.isLoading}
        />
      </div>
      <CompanyTable
        companies={p.companies}
        isLoading={p.isLoading}
        onCompanyClick={p.onCompanyClick}
        onEdit={p.onEdit}
        onDelete={p.onDelete}
        onStatusChange={p.onStatusChange}
        onAddToRoute={p.onAddToRoute}
        activeRouteCompanyIds={p.activeRouteCompanyIds}
        selectedCompanyId={p.selectedCompanyId}
      />
    </>
  );
}

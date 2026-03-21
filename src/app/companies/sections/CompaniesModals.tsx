'use client';

/**
 * CompaniesModals — fixed-position overlays.
 *
 * CompanyDetailDrawer, ApplicationForm modal, RouteBuilder, RouteDetailDrawer.
 * Rendered as siblings of SplitWorkspaceLayout (they're `fixed inset-0`).
 * Page-scoped.
 */

import type { ModalsApi } from '@/hooks/useCompaniesPageModals';
import type { UseCompanyApplicationsReturn } from '@/hooks/useCompanyApplications';
import type { UseRouteActionsReturn } from '@/hooks/useRouteActions';
import CompanyDetailDrawer from '@/components/organisms/CompanyDetailDrawer';
import ApplicationForm from '@/components/organisms/ApplicationForm';
import RouteBuilder from '@/components/organisms/RouteBuilder';
import RouteDetailDrawer from '@/components/organisms/RouteDetailDrawer';
import type { AnyCompany } from '@/lib/companies/company-adapter';
import type {
  CompanyWithApplications,
  JobApplicationCreate,
  UnifiedCompany,
} from '@/types/company';

export interface CompaniesModalsProps {
  modals: ModalsApi;
  apps: UseCompanyApplicationsReturn;
  routeActions: UseRouteActionsReturn;
  selectedCompany: CompanyWithApplications | null;
  selectedUnified: UnifiedCompany | null;
  clearSelection: () => void;
  onEditCompany: (c: AnyCompany) => void;
  generateRouteGeometry: (routeId: string) => Promise<void>;
}

export function CompaniesModals({
  modals,
  apps,
  routeActions: ra,
  selectedCompany,
  selectedUnified,
  clearSelection,
  onEditCompany,
  generateRouteGeometry,
}: CompaniesModalsProps) {
  const drawerCompany = selectedCompany
    ? {
        ...selectedCompany,
        applications: apps.applications,
        latest_application: apps.applications[0] ?? null,
        total_applications: apps.applications.length,
      }
    : null;

  return (
    <>
      <CompanyDetailDrawer
        company={drawerCompany}
        isOpen={selectedCompany !== null}
        onClose={() => {
          clearSelection();
          modals.closeAppForm();
        }}
        onEditCompany={onEditCompany}
        onAddApplication={() => modals.openAppForm(null)}
        onEditApplication={(app) => modals.openAppForm(app)}
        onDeleteApplication={apps.remove}
        onStatusChange={(app, s) => apps.setStatus(app.id, s)}
        onOutcomeChange={(app, o) => apps.setOutcome(app.id, o)}
      />

      {modals.appFormOpen && selectedUnified && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="mb-4 text-lg font-bold">
              {modals.editingApplication
                ? 'Edit Application'
                : 'Add Application'}
            </h3>
            <ApplicationForm
              companyId={
                selectedUnified.source === 'shared'
                  ? (selectedUnified.company_id ?? '')
                  : (selectedUnified.private_company_id ?? '')
              }
              companyType={selectedUnified.source}
              companyName={selectedUnified.name}
              application={modals.editingApplication}
              onSubmit={async (data) => {
                if (modals.editingApplication) {
                  await apps.update(modals.editingApplication.id, data);
                } else {
                  await apps.create(data as JobApplicationCreate);
                }
                modals.closeAppForm();
              }}
              onCancel={modals.closeAppForm}
            />
          </div>
          <div className="modal-backdrop" onClick={modals.closeAppForm} />
        </div>
      )}

      <RouteBuilder
        route={ra.editingRoute}
        isOpen={ra.showRouteBuilder}
        onSave={ra.saved}
        onClose={ra.closeBuilder}
      />

      <RouteDetailDrawer
        route={ra.selectedRoute}
        companies={ra.routeCompaniesPreview}
        isOpen={ra.showRouteDetailDrawer}
        isLoading={ra.isLoadingRouteCompanies}
        onClose={ra.closeDrawer}
        onEditRoute={ra.edit}
        onDeleteRoute={ra.remove}
        onRemoveCompany={ra.removeCompany}
        onToggleNextRide={ra.toggleNextRide}
        onReorder={ra.reorder}
        generateRouteGeometry={generateRouteGeometry}
      />
    </>
  );
}

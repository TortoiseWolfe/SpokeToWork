'use client';

/**
 * CompaniesBody — SplitWorkspaceLayout with its three slots populated.
 * Page-scoped presentation. All logic lives in the hooks the page passes in.
 */

import { SplitWorkspaceLayout } from '@/components/templates/SplitWorkspaceLayout';
import { CompanyMap } from '@/components/organisms/CompanyMap/CompanyMap';
import { RoutePolylines } from '@/components/map/RoutePolyline';
import { BottomSheet } from '@/components/molecular/BottomSheet';
import { CompanyListCompact } from '@/components/molecular/CompanyListCompact';
import { CompaniesToolbar } from './CompaniesToolbar';
import { CompaniesPanel } from './CompaniesPanel';
import { CompaniesFilterBar } from './CompaniesFilterBar';
import type { IndustryTreeNode } from '@/hooks/useIndustries';
import type { UseCompanyHandlersReturn } from '@/hooks/useCompanyHandlers';
import type { UseCompaniesMapDataReturn } from '@/hooks/useCompaniesMapData';
import type { ModalsApi } from '@/hooks/useCompaniesPageModals';
import type { UseCompanyCrudReturn } from '@/hooks/useCompanyCrud';
import type { CompanyWorkspaceContextValue } from '@/contexts/CompanyWorkspaceContext';
import type {
  CompanyWithApplications,
  HomeLocation,
  UnifiedCompany,
} from '@/types/company';

export interface CompaniesBodyProps {
  h: UseCompanyHandlersReturn;
  map: UseCompaniesMapDataReturn;
  modals: ModalsApi;
  crud: UseCompanyCrudReturn;
  ws: CompanyWorkspaceContextValue;
  companies: CompanyWithApplications[];
  rawCompanies: UnifiedCompany[];
  activeRouteId: string | null;
  activeRouteName?: string;
  homeLocation: HomeLocation | null;
  isLoading: boolean;
  showingPanel: boolean;
  error: string | null;
  onDismissError: () => void;
  industryTree: IndustryTreeNode[];
  selectedIndustries: string[];
  onIndustriesChange: (ids: string[]) => void;
}

export function CompaniesBody(p: CompaniesBodyProps) {
  return (
    <SplitWorkspaceLayout
      routesOpen={p.modals.routesDrawerOpen}
      onToggleRoutes={p.modals.openRoutesDrawer}
      table={
        <div className="container mx-auto px-4 py-8">
          <CompaniesToolbar
            activeRouteName={p.activeRouteName}
            modals={p.modals}
            onCancelEdit={p.crud.cancelEdit}
            error={p.error}
            onDismissError={p.onDismissError}
            homeLocation={p.homeLocation}
            showingPanel={p.showingPanel}
          />
          <CompaniesFilterBar
            industryTree={p.industryTree}
            selectedIndustries={p.selectedIndustries}
            onIndustriesChange={p.onIndustriesChange}
          />
          <CompaniesPanel
            modals={p.modals}
            crud={p.crud}
            homeLocation={p.homeLocation}
            onSaveHome={p.h.onSaveHome}
            onAdd={p.h.onAdd}
            onSave={p.h.onSave}
            companies={p.companies}
            isLoading={p.isLoading}
            activeRouteCompanyIds={p.ws.activeRouteCompanyIds}
            selectedCompanyId={p.ws.selectedCompanyId}
            onCompanyClick={p.h.onCompanyClick}
            onEdit={p.h.onEdit}
            onDelete={p.h.onDelete}
            onStatusChange={p.h.onStatusChange}
            onAddToRoute={p.h.onAddToRoute}
            onExport={p.h.onExport}
            onImport={p.h.onImport}
          />
        </div>
      }
      map={
        <CompanyMap
          markers={p.map.markers}
          center={p.map.mapCenter}
          zoom={p.map.mapZoom}
          flyToCompanyId={p.h.flyTo}
          className="h-full w-full"
        >
          {p.map.displayRoutes.length > 0 && (
            <RoutePolylines
              routes={p.map.displayRoutes}
              activeRouteId={p.activeRouteId}
              showSystemRoutes
              showUserRoutes
            />
          )}
        </CompanyMap>
      }
      mobileSheet={
        <BottomSheet initialSnap="peek" ariaLabel="Companies">
          <CompanyListCompact
            companies={p.rawCompanies}
            onCompanyClick={p.h.onCompanyClick}
            activeRouteCompanyIds={p.ws.activeRouteCompanyIds}
            selectedCompanyId={p.ws.selectedCompanyId ?? undefined}
          />
        </BottomSheet>
      }
    />
  );
}

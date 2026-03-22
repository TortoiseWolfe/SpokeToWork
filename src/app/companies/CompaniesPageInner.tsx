'use client';

/**
 * Companies Page — pure hook composition.
 *
 * Domain state lives in hooks; presentation lives in ./sections/*.
 * Map overlay: RoutePolylines wired into CompanyMap via CompaniesBody.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/hooks/useCompanies';
import { useRoutes } from '@/hooks/useRoutes';
import { useCompanyWorkspace } from '@/contexts/CompanyWorkspaceContext';
import { useCompaniesPageModals } from '@/hooks/useCompaniesPageModals';
import { useHomeLocation } from '@/hooks/useHomeLocation';
import { useFullscreenWorkspace } from '@/hooks/useFullscreenWorkspace';
import { useCompanyCrud } from '@/hooks/useCompanyCrud';
import { useCompanyApplications } from '@/hooks/useCompanyApplications';
import { useRouteActions } from '@/hooks/useRouteActions';
import { useCompanyHandlers } from '@/hooks/useCompanyHandlers';
import { useCompaniesMapData } from '@/hooks/useCompaniesMapData';
import { useCompaniesIndustryFilter } from '@/hooks/useCompaniesIndustryFilter';
import { CompaniesBody } from './sections/CompaniesBody';
import { CompaniesModals } from './sections/CompaniesModals';
import { RoutesDrawer } from './sections/RoutesDrawer';
import { mergeApplicationSummaries } from '@/lib/companies/company-adapter';
import { getUnifiedCompanyId } from '@/lib/companies/company-id';

export function CompaniesPageInner() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth guard — must be before all domain hooks so the redirect fires
  // immediately instead of waiting for 13+ hook effects to initialize.
  useEffect(() => {
    if (!authLoading && !user) router.push('/sign-in');
  }, [user, authLoading, router]);

  const ind = useCompaniesIndustryFilter();
  const cx = useCompanies({ filters: ind.companyFilters });
  const rx = useRoutes({ skip: !user || authLoading });
  const ws = useCompanyWorkspace();
  const modals = useCompaniesPageModals();
  const home = useHomeLocation(user, cx.refetch);
  const crud = useCompanyCrud(cx, setError);
  const ra = useRouteActions(rx, ws.refreshRouteCompanyIds, setError);

  const selectedUnified = useMemo(
    () =>
      cx.companies.find(
        (c) => getUnifiedCompanyId(c) === ws.selectedCompanyId
      ) ?? null,
    [cx.companies, ws.selectedCompanyId]
  );
  const apps = useCompanyApplications(user, selectedUnified, setError);

  const companies = useMemo(
    () => mergeApplicationSummaries(cx.companies, apps.summaries),
    [cx.companies, apps.summaries]
  );
  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === ws.selectedCompanyId) ?? null,
    [companies, ws.selectedCompanyId]
  );

  const h = useCompanyHandlers({
    companies: cx.companies,
    crud,
    ws,
    modals,
    addToRoute: ra.addCompany,
    saveHome: home.save,
    setError,
  });

  const map = useCompaniesMapData(
    cx.companies,
    ws.activeRouteCompanyIds,
    rx.routes,
    home.homeLocation,
    ind.resolveIndustry
  );

  useFullscreenWorkspace(containerRef, !authLoading && !home.isLoading);
  useEffect(() => {
    if (cx.error) setError(cx.error.message);
  }, [cx.error]);

  if (authLoading || home.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }
  if (!user) return null;

  const activeRouteName = rx.activeRouteId
    ? (rx.routes.find((r) => r.id === rx.activeRouteId)?.name ?? 'Loading...')
    : undefined;
  const showingPanel =
    modals.showingForm || modals.showSettings || !!crud.editingCompany;

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      <div className="flex h-full flex-col">
        <CompaniesBody
          h={h}
          map={map}
          modals={modals}
          crud={crud}
          ws={ws}
          companies={companies}
          rawCompanies={cx.companies}
          activeRouteId={rx.activeRouteId}
          activeRouteName={activeRouteName}
          homeLocation={home.homeLocation}
          isLoading={cx.isLoading}
          showingPanel={showingPanel}
          error={error}
          onDismissError={() => setError(null)}
          industryTree={ind.industryTree}
          selectedIndustries={ind.industryIds}
          onIndustriesChange={ind.setIndustryIds}
        />
      </div>
      <CompaniesModals
        modals={modals}
        apps={apps}
        routeActions={ra}
        selectedCompany={selectedCompany}
        selectedUnified={selectedUnified}
        clearSelection={ws.clearSelection}
        onEditCompany={h.onEdit}
        generateRouteGeometry={rx.generateRouteGeometry}
      />
      <RoutesDrawer
        open={modals.routesDrawerOpen}
        onClose={modals.closeRoutesDrawer}
        routes={rx.routes}
        activeRouteId={rx.activeRouteId}
        isLoading={rx.isLoading}
        routeActions={ra}
      />
    </div>
  );
}

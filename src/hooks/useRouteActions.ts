'use client';

/**
 * useRouteActions — route UI state (selected/editing/drawer/builder) +
 * CRUD adapters. Extracted from CompaniesPageInner Feature-041 inline code.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UseRoutesReturn } from '@/hooks/useRoutes';
import type {
  BicycleRoute,
  BicycleRouteCreate,
  BicycleRouteUpdate,
  RouteCompanyReorder,
  RouteCompanyWithDetails,
} from '@/types/route';
import type { UnifiedCompany } from '@/types/company';

// prettier-ignore
type RoutesCx = Pick<UseRoutesReturn, 'routes' | 'activeRouteId' | 'createRoute'
  | 'updateRoute' | 'deleteRoute' | 'setActiveRoute' | 'addCompanyToRoute'
  | 'removeCompanyFromRoute' | 'reorderCompanies' | 'getRouteCompanies'
  | 'toggleNextRide' | 'generateRouteGeometry' | 'refetch'>;

export interface UseRouteActionsReturn {
  selectedRouteId: string | null;
  selectedRoute: BicycleRoute | null;
  editingRoute: BicycleRoute | null;
  showRouteBuilder: boolean;
  showRouteDetailDrawer: boolean;
  routeCompaniesPreview: RouteCompanyWithDetails[];
  isLoadingRouteCompanies: boolean;
  openBuilder: () => void;
  closeBuilder: () => void;
  closeDrawer: () => void;
  select: (route: BicycleRoute) => void;
  edit: (route: BicycleRoute) => void;
  create: (data: BicycleRouteCreate) => Promise<void>;
  update: (data: BicycleRouteUpdate) => Promise<void>;
  remove: (route: BicycleRoute) => Promise<void>;
  saved: () => Promise<void>;
  addCompany: (company: UnifiedCompany) => Promise<void>;
  removeCompany: (routeCompanyId: string) => Promise<void>;
  toggleNextRide: (routeCompanyId: string) => Promise<void>;
  reorder: (data: RouteCompanyReorder) => Promise<void>;
}

export function useRouteActions(
  rx: RoutesCx,
  refreshRouteCompanyIds: () => Promise<void>,
  onError: (message: string) => void
): UseRouteActionsReturn {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [editingRoute, setEditingRoute] = useState<BicycleRoute | null>(null);
  const [showRouteBuilder, setShowRouteBuilder] = useState(false);
  const [showRouteDetailDrawer, setShowRouteDetailDrawer] = useState(false);
  const [routeCompaniesPreview, setRouteCompaniesPreview] = useState<
    RouteCompanyWithDetails[]
  >([]);
  const [isLoadingRouteCompanies, setIsLoadingRouteCompanies] = useState(false);

  useEffect(() => {
    if (rx.activeRouteId) setSelectedRouteId(rx.activeRouteId);
  }, [rx.activeRouteId]);

  const refetchPreview = useCallback(async () => {
    if (!selectedRouteId) return setRouteCompaniesPreview([]);
    setIsLoadingRouteCompanies(true);
    try {
      setRouteCompaniesPreview(await rx.getRouteCompanies(selectedRouteId));
    } catch {
      setRouteCompaniesPreview([]);
    } finally {
      setIsLoadingRouteCompanies(false);
    }
  }, [selectedRouteId, rx]);

  useEffect(() => void refetchPreview(), [refetchPreview]);

  const selectedRoute = useMemo(
    () => rx.routes.find((r) => r.id === selectedRouteId) ?? null,
    [rx.routes, selectedRouteId]
  );

  /** try/await/catch→onError. Inline so exhaustive-deps sees through. */
  const run = useCallback(
    async (fn: () => Promise<void>, msg: string, rethrow = false) => {
      try {
        await fn();
      } catch (err) {
        onError(err instanceof Error ? err.message : msg);
        if (rethrow) throw err;
      }
    },
    [onError]
  );

  const regenAndRefresh = useCallback(async () => {
    if (!selectedRouteId) return;
    await rx.generateRouteGeometry(selectedRouteId);
    await refetchPreview();
  }, [selectedRouteId, rx, refetchPreview]);

  const addCompany = useCallback(
    (c: UnifiedCompany) =>
      run(async () => {
        if (!rx.activeRouteId)
          return onError('No active route. Create or select one first.');
        await rx.addCompanyToRoute({
          route_id: rx.activeRouteId,
          shared_company_id:
            c.source === 'shared' ? (c.company_id ?? undefined) : undefined,
          private_company_id:
            c.source === 'private'
              ? (c.private_company_id ?? undefined)
              : undefined,
          tracking_id: c.tracking_id ?? undefined,
        });
        await refreshRouteCompanyIds();
        await rx.generateRouteGeometry(rx.activeRouteId);
        if (selectedRouteId === rx.activeRouteId) await refetchPreview();
      }, 'Failed to add company to route'),
    [rx, selectedRouteId, refreshRouteCompanyIds, refetchPreview, run, onError]
  );

  // prettier-ignore
  return {
    selectedRouteId, selectedRoute, editingRoute, showRouteBuilder,
    showRouteDetailDrawer, routeCompaniesPreview, isLoadingRouteCompanies, addCompany,
    openBuilder: useCallback(() => setShowRouteBuilder(true), []),
    closeBuilder: useCallback(() => { setShowRouteBuilder(false); setEditingRoute(null); }, []),
    closeDrawer: useCallback(() => setShowRouteDetailDrawer(false), []),
    select: useCallback((r: BicycleRoute) => { setSelectedRouteId(r.id); void rx.setActiveRoute(r.id); setShowRouteDetailDrawer(true); }, [rx]),
    edit: useCallback((r: BicycleRoute) => { setShowRouteDetailDrawer(false); setEditingRoute(r); setShowRouteBuilder(true); }, []),
    create: useCallback((d: BicycleRouteCreate) => run(async () => { await rx.createRoute(d); setShowRouteBuilder(false); }, 'Failed to create route', true), [rx, run]),
    update: useCallback((d: BicycleRouteUpdate) => run(async () => { await rx.updateRoute(d); setEditingRoute(null); }, 'Failed to update route', true), [rx, run]),
    remove: useCallback(async (r: BicycleRoute) => {
      if (!window.confirm(`Are you sure you want to delete "${r.name}"?`)) return;
      await run(async () => { await rx.deleteRoute(r.id); if (selectedRouteId === r.id) setSelectedRouteId(null); setShowRouteDetailDrawer(false); }, 'Failed to delete route');
    }, [rx, selectedRouteId, run]),
    saved: useCallback(async () => { setShowRouteBuilder(false); setEditingRoute(null); await rx.refetch(); }, [rx]),
    removeCompany: useCallback((id: string) => run(async () => { await rx.removeCompanyFromRoute(id); await refreshRouteCompanyIds(); await regenAndRefresh(); }, 'Failed to remove company'), [rx, refreshRouteCompanyIds, regenAndRefresh, run]),
    toggleNextRide: useCallback((id: string) => run(async () => { await rx.toggleNextRide(id); await refetchPreview(); }, 'Failed to toggle next ride'), [rx, refetchPreview, run]),
    reorder: useCallback((d: RouteCompanyReorder) => run(async () => { await rx.reorderCompanies(d); await refreshRouteCompanyIds(); await regenAndRefresh(); }, 'Failed to reorder companies'), [rx, refreshRouteCompanyIds, regenAndRefresh, run]),
  };
}

'use client';

/**
 * CompanyWorkspaceContext — coordination state for the companies+map split view.
 *
 * Owns SELECTION and DERIVED route-membership state. Does NOT own domain data:
 * each page fetches its own companies (useCompanies / getContributions) and
 * passes them in as the `companies` prop.
 *
 * Consumes: ActiveRouteContext (global), useRoutes (for route-company IDs).
 * Consumed by: CompanyTable (indirectly, via page prop), CompanyMap (Phase 2).
 *
 * Design: docs/plans/2026-03-06-unified-companies-map-design.md
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import type { UnifiedCompany } from '@/types/company';
import { useRoutes } from '@/hooks/useRoutes';
import { useActiveRoute } from '@/contexts/ActiveRouteContext';
import { createLogger } from '@/lib/logger';

const logger = createLogger('contexts:company-workspace');

export interface CompanyWorkspaceContextValue {
  /** Currently selected company's stable ID (tracking_id or private_company_id). */
  selectedCompanyId: string | null;
  /** Select a company by its stable ID. Phase 2 will also flyTo coords if given. */
  selectCompany: (id: string) => void;
  /** Clear the selection (closes detail drawer). */
  clearSelection: () => void;

  /**
   * All company identifiers on the active route, enriched so that both
   * company_id AND tracking_id forms are present for shared companies.
   * CompanyTable checks multiple ID fields per row — this set covers all of them.
   */
  activeRouteCompanyIds: Set<string>;
  /**
   * Re-fetch route company IDs. Call after addCompanyToRoute /
   * removeCompanyFromRoute so the table highlighting updates without
   * depending on unrelated state as an implicit trigger.
   */
  refreshRouteCompanyIds: () => Promise<void>;
}

const CompanyWorkspaceContext = createContext<
  CompanyWorkspaceContextValue | undefined
>(undefined);

export interface CompanyWorkspaceProviderProps {
  /** Companies visible in this workspace. Used for route-ID enrichment (Task 3). */
  companies: UnifiedCompany[];
  children: React.ReactNode;
}

export function CompanyWorkspaceProvider({
  companies,
  children,
}: CompanyWorkspaceProviderProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );

  const selectCompany = useCallback((id: string) => {
    setSelectedCompanyId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCompanyId(null);
  }, []);

  const { activeRouteId } = useActiveRoute();
  const { getActiveRouteCompanyIds } = useRoutes();

  const [activeRouteCompanyIds, setActiveRouteCompanyIds] = useState<
    Set<string>
  >(new Set());

  const loadRouteCompanyIds = useCallback(async () => {
    if (!activeRouteId) {
      setActiveRouteCompanyIds(new Set());
      return;
    }
    try {
      const ids = await getActiveRouteCompanyIds();

      // Enrichment: route_companies stores shared_company_id, but the table
      // receives converted rows where id = tracking_id. Add both forms so
      // CompanyTable's membership check hits regardless of which ID it sees.
      // See src/components/organisms/CompanyTable/CompanyTable.tsx:142-156.
      const enriched = new Set(ids);
      companies.forEach((c) => {
        if (c.source === 'shared' && c.company_id && c.tracking_id) {
          if (ids.has(c.company_id)) {
            enriched.add(c.tracking_id);
          }
        }
      });

      logger.debug('Active route company IDs enriched', {
        originalSize: ids.size,
        enrichedSize: enriched.size,
      });
      setActiveRouteCompanyIds(enriched);
    } catch (err) {
      logger.error('Failed to load active route company IDs', {
        error: err instanceof Error ? err.message : String(err),
      });
      setActiveRouteCompanyIds(new Set());
    }
  }, [activeRouteId, getActiveRouteCompanyIds, companies]);

  // Re-derive when active route changes or the company universe changes.
  // Route-membership mutations (add/remove stop) call refreshRouteCompanyIds explicitly.
  useEffect(() => {
    loadRouteCompanyIds();
  }, [loadRouteCompanyIds]);

  const refreshRouteCompanyIds = useCallback(async () => {
    await loadRouteCompanyIds();
  }, [loadRouteCompanyIds]);

  const value = useMemo<CompanyWorkspaceContextValue>(
    () => ({
      selectedCompanyId,
      selectCompany,
      clearSelection,
      activeRouteCompanyIds,
      refreshRouteCompanyIds,
    }),
    [
      selectedCompanyId,
      selectCompany,
      clearSelection,
      activeRouteCompanyIds,
      refreshRouteCompanyIds,
    ]
  );

  return (
    <CompanyWorkspaceContext.Provider value={value}>
      {children}
    </CompanyWorkspaceContext.Provider>
  );
}

export function useCompanyWorkspace(): CompanyWorkspaceContextValue {
  const ctx = useContext(CompanyWorkspaceContext);
  if (ctx === undefined) {
    throw new Error(
      'useCompanyWorkspace must be used within a CompanyWorkspaceProvider'
    );
  }
  return ctx;
}

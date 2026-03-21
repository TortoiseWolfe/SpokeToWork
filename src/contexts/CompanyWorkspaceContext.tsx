'use client';

/**
 * CompanyWorkspaceContext — coordination state for the companies+map split
 * view. Owns SELECTION and DERIVED route-membership state. Domain data is
 * owned by the page (useCompanies) and passed as the `companies` prop.
 *
 * Consumes ActiveRouteContext + useRoutes (for route-company IDs).
 * Design: docs/plans/2026-03-06-unified-companies-map-design.md
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { UnifiedCompany } from '@/types/company';
import { useRoutes } from '@/hooks/useRoutes';
import { useActiveRoute } from '@/contexts/ActiveRouteContext';
import { createLogger } from '@/lib/logger';

const logger = createLogger('contexts:company-workspace');

export interface CompanyWorkspaceContextValue {
  /** Selected company's stable ID (tracking_id | private_company_id). */
  selectedCompanyId: string | null;
  selectCompany: (id: string) => void;
  clearSelection: () => void;
  /**
   * Company identifiers on the active route, enriched so both company_id
   * AND tracking_id forms are present for shared companies (CompanyTable
   * checks multiple ID fields per row).
   */
  activeRouteCompanyIds: Set<string>;
  /** Re-fetch after addCompanyToRoute/removeCompanyFromRoute. */
  refreshRouteCompanyIds: () => Promise<void>;
}

const Ctx = createContext<CompanyWorkspaceContextValue | undefined>(undefined);

export interface CompanyWorkspaceProviderProps {
  /** Companies visible in this workspace — used for route-ID enrichment. */
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
  const selectCompany = useCallback(
    (id: string) => setSelectedCompanyId(id),
    []
  );
  const clearSelection = useCallback(() => setSelectedCompanyId(null), []);

  const { activeRouteId } = useActiveRoute();
  const { getActiveRouteCompanyIds } = useRoutes();
  const [activeRouteCompanyIds, setActiveRouteCompanyIds] = useState<
    Set<string>
  >(new Set());

  const loadRouteCompanyIds = useCallback(async () => {
    if (!activeRouteId) return setActiveRouteCompanyIds(new Set());
    try {
      const ids = await getActiveRouteCompanyIds();
      // Enrichment: route_companies stores shared_company_id, but converted
      // table rows use id=tracking_id. Add both forms so membership checks
      // hit regardless of which ID the row exposes.
      const enriched = new Set(ids);
      for (const c of companies) {
        if (
          c.source === 'shared' &&
          c.company_id &&
          c.tracking_id &&
          ids.has(c.company_id)
        ) {
          enriched.add(c.tracking_id);
        }
      }
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

  // Re-derive when active route or company universe changes. Route-membership
  // mutations (add/remove stop) call refreshRouteCompanyIds explicitly.
  useEffect(() => void loadRouteCompanyIds(), [loadRouteCompanyIds]);

  const refreshRouteCompanyIds = useCallback(
    () => loadRouteCompanyIds(),
    [loadRouteCompanyIds]
  );

  // prettier-ignore
  const value = useMemo<CompanyWorkspaceContextValue>(
    () => ({ selectedCompanyId, selectCompany, clearSelection,
      activeRouteCompanyIds, refreshRouteCompanyIds }),
    [selectedCompanyId, selectCompany, clearSelection,
      activeRouteCompanyIds, refreshRouteCompanyIds]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompanyWorkspace(): CompanyWorkspaceContextValue {
  const ctx = useContext(Ctx);
  if (ctx === undefined) {
    throw new Error(
      'useCompanyWorkspace must be used within a CompanyWorkspaceProvider'
    );
  }
  return ctx;
}

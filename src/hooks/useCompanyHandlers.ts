'use client';

/**
 * useCompanyHandlers — callback adapters for the companies page.
 * Extracted from CompaniesPageInner. Owns `flyTo` (table→map pulse).
 */

import { useCallback, useState } from 'react';
import {
  type AnyCompany,
  isUnifiedCompany,
  resolveUnified,
} from '@/lib/companies/company-adapter';
import { getUnifiedCompanyId } from '@/lib/companies/company-id';
import { exportCompanies } from '@/lib/companies/export';
import type { ExportFormat } from '@/components/molecular/CompanyExport';
import type { UseCompanyCrudReturn } from '@/hooks/useCompanyCrud';
import type { ModalsApi } from '@/hooks/useCompaniesPageModals';
import type { CompanyWorkspaceContextValue } from '@/contexts/CompanyWorkspaceContext';
import type {
  Company,
  CompanyStatus,
  HomeLocation,
  ImportResult,
  UnifiedCompany,
} from '@/types/company';

interface Deps {
  companies: UnifiedCompany[];
  crud: UseCompanyCrudReturn;
  ws: CompanyWorkspaceContextValue;
  modals: ModalsApi;
  addToRoute: (c: UnifiedCompany) => Promise<void>;
  saveHome: (loc: HomeLocation) => Promise<void>;
  setError: (msg: string | null) => void;
}

type FormData = Parameters<UseCompanyCrudReturn['add']>[0];

export interface UseCompanyHandlersReturn {
  flyTo: string | undefined;
  onCompanyClick: (c: AnyCompany) => void;
  onEdit: (c: AnyCompany) => void;
  onDelete: (c: AnyCompany) => Promise<void>;
  onStatusChange: (c: Company, s: CompanyStatus) => void;
  onAddToRoute: (c: AnyCompany) => void;
  onAdd: (d: FormData) => Promise<void>;
  onSave: (d: FormData) => Promise<void>;
  onSaveHome: (l: HomeLocation) => Promise<void>;
  onExport: (fmt: ExportFormat) => Promise<Blob>;
  onImport: (file: File) => Promise<ImportResult>;
}

const IMPORT_DISABLED = async (_file: File): Promise<ImportResult> => ({
  success: 0,
  failed: 0,
  errors: [
    { row: 0, reason: 'CSV import disabled during multi-tenant migration' },
  ],
});

export function useCompanyHandlers(d: Deps): UseCompanyHandlersReturn {
  const { companies, crud, ws, modals, addToRoute, saveHome, setError } = d;
  const [flyTo, setFlyTo] = useState<string | undefined>();

  const resolve = useCallback(
    (c: AnyCompany) => resolveUnified(c, companies),
    [companies]
  );

  const onCompanyClick = useCallback(
    (c: AnyCompany) => {
      const id = isUnifiedCompany(c) ? getUnifiedCompanyId(c) : c.id;
      ws.selectCompany(id);
      modals.close();
      modals.closeAppForm();
      setFlyTo(id);
      requestAnimationFrame(() => setFlyTo(undefined));
    },
    [ws, modals]
  );

  const onEdit = useCallback(
    (c: AnyCompany) => {
      const u = resolve(c);
      if (!u) return;
      crud.startEdit(u);
      ws.clearSelection();
      modals.close();
    },
    [resolve, crud, ws, modals]
  );

  const onDelete = useCallback(
    async (c: AnyCompany) => {
      const u = resolve(c);
      if (!u) return;
      await crud.remove(u);
      if (ws.selectedCompanyId === getUnifiedCompanyId(u)) ws.clearSelection();
    },
    [resolve, crud, ws]
  );

  /** Close panel on success, surface errors. */
  const guard = useCallback(
    async (fn: () => Promise<void>, msg: string) => {
      try {
        setError(null);
        await fn();
        modals.close();
      } catch (err) {
        setError(err instanceof Error ? err.message : msg);
        throw err;
      }
    },
    [modals, setError]
  );

  // prettier-ignore
  return {
    flyTo, onCompanyClick, onEdit, onDelete,
    onStatusChange: useCallback((c: Company, s: CompanyStatus) => {
      const u = resolve(c);
      if (u) void crud.setStatus(u, s);
    }, [resolve, crud]),
    onAddToRoute: useCallback((c: AnyCompany) => {
      const u = resolve(c);
      if (u) void addToRoute(u);
    }, [resolve, addToRoute]),
    onAdd: useCallback((v: FormData) => guard(() => crud.add(v), 'Failed to add company'), [crud, guard]),
    onSave: useCallback((v: FormData) => guard(() => crud.save(v), 'Failed to update company'), [crud, guard]),
    onSaveHome: useCallback((l: HomeLocation) => guard(() => saveHome(l), 'Failed to save home'), [saveHome, guard]),
    onExport: useCallback(async (fmt: ExportFormat) => exportCompanies(companies, fmt), [companies]),
    onImport: IMPORT_DISABLED,
  };
}

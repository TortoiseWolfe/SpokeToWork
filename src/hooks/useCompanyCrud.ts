'use client';

/**
 * useCompanyCrud — wraps useCompanies mutations in form-level callbacks:
 * create from CompanyCreate form shape, edit a UnifiedCompany (branch on
 * private/shared), delete with confirm, set status. Owns `editingCompany`.
 * Extracted from CompaniesPageInner.
 */

import { useCallback, useState } from 'react';
import { createLogger } from '@/lib/logger';
import type { UseCompaniesReturn } from '@/hooks/useCompanies';
import type {
  CompanyCreate,
  CompanyStatus,
  CompanyUpdate,
  PrivateCompanyCreate,
  UnifiedCompany,
} from '@/types/company';

const logger = createLogger('hooks:useCompanyCrud');

type Form = CompanyCreate | CompanyUpdate;
// prettier-ignore
type Cx = Pick<UseCompaniesReturn, 'createPrivate' | 'updatePrivate'
  | 'deletePrivate' | 'updateTracking' | 'stopTracking'>;

/** Form → PrivateCompanyCreate (undefined for omitted-optional). */
// prettier-ignore
const toCreate = (d: Form): PrivateCompanyCreate => ({
  name: d.name ?? '', address: d.address, latitude: d.latitude, longitude: d.longitude,
  website: d.website ?? undefined, careers_url: d.careers_url ?? undefined,
  phone: d.phone ?? undefined, email: d.email ?? undefined,
  contact_name: d.contact_name ?? undefined, contact_title: d.contact_title ?? undefined,
  notes: d.notes ?? undefined, status: d.status, priority: d.priority,
  follow_up_date: d.follow_up_date ?? undefined,
});

export interface UseCompanyCrudReturn {
  editingCompany: UnifiedCompany | null;
  startEdit: (company: UnifiedCompany) => void;
  cancelEdit: () => void;
  add: (data: Form) => Promise<void>;
  save: (data: Form) => Promise<void>;
  remove: (company: UnifiedCompany) => Promise<void>;
  setStatus: (company: UnifiedCompany, status: CompanyStatus) => Promise<void>;
}

export function useCompanyCrud(
  cx: Cx,
  onError: (message: string) => void
): UseCompanyCrudReturn {
  const [editingCompany, setEditingCompany] = useState<UnifiedCompany | null>(
    null
  );

  const add = useCallback(
    async (d: Form) => {
      logger.debug('add called', { name: d.name });
      await cx.createPrivate(toCreate(d));
    },
    [cx]
  );

  const save = useCallback(
    async (d: Form) => {
      if (!editingCompany) return;
      const e = editingCompany;
      if (e.source === 'private' && e.private_company_id) {
        // prettier-ignore
        await cx.updatePrivate({ id: e.private_company_id,
          name: d.name, address: d.address, latitude: d.latitude, longitude: d.longitude,
          website: d.website ?? null, careers_url: d.careers_url ?? null,
          phone: d.phone ?? null, email: d.email ?? null,
          contact_name: d.contact_name ?? null, contact_title: d.contact_title ?? null,
          notes: d.notes ?? null, status: d.status, priority: d.priority,
        });
      } else if (e.source === 'shared' && e.tracking_id) {
        // prettier-ignore
        await cx.updateTracking({ id: e.tracking_id,
          status: d.status, priority: d.priority, notes: d.notes ?? null,
          contact_name: d.contact_name ?? null, contact_title: d.contact_title ?? null,
        });
      }
      setEditingCompany(null);
    },
    [cx, editingCompany]
  );

  const run = useCallback(
    async (fn: () => Promise<void>, msg: string) => {
      try {
        await fn();
      } catch (err) {
        onError(err instanceof Error ? err.message : msg);
      }
    },
    [onError]
  );

  const remove = useCallback(
    (c: UnifiedCompany) =>
      run(async () => {
        if (!window.confirm(`Are you sure you want to delete "${c.name}"?`))
          return;
        if (c.source === 'private' && c.private_company_id)
          await cx.deletePrivate(c.private_company_id);
        else if (c.source === 'shared' && c.tracking_id)
          await cx.stopTracking(c.tracking_id);
      }, 'Failed to delete company'),
    [cx, run]
  );

  const setStatus = useCallback(
    (c: UnifiedCompany, status: CompanyStatus) =>
      run(async () => {
        if (c.source === 'private' && c.private_company_id)
          await cx.updatePrivate({ id: c.private_company_id, status });
        else if (c.source === 'shared' && c.tracking_id)
          await cx.updateTracking({ id: c.tracking_id, status });
      }, 'Failed to update status'),
    [cx, run]
  );

  return {
    editingCompany,
    startEdit: useCallback((c: UnifiedCompany) => setEditingCompany(c), []),
    cancelEdit: useCallback(() => setEditingCompany(null), []),
    add,
    save,
    remove,
    setStatus,
  };
}

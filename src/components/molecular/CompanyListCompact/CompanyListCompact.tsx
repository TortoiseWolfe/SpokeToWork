'use client';

import React from 'react';
import type { UnifiedCompany } from '@/types/company';
import { getUnifiedCompanyId } from '@/lib/companies/company-id';

export interface CompanyListCompactProps {
  companies: UnifiedCompany[];
  onCompanyClick: (company: UnifiedCompany) => void;
  activeRouteCompanyIds?: Set<string>;
  selectedCompanyId?: string;
}

/**
 * CompanyListCompact — mobile-sheet list.
 *
 * Intentionally thin: name, address, active-route icon, selection highlight.
 * No filters, no sort, no actions. The full CompanyTable doesn't fit in a
 * 50vh sheet and its multi-column layout reads badly at 390px wide.
 *
 * Tap → same handleCompanyClick the desktop table uses (select + fly + open
 * drawer). Drawer on mobile slides over the sheet; that's fine.
 *
 * Active-route check: the passed set is already enriched (both company_id
 * and tracking_id forms for shared companies) by CompanyWorkspaceContext, so
 * a direct .has(id) against getUnifiedCompanyId's output is sufficient.
 */
export function CompanyListCompact({
  companies,
  onCompanyClick,
  activeRouteCompanyIds,
  selectedCompanyId,
}: CompanyListCompactProps) {
  return (
    <ul className="divide-base-300 divide-y" data-testid="company-list-compact">
      {companies.map((company) => {
        const id = getUnifiedCompanyId(company);
        const onRoute = activeRouteCompanyIds?.has(id) ?? false;
        const selected = id === selectedCompanyId;
        return (
          <li key={id}>
            <button
              type="button"
              data-testid={`compact-row-${id}`}
              onClick={() => onCompanyClick(company)}
              className={`flex min-h-11 w-full items-center gap-3 px-2 py-3 text-left ${
                selected ? 'bg-primary/10' : 'active:bg-base-200'
              }`}
            >
              {onRoute && (
                <span
                  className="text-primary shrink-0"
                  title="On active route"
                  aria-label="On active route"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.5 17.5a3 3 0 100-6 3 3 0 000 6zm13 0a3 3 0 100-6 3 3 0 000 6zM5.5 14.5h4l2-3m0 0l2.5-3 3 3m-5.5 0l2 3h4.5"
                    />
                  </svg>
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{company.name}</div>
                <div className="text-base-content/70 truncate text-sm">
                  {company.address}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

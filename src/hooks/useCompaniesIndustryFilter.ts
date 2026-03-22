'use client';

/**
 * useCompaniesIndustryFilter
 *
 * Bundles industry-filter state for CompaniesPageInner:
 *   - industryIds selection state + setter
 *   - useIndustries() tree for the dropdown, resolve for marker styling
 *   - companyFilters memo — stable ref for useCompanies deps
 *
 * Lets CompaniesPageInner stay under the 150-line budget.
 */

import { useMemo, useState } from 'react';
import { useIndustries, type IndustryTreeNode } from '@/hooks/useIndustries';
import type { ResolvedIndustry, UnifiedCompanyFilters } from '@/types/company';

export interface UseCompaniesIndustryFilterReturn {
  industryIds: string[];
  setIndustryIds: (ids: string[]) => void;
  industryTree: IndustryTreeNode[];
  resolveIndustry: (id: string) => ResolvedIndustry | null;
  companyFilters: UnifiedCompanyFilters | undefined;
}

export function useCompaniesIndustryFilter(): UseCompaniesIndustryFilterReturn {
  const [industryIds, setIndustryIds] = useState<string[]>([]);
  const { tree: industryTree, resolve: resolveIndustry } = useIndustries();

  // Filters object MUST be stable — it's in fetchCompanies deps (useCompanies.ts:228).
  // Empty industry filter → undefined so cache key matches the unfiltered case.
  const companyFilters = useMemo(
    () => (industryIds.length ? { industry_ids: industryIds } : undefined),
    [industryIds]
  );

  return { industryIds, setIndustryIds, industryTree, resolveIndustry, companyFilters };
}

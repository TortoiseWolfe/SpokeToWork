'use client';

/** Page-scoped — renders between toolbar and panel. Not a shared component. */

import { IndustryFilter } from '@/components/molecular/IndustryFilter';
import type { IndustryTreeNode } from '@/hooks/useIndustries';

export interface CompaniesFilterBarProps {
  industryTree: IndustryTreeNode[];
  selectedIndustries: string[];
  onIndustriesChange: (ids: string[]) => void;
}

export function CompaniesFilterBar(p: CompaniesFilterBarProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <IndustryFilter
        tree={p.industryTree}
        selected={p.selectedIndustries}
        onChange={p.onIndustriesChange}
      />
    </div>
  );
}

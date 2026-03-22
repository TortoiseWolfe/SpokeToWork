'use client';

/**
 * useIndustries — factory wrapper around the generic taxonomy hook.
 *
 * Re-exports the old public API (IndustryTreeNode, buildResolver, toIndustry,
 * UseIndustriesReturn) so callsites outside this module don't change.
 */

import {
  createTaxonomyHook,
  buildResolver as _buildResolver,
  toTaxonomyNode,
  type TaxonomyTreeNode,
  type ResolvedTaxonomyNode,
  type UseTaxonomyReturn,
} from '@/lib/taxonomy/adjacency';
import type { Industry, ResolvedIndustry } from '@/types/company';

// ─── Type aliases (old names stay public) ───────────────────────────────────

export type IndustryTreeNode = TaxonomyTreeNode<Industry>;

export interface UseIndustriesReturn extends UseTaxonomyReturn<Industry> {
  industries: Industry[];
  resolve: (id: string) => ResolvedIndustry | null;
}

// ─── Legacy function re-exports for unit tests ──────────────────────────────

export function toIndustry(row: {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}): Industry {
  return toTaxonomyNode<Industry>(row);
}

export function buildResolver(
  rows: Industry[]
): (id: string) => ResolvedIndustry | null {
  const inner = _buildResolver<Industry>(rows, { color: 'primary', icon: 'building' });
  return (id: string) => inner(id) as ResolvedIndustry | null;
}

// ─── Hook (per-instantiation cache inside factory) ───────────────────────────

const _useIndustries = createTaxonomyHook<Industry>({
  table: 'industries',
  fallbackColor: 'primary',
  fallbackIcon: 'building',
});

export function useIndustries(): UseIndustriesReturn {
  const base = _useIndustries();
  return {
    ...base,
    industries: base.rows,
    resolve: base.resolve as (id: string) => ResolvedIndustry | null,
  };
}

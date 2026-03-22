'use client';

/**
 * useIndustries — fetch full taxonomy once, resolve inherited color/icon.
 *
 * Taxonomy is small (29 rows) and rarely changes. Module-level cache with
 * a long TTL; no invalidation needed in normal operation.
 */

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Industry, ResolvedIndustry } from '@/types/company';
import type { ThemeColors } from '@/hooks/useThemeColors';

const FALLBACK_COLOR: keyof ThemeColors = 'primary';
const FALLBACK_ICON = 'building';

let cache: { rows: Industry[]; ts: number } | null = null;
const TTL = 10 * 60 * 1000;

const THEME_COLOR_KEYS: ReadonlySet<string> = new Set<keyof ThemeColors>([
  'primary',
  'secondary',
  'accent',
  'success',
  'warning',
  'error',
  'info',
]);

/**
 * Narrow a wire-layer industries Row to the domain Industry type.
 * DB has no CHECK on color (only a COMMENT) — an admin typo is possible.
 * Invalid color → null (inherits from parent via resolver).
 */
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
  return {
    ...row,
    color:
      row.color !== null && THEME_COLOR_KEYS.has(row.color)
        ? (row.color as keyof ThemeColors)
        : null,
  };
}

/**
 * Pure resolver builder. Exported for unit testing without React.
 * Walks parent chain for null color/icon. 3-hop worst case on 29 nodes.
 */
export function buildResolver(
  rows: Industry[]
): (id: string) => ResolvedIndustry | null {
  const byId = new Map(rows.map((r) => [r.id, r]));

  return (id: string): ResolvedIndustry | null => {
    const self = byId.get(id);
    if (!self) return null;

    let color: keyof ThemeColors | null = null;
    let icon: string | null = null;
    const chain: Industry[] = [];

    let cur: Industry | undefined = self;
    // Cycle guard: matches the SQL-side UNION fixpoint at migration:2145.
    // An admin-written parent_id cycle terminates at |rows| hops instead of
    // spinning. The acyclic case (3-level tree) exits naturally at ≤3.
    while (cur && chain.length < rows.length) {
      chain.push(cur);
      color ??= cur.color;
      icon ??= cur.icon;
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }

    return {
      id: self.id,
      parent_id: self.parent_id,
      slug: self.slug,
      name: self.name,
      color: color ?? FALLBACK_COLOR,
      icon: icon ?? FALLBACK_ICON,
      ancestry: chain.reverse().map((c) => c.name),
    };
  };
}

export interface IndustryTreeNode {
  industry: Industry;
  children: IndustryTreeNode[];
}

function buildTree(rows: Industry[]): IndustryTreeNode[] {
  const nodes = new Map<string, IndustryTreeNode>(
    rows.map((r) => [r.id, { industry: r, children: [] }])
  );
  const roots: IndustryTreeNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parent_id && nodes.has(row.parent_id)) {
      nodes.get(row.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a: IndustryTreeNode, b: IndustryTreeNode) =>
    a.industry.sort_order - b.industry.sort_order;
  const sortRec = (ns: IndustryTreeNode[]) => {
    ns.sort(sortFn);
    ns.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export interface UseIndustriesReturn {
  industries: Industry[];
  tree: IndustryTreeNode[];
  resolve: (id: string) => ResolvedIndustry | null;
  isLoading: boolean;
  error: Error | null;
}

export function useIndustries(): UseIndustriesReturn {
  const fresh = cache !== null && Date.now() - cache.ts < TTL;
  const [rows, setRows] = useState<Industry[]>(() => (fresh ? cache!.rows : []));
  const [isLoading, setIsLoading] = useState(!fresh);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (cache && Date.now() - cache.ts < TTL) {
      setRows(cache.rows);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error: err } = await createClient()
        .from('industries')
        .select('*')
        .order('sort_order');
      if (cancelled) return;
      if (err) {
        setError(new Error(err.message));
      } else {
        cache = { rows: data.map(toIndustry), ts: Date.now() };
        setRows(cache.rows);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolve = useMemo(() => buildResolver(rows), [rows]);
  const tree = useMemo(() => buildTree(rows), [rows]);

  return { industries: rows, tree, resolve, isLoading, error };
}

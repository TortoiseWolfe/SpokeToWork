'use client';

/**
 * Generic adjacency-list taxonomy factory.
 *
 * `useIndustries` and `useSkills` are structurally identical — same resolver
 * logic, same TTL cache, same tree builder. Only the Supabase table name and
 * the fallback color/icon differ. This module extracts that shared ~150 lines
 * so the two hooks become ~20-line factory wrappers.
 *
 * Critical invariant: `createTaxonomyHook` closes over a **per-instantiation**
 * cache inside the factory body. A module-level singleton would cause
 * useIndustries and useSkills to stomp each other's rows.
 */

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ThemeColors } from '@/hooks/useThemeColors';

// ─── Shared node shape ─────────────────────────────────────────────────────

export interface TaxonomyNode {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  color: keyof ThemeColors | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ResolvedTaxonomyNode {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  color: keyof ThemeColors;
  icon: string;
  ancestry: string[];
}

export interface TaxonomyTreeNode<T extends TaxonomyNode> {
  node: T;
  children: TaxonomyTreeNode<T>[];
}

// ─── Pure helper functions ──────────────────────────────────────────────────

const THEME_COLOR_KEYS: ReadonlySet<string> = new Set<keyof ThemeColors>([
  'primary',
  'secondary',
  'accent',
  'success',
  'warning',
  'error',
  'info',
]);

/** Narrow a raw DB string to a ThemeColors key, or null if invalid. */
export function narrowColor(raw: string | null): keyof ThemeColors | null {
  return raw !== null && THEME_COLOR_KEYS.has(raw)
    ? (raw as keyof ThemeColors)
    : null;
}

/**
 * Narrow a wire-layer row to the domain TaxonomyNode type.
 * DB has no CHECK on color (only a COMMENT) — admin typos are possible.
 * Invalid color → null (inherits from parent via resolver).
 */
export function toTaxonomyNode<T extends TaxonomyNode>(row: {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}): T {
  return {
    ...row,
    color: narrowColor(row.color),
  } as T;
}

/**
 * Pure resolver builder. Exported for unit testing without React.
 * Walks parent chain for null color/icon. 3-hop worst case on typical trees.
 */
export function buildResolver<T extends TaxonomyNode>(
  rows: T[],
  fallback: { color: keyof ThemeColors; icon: string }
): (id: string) => ResolvedTaxonomyNode | null {
  const byId = new Map(rows.map((r) => [r.id, r]));

  return (id: string): ResolvedTaxonomyNode | null => {
    const self = byId.get(id);
    if (!self) return null;

    let color: keyof ThemeColors | null = null;
    let icon: string | null = null;
    const chain: T[] = [];

    let cur: T | undefined = self;
    // Cycle guard: matches the SQL-side UNION fixpoint.
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
      color: color ?? fallback.color,
      icon: icon ?? fallback.icon,
      ancestry: chain.reverse().map((c) => c.name),
    };
  };
}

export function buildTree<T extends TaxonomyNode>(
  rows: T[]
): TaxonomyTreeNode<T>[] {
  const nodes = new Map<string, TaxonomyTreeNode<T>>(
    rows.map((r) => [r.id, { node: r, children: [] }])
  );
  const roots: TaxonomyTreeNode<T>[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parent_id && nodes.has(row.parent_id)) {
      nodes.get(row.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a: TaxonomyTreeNode<T>, b: TaxonomyTreeNode<T>) =>
    a.node.sort_order - b.node.sort_order;
  const sortRec = (ns: TaxonomyTreeNode<T>[]) => {
    ns.sort(sortFn);
    ns.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

// ─── Hook factory ─────────────────────────────────────────────────────────

export interface UseTaxonomyReturn<T extends TaxonomyNode> {
  rows: T[];
  tree: TaxonomyTreeNode<T>[];
  resolve: (id: string) => ResolvedTaxonomyNode | null;
  isLoading: boolean;
  error: Error | null;
}

const TTL = 10 * 60 * 1000;

/**
 * Factory — call once at module scope, use the returned hook anywhere.
 *
 * ```ts
 * export const useIndustries = createTaxonomyHook<Industry>({
 *   table: 'industries',
 *   fallbackColor: 'primary',
 *   fallbackIcon: 'building',
 * });
 * ```
 */
export function createTaxonomyHook<T extends TaxonomyNode>(cfg: {
  table: 'industries' | 'skills';
  fallbackColor: keyof ThemeColors;
  fallbackIcon: string;
}): () => UseTaxonomyReturn<T> {
  // Per-instantiation cache — isolated from other hooks created by this factory.
  let cache: { rows: T[]; ts: number } | null = null;

  return function useTaxonomy(): UseTaxonomyReturn<T> {
    const fresh = cache !== null && Date.now() - cache.ts < TTL;
    const [rows, setRows] = useState<T[]>(() => (fresh ? cache!.rows : []));
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
         
        const { data, error: err } = await (createClient() as any)
          .from(cfg.table)
          .select('*')
          .order('sort_order');
        if (cancelled) return;
        if (err) {
          setError(new Error(err.message));
        } else {
          cache = {
            rows: (data as any[]).map((r) => toTaxonomyNode<T>(r)),
            ts: Date.now(),
          };
          setRows(cache.rows);
        }
        setIsLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, []);

    const resolve = useMemo(
      () =>
        buildResolver<T>(rows, {
          color: cfg.fallbackColor,
          icon: cfg.fallbackIcon,
        }),
      [rows]
    );
    const tree = useMemo(() => buildTree<T>(rows), [rows]);

    return { rows, tree, resolve, isLoading, error };
  };
}

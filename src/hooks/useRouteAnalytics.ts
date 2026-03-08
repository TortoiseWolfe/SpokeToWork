'use client';

import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

// Generated Database type does not yet include bicycle_routes /
// route_companies / metro_areas (schema drift post Task-1 RLS).
// Existing callers (route-service.ts, multi-tenant-service.ts) use the
// untyped SupabaseClient for these tables; mirror that here.
const db = supabase as SupabaseClient;

export interface MetroRouteCount {
  metroId: string | null;
  metroName: string;
  count: number;
}

export interface RouteAnalytics {
  totalRoutes: number;
  activeRoutes: number;
  inactiveRoutes: number;
  routesPerMetro: MetroRouteCount[];
  /** Sum of route_companies per route_id divided by totalRoutes. Routes
   *  with zero stops still count in the denominator. */
  avgStopsPerRoute: number;
  /** Mean of non-null distance_miles. 0 if all null. */
  avgDistanceMiles: number;
  isLoading: boolean;
  error: Error | null;
}

interface RouteRow {
  id: string;
  is_active: boolean;
  metro_area_id: string | null;
  distance_miles: number | null;
}

export function useRouteAnalytics(): RouteAnalytics {
  const [state, setState] = useState<RouteAnalytics>({
    totalRoutes: 0,
    activeRoutes: 0,
    inactiveRoutes: 0,
    routesPerMetro: [],
    avgStopsPerRoute: 0,
    avgDistanceMiles: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      db
        .from('bicycle_routes')
        .select('id, is_active, metro_area_id, distance_miles'),
      db.from('route_companies').select('route_id'),
      db.from('metro_areas').select('id, name'),
    ])
      .then(([routesRes, stopsRes, metrosRes]) => {
        if (cancelled) return;

        const firstErr = routesRes.error || stopsRes.error || metrosRes.error;
        if (firstErr) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: new Error(firstErr.message),
          }));
          return;
        }

        const routes = (routesRes.data ?? []) as RouteRow[];
        const stops = (stopsRes.data ?? []) as Array<{ route_id: string }>;
        const metros = (metrosRes.data ?? []) as Array<{
          id: string;
          name: string;
        }>;

        const total = routes.length;
        const active = routes.filter((r) => r.is_active).length;

        // stops per route
        const stopsByRoute = new Map<string, number>();
        for (const s of stops) {
          stopsByRoute.set(s.route_id, (stopsByRoute.get(s.route_id) ?? 0) + 1);
        }
        const totalStops = routes.reduce(
          (acc, r) => acc + (stopsByRoute.get(r.id) ?? 0),
          0
        );
        const avgStops = total > 0 ? totalStops / total : 0;

        // distance — non-null only
        const distances = routes
          .map((r) => r.distance_miles)
          .filter((d): d is number => d != null);
        const avgDist =
          distances.length > 0
            ? distances.reduce((a, b) => a + b, 0) / distances.length
            : 0;

        // per-metro
        const metroName = new Map(metros.map((m) => [m.id, m.name]));
        const byMetro = new Map<string | null, number>();
        for (const r of routes) {
          byMetro.set(r.metro_area_id, (byMetro.get(r.metro_area_id) ?? 0) + 1);
        }
        const routesPerMetro: MetroRouteCount[] = Array.from(byMetro.entries())
          .map(([metroId, count]) => ({
            metroId,
            metroName:
              metroId == null
                ? 'Unassigned'
                : (metroName.get(metroId) ?? metroId),
            count,
          }))
          .sort(
            (a, b) =>
              b.count - a.count || a.metroName.localeCompare(b.metroName)
          );

        setState({
          totalRoutes: total,
          activeRoutes: active,
          inactiveRoutes: total - active,
          routesPerMetro,
          avgStopsPerRoute: avgStops,
          avgDistanceMiles: avgDist,
          isLoading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

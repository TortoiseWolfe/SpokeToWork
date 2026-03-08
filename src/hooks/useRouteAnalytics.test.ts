import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Three tables → three mockable .from() responses
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

import { useRouteAnalytics } from './useRouteAnalytics';

// Helper: .from(x).select(y) resolves to { data, error }
function mockTable(rows: unknown[]) {
  return { select: vi.fn().mockResolvedValue({ data: rows, error: null }) };
}

describe('useRouteAnalytics', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('computes aggregates from three parallel fetches', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bicycle_routes') {
        return mockTable([
          {
            id: 'r1',
            is_active: true,
            metro_area_id: 'm1',
            distance_miles: 10,
          },
          {
            id: 'r2',
            is_active: true,
            metro_area_id: 'm1',
            distance_miles: 20,
          },
          {
            id: 'r3',
            is_active: false,
            metro_area_id: 'm2',
            distance_miles: null,
          },
          {
            id: 'r4',
            is_active: true,
            metro_area_id: null,
            distance_miles: 30,
          },
        ]);
      }
      if (table === 'route_companies') {
        // r1 has 3 stops, r2 has 1, r3 and r4 have 0
        return mockTable([
          { route_id: 'r1' },
          { route_id: 'r1' },
          { route_id: 'r1' },
          { route_id: 'r2' },
        ]);
      }
      if (table === 'metro_areas') {
        return mockTable([
          { id: 'm1', name: 'Cleveland' },
          { id: 'm2', name: 'Bradley' },
        ]);
      }
      throw new Error(`unexpected table ${table}`);
    });

    const { result } = renderHook(() => useRouteAnalytics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalRoutes).toBe(4);
    expect(result.current.activeRoutes).toBe(3);
    expect(result.current.inactiveRoutes).toBe(1);
    // (3+1+0+0) / 4 = 1
    expect(result.current.avgStopsPerRoute).toBe(1);
    // mean of non-null: (10+20+30)/3 = 20
    expect(result.current.avgDistanceMiles).toBe(20);
    // sorted desc by count
    expect(result.current.routesPerMetro).toEqual([
      { metroId: 'm1', metroName: 'Cleveland', count: 2 },
      { metroId: 'm2', metroName: 'Bradley', count: 1 },
      { metroId: null, metroName: 'Unassigned', count: 1 },
    ]);
  });

  it('handles zero routes', async () => {
    mockFrom.mockImplementation(() => mockTable([]));
    const { result } = renderHook(() => useRouteAnalytics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalRoutes).toBe(0);
    expect(result.current.avgStopsPerRoute).toBe(0); // not NaN
    expect(result.current.avgDistanceMiles).toBe(0); // not NaN
    expect(result.current.routesPerMetro).toEqual([]);
  });

  it('surfaces error', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'boom', details: '', hint: '', code: 'PGRST' },
      }),
    }));
    const { result } = renderHook(() => useRouteAnalytics());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('boom');
  });
});

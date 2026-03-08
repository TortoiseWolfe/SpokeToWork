import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePendingMarkers } from './usePendingMarkers';
import type { ModerationQueueItem } from '@/lib/companies/admin-moderation-service';

const base: ModerationQueueItem = {
  id: 'contrib-1',
  type: 'contribution',
  user_id: 'u1',
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
  private_company_id: 'pc-1',
  private_company_name: 'Acme',
  latitude: 51.5,
  longitude: -0.1,
};

describe('usePendingMarkers', () => {
  it('maps contribution items to pending-contribution markers', () => {
    const { result } = renderHook(() => usePendingMarkers([base]));
    expect(result.current).toEqual([
      {
        id: 'pending-contrib-1',
        position: [51.5, -0.1],
        popup: 'Acme',
        variant: 'pending-contribution',
      },
    ]);
  });

  it('filters items with null coordinates', () => {
    const { result } = renderHook(() =>
      usePendingMarkers([{ ...base, latitude: null, longitude: null }])
    );
    expect(result.current).toEqual([]);
  });

  it('filters edit_suggestion items (they have no coords and no marker)', () => {
    const editItem: ModerationQueueItem = {
      id: 'edit-1',
      type: 'edit_suggestion',
      user_id: 'u1',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
      shared_company_id: 'sc-1',
      shared_company_name: 'Foo',
      field_name: 'website',
      new_value: 'https://foo.test',
    };
    const { result } = renderHook(() => usePendingMarkers([base, editItem]));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('pending-contrib-1');
  });

  it('returns stable reference across rerenders with same input', () => {
    const items = [base];
    const { result, rerender } = renderHook(({ i }) => usePendingMarkers(i), {
      initialProps: { i: items },
    });
    const first = result.current;
    rerender({ i: items });
    expect(result.current).toBe(first);
  });
});

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useApprovedMarkers } from './useApprovedMarkers';
import type { NearbyLocation } from '@/lib/companies/nearby-locations';

const loc: NearbyLocation = {
  id: 'loc-1',
  shared_company_id: 'sc-1',
  shared_company_name: 'Existing Co',
  latitude: 51.51,
  longitude: -0.12,
  address: '5 Side St',
  is_headquarters: true,
};

describe('useApprovedMarkers', () => {
  it('maps nearby locations to default-variant markers with address in popup', () => {
    const { result } = renderHook(() => useApprovedMarkers([loc]));
    expect(result.current).toEqual([
      {
        id: 'approved-loc-1',
        position: [51.51, -0.12],
        popup: 'Existing Co\n5 Side St',
        variant: 'default',
      },
    ]);
  });

  it('omits address line when address is null', () => {
    const { result } = renderHook(() =>
      useApprovedMarkers([{ ...loc, address: null }]),
    );
    expect(result.current[0].popup).toBe('Existing Co');
  });

  it('one marker per location (not per company) — dedup is the panel job', () => {
    const loc2: NearbyLocation = { ...loc, id: 'loc-2', address: '9 Other St' };
    const { result } = renderHook(() => useApprovedMarkers([loc, loc2]));
    expect(result.current).toHaveLength(2);
  });
});

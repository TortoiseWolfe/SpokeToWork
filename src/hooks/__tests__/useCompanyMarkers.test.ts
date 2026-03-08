import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { UnifiedCompany } from '@/types/company';
import { useCompanyMarkers } from '../useCompanyMarkers';

// Minimal fixture — only fields the hook reads. Cast covers the rest.
const company = (over: Partial<UnifiedCompany>): UnifiedCompany =>
  ({
    source: 'private',
    tracking_id: null,
    company_id: null,
    private_company_id: 'pc-default',
    name: 'Default Co',
    latitude: 40.7,
    longitude: -74.0,
    ...over,
  }) as UnifiedCompany;

describe('useCompanyMarkers', () => {
  it('transforms a company with coords into a marker', () => {
    const companies = [company({ private_company_id: 'pc-1', name: 'Acme' })];
    const { result } = renderHook(() => useCompanyMarkers(companies));
    expect(result.current).toEqual([
      {
        id: 'company-pc-1',
        position: [40.7, -74.0],
        popup: 'Acme',
        variant: 'default',
      },
    ]);
  });

  it('filters companies without coords', () => {
    const companies = [
      company({ private_company_id: 'has', latitude: 1, longitude: 2 }),
      company({ private_company_id: 'no-lat', latitude: null }),
      company({ private_company_id: 'no-lng', longitude: null }),
    ];
    const { result } = renderHook(() => useCompanyMarkers(companies));
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('company-has');
  });

  it('uses tracking_id for shared companies', () => {
    const companies = [
      company({
        source: 'shared',
        tracking_id: 'tr-1',
        company_id: 'sc-1',
        private_company_id: null,
      }),
    ];
    const { result } = renderHook(() => useCompanyMarkers(companies));
    expect(result.current[0].id).toBe('company-tr-1');
  });

  it('assigns next-ride variant when id is in nextRideIds set', () => {
    const companies = [company({ private_company_id: 'pc-1' })];
    const { result } = renderHook(() =>
      useCompanyMarkers(companies, { nextRideIds: new Set(['pc-1']) }),
    );
    expect(result.current[0].variant).toBe('next-ride');
  });

  it('assigns active-route variant when id is in activeRouteIds set', () => {
    const companies = [company({ private_company_id: 'pc-1' })];
    const { result } = renderHook(() =>
      useCompanyMarkers(companies, { activeRouteIds: new Set(['pc-1']) }),
    );
    expect(result.current[0].variant).toBe('active-route');
  });

  it('next-ride wins over active-route when id is in both sets', () => {
    const companies = [company({ private_company_id: 'pc-1' })];
    const { result } = renderHook(() =>
      useCompanyMarkers(companies, {
        nextRideIds: new Set(['pc-1']),
        activeRouteIds: new Set(['pc-1']),
      }),
    );
    expect(result.current[0].variant).toBe('next-ride');
  });

  it('memoizes — same inputs give same reference', () => {
    const companies = [company({ private_company_id: 'pc-1' })];
    const activeRouteIds = new Set(['pc-1']);
    const { result, rerender } = renderHook(
      (props) => useCompanyMarkers(props.companies, props.opts),
      { initialProps: { companies, opts: { activeRouteIds } } },
    );
    const first = result.current;
    rerender({ companies, opts: { activeRouteIds } });
    expect(result.current).toBe(first);
  });
});

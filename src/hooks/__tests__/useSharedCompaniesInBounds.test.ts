import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

/**
 * Chainable Supabase query mock. Each chain method records its args and
 * returns the same mock; the whole chain is thenable so `await supabase
 * .from(...).select(...).gte(...).lte(...)` resolves to whatever we set
 * as `result`. Much less brittle than guessing which call terminates
 * the chain.
 */
function chainMock() {
  let result: { data: unknown; error: unknown } = { data: [], error: null };
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    // Thenable so `await chain` works.
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve(result),
  };
  return {
    chain,
    setResult: (r: { data: unknown; error: unknown }) => {
      result = r;
    },
  };
}

const mock = chainMock();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mock.chain,
}));

import { useSharedCompaniesInBounds } from '../useSharedCompaniesInBounds';

const BOUNDS = { north: 41, south: 40, east: -73, west: -75 };

describe('useSharedCompaniesInBounds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.setResult({ data: [], error: null });
  });

  it('does not query when bounds is null', async () => {
    const { result } = renderHook(() => useSharedCompaniesInBounds(null));
    // One tick for the effect to run (and short-circuit).
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mock.chain.from).not.toHaveBeenCalled();
    expect(result.current.companies).toEqual([]);
  });

  it('queries company_locations with box bounds', async () => {
    mock.setResult({ data: [], error: null });
    const { result } = renderHook(() => useSharedCompaniesInBounds(BOUNDS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mock.chain.from).toHaveBeenCalledWith('company_locations');
    expect(mock.chain.gte).toHaveBeenCalledWith('latitude', BOUNDS.south);
    expect(mock.chain.lte).toHaveBeenCalledWith('latitude', BOUNDS.north);
    expect(mock.chain.gte).toHaveBeenCalledWith('longitude', BOUNDS.west);
    expect(mock.chain.lte).toHaveBeenCalledWith('longitude', BOUNDS.east);
  });

  it('maps rows into SharedCompanyInBounds shape', async () => {
    mock.setResult({
      data: [
        {
          id: 'loc-1',
          shared_company_id: 'co-1',
          latitude: 40.7,
          longitude: -74.0,
          address: '1 Main St',
          shared_companies: { name: 'Acme' },
        },
        {
          id: 'loc-2',
          shared_company_id: 'co-2',
          latitude: 40.8,
          longitude: -73.9,
          address: null,
          // Supabase sometimes returns joins as an array depending on
          // relationship config — mapper should handle both.
          shared_companies: [{ name: 'Beta' }],
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useSharedCompaniesInBounds(BOUNDS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.companies).toEqual([
      {
        id: 'loc-1',
        shared_company_id: 'co-1',
        name: 'Acme',
        latitude: 40.7,
        longitude: -74.0,
        address: '1 Main St',
      },
      {
        id: 'loc-2',
        shared_company_id: 'co-2',
        name: 'Beta',
        latitude: 40.8,
        longitude: -73.9,
        address: null,
      },
    ]);
  });

  it('surfaces query errors', async () => {
    mock.setResult({ data: null, error: { message: 'db down' } });
    const { result } = renderHook(() => useSharedCompaniesInBounds(BOUNDS));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('db down');
    expect(result.current.companies).toEqual([]);
  });

  it('re-queries when bounds change', async () => {
    mock.setResult({ data: [], error: null });
    const { result, rerender } = renderHook(
      ({ b }) => useSharedCompaniesInBounds(b),
      { initialProps: { b: BOUNDS as typeof BOUNDS | null } }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    vi.clearAllMocks();
    rerender({ b: { north: 42, south: 41, east: -72, west: -74 } });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mock.chain.gte).toHaveBeenCalledWith('latitude', 41);
    expect(mock.chain.lte).toHaveBeenCalledWith('latitude', 42);
  });
});

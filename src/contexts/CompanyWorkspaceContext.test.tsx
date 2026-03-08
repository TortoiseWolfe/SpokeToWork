import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  CompanyWorkspaceProvider,
  useCompanyWorkspace,
} from './CompanyWorkspaceContext';
import type { UnifiedCompany } from '@/types/company';

// useRoutes internally reads AuthContext + ActiveRouteContext. Mock both.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, isLoading: false }),
}));
let mockActiveRouteId: string | null = null;
vi.mock('@/contexts/ActiveRouteContext', () => ({
  useActiveRoute: () => ({
    activeRouteId: mockActiveRouteId,
    isLoading: false,
    setActiveRoute: vi.fn(),
    clearActiveRoute: vi.fn(),
    refresh: vi.fn(),
  }),
}));
// Mock useRoutes — provider will call it in Task 3. Mock now so tests don't break later.
const mockGetActiveRouteCompanyIds = vi.fn().mockResolvedValue(new Set<string>());
vi.mock('@/hooks/useRoutes', () => ({
  useRoutes: () => ({
    routes: [],
    activeRouteId: null,
    isLoading: false,
    error: null,
    getActiveRouteCompanyIds: mockGetActiveRouteCompanyIds,
    getRouteCompanies: vi.fn().mockResolvedValue([]),
    createRoute: vi.fn(),
    updateRoute: vi.fn(),
    deleteRoute: vi.fn(),
    setActiveRoute: vi.fn(),
    clearActiveRoute: vi.fn(),
    addCompanyToRoute: vi.fn(),
    removeCompanyFromRoute: vi.fn(),
    reorderCompanies: vi.fn(),
    toggleNextRide: vi.fn(),
    getNextRideCompanies: vi.fn(),
    clearAllNextRide: vi.fn(),
    getRouteById: vi.fn(),
    getRouteWithCompanies: vi.fn(),
    getSystemRoutes: vi.fn(),
    refetch: vi.fn(),
    invalidateCache: vi.fn(),
  }),
}));

function makeCompany(overrides: Partial<UnifiedCompany> = {}): UnifiedCompany {
  return {
    source: 'private',
    tracking_id: null,
    company_id: null,
    private_company_id: 'p-1',
    user_id: 'u1',
    metro_area_id: null,
    name: 'Test',
    website: null,
    careers_url: null,
    address: '',
    latitude: null,
    longitude: null,
    phone: null,
    email: null,
    contact_name: null,
    contact_title: null,
    notes: null,
    status: 'not_contacted',
    priority: 3,
    follow_up_date: null,
    is_active: true,
    is_verified: false,
    submit_to_shared: false,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function Probe() {
  const { selectedCompanyId, selectCompany, clearSelection } = useCompanyWorkspace();
  return (
    <div>
      <div data-testid="selected">{selectedCompanyId ?? 'none'}</div>
      <button onClick={() => selectCompany('p-1')}>select p-1</button>
      <button onClick={() => clearSelection()}>clear</button>
    </div>
  );
}

function RouteIdsProbe() {
  const { activeRouteCompanyIds, refreshRouteCompanyIds } = useCompanyWorkspace();
  return (
    <div>
      <div data-testid="ids">{[...activeRouteCompanyIds].sort().join(',') || 'empty'}</div>
      <button onClick={() => refreshRouteCompanyIds()}>refresh</button>
    </div>
  );
}

describe('CompanyWorkspaceContext — selection', () => {
  beforeEach(() => {
    mockActiveRouteId = null;
    mockGetActiveRouteCompanyIds.mockClear();
  });

  it('starts with no selection', () => {
    render(
      <CompanyWorkspaceProvider companies={[]}>
        <Probe />
      </CompanyWorkspaceProvider>
    );
    expect(screen.getByTestId('selected')).toHaveTextContent('none');
  });

  it('selectCompany sets selectedCompanyId', async () => {
    const user = userEvent.setup();
    render(
      <CompanyWorkspaceProvider companies={[makeCompany()]}>
        <Probe />
      </CompanyWorkspaceProvider>
    );
    await user.click(screen.getByText('select p-1'));
    expect(screen.getByTestId('selected')).toHaveTextContent('p-1');
  });

  it('clearSelection resets to null', async () => {
    const user = userEvent.setup();
    render(
      <CompanyWorkspaceProvider companies={[makeCompany()]}>
        <Probe />
      </CompanyWorkspaceProvider>
    );
    await user.click(screen.getByText('select p-1'));
    await user.click(screen.getByText('clear'));
    expect(screen.getByTestId('selected')).toHaveTextContent('none');
  });

  it('throws when used outside provider', () => {
    // Suppress error boundary console noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useCompanyWorkspace must be used within');
    spy.mockRestore();
  });
});

describe('CompanyWorkspaceContext — activeRouteCompanyIds', () => {
  beforeEach(() => {
    mockActiveRouteId = null;
    mockGetActiveRouteCompanyIds.mockClear();
    mockGetActiveRouteCompanyIds.mockResolvedValue(new Set<string>());
  });

  it('is empty when there is no active route', async () => {
    render(
      <CompanyWorkspaceProvider companies={[]}>
        <RouteIdsProbe />
      </CompanyWorkspaceProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('ids')).toHaveTextContent('empty');
    });
  });

  it('contains IDs from getActiveRouteCompanyIds when a route is active', async () => {
    mockActiveRouteId = 'route-1';
    mockGetActiveRouteCompanyIds.mockResolvedValue(new Set(['c-1', 'c-2']));
    render(
      <CompanyWorkspaceProvider companies={[]}>
        <RouteIdsProbe />
      </CompanyWorkspaceProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('ids')).toHaveTextContent('c-1,c-2');
    });
  });

  it('enriches with tracking_id when company_id is in the set', async () => {
    // Route contains company_id 'c-1'. The user tracks that shared company
    // via tracking_id 't-1'. Both IDs must end up in the set so CompanyTable
    // (which checks multiple ID fields) finds a match regardless of which
    // representation it receives.
    mockActiveRouteId = 'route-1';
    mockGetActiveRouteCompanyIds.mockResolvedValue(new Set(['c-1']));
    const shared = makeCompany({
      source: 'shared',
      tracking_id: 't-1',
      company_id: 'c-1',
      private_company_id: null,
    });
    render(
      <CompanyWorkspaceProvider companies={[shared]}>
        <RouteIdsProbe />
      </CompanyWorkspaceProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('ids')).toHaveTextContent('c-1,t-1');
    });
  });

  it('does not enrich private companies (no company_id to match against)', async () => {
    mockActiveRouteId = 'route-1';
    mockGetActiveRouteCompanyIds.mockResolvedValue(new Set(['c-1']));
    const priv = makeCompany({ source: 'private', private_company_id: 'p-1' });
    render(
      <CompanyWorkspaceProvider companies={[priv]}>
        <RouteIdsProbe />
      </CompanyWorkspaceProvider>
    );
    await waitFor(() => {
      // p-1 not added; enrichment only applies shared.company_id → tracking_id
      expect(screen.getByTestId('ids')).toHaveTextContent('c-1');
    });
  });

  it('refreshRouteCompanyIds re-fetches from useRoutes', async () => {
    mockActiveRouteId = 'route-1';
    mockGetActiveRouteCompanyIds.mockResolvedValue(new Set(['c-1']));
    const user = userEvent.setup();
    render(
      <CompanyWorkspaceProvider companies={[]}>
        <RouteIdsProbe />
      </CompanyWorkspaceProvider>
    );
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('c-1'));

    mockGetActiveRouteCompanyIds.mockResolvedValue(new Set(['c-1', 'c-2']));
    await user.click(screen.getByText('refresh'));
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('c-1,c-2'));
  });
});

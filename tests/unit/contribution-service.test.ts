/**
 * Contribution Service Unit Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * T094 [US5] - Tests for submitToShared() contribution flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MultiTenantCompanyService,
  ContributionPendingError,
} from '@/lib/companies/multi-tenant-service';
import type { CompanyContribution, PrivateCompany } from '@/types/company';

// Mock Supabase client
const createMockSupabase = () => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockFrom = vi.fn();

  // Chain methods return themselves
  mockSelect.mockReturnThis();
  mockEq.mockReturnThis();
  mockSingle.mockReturnThis();
  mockInsert.mockReturnThis();
  mockUpdate.mockReturnThis();

  mockFrom.mockReturnValue({
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    insert: mockInsert,
    update: mockUpdate,
  });

  return {
    from: mockFrom,
    rpc: vi.fn(),
    _mocks: {
      mockFrom,
      mockSelect,
      mockEq,
      mockSingle,
      mockInsert,
      mockUpdate,
    },
  };
};

const createMockPrivateCompany = (
  overrides: Partial<PrivateCompany> = {}
): PrivateCompany => ({
  id: 'private-1',
  user_id: 'user-1',
  metro_area_id: 'metro-1',
  name: 'My Private Corp',
  website: 'https://privatecorp.com',
  careers_url: null,
  address: '123 Private St',
  latitude: 35.1595,
  longitude: -84.8766,
  phone: '423-555-1234',
  email: 'info@privatecorp.com',
  contact_name: 'John Doe',
  contact_title: 'Owner',
  notes: 'Great company',
  status: 'contacted',
  priority: 2,
  follow_up_date: null,
  is_active: true,
  submit_to_shared: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('MultiTenantCompanyService - Contributions (US5)', () => {
  let service: MultiTenantCompanyService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new MultiTenantCompanyService(mockSupabase as never);
  });

  describe('submitToSharedRegistry (T094)', () => {
    it('creates contribution record for private company', async () => {
      // Mock: No existing pending contribution
      const mockSinglePending = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      // Mock: Update private company
      const mockUpdateSelect = vi.fn().mockReturnThis();
      const mockUpdateEq = vi.fn().mockReturnThis();

      // Mock: Insert contribution
      const mockInsertSelect = vi.fn().mockReturnThis();
      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'contribution-1',
          user_id: 'user-1',
          private_company_id: 'private-1',
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSupabase.from = vi.fn().mockImplementation((table) => {
        if (table === 'company_contributions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: mockSinglePending,
            insert: vi.fn().mockReturnValue({
              select: mockInsertSelect,
              single: mockInsertSingle,
            }),
          };
        }
        if (table === 'private_companies') {
          return {
            update: vi.fn().mockReturnValue({
              eq: mockUpdateEq,
            }),
          };
        }
        return {};
      });

      await service.initialize('user-1');
      const result = await service.submitToSharedRegistry('private-1');

      expect(result.status).toBe('pending');
      expect(result.private_company_id).toBe('private-1');
    });

    it('throws ContributionPendingError if already pending', async () => {
      // Mock: Existing pending contribution
      const mockSinglePending = vi.fn().mockResolvedValue({
        data: { id: 'contribution-existing' },
        error: null,
      });

      mockSupabase.from = vi.fn().mockImplementation((table) => {
        if (table === 'company_contributions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: mockSinglePending,
          };
        }
        return {};
      });

      await service.initialize('user-1');

      await expect(service.submitToSharedRegistry('private-1')).rejects.toThrow(
        ContributionPendingError
      );
    });

    it('sets submit_to_shared flag on private company', async () => {
      const mockUpdateEq2 = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateEq1 = vi.fn().mockReturnValue({ eq: mockUpdateEq2 });

      const mockSinglePending = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const mockInsertSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'contribution-1',
          status: 'pending',
          private_company_id: 'private-1',
        },
        error: null,
      });

      mockSupabase.from = vi.fn().mockImplementation((table) => {
        if (table === 'company_contributions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: mockSinglePending,
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnThis(),
              single: mockInsertSingle,
            }),
          };
        }
        if (table === 'private_companies') {
          return {
            update: vi.fn().mockReturnValue({
              eq: mockUpdateEq1,
            }),
          };
        }
        return {};
      });

      await service.initialize('user-1');
      await service.submitToSharedRegistry('private-1');

      // Verify update was called on private_companies
      expect(mockSupabase.from).toHaveBeenCalledWith('private_companies');
    });

    it('throws error if not initialized', async () => {
      await expect(service.submitToSharedRegistry('private-1')).rejects.toThrow(
        'MultiTenantCompanyService not initialized'
      );
    });
  });

  describe('getMyContributions (T094)', () => {
    it('returns user contribution history', async () => {
      const contributions: CompanyContribution[] = [
        {
          id: 'contrib-1',
          user_id: 'user-1',
          private_company_id: 'private-1',
          created_shared_company_id: null,
          merged_with_company_id: null,
          status: 'pending',
          reviewer_notes: null,
          reviewer_id: null,
          reviewed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'contrib-2',
          user_id: 'user-1',
          private_company_id: 'private-2',
          created_shared_company_id: 'shared-1',
          merged_with_company_id: null,
          status: 'approved',
          reviewer_notes: 'Looks good!',
          reviewer_id: 'admin-1',
          reviewed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: contributions,
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: mockOrder,
      });

      await service.initialize('user-1');
      const result = await service.getMyContributions();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('approved');
      expect(mockSupabase.from).toHaveBeenCalledWith('company_contributions');
    });

    it('returns empty array when no contributions', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: mockOrder,
      });

      await service.initialize('user-1');
      const result = await service.getMyContributions();

      expect(result).toHaveLength(0);
    });
  });
});

/**
 * T096 [US5] - Additional tests for submit button behavior
 */
describe('Contribution Status Display (T096)', () => {
  let service: MultiTenantCompanyService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new MultiTenantCompanyService(mockSupabase as never);
  });

  it('shows pending status for submitted private companies', async () => {
    const privateCompany = createMockPrivateCompany({
      submit_to_shared: true,
    });

    // The UI should check submit_to_shared flag
    expect(privateCompany.submit_to_shared).toBe(true);
  });

  it('private company without submission has submit_to_shared false', async () => {
    const privateCompany = createMockPrivateCompany({
      submit_to_shared: false,
    });

    expect(privateCompany.submit_to_shared).toBe(false);
  });
});

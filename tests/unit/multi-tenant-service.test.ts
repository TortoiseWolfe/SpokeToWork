/**
 * Multi-Tenant Company Service Unit Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * T051 [US1] - Tests for getUnifiedCompanies()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiTenantCompanyService } from '@/lib/companies/multi-tenant-service';
import type { UnifiedCompany, CompanySource } from '@/types/company';

// Mock Supabase client
const createMockSupabase = () => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockIn = vi.fn();
  const mockOrder = vi.fn();
  const mockFrom = vi.fn();

  // Chain methods return themselves
  mockSelect.mockReturnThis();
  mockEq.mockReturnThis();
  mockIn.mockReturnThis();
  mockOrder.mockReturnThis();

  mockFrom.mockReturnValue({
    select: mockSelect,
    eq: mockEq,
    in: mockIn,
    order: mockOrder,
  });

  return {
    from: mockFrom,
    rpc: vi.fn(),
    _mocks: { mockFrom, mockSelect, mockEq, mockIn, mockOrder },
  };
};

const createMockUnifiedCompany = (
  overrides: Partial<UnifiedCompany> = {}
): UnifiedCompany => ({
  source: 'shared' as CompanySource,
  tracking_id: 'tracking-1',
  company_id: 'company-1',
  private_company_id: null,
  user_id: 'user-1',
  metro_area_id: 'metro-1',
  name: 'Test Company',
  website: 'https://test.com',
  careers_url: 'https://test.com/careers',
  address: '123 Test St, Cleveland, TN 37311',
  latitude: 35.1595,
  longitude: -84.8766,
  phone: '423-555-1234',
  email: 'info@test.com',
  contact_name: 'John Doe',
  contact_title: 'Manager',
  notes: 'Test notes',
  status: 'not_contacted',
  priority: 3,
  follow_up_date: null,
  is_active: true,
  is_verified: true,
  submit_to_shared: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('MultiTenantCompanyService', () => {
  let service: MultiTenantCompanyService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new MultiTenantCompanyService(mockSupabase as never);
  });

  describe('getUnifiedCompanies', () => {
    it('returns combined list of shared and private companies', async () => {
      const sharedCompany = createMockUnifiedCompany({
        source: 'shared',
        name: 'Shared Corp',
      });
      const privateCompany = createMockUnifiedCompany({
        source: 'private',
        name: 'Private LLC',
        tracking_id: null,
        company_id: null,
        private_company_id: 'private-1',
        is_verified: false,
      });

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [sharedCompany, privateCompany],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.getUnifiedCompanies();

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.source)).toEqual(['shared', 'private']);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_companies_unified');
    });

    it('filters by source when specified', async () => {
      const sharedCompany = createMockUnifiedCompany({ source: 'shared' });

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [sharedCompany],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.getUnifiedCompanies({ source: 'shared' });

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('shared');
      expect(mockSupabase._mocks.mockEq).toHaveBeenCalledWith(
        'source',
        'shared'
      );
    });

    it('filters by metro_area_id when specified', async () => {
      const company = createMockUnifiedCompany({
        metro_area_id: 'cleveland-tn',
      });

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [company],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.getUnifiedCompanies({
        metro_area_id: 'cleveland-tn',
      });

      expect(result).toHaveLength(1);
      expect(mockSupabase._mocks.mockEq).toHaveBeenCalledWith(
        'metro_area_id',
        'cleveland-tn'
      );
    });

    it('filters by status when specified', async () => {
      const company = createMockUnifiedCompany({ status: 'contacted' });

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [company],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.getUnifiedCompanies({ status: 'contacted' });

      expect(result).toHaveLength(1);
      expect(mockSupabase._mocks.mockIn).toHaveBeenCalledWith('status', [
        'contacted',
      ]);
    });

    it('filters by multiple statuses', async () => {
      const companies = [
        createMockUnifiedCompany({ status: 'contacted' }),
        createMockUnifiedCompany({ status: 'follow_up' }),
      ];

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: companies,
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.getUnifiedCompanies({
        status: ['contacted', 'follow_up'],
      });

      expect(result).toHaveLength(2);
      expect(mockSupabase._mocks.mockIn).toHaveBeenCalledWith('status', [
        'contacted',
        'follow_up',
      ]);
    });

    it('filters by priority when specified', async () => {
      const company = createMockUnifiedCompany({ priority: 1 });

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [company],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.getUnifiedCompanies({ priority: 1 });

      expect(result).toHaveLength(1);
      expect(mockSupabase._mocks.mockIn).toHaveBeenCalledWith('priority', [1]);
    });

    it('filters by is_active when specified', async () => {
      const company = createMockUnifiedCompany({ is_active: true });

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [company],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.getUnifiedCompanies({ is_active: true });

      expect(result).toHaveLength(1);
      expect(mockSupabase._mocks.mockEq).toHaveBeenCalledWith(
        'is_active',
        true
      );
    });

    it('filters by is_verified when specified', async () => {
      const company = createMockUnifiedCompany({ is_verified: true });

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [company],
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.getUnifiedCompanies({ is_verified: true });

      expect(result).toHaveLength(1);
      expect(mockSupabase._mocks.mockEq).toHaveBeenCalledWith(
        'is_verified',
        true
      );
    });

    it('applies client-side search filter', async () => {
      const companies = [
        createMockUnifiedCompany({ name: 'Acme Corp' }),
        createMockUnifiedCompany({ name: 'Beta Inc' }),
      ];

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: companies,
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.getUnifiedCompanies({ search: 'acme' });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Acme Corp');
    });

    it('applies sort by name ascending by default', async () => {
      const company = createMockUnifiedCompany();

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [company],
        error: null,
      });

      await service.initialize('user-1');
      await service.getUnifiedCompanies();

      expect(mockSupabase._mocks.mockOrder).toHaveBeenCalledWith('name', {
        ascending: true,
      });
    });

    it('applies custom sort field and direction', async () => {
      const company = createMockUnifiedCompany();

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [company],
        error: null,
      });

      await service.initialize('user-1');
      await service.getUnifiedCompanies(undefined, {
        field: 'priority',
        direction: 'desc',
      });

      expect(mockSupabase._mocks.mockOrder).toHaveBeenCalledWith('priority', {
        ascending: false,
      });
    });

    it('throws error if not initialized', async () => {
      await expect(service.getUnifiedCompanies()).rejects.toThrow(
        'MultiTenantCompanyService not initialized'
      );
    });

    it('propagates database errors', async () => {
      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      await service.initialize('user-1');
      await expect(service.getUnifiedCompanies()).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('getCompanyCountBySource', () => {
    it('returns count of shared and private companies', async () => {
      const companies = [
        createMockUnifiedCompany({ source: 'shared' }),
        createMockUnifiedCompany({ source: 'shared' }),
        createMockUnifiedCompany({ source: 'private' }),
      ];

      mockSupabase._mocks.mockSelect.mockResolvedValueOnce({
        data: companies,
        error: null,
      });

      await service.initialize('user-1');
      const result = await service.getCompanyCountBySource();

      expect(result.shared).toBe(2);
      expect(result.private).toBe(1);
      expect(result.total).toBe(3);
    });
  });

  /**
   * T079 [US3] - Tests for updateTracking() updates only user's record
   */
  describe('updateTracking (T079)', () => {
    it('updates tracking record with new status', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'tracking-1',
          user_id: 'user-1',
          status: 'contacted',
          priority: 2,
        },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      await service.initialize('user-1');
      const result = await service.updateTracking({
        id: 'tracking-1',
        status: 'contacted',
        priority: 2,
      });

      expect(result.status).toBe('contacted');
      expect(result.priority).toBe(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('user_company_tracking');
    });

    it('only updates user_id matching current user', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'tracking-1' },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      await service.initialize('user-1');
      await service.updateTracking({ id: 'tracking-1', status: 'contacted' });

      // Verify eq was called with user_id filter
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('throws error if not initialized', async () => {
      await expect(
        service.updateTracking({ id: 'tracking-1', status: 'contacted' })
      ).rejects.toThrow('MultiTenantCompanyService not initialized');
    });

    it('propagates database errors', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      await service.initialize('user-1');
      await expect(
        service.updateTracking({ id: 'tracking-1', status: 'contacted' })
      ).rejects.toThrow('Database error');
    });
  });

  /**
   * T083/T084 [US3] - Tests for updatePrivateCompany()
   */
  describe('updatePrivateCompany (T083/T084)', () => {
    it('updates private company with new status', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'private-1',
          user_id: 'user-1',
          name: 'Test Corp',
          status: 'contacted',
          priority: 1,
        },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      await service.initialize('user-1');
      const result = await service.updatePrivateCompany({
        id: 'private-1',
        status: 'contacted',
        priority: 1,
      });

      expect(result.status).toBe('contacted');
      expect(result.priority).toBe(1);
      expect(mockSupabase.from).toHaveBeenCalledWith('private_companies');
    });

    it('only updates user_id matching current user', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'private-1' },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      await service.initialize('user-1');
      await service.updatePrivateCompany({
        id: 'private-1',
        status: 'contacted',
      });

      // Verify eq was called with user_id filter
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('updates notes field', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: 'private-1', notes: 'Updated notes' },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        update: mockUpdate,
        eq: mockEq,
        select: mockSelect,
        single: mockSingle,
      });

      await service.initialize('user-1');
      const result = await service.updatePrivateCompany({
        id: 'private-1',
        notes: 'Updated notes',
      });

      expect(result.notes).toBe('Updated notes');
    });

    it('throws error if not initialized', async () => {
      await expect(
        service.updatePrivateCompany({ id: 'private-1', status: 'contacted' })
      ).rejects.toThrow('MultiTenantCompanyService not initialized');
    });
  });
});

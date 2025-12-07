/**
 * Seed Service Unit Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * T087 [US4] - Tests for getSeedCompaniesForMetro()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeedService } from '@/lib/companies/seed-service';
import type { SharedCompany } from '@/types/company';

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

const createMockSeedCompany = (
  overrides: Partial<SharedCompany> = {}
): SharedCompany => ({
  id: 'company-1',
  metro_area_id: 'cleveland-tn',
  name: 'Test Seed Company',
  website: 'https://testseed.com',
  careers_url: 'https://testseed.com/careers',
  is_verified: true,
  is_seed: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe('SeedService', () => {
  let service: SeedService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new SeedService(mockSupabase as never);
  });

  describe('getSeedCompaniesForMetro (T087)', () => {
    it('returns seed companies for specified metro area', async () => {
      const seedCompanies = [
        createMockSeedCompany({ name: 'Whirlpool Corporation' }),
        createMockSeedCompany({ name: 'Wacker Polysilicon' }),
        createMockSeedCompany({ name: 'Duracell' }),
      ];

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: seedCompanies,
        error: null,
      });

      const result = await service.getSeedCompaniesForMetro('cleveland-tn');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Whirlpool Corporation');
      expect(mockSupabase.from).toHaveBeenCalledWith('shared_companies');
      expect(mockSupabase._mocks.mockEq).toHaveBeenCalledWith(
        'metro_area_id',
        'cleveland-tn'
      );
      expect(mockSupabase._mocks.mockEq).toHaveBeenCalledWith('is_seed', true);
    });

    it('returns empty array when no seed companies exist', async () => {
      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await service.getSeedCompaniesForMetro('unknown-metro');

      expect(result).toHaveLength(0);
    });

    it('only returns verified seed companies', async () => {
      const verifiedCompany = createMockSeedCompany({
        name: 'Verified Corp',
        is_verified: true,
      });

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [verifiedCompany],
        error: null,
      });

      const result = await service.getSeedCompaniesForMetro('cleveland-tn');

      expect(result).toHaveLength(1);
      expect(result[0].is_verified).toBe(true);
      expect(mockSupabase._mocks.mockEq).toHaveBeenCalledWith(
        'is_verified',
        true
      );
    });

    it('throws error on database failure', async () => {
      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: null,
        error: new Error('Database error'),
      });

      await expect(
        service.getSeedCompaniesForMetro('cleveland-tn')
      ).rejects.toThrow('Database error');
    });
  });

  describe('getSeedCompanyCount', () => {
    it('returns count of seed companies for metro', async () => {
      const seedCompanies = [
        createMockSeedCompany(),
        createMockSeedCompany(),
        createMockSeedCompany(),
      ];

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: seedCompanies,
        error: null,
      });

      const result = await service.getSeedCompanyCount('cleveland-tn');

      expect(result).toBe(3);
    });
  });

  describe('createTrackingForSeedCompanies', () => {
    it('creates tracking records for all seed companies', async () => {
      const seedCompanies = [
        createMockSeedCompany({ id: 'seed-1', name: 'Company A' }),
        createMockSeedCompany({ id: 'seed-2', name: 'Company B' }),
      ];

      // Mock getSeedCompaniesForMetro
      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: seedCompanies,
        error: null,
      });

      // Mock insert for tracking records with chained select
      const mockSelect = vi.fn().mockResolvedValue({
        data: [
          { id: 'tracking-1', shared_company_id: 'seed-1' },
          { id: 'tracking-2', shared_company_id: 'seed-2' },
        ],
        error: null,
      });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = vi.fn().mockImplementation((table) => {
        if (table === 'shared_companies') {
          return {
            select: mockSupabase._mocks.mockSelect,
            eq: mockSupabase._mocks.mockEq,
            order: mockSupabase._mocks.mockOrder,
          };
        }
        if (table === 'user_company_tracking') {
          return { insert: mockInsert };
        }
        return {};
      });

      const result = await service.createTrackingForSeedCompanies(
        'user-123',
        'cleveland-tn'
      );

      expect(result).toHaveLength(2);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user-123',
            shared_company_id: 'seed-1',
            status: 'not_contacted',
            priority: 3,
          }),
          expect.objectContaining({
            user_id: 'user-123',
            shared_company_id: 'seed-2',
            status: 'not_contacted',
            priority: 3,
          }),
        ])
      );
    });

    it('returns empty array when no seed companies exist', async () => {
      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await service.createTrackingForSeedCompanies(
        'user-123',
        'unknown-metro'
      );

      expect(result).toHaveLength(0);
    });

    it('does not create duplicates if tracking already exists', async () => {
      const seedCompanies = [
        createMockSeedCompany({ id: 'seed-1', name: 'Company A' }),
      ];

      mockSupabase._mocks.mockOrder.mockResolvedValueOnce({
        data: seedCompanies,
        error: null,
      });

      // Mock insert with unique constraint violation (chained select)
      const mockSelect = vi.fn().mockResolvedValue({
        data: [],
        error: { code: '23505', message: 'Duplicate key violation' },
      });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockSupabase.from = vi.fn().mockImplementation((table) => {
        if (table === 'shared_companies') {
          return {
            select: mockSupabase._mocks.mockSelect,
            eq: mockSupabase._mocks.mockEq,
            order: mockSupabase._mocks.mockOrder,
          };
        }
        if (table === 'user_company_tracking') {
          return { insert: mockInsert };
        }
        return {};
      });

      // Should not throw - duplicates are expected during re-seeding
      const result = await service.createTrackingForSeedCompanies(
        'user-123',
        'cleveland-tn'
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('getAvailableMetroAreas', () => {
    it('returns metro areas that have seed data', async () => {
      const metroAreas = [
        { id: 'cleveland-tn', name: 'Cleveland, TN', seed_company_count: 10 },
        {
          id: 'chattanooga-tn',
          name: 'Chattanooga, TN',
          seed_company_count: 5,
        },
      ];

      mockSupabase.rpc.mockResolvedValueOnce({
        data: metroAreas,
        error: null,
      });

      const result = await service.getAvailableMetroAreas();

      expect(result).toHaveLength(2);
      expect(result[0].seed_company_count).toBeGreaterThan(0);
    });
  });
});

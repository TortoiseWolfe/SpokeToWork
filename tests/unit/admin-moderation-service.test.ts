/**
 * Admin Moderation Service Unit Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * T108 [US7] - Tests for admin moderation queue CRUD operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminModerationService } from '@/lib/companies/admin-moderation-service';

// Mock Supabase client
const createMockSupabase = () => {
  return {
    from: vi.fn(),
    rpc: vi.fn(),
  };
};

describe('AdminModerationService', () => {
  let service: AdminModerationService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new AdminModerationService(mockSupabase as never);
  });

  describe('getPendingQueue (T108)', () => {
    it('returns combined queue of contributions and edit suggestions', async () => {
      const mockContributions = [
        {
          id: 'contrib-1',
          user_id: 'user-1',
          private_company_id: 'private-1',
          status: 'pending',
          created_at: '2024-01-01T00:00:00Z',
          private_companies: { name: 'New Corp' },
        },
      ];

      const mockSuggestions = [
        {
          id: 'sugg-1',
          user_id: 'user-2',
          shared_company_id: 'shared-1',
          field_name: 'website',
          old_value: 'https://old.com',
          new_value: 'https://new.com',
          reason: 'URL changed',
          status: 'pending',
          created_at: '2024-01-02T00:00:00Z',
          shared_companies: { name: 'Existing Corp' },
        },
      ];

      mockSupabase.from = vi.fn().mockImplementation((table) => {
        if (table === 'company_contributions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: mockContributions,
              error: null,
            }),
          };
        }
        if (table === 'company_edit_suggestions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: mockSuggestions,
              error: null,
            }),
          };
        }
        return {};
      });

      await service.initialize('admin-1');
      const result = await service.getPendingQueue();

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('contribution');
      expect(result[0].private_company_name).toBe('New Corp');
      expect(result[1].type).toBe('edit_suggestion');
      expect(result[1].field_name).toBe('website');
    });

    it('returns empty queue when no pending items', async () => {
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      await service.initialize('admin-1');
      const result = await service.getPendingQueue();

      expect(result).toHaveLength(0);
    });

    it('throws error if not initialized', async () => {
      await expect(service.getPendingQueue()).rejects.toThrow(
        'AdminModerationService not initialized'
      );
    });
  });

  describe('approveContribution (T115)', () => {
    it('creates shared company and updates contribution status', async () => {
      const mockContribution = {
        id: 'contrib-1',
        user_id: 'user-1',
        private_company_id: 'private-1',
        status: 'pending',
        private_companies: {
          metro_area_id: 'metro-1',
          name: 'New Corp',
          website: 'https://newcorp.com',
          careers_url: null,
        },
      };

      const mockNewShared = {
        id: 'shared-new',
        name: 'New Corp',
      };

      const mockUpdated = {
        id: 'contrib-1',
        status: 'approved',
        reviewer_id: 'admin-1',
        created_shared_company_id: 'shared-new',
      };

      mockSupabase.from = vi.fn().mockImplementation((table) => {
        if (table === 'company_contributions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockContribution,
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockUpdated,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'shared_companies') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockNewShared,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await service.initialize('admin-1');
      const result = await service.approveContribution(
        'contrib-1',
        'Looks good'
      );

      expect(result.status).toBe('approved');
      expect(result.created_shared_company_id).toBe('shared-new');
    });
  });

  describe('rejectContribution (T116)', () => {
    it('updates contribution status to rejected', async () => {
      const mockUpdated = {
        id: 'contrib-1',
        status: 'rejected',
        reviewer_id: 'admin-1',
        reviewer_notes: 'Duplicate company',
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      });

      await service.initialize('admin-1');
      const result = await service.rejectContribution(
        'contrib-1',
        'Duplicate company'
      );

      expect(result.status).toBe('rejected');
      expect(result.reviewer_notes).toBe('Duplicate company');
    });
  });

  describe('mergeContribution (T117)', () => {
    it('merges contribution with existing company', async () => {
      const mockUpdated = {
        id: 'contrib-1',
        status: 'merged',
        reviewer_id: 'admin-1',
        merged_with_company_id: 'shared-existing',
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      });

      await service.initialize('admin-1');
      const result = await service.mergeContribution(
        'contrib-1',
        'shared-existing'
      );

      expect(result.status).toBe('merged');
      expect(result.merged_with_company_id).toBe('shared-existing');
    });
  });

  describe('approveEditSuggestion (T118)', () => {
    it('applies edit and updates suggestion status', async () => {
      const mockSuggestion = {
        id: 'sugg-1',
        shared_company_id: 'shared-1',
        field_name: 'website',
        new_value: 'https://new.com',
      };

      const mockUpdated = {
        id: 'sugg-1',
        status: 'approved',
        reviewer_id: 'admin-1',
      };

      mockSupabase.from = vi.fn().mockImplementation((table) => {
        if (table === 'company_edit_suggestions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockSuggestion,
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockUpdated,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'shared_companies') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      await service.initialize('admin-1');
      const result = await service.approveEditSuggestion('sugg-1', 'Verified');

      expect(result.status).toBe('approved');
    });
  });

  describe('rejectEditSuggestion (T119)', () => {
    it('updates suggestion status to rejected', async () => {
      const mockUpdated = {
        id: 'sugg-1',
        status: 'rejected',
        reviewer_id: 'admin-1',
        reviewer_notes: 'Invalid URL',
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      });

      await service.initialize('admin-1');
      const result = await service.rejectEditSuggestion(
        'sugg-1',
        'Invalid URL'
      );

      expect(result.status).toBe('rejected');
      expect(result.reviewer_notes).toBe('Invalid URL');
    });
  });

  describe('getPendingCounts (T108)', () => {
    it('returns counts of pending items', async () => {
      mockSupabase.from = vi.fn().mockImplementation((table) => {
        if (table === 'company_contributions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              count: 5,
              error: null,
            }),
          };
        }
        if (table === 'company_edit_suggestions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              count: 3,
              error: null,
            }),
          };
        }
        return {};
      });

      await service.initialize('admin-1');
      const result = await service.getPendingCounts();

      expect(result.contributions).toBe(5);
      expect(result.editSuggestions).toBe(3);
      expect(result.total).toBe(8);
    });
  });
});

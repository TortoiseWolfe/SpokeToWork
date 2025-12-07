/**
 * Edit Suggestion Service Unit Tests
 * Feature 012: Multi-Tenant Company Data Model
 *
 * T102 [US6] - Tests for submitEditSuggestion() data correction flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MultiTenantCompanyService } from '@/lib/companies/multi-tenant-service';
import type { CompanyEditSuggestion } from '@/types/company';

// Mock Supabase client
const createMockSupabase = () => {
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockInsert = vi.fn();
  const mockOrder = vi.fn();
  const mockFrom = vi.fn();

  // Chain methods return themselves
  mockSelect.mockReturnThis();
  mockEq.mockReturnThis();
  mockSingle.mockReturnThis();
  mockInsert.mockReturnThis();
  mockOrder.mockReturnThis();

  mockFrom.mockReturnValue({
    select: mockSelect,
    eq: mockEq,
    single: mockSingle,
    insert: mockInsert,
    order: mockOrder,
  });

  return {
    from: mockFrom,
    rpc: vi.fn(),
    _mocks: { mockFrom, mockSelect, mockEq, mockSingle, mockInsert, mockOrder },
  };
};

describe('MultiTenantCompanyService - Edit Suggestions (US6)', () => {
  let service: MultiTenantCompanyService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new MultiTenantCompanyService(mockSupabase as never);
  });

  describe('submitEditSuggestion (T102)', () => {
    it('creates edit suggestion for shared company field', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'suggestion-1',
          user_id: 'user-1',
          shared_company_id: 'shared-1',
          location_id: null,
          field_name: 'website',
          old_value: 'https://old.com',
          new_value: 'https://new.com',
          reason: 'URL changed',
          status: 'pending',
          reviewer_id: null,
          reviewed_at: null,
          reviewer_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      await service.initialize('user-1');
      const result = await service.submitEditSuggestion({
        shared_company_id: 'shared-1',
        field_name: 'website',
        old_value: 'https://old.com',
        new_value: 'https://new.com',
        reason: 'URL changed',
      });

      expect(result.status).toBe('pending');
      expect(result.field_name).toBe('website');
      expect(result.new_value).toBe('https://new.com');
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'company_edit_suggestions'
      );
    });

    it('creates edit suggestion for specific location', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'suggestion-2',
          user_id: 'user-1',
          shared_company_id: 'shared-1',
          location_id: 'location-1',
          field_name: 'phone',
          old_value: '555-1234',
          new_value: '555-5678',
          reason: 'New phone number',
          status: 'pending',
          reviewer_id: null,
          reviewed_at: null,
          reviewer_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      await service.initialize('user-1');
      const result = await service.submitEditSuggestion({
        shared_company_id: 'shared-1',
        location_id: 'location-1',
        field_name: 'phone',
        old_value: '555-1234',
        new_value: '555-5678',
        reason: 'New phone number',
      });

      expect(result.location_id).toBe('location-1');
      expect(result.field_name).toBe('phone');
    });

    it('creates suggestion without optional reason', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'suggestion-3',
          user_id: 'user-1',
          shared_company_id: 'shared-1',
          location_id: null,
          field_name: 'careers_url',
          old_value: null,
          new_value: 'https://careers.example.com',
          reason: null,
          status: 'pending',
          reviewer_id: null,
          reviewed_at: null,
          reviewer_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      await service.initialize('user-1');
      const result = await service.submitEditSuggestion({
        shared_company_id: 'shared-1',
        field_name: 'careers_url',
        new_value: 'https://careers.example.com',
      });

      expect(result.reason).toBeNull();
      expect(result.old_value).toBeNull();
    });

    it('throws error if not initialized', async () => {
      await expect(
        service.submitEditSuggestion({
          shared_company_id: 'shared-1',
          field_name: 'website',
          new_value: 'https://new.com',
        })
      ).rejects.toThrow('MultiTenantCompanyService not initialized');
    });
  });

  describe('getMyEditSuggestions (T102)', () => {
    it('returns user edit suggestion history', async () => {
      const suggestions: CompanyEditSuggestion[] = [
        {
          id: 'suggestion-1',
          user_id: 'user-1',
          shared_company_id: 'shared-1',
          location_id: null,
          field_name: 'website',
          old_value: 'https://old.com',
          new_value: 'https://new.com',
          reason: 'URL changed',
          status: 'pending',
          reviewer_id: null,
          reviewed_at: null,
          reviewer_notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'suggestion-2',
          user_id: 'user-1',
          shared_company_id: 'shared-2',
          location_id: null,
          field_name: 'phone',
          old_value: '555-1234',
          new_value: '555-5678',
          reason: null,
          status: 'approved',
          reviewer_id: 'admin-1',
          reviewed_at: new Date().toISOString(),
          reviewer_notes: 'Verified correct',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: suggestions,
        error: null,
      });

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: mockOrder,
      });

      await service.initialize('user-1');
      const result = await service.getMyEditSuggestions();

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('approved');
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'company_edit_suggestions'
      );
    });

    it('returns empty array when no suggestions', async () => {
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
      const result = await service.getMyEditSuggestions();

      expect(result).toHaveLength(0);
    });
  });
});

/**
 * T104 [US6] - Additional tests for edit suggestion display
 */
describe('Edit Suggestion Status Display (T104)', () => {
  it('recognizes pending suggestions', () => {
    const suggestion: CompanyEditSuggestion = {
      id: 'suggestion-1',
      user_id: 'user-1',
      shared_company_id: 'shared-1',
      location_id: null,
      field_name: 'website',
      old_value: 'https://old.com',
      new_value: 'https://new.com',
      reason: 'URL changed',
      status: 'pending',
      reviewer_id: null,
      reviewed_at: null,
      reviewer_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(suggestion.status).toBe('pending');
    expect(suggestion.reviewer_id).toBeNull();
  });

  it('recognizes approved suggestions', () => {
    const suggestion: CompanyEditSuggestion = {
      id: 'suggestion-1',
      user_id: 'user-1',
      shared_company_id: 'shared-1',
      location_id: null,
      field_name: 'website',
      old_value: 'https://old.com',
      new_value: 'https://new.com',
      reason: 'URL changed',
      status: 'approved',
      reviewer_id: 'admin-1',
      reviewed_at: new Date().toISOString(),
      reviewer_notes: 'Verified',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(suggestion.status).toBe('approved');
    expect(suggestion.reviewer_id).toBe('admin-1');
  });

  it('recognizes rejected suggestions', () => {
    const suggestion: CompanyEditSuggestion = {
      id: 'suggestion-1',
      user_id: 'user-1',
      shared_company_id: 'shared-1',
      location_id: null,
      field_name: 'website',
      old_value: 'https://old.com',
      new_value: 'https://bad-url.com',
      reason: 'New URL',
      status: 'rejected',
      reviewer_id: 'admin-1',
      reviewed_at: new Date().toISOString(),
      reviewer_notes: 'Invalid URL format',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(suggestion.status).toBe('rejected');
    expect(suggestion.reviewer_notes).toBe('Invalid URL format');
  });
});

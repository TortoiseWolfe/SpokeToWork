import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mock Supabase client ---
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}));

import { VisibilityService } from './visibility-service';
import type { WorkerVisibility } from './types';

// Helper: build a minimal WorkerVisibility fixture
function makeVisibility(overrides: Partial<WorkerVisibility> = {}): WorkerVisibility {
  return {
    user_id: 'u1',
    profile_public: true,
    resume_visible_to: 'none',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('VisibilityService', () => {
  let service: VisibilityService;
  const mockSupabase = { from: mockFrom } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VisibilityService(mockSupabase);
  });

  // ---------------------------------------------------------------------------
  // getVisibility
  // ---------------------------------------------------------------------------
  describe('getVisibility', () => {
    it('returns existing row when found', async () => {
      const existing = makeVisibility({ profile_public: false });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
          }),
        }),
      });

      const result = await service.getVisibility('u1');
      expect(mockFrom).toHaveBeenCalledWith('worker_visibility');
      expect(result).toEqual(existing);
    });

    it('creates default row via upsert when no row exists', async () => {
      const inserted = makeVisibility();

      // First call: .from().select().eq().maybeSingle() → null
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEqSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });

      // Second call: .from().upsert().select().single() → inserted row
      const mockSingle = vi.fn().mockResolvedValue({ data: inserted, error: null });
      const mockSelectUpsert = vi.fn().mockReturnValue({ single: mockSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelectUpsert });

      mockFrom
        .mockReturnValueOnce({ select: mockSelect })   // maybeSingle query
        .mockReturnValueOnce({ upsert: mockUpsert });  // upsert insert

      const result = await service.getVisibility('u1');
      expect(mockUpsert).toHaveBeenCalledWith(
        { user_id: 'u1', profile_public: true, resume_visible_to: 'none' },
        { onConflict: 'user_id' }
      );
      expect(result).toEqual(inserted);
    });
  });

  // ---------------------------------------------------------------------------
  // updateVisibility
  // ---------------------------------------------------------------------------
  describe('updateVisibility', () => {
    it('updates profile_public', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      await service.updateVisibility('u1', { profile_public: false });
      expect(mockFrom).toHaveBeenCalledWith('worker_visibility');
      expect(mockUpdate).toHaveBeenCalledWith({ profile_public: false });
      expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    });

    it('updates resume_visible_to', async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ update: mockUpdate });

      await service.updateVisibility('u1', { resume_visible_to: 'all_employers' });
      expect(mockFrom).toHaveBeenCalledWith('worker_visibility');
      expect(mockUpdate).toHaveBeenCalledWith({ resume_visible_to: 'all_employers' });
      expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
    });
  });
});

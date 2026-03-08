/**
 * Unit Tests for useGroupMembers
 * Feature 052 - Test Coverage Expansion (T017)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          })
        ),
      })),
    })),
  })),
}));

// Mock GROUP_CONSTRAINTS
vi.mock('@/types/messaging', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    GROUP_CONSTRAINTS: {
      MAX_MEMBERS: 10,
      MIN_MEMBERS: 2,
    },
  };
});

import { useGroupMembers } from '../useGroupMembers';

describe('useGroupMembers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with empty search results', () => {
      const { result } = renderHook(() => useGroupMembers());

      expect(result.current.searchResults).toEqual([]);
    });

    it('should start with empty selected members', () => {
      const { result } = renderHook(() => useGroupMembers());

      expect(result.current.selectedMembers).toEqual([]);
    });

    it('should not be at capacity initially', () => {
      const { result } = renderHook(() => useGroupMembers());

      expect(result.current.isAtCapacity).toBe(false);
    });
  });

  describe('addMember', () => {
    it('should add member to selection', () => {
      const { result } = renderHook(() => useGroupMembers());

      act(() => {
        result.current.addMember('user-1');
      });

      expect(result.current.selectedMembers).toContain('user-1');
    });

    it('should not add duplicate member', () => {
      const { result } = renderHook(() => useGroupMembers());

      act(() => {
        result.current.addMember('user-1');
      });

      act(() => {
        result.current.addMember('user-1');
      });

      expect(
        result.current.selectedMembers.filter((id) => id === 'user-1').length
      ).toBe(1);
    });

    it('should set error when at capacity', () => {
      const { result } = renderHook(() => useGroupMembers(2));

      act(() => {
        result.current.addMember('user-1');
      });

      act(() => {
        result.current.addMember('user-2');
      });

      act(() => {
        result.current.addMember('user-3');
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.selectedMembers.length).toBe(2);
    });
  });

  describe('removeMember', () => {
    it('should remove member from selection', () => {
      const { result } = renderHook(() => useGroupMembers());

      act(() => {
        result.current.addMember('user-1');
      });

      act(() => {
        result.current.removeMember('user-1');
      });

      expect(result.current.selectedMembers).not.toContain('user-1');
    });

    it('should clear error when removing member', () => {
      const { result } = renderHook(() => useGroupMembers(1));

      act(() => {
        result.current.addMember('user-1');
      });

      act(() => {
        result.current.addMember('user-2'); // Will set error
      });

      act(() => {
        result.current.removeMember('user-1');
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected members', () => {
      const { result } = renderHook(() => useGroupMembers());

      act(() => {
        result.current.addMember('user-1');
        result.current.addMember('user-2');
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedMembers).toEqual([]);
    });
  });

  describe('isAtCapacity', () => {
    it('should be true when at max members', () => {
      const { result } = renderHook(() => useGroupMembers(2));

      act(() => {
        result.current.addMember('user-1');
        result.current.addMember('user-2');
      });

      expect(result.current.isAtCapacity).toBe(true);
    });
  });

  describe('remainingSlots', () => {
    it('should return correct remaining slots', () => {
      const { result } = renderHook(() => useGroupMembers(5));

      expect(result.current.remainingSlots).toBe(5);

      act(() => {
        result.current.addMember('user-1');
        result.current.addMember('user-2');
      });

      expect(result.current.remainingSlots).toBe(3);
    });
  });

  describe('searchConnections', () => {
    it('should be callable', async () => {
      const { result } = renderHook(() => useGroupMembers());

      await act(async () => {
        await result.current.searchConnections('test');
      });

      // Function should be callable without throwing
      expect(typeof result.current.searchConnections).toBe('function');
    });
  });

  describe('getSelectedProfiles', () => {
    it('should return empty array when no selections', () => {
      const { result } = renderHook(() => useGroupMembers());

      const profiles = result.current.getSelectedProfiles();
      expect(profiles).toEqual([]);
    });
  });

  describe('return interface', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useGroupMembers());

      expect(result.current).toHaveProperty('searchResults');
      expect(result.current).toHaveProperty('selectedMembers');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('searchConnections');
      expect(result.current).toHaveProperty('addMember');
      expect(result.current).toHaveProperty('removeMember');
      expect(result.current).toHaveProperty('clearSelection');
      expect(result.current).toHaveProperty('isAtCapacity');
      expect(result.current).toHaveProperty('remainingSlots');
      expect(result.current).toHaveProperty('getSelectedProfiles');
    });
  });
});
